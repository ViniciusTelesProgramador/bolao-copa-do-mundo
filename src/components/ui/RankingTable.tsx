'use client';

import React from 'react';
import { RankingEntry } from '@/types';
import { Medal, Trophy } from '@phosphor-icons/react';

interface RankingTableProps {
  ranking: RankingEntry[];
  currentUserId?: string | null;
}

export default function RankingTable({ ranking, currentUserId }: RankingTableProps) {
  if (ranking.length === 0) {
    return (
      <div className="w-full bg-[#1e293b] border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        Nenhum participante pontuou ainda. Cadastre palpites e aguarde o início dos jogos!
      </div>
    );
  }

  const getPositionStyle = (index: number) => {
    switch (index) {
      case 0: // Ouro
        return {
          icon: <Medal size={18} weight="fill" className="text-yellow-400" />,
          bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
          text: 'font-extrabold text-yellow-400'
        };
      case 1: // Prata
        return {
          icon: <Medal size={18} weight="fill" className="text-slate-300" />,
          bg: 'bg-slate-300/10 text-slate-300 border-slate-300/20',
          text: 'font-extrabold text-slate-300'
        };
      case 2: // Bronze
        return {
          icon: <Medal size={18} weight="fill" className="text-amber-600" />,
          bg: 'bg-amber-600/10 text-amber-500 border-amber-600/20',
          text: 'font-extrabold text-amber-500'
        };
      default:
        return {
          icon: null,
          bg: 'bg-slate-900 text-slate-400 border-slate-800',
          text: 'font-bold text-slate-400'
        };
    }
  };

  return (
    <div className="w-full bg-[#1e293b] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wider">
          <Trophy size={18} className="text-[#22c55e]" />
          Classificação Geral
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 bg-slate-950/20">
              <th className="py-4 px-6 text-center w-20">Pos</th>
              <th className="py-4 px-4">Participante</th>
              <th className="py-4 px-4 text-center">Palpites</th>
              <th className="py-4 px-6 text-right w-24">Pontos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {ranking.map((entry, index) => {
              const pos = index + 1;
              const posStyle = getPositionStyle(index);
              const isCurrentUser = currentUserId === entry.user_id;

              return (
                <tr
                  key={entry.user_id}
                  className={`transition-colors duration-200 ${
                    isCurrentUser
                      ? 'bg-[#22c55e]/5 hover:bg-[#22c55e]/10'
                      : 'hover:bg-slate-900/35'
                  }`}
                >
                  {/* Posição */}
                  <td className="py-4 px-6 text-center">
                    <div className="flex justify-center">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-xl border text-xs ${posStyle.bg} ${posStyle.text}`}
                      >
                        {posStyle.icon ? posStyle.icon : pos}
                      </span>
                    </div>
                  </td>

                  {/* Nome */}
                  <td className="py-4 px-4 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={isCurrentUser ? 'text-[#22c55e] font-extrabold' : ''}>
                        {entry.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] bg-[#22c55e]/15 text-[#22c55e] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#22c55e]/20">
                          Você
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Qtd Palpites */}
                  <td className="py-4 px-4 text-center text-sm font-medium text-slate-400">
                    {entry.predictions_count}
                  </td>

                  {/* Pontos */}
                  <td className="py-4 px-6 text-right">
                    <span
                      className={`text-base font-extrabold tracking-wider ${
                        isCurrentUser ? 'text-[#22c55e]' : 'text-white'
                      }`}
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
    </div>
  );
}
