'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Activity, RefreshCw } from 'lucide-react';

interface ManyChatEvent {
  id: string;
  lead_uuid: string;
  subscriber_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  process_status: 'pending' | 'processing' | 'done' | 'error';
  process_error: string | null;
  received_at: string;
  created_at: string;
}

function StatusBadge({ status }: { status: ManyChatEvent['process_status'] }) {
  const map: Record<string, { variant: 'warning' | 'success' | 'destructive' | 'secondary'; label: string }> = {
    pending:    { variant: 'warning',     label: 'ממתין'   },
    processing: { variant: 'secondary',   label: 'מעובד'   },
    done:       { variant: 'success',     label: 'הושלם'   },
    error:      { variant: 'destructive', label: 'שגיאה'   },
  };
  const { variant, label } = map[status] ?? { variant: 'outline' as const, label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function short(str: string | null | undefined, len = 10): string {
  if (!str) return '—';
  return str.length <= len ? str : str.slice(0, len) + '…';
}

export default function BotEventsPage() {
  const [events, setEvents] = useState<ManyChatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('manychat_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50);

    if (err) {
      setError(err.message);
    } else {
      setError(null);
      setEvents((data ?? []) as ManyChatEvent[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, load]);

  return (
    <div className="space-y-6 p-6 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-7 h-7 text-teal-600 flex-shrink-0" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bot Events</h1>
            <p className="text-sm text-gray-500 mt-0.5">אירועי Webhook מ-ManyChat — 50 אחרונים</p>
          </div>
          {!loading && (
            <Badge variant="secondary" className="text-sm font-bold px-3 py-1">
              {events.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded accent-teal-600"
            />
            רענון אוטומטי (5 שניות)
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm"
        >
          שגיאה בטעינה: {error}
        </div>
      )}

      {/* Events table */}
      <Card>
        <CardHeader>
          <CardTitle>אירועים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              אין אירועים עדיין. בדקי שה-Webhook מחובר ב-ManyChat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-right text-gray-600">
                    <th className="py-3 px-4 font-medium whitespace-nowrap">זמן</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">סוג אירוע</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">subscriber_id</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">lead_uuid</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">סטטוס</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr
                      key={ev.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap tabular-nums">
                        {formatTime(ev.received_at)}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 font-mono">
                          {ev.event_type}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                        {short(ev.subscriber_id)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                        {short(ev.lead_uuid)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ev.process_status} />
                        {ev.process_error && (
                          <p
                            className="text-xs text-rose-600 mt-1 max-w-[160px] truncate"
                            title={ev.process_error}
                          >
                            {ev.process_error}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              הצג
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl" dir="rtl">
                            <DialogHeader>
                              <DialogTitle className="text-right">
                                Payload —{' '}
                                <code className="text-sm font-mono">{ev.event_type}</code>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="mt-1 text-xs text-gray-500 text-right space-x-2 space-x-reverse">
                              <span>
                                <span className="font-medium">ID:</span> {ev.id}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span>
                                <span className="font-medium">התקבל:</span>{' '}
                                {formatTime(ev.received_at)}
                              </span>
                            </div>
                            <pre className="mt-3 bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto max-h-[60vh] text-left whitespace-pre-wrap break-words font-mono leading-relaxed">
                              {JSON.stringify(ev.payload, null, 2)}
                            </pre>
                          </DialogContent>
                        </Dialog>
                      </td>
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
