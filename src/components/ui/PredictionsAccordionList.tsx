'use client';

import React, { useState } from 'react';
import MatchCard from './MatchCard';
import { Match, Prediction } from '@/types';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

interface PredictionsAccordionListProps {
  matches: Match[];
  predictionsMap: Map<string, Prediction>;
  isAuthenticated: boolean;
}

export default function PredictionsAccordionList({
  matches,
  predictionsMap,
  isAuthenticated
}: PredictionsAccordionListProps) {
  // Agrupar partidas por Fase/Grupo
  const groups: Record<string, Match[]> = {};
  const groupOrder: string[] = [];

  matches.forEach((match) => {
    const key = match.group_name || match.stage;
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(key);
    }
    groups[key].push(match);
  });

  // Ordenar grupos alfabética e cronologicamente
  groupOrder.sort((a, b) => {
    const cleanA = a.trim();
    const cleanB = b.trim();
    const isGroupA = cleanA.toLowerCase().startsWith('grupo ');
    const isGroupB = cleanB.toLowerCase().startsWith('grupo ');
    if (isGroupA && isGroupB) {
      return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (isGroupA) return -1;
    if (isGroupB) return 1;

    const stageOrder = [
      'fase de grupos',
      'fase de 32',
      'oitavas de final',
      'quartas de final',
      'semifinal',
      'decisão do 3º lugar',
      'final'
    ];
    const indexA = stageOrder.indexOf(cleanA.toLowerCase());
    const indexB = stageOrder.indexOf(cleanB.toLowerCase());
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
  });

  console.log('PredictionsAccordionList rendered groups order:', groupOrder);



  // Expandir a primeira seção por padrão para melhorar a UX inicial
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    groupOrder.length > 0 ? groupOrder[0] : null
  );

  const toggleExpand = (groupKey: string) => {
    setExpandedGroupId(expandedGroupId === groupKey ? null : groupKey);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {groupOrder.map((groupKey) => {
        const groupMatches = groups[groupKey];
        const isOpen = expandedGroupId === groupKey;
        
        // Pega a primeira letra da chave para o círculo (ex: "Grupo A" -> "A")
        const badgeLetter = groupKey.startsWith('Grupo ')
          ? groupKey.replace('Grupo ', '').trim().substring(0, 1)
          : '🏆';

        // Conta quantos jogos nesse grupo o usuário já palpitou
        const predictedCount = groupMatches.filter((m) => predictionsMap.has(m.id)).length;

        return (
          <div key={groupKey} className="border border-border-custom bg-card rounded-2xl overflow-hidden transition-all duration-300 shadow-md">
            {/* Header do Grupo/Fase */}
            <div
              onClick={() => toggleExpand(groupKey)}
              className={`flex items-center justify-between p-4 cursor-pointer select-none bg-card hover:bg-muted/70 transition-colors ${
                isOpen ? 'border-b border-border-custom' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase shrink-0 shadow-sm select-none">
                  {badgeLetter}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-primary uppercase tracking-widest select-none">
                  {groupKey}
                </h3>
                <span className="text-[10px] bg-muted border border-border-custom/50 text-secondary px-2.5 py-0.5 rounded-full font-bold select-none whitespace-nowrap">
                  {predictedCount} de {groupMatches.length} palpitados
                </span>
              </div>

              <div className="flex items-center gap-2 text-secondary">
                {isOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
              </div>
            </div>

            {/* Grid de Jogos (MatchCards) */}
            {isOpen && (
              <div className="p-4 bg-muted/20 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupMatches.map((match) => {
                    const matchIndex = matches.findIndex((m) => m.id === match.id);
                    const matchNumber = matchIndex !== -1 ? matchIndex + 1 : undefined;
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        prediction={predictionsMap.get(match.id)}
                        isAuthenticated={isAuthenticated}
                        matchNumber={matchNumber}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
