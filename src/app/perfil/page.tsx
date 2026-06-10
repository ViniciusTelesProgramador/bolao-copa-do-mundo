import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FlagTeam from '@/components/ui/FlagTeam';
import PointsBadge from '@/components/ui/PointsBadge';
import { Match, Prediction } from '@/types';
import { Calendar, Hourglass } from '@phosphor-icons/react/dist/ssr';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const supabase = await createClient();

  // 1. Verificar usuário
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Buscar perfil correspondente para pegar o nome
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  // 3. Buscar palpites do usuário junto com os dados dos jogos (relacionamento/join no Supabase)
  const { data: predictionsData } = await supabase
    .from('predictions')
    .select(`
      id,
      home_score,
      away_score,
      points,
      created_at,
      match:matches (
        id,
        home_team,
        away_team,
        home_flag,
        away_flag,
        match_time,
        home_score,
        away_score,
        stage,
        group_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const predictionsList: any[] = predictionsData || [];

  // Calcular estatísticas locais
  const totalPoints = predictionsList.reduce((acc, curr) => acc + (curr.points || 0), 0);
  const totalPredictions = predictionsList.length;

  const exactHits = predictionsList.filter((p) => p.points === 3).length;
  const goalDiffHits = predictionsList.filter((p) => p.points === 2).length;
  const simpleOutcomeHits = predictionsList.filter((p) => p.points === 1).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-[#0f172a] text-slate-100 min-h-[calc(100vh-4rem)]">
      {/* Resumo do Usuário */}
      <div className="bg-[#1e293b] border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#22c55e]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">
              {profile?.name || user.email?.split('@')[0]}
            </h1>
            <p className="text-xs text-slate-400 font-bold block">{user.email}</p>
          </div>
          
          <div className="flex gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="text-center">
              <span className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block">Pontos Totais</span>
              <span className="text-3xl font-black text-[#22c55e] tracking-wider mt-1 block">{totalPoints}</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block">Palpites Feitos</span>
              <span className="text-3xl font-black text-white tracking-wider mt-1 block">{totalPredictions}</span>
            </div>
          </div>
        </div>
        
        {/* Sub-estatísticas */}
        <div className="grid grid-cols-3 gap-2.5 mt-6 pt-5 border-t border-slate-800 text-center">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl py-2 px-1">
            <span className="text-[10px] font-bold text-[#22c55e] block uppercase tracking-wider">Exato (3 pts)</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block">{exactHits}</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl py-2 px-1">
            <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">Saldo (2 pts)</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block">{goalDiffHits}</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl py-2 px-1">
            <span className="text-[10px] font-bold text-sky-400 block uppercase tracking-wider">Vencedor (1 pt)</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block">{simpleOutcomeHits}</span>
          </div>
        </div>
      </div>

      {/* Histórico de Palpites */}
      <h2 className="text-lg font-extrabold text-white mb-5 flex items-center gap-2 uppercase tracking-wider pb-2 border-b border-slate-800">
        <Hourglass size={18} className="text-[#22c55e]" />
        Histórico de Palpites
      </h2>

      {predictionsList.length === 0 ? (
        <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          Você ainda não cadastrou nenhum palpite. Vá até a aba de palpites para começar!
        </div>
      ) : (
        <div className="space-y-4">
          {predictionsList.map((pred) => {
            const match: Match = pred.match;
            const matchTime = new Date(match.match_time);
            const hasRealResult = match.home_score !== null && match.away_score !== null;

            return (
              <div
                key={pred.id}
                className="bg-[#1e293b] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200"
              >
                {/* Metadados do Jogo */}
                <div className="text-xs text-slate-400 font-semibold space-y-1 w-full sm:w-auto text-center sm:text-left">
                  <div className="bg-slate-900 px-2 py-0.5 rounded-full text-[9px] text-slate-300 uppercase font-extrabold inline-block">
                    {match.stage}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-slate-500 mt-1 font-bold">
                    <Calendar size={12} />
                    {matchTime.toLocaleDateString('pt-BR')} às {matchTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Confronto Simétrico com Palpites */}
                <div className="flex flex-1 items-center justify-center gap-3 w-full max-w-md my-1.5 sm:my-0">
                  {/* Time Casa */}
                  <div className="flex-1 flex justify-end">
                    <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="text-sm justify-end w-full" />
                  </div>
                  
                  {/* Palpite do Usuário */}
                  <div className="flex flex-col items-center justify-center px-3 py-1 bg-slate-950 border border-slate-850 rounded-xl shrink-0">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Palpite</span>
                    <span className="text-sm font-black text-amber-400">{pred.home_score} x {pred.away_score}</span>
                  </div>

                  {/* Time Fora */}
                  <div className="flex-1 flex justify-start">
                    <FlagTeam flag={match.away_flag} name={match.away_team} reverse={true} className="text-sm justify-start w-full" />
                  </div>
                </div>

                {/* Resultado Real e Pontos */}
                <div className="flex items-center gap-3.5 w-full sm:w-auto justify-center sm:justify-end border-t sm:border-t-0 border-slate-800 pt-3.5 sm:pt-0">
                  {hasRealResult ? (
                    <>
                      <div className="text-center sm:text-right">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Resultado Real</span>
                        <span className="text-sm font-black text-white">{match.home_score} x {match.away_score}</span>
                      </div>
                      <PointsBadge points={pred.points} />
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 font-bold uppercase italic select-none">
                      Jogo não realizado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
