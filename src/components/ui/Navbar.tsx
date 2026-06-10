'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Shield, User, SignOut, List, X, Calendar, SoccerBall } from '@phosphor-icons/react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        setIsAdmin(user.email === adminEmail);

        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        setProfile(profile);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    }

    getUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        setIsAdmin(session.user.email === adminEmail);

        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();
        setProfile(profile);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Ranking', href: '/', icon: Trophy },
    ...(user ? [{ name: 'Palpitar', href: '/palpites', icon: Calendar }] : []),
    ...(user ? [{ name: 'Meu Perfil', href: '/perfil', icon: User }] : []),
    ...(isAdmin ? [{ name: 'Painel Admin', href: '/admin', icon: Shield }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              <SoccerBall size={24} className="text-[#22c55e] transform group-hover:rotate-45 transition-transform duration-500" weight="fill" />
              <span className="font-extrabold text-base sm:text-lg tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                BOLÃO COPA 2026
              </span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    isActive
                      ? 'bg-[#22c55e] text-slate-950 shadow-md shadow-green-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={16} weight={isActive ? 'bold' : 'regular'} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Info & Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-350 font-bold">
                  Olá, <span className="text-[#22c55e] font-extrabold">{profile?.name || user.email?.split('@')[0]}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-450 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-all duration-200"
                >
                  <SignOut size={15} />
                  Sair
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-[#22c55e] to-[#1ea34d] hover:from-[#1ea34d] hover:to-[#22c55e] text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md transition-all duration-200"
              >
                Entrar
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-450 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {isOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-900 animate-fadeIn">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-[#22c55e] text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
            
            {user ? (
              <div className="pt-4 pb-2 border-t border-slate-900 px-3.5">
                <div className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider">
                  Logado como:{' '}
                  <span className="text-[#22c55e] font-extrabold block normal-case text-sm mt-0.5">
                    {profile?.name || user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-rose-450 border border-rose-950/60 hover:bg-rose-950/20 text-xs font-bold uppercase tracking-wider"
                >
                  <SignOut size={16} />
                  Sair da Conta
                </button>
              </div>
            ) : (
              <div className="pt-4 pb-2 border-t border-slate-900 px-3.5">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-[#22c55e] hover:bg-[#1ea34d] text-slate-950 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md"
                >
                  Entrar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
