import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveX1Challenges } from '@/app/actions';
import X1PageClient from '@/components/ui/X1PageClient';
import { ChallengeWithDetails } from '@/types';

export const dynamic = 'force-dynamic';

export default async function X1Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await resolveX1Challenges();

  const admin = createAdminClient();

  const now = new Date().toISOString();

  const [
    { data: challengesData },
    { data: allProfiles },
    { data: upcomingMatches },
    { data: arenaData },
    { data: profileData },
    { data: predData },
  ] = await Promise.all([
    admin
      .from('challenges')
      .select(`
        *,
        challenger:profiles!challenger_id(id, name, avatar_url),
        challenged:profiles!challenged_id(id, name, avatar_url),
        match:matches(id, home_team, away_team, home_flag, away_flag, match_time, home_score, away_score, stage)
      `)
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .order('created_at', { ascending: false }),

    admin
      .from('profiles')
      .select('id, name, avatar_url')
      .neq('id', user.id)
      .order('name'),

    admin
      .from('matches')
      .select('id, home_team, away_team, home_flag, away_flag, match_time, stage')
      .gt('match_time', now)
      .order('match_time', { ascending: true }),

    admin
      .from('challenges')
      .select(`
        *,
        challenger:profiles!challenger_id(id, name, avatar_url),
        challenged:profiles!challenged_id(id, name, avatar_url),
        match:matches(id, home_team, away_team, home_flag, away_flag, match_time, home_score, away_score, stage)
      `)
      .in('status', ['accepted', 'completed'])
      .order('created_at', { ascending: false })
      .limit(30),

    admin.from('profiles').select('artilheiro_points, x1_points').eq('id', user.id).single(),
    admin.from('predictions').select('points').eq('user_id', user.id).not('points', 'is', null),
  ]);

  // Compute user's X1 balance from already-fetched data
  const predPts = (predData ?? []).reduce((s: number, r: any) => s + (r.points ?? 0), 0);
  const totalPts = Math.max(0, (profileData?.artilheiro_points ?? 0) + predPts + (profileData?.x1_points ?? 0));
  const userChallenges = challengesData ?? [];
  const activeCount = userChallenges.filter((c: any) =>
    (c.challenger_id === user.id && ['pending', 'accepted'].includes(c.status)) ||
    (c.challenged_id === user.id && c.status === 'accepted'),
  ).length;
  const committed = activeCount * 4;
  const balance = { total: totalPts, committed, free: Math.max(0, totalPts - committed) };

  return (
    <X1PageClient
      currentUserId={user.id}
      challenges={(challengesData ?? []) as unknown as ChallengeWithDetails[]}
      allProfiles={allProfiles ?? []}
      upcomingMatches={upcomingMatches ?? []}
      arenaFeed={(arenaData ?? []) as unknown as ChallengeWithDetails[]}
      balance={balance}
    />
  );
}
