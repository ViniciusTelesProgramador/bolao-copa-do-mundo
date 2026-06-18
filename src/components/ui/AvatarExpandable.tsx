'use client';

import { useState } from 'react';

const COLORS = [
  'bg-red-500','bg-blue-500','bg-emerald-500','bg-amber-500',
  'bg-purple-500','bg-pink-500','bg-indigo-500','bg-cyan-500',
];
const bgColor = (name: string) => COLORS[(name.charCodeAt(0) || 0) % COLORS.length];

export default function AvatarExpandable({
  src,
  name,
  size = 80,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => { if (src) setOpen(true); }}
        className={`shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-custom ${src ? 'cursor-zoom-in' : 'cursor-default'}`}
        style={{ width: size, height: size }}
        aria-label={src ? `Ampliar foto de ${name}` : name}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full rounded-full object-cover ring-2 ring-accent-custom/30 hover:ring-accent-custom/60 transition-all"
          />
        ) : (
          <span
            className={`w-full h-full flex items-center justify-center rounded-full font-black text-white select-none ${bgColor(name)}`}
            style={{ fontSize: size * 0.35 }}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {open && src && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md cursor-zoom-out p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={src}
              alt={name}
              className="w-full rounded-3xl object-contain shadow-2xl ring-1 ring-white/10"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-card text-primary rounded-full border border-border-custom flex items-center justify-center text-xs font-black hover:bg-muted cursor-pointer shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
