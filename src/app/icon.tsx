import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          width: 380,
          height: 380,
          background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ fontSize: 300 }}>⚽</div>
      </div>
    ),
    { ...size }
  );
}
