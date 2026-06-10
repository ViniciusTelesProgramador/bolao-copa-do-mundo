import React from 'react';

interface FlagTeamProps {
  flag: string;
  name: string;
  reverse?: boolean;
  className?: string;
}

export default function FlagTeam({ flag, name, reverse = false, className = '' }: FlagTeamProps) {
  return (
    <div className={`flex items-center gap-2.5 ${reverse ? 'flex-row-reverse text-right' : 'flex-row'} ${className}`}>
      <span className="text-2xl leading-none select-none filter drop-shadow-sm" role="img" aria-label={`Bandeira do(a) ${name}`}>
        {flag}
      </span>
      <span className="font-semibold text-slate-800 dark:text-slate-100 tracking-wide text-sm md:text-base">
        {name}
      </span>
    </div>
  );
}
