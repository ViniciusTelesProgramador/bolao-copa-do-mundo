import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRanking } from '@/app/actions';
import { getDateKeySaoPaulo } from '@/lib/date';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ranking = await getRanking();

  const { data: scored } = await admin
    .from('predictions')
    .select('user_id, points, match:matches ( match_time )')
    .not('points', 'is', null)
    .limit(50000);

  const profileByUserId = new Map(ranking.map(r => [r.user_id, r]));
  const roundsMap = new Map<string, Map<string, { points: number; predictions_count: number }>>();

  (scored || []).forEach((pred: any) => {
    const mt = pred.match?.match_time;
    if (!mt) return;
    const dateKey = getDateKeySaoPaulo(mt);
    if (!roundsMap.has(dateKey)) roundsMap.set(dateKey, new Map());
    const um = roundsMap.get(dateKey)!;
    const s = um.get(pred.user_id) || { points: 0, predictions_count: 0 };
    s.points += pred.points ?? 0;
    s.predictions_count += 1;
    um.set(pred.user_id, s);
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
            ...s,
            acertos: 0,
          }))
          .sort((a, b) => b.points - a.points),
      };
    });

  const { data: matchesData } = await admin
    .from('matches')
    .select('id')
    .order('match_time', { ascending: true });

  return NextResponse.json({
    ranking,
    rounds,
    totalMatches: (matchesData || []).length,
    currentUserId: user?.id ?? null,
  });
}
