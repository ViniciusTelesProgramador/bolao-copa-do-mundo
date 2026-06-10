'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import FlagTeam from './FlagTeam';
import { Match } from '@/types';
import { saveMatchResult } from '@/app/actions';
import { Plus, Check, Spinner, Trash, Calendar } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

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
      alert('Preencha os dois placares antes de salvar!');
      return;
    }

    const homeVal = parseInt(scores.home, 10);
    const awayVal = parseInt(scores.away, 10);

    if (isNaN(homeVal) || isNaN(awayVal) || homeVal < 0 || awayVal < 0) {
      alert('Insira placares válidos maiores ou iguais a zero!');
      return;
    }

    setSavingMatchId(matchId);

    try {
      const result = await saveMatchResult(matchId, homeVal, awayVal);
      if (result.success) {
        // Limpa o estado local de edição daquele ID
        const updatedScores = { ...editedScores };
        delete updatedScores[matchId];
        setEditedScores(updatedScores);
        router.refresh();
      } else {
        alert(result.error || 'Erro ao salvar o resultado.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado.');
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
          match_time: new Date(matchTime).toISOString(),
          stage,
          group_name: groupName.trim() || null
        });

        if (res.success) {
          setFormSuccess(true);
          setHomeTeam('');
          setAwayTeam('');
          setHomeFlag('');
          setAwayFlag('');
          setMatchTime('');
          setGroupName('');
          router.refresh();
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
        alert(error.message);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
      {/* Formulário de Cadastro (Lado Esquerdo, 4 Colunas) */}
      <div className="lg:col-span-4 bg-[#1e293b] border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-extrabold text-white mb-5 uppercase tracking-wider flex items-center gap-2">
          <Plus size={16} weight="bold" className="text-[#22c55e]" />
          Nova Partida
        </h2>

        <form onSubmit={handleCreateMatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mandante</label>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none font-medium"
                placeholder="Brasil"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bandeira (Emoji)</label>
              <input
                type="text"
                value={homeFlag}
                onChange={(e) => setHomeFlag(e.target.value)}
                maxLength={4}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none text-center font-medium"
                placeholder="🇧🇷"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visitante</label>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none font-medium"
                placeholder="Argentina"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bandeira (Emoji)</label>
              <input
                type="text"
                value={awayFlag}
                onChange={(e) => setAwayFlag(e.target.value)}
                maxLength={4}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none text-center font-medium"
                placeholder="🇦🇷"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data & Horário</label>
            <input
              type="datetime-local"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Etapa</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full h-10 px-2 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none font-bold text-xs"
              >
                <option value="Fase de Grupos">Fase de Grupos</option>
                <option value="Oitavas de Final">Oitavas</option>
                <option value="Quartas de Final">Quartas</option>
                <option value="Semifinal">Semifinal</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grupo</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none font-medium"
                placeholder="Grupo A"
              />
            </div>
          </div>

          {formError && (
            <div className="bg-rose-950/20 border border-rose-900/40 text-rose-455 text-xs font-bold rounded-xl p-3 text-center">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-[#22c55e] text-xs font-bold rounded-xl p-3 text-center">
              Jogo cadastrado com sucesso!
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#22c55e] to-[#1ea34d] hover:from-[#1ea34d] hover:to-[#22c55e] text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-lg transition-all"
          >
            {isPending ? <Spinner size={15} className="animate-spin" /> : 'Cadastrar Jogo'}
          </button>
        </form>
      </div>

      {/* Lista de Partidas sem Resultado (Lado Direito, 8 Colunas) */}
      <div className="lg:col-span-8 space-y-5">
        <h2 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2 pb-2.5 border-b border-slate-800">
          <Calendar size={18} className="text-[#22c55e]" />
          Lançar Resultados
        </h2>

        {pendingMatches.length === 0 ? (
          <div className="bg-[#1e293b] border border-slate-800 rounded-2xl p-8 text-center text-slate-405 text-sm font-semibold">
            Todas as partidas cadastradas possuem resultados finais!
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
                  className="bg-[#1e293b] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-md transition-all duration-200"
                >
                  <div className="grid grid-cols-12 items-center gap-4 w-full text-sm">
                    {/* Info Jogo */}
                    <div className="col-span-12 md:col-span-3 text-center md:text-left space-y-1">
                      <span className="bg-slate-900 px-2.5 py-0.5 rounded-full text-[9px] text-slate-400 uppercase font-bold inline-block">
                        {match.stage} {match.group_name ? `• ${match.group_name}` : ''}
                      </span>
                      <div className="text-xs text-slate-500 font-extrabold block">
                        {new Date(match.match_time).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(match.match_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Edição de Placar Simétrico */}
                    <div className="col-span-12 md:col-span-6 flex items-center justify-between gap-3">
                      {/* Time Casa */}
                      <div className="flex-1 flex justify-end truncate">
                        <FlagTeam flag={match.home_flag} name={match.home_team} reverse={false} className="text-sm justify-end w-full" />
                      </div>
                      
                      {/* Inputs */}
                      <div className="flex items-center gap-1.5 shrink-0 mx-1">
                        <input
                          type="number"
                          min="0"
                          value={currentScore.home}
                          onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          className="w-11 h-11 text-center font-black bg-slate-950 border border-slate-800 focus:border-[#22c55e] rounded-xl text-white text-base focus:outline-none"
                          placeholder="-"
                        />
                        <span className="text-slate-600 font-black text-xs select-none">x</span>
                        <input
                          type="number"
                          min="0"
                          value={currentScore.away}
                          onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                          className="w-11 h-11 text-center font-black bg-slate-950 border border-slate-800 focus:border-[#22c55e] rounded-xl text-white text-base focus:outline-none"
                          placeholder="-"
                        />
                      </div>

                      {/* Time Fora */}
                      <div className="flex-1 flex justify-start truncate">
                        <FlagTeam flag={match.away_flag} name={match.away_team} reverse={true} className="text-sm justify-start w-full" />
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="col-span-12 md:col-span-3 flex items-center justify-center md:justify-end gap-2 border-t md:border-t-0 border-slate-800/60 pt-3.5 md:pt-0">
                      <button
                        onClick={() => handleSaveResult(match.id)}
                        disabled={isSaving}
                        className="px-3 py-2.5 bg-slate-900 hover:bg-[#22c55e] hover:text-slate-950 text-[#22c55e] text-xs font-extrabold uppercase tracking-wider rounded-xl border border-slate-800 hover:border-transparent transition-all flex items-center gap-1.5 shadow-md flex-grow md:flex-grow-0 justify-center"
                      >
                        {isSaving ? (
                          <Spinner className="animate-spin" size={14} />
                        ) : (
                          <Check size={14} weight="bold" />
                        )}
                        Salvar Resultado
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="p-2.5 bg-slate-900/60 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded-xl transition-all shrink-0"
                        title="Excluir Partida"
                      >
                        <Trash size={14} />
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
