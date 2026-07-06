'use client';

import { useState } from 'react';
import Link from 'next/link';
import FlagTeam, { getCountryCode } from './FlagTeam';
import { Match } from '@/types';
import { CaretDown, CaretUp, Table } from '@phosphor-icons/react';
import { formatMatchDate, formatMatchTime } from '@/lib/date';
import MatchCommentsSection from './MatchCommentsSection';

// ── Standings ─────────────────────────────────────────────────────────────────

interface TeamStanding {
  name: string;
  flag: string;
  J: number;
  V: number;
  E: number;
  D: number;
  GF: number;
  GA: number;
  GD: number;
  P: number;
}

function computeGroupStandings(groupMatches: Match[]): TeamStanding[] {
  const teams = new Map<string, TeamStanding>();

  for (const m of groupMatches) {
    if (!teams.has(m.home_team)) teams.set(m.home_team, { name: m.home_team, flag: m.home_flag, J: 0, V: 0, E: 0, D: 0, GF: 0, GA: 0, GD: 0, P: 0 });
    if (!teams.has(m.away_team)) teams.set(m.away_team, { name: m.away_team, flag: m.away_flag, J: 0, V: 0, E: 0, D: 0, GF: 0, GA: 0, GD: 0, P: 0 });
  }

  for (const m of groupMatches) {
    if (m.home_score === null || m.away_score === null) continue;
    const h = teams.get(m.home_team)!;
    const a = teams.get(m.away_team)!;
    h.J++; a.J++;
    h.GF += m.home_score; h.GA += m.away_score;
    a.GF += m.away_score; a.GA += m.home_score;
    h.GD = h.GF - h.GA;
    a.GD = a.GF - a.GA;
    if (m.home_score > m.away_score) {
      h.V++; h.P += 3; a.D++;
    } else if (m.away_score > m.home_score) {
      a.V++; a.P += 3; h.D++;
    } else {
      h.E++; h.P++; a.E++; a.P++;
    }
  }

  return [...teams.values()].sort((a, b) =>
    b.P - a.P || b.GD - a.GD || b.GF - a.GF || a.name.localeCompare(b.name)
  );
}

const COLS = '1.4rem 1fr 1.8rem 2rem 2rem 2rem 2.8rem 2.4rem';

function GroupStandingsTable({ standings }: { standings: TeamStanding[] }) {
  const hasPlayed = standings.some(s => s.J > 0);

  return (
    <div className="mb-3 rounded-2xl border border-border-custom bg-card/60 overflow-hidden animate-fadeIn">
      {/* Table header */}
      <div className="grid items-center px-3 py-1.5 border-b border-border-custom/50 bg-muted/40"
        style={{ gridTemplateColumns: COLS }}>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider">#</span>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider">Time</span>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider text-center">J</span>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider text-center">V</span>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider text-center">E</span>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider text-center">D</span>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider text-right">SG</span>
        <span className="text-[9px] font-black text-secondary uppercase tracking-wider text-right">Pts</span>
      </div>

      {standings.map((team, idx) => {
        const qualifies = idx < 2 && hasPlayed;
        const countryCode = getCountryCode(team.flag, team.name);
        return (
          <div
            key={team.name}
            className={`grid items-center px-3 py-2 border-b border-border-custom/30 last:border-b-0 transition-colors ${
              qualifies ? 'bg-emerald-500/5' : ''
            }`}
            style={{ gridTemplateColumns: COLS }}
          >
            {/* Pos + qualify indicator */}
            <div className="flex items-center gap-1">
              <div className={`w-0.5 h-4 rounded-full shrink-0 ${qualifies ? 'bg-emerald-500' : 'bg-transparent'}`} />
              <span className="text-[10px] font-black text-secondary">{idx + 1}</span>
            </div>

            {/* Flag + name */}
            <div className="flex items-center gap-1.5 min-w-0">
              {countryCode ? (
                <img
                  src={`https://flagcdn.com/w40/${countryCode}.png`}
                  alt={team.name}
                  className="w-5 h-3.5 object-cover rounded-[2px] shrink-0 border border-border-custom/30"
                  loading="lazy"
                />
              ) : (
                <span className="text-base leading-none shrink-0">{team.flag}</span>
              )}
              <span className={`text-[11px] font-bold truncate ${qualifies ? 'text-primary' : 'text-secondary'}`}>
                {team.name}
              </span>
            </div>

            {/* Stats */}
            <span className="text-[11px] text-secondary font-bold text-center">{team.J}</span>
            <span className="text-[11px] text-secondary font-bold text-center">{team.V}</span>
            <span className="text-[11px] text-secondary font-bold text-center">{team.E}</span>
            <span className="text-[11px] text-secondary font-bold text-center">{team.D}</span>
            <span className={`text-[11px] font-bold text-right ${team.GD > 0 ? 'text-emerald-500' : team.GD < 0 ? 'text-red-400' : 'text-secondary'}`}>
              {team.GD > 0 ? `+${team.GD}` : team.GD}
            </span>
            <span className={`text-[12px] font-black text-right ${qualifies ? 'text-emerald-500' : 'text-primary'}`}>
              {team.P}
            </span>
          </div>
        );
      })}

      {!hasPlayed && (
        <p className="px-3 py-2.5 text-[11px] text-secondary italic">Nenhum jogo disputado ainda neste grupo.</p>
      )}

      <div className="px-3 py-1.5 border-t border-border-custom/30 bg-muted/20 flex items-center gap-1.5">
        <div className="w-0.5 h-3 rounded-full bg-emerald-500" />
        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Avança para as oitavas</span>
      </div>
    </div>
  );
}

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
  allProfiles: { id: string; name: string; avatar_url?: string | null }[];
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

function MatchAccordionContent({
  match,
  matchPredictions,
  allProfiles,
  currentUserId,
}: {
  match: Match;
  matchPredictions: PredictionItem[];
  allProfiles: { id: string; name: string; avatar_url?: string | null }[];
  currentUserId: string | null;
}) {
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
  const matchStarted = new Date(match.match_time) <= new Date();
  const isLive = matchStarted && (match.home_score === null || match.away_score === null);
  const predictedUserIds = new Set(matchPredictions.map((p) => p.user_id));
  const missingProfiles = matchStarted ? [] : allProfiles.filter((p) => !predictedUserIds.has(p.id));

  return (
    <div className="mt-2 bg-muted/20 border border-border-custom rounded-2xl overflow-hidden divide-y divide-border-custom/50 animate-fadeIn">
      {matchPredictions.length === 0 && missingProfiles.length === 0 && (
        <div className="p-4 text-center text-xs text-secondary italic select-none">
          Nenhum palpite registrado para esse jogo.
        </div>
      )}
      {!matchStarted && matchPredictions.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5 bg-muted/30 border-b border-border-custom/30">
          <span className="text-[10px]">🔒</span>
          <span className="text-[10px] text-secondary font-bold">Palpites revelados quando o jogo começar</span>
        </div>
      )}
      {matchPredictions.map((pred) => {
        const isSelf = pred.user_id === currentUserId;
        const scoreVisible = (matchStarted || isSelf) && pred.home_score !== -1;
        const profile = profileMap.get(pred.user_id);
        const avatarUrl = profile?.avatar_url ?? null;
        const avatarStyle = getAvatarStyle(pred.user_name);
        const hasPoints = pred.points !== null;
        const pointsColor =
          pred.points === 3 ? 'text-green-500 bg-green-500/10 border-green-500/30' :
          pred.points === 2 ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' :
          pred.points === 1 ? 'text-sky-400 bg-sky-500/10 border-sky-500/30' :
          'text-secondary bg-muted border-border-custom/50';
        return (
          <div
            key={pred.id}
            className={`flex items-center justify-between px-4 py-3.5 text-xs sm:text-sm ${
              isSelf ? 'bg-accent-custom/5 font-semibold' : ''
            }`}
          >
            <Link
              href={isSelf ? '/perfil' : `/perfil/${pred.user_id}`}
              className="flex items-center gap-3 min-w-0 hover:opacity-75 transition-opacity"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={pred.user_name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-border-custom" />
              ) : (
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shrink-0 border select-none ${avatarStyle}`}>
                  {pred.user_name.substring(0, 1)}
                </span>
              )}
              <span
                style={{ color: isSelf ? undefined : 'var(--text-primary)' }}
                className={`truncate font-bold ${isSelf ? 'text-accent-custom' : ''}`}
              >
                {pred.user_name}
                {isSelf && (
                  <span className="text-[9px] font-black text-accent-custom uppercase tracking-widest ml-1.5 bg-accent-custom/10 px-1.5 py-0.5 rounded-md border border-accent-custom/20 inline-block">
                    Você
                  </span>
                )}
              </span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              {scoreVisible ? (
                <span
                  style={{ color: isSelf ? undefined : 'var(--text-primary)' }}
                  className={`font-extrabold text-sm tracking-wider select-all ${isSelf ? 'text-accent-custom' : ''}`}
                >
                  {pred.home_score} x {pred.away_score}
                </span>
              ) : (
                <span className="font-extrabold text-sm tracking-wider text-secondary/40 select-none">
                  ? x ?
                </span>
              )}
              {hasPoints && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg border shrink-0 ${pointsColor}`}>
                  {pred.points}pts
                </span>
              )}
            </div>
          </div>
        );
      })}
      {missingProfiles.length > 0 && (
        <div className="px-4 py-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black text-secondary uppercase tracking-wider shrink-0">Sem palpite:</span>
          {missingProfiles.map((p) => (
            <span key={p.id} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
              {p.name}
            </span>
          ))}
        </div>
      )}
      <MatchCommentsSection
        matchId={match.id}
        canComment={isLive}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export default function PredictionsListClient({
  matches,
  predictions,
  predictionsCount,
  currentUserId,
  allProfiles,
}: PredictionsListClientProps) {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [standingsGroupKey, setStandingsGroupKey] = useState<string | null>(null);

  const toggleExpand = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  const toggleStandings = (groupKey: string) => {
    setStandingsGroupKey(standingsGroupKey === groupKey ? null : groupKey);
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

        const isGroupStage = groupKey.toLowerCase().startsWith('grupo ');
        const standingsOpen = standingsGroupKey === groupKey;
        const standings = isGroupStage ? computeGroupStandings(groupMatches) : [];

        return (
          <div
            key={groupKey}
            id={`secao-${groupKey.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[º°]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')}`}
            className="space-y-3"
          >
            {/* Header do Grupo */}
            <div className="flex items-center gap-2.5 pt-2">
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase shrink-0 select-none shadow-sm">
                {badgeLetter}
              </span>
              <h3 className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest select-none">
                {groupKey}
              </h3>

              {isGroupStage && (
                <button
                  onClick={() => toggleStandings(groupKey)}
                  className={`ml-auto flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
                    standingsOpen
                      ? 'bg-accent-custom/10 border-accent-custom/40 text-accent-custom'
                      : 'bg-muted border-border-custom/60 text-secondary hover:border-secondary hover:text-primary'
                  }`}
                >
                  <Table size={11} weight={standingsOpen ? 'fill' : 'regular'} />
                  <span>Classificação</span>
                  {standingsOpen ? <CaretUp size={9} /> : <CaretDown size={9} />}
                </button>
              )}
            </div>

            {/* Tabela de classificação */}
            {isGroupStage && standingsOpen && (
              <GroupStandingsTable standings={standings} />
            )}

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

                        {/* Data/Hora ou Placar Final */}
                        {match.home_score !== null && match.away_score !== null ? (
                          <div className="mx-2 px-2.5 py-1 bg-accent-custom/10 border border-accent-custom/30 rounded-xl text-[11px] font-black whitespace-nowrap shrink-0 select-none flex flex-col items-center justify-center leading-normal text-accent-custom">
                            <span className="text-[8px] uppercase tracking-wider font-bold opacity-70">Resultado</span>
                            <span>{match.home_score} x {match.away_score}</span>
                          </div>
                        ) : (
                          <div className="mx-2 px-1.5 py-1 bg-muted border border-border-custom/80 rounded-xl text-[9px] sm:text-[10px] text-secondary font-extrabold whitespace-nowrap shrink-0 select-none flex flex-col items-center justify-center leading-normal">
                            <span>{formatMatchDate(match.match_time)}</span>
                            <span style={{ color: 'var(--text-primary)' }} className="font-black">{formatMatchTime(match.match_time)}</span>
                          </div>
                        )}

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
                    {isOpen && MatchAccordionContent({
                      match,
                      matchPredictions,
                      allProfiles,
                      currentUserId,
                    })}
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
