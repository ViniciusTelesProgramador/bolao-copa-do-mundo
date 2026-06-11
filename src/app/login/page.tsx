'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EnvelopeSimple, Lock, Spinner, CheckSquare } from '@phosphor-icons/react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'magic-link' | 'password'>('magic-link');
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
        if (loginMode === 'magic-link') {
          // Envia o Magic Link (OTP por E-mail)
          const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm?next=/palpites`,
              data: {
                name: email.split('@')[0],
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
        } else {
          // Login direto com e-mail e senha (ignora SMTP e rate limit de e-mails!)
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (error) {
            setStatusMessage({ type: 'error', text: error.message || 'E-mail ou senha incorretos.' });
          } else {
            router.push('/palpites');
            router.refresh();
          }
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Erro inesperado.' });
      }
    });
  };

  return (
    <div className="w-full max-w-md bg-card border border-border-custom rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Efeito visual decorativo de gradiente */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent-custom/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary uppercase tracking-wider">
          Acessar Bolão
        </h1>
        <p className="text-xs text-secondary mt-2 font-bold uppercase tracking-wider">
          Escolha como prefere se conectar
        </p>
      </div>

      {/* Tabs Seletoras de Modo de Login (Min 48px de toque) */}
      <div className="flex border border-border-custom/50 mb-6 bg-muted/40 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setLoginMode('magic-link');
            setStatusMessage(null);
          }}
          className={`flex-1 min-h-[48px] rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            loginMode === 'magic-link'
              ? 'bg-accent-custom text-slate-950 shadow'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Link Mágico
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('password');
            setStatusMessage(null);
          }}
          className={`flex-1 min-h-[48px] rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            loginMode === 'password'
              ? 'bg-accent-custom text-slate-950 shadow'
              : 'text-secondary hover:text-primary'
          }`}
        >
          E-mail e Senha
        </button>
      </div>

      {statusMessage?.type === 'success' ? (
        <div className="text-center py-6 space-y-4 animate-fadeIn">
          <div className="flex justify-center text-accent-custom">
            <CheckSquare size={52} weight="fill" className="animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-primary uppercase tracking-wider">Verifique seu e-mail</h3>
          <p className="text-sm text-secondary leading-relaxed font-semibold">
            {statusMessage.text}
          </p>
          <button
            onClick={() => setStatusMessage(null)}
            className="min-h-[48px] px-6 text-xs font-bold text-accent-custom hover:underline transition-all uppercase tracking-wider cursor-pointer"
          >
            Voltar
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Input E-mail */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-secondary uppercase tracking-wider block">
              Endereço de E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-secondary">
                <EnvelopeSimple size={18} />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isTransitionPending}
                className="w-full h-12 pl-10 pr-4 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none transition-colors disabled:opacity-50 font-medium"
                placeholder="nome@exemplo.com"
                required
              />
            </div>
          </div>

          {/* Input Senha (apenas no modo senha) */}
          {loginMode === 'password' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label htmlFor="password" className="text-xs font-bold text-secondary uppercase tracking-wider block">
                Sua Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-secondary">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isTransitionPending}
                  className="w-full h-12 pl-10 pr-4 bg-base border border-border-custom focus:border-accent-custom text-primary text-sm rounded-xl focus:outline-none transition-colors disabled:opacity-50 font-medium"
                  placeholder="Sua senha de acesso"
                  required
                />
              </div>
            </div>
          )}

          {statusMessage?.type === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl p-3.5 text-center">
              {statusMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isTransitionPending || !email || (loginMode === 'password' && !password)}
            className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-accent-custom to-accent-hover text-slate-950 text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isTransitionPending ? (
              <>
                <Spinner className="animate-spin" size={18} weight="bold" />
                Carregando...
              </>
            ) : loginMode === 'magic-link' ? (
              'Entrar com Magic Link'
            ) : (
              'Entrar com Senha'
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-base text-primary transition-colors duration-300">
      <Suspense fallback={
        <div className="w-full max-w-md bg-card border border-border-custom rounded-2xl p-8 text-center text-secondary font-bold shadow-md">
          Carregando formulário...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
