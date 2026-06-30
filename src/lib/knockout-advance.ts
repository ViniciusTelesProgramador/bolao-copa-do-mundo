import type { SupabaseClient } from '@supabase/supabase-js';

type MatchRow = {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  home_score: number | null;
  away_score: number | null;
  stage: string;
  match_time: string;
  penalty_winner?: string | null;
};

const KNOCKOUT_STAGES = [
  'Fase de 32',
  'Oitavas de Final',
  'Quartas de Final',
  'Semifinal',
  'Final',
];
const THIRD_PLACE_STAGE = 'Decisão do 3º Lugar';

// Official Copa 2026 bracket slot order for Fase de 32.
// Maps bracket display position (0-15) to match_time-sorted index.
// Consecutive pairs (0,1), (2,3), (4,5)... feed the same Oitavas match.
const R32_BRACKET_ORDER = [0, 3, 2, 5, 1, 4, 6, 7, 9, 8, 11, 10, 12, 15, 14, 13];

type TeamInfo = { team: string; flag: string };

function getWinner(m: MatchRow): TeamInfo | null {
  if (m.home_score === null || m.away_score === null) return null;
  if (m.home_score > m.away_score) return { team: m.home_team, flag: m.home_flag };
  if (m.away_score > m.home_score) return { team: m.away_team, flag: m.away_flag };
  // Tied (penalties): check penalty_winner set by admin
  if (m.penalty_winner === 'home') return { team: m.home_team, flag: m.home_flag };
  if (m.penalty_winner === 'away') return { team: m.away_team, flag: m.away_flag };
  return null;
}

function getLoser(m: MatchRow): TeamInfo | null {
  if (m.home_score === null || m.away_score === null) return null;
  if (m.penalty_winner === 'home') return { team: m.away_team, flag: m.away_flag };
  if (m.penalty_winner === 'away') return { team: m.home_team, flag: m.home_flag };
  if (m.home_score > m.away_score) return { team: m.away_team, flag: m.away_flag };
  if (m.away_score > m.home_score) return { team: m.home_team, flag: m.home_flag };
  return null;
}

// Pairs current[0]+current[1] → next[0], current[2]+current[3] → next[1], etc.
// Only updates slots that still say "A confirmar".
async function propagatePairs(
  supabase: SupabaseClient,
  current: MatchRow[],
  next: MatchRow[],
  getTeam: (m: MatchRow) => TeamInfo | null
): Promise<number> {
  let count = 0;
  for (let i = 0; i < next.length; i++) {
    const m1 = current[i * 2];
    const m2 = current[i * 2 + 1];
    const target = next[i];
    if (!m1 || !m2 || !target) continue;

    const t1 = getTeam(m1);
    const t2 = getTeam(m2);

    const updates: Partial<Record<string, string>> = {};
    if (t1 && target.home_team === 'A confirmar') {
      updates.home_team = t1.team;
      updates.home_flag = t1.flag;
    }
    if (t2 && target.away_team === 'A confirmar') {
      updates.away_team = t2.team;
      updates.away_flag = t2.flag;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('matches').update(updates).eq('id', target.id);
      if (!error) count++;
    }
  }
  return count;
}

export async function autoAdvanceKnockout(supabase: SupabaseClient): Promise<{ advanced: number; error?: string }> {
  const { data: allMatches, error } = await supabase
    .from('matches')
    .select('*')
    .in('stage', [...KNOCKOUT_STAGES, THIRD_PLACE_STAGE])
    .order('match_time', { ascending: true });

  if (error) return { advanced: 0, error: error.message };
  if (!allMatches || allMatches.length === 0) return { advanced: 0 };

  const stageMap: Record<string, MatchRow[]> = {};
  for (const s of [...KNOCKOUT_STAGES, THIRD_PLACE_STAGE]) {
    stageMap[s] = allMatches.filter((m) => m.stage === s) as MatchRow[];
  }

  let total = 0;

  // Fase de 32 → Oitavas: use Copa 2026 specific bracket order
  const r32 = stageMap['Fase de 32'];
  const r16 = stageMap['Oitavas de Final'];
  if (r32.length === 16 && r16.length > 0) {
    const ordered = R32_BRACKET_ORDER.map((i) => r32[i]).filter(Boolean) as MatchRow[];
    total += await propagatePairs(supabase, ordered, r16, getWinner);
  }

  // Oitavas → Quartas: consecutive pairing
  const qf = stageMap['Quartas de Final'];
  if (r16.length > 0 && qf.length > 0) {
    total += await propagatePairs(supabase, r16, qf, getWinner);
  }

  // Quartas → Semifinal: consecutive pairing
  const semi = stageMap['Semifinal'];
  if (qf.length > 0 && semi.length > 0) {
    total += await propagatePairs(supabase, qf, semi, getWinner);
  }

  // Semifinal → Final: winners
  const final = stageMap['Final'];
  if (semi.length >= 2 && final.length > 0) {
    total += await propagatePairs(supabase, semi, [final[0]], getWinner);
  }

  // Semifinal → 3º Lugar: losers
  const third = stageMap[THIRD_PLACE_STAGE];
  if (semi.length >= 2 && third.length > 0) {
    total += await propagatePairs(supabase, semi, [third[0]], getLoser);
  }

  return { advanced: total };
}
