'use client';

import { useState } from 'react';
import { ShareNetwork, Spinner, DeviceMobile } from '@phosphor-icons/react';
import { showToast } from './Toast';
import type { PointsEvolutionEntry } from './PointsEvolutionChart';
import type { AchievementBadge } from './Achievements';

interface ShareButtonProps {
  position: number;
  totalPoints: number;
  acertos: number;
  aproveitamento: number;
  streak: number;
  name: string;
  avatarUrl: string | null;
  chartData?: PointsEvolutionEntry[];
  badges?: AchievementBadge[];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawLetterAvatar(ctx: CanvasRenderingContext2D, name: string, cx: number, cy: number, r: number) {
  const palette = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#6366f1','#06b6d4'];
  const color = palette[(name.charCodeAt(0) || 0) % palette.length];
  ctx.fillStyle = color + '40';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color + '90';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(r * 0.9)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.substring(0, 1).toUpperCase(), cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawSparkline(
  ctx: CanvasRenderingContext2D,
  data: PointsEvolutionEntry[],
  x: number, y: number, w: number, h: number,
) {
  if (data.length < 2) return;
  const maxVal = Math.max(...data.map(d => d.cumulative), 1);
  const padX = 6;
  const stepX = (w - padX * 2) / (data.length - 1);
  const coords = data.map((d, i) => ({
    px: x + padX + i * stepX,
    py: y + h * 0.94 - (d.cumulative / maxVal) * h * 0.86,
    gained: d.gained,
  }));

  // Area fill
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(34,197,94,0.26)');
  grad.addColorStop(1, 'rgba(34,197,94,0.01)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(coords[0].px, coords[0].py);
  for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].px, coords[i].py);
  ctx.lineTo(coords[coords.length - 1].px, y + h);
  ctx.lineTo(coords[0].px, y + h);
  ctx.closePath();
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(coords[0].px, coords[0].py);
  for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].px, coords[i].py);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Dots
  coords.forEach((c, i) => {
    const isLast = i === coords.length - 1;
    ctx.beginPath();
    ctx.arc(c.px, c.py, isLast ? 5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = c.gained > 0 ? '#22c55e' : '#475569';
    ctx.fill();
    if (isLast) {
      ctx.strokeStyle = '#0b1628';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });
}

function drawBadgeRow(
  ctx: CanvasRenderingContext2D,
  badges: AchievementBadge[],
  cx: number, y: number,
  badgeSize: number, gap: number,
) {
  if (badges.length === 0) return;
  const totalW = badges.length * badgeSize + (badges.length - 1) * gap;
  const startX = cx - totalW / 2;
  badges.forEach((b, i) => {
    const bxc = startX + i * (badgeSize + gap) + badgeSize / 2;
    const byc = y + badgeSize / 2;
    const r = badgeSize / 2;
    ctx.fillStyle = 'rgba(245,158,11,0.18)';
    ctx.beginPath();
    ctx.arc(bxc, byc, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,158,11,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bxc, byc, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${Math.round(badgeSize * 0.48)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.icon, bxc, byc + 1);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawSeparator(ctx: CanvasRenderingContext2D, y: number, x0: number, x1: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
}

function drawSectionLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = 'left') {
  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

async function generateCard(props: ShareButtonProps): Promise<Blob> {
  const W = 800, H = 520;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b1628');
  bg.addColorStop(1, '#0f2744');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.85, 30, 0, W * 0.85, 30, 300);
  glow.addColorStop(0, '#22c55e1a');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#22c55e');
  bar.addColorStop(1, '#16a34a');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 5);

  // Header
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('⚽  BOLÃO COPA 2026', 48, 44);
  ctx.letterSpacing = '0px';

  // Avatar
  const avatarR = 44;
  const avatarCX = 82;
  const avatarCY = 116;

  if (props.avatarUrl) {
    const img = await loadImage(props.avatarUrl);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      drawLetterAvatar(ctx, props.name, avatarCX, avatarCY, avatarR);
    }
  } else {
    drawLetterAvatar(ctx, props.name, avatarCX, avatarCY, avatarR);
  }

  // Name + position
  const textX = avatarCX + avatarR + 28;
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText(props.name.toUpperCase(), textX, 108);
  if (props.position > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[props.position - 1] ?? '🏅';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`${medal}  ${props.position}º lugar no bolão`, textX, 144);
  }

  // — Chart section —
  drawSeparator(ctx, 172, 20, W - 20);
  drawSectionLabel(ctx, 'EVOLUÇÃO DE PONTOS', 20, 190);

  if (props.chartData && props.chartData.length >= 2) {
    drawSparkline(ctx, props.chartData, 20, 198, W - 40, 96);
  } else {
    ctx.fillStyle = '#334155';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Aguardando mais jogos com resultado.', 20, 246);
  }

  // — Badges section —
  drawSeparator(ctx, 306, 20, W - 20);
  const unlockedBadges = (props.badges ?? []).filter(b => b.unlocked);
  drawSectionLabel(ctx, `CONQUISTAS  ${unlockedBadges.length}/${(props.badges ?? []).length}`, 20, 324);

  if (unlockedBadges.length > 0) {
    drawBadgeRow(ctx, unlockedBadges, W / 2, 332, 36, 10);
  } else {
    ctx.fillStyle = '#334155';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nenhuma conquista desbloqueada ainda', W / 2, 354);
    ctx.textAlign = 'left';
  }

  // — Stats boxes —
  drawSeparator(ctx, 382, 20, W - 20);

  const aprvColor = props.aproveitamento >= 70 ? '#22c55e' : props.aproveitamento >= 40 ? '#f59e0b' : '#ef4444';
  const stats = [
    { label: 'PONTOS',    value: String(props.totalPoints),  color: '#4ade80' },
    { label: 'ACERTOS',   value: String(props.acertos),      color: '#86efac' },
    { label: 'APROVEIT.', value: `${props.aproveitamento}%`, color: aprvColor },
    { label: 'SEQUÊNCIA', value: props.streak > 0 ? `🔥 ${props.streak}` : '—', color: '#fb923c' },
  ];

  const boxW = 166, boxH = 78, gap = 12;
  const totalBoxW = stats.length * boxW + (stats.length - 1) * gap;
  const boxX0 = (W - totalBoxW) / 2;
  const boxY = 390;

  stats.forEach((stat, i) => {
    const bx = boxX0 + i * (boxW + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    roundRect(ctx, bx, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, boxY, boxW, boxH, 12);
    ctx.stroke();
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, bx + boxW / 2, boxY + 44);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText(stat.label, bx + boxW / 2, boxY + 65);
  });

  ctx.textAlign = 'left';

  // URL footer
  ctx.fillStyle = '#334155';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('bolao-copa-do-mundo-tau.vercel.app', 48, H - 14);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

async function generateStoryCard(props: ShareButtonProps): Promise<Blob> {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1628');
  bg.addColorStop(1, '#0f2744');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow1 = ctx.createRadialGradient(W * 0.85, 220, 0, W * 0.85, 220, 420);
  glow1.addColorStop(0, '#22c55e22');
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.15, H * 0.78, 0, W * 0.15, H * 0.78, 500);
  glow2.addColorStop(0, '#f59e0b18');
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#22c55e');
  bar.addColorStop(1, '#16a34a');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 10);

  ctx.textAlign = 'center';

  // Header
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('⚽  BOLÃO COPA 2026', W / 2, 128);
  ctx.letterSpacing = '0px';

  // Avatar — smaller than original to make room for chart+badges
  const avatarR = 120;
  const avatarCX = W / 2;
  const avatarCY = 318;

  if (props.avatarUrl) {
    const img = await loadImage(props.avatarUrl);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      drawLetterAvatar(ctx, props.name, avatarCX, avatarCY, avatarR);
    }
  } else {
    drawLetterAvatar(ctx, props.name, avatarCX, avatarCY, avatarR);
  }

  // Name + position
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 58px system-ui, sans-serif';
  ctx.fillText(props.name.toUpperCase(), W / 2, avatarCY + avatarR + 66);

  if (props.position > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[props.position - 1] ?? '🏅';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(`${medal}  ${props.position}º lugar no bolão`, W / 2, avatarCY + avatarR + 124);
  }

  // — Chart section —
  const sep1Y = avatarCY + avatarR + 156;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, sep1Y);
  ctx.lineTo(W - 60, sep1Y);
  ctx.stroke();

  const chartLabelY = sep1Y + 34;
  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('EVOLUÇÃO DE PONTOS', W / 2, chartLabelY);
  ctx.letterSpacing = '0px';

  const chartY = chartLabelY + 18;
  const chartH = 178;

  if (props.chartData && props.chartData.length >= 2) {
    drawSparkline(ctx, props.chartData, 64, chartY, W - 128, chartH);
  } else {
    ctx.fillStyle = '#334155';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('Aguardando mais jogos com resultado.', W / 2, chartY + chartH / 2);
  }

  // — Badges section —
  const sep2Y = chartY + chartH + 22;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, sep2Y);
  ctx.lineTo(W - 60, sep2Y);
  ctx.stroke();

  const unlockedBadges = (props.badges ?? []).filter(b => b.unlocked);
  const badgeLabelY = sep2Y + 36;
  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(`CONQUISTAS  ${unlockedBadges.length}/${(props.badges ?? []).length}`, W / 2, badgeLabelY);
  ctx.letterSpacing = '0px';

  const badgeSize = 70;
  const badgeGap = 20;
  const badgeY0 = badgeLabelY + 16;
  const perRow = 4;
  const badgeRows = unlockedBadges.length > 0 ? Math.ceil(unlockedBadges.length / perRow) : 1;

  if (unlockedBadges.length > 0) {
    for (let row = 0; row < badgeRows; row++) {
      const rowBadges = unlockedBadges.slice(row * perRow, (row + 1) * perRow);
      drawBadgeRow(ctx, rowBadges, W / 2, badgeY0 + row * (badgeSize + badgeGap), badgeSize, badgeGap);
    }
  } else {
    ctx.fillStyle = '#334155';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('Nenhuma conquista desbloqueada ainda', W / 2, badgeY0 + badgeSize / 2);
  }

  const badgesBottom = badgeY0 + badgeRows * (badgeSize + badgeGap);

  // — Stats grid 2×2 —
  const sep3Y = badgesBottom + 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, sep3Y);
  ctx.lineTo(W - 60, sep3Y);
  ctx.stroke();

  const aprvColor = props.aproveitamento >= 70 ? '#22c55e' : props.aproveitamento >= 40 ? '#f59e0b' : '#ef4444';
  const stats = [
    { label: 'PONTOS',    value: String(props.totalPoints),  color: '#4ade80' },
    { label: 'ACERTOS',   value: String(props.acertos),      color: '#86efac' },
    { label: 'APROVEIT.', value: `${props.aproveitamento}%`, color: aprvColor },
    { label: 'SEQUÊNCIA', value: props.streak > 0 ? `🔥 ${props.streak}` : '—', color: '#fb923c' },
  ];

  const boxW = 420, boxH = 192, gapX = 28, gapY = 24;
  const gridW = boxW * 2 + gapX;
  const gridX0 = (W - gridW) / 2;
  const statsY = sep3Y + 28;

  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = gridX0 + col * (boxW + gapX);
    const by = statsY + row * (boxH + gapY);

    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    roundRect(ctx, bx, by, boxW, boxH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, boxW, boxH, 22);
    ctx.stroke();

    ctx.fillStyle = stat.color;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText(stat.value, bx + boxW / 2, by + 108);
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(stat.label, bx + boxW / 2, by + 156);
  });

  // CTA + URL (pinned towards bottom, at least 60px below stats)
  const statsBottom = statsY + 2 * boxH + gapY;
  const ctaY = Math.max(statsBottom + 80, H - 210);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('Cola no bolão e disputa com a gente! 👇', W / 2, ctaY);

  ctx.fillStyle = '#334155';
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText('bolao-copa-do-mundo-tau.vercel.app', W / 2, ctaY + 54);

  ctx.textAlign = 'left';

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

async function shareBlob(blob: Blob, filename: string, props: ShareButtonProps) {
  const file = new File([blob], filename, { type: 'image/png' });
  const medals = ['🥇', '🥈', '🥉'];
  const medal = medals[props.position - 1] ?? '🏅';
  const text = `${medal} Estou em ${props.position}º no Bolão Copa 2026!\n⚽ ${props.totalPoints} pts • ${props.acertos} acertos • ${props.aproveitamento}% de aproveitamento`;
  const url = 'https://bolao-copa-do-mundo-tau.vercel.app';

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], text, url });
  } else if (navigator.share) {
    await navigator.share({ text, url });
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Imagem salva! Compartilhe onde quiser.', 'success');
  }
}

export default function ShareButton(props: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState<'post' | 'story' | null>(null);

  const handleShare = async (format: 'post' | 'story') => {
    setIsGenerating(format);
    try {
      const blob = format === 'story' ? await generateStoryCard(props) : await generateCard(props);
      await shareBlob(blob, `bolao-copa-2026-${format}.png`, props);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        showToast('Não foi possível compartilhar.', 'error');
      }
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleShare('post')}
        disabled={isGenerating !== null}
        className="flex items-center gap-2 px-4 h-9 bg-muted hover:bg-border-custom border border-border-custom text-primary text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
      >
        {isGenerating === 'post'
          ? <Spinner size={15} className="animate-spin" />
          : <ShareNetwork size={15} />
        }
        {isGenerating === 'post' ? 'Gerando...' : 'Compartilhar'}
      </button>

      <button
        onClick={() => handleShare('story')}
        disabled={isGenerating !== null}
        title="Imagem em formato vertical (Stories/Status)"
        className="flex items-center gap-2 px-3 h-9 bg-muted hover:bg-border-custom border border-border-custom text-primary text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
      >
        {isGenerating === 'story'
          ? <Spinner size={15} className="animate-spin" />
          : <DeviceMobile size={15} />
        }
        {isGenerating === 'story' ? '...' : 'Stories'}
      </button>
    </div>
  );
}
