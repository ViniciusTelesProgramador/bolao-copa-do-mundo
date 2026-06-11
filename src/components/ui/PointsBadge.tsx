import React from 'react';

interface PointsBadgeProps {
  points: number | null;
  className?: string;
}

export default function PointsBadge({ points, className = '' }: PointsBadgeProps) {
  if (points === null) return null;

  let bgStyles = 'bg-muted text-secondary border-border-custom/80';
  let label = '0 pts';

  if (points === 3) {
    bgStyles = 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    label = '3 pts';
  } else if (points === 2) {
    bgStyles = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    label = '2 pts';
  } else if (points === 1) {
    bgStyles = 'bg-sky-500/10 text-sky-600 dark:text-sky-450 border-sky-500/20';
    label = '1 pt';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${bgStyles} ${className}`}>
      {label}
    </span>
  );
}
