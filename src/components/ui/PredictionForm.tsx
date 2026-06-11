'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FlagTeam from './FlagTeam';
import { Match, Prediction } from '@/types';
import { savePrediction } from '@/app/actions';
import { ArrowLeft, Check, Spinner, Lock } from '@phosphor-icons/react';
import Link from 'next/link';
import { showToast } from './Toast';
import { formatMatchDateTime } from '@/lib/date';

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
          showToast(initialPrediction ? 'Palpite atualizado!' : 'Palpite salvo com sucesso!', 'success');
          router.refresh();
          setTimeout(() => {
            router.push('/palpites');
          }, 1000);
        } else {
          setError(result.error || 'Erro ao salvar palpite.');
        }
      } catch (err: any) {
        setError(err.message || 'Erro inesperado ao salvar palpite.');
      }
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-card border border-border-custom rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 animate-fadeIn">
      {/* Voltar */}
      <div className="mb-6 flex">
        <Link
          href="/palpites"
          className="inline-flex items-center justify-center min-h-[48px] min-w-[48px] px-3 gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors uppercase tracking-wider rounded-xl border border-border-custom hover:bg-muted"
        >
          <ArrowLeft size={14} weight="bold" />
          Voltar
        </Link>
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-primary text-center mb-1 uppercase tracking-wider">
        {initialPrediction ? 'Editar Palpite' : 'Cadastrar Palpite'}
      </h2>
      <p className="text-xs text-secondary font-bold uppercase tracking-wider text-center mb-6">
        {match.stage} {match.group_name ? `• ${match.group_name}` : ''}
      </p>

      {/* Info Partida */}
      <div className="bg-muted/40 border border-border-custom/50 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col items-center">
        <span className="text-xs text-secondary font-bold uppercase tracking-wider mb-2 select-none">
          Prazo: {formatMatchDateTime(match.match_time)}
        </span>
        {match.home_score !== null && match.away_score !== null ? (
          <div className="mt-3 flex flex-col items-center gap-1 select-none">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Placar Oficial</span>
            <span className="text-xl font-black text-accent-custom bg-accent-custom/10 border border-accent-custom/25 px-4 py-1 rounded-xl">
              {match.home_score} x {match.away_score}
            </span>
          </div>
        ) : isMatchStarted ? (
          <div className="mt-3 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse select-none">
            Jogo em Andamento
          </div>
        ) : null}
      </div>

      {/* Aviso se jogo já começou */}
      {isMatchStarted && (
        <div className="bg-muted border border-border-custom text-secondary rounded-xl p-4 mb-6 flex items-center justify-center gap-2 text-sm font-bold animate-fadeIn">
          <Lock size={18} className="text-rose-500 animate-pulse" />
          Palpites encerrados
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
          {/* Home Input */}
          <div className="flex flex-col items-center gap-3 flex-1 w-full sm:max-w-[140px]">
            <span className="text-xs font-black text-secondary tracking-wider uppercase text-center flex flex-col items-center gap-1.5">
              <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="justify-center scale-110 mb-1" />
            </span>
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              disabled={isPending || isMatchStarted || success}
              className="w-20 h-20 text-center text-4xl font-black bg-base border-2 border-border-custom focus:border-accent-custom text-primary rounded-2xl focus:outline-none transition-colors duration-200 disabled:opacity-45 disabled:cursor-not-allowed select-all"
              placeholder="0"
              required
            />
          </div>

          <span className="text-3xl font-black text-secondary/40 select-none hidden sm:inline">-</span>
          <span className="text-xs font-bold text-secondary uppercase tracking-widest sm:hidden">vs</span>

          {/* Away Input */}
          <div className="flex flex-col items-center gap-3 flex-1 w-full sm:max-w-[140px]">
            <span className="text-xs font-black text-secondary tracking-wider uppercase text-center flex flex-col items-center gap-1.5">
              <FlagTeam flag={match.away_flag} name={match.away_team} reverse={false} className="justify-center scale-110 mb-1" />
            </span>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              disabled={isPending || isMatchStarted || success}
              className="w-20 h-20 text-center text-4xl font-black bg-base border-2 border-border-custom focus:border-accent-custom text-primary rounded-2xl focus:outline-none transition-colors duration-200 disabled:opacity-45 disabled:cursor-not-allowed select-all"
              placeholder="0"
              required
            />
          </div>
        </div>

        {/* Notificações de erro ou sucesso */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3.5 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* Botão de Envio */}
        <button
          type="submit"
          disabled={isPending || isMatchStarted || success}
          className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-accent-custom to-accent-hover text-slate-950 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
