import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRanking } from '@/app/actions';
import { Match, Prediction } from '@/types';
import { Flame } from '@phosphor-icons/react/dist/ssr';
import EditNicknameForm from '@/components/ui/EditNicknameForm';
import ShareButton from '@/components/ui/ShareButton';
import AvatarUpload from '@/components/ui/AvatarUpload';
import ChangePasswordForm from '@/components/ui/ChangePasswordForm';
import PredictionFiltersClient from '@/components/ui/PredictionFiltersClient';
import PointsEvolutionChart, { PointsEvolutionEntry } from '@/components/ui/PointsEvolutionChart';
import Achievements, { AchievementBadge } from '@/components/ui/Achievements';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const supabase = await createClient();

  // 1. Verificar usuário
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Buscar perfil correspondente para pegar o nome
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, artilheiro_guess, artilheiro_points')
    .eq('id', user.id)
    .single();

  // 3. Buscar ranking
  const ranking = await getRanking();
  const userRankPosition = ranking.findIndex((r) => r.user_id === user.id) + 1;

  // 4. Buscar palpites do usuário junto com os dados dos jogos
  const { data: predictionsData } = await supabase
    .from('predictions')
    .select(`
      id,
      home_score,
      away_score,
      points,
      created_at,
      match:matches (
        id,
        home_team,
        away_team,
        home_flag,
        away_flag,
        match_time,
        home_score,
        away_score,
        stage,
        group_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const predictionsList: any[] = predictionsData || [];

  // Calcular estatísticas locais
  const totalPoints = predictionsList.reduce((acc, curr) => acc + (curr.points || 0), 0);
  const totalPredictions = predictionsList.length;

  const exactHits = predictionsList.filter((p) => p.points === 3).length;
  const goalDiffHits = predictionsList.filter((p) => p.points === 2).length;
  const simpleOutcomeHits = predictionsList.filter((p) => p.points === 1).length;
  const totalAcertos = exactHits + goalDiffHits + simpleOutcomeHits;

  // Calcular streak: sequência consecutiva de acertos (ordenada por match_time)
  const scoredByTime = [...predictionsList]
    .filter((p) => p.match.home_score !== null)
    .sort((a, b) => new Date(a.match.match_time).getTime() - new Date(b.match.match_time).getTime());

  let maxStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  for (const p of scoredByTime) {
    if ((p.points ?? 0) > 0) { tempStreak++; maxStreak = Math.max(maxStreak, tempStreak); }
    else tempStreak = 0;
  }
  for (let i = scoredByTime.length - 1; i >= 0; i--) {
    if ((scoredByTime[i].points ?? 0) > 0) currentStreak++;
    else break;
  }

  const rankingEntry = ranking.find((r) => r.user_id === user.id);
  const aproveitamento = rankingEntry?.aproveitamento ?? 0;

  // 5. Evolução de pontos (acumulado cronológico, jogo a jogo)
  let runningTotal = 0;
  const pointsEvolution: PointsEvolutionEntry[] = scoredByTime.map((p) => {
    runningTotal += p.points ?? 0;
    return {
      label: `${p.match.home_team} x ${p.match.away_team}`,
      cumulative: runningTotal,
      gained: p.points ?? 0,
    };
  });

  // 6. Conquistas
  const { count: totalMatchesCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true });

  const artilheiroPoints = profile?.artilheiro_points ?? 0;
  const badges: AchievementBadge[] = [
    {
      icon: '🎯',
      label: 'Atirador de Elite',
      description: '3 ou mais placares exatos',
      unlocked: exactHits >= 3,
    },
    {
      icon: '🔥',
      label: 'Sequência Imbatível',
      description: '5 ou mais acertos seguidos',
      unlocked: maxStreak >= 5,
    },
    {
      icon: '⚽',
      label: 'Profeta do Artilheiro',
      description: 'Acertou o artilheiro da Copa',
      unlocked: artilheiroPoints > 0,
    },
    {
      icon: '👑',
      label: 'Líder do Bolão',
      description: 'Está em 1º lugar no ranking',
      unlocked: userRankPosition === 1,
    },
    {
      icon: '📋',
      label: 'Carteirinha Completa',
      description: 'Palpitou em todos os jogos disponíveis',
      unlocked: totalPredictions > 0 && totalPredictions === (totalMatchesCount ?? 0),
    },
    {
      icon: '💯',
      label: 'Aproveitamento Surreal',
      description: '70% de aproveitamento ou mais (mín. 5 palpites)',
      unlocked: totalPredictions >= 5 && aproveitamento >= 70,
    },
    {
      icon: '🏅',
      label: 'Veterano',
      description: '10 ou mais palpites enviados',
      unlocked: totalPredictions >= 10,
    },
    {
      icon: '🧊',
      label: 'Sangue Frio',
      description: '5 ou mais placares com saldo de gol certo (2 pts)',
      unlocked: goalDiffHits >= 5,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      {/* Resumo do Usuário */}
      <div className="bg-card border border-border-custom rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-custom/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={profile?.avatar_url ?? null}
              name={profile?.name || user.email?.split('@')[0] || '?'}
              size={80}
            />
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-wider">
                {profile?.name || user.email?.split('@')[0]}
              </h1>
              {user.email && !user.email.endsWith('@bolao.interno') && (
                <p className="text-xs text-secondary font-bold">{user.email}</p>
              )}
              <EditNicknameForm currentName={profile?.name || user.email?.split('@')[0] || ''} />
              <ChangePasswordForm />
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {userRankPosition > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-xs font-black uppercase tracking-wider rounded-xl select-none">
                    🏆 {userRankPosition}º Lugar
                  </span>
                )}
                {currentStreak >= 2 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-black uppercase tracking-wider rounded-xl select-none">
                    🔥 {currentStreak} em sequência
                  </span>
                )}
                <ShareButton
                position={userRankPosition || 99}
                totalPoints={totalPoints}
                acertos={totalAcertos}
                aproveitamento={aproveitamento}
                streak={currentStreak}
                name={profile?.name || user.email?.split('@')[0] || '?'}
                avatarUrl={profile?.avatar_url ?? null}
              />
              </div>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-border-custom pt-4 sm:pt-0 sm:pl-6">
            <div className="text-center">
              <span className="text-secondary text-[10px] font-extrabold uppercase tracking-wider block">Pontos</span>
              <span className="text-3xl font-black text-accent-custom tracking-wider mt-1 block">{totalPoints}</span>
            </div>
            <div className="text-center">
              <span className="text-secondary text-[10px] font-extrabold uppercase tracking-wider block">Acertos</span>
              <span className="text-3xl font-black text-green-500 tracking-wider mt-1 block">{totalAcertos}</span>
            </div>
            <div className="text-center">
              <span className="text-secondary text-[10px] font-extrabold uppercase tracking-wider block">Palpites</span>
              <span className="text-3xl font-black text-primary tracking-wider mt-1 block">{totalPredictions}</span>
            </div>
          </div>
        </div>
        
        {/* Sub-estatísticas */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-border-custom text-center select-none">
          <div className="bg-muted/40 border border-border-custom/50 rounded-xl py-2 px-1">
            <span className="text-[9px] font-bold text-accent-custom block uppercase tracking-wider">Exato</span>
            <span className="text-base sm:text-lg font-black text-primary mt-0.5 block">{exactHits}</span>
            <span className="text-[9px] text-secondary font-bold">3 pts</span>
          </div>
          <div className="bg-muted/40 border border-border-custom/50 rounded-xl py-2 px-1">
            <span className="text-[9px] font-bold text-amber-500 block uppercase tracking-wider">Saldo</span>
            <span className="text-base sm:text-lg font-black text-primary mt-0.5 block">{goalDiffHits}</span>
            <span className="text-[9px] text-secondary font-bold">2 pts</span>
          </div>
          <div className="bg-muted/40 border border-border-custom/50 rounded-xl py-2 px-1">
            <span className="text-[9px] font-bold text-sky-500 block uppercase tracking-wider">Vencedor</span>
            <span className="text-base sm:text-lg font-black text-primary mt-0.5 block">{simpleOutcomeHits}</span>
            <span className="text-[9px] text-secondary font-bold">1 pt</span>
          </div>
          <div className="bg-muted/40 border border-orange-500/20 rounded-xl py-2 px-1">
            <span className="text-[9px] font-bold text-orange-500 block uppercase tracking-wider">Sequência</span>
            <span className="text-base sm:text-lg font-black text-primary mt-0.5 block">{maxStreak}</span>
            <span className="text-[9px] text-secondary font-bold">máx</span>
          </div>
        </div>
      </div>

      <PointsEvolutionChart data={pointsEvolution} />

      <Achievements badges={badges} />

      <Link
        href="/todos"
        className="flex items-center justify-between gap-3 bg-card border border-border-custom hover:border-accent-custom/40 rounded-2xl px-5 py-3.5 mb-8 shadow-md transition-colors group"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-secondary group-hover:text-primary">
          ⚽ Palpite de artilheiro agora fica na aba <span className="text-accent-custom font-black uppercase tracking-wider">Todos os Palpites</span>
        </span>
        <span className="text-accent-custom text-xs font-black shrink-0">Ir →</span>
      </Link>

      {predictionsList.length === 0 ? (
        <div className="text-center py-12 px-6 bg-card border border-border-custom rounded-2xl max-w-md mx-auto shadow-lg space-y-4 animate-fadeIn">
          <div className="w-16 h-16 bg-accent-custom/10 text-accent-custom border border-accent-custom/20 rounded-full flex items-center justify-center text-2xl mx-auto">
            ⚽
          </div>
          <h3 className="text-lg font-extrabold text-primary uppercase tracking-wider">
            Você ainda não fez nenhum palpite.
          </h3>
          <p className="text-sm text-secondary">
            Vai ficar de fora da disputa com seus amigos?
          </p>
          <div className="pt-2 flex justify-center">
            <Link
              href="/palpites"
              className="inline-flex items-center justify-center min-h-[48px] px-6 bg-accent-custom hover:bg-accent-hover text-slate-950 font-bold rounded-xl shadow-md transition-all uppercase tracking-wider text-xs focus:outline-none"
            >
              Começar a Palpitar
            </Link>
          </div>
        </div>
      ) : (
        <PredictionFiltersClient predictions={predictionsList} />
      )}
    </div>
  );
}
