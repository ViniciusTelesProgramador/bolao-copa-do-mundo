'use client';

import { useState, useTransition } from 'react';
import { saveArtilheiroGuess } from '@/app/actions';
import { SoccerBall, PencilSimple, Check, X, Spinner, Trophy, Lock } from '@phosphor-icons/react';
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!value.trim()) { setError('Digite o nome do jogador.'); return; }
    if (value.trim() === currentGuess) { setEditing(false); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveArtilheiroGuess(value);
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
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isPending}
              maxLength={60}
              placeholder="Ex: Mbappé, Vini Jr, Haaland..."
              className="flex-1 h-10 px-3 text-sm font-bold bg-base border border-accent-custom rounded-xl focus:outline-none text-primary disabled:opacity-50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
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
          {error && <p className="text-[11px] text-red-500 font-bold">{error}</p>}
        </div>
      )}
    </div>
  );
}
