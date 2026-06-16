import React from 'react';
import Link from 'next/link';
import FlagTeam from './FlagTeam';
import { formatMatchTime } from '@/lib/date';
import { Warning } from '@phosphor-icons/react/dist/ssr';

interface PendingMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_time: string;
}

interface PendingActionsBannerProps {
  missingMatches: PendingMatch[];
  artilheiroMissing: boolean;
  artilheiroDeadlineLabel?: string;
}

function hoursUntil(matchTime: string): number {
  return Math.max(0, Math.round((new Date(matchTime).getTime() - Date.now()) / (1000 * 60 * 60)));
}

export default function PendingActionsBanner({ missingMatches, artilheiroMissing, artilheiroDeadlineLabel }: PendingActionsBannerProps) {
  if (missingMatches.length === 0 && !artilheiroMissing) return null;

  return (
    <div className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-5 mb-8 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <Warning size={18} weight="fill" className="text-amber-500 shrink-0" />
        <h3 className="text-xs sm:text-sm font-black text-amber-500 uppercase tracking-wider">
          {missingMatches.length > 0
            ? `Falta palpitar em ${missingMatches.length} jogo${missingMatches.length > 1 ? 's' : ''} que ${missingMatches.length > 1 ? 'fecham' : 'fecha'} em breve`
            : 'Pendência no seu bolão'}
        </h3>
      </div>

      {missingMatches.length > 0 && (
        <div className="space-y-2 mb-3">
          {missingMatches.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 bg-card border border-border-custom/60 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FlagTeam flag={m.home_flag} name={m.home_team} className="text-xs" />
                <span className="text-secondary text-[10px] shrink-0">x</span>
                <FlagTeam flag={m.away_flag} name={m.away_team} className="text-xs" />
              </div>
              <span className="shrink-0 text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                fecha em {hoursUntil(m.match_time)}h
              </span>
            </div>
          ))}
          {missingMatches.length > 3 && (
            <p className="text-[11px] text-secondary font-bold pl-1">
              + {missingMatches.length - 3} outro{missingMatches.length - 3 > 1 ? 's' : ''} jogo{missingMatches.length - 3 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {artilheiroMissing && (
        <div className="flex items-center justify-between gap-3 bg-card border border-border-custom/60 rounded-xl px-3 py-2.5 mb-3">
          <span className="text-xs font-bold text-primary">⚽ Você ainda não palpitou o artilheiro da Copa</span>
          {artilheiroDeadlineLabel && (
            <span className="shrink-0 text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
              prazo: {artilheiroDeadlineLabel}
            </span>
          )}
        </div>
      )}

      <Link
        href={missingMatches.length > 0 ? '/palpites' : '/todos'}
        className="inline-flex items-center justify-center min-h-[40px] px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
      >
        Resolver agora
      </Link>
    </div>
  );
}
