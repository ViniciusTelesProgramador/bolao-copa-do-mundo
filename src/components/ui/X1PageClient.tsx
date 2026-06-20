'use client';

import { useState, useTransition } from 'react';
import { Sword, X, Plus, Clock, CheckCircle, Fire, Info, CaretDown, CaretUp, LockKey, Trophy, ArrowsLeftRight } from '@phosphor-icons/react';
import { createChallenge, acceptChallenge, rejectOrCancelChallenge } from '@/app/actions';
import { formatMatchDateTime } from '@/lib/date';
import { getCountryCode } from '@/components/ui/FlagTeam';
import { ChallengeWithDetails, ChallengeProfile } from '@/types';

interface MatchBasic {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  match_time: string;
  stage: string;
}

interface X1Balance { total: number; committed: number; free: number; }

interface X1PageClientProps {
  currentUserId: string;
  challenges: ChallengeWithDetails[];
  allProfiles: ChallengeProfile[];
  upcomingMatches: MatchBasic[];
  arenaFeed: ChallengeWithDetails[];
  balance: X1Balance;
}

const COLORS = ['bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500'];
const avatarBg = (name: string) => COLORS[(name.charCodeAt(0) || 0) % COLORS.length];

function Avatar({ profile, size = 8 }: { profile: ChallengeProfile; size?: number }) {
  const dim = `w-${size} h-${size}`;
  return profile.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.name} className={`${dim} rounded-full object-cover border border-border-custom shrink-0`} />
  ) : (
    <span className={`${dim} rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 select-none ${avatarBg(profile.name)}`}>
      {profile.name.charAt(0).toUpperCase()}
    </span>
  );
}

function FlagImg({ flag, name }: { flag: string; name: string }) {
  const code = getCountryCode(flag, name);
  return code ? (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={name}
      className="w-5 h-3.5 object-cover rounded-[2px] border border-border-custom/30 shrink-0 inline-block"
    />
  ) : (
    <span className="text-sm leading-none inline-block">{flag}</span>
  );
}

function MatchLabel({ match }: { match: { home_team: string; away_team: string; home_flag: string; away_flag: string; match_time: string } }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-0.5">
      <FlagImg flag={match.home_flag} name={match.home_team} />
      <span className="text-[11px] text-secondary font-bold">{match.home_team}</span>
      <span className="text-[11px] text-secondary/50 font-bold">x</span>
      <FlagImg flag={match.away_flag} name={match.away_team} />
      <span className="text-[11px] text-secondary font-bold">{match.away_team}</span>
      <span className="text-[11px] text-secondary/40 font-bold mx-0.5">•</span>
      <span className="text-[11px] text-secondary/70 font-bold">{formatMatchDateTime(match.match_time)}</span>
    </div>
  );
}

function ScoreInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[9px] font-black text-secondary uppercase tracking-wider truncate max-w-[64px] text-center">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-full bg-muted border border-border-custom text-primary font-black text-xl flex items-center justify-center hover:border-accent-custom active:scale-90 transition-all cursor-pointer select-none"
        >
          −
        </button>
        <span className="w-10 text-center text-2xl font-black text-primary select-none tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-9 h-9 rounded-full bg-muted border border-border-custom text-primary font-black text-xl flex items-center justify-center hover:border-accent-custom active:scale-90 transition-all cursor-pointer select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Arena Feed (public) ────────────────────────────────────────────────────────

function ArenaCard({ c }: { c: ChallengeWithDetails }) {
  const matchLive = new Date(c.match.match_time) <= new Date();
  const isCompleted = c.status === 'completed';
  const showPredictions = matchLive || isCompleted;

  const challengerWon = isCompleted && c.result === 'challenger_won';
  const challengedWon = isCompleted && c.result === 'challenged_won';
  const isTie        = isCompleted && c.result === 'tie';

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden ${
      matchLive && !isCompleted ? 'border-green-500/40 shadow-sm shadow-green-500/10' :
      isCompleted              ? 'border-border-custom/40' :
                                 'border-border-custom/60'
    }`}>

      {/* ── Status strip ── */}
      <div className={`px-3 py-1.5 flex items-center justify-between gap-2 ${
        matchLive && !isCompleted ? 'bg-green-500/10' :
        isCompleted              ? 'bg-muted/60' :
                                   'bg-muted/30'
      }`}>
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <FlagImg flag={c.match.home_flag} name={c.match.home_team} />
          <span className="text-[10px] text-secondary font-bold truncate">{c.match.home_team}</span>
          <span className="text-[10px] text-secondary/40 mx-0.5">×</span>
          <FlagImg flag={c.match.away_flag} name={c.match.away_team} />
          <span className="text-[10px] text-secondary font-bold truncate">{c.match.away_team}</span>
        </div>
        <div className="shrink-0">
          {matchLive && !isCompleted ? (
            <span className="text-[9px] font-black text-green-500 animate-pulse">🔴 AO VIVO</span>
          ) : isCompleted ? (
            <span className="text-[9px] font-black text-secondary/60">Encerrado</span>
          ) : (
            <span className="text-[9px] font-bold text-secondary/50">{formatMatchDateTime(c.match.match_time)}</span>
          )}
        </div>
      </div>

      {/* ── Players row ── */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2">

          {/* Challenger */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar profile={c.challenger} size={9} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-primary truncate">{c.challenger.name.split(' ')[0]}</p>
              {showPredictions ? (
                <p className={`text-sm font-black leading-tight ${challengerWon ? 'text-green-500' : 'text-primary'}`}>
                  {c.challenger_home} × {c.challenger_away}
                  {isCompleted && c.challenger_match_points === 3 && <span className="text-[9px] font-black text-green-500 ml-1">✓</span>}
                </p>
              ) : (
                <p className="text-[10px] text-secondary/40 font-bold">🔒</p>
              )}
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center shrink-0 px-1">
            <Sword size={13} weight="fill" className="text-accent-custom" />
            <span className="text-[7px] font-black text-secondary/40 uppercase">X1</span>
          </div>

          {/* Challenged */}
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
            <Avatar profile={c.challenged} size={9} />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[11px] font-black text-primary truncate">{c.challenged.name.split(' ')[0]}</p>
              {showPredictions ? (
                <p className={`text-sm font-black leading-tight ${challengedWon ? 'text-green-500' : 'text-primary'}`}>
                  {isCompleted && c.challenged_match_points === 3 && <span className="text-[9px] font-black text-green-500 mr-1">✓</span>}
                  {c.challenged_home} × {c.challenged_away}
                </p>
              ) : (
                <p className="text-[10px] text-secondary/40 font-bold">🔒</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        {isCompleted && (
          <div className="mt-2.5 pt-2 border-t border-border-custom/30 flex items-center justify-center gap-2">
            {isTie ? (
              <span className="text-[10px] font-black text-secondary">🤝 Empate</span>
            ) : challengerWon ? (
              <span className="text-[10px] font-black text-green-500">✅ {c.challenger.name.split(' ')[0]} +{c.points_transferred} pts</span>
            ) : (
              <span className="text-[10px] font-black text-green-500">✅ {c.challenged.name.split(' ')[0]} +{c.points_transferred} pts</span>
            )}
            {c.match.home_score !== null && (
              <span className="text-[9px] text-secondary font-bold">· {c.match.home_score}×{c.match.away_score}</span>
            )}
          </div>
        )}
        {!showPredictions && (
          <p className="text-center text-[9px] text-secondary/40 font-bold mt-2">Palpites revelados ao vivo</p>
        )}
        {matchLive && !isCompleted && (
          <p className="text-center text-[9px] text-amber-500/80 font-bold mt-2">⏳ Jogo em andamento</p>
        )}
      </div>
    </div>
  );
}

function ArenaFeed({ feed }: { feed: ChallengeWithDetails[] }) {
  const now = new Date();

  const live      = feed.filter(c => c.status === 'accepted' && new Date(c.match.match_time) <= now)
                        .sort((a, b) => new Date(a.match.match_time).getTime() - new Date(b.match.match_time).getTime());
  const upcoming  = feed.filter(c => c.status === 'accepted' && new Date(c.match.match_time) > now)
                        .sort((a, b) => new Date(a.match.match_time).getTime() - new Date(b.match.match_time).getTime());
  const completed = feed.filter(c => c.status === 'completed')
                        .sort((a, b) => new Date(b.match.match_time).getTime() - new Date(a.match.match_time).getTime());

  const isEmpty = feed.length === 0;

  return (
    <div className="w-full lg:w-72 xl:w-80 shrink-0">
      <div className="lg:sticky lg:top-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Fire size={15} weight="fill" className="text-orange-500 shrink-0" />
          <h2 className="text-[11px] font-black text-primary uppercase tracking-widest">Arena Pública</h2>
          {live.length > 0 && (
            <span className="text-[9px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
              {live.length} ao vivo
            </span>
          )}
        </div>

        {isEmpty ? (
          <div className="bg-card border border-border-custom rounded-2xl p-6 text-center">
            <Sword size={28} className="mx-auto text-secondary/20 mb-2" weight="thin" />
            <p className="text-xs text-secondary font-bold">Nenhum desafio ativo ainda</p>
            <p className="text-[10px] text-secondary/50 mt-1">Os duelos aparecem aqui conforme os participantes se desafiam</p>
          </div>
        ) : (
          <div className="space-y-4 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-0.5">

            {live.length > 0 && (
              <section>
                <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Ao vivo
                </p>
                <div className="space-y-2.5">
                  {live.map(c => <ArenaCard key={c.id} c={c} />)}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <p className="text-[9px] font-black text-secondary/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="w-4 border-t border-dashed border-secondary/30 inline-block" />
                  Aguardando ({upcoming.length})
                </p>
                <div className="space-y-2.5">
                  {upcoming.map(c => <ArenaCard key={c.id} c={c} />)}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <p className="text-[9px] font-black text-secondary/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="w-4 border-t border-secondary/20 inline-block" />
                  Encerrados ({completed.length})
                </p>
                <div className="space-y-2.5">
                  {completed.map(c => <ArenaCard key={c.id} c={c} />)}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function X1PageClient({ currentUserId, challenges, allProfiles, upcomingMatches, arenaFeed, balance }: X1PageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [modalError, setModalError] = useState<string | null>(null);

  const [showRules, setShowRules] = useState(false);
  const [mobileTab, setMobileTab] = useState<'desafios' | 'arena'>('desafios');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'other'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [selectedMatch, setSelectedMatch] = useState('');
  const [newHome, setNewHome] = useState(0);
  const [newAway, setNewAway] = useState(0);
  const [opponentSearch, setOpponentSearch] = useState('');

  const [acceptingChallenge, setAcceptingChallenge] = useState<ChallengeWithDetails | null>(null);
  const [acceptHome, setAcceptHome] = useState(0);
  const [acceptAway, setAcceptAway] = useState(0);

  const incoming = challenges.filter(c => c.challenged_id === currentUserId && c.status === 'pending');
  const outgoing = challenges.filter(c => c.challenger_id === currentUserId && c.status === 'pending');
  const active = challenges.filter(c => c.status === 'accepted');
  const history = challenges.filter(c => ['completed', 'rejected', 'expired'].includes(c.status));

  const filteredProfiles = allProfiles.filter(p =>
    p.name.toLowerCase().includes(opponentSearch.toLowerCase())
  );

  const selectedMatchData = upcomingMatches.find(m => m.id === selectedMatch);

  function openNewModal() {
    setSelectedOpponent(''); setSelectedMatch('');
    setNewHome(0); setNewAway(0);
    setOpponentSearch(''); setModalError(null);
    setShowNewModal(true);
  }

  function openAccept(c: ChallengeWithDetails) {
    setAcceptHome(0); setAcceptAway(0);
    setModalError(null);
    setAcceptingChallenge(c);
  }

  function handleCreate() {
    if (!selectedOpponent) { setModalError('Selecione um adversário'); return; }
    if (!selectedMatch) { setModalError('Selecione um jogo'); return; }
    setModalError(null);
    startTransition(async () => {
      const res = await createChallenge(selectedOpponent, selectedMatch, newHome, newAway);
      if (res.error) setModalError(res.error);
      else setShowNewModal(false);
    });
  }

  function handleAccept() {
    if (!acceptingChallenge) return;
    setModalError(null);
    startTransition(async () => {
      const res = await acceptChallenge(acceptingChallenge.id, acceptHome, acceptAway);
      if (res.error) setModalError(res.error);
      else setAcceptingChallenge(null);
    });
  }

  function handleRejectCancel(id: string) {
    startTransition(async () => { await rejectOrCancelChallenge(id); });
  }

  function getOpponent(c: ChallengeWithDetails) {
    return c.challenger_id === currentUserId ? c.challenged : c.challenger;
  }

  function myResult(c: ChallengeWithDetails): 'won' | 'lost' | 'tie' | null {
    if (!c.result) return null;
    if (c.result === 'tie') return 'tie';
    const iAm = c.challenger_id === currentUserId ? 'challenger' : 'challenged';
    return c.result === `${iAm}_won` ? 'won' : 'lost';
  }

  function myPred(c: ChallengeWithDetails) {
    return c.challenger_id === currentUserId
      ? { home: c.challenger_home, away: c.challenger_away, pts: c.challenger_match_points }
      : { home: c.challenged_home, away: c.challenged_away, pts: c.challenged_match_points };
  }

  function oppPred(c: ChallengeWithDetails) {
    return c.challenger_id === currentUserId
      ? { home: c.challenged_home, away: c.challenged_away, pts: c.challenged_match_points }
      : { home: c.challenger_home, away: c.challenger_away, pts: c.challenger_match_points };
  }

  const filteredHistory = history.filter(c => {
    if (historyFilter === 'completed') return c.status === 'completed';
    if (historyFilter === 'other') return c.status !== 'completed';
    return true;
  });

  const arenaLiveCount = arenaFeed.filter(c => new Date(c.match.match_time) <= new Date() && c.status === 'accepted').length;

  const noActivity = !incoming.length && !outgoing.length && !active.length && !history.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)]">

      {/* ── Mobile tab bar (hidden on lg+) ─── */}
      <div className="flex lg:hidden mb-4 bg-card border border-border-custom rounded-xl p-1 gap-1">
        <button
          onClick={() => setMobileTab('desafios')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${mobileTab === 'desafios' ? 'bg-accent-custom text-slate-950' : 'text-secondary hover:text-primary'}`}
        >
          ⚔️ Meus Desafios
        </button>
        <button
          onClick={() => setMobileTab('arena')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${mobileTab === 'arena' ? 'bg-accent-custom text-slate-950' : 'text-secondary hover:text-primary'}`}
        >
          🔥 Arena
          {arenaLiveCount > 0 && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${mobileTab === 'arena' ? 'bg-slate-950/20 text-slate-950' : 'bg-green-500/20 text-green-500'}`}>
              {arenaLiveCount} ao vivo
            </span>
          )}
        </button>
      </div>

      {/* ── Two-column layout ─── */}
      <div className="flex flex-col lg:flex-row gap-8 lg:items-start">

        {/* ── LEFT: User challenges ──────────────────────────── */}
        <div className={`flex-1 min-w-0 ${mobileTab === 'arena' ? 'hidden lg:block' : ''}`}>

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-wider flex items-center gap-2.5">
                <Sword size={26} weight="fill" className="text-accent-custom" />
                X1 — Desafios
              </h1>
              <p className="text-xs text-secondary font-bold mt-1">Desafie alguém e roube 4 pontos no cara a cara</p>
            </div>
            <button
              onClick={openNewModal}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-accent-custom text-slate-950 font-black text-sm rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Plus size={15} weight="bold" />
              Novo Desafio
            </button>
          </div>

          {/* ── Balance panel ── */}
          <div className="mb-6 bg-card border border-border-custom rounded-2xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Seu saldo X1</span>
              <a href="/extrato" className="text-[9px] font-black text-accent-custom hover:underline">Ver extrato completo →</a>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/40 border border-border-custom/40 rounded-xl py-2 px-1">
                <p className="text-[9px] font-bold text-secondary uppercase tracking-wide mb-0.5">Total</p>
                <p className="text-lg font-black text-primary">{balance.total}</p>
                <p className="text-[8px] text-secondary font-bold">pts</p>
              </div>
              <div className={`rounded-xl py-2 px-1 border ${balance.committed > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-muted/40 border-border-custom/40'}`}>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-wide mb-0.5">🔒 Apostados</p>
                <p className={`text-lg font-black ${balance.committed > 0 ? 'text-amber-500' : 'text-primary'}`}>{balance.committed}</p>
                <p className="text-[8px] text-secondary font-bold">pts</p>
              </div>
              <div className={`rounded-xl py-2 px-1 border ${balance.free >= 4 ? 'bg-green-500/5 border-green-500/20' : balance.free > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-wide mb-0.5">⚡ Livres</p>
                <p className={`text-lg font-black ${balance.free >= 4 ? 'text-green-500' : balance.free > 0 ? 'text-amber-500' : 'text-red-400'}`}>{Math.max(0, balance.free)}</p>
                <p className="text-[8px] text-secondary font-bold">pts</p>
              </div>
            </div>
            {balance.free < 4 && balance.total > 0 && (
              <p className="text-center text-[9px] text-amber-500 font-bold mt-2.5">⚠️ Precisa de 4 pts livres para criar ou aceitar um X1</p>
            )}
            {balance.total === 0 && (
              <p className="text-center text-[9px] text-secondary/60 font-bold mt-2.5">Faça palpites nos jogos para acumular pontos e poder desafiar</p>
            )}
          </div>

          {/* Rules card */}
          <div className="mb-6 bg-card border border-border-custom rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowRules(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info size={15} weight="fill" className="text-accent-custom shrink-0" />
                <span className="text-xs font-black text-primary uppercase tracking-wider">Como funciona o X1?</span>
              </div>
              {showRules ? <CaretUp size={13} className="text-secondary" /> : <CaretDown size={13} className="text-secondary" />}
            </button>

            {showRules && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border-custom/50">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-accent-custom/10 border border-accent-custom/20 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowsLeftRight size={15} weight="bold" className="text-accent-custom" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary">Desafio cara a cara</p>
                    <p className="text-[11px] text-secondary font-medium leading-relaxed mt-0.5">
                      Você escolhe um adversário e um jogo ainda não iniciado. Cada um palpita em separado — o palpite fica lacrado e o outro não vê até o jogo começar.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Trophy size={15} weight="fill" className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary">Só ganha quem acertar o placar exato</p>
                    <p className="text-[11px] text-secondary font-medium leading-relaxed mt-0.5">
                      Se você acertar o placar exato e o adversário não acertar, você <span className="text-green-500 font-black">rouba 4 pontos</span> do bolão dele. Se os dois acertarem ou os dois errarem, fica em empate — sem transferência.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <LockKey size={15} weight="fill" className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary">Máximo de 2 desafios simultâneos</p>
                    <p className="text-[11px] text-secondary font-medium leading-relaxed mt-0.5">
                      Você pode ter no máximo <span className="text-amber-500 font-black">2 desafios ativos</span> ao mesmo tempo (entre enviados e aceitos). Aguarde um encerrar para lançar um novo.
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 border border-border-custom/50 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-secondary font-bold text-center">
                    ⚠️ Os pontos do X1 são <span className="text-primary">separados</span> dos pontos normais do bolão — acertar o palpite no jogo garante pontos independente do resultado do X1.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {noActivity && (
            <div className="text-center py-24 space-y-3">
              <Sword size={52} className="mx-auto text-secondary/20" weight="thin" />
              <p className="text-secondary font-bold">Nenhum desafio ainda.</p>
              <p className="text-secondary/50 text-xs max-w-xs mx-auto">
                Lance um desafio, acerte o placar e roube 4 pontos do adversário!
              </p>
              <button
                onClick={openNewModal}
                className="mt-2 px-6 py-3 bg-accent-custom text-slate-950 font-black text-sm rounded-xl hover:opacity-90 transition-all cursor-pointer"
              >
                Lançar Primeiro Desafio ⚔️
              </button>
            </div>
          )}

          {/* Incoming pending */}
          {incoming.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse inline-block" />
                Aguardando sua resposta ({incoming.length})
              </h2>
              <div className="space-y-3">
                {incoming.map(c => (
                  <div key={c.id} className="bg-card border border-orange-500/40 rounded-2xl p-4 shadow-lg shadow-orange-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar profile={c.challenger} size={10} />
                      <div className="min-w-0">
                        <p className="font-black text-sm text-primary">
                          {c.challenger.name} <span className="text-orange-500">te desafia!</span>
                        </p>
                        <MatchLabel match={c.match} />
                      </div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3">
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                        ⚔️ Em jogo: <strong>4 pontos</strong> — quem palpitar melhor rouba do outro
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectCancel(c.id)}
                        disabled={isPending}
                        className="flex-1 py-2 text-xs font-bold text-secondary bg-muted border border-border-custom rounded-xl hover:text-red-400 hover:border-red-400/30 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => openAccept(c)}
                        disabled={isPending}
                        className="flex-[2] py-2 text-sm font-black text-white bg-green-600 hover:bg-green-500 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        ⚔️ Aceitar e Palpitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active */}
          {active.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                Em andamento ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map(c => {
                  const opp = getOpponent(c);
                  const me = myPred(c);
                  const them = oppPred(c);
                  const matchLive = new Date(c.match.match_time) <= new Date();

                  return (
                    <div key={c.id} className="bg-card border border-green-500/20 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1 shrink-0">
                          <Avatar profile={c.challenger_id === currentUserId ? c.challenger : c.challenged} size={8} />
                          <span className="text-[10px] font-black text-secondary/60 px-1">VS</span>
                          <Avatar profile={opp} size={8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm text-primary">Você vs {opp.name}</p>
                          <MatchLabel match={c.match} />
                        </div>
                        {matchLive ? (
                          <span className="text-[10px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg shrink-0 animate-pulse">🔴 Ao vivo</span>
                        ) : (
                          <span className="text-[10px] font-black text-secondary bg-muted px-2 py-1 rounded-lg shrink-0">🔒 Lacrado</span>
                        )}
                      </div>

                      {matchLive && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border-custom/40">
                          <div className="bg-accent-custom/5 border border-accent-custom/20 rounded-xl p-2.5 text-center">
                            <span className="text-[9px] font-black text-secondary uppercase block">Seu palpite</span>
                            <span className="text-lg font-black text-accent-custom mt-0.5 block">{me.home} x {me.away}</span>
                          </div>
                          <div className="bg-muted/50 border border-border-custom rounded-xl p-2.5 text-center">
                            <span className="text-[9px] font-black text-secondary uppercase block">Palpite de {opp.name.split(' ')[0]}</span>
                            <span className="text-lg font-black text-primary mt-0.5 block">{them.home} x {them.away}</span>
                          </div>
                          <p className="col-span-2 text-center text-[10px] text-secondary font-bold">⏳ Aguardando resultado para calcular o vencedor</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Outgoing pending */}
          {outgoing.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock size={11} />
                Seus desafios enviados ({outgoing.length})
              </h2>
              <div className="space-y-3">
                {outgoing.map(c => (
                  <div key={c.id} className="bg-card border border-border-custom rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <Avatar profile={c.challenged} size={8} />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm text-primary">Você desafiou {c.challenged.name}</p>
                        <MatchLabel match={c.match} />
                      </div>
                      <button
                        onClick={() => handleRejectCancel(c.id)}
                        disabled={isPending}
                        className="text-[11px] font-bold text-secondary hover:text-red-400 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* History */}
          {history.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-black text-secondary uppercase tracking-widest">Histórico</h2>
                <div className="flex items-center gap-1 bg-muted border border-border-custom rounded-lg p-0.5">
                  {(['all', 'completed', 'other'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-2 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer ${historyFilter === f ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                    >
                      {f === 'all' ? 'Todos' : f === 'completed' ? '✅ Concluídos' : '💨 Outros'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {filteredHistory.length === 0 && (
                  <p className="text-center text-xs text-secondary py-4">Nenhum desafio nessa categoria.</p>
                )}
                {filteredHistory.map(c => {
                  const res = myResult(c);
                  const opp = getOpponent(c);
                  const me = myPred(c);
                  const them = oppPred(c);

                  let cardCls = 'border-border-custom bg-card';
                  let badge = '';
                  let badgeCls = 'text-secondary';

                  if (c.status === 'completed') {
                    if (res === 'won') {
                      cardCls = 'border-green-500/30 bg-green-500/5';
                      badge = `✅ Você ganhou! +${c.points_transferred} pts`;
                      badgeCls = 'text-green-500';
                    } else if (res === 'lost') {
                      cardCls = 'border-red-500/20 bg-red-500/5';
                      badge = `❌ Você perdeu -${c.points_transferred} pts`;
                      badgeCls = 'text-red-400';
                    } else {
                      badge = '🤝 Empate — sem transferência';
                      badgeCls = 'text-secondary';
                    }
                  } else if (c.status === 'rejected') {
                    badge = c.challenger_id === currentUserId ? '💨 Desafio recusado' : '💨 Você recusou';
                  } else if (c.status === 'expired') {
                    badge = '⏰ Expirou sem resposta';
                  }

                  return (
                    <div key={c.id} className={`border rounded-2xl p-4 ${cardCls}`}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar profile={opp} size={7} />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-primary">vs {opp.name}</p>
                            <MatchLabel match={c.match} />
                          </div>
                        </div>
                        <span className={`text-[11px] font-black shrink-0 text-right ${badgeCls}`}>{badge}</span>
                      </div>

                      {c.status === 'completed' && (
                        <div className="mt-3 pt-3 border-t border-border-custom/40 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-muted/50 rounded-xl p-2 text-center">
                              <span className="text-[9px] text-secondary font-bold uppercase block">Seu palpite</span>
                              <span className="text-sm font-black text-primary block mt-0.5">{me.home} x {me.away}</span>
                              {me.pts === 3 && (
                                <span className="text-[11px] font-black block text-green-500">✓ Exato!</span>
                              )}
                            </div>
                            <div className="bg-muted/50 rounded-xl p-2 text-center">
                              <span className="text-[9px] text-secondary font-bold uppercase block">Palpite de {opp.name.split(' ')[0]}</span>
                              <span className="text-sm font-black text-primary block mt-0.5">{them.home} x {them.away}</span>
                              {them.pts === 3 && (
                                <span className="text-[11px] font-black block text-green-500">✓ Exato!</span>
                              )}
                            </div>
                          </div>
                          {c.match.home_score !== null && (
                            <p className="text-center text-[11px] text-secondary font-bold">
                              Resultado real: <span className="text-primary font-black">{c.match.home_score} x {c.match.away_score}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── RIGHT: Arena pública ───────────────────────────── */}
        <div className={`w-full lg:w-auto ${mobileTab === 'desafios' ? 'hidden lg:block' : ''}`}>
          <ArenaFeed feed={arenaFeed} />
        </div>

      </div>

      {/* ── MODAL: Novo Desafio ──────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border-custom rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-custom sticky top-0 bg-card z-10">
              <h3 className="font-black text-primary flex items-center gap-2">
                <Sword size={17} className="text-accent-custom" />
                Novo Desafio
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-secondary hover:text-primary cursor-pointer p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-wider block mb-2">
                  Adversário
                </label>
                <input
                  type="text"
                  placeholder="Buscar participante..."
                  value={opponentSearch}
                  onChange={e => setOpponentSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border-custom rounded-xl text-sm text-primary placeholder:text-secondary/40 focus:outline-none focus:border-accent-custom mb-2"
                />
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {filteredProfiles.length === 0 && (
                    <p className="text-secondary text-xs italic px-2">Nenhum participante encontrado.</p>
                  )}
                  {filteredProfiles.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedOpponent(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer text-left border ${
                        selectedOpponent === p.id
                          ? 'bg-accent-custom/10 border-accent-custom/40 text-accent-custom'
                          : 'bg-muted/40 border-transparent hover:border-border-custom text-primary'
                      }`}
                    >
                      <Avatar profile={p} size={7} />
                      <span className="text-sm font-bold flex-1">{p.name}</span>
                      {selectedOpponent === p.id && <CheckCircle size={16} weight="fill" className="text-accent-custom shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-wider block mb-2">
                  Jogo
                </label>
                {upcomingMatches.length === 0 ? (
                  <p className="text-secondary text-sm italic">Nenhum jogo disponível no momento.</p>
                ) : (
                  <select
                    value={selectedMatch}
                    onChange={e => setSelectedMatch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted border border-border-custom rounded-xl text-sm text-primary focus:outline-none focus:border-accent-custom cursor-pointer"
                  >
                    <option value="">Selecione um jogo...</option>
                    {upcomingMatches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.home_team} x {m.away_team} — {formatMatchDateTime(m.match_time)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-wider block mb-3">
                  Seu palpite <span className="text-secondary/50 font-bold normal-case tracking-normal">(lacrado — adversário não vê)</span>
                </label>
                <div className="flex items-center justify-center gap-5">
                  <ScoreInput value={newHome} onChange={setNewHome} label={selectedMatchData?.home_team ?? 'Casa'} />
                  <span className="font-black text-2xl text-secondary/60 mt-5">×</span>
                  <ScoreInput value={newAway} onChange={setNewAway} label={selectedMatchData?.away_team ?? 'Fora'} />
                </div>
              </div>

              {modalError && (
                <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
                  {modalError}
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={isPending || !selectedOpponent || !selectedMatch}
                className="w-full py-3 bg-accent-custom text-slate-950 font-black rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                {isPending ? 'Enviando...' : '⚔️ Lançar Desafio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Aceitar Desafio ───────────────────────────── */}
      {acceptingChallenge && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border-custom rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-custom">
              <h3 className="font-black text-primary">Aceitar Desafio</h3>
              <button onClick={() => setAcceptingChallenge(null)} className="text-secondary hover:text-primary cursor-pointer p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                <Avatar profile={acceptingChallenge.challenger} size={10} />
                <div>
                  <p className="font-black text-sm text-primary">{acceptingChallenge.challenger.name} te desafia</p>
                  <p className="text-xs text-secondary font-bold mt-0.5">
                    {acceptingChallenge.match.home_team} x {acceptingChallenge.match.away_team}
                  </p>
                  <p className="text-[11px] text-secondary/60">{formatMatchDateTime(acceptingChallenge.match.match_time)}</p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  ⚔️ Em jogo: <strong>4 pontos</strong> — quem palpitar melhor rouba do outro
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-wider block mb-3">
                  Seu palpite <span className="text-secondary/50 font-bold normal-case tracking-normal">(o palpite de {acceptingChallenge.challenger.name.split(' ')[0]} só aparece depois do jogo)</span>
                </label>
                <div className="flex items-center justify-center gap-5">
                  <ScoreInput value={acceptHome} onChange={setAcceptHome} label={acceptingChallenge.match.home_team} />
                  <span className="font-black text-2xl text-secondary/60 mt-5">×</span>
                  <ScoreInput value={acceptAway} onChange={setAcceptAway} label={acceptingChallenge.match.away_team} />
                </div>
              </div>

              {modalError && (
                <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">
                  {modalError}
                </p>
              )}

              <button
                onClick={handleAccept}
                disabled={isPending}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                {isPending ? 'Aceitando...' : '✅ Confirmar e Aceitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
