'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Trophy, ArrowLeft } from '@phosphor-icons/react';
import RoundRankingClient, { RoundData } from './RoundRankingClient';
import { RankingEntry } from '@/types';
import { Medal } from '@phosphor-icons/react';

interface RankingData {
  ranking: RankingEntry[];
  rounds: RoundData[];
  totalMatches: number;
  currentUserId: string | null;
}

const AVATAR_COLORS = ['bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500'];
const avatarBg = (name: string) => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border-custom/30">
          <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
          <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
          <div className="flex-1 h-4 bg-muted rounded" />
          <div className="w-16 h-4 bg-muted rounded" />
          <div className="w-10 h-5 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

export default function RankingPageClient() {
  const { data, isLoading } = useQuery<RankingData>({
    queryKey: ['ranking-full'],
    queryFn: () => fetch('/api/ranking-full').then(r => r.json()),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const ranking = data?.ranking ?? [];
  const currentUserId = data?.currentUserId ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary hover:text-primary transition-colors mb-5">
          <ArrowLeft size={16} weight="bold" />
          Início
        </Link>
        <div className="flex items-center gap-3">
          <Trophy size={28} weight="fill" className="text-yellow-500 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-wide">Classificação Geral</h1>
            {data && (
              <p className="text-xs text-secondary font-bold mt-0.5">
                {ranking.length} participantes · {data.totalMatches} jogos
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border-custom rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-border-custom/60 text-[9px] font-black text-secondary bg-muted/20 uppercase tracking-widest select-none">
              <th className="py-3.5 px-3 text-center w-[48px] sm:w-[56px]">Pos</th>
              <th className="py-3.5 px-2 text-left">Participante</th>
              <th className="py-3.5 px-2 text-center w-[64px] hidden sm:table-cell">Aprv.</th>
              <th className="py-3.5 px-2 text-center w-[56px] hidden sm:table-cell">Palp.</th>
              <th className="py-3.5 px-4 text-right w-[64px] sm:w-[80px]">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/30">
            {isLoading ? (
              <tr><td colSpan={5}><Skeleton /></td></tr>
            ) : ranking.map((entry, index) => {
              const pos = index + 1;
              const isMe = currentUserId === entry.user_id;

              let rankBadge: React.ReactNode;
              if (pos === 1) {
                rankBadge = (
                  <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full shadow-md text-slate-950 font-black text-xs border border-yellow-400 select-none animate-pulse shrink-0">
                    <Medal size={12} weight="fill" className="absolute -top-1 -right-1 text-yellow-100" />1
                  </div>
                );
              } else if (pos === 2) {
                rankBadge = (
                  <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-400 rounded-full shadow-md text-slate-950 font-black text-xs border border-slate-300 select-none shrink-0">
                    <Medal size={12} weight="fill" className="absolute -top-1 -right-1 text-slate-100" />2
                  </div>
                );
              } else if (pos === 3) {
                rankBadge = (
                  <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 rounded-full shadow-md text-white font-black text-xs border border-amber-400 select-none shrink-0">
                    <Medal size={12} weight="fill" className="absolute -top-1 -right-1 text-amber-100" />3
                  </div>
                );
              } else {
                rankBadge = (
                  <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted text-secondary font-extrabold text-xs border border-border-custom/50">
                    {pos}
                  </span>
                );
              }

              return (
                <tr
                  key={entry.user_id}
                  className={`transition-colors ${isMe ? 'bg-accent-custom/5 border-l-4 border-l-accent-custom' : 'hover:bg-muted/30'}`}
                >
                  {/* Posição */}
                  <td className="py-3 px-1 text-center">
                    <div className="flex justify-center">{rankBadge}</div>
                  </td>

                  {/* Participante */}
                  <td className="py-3 px-2 min-w-0">
                    <Link
                      href={isMe ? '/perfil' : `/perfil/${entry.user_id}`}
                      className="flex items-center gap-2.5 min-w-0 group"
                    >
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={entry.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-custom group-hover:ring-2 group-hover:ring-accent-custom/30 transition-all"
                        />
                      ) : (
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-[11px] font-black text-white shrink-0 select-none group-hover:ring-2 group-hover:ring-accent-custom/30 transition-all ${avatarBg(entry.name)}`}>
                          {entry.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            style={{ color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}
                            className={`text-sm font-extrabold truncate ${isMe ? '' : 'group-hover:text-accent-custom transition-colors'}`}
                          >
                            {entry.name}
                          </span>
                          {isMe && (
                            <span className="text-[8px] bg-accent-custom/15 text-accent-custom px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-accent-custom/20 select-none shrink-0">
                              Você
                            </span>
                          )}
                          {entry.artilheiro_points > 0 && (
                            <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full font-black border border-amber-500/20 select-none shrink-0" title="Acertou o artilheiro (+5 pts)">
                              ⚽+5
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold sm:hidden mt-0.5 ${
                          entry.aproveitamento >= 70 ? 'text-green-500' :
                          entry.aproveitamento >= 40 ? 'text-amber-500' :
                          entry.predictions_count === 0 ? 'text-secondary' : 'text-red-400'
                        }`}>
                          {entry.predictions_count === 0 ? 'sem palpites' : `${entry.aproveitamento}% aprv.`}
                        </span>
                      </div>
                    </Link>
                  </td>

                  {/* Aproveitamento */}
                  <td className="py-3 px-2 text-center select-none hidden sm:table-cell">
                    <span className={`text-xs font-black ${
                      entry.aproveitamento >= 70 ? 'text-green-500' :
                      entry.aproveitamento >= 40 ? 'text-amber-500' :
                      entry.predictions_count === 0 ? 'text-secondary' : 'text-red-400'
                    }`}>
                      {entry.predictions_count === 0 ? '—' : `${entry.aproveitamento}%`}
                    </span>
                  </td>

                  {/* Palpites */}
                  <td className="py-3 px-2 text-center select-none hidden sm:table-cell">
                    <span className="text-xs font-bold text-secondary">{entry.predictions_count}</span>
                  </td>

                  {/* Pontos */}
                  <td className="py-3 px-4 text-right">
                    <span
                      style={{ color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}
                      className="text-base font-black tracking-wider"
                    >
                      {entry.total_points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ranking por Rodada */}
      {data && <RoundRankingClient rounds={data.rounds} currentUserId={currentUserId} />}
    </div>
  );
}
