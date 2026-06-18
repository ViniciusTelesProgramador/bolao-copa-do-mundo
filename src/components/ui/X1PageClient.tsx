'use client';

import { useState, useTransition } from 'react';
import { Sword, X, Plus, Clock, CheckCircle } from '@phosphor-icons/react';
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

interface X1PageClientProps {
  currentUserId: string;
  challenges: ChallengeWithDetails[];
  allProfiles: ChallengeProfile[];
  upcomingMatches: MatchBasic[];
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
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-black text-secondary uppercase tracking-wider truncate max-w-[60px] text-center">{label}</span>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={e => onChange(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
        className="w-14 h-12 text-center text-xl font-black bg-muted border border-border-custom rounded-xl text-primary focus:outline-none focus:border-accent-custom transition-colors"
      />
    </div>
  );
}

export default function X1PageClient({ currentUserId, challenges, allProfiles, upcomingMatches }: X1PageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [modalError, setModalError] = useState<string | null>(null);

  // New challenge modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [selectedMatch, setSelectedMatch] = useState('');
  const [newHome, setNewHome] = useState(1);
  const [newAway, setNewAway] = useState(0);
  const [opponentSearch, setOpponentSearch] = useState('');

  // Accept modal
  const [acceptingChallenge, setAcceptingChallenge] = useState<ChallengeWithDetails | null>(null);
  const [acceptHome, setAcceptHome] = useState(1);
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
    setNewHome(1); setNewAway(0);
    setOpponentSearch(''); setModalError(null);
    setShowNewModal(true);
  }

  function openAccept(c: ChallengeWithDetails) {
    setAcceptHome(1); setAcceptAway(0);
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

  const noActivity = !incoming.length && !outgoing.length && !active.length && !history.length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* ── Incoming pending ─────────────────────────────────── */}
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

      {/* ── Active ───────────────────────────────────────────── */}
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
                  {/* Header */}
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

                  {/* Predictions revealed once match starts */}
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

      {/* ── Outgoing pending ─────────────────────────────────── */}
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

      {/* ── History ──────────────────────────────────────────── */}
      {history.length > 0 && (
        <section>
          <h2 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-3">Histórico</h2>
          <div className="space-y-3">
            {history.map(c => {
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
                          {me.pts !== null && (
                            <span className={`text-[11px] font-black block ${me.pts === 3 ? 'text-green-500' : me.pts > 0 ? 'text-amber-500' : 'text-secondary/60'}`}>
                              {me.pts}pts
                            </span>
                          )}
                        </div>
                        <div className="bg-muted/50 rounded-xl p-2 text-center">
                          <span className="text-[9px] text-secondary font-bold uppercase block">Palpite de {opp.name.split(' ')[0]}</span>
                          <span className="text-sm font-black text-primary block mt-0.5">{them.home} x {them.away}</span>
                          {them.pts !== null && (
                            <span className={`text-[11px] font-black block ${them.pts === 3 ? 'text-green-500' : them.pts > 0 ? 'text-amber-500' : 'text-secondary/60'}`}>
                              {them.pts}pts
                            </span>
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
              {/* Opponent */}
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

              {/* Match */}
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

              {/* Prediction */}
              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-wider block mb-3">
                  Seu palpite <span className="text-secondary/50 font-bold normal-case tracking-normal">(lacrado — adversário não vê)</span>
                </label>
                <div className="flex items-center justify-center gap-5">
                  <ScoreInput
                    value={newHome}
                    onChange={setNewHome}
                    label={selectedMatchData?.home_team ?? 'Casa'}
                  />
                  <span className="font-black text-2xl text-secondary/60 mt-5">×</span>
                  <ScoreInput
                    value={newAway}
                    onChange={setNewAway}
                    label={selectedMatchData?.away_team ?? 'Fora'}
                  />
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
              {/* Challenger info */}
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

              {/* Prediction */}
              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-wider block mb-3">
                  Seu palpite <span className="text-secondary/50 font-bold normal-case tracking-normal">(o palpite de {acceptingChallenge.challenger.name.split(' ')[0]} só aparece depois do jogo)</span>
                </label>
                <div className="flex items-center justify-center gap-5">
                  <ScoreInput
                    value={acceptHome}
                    onChange={setAcceptHome}
                    label={acceptingChallenge.match.home_team}
                  />
                  <span className="font-black text-2xl text-secondary/60 mt-5">×</span>
                  <ScoreInput
                    value={acceptAway}
                    onChange={setAcceptAway}
                    label={acceptingChallenge.match.away_team}
                  />
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
