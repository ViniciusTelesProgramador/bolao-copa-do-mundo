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
  ]);

  return (
    <X1PageClient
      currentUserId={user.id}
      challenges={(challengesData ?? []) as unknown as ChallengeWithDetails[]}
      allProfiles={allProfiles ?? []}
      upcomingMatches={upcomingMatches ?? []}
      arenaFeed={(arenaData ?? []) as unknown as ChallengeWithDetails[]}
    />
  );
}
