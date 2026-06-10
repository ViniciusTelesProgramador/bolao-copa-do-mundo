'use client';

import React from 'react';
import Link from 'next/link';
import FlagTeam from './FlagTeam';
import PointsBadge from './PointsBadge';
import { Match, Prediction } from '@/types';
import { Calendar, NotePencil, Lock } from '@phosphor-icons/react';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction | null;
  isAuthenticated: boolean;
}

export default function MatchCard({ match, prediction, isAuthenticated }: MatchCardProps) {
  const matchTime = new Date(match.match_time);
  const isStarted = matchTime <= new Date();

  // Formatação de data e hora
  const dateFormatted = matchTime.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  const timeFormatted = matchTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasRealResult = match.home_score !== null && match.away_score !== null;
  const hasPrediction = !!prediction;

  // Bordas baseadas na presença de palpite
  const cardBorderClass = hasPrediction
    ? 'border-[#22c55e]/50 hover:border-[#22c55e]'
    : 'border-slate-800 hover:border-slate-700';

  return (
    <div
      className={`bg-[#1e293b] border-2 ${cardBorderClass} rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:scale-[1.02] transition-all duration-300`}
    >
      {/* Header do Card */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-4 pb-3 border-b border-slate-800/60">
        <span className="bg-slate-900 px-2 py-0.5 rounded-full text-[10px] text-slate-300 uppercase tracking-wider">
          {match.stage} {match.group_name ? `• ${match.group_name}` : ''}
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Calendar size={14} />
          {dateFormatted} às {timeFormatted}
        </span>
      </div>

      {/* Grid Principal (Layout Confronto Simétrico) */}
      <div className="grid grid-cols-12 items-center gap-2 my-2 w-full">
        {/* Time Mandante (Bandeira + Nome) */}
        <div className="col-span-5 flex justify-start">
          <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="w-full justify-start" />
        </div>

        {/* Scores ou Placar Central (X) */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          {hasRealResult ? (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 font-extrabold text-sm text-[#22c55e] select-none">
              <span>{match.home_score}</span>
              <span className="text-slate-600 text-xs font-bold">x</span>
              <span>{match.away_score}</span>
            </div>
          ) : (
            <span className="text-xs font-black text-slate-500 select-none">
              x
            </span>
          )}
        </div>

        {/* Time Visitante (Nome + Bandeira) */}
        <div className="col-span-5 flex justify-end">
          <FlagTeam flag={match.away_flag} name={match.away_team} reverse={true} className="w-full justify-end" />
        </div>
      </div>

      {/* Rodapé: Informação de Palpite e Ações */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/60 flex items-center justify-between gap-3 text-sm">
        {/* Lado Esquerdo: Palpite do Usuário */}
        <div>
          {isAuthenticated ? (
            hasPrediction ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Seu palpite</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                    {prediction.home_score} x {prediction.away_score}
                  </span>
                  {hasRealResult && <PointsBadge points={prediction.points} />}
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-bold italic select-none">
                Sem palpite enviado
              </span>
            )
          ) : (
            <span className="text-xs text-slate-500 italic select-none">
              Entre para palpitar
            </span>
          )}
        </div>

        {/* Lado Direito: Ações */}
        <div>
          {!isStarted ? (
            isAuthenticated ? (
              <Link
                href={`/palpites/${match.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#22c55e] hover:bg-[#1ea34d] text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all duration-200"
              >
                <NotePencil size={13} />
                {hasPrediction ? 'Editar' : 'Palpitar'}
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-650 text-slate-300 text-xs font-semibold rounded-xl border border-slate-650 transition-colors duration-200"
              >
                Palpitar
              </Link>
            )
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase select-none">
              <Lock size={13} />
              Fechado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
