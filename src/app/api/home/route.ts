import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRanking } from '@/app/actions';
import { isSameDayInSaoPaulo, getDateKeySaoPaulo } from '@/lib/date';
import { Match, Prediction } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: matchesData } = await supabase
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

  const { data: scoredPredictionsData } = await supabase
    .from('predictions')
    .select('user_id, points, match:matches ( match_time )')
    .not('points', 'is', null);

  const profileByUserId = new Map(ranking.map((r) => [r.user_id, r]));
  const roundsMap = new Map<string, Map<string, { points: number; acertos: number; predictions_count: number }>>();

  (scoredPredictionsData || []).forEach((pred: any) => {
    const matchTime = pred.match?.match_time;
    if (!matchTime) return;
    const dateKey = getDateKeySaoPaulo(matchTime);
    if (!roundsMap.has(dateKey)) roundsMap.set(dateKey, new Map());
    const userMap = roundsMap.get(dateKey)!;
    const stats = userMap.get(pred.user_id) || { points: 0, acertos: 0, predictions_count: 0 };
    stats.points += pred.points ?? 0;
    stats.acertos += (pred.points ?? 0) > 0 ? 1 : 0;
    stats.predictions_count += 1;
    userMap.set(pred.user_id, stats);
  });

  const rounds = [...roundsMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, userMap]) => {
      const [, month, day] = dateKey.split('-');
      return {
        dateKey,
        label: `${day}/${month}`,
        entries: [...userMap.entries()]
          .map(([userId, stats]) => ({
            user_id: userId,
            name: profileByUserId.get(userId)?.name ?? 'Participante',
            avatar_url: profileByUserId.get(userId)?.avatar_url ?? null,
            ...stats,
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
