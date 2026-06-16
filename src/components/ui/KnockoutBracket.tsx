import React from 'react';
import { getCountryCode } from './FlagTeam';
import { formatMatchDateTime } from '@/lib/date';
import { Trophy } from '@phosphor-icons/react/dist/ssr';

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

function TeamRow({ flag, name, score, won, isScored }: { flag: string; name: string; score: number | null; won: boolean; isScored: boolean }) {
  const isPlaceholder = name === 'A confirmar' || !name;
  const countryCode = !isPlaceholder ? getCountryCode(flag, name) : '';

  return (
    <div className={`flex items-center justify-between gap-2 py-1 px-0.5 ${won ? 'font-black text-primary' : isScored ? 'text-secondary/70 font-bold' : 'text-secondary font-bold'}`}>
      <span className="flex items-center gap-1.5 min-w-0 truncate">
        {countryCode ? (
          <img src={`https://flagcdn.com/w20/${countryCode}.png`} alt={name} className="w-4 h-3 object-cover rounded-[2px] shrink-0" loading="lazy" />
        ) : isPlaceholder ? (
          <span className="w-4 h-3 rounded-[2px] bg-muted shrink-0" />
        ) : null}
        <span className={`truncate text-[11px] ${isPlaceholder ? 'italic opacity-60' : ''}`}>{name || 'A confirmar'}</span>
      </span>
      <span className="text-[11px] tabular-nums shrink-0">{isScored ? score : ''}</span>
    </div>
  );
}

function BracketMatchCard({ m }: { m: BracketMatch }) {
  const isScored = m.home_score !== null && m.away_score !== null;
  const homeWon = isScored && (m.home_score as number) > (m.away_score as number);
  const awayWon = isScored && (m.away_score as number) > (m.home_score as number);

  return (
    <div className={`rounded-xl border px-2.5 py-1.5 min-w-[175px] shrink-0 transition-colors ${isScored ? 'border-accent-custom/30 bg-accent-custom/5' : 'border-border-custom bg-card'}`}>
      <TeamRow flag={m.home_flag} name={m.home_team} score={m.home_score} won={homeWon} isScored={isScored} />
      <div className="h-px bg-border-custom/30" />
      <TeamRow flag={m.away_flag} name={m.away_team} score={m.away_score} won={awayWon} isScored={isScored} />
      {!isScored && (
        <div className="text-[9px] text-secondary/70 font-bold mt-1.5 pt-1.5 border-t border-border-custom/30 text-center">
          {formatMatchDateTime(m.match_time)}
        </div>
      )}
    </div>
  );
}

export default function KnockoutBracket({ columns, thirdPlace }: KnockoutBracketProps) {
  const visibleColumns = columns.filter((c) => c.matches.length > 0);
  if (visibleColumns.length === 0) return null;

  return (
    <div className="bg-card border border-border-custom rounded-2xl p-5 shadow-md mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} weight="fill" className="text-amber-500" />
        <h3 className="text-xs font-black text-primary uppercase tracking-wider">Mata-Mata</h3>
      </div>

      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-stretch gap-2 min-w-max">
          {visibleColumns.map((col, idx) => (
            <React.Fragment key={col.stage}>
              <div className="flex flex-col gap-2.5 justify-around min-w-[190px]">
                <h4 className="text-[9px] font-black text-secondary uppercase tracking-widest text-center mb-0.5">
                  {col.stage}
                </h4>
                {col.matches.map((m) => (
                  <BracketMatchCard key={m.id} m={m} />
                ))}
              </div>
              {idx < visibleColumns.length - 1 && (
                <div className="flex items-center justify-center px-0.5 text-secondary/30 text-base select-none">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {thirdPlace && (
        <div className="mt-5 pt-4 border-t border-border-custom/40 flex flex-col items-center gap-2">
          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">🥉 Disputa de 3º Lugar</span>
          <BracketMatchCard m={thirdPlace} />
        </div>
      )}
    </div>
  );
}
