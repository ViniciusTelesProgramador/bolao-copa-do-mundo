import React from 'react';
import { ChartLineUp } from '@phosphor-icons/react/dist/ssr';

export interface PointsEvolutionEntry {
  label: string;
  cumulative: number;
  gained: number;
}

interface PointsEvolutionChartProps {
  data: PointsEvolutionEntry[];
}

const WIDTH = 600;
const HEIGHT = 130;
const PAD_X = 6;
const PAD_TOP = 18;
const PAD_BOTTOM = 8;

export default function PointsEvolutionChart({ data }: PointsEvolutionChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-card border border-border-custom rounded-2xl p-5 shadow-md mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ChartLineUp size={16} weight="bold" className="text-accent-custom" />
          <h3 className="text-xs font-black text-primary uppercase tracking-wider">Evolução de Pontos</h3>
        </div>
        <p className="text-xs text-secondary mt-3">
          Aguardando mais jogos com resultado para traçar sua evolução. 📈
        </p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.cumulative), 1);
  const stepX = (WIDTH - PAD_X * 2) / (data.length - 1);
  const usableHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const coords = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + usableHeight - (d.cumulative / maxVal) * usableHeight,
    ...d,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${HEIGHT - PAD_BOTTOM} L ${coords[0].x.toFixed(2)} ${HEIGHT - PAD_BOTTOM} Z`;

  const last = coords[coords.length - 1];
  const totalGanhos = data.length;

  return (
    <div className="bg-card border border-border-custom rounded-2xl p-5 shadow-md mb-8">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <ChartLineUp size={16} weight="bold" className="text-accent-custom" />
          <h3 className="text-xs font-black text-primary uppercase tracking-wider">Evolução de Pontos</h3>
        </div>
        <span className="text-[10px] font-bold text-secondary">{totalGanhos} jogo{totalGanhos !== 1 ? 's' : ''} pontuado{totalGanhos !== 1 ? 's' : ''}</span>
      </div>

      <div className="text-accent-custom">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-28 sm:h-32 overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pointsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#pointsAreaGradient)" />
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === coords.length - 1 ? 4.5 : c.gained > 0 ? 3 : 2}
              fill={i === coords.length - 1 ? 'currentColor' : c.gained > 0 ? 'currentColor' : 'var(--border-custom)'}
              opacity={i === coords.length - 1 ? 1 : c.gained > 0 ? 0.9 : 0.5}
            >
              <title>{`${c.label}: ${c.gained > 0 ? `+${c.gained} pts` : 'sem pontos'} (total: ${c.cumulative})`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-secondary font-bold truncate max-w-[45%]">{coords[0].label}</span>
        <span className="text-sm font-black text-accent-custom shrink-0">{last.cumulative} pts</span>
        <span className="text-[10px] text-secondary font-bold truncate max-w-[45%] text-right">{last.label}</span>
      </div>
    </div>
  );
}
