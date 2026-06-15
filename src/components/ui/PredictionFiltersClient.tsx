'use client';

import React, { useState, useMemo } from 'react';
import FlagTeam from './FlagTeam';
import PointsBadge from './PointsBadge';
import { Calendar } from '@phosphor-icons/react';
import Link from 'next/link';
import { formatMatchDateTime } from '@/lib/date';

type StatusFilter = 'todos' | 'aguardando' | 'acertos' | 'erros';
type TipoFilter = 'todos' | 'exato' | 'saldo' | 'vencedor' | 'erro';
type Ordem = 'asc' | 'desc';

interface MatchData {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  stage: string;
  group_name: string | null;
}

interface PredictionItem {
  id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  match: MatchData;
}

interface PredictionFiltersClientProps {
  predictions: PredictionItem[];
}

const STATUS_TABS: { key: StatusFilter; label: string; activeColor: string }[] = [
  { key: 'todos',      label: 'Todos',      activeColor: 'text-primary' },
  { key: 'aguardando', label: 'Aguardando', activeColor: 'text-amber-500' },
  { key: 'acertos',    label: 'Acertos',    activeColor: 'text-green-500' },
  { key: 'erros',      label: 'Erros',      activeColor: 'text-red-400' },
];

const TIPO_TABS: { key: TipoFilter; label: string; pts: string; color: string }[] = [
  { key: 'todos',     label: 'Todos',     pts: '',     color: 'text-primary' },
  { key: 'exato',     label: 'Exato',     pts: '3pts', color: 'text-accent-custom' },
  { key: 'saldo',     label: 'Saldo',     pts: '2pts', color: 'text-amber-500' },
  { key: 'vencedor',  label: 'Vencedor',  pts: '1pt',  color: 'text-sky-400' },
  { key: 'erro',      label: 'Erro',      pts: '0pt',  color: 'text-red-400' },
];

export default function PredictionFiltersClient({ predictions }: PredictionFiltersClientProps) {
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [tipo, setTipo] = useState<TipoFilter>('todos');
  const [ordem, setOrdem] = useState<Ordem>('asc');

  const counts = useMemo(() => ({
    todos:      predictions.length,
    aguardando: predictions.filter(p => p.match.home_score === null).length,
    acertos:    predictions.filter(p => p.match.home_score !== null && (p.points ?? 0) > 0).length,
    erros:      predictions.filter(p => p.match.home_score !== null && (p.points ?? 0) === 0).length,
  }), [predictions]);

  const filtered = useMemo(() => {
    let result = [...predictions];

    if (status === 'aguardando') {
      result = result.filter(p => p.match.home_score === null);
    } else if (status === 'acertos') {
      result = result.filter(p => p.match.home_score !== null && (p.points ?? 0) > 0);
    } else if (status === 'erros') {
      result = result.filter(p => p.match.home_score !== null && (p.points ?? 0) === 0);
    }

    if (tipo !== 'todos' && status !== 'aguardando') {
      if      (tipo === 'exato')    result = result.filter(p => p.points === 3);
      else if (tipo === 'saldo')    result = result.filter(p => p.points === 2);
      else if (tipo === 'vencedor') result = result.filter(p => p.points === 1);
      else if (tipo === 'erro')     result = result.filter(p => p.match.home_score !== null && (p.points ?? 0) === 0);
    }

    result.sort((a, b) => {
      const diff = new Date(a.match.match_time).getTime() - new Date(b.match.match_time).getTime();
      return ordem === 'asc' ? diff : -diff;
    });

    return result;
  }, [predictions, status, tipo, ordem]);

  const handleStatusChange = (s: StatusFilter) => {
    setStatus(s);
    if (s === 'aguardando') setTipo('todos');
  };

  return (
    <div>
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Tabs de status */}
        <div className="flex items-center gap-1 bg-card border border-border-custom rounded-xl p-1 flex-wrap">
          {STATUS_TABS.map(({ key, label, activeColor }) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                status === key
                  ? `bg-muted ${activeColor} shadow-sm`
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[10px] tabular-nums ${status === key ? 'opacity-60' : 'opacity-35'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Toggle de ordem */}
        <button
          onClick={() => setOrdem(o => o === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border-custom rounded-xl text-xs font-bold text-secondary hover:text-primary transition-all cursor-pointer shrink-0"
        >
          {ordem === 'asc' ? '↑ Mais antigo' : '↓ Mais recente'}
        </button>
      </div>

      {/* Sub-filtro de tipo (só em jogos finalizados) */}
      {status !== 'aguardando' && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          {TIPO_TABS.map(({ key, label, pts, color }) => (
            <button
              key={key}
              onClick={() => setTipo(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                tipo === key
                  ? `bg-muted border-border-custom ${color}`
                  : 'bg-transparent border-border-custom/50 text-secondary hover:text-primary hover:border-border-custom'
              }`}
            >
              {label}
              {pts && (
                <span className="text-[9px] opacity-55 font-black">{pts}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lista de palpites */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-secondary text-sm font-bold bg-card border border-border-custom rounded-2xl">
          Nenhum palpite para este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(pred => {
            const match = pred.match;
            const isScored = match.home_score !== null && match.away_score !== null;

            let cardBg = 'bg-card border-border-custom hover:border-secondary';
            if (isScored) {
              if (pred.points === 3)            cardBg = 'bg-green-500/5 border-green-500/20';
              else if ((pred.points ?? 0) > 0)  cardBg = 'bg-blue-500/5 border-blue-500/20';
              else                              cardBg = 'bg-card border-border-custom/60';
            }

            return (
              <div
                key={pred.id}
                className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-200 ${cardBg}`}
              >
                {/* Metadados */}
                <div className="text-xs text-secondary font-semibold space-y-1 w-full sm:w-auto text-center sm:text-left shrink-0">
                  <div className="bg-muted px-2 py-0.5 rounded-full text-[9px] text-primary uppercase font-extrabold inline-block">
                    {match.stage}{match.group_name ? ` • ${match.group_name}` : ''}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-secondary mt-1 font-bold">
                    <Calendar size={12} />
                    {formatMatchDateTime(match.match_time)}
                  </div>
                </div>

                {/* Confronto */}
                <div className="flex flex-1 items-center justify-center gap-3 w-full max-w-md my-1 sm:my-0">
                  <div className="flex-1 flex justify-end">
                    <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="text-sm justify-end w-full" />
                  </div>

                  <div className="flex flex-col items-center px-3 py-1.5 bg-base border border-border-custom rounded-xl shrink-0 min-w-[80px]">
                    <span className="text-[8px] text-secondary font-bold uppercase tracking-wider">Palpite</span>
                    <span className="text-sm font-black text-amber-500 mt-0.5">{pred.home_score} x {pred.away_score}</span>
                    {isScored && (
                      <>
                        <span className="text-[8px] text-secondary font-bold uppercase tracking-wider mt-1.5 border-t border-border-custom/40 pt-1 w-full text-center">Real</span>
                        <span className="text-sm font-black text-primary">{match.home_score} x {match.away_score}</span>
                      </>
                    )}
                  </div>

                  <div className="flex-1 flex justify-start">
                    <FlagTeam flag={match.away_flag} name={match.away_team} reverse={true} className="text-sm justify-start w-full" />
                  </div>
                </div>

                {/* Pontos ou editar */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end border-t sm:border-t-0 border-border-custom/40 pt-3 sm:pt-0 shrink-0">
                  {isScored ? (
                    <PointsBadge points={pred.points} />
                  ) : (
                    <Link
                      href={`/palpites?match=${match.id}`}
                      className="min-h-[44px] px-4 flex items-center justify-center bg-muted hover:bg-border-custom text-primary text-xs font-bold rounded-xl border border-border-custom transition-all"
                    >
                      Editar Palpite
                    </Link>
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
