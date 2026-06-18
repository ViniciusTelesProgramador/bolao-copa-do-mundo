'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ShareNetwork } from '@phosphor-icons/react';
import { RankingEntry } from '@/types';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function ShareRankingButton({ ranking }: { ranking: RankingEntry[] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    if (!cardRef.current || loading) return;
    setLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'ranking-bolao.png', { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Bolão Copa 2026 — Classificação', files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'ranking-bolao.png';
        a.click();
      }
    } catch (e) {
      console.error('ShareRanking error:', e);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });

  const maxPts = ranking[0]?.total_points || 1;

  return (
    <>
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-secondary bg-muted border border-border-custom rounded-lg hover:text-primary hover:border-secondary transition-all cursor-pointer disabled:opacity-50 select-none"
        title="Compartilhar ranking como imagem"
      >
        <ShareNetwork size={13} />
        {loading ? 'Gerando...' : 'Foto'}
      </button>

      {/* ── Card off-screen para captura ──────────────────── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div
          ref={cardRef}
          style={{
            width: '500px',
            background: '#0f172a',
            padding: '28px 28px 20px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '20px',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '26px', lineHeight: 1 }}>⚽</span>
              <span style={{ color: '#f1f5f9', fontSize: '17px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Bolão Copa 2026
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Classificação Geral
              </span>
              <span style={{ color: '#475569', fontSize: '10px', fontWeight: 600 }}>{today}</span>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, #22c55e60, #22c55e10, transparent)' }} />
          </div>

          {/* Ranking rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {ranking.map((entry, idx) => {
              const pos = idx + 1;
              const isTop3 = pos <= 3;
              const pct = Math.max(8, Math.round((entry.total_points / maxPts) * 100));
              const leftBorder =
                pos === 1 ? '#eab308' :
                pos === 2 ? '#94a3b8' :
                pos === 3 ? '#b45309' : 'transparent';
              const ptsColor = pos === 1 ? '#22c55e' : '#f1f5f9';
              const barColor = pos === 1 ? '#22c55e' : pos <= 3 ? '#3b82f6' : '#334155';

              return (
                <div
                  key={entry.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 10px',
                    background: isTop3 ? '#1e293b' : 'transparent',
                    borderRadius: '10px',
                    borderLeft: `3px solid ${leftBorder}`,
                  }}
                >
                  {/* Position */}
                  <div style={{ width: '28px', textAlign: 'center', flexShrink: 0 }}>
                    {isTop3 ? (
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>{MEDALS[pos - 1]}</span>
                    ) : (
                      <span style={{ color: '#475569', fontSize: '12px', fontWeight: 900 }}>{pos}</span>
                    )}
                  </div>

                  {/* Name */}
                  <span style={{
                    flex: 1,
                    color: '#f1f5f9',
                    fontSize: '13px',
                    fontWeight: isTop3 ? 800 : 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.name}
                  </span>

                  {/* Progress bar */}
                  <div style={{ width: '64px', height: '3px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '2px' }} />
                  </div>

                  {/* Points */}
                  <span style={{ color: ptsColor, fontSize: '15px', fontWeight: 900, width: '36px', textAlign: 'right', flexShrink: 0 }}>
                    {entry.total_points}
                  </span>
                  <span style={{ color: '#475569', fontSize: '9px', fontWeight: 700, width: '18px', flexShrink: 0 }}>pts</span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
            <span style={{ color: '#334155', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>
              bolao-copa-do-mundo-tau.vercel.app
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
