'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSignature, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_QUOTE_SETTINGS,
  QUOTE_STATUS_LABELS,
  UNIT_LABELS,
  type CatalogItem,
  type QuoteSettings,
  type QuoteStatus,
} from '@/lib/quotes/types';
import { formatDateHe, formatIls } from '@/lib/quotes/math';

interface QuoteListRow {
  id: string;
  lead_id: string;
  quote_number: number;
  status: QuoteStatus;
  title: string;
  client_name: string | null;
  client_business: string | null;
  total: number;
  valid_until: string | null;
  created_at: string;
  sent_at: string | null;
  signed_at: string | null;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  sent: 'default',
  viewed: 'warning',
  signed: 'success',
  paid: 'success',
  declined: 'destructive',
  expired: 'destructive',
};

/** /admin/quotes — all quotes + price catalog + document settings. */
export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileSignature className="w-7 h-7 text-brand-500" /> הצעות מחיר
        </h1>
        <p className="text-gray-500 mt-1">
          הצעה חדשה נפתחת מכרטיס הליד (לידים ← ליד ← &quot;הצעת מחיר חדשה&quot;).
        </p>
      </div>

      <Tabs defaultValue="list" dir="rtl">
        <TabsList>
          <TabsTrigger value="list">הצעות</TabsTrigger>
          <TabsTrigger value="catalog">קטלוג מחירים</TabsTrigger>
          <TabsTrigger value="settings">הגדרות מסמך</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4"><QuotesList /></TabsContent>
        <TabsContent value="catalog" className="mt-4"><CatalogEditor /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsEditor /></TabsContent>
      </Tabs>
    </div>
  );
}

function QuotesList() {
  const supabase = createClient();
  const [rows, setRows] = useState<QuoteListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('quotes')
      .select('id, lead_id, quote_number, status, title, client_name, client_business, total, valid_until, created_at, sent_at, signed_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status !== 'all') q = q.eq('status', status);
    const { data } = await q;
    setRows((data ?? []) as QuoteListRow[]);
    setLoading(false);
  }, [supabase, status]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = search.trim()
    ? rows.filter((r) =>
        [r.title, r.client_name, r.client_business, `Q-${r.quote_number}`]
          .filter(Boolean)
          .some((s) => (s as string).toLowerCase().includes(search.toLowerCase())),
      )
    : rows;

  const totals = {
    open: rows.filter((r) => ['sent', 'viewed'].includes(r.status)).reduce((s, r) => s + Number(r.total), 0),
    signed: rows.filter((r) => ['signed', 'paid'].includes(r.status)).reduce((s, r) => s + Number(r.total), 0),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="סה״כ הצעות" value={String(rows.length)} />
        <Stat label="פתוחות (נשלחו/נצפו)" value={formatIls(totals.open)} />
        <Stat label="נחתמו/שולמו" value={formatIls(totals.signed)} />
        <Stat label="טיוטות" value={String(rows.filter((r) => r.status === 'draft').length)} />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="חיפוש לפי לקוח, עסק, כותרת או מספר..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(QUOTE_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-gray-500">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <FileSignature className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              אין הצעות עדיין
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">מס׳</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">לקוח</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">כותרת</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">סה״כ</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">סטטוס</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">נוצרה</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">תוקף</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-medium">
                        <Link href={`/admin/leads/${r.lead_id}/quote/${r.id}`} className="text-brand-700 hover:underline">Q-{r.quote_number}</Link>
                      </td>
                      <td className="py-3 px-4">
                        <div>{r.client_name ?? '-'}</div>
                        {r.client_business ? <div className="text-xs text-gray-400">{r.client_business}</div> : null}
                      </td>
                      <td className="py-3 px-4 text-gray-700 max-w-[280px] truncate">{r.title}</td>
                      <td className="py-3 px-4" dir="ltr">{formatIls(Number(r.total))}</td>
                      <td className="py-3 px-4"><Badge variant={statusVariant[r.status]}>{QUOTE_STATUS_LABELS[r.status]}</Badge></td>
                      <td className="py-3 px-4 text-gray-500">{formatDateHe(r.created_at)}</td>
                      <td className="py-3 px-4 text-gray-500">{formatDateHe(r.valid_until)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-900 mt-1" dir="ltr" style={{ textAlign: 'right' }}>{value}</div>
      </CardContent>
    </Card>
  );
}

function CatalogEditor() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/quotes/catalog', { credentials: 'include' });
    const json = await res.json();
    if (res.ok) {
      setItems(
        (json.items as CatalogItem[]).map((it) => ({
          ...it,
          default_price: Number(it.default_price),
          min_price: it.min_price == null ? null : Number(it.min_price),
          max_price: it.max_price == null ? null : Number(it.max_price),
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, p: Partial<CatalogItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const save = async (it: CatalogItem) => {
    setSavingId(it.id);
    const isNew = it.id.startsWith('new-');
    const { id, ...fields } = it;
    const res = await fetch('/api/admin/quotes/catalog', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: isNew ? fields : { id, ...fields } }),
    });
    const json = await res.json();
    setSavingId(null);
    if (!res.ok) return toast.error(json.error ?? 'השמירה נכשלה');
    toast.success('נשמר');
    load();
  };

  const remove = async (it: CatalogItem) => {
    if (it.id.startsWith('new-')) return setItems((prev) => prev.filter((x) => x.id !== it.id));
    if (!window.confirm(`למחוק את "${it.name}"?`)) return;
    const res = await fetch('/api/admin/quotes/catalog', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteId: it.id }),
    });
    if (!res.ok) return toast.error('המחיקה נכשלה');
    toast.success('נמחק');
    load();
  };

  const addNew = () =>
    setItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', description: '', category: '', unit: 'project', default_price: 0, min_price: null, max_price: null, active: true, sort_order: (prev.at(-1)?.sort_order ?? 0) + 10 },
    ]);

  if (loading) return <div className="py-10 text-center text-gray-500">טוען...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">קטלוג שירותים ומחירים</CardTitle>
            <CardDescription>ה-AI מתמחר לפי הרשימה הזו כשלא נקבת בסכום. מחירים לפני מע״מ.</CardDescription>
          </div>
          <Button size="sm" onClick={addNew} className="gap-1"><Plus className="w-4 h-4" /> פריט</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border border-gray-100 p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3 space-y-1"><Label>שם</Label><Input value={it.name} onChange={(e) => patch(it.id, { name: e.target.value })} /></div>
              <div className="md:col-span-2 space-y-1"><Label>קטגוריה</Label><Input value={it.category ?? ''} onChange={(e) => patch(it.id, { category: e.target.value })} /></div>
              <div className="md:col-span-1 space-y-1">
                <Label>יחידה</Label>
                <Select value={it.unit} onValueChange={(v) => patch(it.id, { unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(UNIT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1 space-y-1"><Label>מחיר</Label><Input type="number" value={it.default_price} onChange={(e) => patch(it.id, { default_price: Number(e.target.value) || 0 })} /></div>
              <div className="md:col-span-1 space-y-1"><Label>מינ׳</Label><Input type="number" value={it.min_price ?? ''} onChange={(e) => patch(it.id, { min_price: e.target.value === '' ? null : Number(e.target.value) })} /></div>
              <div className="md:col-span-1 space-y-1"><Label>מקס׳</Label><Input type="number" value={it.max_price ?? ''} onChange={(e) => patch(it.id, { max_price: e.target.value === '' ? null : Number(e.target.value) })} /></div>
              <div className="md:col-span-1 flex items-center gap-2 pb-2"><Switch checked={it.active} onCheckedChange={(v) => patch(it.id, { active: v })} /><span className="text-xs text-gray-500">פעיל</span></div>
              <div className="md:col-span-2 flex gap-1 justify-end pb-0.5">
                <Button size="sm" onClick={() => save(it)} disabled={savingId === it.id || !it.name.trim()} className="gap-1">
                  {savingId === it.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמור
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(it)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
              </div>
              <div className="md:col-span-12 space-y-1"><Label>תיאור (מה כלול)</Label><Textarea rows={2} value={it.description ?? ''} onChange={(e) => patch(it.id, { description: e.target.value })} /></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsEditor() {
  const [s, setS] = useState<QuoteSettings>(DEFAULT_QUOTE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/quotes/catalog', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.settings) setS({ ...DEFAULT_QUOTE_SETTINGS, ...json.settings });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof QuoteSettings>(k: K, v: QuoteSettings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/quotes/catalog', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: s }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(json.error ?? 'השמירה נכשלה');
    toast.success('ההגדרות נשמרו');
  };

  if (loading) return <div className="py-10 text-center text-gray-500">טוען...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">פרטי העסק והתנאים שמודפסים על כל הצעה</CardTitle>
        <CardDescription>הגדרות אלו משפיעות על הצעות חדשות ועל תצוגת ההצעות הקיימות (כותרת, פוטר).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="שם העסק"><Input value={s.business_name} onChange={(e) => set('business_name', e.target.value)} /></F>
          <F label="לוגו (URL)"><Input dir="ltr" value={s.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://..." /></F>
          <F label="סוג מזהה"><Input value={s.business_id_label} onChange={(e) => set('business_id_label', e.target.value)} placeholder="עוסק מורשה / ח.פ." /></F>
          <F label="מספר עוסק / ח.פ."><Input dir="ltr" value={s.business_id} onChange={(e) => set('business_id', e.target.value)} /></F>
          <F label="טלפון"><Input dir="ltr" value={s.phone} onChange={(e) => set('phone', e.target.value)} /></F>
          <F label="אימייל"><Input dir="ltr" value={s.email} onChange={(e) => set('email', e.target.value)} /></F>
          <F label="כתובת"><Input value={s.address} onChange={(e) => set('address', e.target.value)} /></F>
          <div className="grid grid-cols-2 gap-4">
            <F label="מע״מ (%)"><Input type="number" value={s.vat_rate} onChange={(e) => set('vat_rate', Number(e.target.value) || 0)} /></F>
            <F label="תוקף ברירת מחדל (ימים)"><Input type="number" value={s.validity_days} onChange={(e) => set('validity_days', Number(e.target.value) || 14)} /></F>
          </div>
        </div>
        <F label="תנאי תשלום ברירת מחדל"><Textarea rows={2} value={s.default_payment_terms} onChange={(e) => set('default_payment_terms', e.target.value)} /></F>
        <F label="תנאים כלליים ברירת מחדל"><Textarea rows={5} value={s.default_terms} onChange={(e) => set('default_terms', e.target.value)} /></F>
        <F label="נוסח ההסכמה בחתימה"><Textarea rows={2} value={s.signature_consent} onChange={(e) => set('signature_consent', e.target.value)} /></F>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמור הגדרות
        </Button>
      </CardContent>
    </Card>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
