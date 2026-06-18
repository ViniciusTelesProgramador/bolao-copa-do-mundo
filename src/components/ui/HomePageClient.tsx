'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import MatchCard from '@/components/ui/MatchCard';
import RankingTable from '@/components/ui/RankingTable';
import RoundRankingClient, { RoundData } from '@/components/ui/RoundRankingClient';
import PendingActionsBanner from '@/components/ui/PendingActionsBanner';
import { Match, Prediction, RankingEntry } from '@/types';
import { Trophy } from '@phosphor-icons/react';

interface HomeData {
  userId: string | null;
  matches: Match[];
  todaysMatchIds: string[];
  predictionsMap: Record<string, Prediction>;
  ranking: RankingEntry[];
  rounds: RoundData[];
  missingMatchIds: string[];
  artilheiroMissing: boolean;
  artilheiroDeadlineLabel?: string;
}

async function fetchHomeData(): Promise<HomeData> {
  const res = await fetch('/api/home', { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar dados');
  return res.json();
}

function RankingSkeleton() {
  return (
    <div className="w-full bg-card border border-border-custom rounded-2xl overflow-hidden shadow-2xl animate-pulse">
      <div className="px-5 py-4 border-b border-border-custom/60 bg-muted/40 h-12" />
      <div className="divide-y divide-border-custom/30">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 h-4 bg-muted rounded" />
            <div className="w-10 h-5 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-card border border-border-custom rounded-2xl p-5 h-36 animate-pulse" />
      ))}
    </div>
  );
}

export default function HomePageClient() {
  const { data, isLoading, isError } = useQuery<HomeData>({
    queryKey: ['home'],
    queryFn: fetchHomeData,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // re-fetch a cada 2 min para manter placar atualizado
  });

  const matches = data?.matches ?? [];
  const todaysMatches = matches.filter(m => data?.todaysMatchIds.includes(m.id));
  const topThree = (data?.ranking ?? []).slice(0, 3);
  const missingMatches = matches.filter(m => data?.missingMatchIds.includes(m.id));

  const avatarColors = ['bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500'];
  const avatarColor = (name: string) => avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      {data?.userId && (
        <PendingActionsBanner
          missingMatches={missingMatches}
          artilheiroMissing={data.artilheiroMissing}
          artilheiroDeadlineLabel={data.artilheiroDeadlineLabel}
        />
      )}

      {/* Hero Assimétrico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16 md:mb-24">
        {/* Lado Esquerdo: Título e CTA */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-custom/10 text-accent-custom rounded-full text-xs font-bold border border-accent-custom/20 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" className="animate-spin-slow">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a87.69,87.69,0,0,1-36.21-7.8l17.4-30.14a16,16,0,0,0-2.8-19.16L81.1,133.61a15.89,15.89,0,0,0-11-.47L37,144.5A88,88,0,0,1,128,40a87.63,87.63,0,0,1,64.21,27.8l-30.14,17.4a16,16,0,0,0-6.84,18.15l15,46.12a15.93,15.93,0,0,0,14.65,11.23h34.62A88.16,88.16,0,0,1,128,216Z"></path>
            </svg>
            Bolão Oficial Copa 2026
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Bolão Copa 2026
          </h1>
          <p className="text-base sm:text-lg text-secondary font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
            Dê seus palpites, acumule pontos e vença a disputa contra seus amigos na maior competição de futebol do planeta!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            {data?.userId ? (
              <Link
                href="/palpites"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-accent-custom hover:bg-accent-hover text-slate-950 font-bold rounded-2xl shadow-lg shadow-green-500/10 hover:shadow-green-500/20 active:scale-[0.98] transition-all duration-200 min-h-[48px]"
              >
                Dar Meus Palpites
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
                </svg>
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-accent-custom hover:bg-accent-hover text-slate-950 font-bold rounded-2xl shadow-lg shadow-green-500/10 hover:shadow-green-500/20 active:scale-[0.98] transition-all duration-200 min-h-[48px]"
              >
                Fazer Meus Palpites
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
                </svg>
              </Link>
            )}
            <Link
              href="/ranking"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-muted hover:bg-border-custom/50 text-primary font-bold rounded-2xl border border-border-custom transition-all duration-200 min-h-[48px]"
            >
              Ver Classificação
            </Link>
          </div>
        </div>

        {/* Lado Direito: Pódio */}
        <div className="lg:col-span-5 bg-card border border-border-custom rounded-2xl p-6 shadow-xl w-full">
          <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-5 flex items-center gap-1.5 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" className="text-yellow-500">
              <path d="M200,40H176a8,8,0,0,0,0,16h24v48c0,28.89-21.73,53.2-51.27,57.38A80.24,80.24,0,0,1,136,175.79V200h16a8,8,0,0,1,0,16H136v16h24a8,8,0,0,1,0,16H96a8,8,0,0,1,0-16h24V216H104a8,8,0,0,1,0-16h16V175.79A80.24,80.24,0,0,1,107.27,161.4C77.73,157.2,56,132.89,56,104V56H80a8,8,0,0,0,0-16H56A16,16,0,0,0,40,56v48c0,35.91,26.47,66.19,62,71.39V200h-8a8,8,0,0,0,0,16h8v16h-8a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16h-8V216h8a8,8,0,0,0,0-16h-8V175.39c35.53-5.2,62-35.48,62-71.39V56A16,16,0,0,0,200,40ZM72,56H88V80H72ZM184,80H168V56H184Z"></path>
            </svg>
            Líderes do Bolão
          </h3>

          {isLoading ? (
            <div className="flex items-end justify-center gap-2 pt-2 pb-1 animate-pulse">
              {[14, 24, 9].map((h, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-2">
                  <div className="w-11 h-11 rounded-full bg-muted" />
                  <div className="w-full" style={{ height: `${h * 4}px` }} />
                </div>
              ))}
            </div>
          ) : topThree.length === 0 ? (
            <div className="text-xs text-secondary py-4 italic">Nenhuma pontuação registrada ainda.</div>
          ) : (() => {
            const order = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
            const podiumConfig = topThree[1]
              ? [
                  { rank: 2, medal: '🥈', barH: 'h-14', barBg: 'bg-slate-400/15 border-slate-400/25', ringColor: 'ring-slate-400/40', labelColor: 'text-slate-400', avatarSize: 'w-11 h-11', textSize: 'text-[11px]' },
                  { rank: 1, medal: '🥇', barH: 'h-24', barBg: 'bg-yellow-500/15 border-yellow-500/30', ringColor: 'ring-yellow-500/50', labelColor: 'text-yellow-500', avatarSize: 'w-14 h-14', textSize: 'text-xs' },
                  { rank: 3, medal: '🥉', barH: 'h-9',  barBg: 'bg-amber-700/15 border-amber-700/25', ringColor: 'ring-amber-700/40', labelColor: 'text-amber-600 dark:text-amber-500', avatarSize: 'w-11 h-11', textSize: 'text-[11px]' },
                ]
              : [
                  { rank: 1, medal: '🥇', barH: 'h-24', barBg: 'bg-yellow-500/15 border-yellow-500/30', ringColor: 'ring-yellow-500/50', labelColor: 'text-yellow-500', avatarSize: 'w-14 h-14', textSize: 'text-xs' },
                ];
            return (
              <div className="flex items-end justify-center gap-2 pt-2 pb-1">
                {order.map((player, visualIdx) => {
                  const cfg = podiumConfig[visualIdx];
                  if (!player || !cfg) return null;
                  const isFirst = cfg.rank === 1;
                  return (
                    <div key={player.user_id} className="flex flex-col items-center flex-1 min-w-0">
                      <span className="text-lg mb-1 select-none">{cfg.medal}</span>
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.name} className={`${cfg.avatarSize} rounded-full object-cover ring-2 ${cfg.ringColor} mb-2 shrink-0`} />
                      ) : (
                        <span className={`${cfg.avatarSize} rounded-full flex items-center justify-center font-black text-white ring-2 ${cfg.ringColor} mb-2 shrink-0 select-none ${avatarColor(player.name)} ${isFirst ? 'text-base' : 'text-sm'}`}>
                          {player.name.substring(0, 1).toUpperCase()}
                        </span>
                      )}
                      <p className={`font-black truncate w-full text-center leading-tight ${cfg.labelColor} ${cfg.textSize}`}>{player.name}</p>
                      <p className={`font-bold text-secondary mb-2 ${isFirst ? 'text-xs' : 'text-[10px]'}`}>{player.total_points} pts</p>
                      <div className={`w-full ${cfg.barH} ${cfg.barBg} border rounded-t-xl flex items-center justify-center select-none`}>
                        <span className={`font-black ${cfg.labelColor} ${isFirst ? 'text-sm' : 'text-xs'}`}>{cfg.rank}º</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-8">
          {/* Jogos de Hoje */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <h2 className="text-lg font-black text-primary uppercase tracking-wider select-none">
                Jogos de Hoje ⚽
              </h2>
              <Link href="/palpites" className="text-xs font-bold text-accent-custom hover:text-accent-hover transition-colors">
                Todos os jogos &rarr;
              </Link>
            </div>

            {isLoading ? (
              <MatchesSkeleton />
            ) : todaysMatches.length === 0 ? (
              <div className="bg-card border border-border-custom rounded-2xl p-10 text-center text-secondary space-y-3 shadow-sm">
                <p className="font-extrabold text-sm uppercase tracking-wider">Nenhum jogo agendado para hoje.</p>
                <p className="text-xs">Mas você pode palpitar nos próximos jogos do campeonato!</p>
                <div className="pt-2 flex justify-center">
                  <Link href="/palpites" className="inline-flex items-center justify-center min-h-[48px] px-5 bg-accent-custom hover:bg-accent-hover text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow">
                    Ver Jogos e Palpitar
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {todaysMatches.map((match) => {
                  const matchNumber = matches.findIndex((m) => m.id === match.id) + 1 || undefined;
                  return (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={data?.predictionsMap[match.id]}
                      isAuthenticated={!!data?.userId}
                      matchNumber={matchNumber}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Regras de Pontuação */}
          <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider select-none flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" className="text-accent-custom">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm40-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V88a8,8,0,0,1,16,0v24h24A8,8,0,0,1,168,128Zm-40,40a12,12,0,1,1,12-12A12,12,0,0,1,128,168Z"></path>
              </svg>
              Regras de Pontuação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { pts: '3 pts', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', title: 'Placar Exato', desc: 'Você acertou o placar exato do jogo. Ex: palpite 2x1 e final 2x1.' },
                { pts: '2 pts', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20', title: 'Vencedor + Diferença', desc: 'Acertou vencedor e saldo de gols (exeto empate). Ex: palpite 3x1 e final 2x0.' },
                { pts: '1 pt',  color: 'bg-sky-500/10 text-sky-600 dark:text-sky-450 border-sky-500/20', title: 'Apenas o Vencedor / Empate', desc: 'Acertou apenas quem ganhou ou que deu empate. Ex: palpite 2x1 e final 1x0.' },
                { pts: '0 pts', color: 'bg-muted border-border-custom/80 text-secondary', title: 'Errou', desc: 'Errou completamente o resultado da partida.' },
              ].map(({ pts, color, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border-custom/40">
                  <span className={`shrink-0 ${color} border px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider`}>{pts}</span>
                  <div className="text-xs space-y-0.5">
                    <p className="font-extrabold text-primary">{title}</p>
                    <p className="text-secondary text-[11px] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Classificação */}
        <div id="ranking" className="lg:col-span-1 lg:sticky lg:top-24">
          {isLoading ? (
            <RankingSkeleton />
          ) : isError ? (
            <div className="bg-card border border-border-custom rounded-2xl p-6 text-center text-secondary text-sm">
              Erro ao carregar classificação.
            </div>
          ) : data ? (
            <>
              <RankingTable ranking={data.ranking} currentUserId={data.userId} totalMatches={matches.length} />
              <RoundRankingClient rounds={data.rounds} currentUserId={data.userId} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
