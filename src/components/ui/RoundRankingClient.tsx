'use client';

import React, { useState } from 'react';
import { CalendarCheck } from '@phosphor-icons/react';

export interface RoundEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  points: number;
  acertos: number;
  predictions_count: number;
}

export interface RoundData {
  dateKey: string;
  label: string;
  entries: RoundEntry[];
}

interface RoundRankingClientProps {
  rounds: RoundData[];
  currentUserId?: string | null;
}

export default function RoundRankingClient({ rounds, currentUserId }: RoundRankingClientProps) {
  const [selected, setSelected] = useState(rounds.length > 0 ? rounds[rounds.length - 1].dateKey : '');

  if (rounds.length === 0) return null;

  const current = rounds.find((r) => r.dateKey === selected) ?? rounds[rounds.length - 1];

  return (
    <div className="w-full bg-card border border-border-custom rounded-2xl overflow-hidden shadow-xl mt-6">
      <div className="px-5 py-4 border-b border-border-custom/60 bg-muted/40 flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-extrabold text-primary flex items-center gap-2 uppercase tracking-wider select-none">
          <CalendarCheck size={16} className="text-accent-custom shrink-0" />
          Ranking da Rodada
        </h3>
      </div>

      {/* Seletor de rodada (dia de jogos) */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5 border-b border-border-custom/40">
        {rounds.map((r) => (
          <button
            key={r.dateKey}
            onClick={() => setSelected(r.dateKey)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              current.dateKey === r.dateKey
                ? 'bg-accent-custom text-slate-950'
                : 'bg-muted text-secondary hover:text-primary'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border-custom/30">
        {current.entries.length === 0 ? (
          <div className="p-6 text-center text-xs text-secondary font-bold">
            Nenhum palpite pontuado nesta rodada.
          </div>
        ) : (
          current.entries.map((e, i) => {
            const isSelf = e.user_id === currentUserId;
            const pos = i + 1;
            return (
              <div
                key={e.user_id}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isSelf ? 'bg-accent-custom/5' : ''}`}
              >
                <span className={`w-5 text-center text-[11px] font-black shrink-0 ${pos === 1 ? 'text-amber-500' : 'text-secondary'}`}>
                  {pos}
                </span>
                {e.avatar_url ? (
                  <img src={e.avatar_url} alt={e.name} className="w-7 h-7 rounded-full object-cover border border-border-custom shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-secondary shrink-0">
                    {e.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className={`text-xs font-bold flex-1 truncate ${isSelf ? 'text-accent-custom' : 'text-primary'}`}>
                  {e.name}{isSelf && <span className="opacity-60"> (você)</span>}
                </span>
                <span className="text-[10px] text-secondary font-bold shrink-0 hidden sm:inline">
                  {e.acertos}/{e.predictions_count} acertos
                </span>
                <span className="text-sm font-black text-accent-custom shrink-0 w-8 text-right">
                  {e.points}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
