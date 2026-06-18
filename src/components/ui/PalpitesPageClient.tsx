'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import PredictionsAccordionList from './PredictionsAccordionList';
import { Match, Prediction } from '@/types';

interface PalpitesData {
  matches: Match[];
  predictions: Prediction[];
}

async function fetchPalpites(): Promise<PalpitesData> {
  const res = await fetch('/api/palpites');
  if (res.status === 401) throw new Error('unauthenticated');
  if (!res.ok) throw new Error('Falha ao carregar palpites');
  return res.json();
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-border-custom bg-card rounded-2xl h-16" />
      ))}
    </div>
  );
}

export default function PalpitesPageClient() {
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery<PalpitesData>({
    queryKey: ['palpites'],
    queryFn: fetchPalpites,
    staleTime: 30 * 1000,
    retry: (count, err: any) => err?.message !== 'unauthenticated' && count < 2,
  });

  // Redireciona se não autenticado
  React.useEffect(() => {
    if ((error as any)?.message === 'unauthenticated') {
      router.replace('/login');
    }
  }, [error, router]);

  const predictionsMap = React.useMemo(() => {
    const map = new Map<string, Prediction>();
    (data?.predictions ?? []).forEach(p => map.set(p.match_id, p));
    return map;
  }, [data?.predictions]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      <div className="mb-10 border-b border-border-custom/60 pb-6">
        <h1 className="text-2xl sm:text-4xl font-black text-primary uppercase tracking-wider">
          Meus Palpites
        </h1>
        <p className="text-sm text-secondary mt-2 font-medium">
          Dê ou edite seus palpites nas partidas abaixo. Os palpites se encerram pontualmente no horário de início de cada jogo.
        </p>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        <div className="bg-card border border-border-custom rounded-2xl p-8 text-center text-secondary">
          Erro ao carregar partidas. Tente recarregar a página.
        </div>
      ) : (data?.matches ?? []).length === 0 ? (
        <div className="bg-card border border-border-custom rounded-2xl p-8 text-center text-secondary">
          Nenhuma partida disponível no momento.
        </div>
      ) : (
        <PredictionsAccordionList
          matches={data!.matches}
          predictionsMap={predictionsMap}
          isAuthenticated={true}
        />
      )}
    </div>
  );
}
