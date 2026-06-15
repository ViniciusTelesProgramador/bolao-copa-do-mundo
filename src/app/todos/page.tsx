import React from 'react';
import { createClient } from '@/lib/supabase/server';
import PredictionsListClient from '@/components/ui/PredictionsListClient';
import { fetchPlayerImage } from '@/lib/football-data';
import { Match } from '@/types';

export const dynamic = 'force-dynamic';

interface RawPrediction {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  profiles: {
    name: string;
  } | null;
}

export default async function TodosPalpitesPage() {
  const supabase = await createClient();
  
  // 1. Obter usuário logado
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Buscar todas as partidas ordenadas
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });
  const matches: Match[] = matchesData || [];

  // 3. Buscar todos os perfis (para mostrar quem não palpitou e artilheiro)
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, artilheiro_guess, artilheiro_points')
    .order('name', { ascending: true });
  const allProfiles = (profilesData || []) as { id: string; name: string; avatar_url?: string | null; artilheiro_guess?: string | null; artilheiro_points?: number }[];

  // 3b. Buscar fotos dos jogadores palpitados (TheSportsDB, sem key)
  // Promise.allSettled garante que falhas individuais não quebram a página.
  // fetchPlayerImage já tem timeout de 2s, então no pior caso aguarda 2s e segue.
  const uniqueGuesses = [...new Set(allProfiles.map(p => p.artilheiro_guess).filter(Boolean))] as string[];
  const playerImages: Record<string, string | null> = {};
  if (uniqueGuesses.length > 0) {
    const results = await Promise.allSettled(
      uniqueGuesses.map((name) => fetchPlayerImage(name).then(img => ({ name, img })))
    );
    results.forEach((r) => {
      if (r.status === 'fulfilled') playerImages[r.value.name] = r.value.img;
    });
  }

  // 4. Buscar todos os palpites
  const { data: predictionsData } = await supabase
    .from('predictions')
    .select(`
      id,
      match_id,
      user_id,
      home_score,
      away_score,
      points,
      profiles (
        name
      )
    `);

  const rawPredictions = (predictionsData || []) as unknown as RawPrediction[];

  // 4. Mapear palpites — todos visíveis para todos
  const predictions = rawPredictions
    .map((p) => ({
      id: p.id,
      match_id: p.match_id,
      user_id: p.user_id,
      home_score: p.home_score,
      away_score: p.away_score,
      points: p.points,
      user_name: p.profiles?.name || 'Participante'
    }));

  // 5. Buscar contagem total de palpites por jogo usando a RPC get_predictions_count
  const predictionsCount: Record<string, number> = {};
  
  try {
    const { data: countsData, error: countsError } = await supabase.rpc('get_predictions_count');
    if (!countsError && countsData) {
      countsData.forEach((row: any) => {
        predictionsCount[row.match_id] = Number(row.count);
      });
    }
  } catch (err) {
    console.error('Erro ao chamar RPC get_predictions_count:', err);
  }

  // Preencher contagens restantes com fallback seguro
  matches.forEach((m) => {
    if (predictionsCount[m.id] === undefined) {
      const fallbackCount = predictions.filter((p) => p.match_id === m.id).length;
      predictionsCount[m.id] = fallbackCount;
    }
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] transition-colors duration-300">
      <div className="mb-8 border-b border-border-custom/60 pb-5">
        <h1 className="text-2xl sm:text-4xl font-black text-primary uppercase tracking-wider">
          Palpites de Todos
        </h1>
        <p className="text-xs sm:text-sm text-secondary mt-2 font-medium">
          Acompanhe todos os palpites enviados pelos participantes da Copa.
        </p>
      </div>

      {/* Seção: Palpites de Artilheiro */}
      {allProfiles.some((p) => p.artilheiro_guess) && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-custom/60">
            <span className="text-lg">⚽</span>
            <h2 className="text-sm font-black text-primary uppercase tracking-wider">Palpites de Artilheiro</h2>
            <span className="text-[10px] font-black text-secondary">+5 pts para quem acertar</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {allProfiles.map((p) => {
              const bgColors = ['bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500'];
              const color = bgColors[(p.name.charCodeAt(0) || 0) % bgColors.length];
              const acertou = (p.artilheiro_points ?? 0) > 0;
              const isSelf = p.id === user?.id;
              const playerImg = p.artilheiro_guess ? playerImages[p.artilheiro_guess] : null;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    acertou ? 'bg-amber-500/5 border-amber-500/20' :
                    isSelf  ? 'bg-accent-custom/5 border-accent-custom/20' :
                              'bg-card border-border-custom'
                  }`}
                >
                  {/* Avatar do participante */}
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-custom" />
                  ) : (
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black text-white shrink-0 ${color}`}>
                      {p.name.substring(0, 1).toUpperCase()}
                    </span>
                  )}
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-black truncate ${isSelf ? 'text-accent-custom' : 'text-primary'}`}>
                      {p.name}{isSelf && <span className="ml-1 text-[9px] opacity-70">(você)</span>}
                    </p>
                    {p.artilheiro_guess ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        {playerImg && (
                          <img src={playerImg} alt={p.artilheiro_guess} className="w-6 h-6 rounded-full object-cover shrink-0 border border-border-custom bg-muted" />
                        )}
                        <p className={`text-xs font-bold truncate ${acertou ? 'text-amber-500' : 'text-secondary'}`}>
                          {acertou && '🏆 '}{p.artilheiro_guess}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-secondary italic">sem palpite</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-card border border-border-custom rounded-2xl p-8 text-center text-secondary">
          Nenhum jogo cadastrado.
        </div>
      ) : (
        <PredictionsListClient
          matches={matches}
          predictions={predictions}
          predictionsCount={predictionsCount}
          currentUserId={user?.id || null}
          allProfiles={allProfiles}
        />
      )}
    </div>
  );
}
