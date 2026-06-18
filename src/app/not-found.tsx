'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'countdown' | 'playing' | 'gameover';
type Dir = 'up' | 'down' | 'left' | 'right';
interface RankEntry { name: string; score: number; avatar_url: string | null }

// ─── Constants ───────────────────────────────────────────────────────────────

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };
const KEY_MAP: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

function rnd(): Dir { return DIRS[Math.floor(Math.random() * 4)]; }

// 0–9: 2500ms (relaxed base). Speeds up from 10, caps at 500ms (5× faster = 2500/5).
function winMs(score: number): number {
  if (score < 10) return 2500;
  return Math.max(500, 2500 - (score - 10) * 50);
}

// ─── Static stick figure (idle / gameover) ───────────────────────────────────

function BonecoIdle({ color, spinKey }: { color: string; spinKey: number }) {
  return (
    <svg
      key={spinKey}
      viewBox="-20 0 200 215"
      width="200"
      height="215"
      aria-hidden
      style={{
        color,
        transformOrigin: '80px 114px',
        animation: spinKey > 0 ? 'spin360 0.55s cubic-bezier(.4,0,.2,1)' : undefined,
      }}
    >
      <style>{`@keyframes spin360 { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Ball on ground, at right foot */}
      <circle cx={112} cy={184} r={9} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M105 180 Q112 176 119 180" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <path d="M104 184 Q112 188 120 184" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />

      {/* Head */}
      <circle cx={80} cy={40} r={16} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx={75} cy={38} r={2} fill="currentColor" />
      <circle cx={85} cy={38} r={2} fill="currentColor" />
      <path d="M75 48 Q80 53 85 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Torso */}
      <line x1={80} y1={56} x2={80} y2={128} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Arms */}
      <line x1={80} y1={76} x2={56} y2={115} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={76} x2={104} y2={115} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Left leg */}
      <line x1={80} y1={128} x2={64} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={64} y1={178} x2={48} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Right leg */}
      <line x1={80} y1={128} x2={96} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={96} y1={178} x2={112} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Animated stick figure (playing) ─────────────────────────────────────────
// Only the right leg and ball animate. Everything else is static.

function BonecoPlaying({ ms, color, spinKey }: { ms: number; color: string; spinKey: number }) {
  return (
    <svg
      key={spinKey}
      viewBox="-20 0 200 215"
      width="200"
      height="215"
      aria-hidden
      style={{
        color,
        transformOrigin: '80px 114px',
        animation: spinKey > 0 ? 'spin360 0.55s cubic-bezier(.4,0,.2,1)' : undefined,
      }}
    >
      <style>{`
        @keyframes spin360   { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes boneco-kick {
          0%   { transform: rotate(0deg); }
          15%  { transform: rotate(8deg); }
          38%  { transform: rotate(-48deg); }
          52%  { transform: rotate(-44deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes boneco-ball {
          0%   { transform: translate(0px,   0px); }
          30%  { transform: translate(-10px, -48px); }
          50%  { transform: translate(-18px, -82px); }
          70%  { transform: translate(-10px, -48px); }
          85%  { transform: translate(-2px,  -10px); }
          100% { transform: translate(0px,   0px); }
        }
      `}</style>

      {/* Ball — rests near right foot tip (112, 184), animated up */}
      <g style={{ animation: `boneco-ball ${ms}ms ease-in-out infinite` }}>
        <circle cx={112} cy={184} r={9} fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M105 180 Q112 176 119 180" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <path d="M104 184 Q112 188 120 184" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      </g>

      {/* Head */}
      <circle cx={80} cy={40} r={16} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx={75} cy={38} r={2} fill="currentColor" />
      <circle cx={85} cy={38} r={2} fill="currentColor" />
      <path d="M75 48 Q80 53 85 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Torso */}
      <line x1={80} y1={56} x2={80} y2={128} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Arms (static balance pose) */}
      <line x1={80} y1={76} x2={54} y2={110} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={76} x2={106} y2={110} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Left leg (static, planted) */}
      <line x1={80} y1={128} x2={64} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={64} y1={178} x2={48} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Right leg — rotates around hip (80,128) */}
      <g style={{
        transformOrigin: '80px 128px',
        animation: `boneco-kick ${ms}ms ease-in-out infinite`,
      }}>
        <line x1={80} y1={128} x2={96} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1={96} y1={178} x2={112} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─── Game ────────────────────────────────────────────────────────────────────

export default function NotFound() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [currentDir, setCurrentDir] = useState<Dir | null>(null);
  const [timeLeft, setTimeLeft] = useState(1);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [speedLevel, setSpeedLevel] = useState(1);

  const phaseRef = useRef<Phase>('idle');
  const scoreRef = useRef(0);
  const dirRef = useRef<Dir | null>(null);
  const tlRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinningRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    fetch('/api/embaixadinhas').then(r => r.ok ? r.json() : []).then(setRanking).catch(() => {});
  }, []);

  const spawnArrow = useCallback((currentScore: number) => {
    stopTimer();
    const dir = rnd();
    dirRef.current = dir;
    setCurrentDir(dir);
    tlRef.current = 1;
    setTimeLeft(1);

    // Update speed indicator (1×–5×)
    const ms = winMs(currentScore);
    const level = Math.round((1800 / ms) * 10) / 10;
    setSpeedLevel(Math.min(5, level));

    const tick = 40;
    timerRef.current = setInterval(() => {
      if (phaseRef.current !== 'playing') { stopTimer(); return; }
      tlRef.current -= tick / ms;
      if (tlRef.current <= 0) {
        stopTimer();
        setFeedback('miss');
        phaseRef.current = 'gameover';
        setTimeout(() => { setFeedback(null); setPhase('gameover'); }, 500);
      } else {
        setTimeLeft(tlRef.current);
      }
    }, tick);
  }, [stopTimer]);

  const handleDir = useCallback((dir: Dir) => {
    if (phaseRef.current !== 'playing' || !dirRef.current) return;
    stopTimer();

    if (dir === dirRef.current) {
      const ns = scoreRef.current + 1;
      scoreRef.current = ns;
      setScore(ns);
      setFeedback('hit');
      setTimeout(() => {
        setFeedback(null);
        if (phaseRef.current === 'playing') spawnArrow(ns);
      }, 200);
    } else {
      setFeedback('miss');
      phaseRef.current = 'gameover';
      setTimeout(() => { setFeedback(null); setPhase('gameover'); }, 550);
    }
  }, [spawnArrow, stopTimer]);

  const startGame = useCallback(() => {
    stopTimer();
    setScore(0); scoreRef.current = 0;
    setFeedback(null);
    setSpeedLevel(1);
    phaseRef.current = 'countdown';
    setPhase('countdown');
    setCountdown(3);

    let c = 3;
    const iv = setInterval(() => {
      c--;
      if (c > 0) { setCountdown(c); }
      else {
        clearInterval(iv);
        phaseRef.current = 'playing';
        setPhase('playing');
        spawnArrow(0);
      }
    }, 900);
  }, [spawnArrow, stopTimer]);

  useEffect(() => {
    if (phase !== 'gameover' || score === 0) return;
    fetch('/api/embaixadinhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    })
      .then(r => r.ok ? fetch('/api/embaixadinhas').then(r2 => r2.json()).then(setRanking) : null)
      .catch(() => {});
  }, [phase, score]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = KEY_MAP[e.key];
      if (dir) { e.preventDefault(); handleDir(dir); return; }
      if (e.key === ' ' && phaseRef.current === 'playing' && !spinningRef.current) {
        e.preventDefault();
        spinningRef.current = true;
        setSpinKey(k => k + 1);
        setTimeout(() => { spinningRef.current = false; }, 600);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDir]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const animMs = winMs(score);
  const figureColor = feedback === 'hit' ? 'var(--accent)' : feedback === 'miss' ? '#ef4444' : 'currentColor';

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 px-4 py-10">

      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[.2em] uppercase opacity-40 mb-1">Erro 404</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Página não encontrada</h1>
        {phase === 'idle' && (
          <p className="text-base opacity-50 mt-2">Mas rola umas embaixadinhas enquanto você pensa</p>
        )}
      </div>

      {/* Game card */}
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">

        {/* Score + speed row */}
        <div className="flex items-start justify-between min-h-[48px] mb-2">
          <div>
            {phase !== 'idle' && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black leading-none" style={{ color: 'var(--accent)' }}>{score}</span>
                  {score >= 10 && (
                    <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 tracking-wide">
                      ⚡ {speedLevel.toFixed(1)}×
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-40 uppercase tracking-wider mt-0.5">embaixadinhas</div>
              </>
            )}
          </div>
          {phase === 'gameover' && (
            <button
              onClick={startGame}
              className="px-4 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
              style={{ background: 'var(--accent)', color: '#0f172a' }}
            >
              Jogar de novo
            </button>
          )}
        </div>

        {/* Figure + game UI */}
        <div className="flex items-center justify-around gap-4">

          {phase === 'playing' ? (
            <BonecoPlaying ms={animMs} color={figureColor} spinKey={spinKey} />
          ) : (
            <BonecoIdle color={figureColor} spinKey={spinKey} />
          )}

          <div className="flex flex-col items-center gap-4 min-w-[140px]">

            {phase === 'idle' && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm opacity-50 text-center leading-relaxed">
                  Use as setas do teclado<br />ou os botões abaixo
                </p>
                <button
                  onClick={startGame}
                  className="px-8 py-3 rounded-2xl font-black text-2xl tracking-widest hover:scale-105 transition-transform"
                  style={{ background: 'var(--accent)', color: '#0f172a' }}
                >
                  START
                </button>
                <p className="text-xs opacity-30 text-center">dica secreta: barra de espaço 👀</p>
              </div>
            )}

            {phase === 'countdown' && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs opacity-40 uppercase tracking-widest">preparado?</span>
                <span className="text-9xl font-black leading-none" style={{ color: 'var(--accent)' }}>
                  {countdown}
                </span>
              </div>
            )}

            {phase === 'playing' && currentDir && (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="text-8xl font-black leading-none select-none"
                  style={{
                    color: feedback === 'hit' ? 'var(--accent)' : feedback === 'miss' ? '#ef4444' : 'currentColor',
                    transform: feedback === 'hit' ? 'scale(1.35)' : 'scale(1)',
                    transition: 'transform 0.1s, color 0.1s',
                  }}
                >
                  {ARROW[currentDir]}
                </div>
                {/* Timer bar */}
                <div className="w-28 h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, timeLeft) * 100}%`,
                      backgroundColor: timeLeft > 0.5 ? 'var(--accent)' : timeLeft > 0.25 ? '#f59e0b' : '#ef4444',
                      transition: 'background-color 0.15s',
                    }}
                  />
                </div>
              </div>
            )}

            {phase === 'gameover' && (
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xl font-black text-red-400">💀 Game Over</span>
                <span className="text-5xl font-black leading-none" style={{ color: 'var(--accent)' }}>{score}</span>
                <span className="text-xs opacity-50">embaixadinhas</span>
              </div>
            )}
          </div>
        </div>

        {/* D-Pad */}
        {phase === 'playing' && (
          <div className="mt-5 flex flex-col items-center gap-1.5">
            <button
              onPointerDown={e => { e.preventDefault(); handleDir('up'); }}
              className="w-14 h-14 rounded-2xl text-2xl font-black select-none transition-all active:scale-90"
              style={{
                background: currentDir === 'up' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                color: currentDir === 'up' ? '#0f172a' : 'inherit',
              }}
            >↑</button>
            <div className="flex gap-1.5">
              {(['left', 'down', 'right'] as Dir[]).map(d => (
                <button
                  key={d}
                  onPointerDown={e => { e.preventDefault(); handleDir(d); }}
                  className="w-14 h-14 rounded-2xl text-2xl font-black select-none transition-all active:scale-90"
                  style={{
                    background: currentDir === d ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    color: currentDir === d ? '#0f172a' : 'inherit',
                  }}
                >
                  {ARROW[d]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ranking */}
      {ranking.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="text-xs font-bold uppercase tracking-[.2em] opacity-40 mb-3 text-center">
            Hall da Fama das Embaixadinhas
          </h2>
          <div className="rounded-2xl overflow-hidden border border-white/10 divide-y divide-white/5">
            {ranking.slice(0, 10).map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-6 text-center text-sm">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="opacity-40 font-bold">{i + 1}</span>}
                </span>
                {e.avatar_url ? (
                  <img src={e.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                    {e.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="flex-1 text-sm font-medium truncate">{e.name}</span>
                <span className="font-black text-sm tabular-nums" style={{ color: 'var(--accent)' }}>{e.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/" className="text-sm opacity-50 hover:opacity-100 transition-opacity">
        ← Voltar para o início
      </Link>
    </div>
  );
}
