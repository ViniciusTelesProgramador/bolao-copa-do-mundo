import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function ChallengeNotificationBanner() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { count } = await supabase
      .from('challenges')
      .select('id', { count: 'exact', head: true })
      .eq('challenged_id', user.id)
      .eq('status', 'pending');

    if (!count || count === 0) return null;

    return (
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base animate-bounce shrink-0">⚔️</span>
          <span className="text-xs font-black truncate">
            {count === 1
              ? 'Você tem 1 desafio X1 aguardando resposta!'
              : `Você tem ${count} desafios X1 aguardando resposta!`}
          </span>
        </div>
        <Link
          href="/x1"
          className="text-[11px] font-black uppercase tracking-wider bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-all shrink-0 whitespace-nowrap"
        >
          Ver {count > 1 ? 'desafios' : 'desafio'} →
        </Link>
      </div>
    );
  } catch {
    return null;
  }
}
