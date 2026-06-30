import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { getSiteUrl } from '@/lib/site';

const ogTitle = 'איפה הכסף? – הדר תורג׳מן';
const ogDescription =
  'בדיקה קצרה שמראה איפה הכסף והזמן נוזלים בניהול הידני של העסק שלך, ואיפה הכי נכון להתחיל לעשות סדר.';
const ogImage =
  'https://res.cloudinary.com/wecare-img/image/upload/w_1200,h_630,c_fill,q_auto,f_jpg/v1779653243/ChatGPT_Image_May_24_2026_10_54_20_PM_q9pb1p.png';

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: 'Hadar Turgeman',
  description: 'מערכת ניהול משפכים, דיוור מותאם אישית ואבחון ניהולי',
  openGraph: {
    type: 'website',
    title: ogTitle,
    description: ogDescription,
    locale: 'he_IL',
    siteName: 'הדר תורג׳מן',
    url: '/',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: ogTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: ogTitle,
    description: ogDescription,
    images: [ogImage],
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/icon', type: 'image/png' }],
  },
};

const ga4Id = process.env.NEXT_PUBLIC_GA4_ID?.trim();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-heebo">
        {ga4Id ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4Id}', { anonymize_ip: true });`}
            </Script>
          </>
        ) : null}
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','1496744514989274');
fbq('track','PageView');`}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1496744514989274&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
