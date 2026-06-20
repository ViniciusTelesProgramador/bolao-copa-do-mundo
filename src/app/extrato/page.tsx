import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ExtratoPage() {
  const admin = createAdminClient();

  const { data: raw } = await admin
    .from('challenges')
    .select(`
      id, result, points_transferred, created_at, updated_at,
      challenger_home, challenger_away, challenged_home, challenged_away,
      challenger_match_points, challenged_match_points,
      challenger:profiles!challenger_id(id, name, avatar_url),
      challenged:profiles!challenged_id(id, name, avatar_url),
      match:matches(home_team, away_team, home_flag, away_flag, match_time, home_score, away_score)
    `)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(200);

  const entries = (raw ?? []) as any[];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-8">
        <Link href="/x1" className="text-xs text-secondary hover:text-primary font-bold transition-colors">← X1 Desafios</Link>
        <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-wider mt-4 flex items-center gap-2.5">
          📋 Extrato de X1
        </h1>
        <p className="text-xs text-secondary font-bold mt-1">
          Histórico público de todas as transferências de pontos X1 — qualquer participante pode auditar
        </p>
      </div>

      {/* Trust badge */}
      <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-2xl px-4 py-3 mb-8">
        <span className="text-green-500 text-base shrink-0">🔐</span>
        <div>
          <p className="text-[11px] font-black text-green-500 uppercase tracking-wider">Sistema auditado</p>
          <p className="text-[10px] text-secondary font-bold">
            Cada transferência é processada automaticamente com trava atômica — nenhuma transação pode ser duplicada ou alterada manualmente.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-card border border-border-custom rounded-2xl p-8 text-center">
          <p className="text-secondary font-bold text-sm">Nenhum X1 encerrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((c) => {
            const challengerWon = c.result === 'challenger_won';
            const challengedWon = c.result === 'challenged_won';
            const isTie = c.result === 'tie';
            const winner = challengerWon ? c.challenger : challengedWon ? c.challenged : null;
            const loser  = challengerWon ? c.challenged : challengedWon ? c.challenger : null;
            const date = new Date(c.updated_at).toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: '2-digit',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={c.id} className="bg-card border border-border-custom rounded-2xl overflow-hidden">
                {/* Match + date strip */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border-custom/40 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                    {c.match?.home_flag && (
                      <img src={`https://flagcdn.com/24x18/${c.match.home_flag}.png`} alt="" className="w-4 h-3 object-cover rounded-sm shrink-0" />
                    )}
                    <span className="text-[10px] text-secondary font-bold truncate">{c.match?.home_team}</span>
                    <span className="text-[10px] text-secondary/40 shrink-0">×</span>
                    {c.match?.away_flag && (
                      <img src={`https://flagcdn.com/24x18/${c.match.away_flag}.png`} alt="" className="w-4 h-3 object-cover rounded-sm shrink-0" />
                    )}
                    <span className="text-[10px] text-secondary font-bold truncate">{c.match?.away_team}</span>
                    {c.match?.home_score !== null && (
                      <span className="text-[10px] font-black text-primary shrink-0 ml-1">
                        {c.match.home_score}×{c.match.away_score}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-secondary/50 font-bold shrink-0">{date}</span>
                </div>

                {/* Palpites */}
                <div className="px-4 py-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    {/* Challenger */}
                    <div className={`rounded-xl p-2.5 text-center border ${challengerWon ? 'bg-green-500/10 border-green-500/20' : challengedWon ? 'bg-red-500/5 border-red-500/10' : 'bg-muted/30 border-border-custom/30'}`}>
                      <p className="text-[10px] font-black text-primary truncate mb-1">{c.challenger?.name?.split(' ')[0]}</p>
                      <p className={`text-base font-black ${challengerWon ? 'text-green-500' : 'text-primary'}`}>
                        {c.challenger_home} × {c.challenger_away}
                      </p>
                      {c.challenger_match_points === 3 && (
                        <span className="text-[9px] font-black text-green-500">✓ Exato</span>
                      )}
                    </div>

                    {/* VS */}
                    <div className="text-center shrink-0">
                      <p className="text-[8px] font-black text-secondary/40 uppercase">X1</p>
                    </div>

                    {/* Challenged */}
                    <div className={`rounded-xl p-2.5 text-center border ${challengedWon ? 'bg-green-500/10 border-green-500/20' : challengerWon ? 'bg-red-500/5 border-red-500/10' : 'bg-muted/30 border-border-custom/30'}`}>
                      <p className="text-[10px] font-black text-primary truncate mb-1">{c.challenged?.name?.split(' ')[0]}</p>
                      <p className={`text-base font-black ${challengedWon ? 'text-green-500' : 'text-primary'}`}>
                        {c.challenged_home} × {c.challenged_away}
                      </p>
                      {c.challenged_match_points === 3 && (
                        <span className="text-[9px] font-black text-green-500">✓ Exato</span>
                      )}
                    </div>
                  </div>

                  {/* Result */}
                  <div className="mt-3 pt-2.5 border-t border-border-custom/30 text-center">
                    {isTie ? (
                      <p className="text-[11px] font-black text-secondary">🤝 Empate — nenhum ponto transferido</p>
                    ) : (
                      <p className="text-[11px] font-black text-green-500">
                        ✅ <span className="text-primary">{winner?.name?.split(' ')[0]}</span> recebeu{' '}
                        <span className="text-green-500">+{c.points_transferred} pts</span>{' '}
                        de <span className="text-primary">{loser?.name?.split(' ')[0]}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[9px] text-secondary/30 font-bold mt-8">
        Exibindo até 200 transações mais recentes · Bolão Copa 2026
      </p>
    </div>
  );
}
