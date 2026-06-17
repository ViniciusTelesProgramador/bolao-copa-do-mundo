import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getRanking } from '@/app/actions';
import MatchCard from '@/components/ui/MatchCard';
import RankingTable from '@/components/ui/RankingTable';
import RoundRankingClient, { RoundData } from '@/components/ui/RoundRankingClient';
import PendingActionsBanner from '@/components/ui/PendingActionsBanner';
import { Match, Prediction } from '@/types';
import Link from 'next/link';
import { isSameDayInSaoPaulo, getDateKeySaoPaulo } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const ranking = await getRanking();

  // 1. Obter usuário logado
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Buscar todas as partidas
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });

  const matches: Match[] = matchesData || [];

  // 3. Buscar palpites do usuário logado
  let userPredictions: Prediction[] = [];
  if (user) {
    const { data: predictionsData } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id);
    userPredictions = predictionsData || [];
  }

  const predictionsMap = new Map<string, Prediction>();
  userPredictions.forEach((p) => {
    predictionsMap.set(p.match_id, p);
  });

  // 3.1 Montar ranking por rodada (agrupado por dia civil de Brasília)
  const { data: scoredPredictionsData } = await supabase
    .from('predictions')
    .select('user_id, points, match:matches ( match_time )')
    .not('points', 'is', null);

  const profileByUserId = new Map(ranking.map((r) => [r.user_id, r]));
  const roundsMap = new Map<string, Map<string, { points: number; acertos: number; predictions_count: number }>>();

  (scoredPredictionsData || []).forEach((pred: any) => {
    const matchTime = pred.match?.match_time;
    if (!matchTime) return;
    const dateKey = getDateKeySaoPaulo(matchTime);
    if (!roundsMap.has(dateKey)) roundsMap.set(dateKey, new Map());
    const userMap = roundsMap.get(dateKey)!;
    const stats = userMap.get(pred.user_id) || { points: 0, acertos: 0, predictions_count: 0 };
    stats.points += pred.points ?? 0;
    stats.acertos += (pred.points ?? 0) > 0 ? 1 : 0;
    stats.predictions_count += 1;
    userMap.set(pred.user_id, stats);
  });

  const rounds: RoundData[] = [...roundsMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, userMap]) => {
      const [, month, day] = dateKey.split('-');
      return {
        dateKey,
        label: `${day}/${month}`,
        entries: [...userMap.entries()]
          .map(([userId, stats]) => ({
            user_id: userId,
            name: profileByUserId.get(userId)?.name ?? 'Participante',
            avatar_url: profileByUserId.get(userId)?.avatar_url ?? null,
            ...stats,
          }))
          .sort((a, b) => b.points - a.points),
      };
    });

  // Snapshot do Top 3 para o Hero
  const topThree = ranking.slice(0, 3);

  // 4. Filtrar apenas as partidas do dia atual no fuso de Brasília
  const nowInSaoPaulo = new Date();
  const todaysMatches = matches.filter(match => {
    return isSameDayInSaoPaulo(match.match_time, nowInSaoPaulo);
  });

  // 5. Pendências do usuário: jogos sem palpite que fecham nas próximas 48h + artilheiro
  let missingMatches: Match[] = [];
  let artilheiroMissing = false;
  let artilheiroDeadlineLabel: string | undefined;

  if (user) {
    const urgentWindowMs = 48 * 60 * 60 * 1000;
    const nowMs = Date.now();
    missingMatches = matches
      .filter((m) => {
        const t = new Date(m.match_time).getTime();
        return t > nowMs && t < nowMs + urgentWindowMs && !predictionsMap.has(m.id);
      })
      .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());

    const { data: profileData } = await supabase
      .from('profiles')
      .select('artilheiro_guess')
      .eq('id', user.id)
      .single();

    const deadlineStr = process.env.ARTILHEIRO_DEADLINE || '2026-06-18T23:59:59-03:00';
    const artilheiroDeadline = new Date(deadlineStr);
    artilheiroMissing = !profileData?.artilheiro_guess && nowMs < artilheiroDeadline.getTime();
    if (artilheiroMissing) {
      artilheiroDeadlineLabel = artilheiroDeadline.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Fortaleza',
      });
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      {user && (
        <PendingActionsBanner
          missingMatches={missingMatches}
          artilheiroMissing={artilheiroMissing}
          artilheiroDeadlineLabel={artilheiroDeadlineLabel}
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
            {user ? (
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
              href="#ranking"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-muted hover:bg-border-custom/50 text-primary font-bold rounded-2xl border border-border-custom transition-all duration-200 min-h-[48px]"
            >
              Ver Classificação
            </Link>
          </div>
        </div>

        {/* Lado Direito: Snapshot do Ranking — Pódio */}
        <div className="lg:col-span-5 bg-card border border-border-custom rounded-2xl p-6 shadow-xl w-full">
          <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-5 flex items-center gap-1.5 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" className="text-yellow-500">
              <path d="M200,40H176a8,8,0,0,0,0,16h24v48c0,28.89-21.73,53.2-51.27,57.38A80.24,80.24,0,0,1,136,175.79V200h16a8,8,0,0,1,0,16H136v16h24a8,8,0,0,1,0,16H96a8,8,0,0,1,0-16h24V216H104a8,8,0,0,1,0-16h16V175.79A80.24,80.24,0,0,1,107.27,161.4C77.73,157.2,56,132.89,56,104V56H80a8,8,0,0,0,0-16H56A16,16,0,0,0,40,56v48c0,35.91,26.47,66.19,62,71.39V200h-8a8,8,0,0,0,0,16h8v16h-8a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16h-8V216h8a8,8,0,0,0,0-16h-8V175.39c35.53-5.2,62-35.48,62-71.39V56A16,16,0,0,0,200,40ZM72,56H88V80H72ZM184,80H168V56H184Z"></path>
            </svg>
            Líderes do Bolão
          </h3>

          {topThree.length === 0 ? (
            <div className="text-xs text-secondary py-4 italic">
              Nenhuma pontuação registrada ainda. Seja o primeiro a palpitar!
            </div>
          ) : (() => {
            const avatarColors = ['bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500'];
            const avatarColor = (name: string) => avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

            // Ordem visual do pódio: 2º, 1º, 3º
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
                      {/* Medalha */}
                      <span className="text-lg mb-1 select-none">{cfg.medal}</span>

                      {/* Avatar */}
                      {player.avatar_url ? (
                        <img
                          src={player.avatar_url}
                          alt={player.name}
                          className={`${cfg.avatarSize} rounded-full object-cover ring-2 ${cfg.ringColor} mb-2 shrink-0`}
                        />
                      ) : (
                        <span className={`${cfg.avatarSize} rounded-full flex items-center justify-center font-black text-white ring-2 ${cfg.ringColor} mb-2 shrink-0 select-none ${avatarColor(player.name)} ${isFirst ? 'text-base' : 'text-sm'}`}>
                          {player.name.substring(0, 1).toUpperCase()}
                        </span>
                      )}

                      {/* Nome + Pontos */}
                      <p className={`font-black truncate w-full text-center leading-tight ${cfg.labelColor} ${cfg.textSize}`}>
                        {player.name}
                      </p>
                      <p className={`font-bold text-secondary mb-2 ${isFirst ? 'text-xs' : 'text-[10px]'}`}>
                        {player.total_points} pts
                      </p>

                      {/* Bloco do pódio */}
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

      {/* Grid Principal: Jogos de Hoje e Classificação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* Jogos de Hoje e Regras (2 colunas) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Seção Jogos de Hoje */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <h2 className="text-lg font-black text-primary uppercase tracking-wider select-none">
                Jogos de Hoje ⚽
              </h2>
              <Link
                href="/palpites"
                className="text-xs font-bold text-accent-custom hover:text-accent-hover transition-colors"
              >
                Todos os jogos &rarr;
              </Link>
            </div>

            {todaysMatches.length === 0 ? (
              <div className="bg-card border border-border-custom rounded-2xl p-10 text-center text-secondary space-y-3 shadow-sm">
                <p className="font-extrabold text-sm uppercase tracking-wider">Nenhum jogo agendado para hoje.</p>
                <p className="text-xs">Mas você pode palpitar nos próximos jogos do campeonato!</p>
                <div className="pt-2 flex justify-center">
                  <Link
                    href="/palpites"
                    className="inline-flex items-center justify-center min-h-[48px] px-5 bg-accent-custom hover:bg-accent-hover text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow"
                  >
                    Ver Jogos e Palpitar
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {todaysMatches.map((match) => {
                  const matchIndex = matches.findIndex((m) => m.id === match.id);
                  const matchNumber = matchIndex !== -1 ? matchIndex + 1 : undefined;
                  return (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={predictionsMap.get(match.id)}
                      isAuthenticated={!!user}
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
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border-custom/40">
                <span className="shrink-0 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider">
                  3 pts
                </span>
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-primary">Placar Exato</p>
                  <p className="text-secondary text-[11px] leading-relaxed">Você acertou o placar exato do jogo. Ex: palpite 2x1 e final 2x1.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border-custom/40">
                <span className="shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider">
                  2 pts
                </span>
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-primary">Vencedor + Diferença</p>
                  <p className="text-secondary text-[11px] leading-relaxed">Acertou vencedor e saldo de gols (exeto empate). Ex: palpite 3x1 e final 2x0.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border-custom/40">
                <span className="shrink-0 bg-sky-500/10 text-sky-600 dark:text-sky-450 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider">
                  1 pt
                </span>
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-primary">Apenas o Vencedor / Empate</p>
                  <p className="text-secondary text-[11px] leading-relaxed">Acertou apenas quem ganhou ou que deu empate. Ex: palpite 2x1 e final 1x0.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border-custom/40">
                <span className="shrink-0 bg-muted border border-border-custom/80 px-2 py-0.5 rounded-full text-[10px] font-black text-secondary tracking-wider">
                  0 pts
                </span>
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-primary">Errou</p>
                  <p className="text-secondary text-[11px] leading-relaxed">Errou completamente o resultado da partida.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Classificação Completa (1 coluna) */}
        <div id="ranking" className="lg:col-span-1 lg:sticky lg:top-24">
          <RankingTable ranking={ranking} currentUserId={user?.id} totalMatches={matches.length} />
          <RoundRankingClient rounds={rounds} currentUserId={user?.id} />
        </div>
      </div>
    </div>
  );
}
