import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRanking } from '@/app/actions';
import { isSameDayInSaoPaulo, getDateKeySaoPaulo } from '@/lib/date';
import { Match, Prediction } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: matchesData } = await admin
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });
  const matches: Match[] = matchesData || [];

  let userPredictions: Prediction[] = [];
  if (user) {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id);
    userPredictions = data || [];
  }

  const ranking = await getRanking();

  const { data: scoredPredictionsData } = await admin
    .from('predictions')
    .select('user_id, points, match:matches ( match_time )')
    .not('points', 'is', null);

  const profileByUserId = new Map(ranking.map((r) => [r.user_id, r]));

  type RoundStats = { predPoints: number; x1Points: number; acertos: number; predictions_count: number };
  const roundsMap = new Map<string, Map<string, RoundStats>>();

  const getOrCreate = (dateKey: string, userId: string): RoundStats => {
    if (!roundsMap.has(dateKey)) roundsMap.set(dateKey, new Map());
    const userMap = roundsMap.get(dateKey)!;
    if (!userMap.has(userId)) userMap.set(userId, { predPoints: 0, x1Points: 0, acertos: 0, predictions_count: 0 });
    return userMap.get(userId)!;
  };

  (scoredPredictionsData || []).forEach((pred: any) => {
    const matchTime = pred.match?.match_time;
    if (!matchTime) return;
    const dateKey = getDateKeySaoPaulo(matchTime);
    const s = getOrCreate(dateKey, pred.user_id);
    s.predPoints += pred.points ?? 0;
    s.acertos += (pred.points ?? 0) > 0 ? 1 : 0;
    s.predictions_count += 1;
  });

  // Adiciona pontos de X1 ao ranking da rodada (separados para exibição)
  const { data: completedChallenges } = await admin
    .from('challenges')
    .select('challenger_id, challenged_id, result, points_transferred, updated_at')
    .eq('status', 'completed')
    .not('points_transferred', 'is', null);

  (completedChallenges || []).forEach((c: any) => {
    const dateKey = getDateKeySaoPaulo(c.updated_at);
    const addX1 = (userId: string, pts: number) => {
      getOrCreate(dateKey, userId).x1Points += pts;
    };
    if (c.result === 'challenger_won') {
      addX1(c.challenger_id, c.points_transferred);
      addX1(c.challenged_id, -c.points_transferred);
    } else if (c.result === 'challenged_won') {
      addX1(c.challenged_id, c.points_transferred);
      addX1(c.challenger_id, -c.points_transferred);
    }
  });

  const rounds = [...roundsMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, userMap]) => {
      const [, month, day] = dateKey.split('-');
      return {
        dateKey,
        label: `${day}/${month}`,
        entries: [...userMap.entries()]
          .map(([userId, s]) => ({
            user_id: userId,
            name: profileByUserId.get(userId)?.name ?? 'Participante',
            avatar_url: profileByUserId.get(userId)?.avatar_url ?? null,
            points: s.predPoints + s.x1Points,
            pred_points: s.predPoints,
            x1_points: s.x1Points,
            acertos: s.acertos,
            predictions_count: s.predictions_count,
          }))
          .sort((a, b) => b.points - a.points),
      };
    });

  const nowInSaoPaulo = new Date();
  const todaysMatches = matches.filter(m => isSameDayInSaoPaulo(m.match_time, nowInSaoPaulo));

  const predictionsMap = Object.fromEntries(userPredictions.map((p) => [p.match_id, p]));

  let missingMatchIds: string[] = [];
  let artilheiroMissing = false;
  let artilheiroDeadlineLabel: string | undefined;

  if (user) {
    const urgentWindowMs = 48 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const predictionsSet = new Set(userPredictions.map((p) => p.match_id));
    missingMatchIds = matches
      .filter((m) => {
        const t = new Date(m.match_time).getTime();
        return t > nowMs && t < nowMs + urgentWindowMs && !predictionsSet.has(m.id);
      })
      .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime())
      .map((m) => m.id);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('artilheiro_guess')
      .eq('id', user.id)
      .single();

    const deadlineStr = process.env.ARTILHEIRO_DEADLINE || '2026-06-18T23:59:59-03:00';
    const artilheiroDeadline = new Date(deadlineStr);
    artilheiroMissing = !profileData?.artilheiro_guess && nowMs < artilheiroDeadline.getTime();
    if (artilheiroMissing) {
      artilheiroDeadlineLabel = artilheiroDeadline.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Fortaleza',
      });
    }
  }

  return NextResponse.json({
    userId: user?.id ?? null,
    matches,
    todaysMatchIds: todaysMatches.map((m) => m.id),
    predictionsMap,
    ranking,
    rounds,
    missingMatchIds,
    artilheiroMissing,
    artilheiroDeadlineLabel,
  });
}
