'use client';

import { useState, useTransition } from 'react';
import { updateNickname } from '@/app/actions';
import { PencilSimple, Check, X, Spinner } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface EditNicknameFormProps {
  currentName: string;
}

export default function EditNicknameForm({ currentName }: EditNicknameFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (value.trim() === currentName) { setEditing(false); return; }
    setError(null);
    startTransition(async () => {
      const result = await updateNickname(value);
      if (result.success) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error || 'Erro ao atualizar apelido.');
      }
    });
  };

  const handleCancel = () => {
    setValue(currentName);
    setError(null);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-xs text-secondary hover:text-accent-custom font-bold transition-colors cursor-pointer mt-1"
      >
        <PencilSimple size={13} />
        Trocar apelido
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          maxLength={30}
          className="h-9 px-3 text-sm font-bold bg-base border border-accent-custom rounded-xl focus:outline-none text-primary disabled:opacity-50 w-44"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button
          onClick={handleSave}
          disabled={isPending || !value.trim()}
          className="h-9 w-9 flex items-center justify-center bg-accent-custom text-slate-950 rounded-xl disabled:opacity-40 cursor-pointer"
        >
          {isPending ? <Spinner size={14} className="animate-spin" /> : <Check size={14} weight="bold" />}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="h-9 w-9 flex items-center justify-center bg-muted border border-border-custom text-secondary rounded-xl disabled:opacity-40 cursor-pointer"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500 font-bold">{error}</p>}
    </div>
  );
}
