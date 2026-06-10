'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FlagTeam from './FlagTeam';
import { Match, Prediction } from '@/types';
import { savePrediction } from '@/app/actions';
import { ArrowLeft, Check, Spinner, Lock } from '@phosphor-icons/react';
import Link from 'next/link';

interface PredictionFormProps {
  match: Match;
  initialPrediction?: Prediction | null;
}

export default function PredictionForm({ match, initialPrediction }: PredictionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [homeScore, setHomeScore] = useState<string>(
    initialPrediction ? String(initialPrediction.home_score) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    initialPrediction ? String(initialPrediction.away_score) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const matchTime = new Date(match.match_time);
  const isMatchStarted = matchTime <= new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatchStarted) {
      setError('Palpites encerrados.');
      return;
    }

    if (homeScore === '' || awayScore === '') {
      setError('Por favor, informe o placar completo.');
      return;
    }

    const homeVal = parseInt(homeScore, 10);
    const awayVal = parseInt(awayScore, 10);

    if (isNaN(homeVal) || isNaN(awayVal) || homeVal < 0 || awayVal < 0) {
      setError('Os gols devem ser números maiores ou iguais a zero.');
      return;
    }

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await savePrediction(match.id, homeVal, awayVal);
        if (result.success) {
          setSuccess(true);
          router.refresh();
          setTimeout(() => {
            router.push('/palpites');
          }, 1500);
        } else {
          setError(result.error || 'Erro ao salvar palpite.');
        }
      } catch (err: any) {
        setError(err.message || 'Erro inesperado ao salvar palpite.');
      }
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#1e293b] border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-fadeIn">
      {/* Voltar */}
      <div className="mb-6">
        <Link
          href="/palpites"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} weight="bold" />
          Voltar para Jogos
        </Link>
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-white text-center mb-1">
        {initialPrediction ? 'Editar Palpite' : 'Cadastrar Palpite'}
      </h2>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center mb-6">
        {match.stage} {match.group_name ? `• ${match.group_name}` : ''}
      </p>

      {/* Info Partida */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col items-center">
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">
          Prazo: {matchTime.toLocaleDateString('pt-BR')} às {matchTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>

        <div className="grid grid-cols-12 items-center w-full gap-2 mt-2">
          {/* Time Casa */}
          <div className="col-span-5 flex justify-start">
            <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="w-full justify-start text-sm sm:text-base" />
          </div>

          {/* Divisor X */}
          <div className="col-span-2 flex justify-center text-slate-600 font-black text-xs uppercase tracking-wider select-none">
            vs
          </div>

          {/* Time Fora */}
          <div className="col-span-5 flex justify-end">
            <FlagTeam flag={match.away_flag} name={match.away_team} reverse={true} className="w-full justify-end text-sm sm:text-base" />
          </div>
        </div>
      </div>

      {/* Aviso se jogo já começou */}
      {isMatchStarted && (
        <div className="bg-slate-900/60 border border-slate-800 text-slate-400 rounded-xl p-4 mb-6 flex items-center justify-center gap-2 text-sm font-bold animate-fadeIn">
          <Lock size={18} className="text-rose-500" />
          Palpites encerrados
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-center gap-6 sm:gap-8">
          {/* Home Input */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase sm:hidden">
              {match.home_team.substring(0, 3)}
            </span>
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              disabled={isPending || isMatchStarted || success}
              className="w-20 h-20 text-center text-4xl font-black bg-slate-950 border-2 border-slate-800 focus:border-[#22c55e] text-white rounded-2xl focus:outline-none transition-colors duration-200 disabled:opacity-45 disabled:cursor-not-allowed select-all"
              placeholder="0"
              required
            />
          </div>

          <span className="text-3xl font-black text-slate-700 select-none">-</span>

          {/* Away Input */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase sm:hidden">
              {match.away_team.substring(0, 3)}
            </span>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              disabled={isPending || isMatchStarted || success}
              className="w-20 h-20 text-center text-4xl font-black bg-slate-950 border-2 border-slate-800 focus:border-[#22c55e] text-white rounded-2xl focus:outline-none transition-colors duration-200 disabled:opacity-45 disabled:cursor-not-allowed select-all"
              placeholder="0"
              required
            />
          </div>
        </div>

        {/* Notificações de erro ou sucesso */}
        {error && (
          <div className="bg-rose-950/20 border border-rose-900/40 text-rose-450 rounded-xl p-3.5 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-[#22c55e] rounded-xl p-3.5 text-xs font-bold text-center flex items-center justify-center gap-2">
            <Check size={16} weight="bold" />
            Palpite salvo com sucesso!
          </div>
        )}

        {/* Botão de Envio */}
        <button
          type="submit"
          disabled={isPending || isMatchStarted || success}
          className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-[#22c55e] to-[#1ea34d] hover:from-[#1ea34d] hover:to-[#22c55e] text-slate-950 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Spinner className="animate-spin" size={18} weight="bold" />
              Salvando...
            </>
          ) : isMatchStarted ? (
            'Palpites Encerrados'
          ) : (
            'Salvar Palpite'
          )}
        </button>
      </form>
    </div>
  );
}
