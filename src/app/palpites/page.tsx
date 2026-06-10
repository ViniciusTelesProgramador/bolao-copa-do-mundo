import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MatchCard from '@/components/ui/MatchCard';
import { Match, Prediction } from '@/types';
import { Calendar } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

export default async function PalpitesPage() {
  const supabase = await createClient();

  // 1. Verificar se usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Buscar todas as partidas
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });

  const matches: Match[] = matchesData || [];

  // 3. Buscar palpites cadastrados do usuário
  const { data: predictionsData } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id);

  const predictions: Prediction[] = predictionsData || [];

  // Mapear palpites por match_id
  const predictionsMap = new Map<string, Prediction>();
  predictions.forEach((p) => {
    predictionsMap.set(p.match_id, p);
  });

  // Agrupar partidas por estágio (Fase de Grupos, Oitavas, etc.)
  // Mantemos a ordenação das chaves de acordo com a ordem cronológica do primeiro jogo de cada estágio
  const stagesOrdered: string[] = [];
  const matchesByStage: Record<string, Match[]> = {};

  matches.forEach((match) => {
    if (!matchesByStage[match.stage]) {
      matchesByStage[match.stage] = [];
      stagesOrdered.push(match.stage);
    }
    matchesByStage[match.stage].push(match);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-[#0f172a] text-slate-100 min-h-[calc(100vh-4rem)]">
      <div className="mb-10 border-b border-slate-800 pb-6">
        <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wider">
          Meus Palpites
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Dê ou edite seus palpites nas partidas abaixo. Os palpites se encerram pontualmente no horário de início de cada jogo.
        </p>
      </div>

      {stagesOrdered.length === 0 ? (
        <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          Nenhuma partida disponível no momento.
        </div>
      ) : (
        <div className="space-y-12 animate-fadeIn">
          {stagesOrdered.map((stageName) => {
            const stageMatches = matchesByStage[stageName];
            return (
              <section key={stageName} className="space-y-5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
                  <Calendar size={18} className="text-[#22c55e]" />
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-200 uppercase tracking-widest">
                    {stageName}
                  </h2>
                  <span className="text-[10px] bg-slate-800 text-slate-450 px-2.5 py-0.5 rounded-full font-bold">
                    {stageMatches.length} {stageMatches.length === 1 ? 'jogo' : 'jogos'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stageMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predictionsMap.get(match.id)}
                      isAuthenticated={true}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
