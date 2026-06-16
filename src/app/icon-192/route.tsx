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
        <div style={{
          position: 'absolute',
          width: 145,
          height: 145,
          background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ fontSize: 115 }}>⚽</div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
