'use client';

import React, { useEffect, useState } from 'react';
import { Check, X, Warning } from '@phosphor-icons/react';

interface ToastMessage {
  text: string;
  type: 'success' | 'error';
}

export function showToast(text: string, type: 'success' | 'error' = 'success') {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('app-toast', { detail: { text, type } });
    window.dispatchEvent(event);
  }
}

export default function Toast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as ToastMessage;
      setToast(detail);
    };

    window.addEventListener('app-toast', handleToast);
    return () => {
      window.removeEventListener('app-toast', handleToast);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fadeIn max-w-[90vw] sm:max-w-md w-max bg-card transition-all duration-300 select-none"
      style={{
        borderColor: isSuccess ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }}
    >
      <div className={`p-1.5 rounded-full ${isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
        {isSuccess ? <Check size={16} weight="bold" /> : <Warning size={16} weight="bold" />}
      </div>
      <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-50">
        {toast.text}
      </p>
      <button
        onClick={() => setToast(null)}
        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors focus:outline-none p-1 shrink-0"
        aria-label="Fechar notificação"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
