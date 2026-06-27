'use client';

import React, { useState } from 'react';
import { getCountryCode } from './FlagTeam';
import { formatMatchDateTime } from '@/lib/date';
import { Trophy, CaretDown, CaretUp } from '@phosphor-icons/react';

export interface BracketMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  home_score: number | null;
  away_score: number | null;
  match_time: string;
}

export interface BracketColumn {
  stage: string;
  matches: BracketMatch[];
}

interface KnockoutBracketProps {
  columns: BracketColumn[];
  thirdPlace?: BracketMatch | null;
}

function TeamRow({
  flag, name, score, won, isScored,
}: { flag: string; name: string; score: number | null; won: boolean; isScored: boolean }) {
  const isPlaceholder = name === 'A confirmar' || !name;
  const countryCode = !isPlaceholder ? getCountryCode(flag, name) : '';
  return (
    <div className={`flex items-center justify-between gap-2 py-1 px-0.5 ${won ? 'font-black text-primary' : isScored ? 'text-secondary/70 font-bold' : 'text-secondary font-bold'}`}>
      <span className="flex items-center gap-1.5 min-w-0 truncate">
        {countryCode ? (
          <img src={`https://flagcdn.com/w20/${countryCode}.png`} alt={name} className="w-4 h-3 object-cover rounded-[2px] shrink-0" loading="lazy" />
        ) : (
          <span className="w-4 h-3 rounded-[2px] bg-muted/60 shrink-0" />
        )}
        <span className={`truncate text-[11px] ${isPlaceholder ? 'italic opacity-50' : ''}`}>{name || 'A confirmar'}</span>
      </span>
      <span className="text-[11px] tabular-nums shrink-0">{isScored ? score : ''}</span>
    </div>
  );
}

function MatchCard({ m }: { m: BracketMatch }) {
  const isScored = m.home_score !== null && m.away_score !== null;
  const homeWon = isScored && (m.home_score as number) > (m.away_score as number);
  const awayWon = isScored && (m.away_score as number) > (m.home_score as number);
  return (
    <div className={`rounded-xl border px-2.5 py-1.5 w-[172px] shrink-0 transition-colors ${isScored ? 'border-accent-custom/30 bg-accent-custom/5' : 'border-border-custom bg-card'}`}>
      <TeamRow flag={m.home_flag} name={m.home_team} score={m.home_score} won={homeWon} isScored={isScored} />
      <div className="h-px bg-border-custom/30 my-0.5" />
      <TeamRow flag={m.away_flag} name={m.away_team} score={m.away_score} won={awayWon} isScored={isScored} />
      {!isScored && (
        <div className="text-[9px] text-secondary/60 font-bold mt-1 pt-1 border-t border-border-custom/30 text-center">
          {formatMatchDateTime(m.match_time)}
        </div>
      )}
    </div>
  );
}

// Connector lines between two columns.
// Each "pair" of left matches → one right match, visualised as:
//   ───┐
//      ├──
//   ───┘
function Connector({ leftMatchCount, cellH }: { leftMatchCount: number; cellH: number }) {
  const pairs = Math.floor(leftMatchCount / 2);
  return (
    <div className="flex flex-col shrink-0" style={{ width: 16 }}>
      {Array.from({ length: pairs }).map((_, pi) => (
        <React.Fragment key={pi}>
          {/* top half of pair */}
          <div style={{ height: cellH }} className="border-r border-t border-border-custom/30" />
          {/* bottom half of pair */}
          <div style={{ height: cellH }} className="border-r border-b border-border-custom/30" />
        </React.Fragment>
      ))}
    </div>
  );
}

// Height of a single cell in the Fase de 32 column (px).
const BASE_CELL_H = 84;

// Stage display labels
const STAGE_LABELS: Record<string, string> = {
  'Fase de 32':        'Fase de 32',
  'Oitavas de Final':  'Oitavas',
  'Quartas de Final':  'Quartas',
  'Semifinal':         'Semi',
  'Final':             'Final',
};

export default function KnockoutBracket({ columns, thirdPlace }: KnockoutBracketProps) {
  const [open, setOpen] = useState(false);

  const visibleColumns = columns.filter((c) => c.matches.length > 0);
  if (visibleColumns.length === 0) return null;

  // Sort matches within each column by match_time so order is consistent
  const sortedColumns = visibleColumns.map((col) => ({
    ...col,
    matches: [...col.matches].sort((a, b) => a.match_time.localeCompare(b.match_time)),
  }));

  return (
    <div className="bg-card border border-border-custom rounded-2xl mb-8 shadow-md overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Trophy size={15} weight="fill" className="text-amber-500 shrink-0" />
          <span className="text-xs font-black text-primary uppercase tracking-wider">Chaveamento — Fase de 32 até a Final</span>
        </div>
        {open
          ? <CaretUp size={14} className="text-secondary shrink-0" />
          : <CaretDown size={14} className="text-secondary shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border-custom/40 px-4 pt-4 pb-5">
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            {/* Stage header row — separate so all bracket cells start at the same y */}
            <div className="flex gap-0 mb-1 min-w-max">
              {sortedColumns.map((col, colIdx) => (
                <React.Fragment key={`hdr-${col.stage}`}>
                  <div style={{ width: 180 }} className="text-[8px] font-black text-secondary/50 uppercase tracking-widest text-center">
                    {STAGE_LABELS[col.stage] ?? col.stage}
                  </div>
                  {colIdx < sortedColumns.length - 1 && <div style={{ width: 16 }} />}
                </React.Fragment>
              ))}
            </div>

            {/* Bracket body — all columns start at y=0 so cell heights align naturally */}
            <div className="flex items-start min-w-max">
              {sortedColumns.map((col, colIdx) => {
                const cellH = BASE_CELL_H * Math.pow(2, colIdx);
                return (
                  <React.Fragment key={col.stage}>
                    <div className="flex flex-col shrink-0" style={{ width: 180 }}>
                      {col.matches.map((m) => (
                        <div key={m.id} style={{ height: cellH }} className="flex items-center">
                          <MatchCard m={m} />
                        </div>
                      ))}
                    </div>
                    {colIdx < sortedColumns.length - 1 && (
                      <Connector leftMatchCount={col.matches.length} cellH={cellH} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {thirdPlace && (
            <div className="mt-5 pt-4 border-t border-border-custom/40 flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-black text-secondary uppercase tracking-widest">🥉 Disputa de 3º Lugar</span>
              <MatchCard m={thirdPlace} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
