'use client';

import { ShareNetwork } from '@phosphor-icons/react';
import { showToast } from './Toast';

interface ShareButtonProps {
  position: number;
  totalPoints: number;
  acertos: number;
}

export default function ShareButton({ position, totalPoints, acertos }: ShareButtonProps) {
  const medals = ['🥇', '🥈', '🥉'];
  const medal = medals[position - 1] || '🏅';

  const handleShare = async () => {
    const text = `${medal} Estou em ${position}º no Bolão Copa 2026!\n⚽ ${totalPoints} pts • ${acertos} acertos\n👉 bolao-copa-do-mundo-tau.vercel.app`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Texto copiado para a área de transferência!', 'success');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 h-9 bg-muted hover:bg-border-custom border border-border-custom text-primary text-xs font-bold rounded-xl transition-all cursor-pointer"
    >
      <ShareNetwork size={15} />
      Compartilhar
    </button>
  );
}
