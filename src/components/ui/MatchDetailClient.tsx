'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { ArrowLeft, Sword, NotePencil, X, Spinner, Lock } from '@phosphor-icons/react';
import FlagTeam from './FlagTeam';
import MatchCommentsSection from './MatchCommentsSection';
import { formatMatchDate, formatMatchTime } from '@/lib/date';
import { savePrediction } from '@/app/actions';
import { showToast } from './Toast';

// ─── tipos locais ────────────────────────────────────────────────────────────

interface PredictionRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  home_score: number;
  away_score: number;
  points: number | null;
  created_at: string;
}

interface ChallengeRow {
  id: string;
  status: string;
  result: string | null;
  challenger_home: number | null;
  challenger_away: number | null;
  challenged_home: number | null;
  challenged_away: number | null;
  challenger_match_points: number | null;
  challenged_match_points: number | null;
  points_transferred: number;
  challenger: { id: string; name: string; avatar_url: string | null };
  challenged: { id: string; name: string; avatar_url: string | null };
}

interface MatchData {
  match: {
    id: string;
    home_team: string;
    away_team: string;
    home_flag: string;
    away_flag: string;
    match_time: string;
    home_score: number | null;
    away_score: number | null;
    stage: string;
    group_name: string | null;
  };
  predictions: PredictionRow[];
  challenges: ChallengeRow[];
  currentUserId: string | null;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500'];
const avatarBg = (name: string) => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl: string | null; size?: number }) {
  const dim = `w-${size} h-${size}`;
  return avatarUrl ? (
    <img src={avatarUrl} alt={name} className={`${dim} rounded-full object-cover border border-border-custom shrink-0`} />
  ) : (
    <span className={`${dim} rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 select-none ${avatarBg(name)}`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function PointsBadge({ points }: { points: number | null }) {
  if (points === null) return <span className="text-[10px] text-secondary font-bold">—</span>;
  const cfg =
    points === 3 ? 'bg-green-500/15 text-green-500 border-green-500/25' :
    points === 2 ? 'bg-blue-500/15 text-blue-500 border-blue-500/25' :
    points === 1 ? 'bg-sky-500/15 text-sky-500 border-sky-500/25' :
                   'bg-muted text-secondary border-border-custom/50';
  const label = points === 3 ? '3 pts ✓✓' : points === 2 ? '2 pts ✓' : points === 1 ? '1 pt' : '0 pts';
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg}`}>{label}</span>
  );
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-muted rounded-xl" />
      <div className="bg-card border border-border-custom rounded-2xl p-6 h-40" />
      <div className="bg-card border border-border-custom rounded-2xl p-6 h-64" />
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function MatchDetailClient({ matchId }: { matchId: string }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data, isLoading, isError } = useQuery<MatchData>({
    queryKey: ['partida', matchId],
    queryFn: () => fetch(`/api/partida/${matchId}`).then(r => {
      if (!r.ok) throw new Error('Partida não encontrada');
      return r.json();
    }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const preds = data.predictions;
    const scored = preds.filter(p => p.points !== null);
    const total = preds.length;
    const dist = { 3: 0, 2: 0, 1: 0, 0: 0 };
    scored.forEach(p => { dist[p.points as 0 | 1 | 2 | 3]++; });
    // Palpites mais comuns
    const scoreFreq = new Map<string, number>();
    preds.forEach(p => {
      const k = `${p.home_score}x${p.away_score}`;
      scoreFreq.set(k, (scoreFreq.get(k) || 0) + 1);
    });
    const topScores = [...scoreFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { total, scored: scored.length, dist, topScores };
  }, [data]);

  if (isLoading) return <Skeleton />;
  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-secondary">
        <p className="font-bold">Partida não encontrada.</p>
        <Link href="/palpites" className="mt-4 inline-block text-accent-custom font-bold text-sm hover:underline">← Voltar</Link>
      </div>
    );
  }

  const { match, predictions, challenges, currentUserId } = data;
  const hasResult = match.home_score !== null && match.away_score !== null;
  const matchStarted = new Date(match.match_time) <= new Date();
  const userPrediction = predictions.find(p => p.user_id === currentUserId);
  const canPredict = !!currentUserId && !matchStarted && !hasResult;

  const openModal = () => {
    setHomeScore(userPrediction ? String(userPrediction.home_score) : '');
    setAwayScore(userPrediction ? String(userPrediction.away_score) : '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeScore === '' || awayScore === '') {
      setFormError('Preencha os placares dos dois times.');
      return;
    }
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setFormError('Placares devem ser números inteiros ≥ 0.');
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await savePrediction(match.id, h, a);
      if (result.success) {
        showToast(userPrediction ? 'Palpite atualizado!' : 'Palpite salvo!', 'success');
        qc.invalidateQueries({ queryKey: ['partida', matchId] });
        qc.invalidateQueries({ queryKey: ['palpites'] });
        setModalOpen(false);
      } else {
        setFormError(result.error || 'Erro ao salvar palpite.');
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Voltar */}
      <Link href="/palpites" className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary hover:text-primary transition-colors">
        <ArrowLeft size={16} weight="bold" />
        Todos os jogos
      </Link>

      {/* ── Header da Partida ───────────────────────────────────────────── */}
      <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-secondary uppercase tracking-wider bg-muted px-3 py-1 rounded-full">
            {match.stage}{match.group_name ? ` • ${match.group_name}` : ''}
          </span>
          <div className="flex items-center gap-2">
            {matchStarted && !hasResult && (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Ao vivo
              </span>
            )}
            {hasResult && (
              <span className="text-[10px] font-black uppercase tracking-wider text-secondary bg-muted px-2.5 py-1 rounded-full">
                Encerrado
              </span>
            )}
            <span className="text-[10px] font-bold text-secondary">
              {formatMatchDate(match.match_time)} às {formatMatchTime(match.match_time)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 items-center gap-3 my-2">
          <div className="col-span-5 flex justify-start">
            <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="w-full justify-start text-base" />
          </div>
          <div className="col-span-2 flex justify-center">
            {hasResult ? (
              <div className="flex items-center gap-1.5 bg-accent-custom/10 border border-accent-custom/25 px-4 py-2 rounded-xl font-extrabold text-xl text-accent-custom select-none">
                <span>{match.home_score}</span>
                <span className="text-secondary text-sm font-bold">x</span>
                <span>{match.away_score}</span>
              </div>
            ) : (
              <span className="text-secondary font-black text-base select-none">x</span>
            )}
          </div>
          <div className="col-span-5 flex justify-end">
            <FlagTeam flag={match.away_flag} name={match.away_team} reverse={true} className="w-full justify-end text-base" />
          </div>
        </div>

        {/* Seu palpite / ação */}
        {currentUserId && (
          <div className="mt-5 pt-4 border-t border-border-custom/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black text-secondary uppercase tracking-wider block mb-1">Seu palpite</span>
              {userPrediction ? (
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                    {userPrediction.home_score} x {userPrediction.away_score}
                  </span>
                  {hasResult && <PointsBadge points={userPrediction.points} />}
                </div>
              ) : (
                <span className="text-xs text-secondary italic">Sem palpite</span>
              )}
            </div>
            {canPredict ? (
              <button
                onClick={openModal}
                className="flex items-center gap-1.5 min-h-[40px] px-4 bg-accent-custom hover:bg-accent-hover text-slate-950 text-xs font-bold rounded-xl shadow transition-all shrink-0 cursor-pointer"
              >
                <NotePencil size={14} />
                {userPrediction ? 'Editar' : 'Palpitar'}
              </button>
            ) : matchStarted && !hasResult ? (
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs text-secondary font-bold bg-muted/50 rounded-lg border border-border-custom/50 shrink-0 select-none">
                <Lock size={13} /> Fechado
              </span>
            ) : null}
          </div>
        )}
        {!currentUserId && !matchStarted && (
          <div className="mt-5 pt-4 border-t border-border-custom/50">
            <Link href="/login" className="inline-flex items-center gap-1.5 min-h-[40px] px-4 bg-muted hover:bg-border-custom border border-border-custom text-primary text-xs font-bold rounded-xl transition-all">
              Entre para palpitar
            </Link>
          </div>
        )}
      </div>

      {/* ── Estatísticas ─────────────────────────────────────────────────── */}
      {stats && stats.total > 0 && (
        <div className="bg-card border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-extrabold text-primary uppercase tracking-wider">Estatísticas dos Palpites</h2>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-2xl font-black text-primary">{stats.total}</p>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-0.5">Palpites</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-2xl font-black text-primary">{stats.scored}</p>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-0.5">Pontuados</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-2xl font-black text-green-500">{stats.dist[3]}</p>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-0.5">Placar Exato</p>
            </div>
          </div>

          {/* Distribuição de pontos */}
          {stats.scored > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-secondary uppercase tracking-wider">Distribuição</p>
              {([3, 2, 1, 0] as const).map(pts => {
                const count = stats.dist[pts];
                const pct = stats.scored > 0 ? Math.round((count / stats.scored) * 100) : 0;
                const color = pts === 3 ? 'bg-green-500' : pts === 2 ? 'bg-blue-500' : pts === 1 ? 'bg-sky-500' : 'bg-muted';
                const label = pts === 3 ? '3 pts — Exato' : pts === 2 ? '2 pts — Vencedor+Saldo' : pts === 1 ? '1 pt — Vencedor' : '0 pts — Errou';
                return (
                  <div key={pts} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-secondary w-32 shrink-0">{label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-secondary w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Palpites mais comuns */}
          {stats.topScores.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-secondary uppercase tracking-wider mb-2">Palpites mais comuns</p>
              <div className="flex flex-wrap gap-2">
                {stats.topScores.map(([score, count]) => (
                  <span key={score} className="flex items-center gap-1.5 bg-muted border border-border-custom px-3 py-1.5 rounded-xl text-xs font-black text-primary">
                    {score}
                    <span className="text-secondary font-bold">({count}x)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── X1 desta partida ─────────────────────────────────────────────── */}
      {challenges.length > 0 && (
        <div className="bg-card border border-border-custom rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-border-custom/60 bg-muted/40 flex items-center gap-2">
            <Sword size={16} weight="fill" className="text-accent-custom shrink-0" />
            <h2 className="text-xs font-extrabold text-primary uppercase tracking-wider">Duelos X1</h2>
            <span className="ml-auto text-[10px] text-secondary font-bold">{challenges.length} duelo{challenges.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-border-custom/30">
            {challenges.map(c => {
              const isCompleted = c.status === 'completed';
              const chalWon = c.result === 'challenger_won';
              const chalLost = c.result === 'challenged_won';
              const tie = c.result === 'tie';
              return (
                <div key={c.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {/* Challenger */}
                  <div className={`flex items-center gap-2 flex-1 min-w-0 ${isCompleted && chalWon ? 'opacity-100' : isCompleted ? 'opacity-60' : ''}`}>
                    <Avatar name={c.challenger.name} avatarUrl={c.challenger.avatar_url} size={8} />
                    <div className="min-w-0">
                      <p className={`text-sm font-extrabold truncate ${c.challenger.id === currentUserId ? 'text-accent-custom' : 'text-primary'}`}>
                        {c.challenger.name}{c.challenger.id === currentUserId && ' (você)'}
                      </p>
                      {c.challenger_home !== null && (
                        <p className="text-[11px] text-secondary font-bold">
                          Palpitou {c.challenger_home}x{c.challenger_away}
                          {c.challenger_match_points !== null && <> • {c.challenger_match_points} pts</>}
                        </p>
                      )}
                    </div>
                    {isCompleted && chalWon && <span className="ml-auto text-[10px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">Venceu</span>}
                    {isCompleted && chalLost && <span className="ml-auto text-[10px] font-black text-red-400 bg-red-500/10 border border-red-400/20 px-2 py-0.5 rounded-full shrink-0">Perdeu</span>}
                    {isCompleted && tie && <span className="ml-auto text-[10px] font-black text-secondary bg-muted border border-border-custom px-2 py-0.5 rounded-full shrink-0">Empate</span>}
                  </div>

                  {/* VS / pts transferidos */}
                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <div className="flex flex-col items-center">
                      <Sword size={14} weight="fill" className="text-accent-custom" />
                      {isCompleted && c.points_transferred > 0 && (
                        <span className="text-[9px] font-black text-accent-custom mt-0.5">±{c.points_transferred}pts</span>
                      )}
                    </div>
                  </div>

                  {/* Challenged */}
                  <div className={`flex items-center gap-2 flex-1 min-w-0 sm:flex-row-reverse ${isCompleted && chalLost ? 'opacity-100' : isCompleted ? 'opacity-60' : ''}`}>
                    <Avatar name={c.challenged.name} avatarUrl={c.challenged.avatar_url} size={8} />
                    <div className="min-w-0 sm:text-right">
                      <p className={`text-sm font-extrabold truncate ${c.challenged.id === currentUserId ? 'text-accent-custom' : 'text-primary'}`}>
                        {c.challenged.name}{c.challenged.id === currentUserId && ' (você)'}
                      </p>
                      {c.challenged_home !== null && (
                        <p className="text-[11px] text-secondary font-bold">
                          Palpitou {c.challenged_home}x{c.challenged_away}
                          {c.challenged_match_points !== null && <> • {c.challenged_match_points} pts</>}
                        </p>
                      )}
                    </div>
                    {isCompleted && chalLost && <span className="text-[10px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0 sm:ml-0 sm:mr-auto">Venceu</span>}
                    {isCompleted && chalWon && <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-400/20 px-2 py-0.5 rounded-full shrink-0 sm:ml-0 sm:mr-auto">Perdeu</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Todos os Palpites ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border-custom rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border-custom/60 bg-muted/40 flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-primary uppercase tracking-wider">
            Palpites ({predictions.length})
          </h2>
          {!matchStarted && (
            <span className="text-[10px] text-secondary font-bold italic">Visível após o início</span>
          )}
        </div>

        {predictions.length === 0 ? (
          <div className="px-5 py-8 text-center text-secondary text-sm">Nenhum palpite registrado.</div>
        ) : !matchStarted ? (
          /* Antes do jogo: esconde palpites individuais, mostra apenas contagem */
          <div className="px-5 py-8 text-center space-y-1">
            <p className="text-3xl font-black text-primary">{predictions.length}</p>
            <p className="text-xs text-secondary font-bold uppercase tracking-wider">participantes palpitaram</p>
            <p className="text-[11px] text-secondary/60 italic mt-2">Os palpites ficam visíveis após o início da partida.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-custom/30">
            {predictions.map(p => {
              const isMe = p.user_id === currentUserId;
              return (
                <div
                  key={p.user_id}
                  className={`px-4 py-3 flex items-center gap-3 ${isMe ? 'bg-accent-custom/5 border-l-4 border-l-accent-custom' : 'hover:bg-muted/20'} transition-colors`}
                >
                  <Link href={isMe ? '/perfil' : `/perfil/${p.user_id}`} className="shrink-0">
                    <Avatar name={p.name} avatarUrl={p.avatar_url} size={8} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={isMe ? '/perfil' : `/perfil/${p.user_id}`} className="hover:opacity-75 transition-opacity">
                      <span className={`text-sm font-extrabold truncate block ${isMe ? 'text-accent-custom' : 'text-primary'}`}>
                        {p.name}{isMe && ' (você)'}
                      </span>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                      {p.home_score} x {p.away_score}
                    </span>
                    <PointsBadge points={p.points} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Comentários ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border-custom rounded-2xl overflow-hidden shadow-sm">
        <MatchCommentsSection
          matchId={matchId}
          canComment={!hasResult}
          currentUserId={currentUserId}
        />
      </div>

      {/* ── Modal de Palpite ─────────────────────────────────────────────── */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => { if (!isPending) setModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full sm:max-w-md bg-card border border-border-custom rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl p-6 pb-safe animate-slideUp sm:animate-fadeIn"
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 sm:hidden" />
            <button
              onClick={() => setModalOpen(false)}
              disabled={isPending}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>

            <h3 className="text-lg font-black text-primary text-center mb-1">
              {userPrediction ? 'Editar Palpite' : 'Lançar Palpite'}
            </h3>
            <p className="text-[10px] text-secondary font-bold uppercase tracking-widest text-center mb-5">
              {match.stage}{match.group_name ? ` • ${match.group_name}` : ''}
            </p>

            {/* Times */}
            <div className="bg-muted/40 border border-border-custom/60 rounded-2xl p-4 mb-5">
              <div className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-5 flex justify-end">
                  <FlagTeam flag={match.home_flag} name={match.home_team} reverse={true} className="w-full justify-end text-sm" />
                </div>
                <div className="col-span-2 flex justify-center text-secondary font-black text-xs">vs</div>
                <div className="col-span-5 flex justify-start">
                  <FlagTeam flag={match.away_flag} name={match.away_team} reverse={false} className="w-full justify-start text-sm" />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-center gap-6">
                {[
                  { label: match.home_team, value: homeScore, set: setHomeScore },
                  { label: match.away_team, value: awayScore, set: setAwayScore },
                ].map(({ label, value, set }, i) => (
                  <React.Fragment key={i}>
                    {i === 1 && <span className="text-3xl font-black text-secondary/40 select-none">-</span>}
                    <div className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
                      <span className="text-[10px] font-black text-secondary uppercase tracking-wider truncate w-full text-center">{label}</span>
                      <input
                        type="number"
                        min="0"
                        value={value}
                        onChange={e => set(e.target.value)}
                        disabled={isPending}
                        placeholder="0"
                        required
                        className="w-20 h-20 text-center text-4xl font-black bg-base border-2 border-border-custom focus:border-accent-custom text-primary rounded-2xl focus:outline-none transition-colors disabled:opacity-40"
                      />
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {formError && (
                <p className="text-xs text-red-400 font-bold text-center bg-red-500/10 border border-red-400/20 rounded-xl py-2 px-3">{formError}</p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isPending}
                  className="flex-1 h-12 border border-border-custom hover:bg-muted text-secondary hover:text-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 h-12 flex items-center justify-center gap-1.5 bg-gradient-to-r from-accent-custom to-accent-hover text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-lg transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isPending ? <><Spinner className="animate-spin" size={14} weight="bold" /> Salvando…</> : 'Salvar Palpite'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
