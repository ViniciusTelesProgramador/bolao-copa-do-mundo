'use client';

import React, { useState, useMemo } from 'react';
import FlagTeam from './FlagTeam';
import PointsBadge from './PointsBadge';
import { ArrowsLeftRight, Swap } from '@phosphor-icons/react';
import { formatMatchDate } from '@/lib/date';
import { Match } from '@/types';

interface ProfileOption {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface PredictionItem {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
}

interface HeadToHeadClientProps {
  profiles: ProfileOption[];
  matches: Match[];
  predictions: PredictionItem[];
  currentUserId?: string | null;
}

function findOtherDefault(profiles: ProfileOption[], excludeId: string | null): string {
  const other = profiles.find((p) => p.id !== excludeId);
  return other?.id ?? '';
}

export default function HeadToHeadClient({ profiles, matches, predictions, currentUserId }: HeadToHeadClientProps) {
  const [userAId, setUserAId] = useState(currentUserId || profiles[0]?.id || '');
  const [userBId, setUserBId] = useState(findOtherDefault(profiles, currentUserId || profiles[0]?.id || null));

  const userA = profiles.find((p) => p.id === userAId);
  const userB = profiles.find((p) => p.id === userBId);

  const comparison = useMemo(() => {
    if (!userAId || !userBId) return { rows: [], winsA: 0, winsB: 0, ties: 0, totalA: 0, totalB: 0 };

    const predsA = new Map(predictions.filter((p) => p.user_id === userAId).map((p) => [p.match_id, p]));
    const predsB = new Map(predictions.filter((p) => p.user_id === userBId).map((p) => [p.match_id, p]));

    const sortedMatches = [...matches]
      .filter((m) => m.home_score !== null && m.away_score !== null)
      .filter((m) => predsA.has(m.id) || predsB.has(m.id))
      .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());

    let winsA = 0, winsB = 0, ties = 0, totalA = 0, totalB = 0;

    const rows = sortedMatches.map((m) => {
      const predA = predsA.get(m.id) ?? null;
      const predB = predsB.get(m.id) ?? null;
      const isScored = m.home_score !== null && m.away_score !== null;
      const pointsA = isScored ? (predA?.points ?? 0) : null;
      const pointsB = isScored ? (predB?.points ?? 0) : null;

      let winner: 'A' | 'B' | 'tie' | null = null;
      if (isScored && predA && predB) {
        if (pointsA! > pointsB!) { winner = 'A'; winsA++; }
        else if (pointsB! > pointsA!) { winner = 'B'; winsB++; }
        else { winner = 'tie'; ties++; }
      }
      if (isScored) {
        totalA += pointsA ?? 0;
        totalB += pointsB ?? 0;
      }

      return { match: m, predA, predB, pointsA, pointsB, winner, isScored };
    });

    return { rows, winsA, winsB, ties, totalA, totalB };
  }, [userAId, userBId, matches, predictions]);

  if (profiles.length < 2) return null;

  return (
    <div className="bg-card border border-border-custom rounded-2xl overflow-hidden shadow-xl mb-12">
      <div className="px-5 py-4 border-b border-border-custom/60 bg-muted/40 flex items-center gap-2">
        <ArrowsLeftRight size={16} className="text-accent-custom shrink-0" />
        <h3 className="text-xs sm:text-sm font-extrabold text-primary uppercase tracking-wider select-none">
          Comparador Cara a Cara
        </h3>
      </div>

      {/* Seletores */}
      <div className="p-5 flex items-center gap-3">
        <select
          value={userAId}
          onChange={(e) => setUserAId(e.target.value)}
          className="flex-1 h-11 px-3 bg-base border border-border-custom rounded-xl text-sm font-bold text-primary focus:outline-none focus:border-accent-custom transition-colors"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === userBId}>{p.name}</option>
          ))}
        </select>

        <button
          onClick={() => { const a = userAId; setUserAId(userBId); setUserBId(a); }}
          className="h-11 w-11 shrink-0 flex items-center justify-center bg-muted border border-border-custom rounded-xl text-secondary hover:text-accent-custom transition-colors cursor-pointer"
          title="Trocar lados"
        >
          <Swap size={16} weight="bold" />
        </button>

        <select
          value={userBId}
          onChange={(e) => setUserBId(e.target.value)}
          className="flex-1 h-11 px-3 bg-base border border-border-custom rounded-xl text-sm font-bold text-primary focus:outline-none focus:border-accent-custom transition-colors"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === userAId}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Placar geral */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/40 border border-border-custom/50 rounded-xl py-3">
          <span className="text-2xl font-black text-emerald-500 block">{comparison.winsA}</span>
          <span className="text-[9px] font-black text-secondary uppercase tracking-wider">{userA?.name ?? 'A'} venceu</span>
          <span className="text-[10px] text-secondary font-bold block mt-1">{comparison.totalA} pts no total</span>
        </div>
        <div className="bg-muted/40 border border-border-custom/50 rounded-xl py-3">
          <span className="text-2xl font-black text-secondary block">{comparison.ties}</span>
          <span className="text-[9px] font-black text-secondary uppercase tracking-wider">Empates</span>
        </div>
        <div className="bg-muted/40 border border-border-custom/50 rounded-xl py-3">
          <span className="text-2xl font-black text-emerald-500 block">{comparison.winsB}</span>
          <span className="text-[9px] font-black text-secondary uppercase tracking-wider">{userB?.name ?? 'B'} venceu</span>
          <span className="text-[10px] text-secondary font-bold block mt-1">{comparison.totalB} pts no total</span>
        </div>
      </div>

      {/* Lista jogo a jogo */}
      {comparison.rows.length === 0 ? (
        <div className="px-5 pb-5 text-center text-xs text-secondary font-bold">
          Nenhum jogo encerrado com palpites dos dois ainda.
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-2.5">
          {comparison.rows.map(({ match, predA, predB, winner, isScored }) => (
            <div key={match.id} className="rounded-xl border border-border-custom overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 text-[10px] font-bold text-secondary">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FlagTeam flag={match.home_flag} name={match.home_team} className="text-[10px]" />
                  <span className="opacity-50">x</span>
                  <FlagTeam flag={match.away_flag} name={match.away_team} className="text-[10px]" />
                </div>
                <span className="shrink-0 ml-2">
                  {isScored ? `${match.home_score} x ${match.away_score}` : formatMatchDate(match.match_time)}
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border-custom/30">
                <div className={`p-2.5 text-center ${winner === 'A' ? 'bg-emerald-500/10' : ''}`}>
                  <p className="text-[9px] text-secondary font-bold truncate">{userA?.name}</p>
                  <p className="text-sm font-black text-primary mt-0.5">
                    {predA ? `${predA.home_score} x ${predA.away_score}` : '—'}
                  </p>
                  {isScored && predA && <div className="mt-1 flex justify-center"><PointsBadge points={predA.points} /></div>}
                </div>
                <div className={`p-2.5 text-center ${winner === 'B' ? 'bg-emerald-500/10' : ''}`}>
                  <p className="text-[9px] text-secondary font-bold truncate">{userB?.name}</p>
                  <p className="text-sm font-black text-primary mt-0.5">
                    {predB ? `${predB.home_score} x ${predB.away_score}` : '—'}
                  </p>
                  {isScored && predB && <div className="mt-1 flex justify-center"><PointsBadge points={predB.points} /></div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
