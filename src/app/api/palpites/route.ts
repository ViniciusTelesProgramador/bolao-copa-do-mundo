import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const [{ data: matchesData }, { data: predictionsData }] = await Promise.all([
    supabase.from('matches').select('*').order('match_time', { ascending: true }),
    supabase.from('predictions').select('*').eq('user_id', user.id),
  ]);

  return NextResponse.json({
    matches: matchesData || [],
    predictions: predictionsData || [],
  });
}
