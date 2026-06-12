import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Bolão Copa do Mundo 2026';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          gap: 0,
        }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
        }} />

        {/* Ball */}
        <div style={{ fontSize: 96, marginBottom: 24 }}>⚽</div>

        {/* Title */}
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          letterSpacing: -2,
          lineHeight: 1.1,
        }}>
          BOLÃO COPA 2026
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 30,
          color: '#22c55e',
          marginTop: 20,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          Palpite. Pontue. Vença seus amigos.
        </div>

        {/* URL pill */}
        <div style={{
          marginTop: 40,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 9999,
          padding: '8px 24px',
          color: '#86efac',
          fontSize: 20,
          fontWeight: 600,
        }}>
          bolao-copa-do-mundo-tau.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
