import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Partida
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 });
  }

  // Todos os palpites + perfil
  const { data: predictionsRaw } = await supabase
    .from('predictions')
    .select('user_id, home_score, away_score, points, created_at, profiles(name, avatar_url)')
    .eq('match_id', id)
    .order('points', { ascending: false, nullsFirst: false });

  const predictions = (predictionsRaw || []).map((p: any) => ({
    user_id: p.user_id,
    home_score: p.home_score,
    away_score: p.away_score,
    points: p.points,
    created_at: p.created_at,
    name: p.profiles?.name ?? 'Participante',
    avatar_url: p.profiles?.avatar_url ?? null,
  }));

  // X1 desta partida (mostra apenas os concluídos para todos, e os abertos só para quem participa)
  const { data: challengesRaw } = await supabase
    .from('challenges')
    .select(`
      id, status, result,
      challenger_home, challenger_away,
      challenged_home, challenged_away,
      challenger_match_points, challenged_match_points,
      points_transferred,
      challenger:profiles!challenges_challenger_id_fkey(id, name, avatar_url),
      challenged:profiles!challenges_challenged_id_fkey(id, name, avatar_url)
    `)
    .eq('match_id', id)
    .in('status', ['accepted', 'completed']);

  const challenges = (challengesRaw || []).map((c: any) => ({
    id: c.id,
    status: c.status,
    result: c.result,
    challenger_home: c.challenger_home,
    challenger_away: c.challenger_away,
    challenged_home: c.challenged_home,
    challenged_away: c.challenged_away,
    challenger_match_points: c.challenger_match_points,
    challenged_match_points: c.challenged_match_points,
    points_transferred: c.points_transferred,
    challenger: c.challenger,
    challenged: c.challenged,
  }));

  return NextResponse.json({
    match,
    predictions,
    challenges,
    currentUserId: user?.id ?? null,
  });
}
