'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSignature, Plus } from 'lucide-react';
import { QUOTE_STATUS_LABELS, type QuoteStatus } from '@/lib/quotes/types';
import { formatDateHe, formatIls } from '@/lib/quotes/math';

interface Row {
  id: string;
  quote_number: number;
  status: QuoteStatus;
  title: string;
  total: number;
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

/** "הצעות מחיר" card on the lead detail page. */
export function LeadQuotesCard({ leadId }: { leadId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('quotes')
      .select('id, quote_number, status, title, total, created_at, sent_at, signed_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as Row[]);
  }, [supabase, leadId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-brand-600" />
          הצעות מחיר {rows.length ? `(${rows.length})` : ''}
        </CardTitle>
        <Link href={`/admin/leads/${leadId}/quote/new`}>
          <Button size="sm" className="gap-1.5 bg-brand-600 hover:bg-brand-700">
            <Plus className="w-4 h-4" /> הצעת מחיר חדשה
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400">
            עדיין אין הצעות לליד הזה. לחצי על &quot;הצעת מחיר חדשה&quot; — העוזרת תראיין אותך ותנסח טיוטה.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100">
                <div className="min-w-0">
                  <Link href={`/admin/leads/${leadId}/quote/${r.id}`} className="font-medium text-brand-700 hover:underline">
                    Q-{r.quote_number} · {r.title}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDateHe(r.created_at)}
                    {r.sent_at ? ` · נשלחה ${formatDateHe(r.sent_at)}` : ''}
                    {r.signed_at ? ` · נחתמה ${formatDateHe(r.signed_at)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium" dir="ltr">{formatIls(Number(r.total))}</span>
                  <Badge variant={statusVariant[r.status]}>{QUOTE_STATUS_LABELS[r.status]}</Badge>
                  <a href={`/api/admin/quotes/${r.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-700 p-1" title="הורד PDF">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
