import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #9C87EC 0%, #7B61E8 100%)',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
