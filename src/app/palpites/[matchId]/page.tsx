import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PredictionForm from '@/components/ui/PredictionForm';
import { Match, Prediction } from '@/types';

export const dynamic = 'force-dynamic';

interface PalpiteMatchPageProps {
  params: {
    matchId: string;
  };
}

export default async function PalpiteMatchPage({ params }: PalpiteMatchPageProps) {
  const { matchId } = params;
  const supabase = await createClient();

  // 1. Validar se o usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Buscar informações da partida
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  const match: Match | null = matchData;

  if (matchError || !match) {
    redirect('/palpites');
  }

  // 3. Bloquear acesso se a partida já começou
  const isStarted = new Date(match.match_time) <= new Date();
  if (isStarted) {
    redirect('/palpites');
  }

  // 4. Buscar palpite existente do usuário para este jogo, se houver
  const { data: predictionData } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .eq('match_id', matchId)
    .maybeSingle();

  const prediction: Prediction | null = predictionData;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 bg-slate-950 text-slate-100 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <PredictionForm match={match} initialPrediction={prediction} />
    </div>
  );
}
