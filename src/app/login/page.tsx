'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EnvelopeSimple, Spinner, CheckSquare } from '@phosphor-icons/react';
import { useSearchParams } from 'next/navigation';

// Componente interno que consome os parâmetros de busca
function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [isTransitionPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    errorParam === 'invalid_token'
      ? { type: 'error', text: 'O link de acesso expirou ou é inválido. Solicite um novo link.' }
      : null
  );

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatusMessage(null);

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=/palpites`,
            data: {
              name: email.split('@')[0], // Nome inicial baseado no email
            },
          },
        });

        if (error) {
          setStatusMessage({ type: 'error', text: error.message || 'Erro ao enviar link mágico.' });
        } else {
          setStatusMessage({
            type: 'success',
            text: 'Verifique seu email — enviamos um link de acesso',
          });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Erro inesperado.' });
      }
    });
  };

  return (
    <div className="w-full max-w-md bg-[#1e293b] border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Efeito visual decorativo de gradiente */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#22c55e]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase tracking-wider">
          Acessar Bolão
        </h1>
        <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
          Digite seu e-mail para receber o acesso instantâneo
        </p>
      </div>

      {statusMessage?.type === 'success' ? (
        <div className="text-center py-6 space-y-4 animate-fadeIn">
          <div className="flex justify-center text-[#22c55e]">
            <CheckSquare size={52} weight="fill" className="animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Verifique seu e-mail</h3>
          <p className="text-sm text-slate-355 leading-relaxed font-semibold">
            {statusMessage.text}
          </p>
          <button
            onClick={() => setStatusMessage(null)}
            className="mt-4 text-xs font-bold text-[#22c55e] hover:underline transition-all uppercase tracking-wider"
          >
            Voltar
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Input E-mail */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Endereço de E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <EnvelopeSimple size={18} />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isTransitionPending}
                className="w-full h-12 pl-10 pr-4 bg-slate-950 border border-slate-800 focus:border-[#22c55e] text-slate-100 text-sm rounded-xl focus:outline-none transition-colors disabled:opacity-50 font-medium"
                placeholder="nome@exemplo.com"
                required
              />
            </div>
          </div>

          {statusMessage?.type === 'error' && (
            <div className="bg-rose-950/20 border border-rose-900/40 text-rose-455 text-xs font-bold rounded-xl p-3.5 text-center">
              {statusMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isTransitionPending || !email}
            className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-[#22c55e] to-[#1ea34d] hover:from-[#1ea34d] hover:to-[#22c55e] text-slate-950 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isTransitionPending ? (
              <>
                <Spinner className="animate-spin" size={18} weight="bold" />
                Enviando...
              </>
            ) : (
              'Entrar com Magic Link'
            )}
          </button>
        </form>
      )}
    </div>
  );
}

// Wrapper que envolve o formulário em um bloco de Suspense
export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-[#0f172a] text-slate-100">
      <Suspense fallback={
        <div className="w-full max-w-md bg-[#1e293b] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 font-bold">
          Carregando formulário...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
