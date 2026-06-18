import React from 'react';
import MatchDetailClient from '@/components/ui/MatchDetailClient';

export const dynamic = 'force-dynamic';

export default async function PartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MatchDetailClient matchId={id} />;
}
