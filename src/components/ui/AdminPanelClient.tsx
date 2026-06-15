'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FlagTeam from './FlagTeam';
import { Match } from '@/types';
import { saveMatchResult, shiftAllMatchTimes } from '@/app/actions';
import { Plus, Check, Spinner, Trash, Calendar, Clock, Users, SoccerBall, Trophy, Key } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { showToast } from './Toast';
import { formatMatchDateTime, parseLocalDateToUTC } from '@/lib/date';
import { deleteUser, confirmArtilheiro, adminResetPassword } from '@/app/actions';
import { ArrowsClockwise } from '@phosphor-icons/react';

interface AdminUser {
  id: string;
  name: string;
  predictionCount: number;
  artilheiroGuess: string | null;
  artilheiroPoints: number;
}

interface AdminPanelClientProps {
  matches: Match[];
  users: AdminUser[];
  adminUserId: string;
}

export default function AdminPanelClient({ matches, users, adminUserId }: AdminPanelClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Estados do Formulário de Cadastro de Partida
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeFlag, setHomeFlag] = useState('');
  const [awayFlag, setAwayFlag] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [stage, setStage] = useState('Fase de Grupos');
  const [groupName, setGroupName] = useState('');

  // Estados locais para edição dos placares das partidas
  const [editedScores, setEditedScores] = useState<Record<string, { home: string; away: string }>>({});
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  // Estados de feedback do formulário
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  // Estados de fuso horário
  const [isShifting, setIsShifting] = useState(false);

  // Estado de sincronização de placares
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ updated: number; errors?: string[] } | null>(null);

  const handleSyncScores = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const { syncMatchScores } = await import('@/app/actions');
      const res = await syncMatchScores();
      if (res.success) {
        setSyncResult({ updated: res.updated ?? 0, errors: res.errors });
        showToast(res.message || `${res.updated} placar(es) atualizado(s).`, 'success');
        if ((res.updated ?? 0) > 0) router.refresh();
      } else {
        showToast(res.error || 'Erro ao sincronizar.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro inesperado.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Estado de deleção de usuário
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Estado de reset de senha
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Estado do artilheiro
  const [artilheiroInput, setArtilheiroInput] = useState('');
  const [isConfirmingArtilheiro, setIsConfirmingArtilheiro] = useState(false);
  const [artilheiroResult, setArtilheiroResult] = useState<{ winners: number; name: string } | null>(null);

  const handleConfirmArtilheiro = async () => {
    if (!artilheiroInput.trim()) { showToast('Digite o nome do artilheiro.', 'error'); return; }
    if (!confirm(`Confirmar "${artilheiroInput.trim()}" como artilheiro da Copa? Isso distribuirá 5 pts para quem acertou.`)) return;
    setIsConfirmingArtilheiro(true);
    try {
      const res = await confirmArtilheiro(artilheiroInput);
      if (res.success) {
        setArtilheiroResult({ winners: res.winners ?? 0, name: artilheiroInput.trim() });
        showToast(`Artilheiro confirmado! ${res.winners} participante(s) acertou.`, 'success');
        router.refresh();
      } else {
        showToast(res.error || 'Erro ao confirmar.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro inesperado.', 'error');
    } finally {
      setIsConfirmingArtilheiro(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetPasswordInput.trim()) { showToast('Digite a nova senha.', 'error'); return; }
    setIsResettingPassword(true);
    try {
      const res = await adminResetPassword(userId, resetPasswordInput.trim());
      if (res.success) {
        showToast('Senha redefinida com sucesso!', 'success');
        setResetPasswordUserId(null);
        setResetPasswordInput('');
      } else {
        showToast(res.error || 'Erro ao redefinir senha.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro inesperado.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Excluir "${user.name}"? Isso apagará também todos os ${user.predictionCount} palpites dele. Esta ação não pode ser desfeita.`)) return;
    setDeletingUserId(user.id);
    try {
      const res = await deleteUser(user.id);
      if (res.success) {
        showToast(`Usuário "${user.name}" excluído com sucesso.`, 'success');
        router.refresh();
      } else {
        showToast(res.error || 'Erro ao excluir usuário.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro inesperado.', 'error');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleShiftTimes = async () => {
    if (!confirm('Deseja realmente sincronizar o fuso horário de TODOS os jogos para o horário oficial de Brasília/Fortaleza (UTC-3)?')) {
      return;
    }
    
    setIsShifting(true);
    try {
      const res = await shiftAllMatchTimes();
      if (res.success) {
        showToast('Horários sincronizados com Brasília (UTC-3) com sucesso!', 'success');
        router.refresh();
      } else {
        showToast(res.error || 'Erro ao sincronizar horários.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro inesperado.', 'error');
    } finally {
      setIsShifting(false);
    }
  };

  // Filtra as partidas pendentes de resultado
  const pendingMatches = matches.filter((m) => m.home_score === null || m.away_score === null);

  const handleScoreChange = (matchId: string, side: 'home' | 'away', val: string) => {
    const current = editedScores[matchId] || { home: '', away: '' };
    setEditedScores({
      ...editedScores,
      [matchId]: {
        ...current,
        [side]: val
      }
    });
  };

  // Salvar resultado real de uma partida
  const handleSaveResult = async (matchId: string) => {
    const scores = editedScores[matchId];
    if (!scores || scores.home === '' || scores.away === '') {
      showToast('Preencha os dois placares antes de salvar!', 'error');
      return;
    }

    const homeVal = parseInt(scores.home, 10);
    const awayVal = parseInt(scores.away, 10);

    if (isNaN(homeVal) || isNaN(awayVal) || homeVal < 0 || awayVal < 0) {
      showToast('Insira placares válidos maiores ou iguais a zero!', 'error');
      return;
    }

    setSavingMatchId(matchId);

    try {
      const result = await saveMatchResult(matchId, homeVal, awayVal);
      if (result.success) {
        showToast('Placar da partida salvo com sucesso!', 'success');
        // Limpa o estado local de edição daquele ID
        const updatedScores = { ...editedScores };
        delete updatedScores[matchId];
        setEditedScores(updatedScores);
        router.refresh();
      } else {
        showToast(result.error || 'Erro ao salvar o resultado.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro inesperado.', 'error');
    } finally {
      setSavingMatchId(null);
    }
  };

  // Cadastrar nova partida
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!homeTeam || !awayTeam || !homeFlag || !awayFlag || !matchTime) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    startTransition(async () => {
      try {
        const { createMatch } = await import('@/app/actions');

        const res = await createMatch({
          home_team: homeTeam.trim(),
          away_team: awayTeam.trim(),
          home_flag: homeFlag.trim(),
          away_flag: awayFlag.trim(),
          match_time: parseLocalDateToUTC(matchTime),
          stage,
          group_name: groupName.trim() || null
        });

        if (res.success) {
          showToast('Partida cadastrada com sucesso!', 'success');
          setFormSuccess(true);
          setHomeTeam('');
          setAwayTeam('');
          setHomeFlag('');
          setAwayFlag('');
          setMatchTime('');
          setGroupName('');
          router.refresh();
          setTimeout(() => setFormSuccess(false), 2000);
        } else {
          setFormError(res.error || 'Erro ao cadastrar partida.');
        }
      } catch (err: any) {
        setFormError(err.message || 'Erro inesperado.');
      }
    });
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Deseja realmente remover esta partida? Isso apagará também todos os palpites.')) {
      return;
    }
    
    try {
      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Partida excluída com sucesso!', 'success');
        router.refresh();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const avatarColors = [
    'bg-red-500/10 text-red-500 border-red-500/20',
    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'bg-pink-500/10 text-pink-500 border-pink-500/20',
    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Coluna Esquerda (Formulário + Fuso Horário) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Formulário de Cadastro */}
        <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-xl transition-all duration-300">
        <h2 className="text-base font-extrabold text-primary mb-5 uppercase tracking-wider flex items-center gap-2 select-none">
          <Plus size={16} weight="bold" className="text-accent-custom" />
          Nova Partida
        </h2>

        <form onSubmit={handleCreateMatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Mandante</label>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full h-12 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors"
                placeholder="Brasil"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Bandeira (Emoji)</label>
              <input
                type="text"
                value={homeFlag}
                onChange={(e) => setHomeFlag(e.target.value)}
                maxLength={4}
                className="w-full h-12 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none text-center font-medium transition-colors"
                placeholder="🇧🇷"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Visitante</label>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full h-12 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors"
                placeholder="Argentina"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Bandeira (Emoji)</label>
              <input
                type="text"
                value={awayFlag}
                onChange={(e) => setAwayFlag(e.target.value)}
                maxLength={4}
                className="w-full h-12 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none text-center font-medium transition-colors"
                placeholder="🇦🇷"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Data & Horário</label>
            <input
              type="datetime-local"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              className="w-full h-12 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Etapa</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full h-12 px-2 bg-base border border-border-custom focus:border-accent-custom text-primary text-xs font-bold rounded-xl focus:outline-none transition-colors"
              >
                <option value="Fase de Grupos">Fase de Grupos</option>
                <option value="Oitavas de Final">Oitavas</option>
                <option value="Quartas de Final">Quartas</option>
                <option value="Semifinal">Semifinal</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Grupo</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full h-12 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors"
                placeholder="Grupo A"
              />
            </div>
          </div>

          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl p-3 text-center">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-accent-custom text-xs font-bold rounded-xl p-3 text-center">
              Jogo cadastrado com sucesso!
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 flex items-center justify-center gap-1.5 bg-gradient-to-r from-accent-custom to-accent-hover text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? <Spinner size={15} className="animate-spin" /> : 'Cadastrar Jogo'}
          </button>
        </form>
      </div>

      {/* Card de Configurações de Fuso Horário */}
      <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-xl transition-all duration-300">
        <h2 className="text-sm font-extrabold text-primary mb-3 uppercase tracking-wider flex items-center gap-2 select-none">
          <Clock size={16} className="text-amber-500" />
          Fuso Horário (Fortaleza/BRT)
        </h2>
        <p className="text-xs text-secondary mb-4 leading-relaxed font-medium">
          Caso os horários dos jogos estejam incorretos ou as partidas estejam sendo encerradas antes do horário oficial de Brasília, clique no botão abaixo para alinhar todos os jogos aos horários corretos de transmissão no Brasil.
        </p>
        <button
          onClick={handleShiftTimes}
          disabled={isShifting}
          className="w-full h-11 flex items-center justify-center gap-1.5 bg-muted hover:bg-amber-500/10 text-amber-500 hover:text-amber-600 border border-border-custom hover:border-amber-500/20 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isShifting ? <Spinner size={14} className="animate-spin" /> : 'Sincronizar com Brasília (UTC-3)'}
        </button>
      </div>
    </div>

      {/* Lista de Partidas sem Resultado (Lado Direito, 8 Colunas) */}
      <div className="lg:col-span-8 space-y-5">
        <div className="flex items-center justify-between pb-2.5 border-b border-border-custom">
          <h2 className="text-base font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
            <Calendar size={18} className="text-accent-custom" />
            Lançar Resultados
          </h2>
          <button
            onClick={handleSyncScores}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-custom/10 hover:bg-accent-custom/20 text-accent-custom border border-accent-custom/20 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            title="Sincronizar placares automaticamente via football-data.org"
          >
            <ArrowsClockwise size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Auto-Sync'}
          </button>
        </div>
        {syncResult && (
          <div className={`text-xs font-bold px-3 py-2 rounded-xl border ${syncResult.updated > 0 ? 'bg-accent-custom/5 border-accent-custom/20 text-accent-custom' : 'bg-muted border-border-custom text-secondary'}`}>
            {syncResult.updated > 0 ? `✓ ${syncResult.updated} placar(es) sincronizado(s) da Copa 2026.` : 'Nenhum novo resultado disponível.'}
            {syncResult.errors && syncResult.errors.length > 0 && (
              <span className="block text-amber-500 mt-1">Avisos: {syncResult.errors.join(' | ')}</span>
            )}
          </div>
        )}

        {pendingMatches.length === 0 ? (
          <div className="bg-card border border-border-custom rounded-2xl p-10 text-center text-secondary text-sm font-bold shadow-md">
            ⚽ Todas as partidas cadastradas possuem resultados finais!
          </div>
        ) : (
          <div className="space-y-4">
            {pendingMatches.map((match) => {
              const currentScore = editedScores[match.id] || {
                home: '',
                away: ''
              };

              const isSaving = savingMatchId === match.id;

              return (
                <div
                  key={match.id}
                  className="bg-card border border-border-custom hover:border-secondary rounded-2xl p-5 shadow-md transition-all duration-200"
                >
                  <div className="grid grid-cols-12 items-center gap-4 w-full text-sm">
                    {/* Info Jogo */}
                    <div className="col-span-12 md:col-span-3 text-center md:text-left space-y-1">
                      <span className="bg-muted border border-border-custom/50 px-2.5 py-0.5 rounded-full text-[9px] text-primary uppercase font-bold inline-block select-none">
                        {match.stage} {match.group_name ? `• ${match.group_name}` : ''}
                      </span>
                      <div className="text-[11px] text-secondary font-extrabold block">
                        {formatMatchDateTime(match.match_time)}
                      </div>
                    </div>

                    {/* Edição de Placar Simétrico */}
                    <div className="col-span-12 md:col-span-6 flex items-center justify-between gap-3">
                      {/* Time Casa */}
                      <div className="flex-1 flex justify-end truncate">
                        <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="text-xs sm:text-sm justify-end w-full" />
                      </div>
                      
                      {/* Inputs com tamanho de toque de 48px */}
                      <div className="flex items-center gap-1.5 shrink-0 mx-1">
                        <input
                          type="number"
                          min="0"
                          value={currentScore.home}
                          onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          className="w-12 h-12 text-center font-black bg-base border border-border-custom focus:border-accent-custom rounded-xl text-primary text-base focus:outline-none transition-colors select-all"
                          placeholder="-"
                          required
                        />
                        <span className="text-secondary/40 font-black text-xs select-none">x</span>
                        <input
                          type="number"
                          min="0"
                          value={currentScore.away}
                          onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                          className="w-12 h-12 text-center font-black bg-base border border-border-custom focus:border-accent-custom rounded-xl text-primary text-base focus:outline-none transition-colors select-all"
                          placeholder="-"
                          required
                        />
                      </div>

                      {/* Time Fora */}
                      <div className="flex-1 flex justify-start truncate">
                        <FlagTeam flag={match.away_flag} name={match.away_team} reverse={true} className="text-xs sm:text-sm justify-start w-full" />
                      </div>
                    </div>

                    {/* Ações (Alvos de Toque min 48px) */}
                    <div className="col-span-12 md:col-span-3 flex items-center justify-center md:justify-end gap-2 border-t md:border-t-0 border-border-custom/40 pt-3.5 md:pt-0">
                      <button
                        onClick={() => handleSaveResult(match.id)}
                        disabled={isSaving}
                        className="h-12 px-4 bg-muted hover:bg-accent-custom hover:text-slate-950 text-accent-custom text-xs font-extrabold uppercase tracking-wider rounded-xl border border-border-custom hover:border-transparent transition-all flex items-center gap-1.5 shadow-md flex-grow md:flex-grow-0 justify-center cursor-pointer"
                      >
                        {isSaving ? (
                          <Spinner className="animate-spin" size={14} />
                        ) : (
                          <Check size={14} weight="bold" />
                        )}
                        Salvar
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="w-12 h-12 flex items-center justify-center bg-muted hover:bg-rose-500/10 text-secondary hover:text-rose-500 rounded-xl border border-border-custom/80 hover:border-rose-500/20 transition-all shrink-0 cursor-pointer"
                        title="Excluir Partida"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* Seção Artilheiro */}
    <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-xl">
      <h2 className="text-base font-extrabold text-primary mb-1 uppercase tracking-wider flex items-center gap-2 select-none">
        <SoccerBall size={18} weight="fill" className="text-accent-custom" />
        Artilheiro da Copa
      </h2>
      <p className="text-xs text-secondary mb-5 font-medium">
        Veja os palpites de artilheiro dos participantes e confirme o vencedor ao final do torneio para distribuir os 5 pts extras.
      </p>

      {/* Resumo dos palpites */}
      {(() => {
        const guessCount: Record<string, number> = {};
        users.forEach((u) => {
          if (u.artilheiroGuess) {
            const key = u.artilheiroGuess.trim().toLowerCase();
            guessCount[key] = (guessCount[key] || 0) + 1;
          }
        });
        const sorted = Object.entries(guessCount).sort((a, b) => b[1] - a[1]);
        const noGuess = users.filter((u) => !u.artilheiroGuess).length;

        return (
          <div className="mb-5 space-y-2">
            <p className="text-[10px] font-black text-secondary uppercase tracking-wider mb-2">Palpites recebidos</p>
            {sorted.length === 0 ? (
              <p className="text-xs text-secondary italic">Nenhum palpite ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sorted.map(([name, count]) => {
                  const hasWon = users.some((u) => u.artilheiroGuess?.trim().toLowerCase() === name && u.artilheiroPoints > 0);
                  return (
                    <span key={name} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${hasWon ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-muted text-primary border-border-custom'}`}>
                      {hasWon && <Trophy size={11} weight="fill" className="text-amber-500" />}
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                      <span className="text-[10px] opacity-60">×{count}</span>
                    </span>
                  );
                })}
                {noGuess > 0 && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-muted/40 text-secondary border-border-custom/50 italic">
                    {noGuess} sem palpite
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Resultado confirmado */}
      {artilheiroResult && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-500">
          ✓ Artilheiro confirmado: <span className="capitalize">{artilheiroResult.name}</span> — {artilheiroResult.winners} acertou(aram) e recebeu(ram) +5 pts.
        </div>
      )}

      {/* Input para confirmar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={artilheiroInput}
          onChange={(e) => setArtilheiroInput(e.target.value)}
          placeholder="Nome do artilheiro real..."
          maxLength={60}
          className="flex-1 h-11 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors"
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmArtilheiro(); }}
        />
        <button
          onClick={handleConfirmArtilheiro}
          disabled={isConfirmingArtilheiro || !artilheiroInput.trim()}
          className="h-11 px-5 flex items-center gap-1.5 bg-accent-custom text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl disabled:opacity-40 cursor-pointer transition-all"
        >
          {isConfirmingArtilheiro ? <Spinner size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
          Confirmar
        </button>
      </div>
    </div>

    {/* Seção de Usuários Cadastrados */}
    <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-xl">
      <h2 className="text-base font-extrabold text-primary mb-1 uppercase tracking-wider flex items-center gap-2 select-none">
        <Users size={18} className="text-accent-custom" />
        Usuários Cadastrados
        <span className="text-xs font-bold text-secondary normal-case tracking-normal ml-1">({users.length})</span>
      </h2>
      <p className="text-xs text-secondary mb-5 font-medium">
        Exclua participantes indesejados. A exclusão remove o usuário e todos os palpites dele permanentemente.
      </p>

      {users.length === 0 ? (
        <div className="text-center py-8 text-secondary text-sm font-bold">
          Nenhum participante cadastrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u) => {
            const isAdmin = u.id === adminUserId;
            const colorIdx = u.name.charCodeAt(0) % avatarColors.length;
            const avatarClass = avatarColors[colorIdx];
            const isDeleting = deletingUserId === u.id;

            const isResettingThis = resetPasswordUserId === u.id;
            return (
              <div
                key={u.id}
                className={`rounded-xl border transition-all ${
                  isAdmin
                    ? 'border-accent-custom/30 bg-accent-custom/5'
                    : 'border-border-custom bg-muted/20 hover:border-secondary'
                }`}
              >
                <div className="flex items-center justify-between gap-3 p-3.5">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-black shrink-0 border select-none ${avatarClass}`}>
                      {u.name.substring(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-primary truncate">{u.name}</span>
                        {isAdmin && (
                          <span className="text-[9px] font-black text-accent-custom uppercase tracking-widest bg-accent-custom/10 px-1.5 py-0.5 rounded-md border border-accent-custom/20 shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-secondary font-bold block">
                        {u.predictionCount} {u.predictionCount === 1 ? 'palpite' : 'palpites'}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  {!isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setResetPasswordUserId(isResettingThis ? null : u.id);
                          setResetPasswordInput('');
                        }}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all shrink-0 cursor-pointer ${
                          isResettingThis
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-muted hover:bg-amber-500/10 text-secondary hover:text-amber-500 border-border-custom/80 hover:border-amber-500/20'
                        }`}
                        title={`Redefinir senha de ${u.name}`}
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        disabled={isDeleting}
                        className="w-9 h-9 flex items-center justify-center bg-muted hover:bg-rose-500/10 text-secondary hover:text-rose-500 rounded-xl border border-border-custom/80 hover:border-rose-500/20 transition-all shrink-0 cursor-pointer disabled:opacity-40"
                        title={`Excluir ${u.name}`}
                      >
                        {isDeleting ? <Spinner size={13} className="animate-spin" /> : <Trash size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Formulário de redefinição de senha */}
                {!isAdmin && isResettingThis && (
                  <div className="border-t border-amber-500/20 px-3.5 pb-3.5 pt-3 bg-amber-500/5 rounded-b-xl">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-2">Nova senha para {u.name}</p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={resetPasswordInput}
                        onChange={(e) => setResetPasswordInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword(u.id); if (e.key === 'Escape') { setResetPasswordUserId(null); setResetPasswordInput(''); } }}
                        placeholder="Mínimo 6 caracteres..."
                        maxLength={64}
                        autoFocus
                        className="flex-1 h-10 px-3 bg-base border border-border-custom focus:border-amber-500 text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors"
                      />
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        disabled={isResettingPassword || !resetPasswordInput.trim()}
                        className="h-10 px-4 flex items-center gap-1.5 bg-amber-500 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl disabled:opacity-40 cursor-pointer transition-all"
                      >
                        {isResettingPassword ? <Spinner size={13} className="animate-spin" /> : <Check size={13} weight="bold" />}
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    </div>
  );
}
