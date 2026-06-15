'use client';

import React, { useState } from 'react';
import { changePassword } from '@/app/actions';
import { showToast } from './Toast';

export default function ChangePasswordForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { showToast('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
    if (password !== confirm) { showToast('As senhas não coincidem.', 'error'); return; }
    setIsPending(true);
    try {
      const res = await changePassword(password);
      if (res.success) {
        showToast('Senha alterada com sucesso!', 'success');
        setPassword('');
        setConfirm('');
        setIsOpen(false);
      } else {
        showToast(res.error || 'Erro ao alterar senha.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro inesperado.', 'error');
    } finally {
      setIsPending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-border-custom text-secondary hover:text-primary border border-border-custom rounded-xl text-[11px] font-bold transition-all cursor-pointer"
      >
        🔑 Trocar senha
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-1">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nova senha (mín. 6 caracteres)"
        maxLength={64}
        autoFocus
        required
        className="h-10 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors w-full max-w-xs"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirmar nova senha"
        maxLength={64}
        required
        onKeyDown={(e) => { if (e.key === 'Escape') { setIsOpen(false); setPassword(''); setConfirm(''); } }}
        className="h-10 px-3 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none font-medium transition-colors w-full max-w-xs"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-4 bg-accent-custom text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl disabled:opacity-40 cursor-pointer transition-all"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setPassword(''); setConfirm(''); }}
          className="h-9 px-4 bg-muted text-secondary text-xs font-bold rounded-xl border border-border-custom cursor-pointer transition-all hover:text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
