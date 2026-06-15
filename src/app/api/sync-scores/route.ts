import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchFinishedWCMatches, teamsMatch } from '@/lib/football-data';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel cron jobs send: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;
  // Admin manual trigger via query param
  const querySecret = req.nextUrl.searchParams.get('secret');
  return querySecret === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // 1. Buscar partidas do nosso DB sem placar ainda
    const { data: ourMatches, error: dbError } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_time, home_score, away_score')
      .is('home_score', null);

    if (dbError) throw new Error(dbError.message);
    if (!ourMatches || ourMatches.length === 0) {
      return NextResponse.json({ message: 'Nenhuma partida pendente.', updated: 0 });
    }

    // 2. Buscar resultados finalizados da API
    const apiMatches = await fetchFinishedWCMatches();
    if (apiMatches.length === 0) {
      return NextResponse.json({ message: 'Nenhum resultado disponível na API.', updated: 0 });
    }

    // 3. Para cada partida nossa sem placar, tentar encontrar resultado na API
    let updated = 0;
    const errors: string[] = [];

    for (const ourMatch of ourMatches) {
      const ourDate = new Date(ourMatch.match_time).toISOString().slice(0, 10);

      const apiMatch = apiMatches.find((am) => {
        const apiDate = new Date(am.utcDate).toISOString().slice(0, 10);
        if (apiDate !== ourDate) return false;
        const homeOk = teamsMatch(ourMatch.home_team, am.homeTeam.name);
        const awayOk = teamsMatch(ourMatch.away_team, am.awayTeam.name);
        return homeOk && awayOk;
      });

      if (!apiMatch) continue;

      const homeScore = apiMatch.score.fullTime.home;
      const awayScore = apiMatch.score.fullTime.away;
      if (homeScore === null || awayScore === null) continue;

      const { error: updateError } = await supabase
        .from('matches')
        .update({ home_score: homeScore, away_score: awayScore })
        .eq('id', ourMatch.id);

      if (updateError) {
        errors.push(`${ourMatch.home_team} x ${ourMatch.away_team}: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    // 4. Revalidar cache de todas as páginas
    if (updated > 0) {
      revalidatePath('/');
      revalidatePath('/palpites');
      revalidatePath('/perfil');
      revalidatePath('/todos');
      revalidatePath('/admin');
    }

    return NextResponse.json({
      message: `Sync concluído. ${updated} placar(es) atualizado(s).`,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    console.error('[sync-scores]', err);
    return NextResponse.json({ error: err.message || 'Erro inesperado.' }, { status: 500 });
  }
}
