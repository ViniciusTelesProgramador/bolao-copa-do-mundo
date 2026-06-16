// Pequena animação de confete em canvas, sem dependências externas.
// Usada para celebrar quando o usuário cravar um placar exato (3 pts).

interface Particle {
  x: number;
  y: number;
  r: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
  shape: 'rect' | 'circle';
}

const COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#f87171'];

export function fireConfetti(durationMs = 2200) {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const particles: Particle[] = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    r: 4 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 3,
    rotation: Math.random() * 360,
    vRotation: (Math.random() - 0.5) * 10,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));

  let start: number | null = null;

  function frame(timestamp: number) {
    if (start === null) start = timestamp;
    const elapsed = timestamp - start;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // gravidade
      p.rotation += p.vRotation;

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate((p.rotation * Math.PI) / 180);
      ctx!.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx!.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      } else {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    });

    if (elapsed < durationMs) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
