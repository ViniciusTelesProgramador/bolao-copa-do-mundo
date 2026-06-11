'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verificar se existe um tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Se não houver preferência salva, verifica a preferência do sistema
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Evita inconsistência de renderização no servidor (SSR mismatch)
  if (!mounted) {
    return <div className="w-12 h-12 shrink-0" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-12 h-12 flex items-center justify-center rounded-xl bg-muted/65 hover:bg-muted text-primary border border-border-custom transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-custom cursor-pointer"
      aria-label="Alternar tema de cores"
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-amber-400 animate-spin-slow" weight="fill" />
      ) : (
        <Moon size={20} className="text-indigo-600" weight="fill" />
      )}
    </button>
  );
}
