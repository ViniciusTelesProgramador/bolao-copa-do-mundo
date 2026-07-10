import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import PredictionsListClient from '@/components/ui/PredictionsListClient';
import ArtilheiroGuessForm from '@/components/ui/ArtilheiroGuessForm';
import KnockoutBracket, { BracketColumn } from '@/components/ui/KnockoutBracket';
import TodosNavBar from '@/components/ui/TodosNavBar';
import { fetchPlayerImage, normalizeName } from '@/lib/football-data';
import { Match } from '@/types';

const KNOCKOUT_STAGE_ORDER = ['Fase de 32', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];
const THIRD_PLACE_STAGE = 'Decisão do 3º Lugar';

export const dynamic = 'force-dynamic';

interface RawPrediction {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  profiles: { name: string } | null;
}

type Profile = {
  id: string;
  name: string;
  avatar_url?: string | null;
  artilheiro_guess?: string | null;
  artilheiro_points?: number;
};

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500',
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export default async function TodosPalpitesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .order('match_time', { ascending: true });
  const matches: Match[] = matchesData || [];

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, artilheiro_guess, artilheiro_points')
    .order('name', { ascending: true });
  const allProfiles = (profilesData || []) as Profile[];

  // Prazo do palpite de artilheiro (fixo 72h a partir de 15/06/2026, ou ARTILHEIRO_DEADLINE env var)
  const deadlineStr = process.env.ARTILHEIRO_DEADLINE || '2026-06-18T23:59:59-03:00';
  const artilheiroDeadline = new Date(deadlineStr);
  const artilheiroLocked = new Date() > artilheiroDeadline;
  const artilheiroDeadlineLabel = artilheiroDeadline.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Fortaleza',
  });
  const myProfile = allProfiles.find((p) => p.id === user?.id);

  // Montar colunas do chaveamento do mata-mata (fases além da Fase de Grupos)
  const bracketColumns: BracketColumn[] = KNOCKOUT_STAGE_ORDER.map((stage) => ({
    stage,
    matches: matches.filter((m) => m.stage === stage),
  }));
  const thirdPlaceMatch = matches.find((m) => m.stage === THIRD_PLACE_STAGE) ?? null;
  // Só mostra o chaveamento quando o mata-mata já tiver confrontos reais definidos
  const knockoutStarted = [...bracketColumns.flatMap((c) => c.matches), ...(thirdPlaceMatch ? [thirdPlaceMatch] : [])]
    .some((m) => m.home_team !== 'A confirmar' && m.away_team !== 'A confirmar');

  const KNOCKOUT_NAV_ORDER = ['Fase de 32', 'Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Decisão do 3º Lugar', 'Final'];
  const hasGroups = matches.some((m) => m.stage === 'Fase de Grupos');
  const knockoutNavStages = KNOCKOUT_NAV_ORDER.filter((s) => matches.some((m) => m.stage === s));

  // Agrupar palpites por nome normalizado (une "Mbappé" com "Mbappe", etc.)
  const groups = new Map<string, {
    canonicalName: string;
    voters: Profile[];
    playerImg: string | null;
  }>();

  allProfiles.forEach(p => {
    if (!p.artilheiro_guess) return;
    const key = normalizeName(p.artilheiro_guess);
    if (!groups.has(key)) {
      groups.set(key, { canonicalName: p.artilheiro_guess, voters: [], playerImg: null });
    }
    const g = groups.get(key)!;
    // Preferir o nome com acento/caractere especial (geralmente mais letras ou tem acento)
    if (p.artilheiro_guess.length > g.canonicalName.length || /[àáâãäéêëíîïóôõöúûü]/i.test(p.artilheiro_guess)) {
      g.canonicalName = p.artilheiro_guess;
    }
    g.voters.push(p);
  });

  // Buscar foto de cada jogador único (com timeout interno de 2s)
  if (groups.size > 0) {
    await Promise.allSettled(
      [...groups.entries()].map(async ([key, group]) => {
        group.playerImg = await fetchPlayerImage(group.canonicalName);
      })
    );
  }

  // Ordenar grupos por nº de votos (mais votado primeiro)
  const sortedGroups = [...groups.values()].sort((a, b) => b.voters.length - a.voters.length);

  const profilesWithoutGuess = allProfiles.filter(p => !p.artilheiro_guess);

  // Buscar palpites dos jogos — admin client para ignorar RLS e ver todos
  const admin = createAdminClient();
  const { data: predictionsData } = await admin
    .from('predictions')
    .select(`id, match_id, user_id, home_score, away_score, points, profiles ( name )`);

  const rawPredictions = (predictionsData || []) as unknown as RawPrediction[];
  const now = new Date();
  const startedMatchIds = new Set(matches.filter(m => new Date(m.match_time) <= now).map(m => m.id));
  const predictions = rawPredictions.map(p => {
    const isOwnPrediction = p.user_id === user?.id;
    const matchStarted = startedMatchIds.has(p.match_id);
    const revealScore = matchStarted || isOwnPrediction;
    return {
      id: p.id,
      match_id: p.match_id,
      user_id: p.user_id,
      home_score: revealScore ? p.home_score : -1,
      away_score: revealScore ? p.away_score : -1,
      points: p.points,
      user_name: p.profiles?.name || 'Participante',
    };
  });

  const predictionsCount: Record<string, number> = {};
  try {
    const { data: countsData, error: countsError } = await supabase.rpc('get_predictions_count');
    if (!countsError && countsData) {
      countsData.forEach((row: any) => { predictionsCount[row.match_id] = Number(row.count); });
    }
  } catch {}
  matches.forEach(m => {
    if (predictionsCount[m.id] === undefined) {
      predictionsCount[m.id] = predictions.filter(p => p.match_id === m.id).length;
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

      <TodosNavBar
        showBracket={knockoutStarted}
        hasGroups={hasGroups}
        knockoutStages={knockoutNavStages}
      />

      {knockoutStarted && (
        <div id="secao-chaveamento">
          <KnockoutBracket columns={bracketColumns} thirdPlace={thirdPlaceMatch} />
        </div>
      )}

      {/* Seção: Artilheiro — palpite + cards por jogador */}
      <div id="secao-artilheiro" className="mb-12">
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border-custom/60">
          <span className="text-lg">⚽</span>
          <h2 className="text-sm font-black text-primary uppercase tracking-wider">Palpites de Artilheiro</h2>
          <span className="text-[10px] font-black text-secondary bg-muted border border-border-custom px-2 py-0.5 rounded-full">+5 pts para quem acertar</span>
        </div>

        {user && (
          <ArtilheiroGuessForm
            currentGuess={myProfile?.artilheiro_guess ?? null}
            artilheiroPoints={myProfile?.artilheiro_points ?? 0}
            isLocked={artilheiroLocked}
            deadlineLabel={artilheiroDeadlineLabel}
            deadline={deadlineStr}
          />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Easter egg / piada interna do grupo — não é um voto real, só visual */}
          <div className="rounded-2xl border border-pink-500/30 bg-pink-500/5 overflow-hidden flex flex-col shadow-lg shadow-pink-500/10">
            <div className="relative w-full aspect-square bg-muted/40 overflow-hidden">
              <img src="/easter-eggs/leda.png" alt="Leda Henrique" className="w-full h-full object-cover object-top" />
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                1 voto
              </div>
            </div>
            <div className="px-3 pt-2.5 pb-1.5">
              <p className="text-sm font-black truncate text-pink-400">Leda Henrique</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 pb-1.5">
              <div className="h-px flex-1 bg-border-custom/40" />
              <span className="text-secondary text-[10px] font-black">▼</span>
              <div className="h-px flex-1 bg-border-custom/40" />
            </div>
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black text-white shrink-0 bg-pink-500">A</span>
                <span className="text-[11px] font-bold truncate text-secondary">Alysson Amorim</span>
              </div>
            </div>
          </div>

          {sortedGroups.map(group => {
            const acertou = group.voters.some(v => (v.artilheiro_points ?? 0) > 0);
            return (
              <div
                key={group.canonicalName}
                className={`rounded-2xl border overflow-hidden flex flex-col transition-all ${
                  acertou ? 'border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-500/10' : 'border-border-custom bg-card'
                }`}
              >
                <div className="relative w-full aspect-square bg-muted/40 overflow-hidden">
                  {group.playerImg ? (
                    <img src={group.playerImg} alt={group.canonicalName} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl font-black text-secondary/20 select-none">{group.canonicalName.substring(0, 1).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {group.voters.length} {group.voters.length === 1 ? 'voto' : 'votos'}
                  </div>
                  {acertou && (
                    <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                      🏆 Acertou!
                    </div>
                  )}
                </div>
                <div className="px-3 pt-2.5 pb-1.5">
                  <p className={`text-sm font-black truncate ${acertou ? 'text-amber-500' : 'text-primary'}`}>{group.canonicalName}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 pb-1.5">
                  <div className="h-px flex-1 bg-border-custom/40" />
                  <span className="text-secondary text-[10px] font-black">▼</span>
                  <div className="h-px flex-1 bg-border-custom/40" />
                </div>
                <div className="px-3 pb-3 flex flex-col gap-1.5">
                  {group.voters.map(v => {
                    const isSelf = v.id === user?.id;
                    return (
                      <div key={v.id} className="flex items-center gap-1.5 min-w-0">
                        {v.avatar_url ? (
                          <img src={v.avatar_url} alt={v.name} className="w-5 h-5 rounded-full object-cover shrink-0 border border-border-custom" />
                        ) : (
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black text-white shrink-0 ${avatarColor(v.name)}`}>
                            {v.name.substring(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className={`text-[11px] font-bold truncate ${isSelf ? 'text-accent-custom' : 'text-secondary'}`}>
                          {v.name}{isSelf && <span className="ml-0.5 opacity-70 text-[9px]"> (você)</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {profilesWithoutGuess.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] text-secondary font-black uppercase tracking-wider">Sem palpite:</span>
            {profilesWithoutGuess.map(p => (
              <span key={p.id} className="text-[11px] text-secondary/50 font-bold">{p.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Palpites dos jogos */}
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
