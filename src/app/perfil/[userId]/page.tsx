import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRanking } from '@/app/actions';
import Link from 'next/link';
import PointsEvolutionChart, { PointsEvolutionEntry } from '@/components/ui/PointsEvolutionChart';
import Achievements, { AchievementBadge } from '@/components/ui/Achievements';
import PredictionFiltersClient from '@/components/ui/PredictionFiltersClient';
import AvatarExpandable from '@/components/ui/AvatarExpandable';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.id === userId) redirect('/perfil');

  const admin = createAdminClient();

  const { data: rows, error: profileErr } = await admin
    .from('profiles')
    .select('name, avatar_url, artilheiro_guess, artilheiro_points, x1_points')
    .eq('id', userId)
    .limit(1);

  console.log('[PublicProfile] userId:', userId, 'rows:', rows, 'error:', profileErr);

  const profile = rows?.[0] ?? null;

  if (!profile) {
    // Fallback: tenta buscar sem filtro para verificar se a tabela está acessível
    const { data: allRows, error: allErr } = await admin
      .from('profiles')
      .select('id, name')
      .limit(3);
    console.log('[PublicProfile] fallback check - profiles sample:', allRows, 'error:', allErr);

    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-3">
        <p className="text-2xl font-black text-primary">Usuário não encontrado</p>
        <p className="text-xs text-secondary font-mono">ID: {userId}</p>
        <p className="text-xs text-secondary font-mono">Erro: {profileErr?.message ?? 'nenhum erro, mas 0 rows'}</p>
        <p className="text-xs text-secondary font-mono">Profiles na tabela: {allRows?.map(r => r.id).join(', ') ?? 'erro: ' + allErr?.message}</p>
        <Link href="/" className="mt-4 inline-block text-accent-custom font-bold text-sm">← Voltar ao ranking</Link>
      </div>
    );
  }

  const ranking = await getRanking();
  const rankPosition = ranking.findIndex(r => r.user_id === userId) + 1;
  const rankEntry = ranking.find(r => r.user_id === userId);
  const aproveitamento = rankEntry?.aproveitamento ?? 0;

  const { data: allPredsData } = await admin
    .from('predictions')
    .select(`
      id, home_score, away_score, points, created_at,
      match:matches (
        id, home_team, away_team, home_flag, away_flag,
        match_time, home_score, away_score, stage, group_name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const allPreds: any[] = allPredsData || [];

  const totalPredictions = allPreds.length;
  const exactHits = allPreds.filter(p => p.points === 3).length;
  const goalDiffHits = allPreds.filter(p => p.points === 2).length;
  const simpleOutcomeHits = allPreds.filter(p => p.points === 1).length;
  const totalAcertos = exactHits + goalDiffHits + simpleOutcomeHits;
  const predPoints = allPreds.reduce((acc, p) => acc + (p.points || 0), 0);
  const totalPoints = predPoints + (profile.artilheiro_points ?? 0) + ((profile as any).x1_points ?? 0);

  const scoredByTime = [...allPreds]
    .filter(p => p.match?.home_score !== null)
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

  let runningTotal = 0;
  const pointsEvolution: PointsEvolutionEntry[] = scoredByTime.map(p => {
    runningTotal += p.points ?? 0;
    return {
      label: `${p.match.home_team} x ${p.match.away_team}`,
      cumulative: runningTotal,
      gained: p.points ?? 0,
    };
  });

  const [{ count: totalMatchesCount }, { data: x1Data }] = await Promise.all([
    admin.from('matches').select('id', { count: 'exact', head: true }),
    admin.from('challenges').select(`
      id, result, points_transferred, challenger_id, updated_at,
      challenger_home, challenger_away, challenged_home, challenged_away,
      challenger:profiles!challenger_id(id, name, avatar_url),
      challenged:profiles!challenged_id(id, name, avatar_url),
      match:matches(home_team, away_team)
    `)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false }),
  ]);

  const x1Battles = x1Data ?? [];
  const x1Wins   = x1Battles.filter((b: any) =>
    (b.challenger_id === userId && b.result === 'challenger_won') ||
    (b.challenger_id !== userId && b.result === 'challenged_won'),
  ).length;
  const x1Losses = x1Battles.filter((b: any) =>
    (b.challenger_id === userId && b.result === 'challenged_won') ||
    (b.challenger_id !== userId && b.result === 'challenger_won'),
  ).length;
  const x1Ties   = x1Battles.filter((b: any) => b.result === 'tie').length;
  const x1NetPts = (profile as any).x1_points ?? 0;

  const badges: AchievementBadge[] = [
    { icon: '🎯', label: 'Atirador de Elite',     description: '3 ou mais placares exatos',               unlocked: exactHits >= 3 },
    { icon: '🔥', label: 'Sequência Imbatível',   description: '5 ou mais acertos seguidos',              unlocked: maxStreak >= 5 },
    { icon: '⚽', label: 'Profeta do Artilheiro', description: 'Acertou o artilheiro da Copa',            unlocked: (profile.artilheiro_points ?? 0) > 0 },
    { icon: '👑', label: 'Líder do Bolão',         description: 'Está em 1º lugar no ranking',            unlocked: rankPosition === 1 },
    { icon: '📋', label: 'Carteirinha Completa',   description: 'Palpitou em todos os jogos disponíveis', unlocked: totalPredictions > 0 && totalPredictions === (totalMatchesCount ?? 0) },
    { icon: '💯', label: 'Aproveitamento Surreal', description: '70% de aproveitamento ou mais (mín. 5 palpites)', unlocked: totalPredictions >= 5 && aproveitamento >= 70 },
    { icon: '🏅', label: 'Veterano',               description: '10 ou mais palpites enviados',           unlocked: totalPredictions >= 10 },
    { icon: '🧊', label: 'Sangue Frio',            description: '5 ou mais placares com saldo de gol certo (2 pts)', unlocked: goalDiffHits >= 5 },
  ];

  const now = new Date();
  const startedPredictions = allPreds.filter(p => p.match && new Date(p.match.match_time) <= now);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/" className="text-xs text-secondary hover:text-primary font-bold transition-colors">
          ← Ranking
        </Link>
        {user && (
          <Link
            href={`/h2h?a=${user.id}&b=${userId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-secondary bg-muted border border-border-custom rounded-lg hover:text-primary hover:border-secondary transition-all"
          >
            ⚔️ Comparar comigo
          </Link>
        )}
      </div>

      {/* Card de perfil */}
      <div className="bg-card border border-border-custom rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-custom/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <AvatarExpandable
              src={profile.avatar_url ?? null}
              name={profile.name}
              size={80}
            />
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-wider">
                {profile.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {rankPosition > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-xs font-black uppercase tracking-wider rounded-xl select-none">
                    🏆 {rankPosition}º Lugar
                  </span>
                )}
                {currentStreak >= 2 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-black uppercase tracking-wider rounded-xl select-none">
                    🔥 {currentStreak} em sequência
                  </span>
                )}
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

        <div className="grid grid-cols-5 gap-2 mt-6 pt-5 border-t border-border-custom text-center select-none">
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
          <div className="bg-muted/40 border border-purple-500/20 rounded-xl py-2 px-1">
            <span className="text-[9px] font-bold text-purple-400 block uppercase tracking-wider">X1 ⚔️</span>
            <span className={`text-base sm:text-lg font-black mt-0.5 block ${x1NetPts > 0 ? 'text-green-500' : x1NetPts < 0 ? 'text-red-400' : 'text-primary'}`}>
              {x1NetPts > 0 ? '+' : ''}{x1NetPts}
            </span>
            <span className="text-[9px] text-secondary font-bold">pts</span>
          </div>
        </div>
      </div>

      <PointsEvolutionChart data={pointsEvolution} />

      {/* ── X1 History ── */}
      {x1Battles.length > 0 && (
        <div className="bg-card border border-border-custom rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-secondary uppercase tracking-widest">⚔️ Histórico X1</h3>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-green-500">{x1Wins}V</span>
              <span className="text-[11px] font-black text-secondary/50">{x1Ties}E</span>
              <span className="text-[11px] font-black text-red-400">{x1Losses}D</span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${x1NetPts > 0 ? 'text-green-500 bg-green-500/10 border-green-500/20' : x1NetPts < 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-secondary bg-muted border-border-custom/40'}`}>
                {x1NetPts > 0 ? '+' : ''}{x1NetPts} pts
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {x1Battles.slice(0, 10).map((b: any) => {
              const isChallenger = b.challenger_id === userId;
              const opponent     = isChallenger ? b.challenged : b.challenger;
              const userWon      = (isChallenger && b.result === 'challenger_won') || (!isChallenger && b.result === 'challenged_won');
              const isTie        = b.result === 'tie';
              const myPalpite    = isChallenger ? `${b.challenger_home}×${b.challenger_away}` : `${b.challenged_home}×${b.challenged_away}`;
              const oppPalpite   = isChallenger ? `${b.challenged_home}×${b.challenged_away}` : `${b.challenger_home}×${b.challenger_away}`;
              const pts          = userWon ? `+${b.points_transferred}` : isTie ? '0' : `-${b.points_transferred}`;
              return (
                <div key={b.id} className="flex items-center gap-2.5 py-2 border-b border-border-custom/30 last:border-0">
                  <span className={`text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${userWon ? 'bg-green-500/20 text-green-500' : isTie ? 'bg-secondary/20 text-secondary' : 'bg-red-500/20 text-red-400'}`}>
                    {userWon ? 'V' : isTie ? 'E' : 'D'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary truncate">vs {opponent?.name}</p>
                    <p className="text-[9px] text-secondary font-bold truncate">{b.match?.home_team} × {b.match?.away_team}</p>
                  </div>
                  <span className="text-[9px] text-secondary font-bold shrink-0">{myPalpite} / {oppPalpite}</span>
                  <span className={`text-xs font-black shrink-0 w-10 text-right ${userWon ? 'text-green-500' : isTie ? 'text-secondary' : 'text-red-400'}`}>{pts} pts</span>
                </div>
              );
            })}
          </div>
          {x1Battles.length > 10 && (
            <Link href="/extrato" className="text-[10px] text-accent-custom font-black hover:underline mt-3 block text-center">
              Ver histórico completo →
            </Link>
          )}
        </div>
      )}

      <Achievements badges={badges} />

      {startedPredictions.length === 0 ? (
        <div className="text-center py-12 px-6 bg-card border border-border-custom rounded-2xl shadow-lg">
          <p className="text-secondary font-bold text-sm">Nenhum palpite revelado ainda.</p>
        </div>
      ) : (
        <PredictionFiltersClient predictions={startedPredictions} readonly />
      )}
    </div>
  );
}
