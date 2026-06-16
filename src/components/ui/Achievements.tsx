import React from 'react';
import { Medal } from '@phosphor-icons/react/dist/ssr';

export interface AchievementBadge {
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
}

interface AchievementsProps {
  badges: AchievementBadge[];
}

export default function Achievements({ badges }: AchievementsProps) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="bg-card border border-border-custom rounded-2xl p-5 shadow-md mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Medal size={16} weight="fill" className="text-amber-500" />
        <h3 className="text-xs font-black text-primary uppercase tracking-wider">Conquistas</h3>
        <span className="text-[10px] font-bold text-secondary ml-auto">{unlockedCount}/{badges.length}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {badges.map((b) => (
          <div
            key={b.label}
            title={b.description}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 px-1 text-center transition-all select-none ${
              b.unlocked
                ? 'bg-amber-500/10 border-amber-500/30 shadow-sm shadow-amber-500/10'
                : 'bg-muted/30 border-border-custom/40 opacity-40 grayscale'
            }`}
          >
            <span className="text-2xl">{b.icon}</span>
            <span className={`text-[9px] font-black uppercase tracking-wide leading-tight ${b.unlocked ? 'text-amber-500' : 'text-secondary'}`}>
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
