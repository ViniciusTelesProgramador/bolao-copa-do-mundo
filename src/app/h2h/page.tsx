import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getH2HData } from '@/app/actions';
import H2HClient from '@/components/ui/H2HClient';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function H2HPage({ searchParams }: Props) {
  const { a, b } = await searchParams;

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, avatar_url')
    .order('name');

  if (!a || !b) {
    return <H2HClient profiles={profiles ?? []} data={null} userIdA={null} userIdB={null} />;
  }

  if (a === b) redirect('/h2h');

  const data = await getH2HData(a, b);

  return <H2HClient profiles={profiles ?? []} data={data} userIdA={a} userIdB={b} />;
}
