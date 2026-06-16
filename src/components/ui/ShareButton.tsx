'use client';

import { useState } from 'react';
import { ShareNetwork, Spinner, DeviceMobile } from '@phosphor-icons/react';
import { showToast } from './Toast';

interface ShareButtonProps {
  position: number;
  totalPoints: number;
  acertos: number;
  aproveitamento: number;
  streak: number;
  name: string;
  avatarUrl: string | null;
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

async function generateCard(props: ShareButtonProps): Promise<Blob> {
  const W = 800, H = 420;
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

  // Glow top-right
  const glow = ctx.createRadialGradient(W * 0.85, 30, 0, W * 0.85, 30, 300);
  glow.addColorStop(0, '#22c55e1a');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#22c55e');
  bar.addColorStop(1, '#16a34a');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 5);

  // Header label
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('⚽  BOLÃO COPA 2026', 48, 46);
  ctx.letterSpacing = '0px';

  // Avatar
  const avatarR = 52;
  const avatarCX = 48 + avatarR;
  const avatarCY = 74 + avatarR;

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

  // Name
  const textX = avatarCX + avatarR + 30;
  const textY = avatarCY - 20;
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(props.name.toUpperCase(), textX, textY);

  // Position badge
  if (props.position > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[props.position - 1] ?? '🏅';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(`${medal}  ${props.position}º lugar no bolão`, textX, textY + 38);
  }

  // Stats boxes
  const aprvColor = props.aproveitamento >= 70 ? '#22c55e' : props.aproveitamento >= 40 ? '#f59e0b' : '#ef4444';
  const stats = [
    { label: 'PONTOS',    value: String(props.totalPoints),  color: '#4ade80' },
    { label: 'ACERTOS',   value: String(props.acertos),      color: '#86efac' },
    { label: 'APROVEIT.', value: `${props.aproveitamento}%`, color: aprvColor },
    { label: 'SEQUÊNCIA', value: props.streak > 0 ? `🔥 ${props.streak}` : '—', color: '#fb923c' },
  ];

  const boxW = 156, boxH = 98, gap = 16;
  const totalW = stats.length * boxW + (stats.length - 1) * gap;
  const boxX0 = (W - totalW) / 2;
  const boxY = H - boxH - 48;

  stats.forEach((stat, i) => {
    const bx = boxX0 + i * (boxW + gap);

    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    roundRect(ctx, bx, boxY, boxW, boxH, 14);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, boxY, boxW, boxH, 14);
    ctx.stroke();

    ctx.fillStyle = stat.color;
    ctx.font = 'bold 31px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, bx + boxW / 2, boxY + 50);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(stat.label, bx + boxW / 2, boxY + 76);
  });

  ctx.textAlign = 'left';

  // URL footer
  ctx.fillStyle = '#334155';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('bolao-copa-do-mundo-tau.vercel.app', 48, H - 18);

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

  // Glows
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

  // Top accent bar
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#22c55e');
  bar.addColorStop(1, '#16a34a');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 10);

  ctx.textAlign = 'center';

  // Header label
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('⚽  BOLÃO COPA 2026', W / 2, 150);
  ctx.letterSpacing = '0px';

  // Avatar
  const avatarR = 150;
  const avatarCX = W / 2;
  const avatarCY = 420;

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
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      drawLetterAvatar(ctx, props.name, avatarCX, avatarCY, avatarR);
    }
  } else {
    drawLetterAvatar(ctx, props.name, avatarCX, avatarCY, avatarR);
  }

  // Name
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 68px system-ui, sans-serif';
  ctx.fillText(props.name.toUpperCase(), W / 2, avatarCY + avatarR + 90);

  // Position badge
  if (props.position > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[props.position - 1] ?? '🏅';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillText(`${medal}  ${props.position}º lugar no bolão`, W / 2, avatarCY + avatarR + 160);
  }

  // Stats grid 2x2
  const aprvColor = props.aproveitamento >= 70 ? '#22c55e' : props.aproveitamento >= 40 ? '#f59e0b' : '#ef4444';
  const stats = [
    { label: 'PONTOS',    value: String(props.totalPoints),  color: '#4ade80' },
    { label: 'ACERTOS',   value: String(props.acertos),      color: '#86efac' },
    { label: 'APROVEIT.', value: `${props.aproveitamento}%`, color: aprvColor },
    { label: 'SEQUÊNCIA', value: props.streak > 0 ? `🔥 ${props.streak}` : '—', color: '#fb923c' },
  ];

  const boxW = 420, boxH = 230, gapX = 28, gapY = 28;
  const gridW = boxW * 2 + gapX;
  const gridX0 = (W - gridW) / 2;
  const gridY0 = avatarCY + avatarR + 260;

  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = gridX0 + col * (boxW + gapX);
    const by = gridY0 + row * (boxH + gapY);

    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    roundRect(ctx, bx, by, boxW, boxH, 22);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, boxW, boxH, 22);
    ctx.stroke();

    ctx.fillStyle = stat.color;
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.fillText(stat.value, bx + boxW / 2, by + 120);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(stat.label, bx + boxW / 2, by + 175);
  });

  // Call to action + footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('Cola no bolão e disputa com a gente! 👇', W / 2, H - 160);

  ctx.fillStyle = '#334155';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText('bolao-copa-do-mundo-tau.vercel.app', W / 2, H - 100);

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
