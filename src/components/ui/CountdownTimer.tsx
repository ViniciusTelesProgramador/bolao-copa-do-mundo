'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  matchTime: string;
}

export default function CountdownTimer({ matchTime }: CountdownTimerProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const diff = new Date(matchTime).getTime() - Date.now();
      if (diff <= 0) { setLabel(null); return; }

      const totalHours = diff / 3600000;
      // Só mostra se faltam menos de 48h
      if (totalHours > 48) { setLabel(null); return; }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (h >= 1) setLabel(`Fecha em ${h}h ${m}min`);
      else if (m >= 1) setLabel(`Fecha em ${m}min ${s}s`);
      else setLabel(`Fecha em ${s}s`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [matchTime]);

  if (!label) return null;

  return (
    <span className="text-amber-500 text-[10px] font-black uppercase tracking-wider animate-pulse">
      ⏱ {label}
    </span>
  );
}
