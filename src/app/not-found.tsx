'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'countdown' | 'playing' | 'gameover';
type Dir = 'up' | 'down' | 'left' | 'right';
interface RankEntry { name: string; score: number; avatar_url: string | null }
interface CaptchaChallenge { a: number; b: number; answer: number }

// ─── Constants ───────────────────────────────────────────────────────────────

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };
const KEY_MAP: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

// Anti-macro thresholds
const MIN_HUMAN_REACTION_MS = 150; // below this = physically impossible for a human
const MACRO_STDDEV_THRESHOLD = 18;  // ms — suspiciously consistent timing
const REACTION_SAMPLE_SIZE = 8;     // how many hits before evaluating variance
// Honeypot duration varies randomly so a macro can't learn a fixed threshold to skip
const HONEYPOT_MIN_MS = 1;
const HONEYPOT_MAX_MS = 2;

function rnd(): Dir { return DIRS[Math.floor(Math.random() * 4)]; }
function rndExcept(exclude: Dir): Dir {
  const opts = DIRS.filter(d => d !== exclude);
  return opts[Math.floor(Math.random() * opts.length)];
}

function winMs(score: number): number {
  if (score < 10) return 2500;
  return Math.max(750, 2500 - (score - 10) * 50);
}

function stdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function randomDistortion() {
  return {
    rotate: (Math.random() - 0.5) * 16,        // ±8° — readable but unpredictable
    blur: 0.4 + Math.random() * 0.7,            // 0.4–1.1px
    skewX: (Math.random() - 0.5) * 14,          // ±7°
  };
}

function makeCaptcha(): CaptchaChallenge {
  const a = Math.floor(Math.random() * 9) + 1; // 1–9
  const b = Math.floor(Math.random() * (10 - a)) + 1; // 1–(10-a), so sum ≤ 10
  return { a, b, answer: a + b };
}

// ─── Captcha Modal ───────────────────────────────────────────────────────────

function CaptchaModal({
  challenge,
  onConfirm,
}: {
  challenge: CaptchaChallenge;
  onConfirm: () => void;
}) {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(input) === challenge.answer) {
      onConfirm();
    } else {
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[var(--bg-card,#1e293b)] p-8 shadow-2xl flex flex-col items-center gap-6"
        style={{ animation: shake ? 'captcha-shake 0.4s ease' : undefined }}
      >
        <style>{`
          @keyframes captcha-shake {
            0%,100% { transform: translateX(0); }
            20%      { transform: translateX(-10px); }
            40%      { transform: translateX(10px); }
            60%      { transform: translateX(-6px); }
            80%      { transform: translateX(6px); }
          }
        `}</style>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-3xl">
          🤖
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-black">Detectamos algo incomum</h2>
          <p className="text-sm opacity-60 leading-relaxed">
            Seu timing está suspeitosamente perfeito.<br />
            Confirme que você é humano:
          </p>
        </div>

        {/* Challenge */}
        <div className="text-4xl font-black tracking-wider">
          {challenge.a} + {challenge.b} = ?
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full text-center text-2xl font-black rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="?"
            min={1}
            max={20}
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-black text-base hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)', color: '#0f172a' }}
          >
            Confirmar
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
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
      <circle cx={112} cy={184} r={9} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M105 180 Q112 176 119 180" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <path d="M104 184 Q112 188 120 184" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <circle cx={80} cy={40} r={16} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx={75} cy={38} r={2} fill="currentColor" />
      <circle cx={85} cy={38} r={2} fill="currentColor" />
      <path d="M75 48 Q80 53 85 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1={80} y1={56} x2={80} y2={128} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={76} x2={56} y2={115} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={76} x2={104} y2={115} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={128} x2={64} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={64} y1={178} x2={48} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={128} x2={96} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={96} y1={178} x2={112} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Animated stick figure (playing) ─────────────────────────────────────────

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
        @keyframes spin360 { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
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
      <g style={{ animation: `boneco-ball ${ms}ms ease-in-out infinite` }}>
        <circle cx={112} cy={184} r={9} fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M105 180 Q112 176 119 180" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <path d="M104 184 Q112 188 120 184" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      </g>
      <circle cx={80} cy={40} r={16} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx={75} cy={38} r={2} fill="currentColor" />
      <circle cx={85} cy={38} r={2} fill="currentColor" />
      <path d="M75 48 Q80 53 85 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1={80} y1={56} x2={80} y2={128} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={76} x2={54} y2={110} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={76} x2={106} y2={110} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={80} y1={128} x2={64} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={64} y1={178} x2={48} y2={178} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <g style={{ transformOrigin: '80px 128px', animation: `boneco-kick ${ms}ms ease-in-out infinite` }}>
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
  const [distortion, setDistortion] = useState({ rotate: 0, blur: 0, skewX: 0 });

  // Anti-macro state
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const captchaScoreRef = useRef(0);
  const arrowSpawnedAtRef = useRef<number>(0);
  const reactionTimesRef = useRef<number[]>([]);

  // Honeypot refs
  const honeypotActiveRef = useRef(false);  // true during the brief fake-arrow flash
  const honeypotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const scoreRef = useRef(0);
  const dirRef = useRef<Dir | null>(null);
  const tlRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinningRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (honeypotTimerRef.current) { clearTimeout(honeypotTimerRef.current); honeypotTimerRef.current = null; }
    honeypotActiveRef.current = false;
  }, []);

  useEffect(() => {
    fetch('/api/embaixadinhas').then(r => r.ok ? r.json() : []).then(setRanking).catch(() => {});
  }, []);

  // ── Macro detection ────────────────────────────────────────────────────────

  // Returns true if the reaction time looks like a macro
  const checkMacro = useCallback((reactionMs: number): boolean => {
    // Floor: no human can react this fast
    if (reactionMs < MIN_HUMAN_REACTION_MS) return true;

    // Variance: collect samples, evaluate after enough hits
    const times = reactionTimesRef.current;
    times.push(reactionMs);
    if (times.length > REACTION_SAMPLE_SIZE * 2) times.shift(); // rolling window

    if (times.length >= REACTION_SAMPLE_SIZE) {
      const sd = stdDev(times);
      if (sd < MACRO_STDDEV_THRESHOLD) return true;
    }

    return false;
  }, []);

  // ── Arrow spawning ─────────────────────────────────────────────────────────

  const spawnArrow = useCallback((currentScore: number) => {
    stopTimer();

    // Pick the real direction and a different honeypot direction
    const realDir = rnd();
    const fakeDir = rndExcept(realDir);

    // Phase 1 — show fake arrow with its own distortion
    dirRef.current = null;
    honeypotActiveRef.current = true;
    setCurrentDir(fakeDir);
    setDistortion(randomDistortion());

    const ms = winMs(currentScore);
    const level = Math.round((2500 / ms) * 10) / 10;
    setSpeedLevel(Math.min(5, level));

    // Phase 2 — after honeypot window, reveal real arrow and start timer
    const honeypotMs = HONEYPOT_MIN_MS + Math.random() * (HONEYPOT_MAX_MS - HONEYPOT_MIN_MS);
    honeypotTimerRef.current = setTimeout(() => {
      honeypotActiveRef.current = false;
      dirRef.current = realDir;
      setCurrentDir(realDir);
      setDistortion(randomDistortion()); // new distortion for the real arrow
      tlRef.current = 1;
      setTimeLeft(1);
      arrowSpawnedAtRef.current = performance.now();

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
    }, honeypotMs);
  }, [stopTimer]);

  // ── Resume after captcha — countdown then pick up at same score/speed ──────

  const resumeAfterCaptcha = useCallback((resumeScore: number) => {
    reactionTimesRef.current = []; // reset sample window — fresh start
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
        spawnArrow(resumeScore);
      }
    }, 900);
  }, [spawnArrow]);

  // ── Input handling ─────────────────────────────────────────────────────────

  const triggerCaptcha = useCallback((resumeScore: number) => {
    stopTimer();
    phaseRef.current = 'countdown'; // block further input
    setPhase('countdown');
    captchaScoreRef.current = resumeScore;
    setCaptcha(makeCaptcha());
  }, [stopTimer]);

  const handleDir = useCallback((dir: Dir) => {
    if (phaseRef.current !== 'playing') return;

    // ── Honeypot: any keypress during the fake-arrow flash = macro ──────────
    if (honeypotActiveRef.current) {
      triggerCaptcha(scoreRef.current);
      return;
    }

    if (!dirRef.current) return; // still in feedback delay, not honeypot

    stopTimer();

    if (dir === dirRef.current) {
      const reactionMs = performance.now() - arrowSpawnedAtRef.current;
      const ns = scoreRef.current + 1;
      scoreRef.current = ns;
      setScore(ns);
      setFeedback('hit');

      const isMacro = checkMacro(reactionMs);

      setTimeout(() => {
        setFeedback(null);
        if (phaseRef.current !== 'playing') return;
        if (isMacro) {
          triggerCaptcha(ns);
        } else {
          spawnArrow(ns);
        }
      }, 200);
    } else {
      setFeedback('miss');
      phaseRef.current = 'gameover';
      setTimeout(() => { setFeedback(null); setPhase('gameover'); }, 550);
    }
  }, [spawnArrow, stopTimer, checkMacro, triggerCaptcha]);

  // ── Captcha confirmed ──────────────────────────────────────────────────────

  const handleCaptchaConfirm = useCallback(() => {
    setCaptcha(null);
    resumeAfterCaptcha(captchaScoreRef.current);
  }, [resumeAfterCaptcha]);

  // ── New game ───────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    stopTimer();
    setScore(0); scoreRef.current = 0;
    setFeedback(null);
    setSpeedLevel(1);
    reactionTimesRef.current = [];
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

  // ── Save score ─────────────────────────────────────────────────────────────

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

  // ── Keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (captcha) return; // modal open — ignore game keys
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
  }, [handleDir, captcha]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const animMs = winMs(score);
  const figureColor = feedback === 'hit' ? 'var(--accent)' : feedback === 'miss' ? '#ef4444' : 'currentColor';

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 px-4 py-10">

      {/* Captcha modal */}
      {captcha && <CaptchaModal challenge={captcha} onConfirm={handleCaptchaConfirm} />}

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
                <span className="text-xs opacity-40 uppercase tracking-widest">
                  {captcha === null && score > 0 ? 'voltando...' : 'preparado?'}
                </span>
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
                    filter: feedback ? undefined : `blur(${distortion.blur}px)`,
                    transform: feedback === 'hit'
                      ? 'scale(1.35)'
                      : `rotate(${distortion.rotate}deg) skewX(${distortion.skewX}deg)`,
                    transition: feedback ? 'transform 0.1s, color 0.1s' : 'none',
                  }}
                >
                  {ARROW[currentDir]}
                </div>
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
