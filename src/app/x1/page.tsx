import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HeadToHeadClient from '@/components/ui/HeadToHeadClient';
import { Match } from '@/types';

export const dynamic = 'force-dynamic';

export default async function X1Page() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Só busca partidas que já têm resultado
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .order('match_time', { ascending: true });

  const matches: Match[] = matchesData || [];

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .order('name', { ascending: true });

  const profiles = profilesData || [];

  const matchIds = matches.map((m) => m.id);
  let predictions: { id: string; match_id: string; user_id: string; home_score: number; away_score: number; points: number | null }[] = [];

  if (matchIds.length > 0) {
    const { data: predsData } = await supabase
      .from('predictions')
      .select('id, match_id, user_id, home_score, away_score, points')
      .in('match_id', matchIds);
    predictions = (predsData || []) as typeof predictions;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      <div className="mb-8 border-b border-border-custom/60 pb-5">
        <h1 className="text-2xl sm:text-4xl font-black text-primary uppercase tracking-wider">
          X1 Cara a Cara
        </h1>
        <p className="text-xs sm:text-sm text-secondary mt-2 font-medium">
          Compare o desempenho de dois participantes nos jogos já encerrados.
        </p>
      </div>

      <HeadToHeadClient
        profiles={profiles}
        matches={matches}
        predictions={predictions}
        currentUserId={user.id}
      />
    </div>
  );
}
