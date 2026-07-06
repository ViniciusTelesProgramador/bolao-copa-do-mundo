'use client';

import React from 'react';

const STAGE_LABELS: Record<string, string> = {
  'Fase de 32': '16 Avos',
  'Oitavas de Final': 'Oitavas',
  'Quartas de Final': 'Quartas',
  'Semifinal': 'Semis',
  'Final': 'Final',
  'Decisão do 3º Lugar': '3º Lugar',
};

function stageToId(stage: string) {
  return (
    'secao-' +
    stage
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[º°]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
  );
}

interface Props {
  showBracket: boolean;
  hasGroups: boolean;
  knockoutStages: string[];
}

export default function TodosNavBar({ showBracket, hasGroups, knockoutStages }: Props) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-16 z-30 bg-base/90 backdrop-blur-sm border-b border-border-custom/40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-6">
      <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {showBracket && (
          <button
            onClick={() => scrollTo('secao-chaveamento')}
            className="shrink-0 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            🏆 Chaveamento
          </button>
        )}
        <button
          onClick={() => scrollTo('secao-artilheiro')}
          className="shrink-0 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg bg-muted text-secondary border border-border-custom hover:text-primary transition-all cursor-pointer"
        >
          ⚽ Artilheiro
        </button>
        {hasGroups && (
          <button
            onClick={() => scrollTo('secao-grupo-a')}
            className="shrink-0 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg bg-muted text-secondary border border-border-custom hover:text-primary transition-all cursor-pointer"
          >
            Grupos
          </button>
        )}
        {knockoutStages.map((stage) => (
          <button
            key={stage}
            onClick={() => scrollTo(stageToId(stage))}
            className="shrink-0 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg bg-muted text-secondary border border-border-custom hover:text-primary transition-all cursor-pointer"
          >
            {STAGE_LABELS[stage] || stage}
          </button>
        ))}
      </div>
    </div>
  );
}
