import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          width: 130,
          height: 130,
          background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ fontSize: 105 }}>⚽</div>
      </div>
    ),
    { ...size }
  );
}
