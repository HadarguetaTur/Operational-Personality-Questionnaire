'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuoteDocument } from '@/components/quotes/QuoteDocument';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight,
  Copy,
  Download,
  Eye,
  FileSignature,
  GripVertical,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Save,
  Send,
  Trash2,
  Link as LinkIcon,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  QUOTE_STATUS_LABELS,
  UNIT_LABELS,
  type LineItem,
  type QuoteRow,
  type QuoteSettings,
  type QuoteSignature,
  type ScopeItem,
} from '@/lib/quotes/types';
import { computeTotals, formatDateHe, formatIls } from '@/lib/quotes/math';

interface LoadResponse {
  quote: QuoteRow;
  signature: QuoteSignature | null;
  settings: QuoteSettings;
  publicUrl: string | null;
  paymentUrl: string | null;
}

type Form = Pick<
  QuoteRow,
  | 'title'
  | 'client_name'
  | 'client_business'
  | 'client_email'
  | 'client_phone'
  | 'intro'
  | 'scope_items'
  | 'line_items'
  | 'discount_amount'
  | 'vat_rate'
  | 'payment_terms'
  | 'timeline'
  | 'terms'
  | 'valid_until'
  | 'ai_summary'
>;

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  sent: 'default',
  viewed: 'warning',
  signed: 'success',
  paid: 'success',
  declined: 'destructive',
  expired: 'destructive',
};

/** /admin/leads/[leadId]/quote/[quoteId] — edit, preview, send, track. */
export default function QuoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const quoteId = params.quoteId as string;

  const [data, setData] = useState<LoadResponse | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ publicUrl: string; whatsappText: string; emailed: boolean; emailError: string | null } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/quotes/${quoteId}`, { credentials: 'include', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'ההצעה לא נמצאה');
      setLoading(false);
      return;
    }
    const d = json as LoadResponse;
    setData(d);
    setForm(pickForm(d.quote));
    setSendTo(d.quote.client_email ?? '');
    setDirty(false);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    load();
  }, [load]);

  const locked = data?.quote.status === 'signed' || data?.quote.status === 'paid';
  const totals = useMemo(
    () => (form ? computeTotals(form.line_items, form.discount_amount, form.vat_rate) : null),
    [form],
  );

  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    if (!form) return false;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          client_email: form.client_email || null,
          valid_until: form.valid_until || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'השמירה נכשלה');
        return false;
      }
      setData((prev) => (prev ? { ...prev, quote: json.quote } : prev));
      setDirty(false);
      toast.success('נשמר');
      return true;
    } catch {
      toast.error('שגיאת רשת');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openSend = async () => {
    if (dirty) {
      const ok = await save();
      if (!ok) return;
    }
    setSendResult(null);
    setSendOpen(true);
  };

  const doSend = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail, to: sendEmail && sendTo ? sendTo : undefined, message: sendMsg || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'השליחה נכשלה');
        return;
      }
      setSendResult(json);
      if (json.emailed) toast.success('ההצעה נשלחה במייל');
      else if (json.emailError) toast.warning(`הקישור נוצר, אבל המייל לא נשלח: ${json.emailError}`);
      else toast.success('הקישור מוכן');
      await load();
    } catch {
      toast.error('שגיאת רשת');
    } finally {
      setSending(false);
    }
  };

  const duplicate = async () => {
    const res = await fetch(`/api/admin/quotes/${quoteId}/duplicate`, { method: 'POST', credentials: 'include' });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? 'השכפול נכשל');
    toast.success('נוצרה טיוטה חדשה');
    router.push(`/admin/leads/${leadId}/quote/${json.quoteId}`);
  };

  const setStatus = async (status: 'draft' | 'declined' | 'expired') => {
    const res = await fetch(`/api/admin/quotes/${quoteId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? 'עדכון הסטטוס נכשל');
    toast.success('הסטטוס עודכן');
    load();
  };

  const remove = async () => {
    if (!window.confirm('למחוק את הטיוטה?')) return;
    const res = await fetch(`/api/admin/quotes/${quoteId}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? 'המחיקה נכשלה');
    toast.success('הטיוטה נמחקה');
    router.push(`/admin/leads/${leadId}`);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} הועתק`);
    } catch {
      toast.error('ההעתקה נכשלה');
    }
  };

  if (loading || !data || !form || !totals) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> טוען...
      </div>
    );
  }

  const { quote, settings, signature, publicUrl } = data;
  const previewQuote = { ...quote, ...form };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button onClick={() => router.push('/admin/leads')} className="hover:text-gray-700">לידים</button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <button onClick={() => router.push(`/admin/leads/${leadId}`)} className="hover:text-gray-700">{quote.client_name ?? 'ליד'}</button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span className="font-medium text-gray-900">הצעה Q-{quote.quote_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileSignature className="w-7 h-7 text-brand-500" />
            הצעה Q-{quote.quote_number}
            <Badge variant={statusVariant[quote.status] ?? 'secondary'}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
            {locked ? <Lock className="w-4 h-4 text-gray-400" /> : null}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            נוצרה {formatDateHe(quote.created_at)}
            {quote.sent_at ? ` · נשלחה ${formatDateHe(quote.sent_at)}` : ''}
            {quote.viewed_at ? ` · נצפתה ${formatDateHe(quote.viewed_at)}` : ''}
            {quote.signed_at ? ` · נחתמה ${formatDateHe(quote.signed_at)}` : ''}
            {quote.paid_at ? ` · שולמה ${formatDateHe(quote.paid_at)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/api/admin/quotes/${quoteId}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" /> PDF{locked ? ' חתום' : ''}
            </Button>
          </a>
          {publicUrl ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(publicUrl, 'הקישור')}>
              <LinkIcon className="w-4 h-4" /> העתק קישור
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={duplicate}>
            <Copy className="w-4 h-4" /> שכפל
          </Button>
          {!locked ? (
            <>
              <Button size="sm" variant="outline" onClick={save} disabled={saving || !dirty} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמור
              </Button>
              <Button size="sm" onClick={openSend} disabled={saving} className="gap-1.5 bg-brand-600 hover:bg-brand-700">
                <Send className="w-4 h-4" /> {quote.status === 'draft' ? 'שלח ללקוח' : 'שלח שוב'}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {quote.ai_summary && !locked ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <b>הערת ה-AI לפני שליחה:</b> {quote.ai_summary}
        </div>
      ) : null}

      {signature ? (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><span className="text-gray-500 block">חתם/ה</span><b>{signature.signer_name}</b></div>
            <div><span className="text-gray-500 block">מועד</span>{formatDateHe(signature.signed_at)}</div>
            <div><span className="text-gray-500 block">אימייל</span><span dir="ltr">{signature.signer_email ?? '-'}</span></div>
            <div><span className="text-gray-500 block">IP</span><span dir="ltr">{signature.ip ?? '-'}</span></div>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['edit', 'preview'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t === 'edit' ? 'עריכה' : 'תצוגה מקדימה'}
          </button>
        ))}
      </div>

      {tab === 'preview' ? (
        <div className="bg-gray-100 rounded-2xl p-3 sm:p-6">
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <QuoteDocument quote={previewQuote} settings={settings} signature={locked ? signature : null} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-lg">כותרת ולקוח</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="כותרת ההצעה">
                  <Input value={form.title} onChange={(e) => update('title', e.target.value)} disabled={locked} />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="שם הלקוח/ה"><Input value={form.client_name ?? ''} onChange={(e) => update('client_name', e.target.value)} disabled={locked} /></Field>
                  <Field label="שם העסק"><Input value={form.client_business ?? ''} onChange={(e) => update('client_business', e.target.value)} disabled={locked} /></Field>
                  <Field label="אימייל"><Input dir="ltr" value={form.client_email ?? ''} onChange={(e) => update('client_email', e.target.value)} disabled={locked} /></Field>
                  <Field label="טלפון"><Input dir="ltr" value={form.client_phone ?? ''} onChange={(e) => update('client_phone', e.target.value)} disabled={locked} /></Field>
                </div>
                <Field label="פתיח (מה הבנתי ומה המטרה)">
                  <Textarea rows={4} value={form.intro ?? ''} onChange={(e) => update('intro', e.target.value)} disabled={locked} />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">מה כולל הפרויקט</CardTitle>
                {!locked ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => update('scope_items', [...form.scope_items, { title: '', description: '' }])}>
                    <Plus className="w-4 h-4" /> סעיף
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {form.scope_items.length === 0 ? <p className="text-sm text-gray-400">אין סעיפים.</p> : null}
                {form.scope_items.map((s, i) => (
                  <ScopeRow
                    key={i}
                    item={s}
                    disabled={locked}
                    onChange={(next) => update('scope_items', form.scope_items.map((x, j) => (j === i ? next : x)))}
                    onRemove={() => update('scope_items', form.scope_items.filter((_, j) => j !== i))}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">תמחור</CardTitle>
                {!locked ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => update('line_items', [...form.line_items, { title: '', description: '', qty: 1, unit: 'project', unit_price: 0 }])}>
                    <Plus className="w-4 h-4" /> שורה
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                {form.line_items.map((li, i) => (
                  <LineRow
                    key={i}
                    item={li}
                    disabled={locked}
                    onChange={(next) => update('line_items', form.line_items.map((x, j) => (j === i ? next : x)))}
                    onRemove={() => update('line_items', form.line_items.filter((_, j) => j !== i))}
                  />
                ))}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                  <Field label="הנחה (₪)">
                    <Input type="number" min={0} value={form.discount_amount} onChange={(e) => update('discount_amount', Number(e.target.value) || 0)} disabled={locked} />
                  </Field>
                  <Field label="מע״מ (%)">
                    <Input type="number" min={0} max={100} value={form.vat_rate} onChange={(e) => update('vat_rate', Number(e.target.value) || 0)} disabled={locked} />
                  </Field>
                  <div className="col-span-2 text-sm bg-gray-50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">סכום ביניים</span><span dir="ltr">{formatIls(totals.subtotal)}</span></div>
                    {totals.discount_amount > 0 ? <div className="flex justify-between"><span className="text-gray-500">הנחה</span><span dir="ltr">-{formatIls(totals.discount_amount)}</span></div> : null}
                    <div className="flex justify-between"><span className="text-gray-500">מע״מ</span><span dir="ltr">{formatIls(totals.vat_amount)}</span></div>
                    <div className="flex justify-between font-bold text-base pt-1 border-t"><span>סה״כ</span><span dir="ltr">{formatIls(totals.total)}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">לו״ז ותנאים</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="לו״ז"><Textarea rows={2} value={form.timeline ?? ''} onChange={(e) => update('timeline', e.target.value)} disabled={locked} /></Field>
                <Field label="תנאי תשלום"><Textarea rows={2} value={form.payment_terms ?? ''} onChange={(e) => update('payment_terms', e.target.value)} disabled={locked} /></Field>
                <Field label="תנאים כלליים"><Textarea rows={5} value={form.terms ?? ''} onChange={(e) => update('terms', e.target.value)} disabled={locked} /></Field>
                <Field label="בתוקף עד">
                  <Input type="date" value={form.valid_until ?? ''} onChange={(e) => update('valid_until', e.target.value || null)} disabled={locked} className="max-w-[200px]" />
                </Field>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-lg">פעולות</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setTab('preview')}>
                  <Eye className="w-4 h-4" /> תצוגה מקדימה
                </Button>
                {publicUrl ? (
                  <>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="w-full justify-start gap-2"><LinkIcon className="w-4 h-4" /> פתח את דף הלקוח</Button>
                    </a>
                  </>
                ) : null}
                {!locked && quote.status !== 'draft' ? (
                  <Select onValueChange={(v) => setStatus(v as 'draft' | 'declined' | 'expired')}>
                    <SelectTrigger><SelectValue placeholder="שנה סטטוס..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">חזרה לטיוטה</SelectItem>
                      <SelectItem value="declined">נדחתה</SelectItem>
                      <SelectItem value="expired">פג תוקף</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                {quote.status === 'draft' ? (
                  <Button variant="outline" className="w-full justify-start gap-2 text-red-600 hover:text-red-700" onClick={remove}>
                    <Trash2 className="w-4 h-4" /> מחק טיוטה
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {quote.interview_transcript?.length ? (
              <Card>
                <CardHeader><CardTitle className="text-lg">תמליל הראיון</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[28rem] overflow-y-auto text-sm">
                    {quote.interview_transcript.map((m, i) => (
                      <div key={i} className={`rounded-lg px-3 py-2 whitespace-pre-wrap ${m.role === 'user' ? 'bg-brand-50 text-brand-900' : 'bg-gray-50 text-gray-700'}`}>
                        <span className="text-[11px] text-gray-400 block">{m.role === 'user' ? 'הדר' : 'העוזרת'}</span>
                        {m.content}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent dir="rtl" className="text-right max-w-xl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>שליחת ההצעה ללקוח</DialogTitle>
            <DialogDescription>
              נוצר קישור אישי לצפייה, הורדה וחתימה. אפשר לשלוח במייל מהמערכת ו/או להעתיק הודעה מוכנה לוואטסאפ.
            </DialogDescription>
          </DialogHeader>

          {!sendResult ? (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="w-4 h-4 accent-[#5B3FC4]" />
                לשלוח במייל (עם PDF מצורף)
              </label>
              {sendEmail ? (
                <Field label="לכתובת">
                  <Input dir="ltr" type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="client@email.com" />
                </Field>
              ) : null}
              <Field label="הודעה אישית (אופציונלי)">
                <Textarea rows={3} value={sendMsg} onChange={(e) => setSendMsg(e.target.value)} placeholder="כמה מילים אישיות שיופיעו בתחילת המייל/ההודעה..." />
              </Field>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button onClick={doSend} disabled={sending || (sendEmail && !sendTo)} className="gap-2 bg-brand-600 hover:bg-brand-700">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'יוצר PDF ושולח...' : sendEmail ? 'שלח' : 'צור קישור'}
                </Button>
                <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>ביטול</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-lg p-3 text-sm ${sendResult.emailed ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-900'}`}>
                {sendResult.emailed ? (
                  <span className="inline-flex items-center gap-1"><Mail className="w-4 h-4" /> המייל נשלח.</span>
                ) : sendResult.emailError ? (
                  <>המייל לא נשלח ({sendResult.emailError}). הקישור מוכן לשליחה ידנית.</>
                ) : (
                  <>הקישור מוכן לשליחה ידנית.</>
                )}
              </div>
              <Field label="קישור לדף הלקוח">
                <div className="flex gap-2">
                  <Input dir="ltr" readOnly value={sendResult.publicUrl} />
                  <Button variant="outline" onClick={() => copy(sendResult.publicUrl, 'הקישור')}><Copy className="w-4 h-4" /></Button>
                </div>
              </Field>
              <Field label="הודעה מוכנה לוואטסאפ">
                <Textarea readOnly rows={7} value={sendResult.whatsappText} className="text-sm" />
              </Field>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button onClick={() => copy(sendResult.whatsappText, 'הטקסט')} className="gap-2">
                  <MessageCircle className="w-4 h-4" /> העתק הודעה לוואטסאפ
                </Button>
                {quote.client_phone ? (
                  <a
                    href={`https://wa.me/${toIntl(quote.client_phone)}?text=${encodeURIComponent(sendResult.whatsappText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="gap-2"><MessageCircle className="w-4 h-4" /> פתח בוואטסאפ</Button>
                  </a>
                ) : null}
                <Button variant="outline" onClick={() => setSendOpen(false)}>סגור</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function pickForm(q: QuoteRow): Form {
  return {
    title: q.title,
    client_name: q.client_name ?? '',
    client_business: q.client_business ?? '',
    client_email: q.client_email ?? '',
    client_phone: q.client_phone ?? '',
    intro: q.intro ?? '',
    scope_items: q.scope_items ?? [],
    line_items: q.line_items ?? [],
    discount_amount: Number(q.discount_amount) || 0,
    vat_rate: Number(q.vat_rate) || 0,
    payment_terms: q.payment_terms ?? '',
    timeline: q.timeline ?? '',
    terms: q.terms ?? '',
    valid_until: q.valid_until ?? '',
    ai_summary: q.ai_summary ?? '',
  };
}

function toIntl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ScopeRow({ item, disabled, onChange, onRemove }: { item: ScopeItem; disabled: boolean; onChange: (n: ScopeItem) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-start rounded-lg border border-gray-100 p-3">
      <GripVertical className="w-4 h-4 text-gray-300 mt-2.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <Input placeholder="כותרת הסעיף" value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} disabled={disabled} />
        <Textarea placeholder="מה כלול" rows={2} value={item.description ?? ''} onChange={(e) => onChange({ ...item, description: e.target.value })} disabled={disabled} />
      </div>
      {!disabled ? (
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600 p-1 mt-1" title="הסר">
          <Trash2 className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}

function LineRow({ item, disabled, onChange, onRemove }: { item: LineItem; disabled: boolean; onChange: (n: LineItem) => void; onRemove: () => void }) {
  const total = (Number(item.qty) || 0) * (Number(item.unit_price) || 0);
  return (
    <div className="rounded-lg border border-gray-100 p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <Input placeholder="שם הפריט" value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} disabled={disabled} />
          <Textarea placeholder="תיאור קצר" rows={2} value={item.description ?? ''} onChange={(e) => onChange({ ...item, description: e.target.value })} disabled={disabled} />
        </div>
        {!disabled ? (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600 p-1 mt-1" title="הסר">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <Field label="כמות"><Input type="number" min={0} step="0.5" value={item.qty} onChange={(e) => onChange({ ...item, qty: Number(e.target.value) || 0 })} disabled={disabled} /></Field>
        <Field label="יחידה">
          <Select value={item.unit ?? 'project'} onValueChange={(v) => onChange({ ...item, unit: v })} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(UNIT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="מחיר ליח׳ (לפני מע״מ)"><Input type="number" min={0} value={item.unit_price} onChange={(e) => onChange({ ...item, unit_price: Number(e.target.value) || 0 })} disabled={disabled} /></Field>
        <div className="text-sm text-gray-700 pb-2.5">
          <span className="text-gray-500 block text-xs">סה״כ שורה</span>
          <b dir="ltr">{formatIls(total)}</b>
        </div>
      </div>
    </div>
  );
}
