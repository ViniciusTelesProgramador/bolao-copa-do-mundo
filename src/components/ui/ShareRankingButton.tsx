'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ShareNetwork } from '@phosphor-icons/react';
import { RankingEntry } from '@/types';

const MEDALS = ['🥇', '🥈', '🥉'];
const CARD_COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#6366f1','#06b6d4'];
const avatarBg = (name: string) => CARD_COLORS[(name.charCodeAt(0) || 0) % CARD_COLORS.length];

async function toBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ShareRankingButton({ ranking }: { ranking: RankingEntry[] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  async function handleShare() {
    if (!cardRef.current || loading) return;
    setLoading(true);
    try {
      // 1. Pre-fetch avatars as base64 (resolve CORS)
      const map: Record<string, string> = {};
      await Promise.all(
        ranking.map(async (entry) => {
          if (!entry.avatar_url) return;
          const b64 = await toBase64(entry.avatar_url);
          if (b64) map[entry.user_id] = b64;
        })
      );
      setAvatars(map);

      // 2. Wait for DOM update
      await new Promise(r => setTimeout(r, 200));

      // 3. Capture card
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });

      // 4. Share (mobile) or download (desktop)
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

      {/* ── Card off-screen para captura ─────────────────────── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div
          ref={cardRef}
          style={{
            width: '540px',
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
              <span style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Bolão Copa 2026
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Classificação Geral
              </span>
              <span style={{ color: '#475569', fontSize: '10px', fontWeight: 600 }}>{today}</span>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, #22c55e80, #22c55e20, transparent)' }} />
          </div>

          {/* Column labels */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px 6px', marginBottom: '4px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ width: 24 }} />
            <div style={{ width: 28 }} />
            <span style={{ flex: 1, color: '#334155', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Participante</span>
            <span style={{ color: '#334155', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', width: 40, textAlign: 'right' }}>Aprv.</span>
            <div style={{ width: 56 }} />
            <span style={{ color: '#334155', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', width: 48, textAlign: 'right' }}>Pts</span>
          </div>

          {/* Ranking rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {ranking.map((entry, idx) => {
              const pos = idx + 1;
              const isTop3 = pos <= 3;
              const pct = Math.max(6, Math.round((entry.total_points / maxPts) * 100));
              const hasPlayed = entry.predictions_count > 0;

              const leftBorder =
                pos === 1 ? '#eab308' :
                pos === 2 ? '#94a3b8' :
                pos === 3 ? '#b45309' : 'transparent';

              const ptsColor  = pos === 1 ? '#22c55e' : '#f1f5f9';
              const barColor  = pos === 1 ? '#22c55e' : pos === 2 ? '#94a3b8' : pos === 3 ? '#b45309' : '#334155';

              const aprvColor =
                !hasPlayed ? '#475569' :
                entry.aproveitamento >= 70 ? '#22c55e' :
                entry.aproveitamento >= 40 ? '#f59e0b' : '#f87171';

              const avatarSrc = avatars[entry.user_id] ?? null;

              return (
                <div
                  key={entry.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 8px',
                    background: isTop3 ? '#1e293b' : 'transparent',
                    borderRadius: '10px',
                    borderLeft: `3px solid ${leftBorder}`,
                  }}
                >
                  {/* Position */}
                  <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {isTop3 ? (
                      <span style={{ fontSize: '15px', lineHeight: 1 }}>{MEDALS[pos - 1]}</span>
                    ) : (
                      <span style={{ color: '#475569', fontSize: '11px', fontWeight: 900 }}>{pos}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #334155', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: avatarBg(entry.name),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Name */}
                  <span style={{
                    flex: 1,
                    color: '#f1f5f9',
                    fontSize: '12px',
                    fontWeight: isTop3 ? 800 : 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.name}
                  </span>

                  {/* Aproveitamento */}
                  <span style={{ color: aprvColor, fontSize: '11px', fontWeight: 800, width: 40, textAlign: 'right', flexShrink: 0 }}>
                    {hasPlayed ? `${entry.aproveitamento}%` : '—'}
                  </span>

                  {/* Progress bar */}
                  <div style={{ width: 56, height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2 }} />
                  </div>

                  {/* Points */}
                  <span style={{ color: ptsColor, fontSize: '15px', fontWeight: 900, width: 32, textAlign: 'right', flexShrink: 0 }}>
                    {entry.total_points}
                  </span>
                  <span style={{ color: '#475569', fontSize: '9px', fontWeight: 700, width: 16, flexShrink: 0 }}>pts</span>
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
