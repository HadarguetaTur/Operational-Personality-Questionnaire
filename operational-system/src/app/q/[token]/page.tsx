'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { QuoteDocument } from '@/components/quotes/QuoteDocument';
import { SignaturePad, type SignaturePadHandle } from '@/components/quotes/SignaturePad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isTurnstileSiteConfigured, TurnstileWidget } from '@/components/security/TurnstileWidget';
import { DEFAULT_QUOTE_SETTINGS, type QuoteRow, type QuoteSettings, type QuoteSignature } from '@/lib/quotes/types';
import { formatDateHe } from '@/lib/quotes/math';
import { CheckCircle2, CreditCard, Download, Eraser, Loader2, PenLine, ShieldCheck } from 'lucide-react';

interface PublicQuoteResponse {
  quote: QuoteRow;
  settings: Partial<QuoteSettings>;
  signature: QuoteSignature | null;
  paymentUrl: string | null;
  canSign: boolean;
}

/**
 * /q/[token] — the client's page: read the quote, download the PDF, sign remotely.
 * No login; access is the unguessable token in the URL.
 */
export default function PublicQuotePage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PublicQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerId, setSignerId] = useState('');
  const [consent, setConsent] = useState(false);
  const [padEmpty, setPadEmpty] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);
  const signRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'ההצעה לא נמצאה');
        return;
      }
      setData(json as PublicQuoteResponse);
      if (json.quote?.client_name && !signerName) setSignerName(json.quote.client_name);
      if (json.quote?.client_email && !signerEmail) setSignerEmail(json.quote.client_email);
    } catch {
      setError('שגיאת רשת, נסו לרענן');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onPadChange = useCallback((empty: boolean) => setPadEmpty(empty), []);

  const handleSign = async () => {
    setSignError(null);
    const png = padRef.current?.toDataUrl();
    if (!signerName.trim() || signerName.trim().length < 2) return setSignError('נא למלא שם מלא');
    if (!consent) return setSignError('יש לאשר את תנאי ההצעה');
    if (!png) return setSignError('נא לחתום במשטח החתימה');
    if (isTurnstileSiteConfigured() && !turnstileToken) return setSignError('ממתין לאימות אבטחה, רגע...');

    setSigning(true);
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(token)}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || null,
          signer_id_number: signerId.trim() || null,
          consent: true,
          signature_png: png,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSignError(json.error ?? 'החתימה נכשלה');
        return;
      }
      setJustSigned(true);
      await load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSignError('שגיאת רשת, נסו שוב');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-32 text-gray-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> טוען את ההצעה...
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-24">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ההצעה לא זמינה</h1>
          <p className="text-gray-500">{error ?? 'הקישור אינו תקין או שפג תוקפו.'}</p>
        </div>
      </Shell>
    );
  }

  const { quote, signature, paymentUrl, canSign } = data;
  const settings: QuoteSettings = { ...DEFAULT_QUOTE_SETTINGS, ...data.settings };
  const isSigned = quote.status === 'signed' || quote.status === 'paid';
  const pdfHref = `/api/quotes/${encodeURIComponent(token)}/pdf`;

  return (
    <Shell>
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-brand-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm text-gray-500">הצעת מחיר Q-{quote.quote_number}</div>
            <div className="font-bold text-gray-900 truncate">{quote.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <a href={pdfHref}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" /> הורדת PDF{isSigned ? ' חתום' : ''}
              </Button>
            </a>
            {canSign ? (
              <Button
                size="sm"
                className="gap-1.5 bg-brand-600 hover:bg-brand-700"
                onClick={() => signRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <PenLine className="w-4 h-4" /> לאישור וחתימה
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-6">
        {justSigned || isSigned ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex gap-4 items-start">
            <CheckCircle2 className="w-7 h-7 text-green-600 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-green-900 text-lg">
                {quote.status === 'paid' ? 'ההצעה נחתמה ושולמה. תודה!' : 'ההצעה אושרה ונחתמה'}
              </div>
              <div className="text-green-800 text-sm mt-1">
                {signature ? `נחתמה על ידי ${signature.signer_name} ב-${formatDateHe(signature.signed_at)}. ` : ''}
                עותק חתום נשלח למייל וזמין להורדה כאן.
              </div>
              {paymentUrl && quote.status !== 'paid' ? (
                <a href={paymentUrl} className="inline-block mt-4">
                  <Button className="gap-2 bg-brand-600 hover:bg-brand-700">
                    <CreditCard className="w-4 h-4" /> למעבר לתשלום מאובטח
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {!canSign && !isSigned ? (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 text-sm">
            {quote.status === 'expired'
              ? 'תוקף ההצעה פג. אפשר לפנות אלינו ונשלח הצעה מעודכנת.'
              : 'ההצעה אינה פעילה כרגע.'}
          </div>
        ) : null}

        {/* The document */}
        <div className="bg-white rounded-2xl shadow-card border border-brand-100 overflow-hidden">
          <QuoteDocument quote={quote} settings={settings} signature={isSigned ? signature : null} />
        </div>

        {/* Signing */}
        {canSign ? (
          <div ref={signRef} className="bg-white rounded-2xl shadow-card border border-brand-200 p-5 sm:p-7 scroll-mt-20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
              <h2 className="text-xl font-bold text-gray-900">אישור וחתימה דיגיטלית</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              מלאו את הפרטים, חתמו באצבע או בעכבר, ולחצו על &quot;אני מאשר/ת וחותם/ת&quot;. עותק חתום יישלח אליכם במייל.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="space-y-1.5">
                <Label htmlFor="sg-name">שם מלא *</Label>
                <Input id="sg-name" value={signerName} onChange={(e) => setSignerName(e.target.value)} autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sg-email">אימייל (לקבלת העותק)</Label>
                <Input id="sg-email" dir="ltr" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sg-id">ת.ז. / ח.פ. (אופציונלי)</Label>
                <Input id="sg-id" dir="ltr" value={signerId} onChange={(e) => setSignerId(e.target.value)} inputMode="numeric" />
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <Label>חתימה *</Label>
                <button
                  type="button"
                  onClick={() => padRef.current?.clear()}
                  className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
                >
                  <Eraser className="w-3.5 h-3.5" /> נקה
                </button>
              </div>
              <div className="h-44 sm:h-52 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/40 relative">
                <SignaturePad ref={padRef} onChange={onPadChange} />
                {padEmpty ? (
                  <div className="absolute inset-0 flex items-center justify-center text-brand-400 text-sm pointer-events-none select-none">
                    חתמו כאן
                  </div>
                ) : null}
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-800 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#5B3FC4]"
              />
              <span>{settings.signature_consent}</span>
            </label>

            {isTurnstileSiteConfigured() ? (
              <div className="mb-4">
                <TurnstileWidget onToken={setTurnstileToken} />
              </div>
            ) : null}

            {signError ? <div className="mb-3 text-sm text-red-600">{signError}</div> : null}

            <Button
              onClick={handleSign}
              disabled={signing}
              size="lg"
              className="w-full sm:w-auto gap-2 bg-brand-600 hover:bg-brand-700 text-base"
            >
              {signing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
              {signing ? 'חותם...' : 'אני מאשר/ת וחותם/ת על ההצעה'}
            </Button>
          </div>
        ) : null}

        <p className="text-center text-xs text-gray-400 pb-6">
          {settings.business_name}
          {settings.phone ? ` · ${settings.phone}` : ''}
          {settings.email ? ` · ${settings.email}` : ''}
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F5FA] font-heebo text-gray-900">
      {children}
    </div>
  );
}
