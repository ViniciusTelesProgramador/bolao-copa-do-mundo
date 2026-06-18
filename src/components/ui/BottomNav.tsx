'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Calendar, Trophy, Sword, User } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

export default function BottomNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        try {
          const { count } = await supabase
            .from('challenges')
            .select('id', { count: 'exact', head: true })
            .eq('challenged_id', user.id)
            .eq('status', 'pending');
          setPendingChallenges(count ?? 0);
        } catch {}
      }
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      if (!session?.user) setPendingChallenges(0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Se não autenticado, não exibe a BottomNav (ou exibe apenas o link de Home/Login, mas ocultar é mais limpo)
  if (!isAuthenticated) return null;

  const tabs = [
    { name: 'Início', href: '/', icon: House },
    { name: 'Palpitar', href: '/palpites', icon: Calendar },
    { name: 'Todos', href: '/todos', icon: Trophy },
    { name: 'X1', href: '/x1', icon: Sword },
    { name: 'Perfil', href: '/perfil', icon: User },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border-custom text-primary transition-all duration-300 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          const badge = tab.href === '/x1' && pendingChallenges > 0 ? pendingChallenges : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] gap-1 focus:outline-none transition-colors duration-200 ${
                isActive ? 'text-accent-custom' : 'text-secondary hover:text-primary'
              }`}
            >
              <div className="relative">
                <Icon size={22} weight={isActive ? 'bold' : 'regular'} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
