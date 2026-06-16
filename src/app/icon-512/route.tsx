import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Margem extra de segurança para ícones "maskable" (Android recorta em círculo/quadrado arredondado) */}
        <div style={{
          position: 'absolute',
          width: 380,
          height: 380,
          background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ fontSize: 280 }}>⚽</div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
