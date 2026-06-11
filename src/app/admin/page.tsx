import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Match } from '@/types';
import AdminPanelClient from '@/components/ui/AdminPanelClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();

  // 1. Validar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Validar se é admin, caso contrário redirecionar
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    redirect('/');
  }

  // 3. Buscar todas as partidas para o painel de gerenciamento
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });

  const matches: Match[] = matchesData || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      <div className="mb-10 border-b border-border-custom/60 pb-6">
        <h1 className="text-2xl sm:text-4xl font-black text-primary uppercase tracking-wider">
          Painel do Administrador
        </h1>
        <p className="text-sm text-secondary mt-2 font-medium">
          Cadastre novos confrontos da Copa do Mundo e lance os resultados oficiais das partidas para calcular os pontos de todos os palpites.
        </p>
      </div>

      <AdminPanelClient matches={matches} />
    </div>
  );
}
