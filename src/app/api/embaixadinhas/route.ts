import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('embaixadinhas_scores')
      .select('user_id, name, avatar_url, score')
      .order('score', { ascending: false })
      .limit(200);

    if (error) return NextResponse.json([]);

    // Keep only best score per user
    const seen = new Set<string | null>();
    const ranking = (data || []).filter(row => {
      const key = row.user_id ?? row.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);

    return NextResponse.json(ranking);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const score = Number(body.score);
    if (!Number.isInteger(score) || score <= 0) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .single();

    await admin.from('embaixadinhas_scores').insert({
      user_id: user.id,
      name: profile?.name ?? 'Anônimo',
      avatar_url: profile?.avatar_url ?? null,
      score,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
