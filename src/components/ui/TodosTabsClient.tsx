'use client';

import { useState } from 'react';
import { ArrowsLeftRight } from '@phosphor-icons/react';

interface TodosTabsClientProps {
  palpitesContent: React.ReactNode;
  x1Content: React.ReactNode;
}

export default function TodosTabsClient({ palpitesContent, x1Content }: TodosTabsClientProps) {
  const [tab, setTab] = useState<'palpites' | 'x1'>('palpites');

  return (
    <>
      <div className="flex items-center gap-1 mb-8 bg-muted/40 border border-border-custom/60 rounded-2xl p-1">
        <button
          onClick={() => setTab('palpites')}
          className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            tab === 'palpites'
              ? 'bg-card shadow-sm text-primary border border-border-custom/80'
              : 'text-secondary hover:text-primary'
          }`}
        >
          ⚽ Palpites
        </button>
        <button
          onClick={() => setTab('x1')}
          className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            tab === 'x1'
              ? 'bg-card shadow-sm text-accent-custom border border-accent-custom/30'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <ArrowsLeftRight size={13} weight="bold" />
          X1 Cara a Cara
        </button>
      </div>

      <div className={tab === 'palpites' ? '' : 'hidden'}>{palpitesContent}</div>
      <div className={tab === 'x1' ? '' : 'hidden'}>{x1Content}</div>
    </>
  );
}
