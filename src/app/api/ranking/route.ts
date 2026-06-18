import { NextResponse } from 'next/server';
import { getRanking } from '@/app/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ranking = await getRanking();
  return NextResponse.json(ranking);
}
