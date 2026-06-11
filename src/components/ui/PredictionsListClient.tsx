'use client';

import React, { useState } from 'react';
import FlagTeam from './FlagTeam';
import { Match } from '@/types';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

interface PredictionItem {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  user_name: string;
}

interface PredictionsListClientProps {
  matches: Match[];
  predictions: PredictionItem[];
  predictionsCount: Record<string, number>;
  currentUserId: string | null;
}

const colors = [
  'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
  'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400',
  'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
  'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400',
];

const getAvatarStyle = (name: string) => {
  const code = name.charCodeAt(0) || 0;
  return colors[code % colors.length];
};

import { formatMatchDate, formatMatchTime } from '@/lib/date';

export default function PredictionsListClient({
  matches,
  predictions,
  predictionsCount,
  currentUserId
}: PredictionsListClientProps) {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const toggleExpand = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

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

  console.log('PredictionsListClient rendered groups order:', groupOrder);



  return (
    <div className="space-y-8 animate-fadeIn">
      {groupOrder.map((groupKey) => {
        const groupMatches = groups[groupKey];
        const badgeLetter = groupKey.startsWith('Grupo ')
          ? groupKey.replace('Grupo ', '').trim().substring(0, 1)
          : '🏆';

        return (
          <div key={groupKey} className="space-y-3">
            {/* Header do Grupo */}
            <div className="flex items-center gap-2.5 pt-2">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase shrink-0 select-none shadow-sm">
                {badgeLetter}
              </span>
              <h3 className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest select-none">
                {groupKey}
              </h3>
            </div>

            {/* Lista de Partidas do Grupo */}
            <div className="space-y-2.5">
              {groupMatches.map((match) => {
                const isOpen = expandedMatchId === match.id;
                const matchPredictions = predictions.filter((p) => p.match_id === match.id);
                const count = predictionsCount[match.id] || 0;

                return (
                  <div key={match.id} className="group">
                    {/* Linha do Confronto (Accordion Header - Min 48px de altura) */}
                    <div
                      onClick={() => toggleExpand(match.id)}
                      className={`flex items-center justify-between p-3.5 min-h-[48px] bg-card border ${
                        isOpen ? 'border-accent-custom' : 'border-border-custom hover:border-secondary'
                      } rounded-2xl cursor-pointer select-none transition-all duration-200 shadow-md`}
                    >
                      {/* Mandante x Visitante */}
                      <div className="flex items-center justify-between flex-grow min-w-0 mr-4">
                        {/* Mandante */}
                        <div className="flex-1 flex justify-end truncate min-w-0 pr-1">
                          <FlagTeam flag={match.home_flag} name={match.home_team} reverse={true} className="text-xs sm:text-sm" />
                        </div>

                        {/* Data e Hora */}
                        <div className="mx-2 px-1.5 py-1 bg-muted border border-border-custom/80 rounded-xl text-[9px] sm:text-[10px] text-secondary font-extrabold whitespace-nowrap shrink-0 select-none flex flex-col items-center justify-center leading-normal">
                          <span>{formatMatchDate(match.match_time)}</span>
                          <span style={{ color: 'var(--text-primary)' }} className="font-black">{formatMatchTime(match.match_time)}</span>
                        </div>

                        {/* Visitante */}
                        <div className="flex-1 flex justify-start truncate min-w-0 pl-1">
                          <FlagTeam flag={match.away_flag} name={match.away_team} reverse={false} className="text-xs sm:text-sm" />
                        </div>
                      </div>

                      {/* Contagem de Palpites & Seta */}
                      <div className="flex items-center gap-1.5 shrink-0 text-secondary">
                        <span className="text-[11px] font-bold whitespace-nowrap">
                          {count} {count === 1 ? 'palpite' : 'palpites'}
                        </span>
                        {isOpen ? (
                          <CaretUp size={14} />
                        ) : (
                          <CaretDown size={14} />
                        )}
                      </div>
                    </div>

                    {/* Detalhes dos Palpites (Accordion Content) */}
                    {isOpen && (
                      <div className="mt-2 bg-muted/20 border border-border-custom rounded-2xl overflow-hidden divide-y divide-border-custom/50 animate-fadeIn">
                        {matchPredictions.length === 0 ? (
                          <div className="p-4 text-center text-xs text-secondary italic select-none">
                            Nenhum palpite visível no momento (palpites de outros usuários ficam ocultos até o início do jogo).
                          </div>
                        ) : (
                          matchPredictions.map((pred) => {
                            const isSelf = pred.user_id === currentUserId;
                            const avatarStyle = getAvatarStyle(pred.user_name);
                            return (
                              <div
                                key={pred.id}
                                className={`flex items-center justify-between px-4 py-3.5 text-xs sm:text-sm ${
                                  isSelf ? 'bg-accent-custom/5 font-semibold' : ''
                                }`}
                              >
                                {/* Usuário (Avatar + Nome) */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <span
                                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shrink-0 border select-none ${avatarStyle}`}
                                  >
                                    {pred.user_name.substring(0, 1)}
                                  </span>
                                  <span
                                    style={{ color: isSelf ? undefined : 'var(--text-primary)' }}
                                    className={`truncate font-bold ${isSelf ? 'text-accent-custom' : ''}`}
                                  >
                                    {pred.user_name}
                                    {isSelf && <span className="text-[9px] font-black text-accent-custom uppercase tracking-widest ml-1.5 bg-accent-custom/10 px-1.5 py-0.5 rounded-md border border-accent-custom/20 inline-block">Você</span>}
                                  </span>
                                </div>

                                {/* Placar */}
                                <span
                                  style={{ color: isSelf ? undefined : 'var(--text-primary)' }}
                                  className={`font-extrabold text-sm tracking-wider shrink-0 select-all ${isSelf ? 'text-accent-custom' : ''}`}
                                >
                                  {pred.home_score} x {pred.away_score}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
