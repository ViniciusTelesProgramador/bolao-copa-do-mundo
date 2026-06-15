'use client';

import { useState, useEffect } from 'react';

interface ArtilheiroCountdownProps {
  deadline: string; // ISO string
}

function getTimeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    totalMs: diff,
  };
}

export default function ArtilheiroCountdown({ deadline }: ArtilheiroCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    setTimeLeft(getTimeLeft(deadline));
    const id = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!timeLeft) return null;

  const isUrgent = timeLeft.totalMs < 24 * 60 * 60 * 1000;

  const units = [
    { value: timeLeft.days,    label: 'dias'  },
    { value: timeLeft.hours,   label: 'horas' },
    { value: timeLeft.minutes, label: 'min'   },
    { value: timeLeft.seconds, label: 'seg'   },
  ];

  return (
    <div className={`rounded-2xl border p-4 mb-2 ${
      isUrgent
        ? 'bg-red-500/8 border-red-500/25'
        : 'bg-amber-500/8 border-amber-500/25'
    }`}>
      <p className={`text-[10px] font-black uppercase tracking-widest text-center mb-3 ${
        isUrgent ? 'text-red-400' : 'text-amber-500'
      }`}>
        {isUrgent ? '🚨 Últimas horas para palpitar o artilheiro!' : '⏳ Prazo para palpitar o artilheiro'}
      </p>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {units.map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl border font-black tabular-nums text-xl sm:text-2xl ${
              isUrgent
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            } ${isUrgent ? 'animate-pulse' : ''}`}>
              {String(value).padStart(2, '0')}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${
              isUrgent ? 'text-red-400/70' : 'text-amber-500/60'
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <p className={`text-[10px] text-center mt-3 font-bold ${isUrgent ? 'text-red-400/70' : 'text-secondary'}`}>
        Acerte e ganhe <span className={`font-black ${isUrgent ? 'text-red-400' : 'text-amber-500'}`}>+5 pontos</span> no ranking
      </p>
    </div>
  );
}
