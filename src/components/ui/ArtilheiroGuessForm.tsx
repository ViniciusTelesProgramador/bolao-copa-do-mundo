'use client';

import { useState, useTransition, useEffect } from 'react';
import { saveArtilheiroGuess, searchArtilheiroPlayers } from '@/app/actions';
import type { PlayerSearchResult } from '@/lib/football-data';
import { SoccerBall, PencilSimple, Check, X, Spinner, Trophy, Lock, MagnifyingGlass } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import ArtilheiroCountdown from './ArtilheiroCountdown';

interface ArtilheiroGuessFormProps {
  currentGuess: string | null;
  artilheiroPoints: number;
  isLocked: boolean;
  deadlineLabel: string;
  deadline: string;
}

export default function ArtilheiroGuessForm({ currentGuess, artilheiroPoints, isLocked, deadlineLabel, deadline }: ArtilheiroGuessFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentGuess || '');
  const [confirmedName, setConfirmedName] = useState<string | null>(currentGuess);
  const [suggestions, setSuggestions] = useState<PlayerSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Busca jogadores reais (seleções da Copa 2026) com debounce
  useEffect(() => {
    if (!editing) return;
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed === confirmedName) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      const results = await searchArtilheiroPlayers(trimmed);
      setSuggestions(results);
      setShowSuggestions(true);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timeout);
  }, [value, editing, confirmedName]);

  const handleSelectSuggestion = (s: PlayerSearchResult) => {
    setValue(s.name);
    setConfirmedName(s.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  };

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) { setError('Digite o nome do jogador.'); return; }
    if (trimmed === currentGuess) { setEditing(false); return; }
    if (trimmed !== confirmedName) {
      setError('Selecione um jogador da lista de sugestões para confirmar.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveArtilheiroGuess(trimmed);
      if (result.success) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error || 'Erro ao salvar.');
      }
    });
  };

  const handleCancel = () => {
    setValue(currentGuess || '');
    setConfirmedName(currentGuess);
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setEditing(false);
  };

  return (
    <div className={`bg-card border rounded-2xl p-5 shadow-md mb-6 ${isLocked ? 'border-border-custom/40 opacity-80' : 'border-border-custom'}`}>
      <div className="flex items-center gap-2 mb-3">
        <SoccerBall size={16} weight="fill" className={isLocked ? 'text-secondary' : 'text-accent-custom'} />
        <h3 className="text-xs font-black text-primary uppercase tracking-wider">Artilheiro da Copa</h3>
        {artilheiroPoints > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
            <Trophy size={10} weight="fill" />
            +5 pts
          </span>
        )}
        {isLocked && (
          <span className="flex items-center gap-1 text-[10px] font-black text-secondary bg-muted border border-border-custom px-2 py-0.5 rounded-lg ml-auto">
            <Lock size={10} weight="fill" />
            Encerrado
          </span>
        )}
      </div>

      {!isLocked && !currentGuess && <ArtilheiroCountdown deadline={deadline} />}

      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            {currentGuess ? (
              <p className="text-sm font-bold text-primary">{currentGuess}</p>
            ) : (
              <p className="text-xs text-secondary italic">
                {isLocked ? 'Nenhum palpite foi feito antes do prazo.' : 'Nenhum palpite feito ainda.'}
              </p>
            )}
            <p className="text-[10px] text-secondary mt-0.5">
              {artilheiroPoints > 0
                ? '✓ Você acertou o artilheiro! +5 pts no total.'
                : isLocked
                  ? `Prazo encerrado em ${deadlineLabel}.`
                  : `Acerte o artilheiro e ganhe 5 pts extras. Prazo: ${deadlineLabel}.`}
            </p>
          </div>
          {!isLocked && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs text-secondary hover:text-accent-custom font-bold transition-colors cursor-pointer shrink-0"
            >
              <PencilSimple size={13} />
              {currentGuess ? 'Alterar' : 'Palpitar'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                disabled={isPending}
                maxLength={60}
                placeholder="Digite ao menos 3 letras: Mbappé, Vini Jr..."
                className="w-full h-10 px-3 text-sm font-bold bg-base border border-accent-custom rounded-xl focus:outline-none text-primary disabled:opacity-50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (showSuggestions && suggestions.length > 0) handleSelectSuggestion(suggestions[0]);
                    else handleSave();
                  }
                  if (e.key === 'Escape') {
                    if (showSuggestions) setShowSuggestions(false);
                    else handleCancel();
                  }
                }}
              />

              {/* Dropdown de sugestões */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border-custom rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {isSearching && (
                    <div className="p-3 text-xs text-secondary flex items-center gap-2">
                      <Spinner size={12} className="animate-spin" /> Buscando jogadores...
                    </div>
                  )}
                  {!isSearching && suggestions.length === 0 && (
                    <div className="p-3 text-xs text-secondary italic flex items-center gap-2">
                      <MagnifyingGlass size={12} />
                      Nenhum jogador encontrado nas seleções da Copa 2026.
                    </div>
                  )}
                  {!isSearching && suggestions.map((s) => (
                    <button
                      key={`${s.name}-${s.team}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent-custom/10 text-left transition-colors border-b border-border-custom/30 last:border-b-0 cursor-pointer"
                    >
                      {s.thumb ? (
                        <img src={s.thumb} alt={s.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-border-custom" />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-secondary shrink-0 border border-border-custom">
                          {s.name.charAt(0)}
                        </span>
                      )}
                      <span className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-primary truncate">{s.name}</span>
                        <span className="text-[10px] text-secondary truncate">
                          {s.nationality}{s.team ? ` • ${s.team}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isPending || !value.trim()}
              className="h-10 w-10 flex items-center justify-center bg-accent-custom text-slate-950 rounded-xl disabled:opacity-40 cursor-pointer shrink-0"
            >
              {isPending ? <Spinner size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="h-10 w-10 flex items-center justify-center bg-muted border border-border-custom text-secondary rounded-xl disabled:opacity-40 cursor-pointer shrink-0"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
          {!error && (
            <p className="text-[10px] text-secondary">
              Selecione um jogador da lista para confirmar o palpite.
            </p>
          )}
          {error && <p className="text-[11px] text-red-500 font-bold">{error}</p>}
        </div>
      )}
    </div>
  );
}
