import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Architecture of Scale — אבחון ניהולי';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(145deg, #0c1220 0%, #111827 45%, #0f1729 100%)',
          padding: 48,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2dd4bf 0%, #10b981 100%)',
            }}
          />
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Architecture of Scale
          </span>
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: 900,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          אבחון ניהולי ב-5 דקות
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 26,
            color: 'rgba(255,255,255,0.55)',
            textAlign: 'center',
            maxWidth: 800,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          דוח מותאם אישית עם תמונת מצב, חוזקות וסיכוני צמיחה
        </div>
      </div>
    ),
    { ...size }
  );
}
