'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FlagTeam from './FlagTeam';
import { Match } from '@/types';
import { saveMatchResult, shiftAllMatchTimes } from '@/app/actions';
import { Plus, Check, Spinner, Trash, Calendar, Clock } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { showToast } from './Toast';
import { formatMatchDateTime, parseLocalDateToUTC } from '@/lib/date';

interface AdminPanelClientProps {
  matches: Match[];
}

export default function AdminPanelClient({ matches }: AdminPanelClientProps) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
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
        <h2 className="text-base font-extrabold text-primary uppercase tracking-wider flex items-center gap-2 pb-2.5 border-b border-border-custom">
          <Calendar size={18} className="text-accent-custom" />
          Lançar Resultados
        </h2>

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
  );
}
