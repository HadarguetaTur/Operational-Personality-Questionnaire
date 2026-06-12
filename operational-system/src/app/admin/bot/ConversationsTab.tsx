'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import { MessageSquare, DollarSign, BarChart2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawMessage {
  lead_uuid: string;
  subscriber_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface LeadRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  conversation_state: string | null;
  conversation_context: Record<string, unknown> | null;
}

interface ConversationFacts {
  pain_category?: string;
  business_type?: string;
  main_challenge?: string;
  temperature?: string;
}

interface ConversationSummary {
  lead_uuid: string;
  subscriber_id: string | null;
  messages: RawMessage[];
  message_count: number;
  started_at: string;
  last_message_at: string;
  total_cost_usd: number;
  total_tokens: number;
  last_state: string;
  lead_name: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  conversation_context: ConversationFacts;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
  initial: 'ראשוני',
  discovery: 'גילוי',
  qualifying: 'מיון',
  pitching: 'הצגה',
  objection: 'התנגדות',
  booking: 'הזמנה',
  closed: 'סגור',
  irrelevant: 'לא רלוונטי',
  escalated: 'הועבר לנציג',
  spam: 'ספאם',
};

type BadgeVariant = 'secondary' | 'warning' | 'destructive' | 'success' | 'outline';

const STATE_VARIANT: Record<string, BadgeVariant> = {
  initial: 'secondary',
  discovery: 'secondary',
  qualifying: 'warning',
  pitching: 'warning',
  objection: 'destructive',
  booking: 'success',
  closed: 'success',
  irrelevant: 'outline',
  escalated: 'destructive',
  spam: 'outline',
};

const ACTION_LABELS: Record<string, string> = {
  continue: 'המשך',
  book_meeting: 'קביעת פגישה',
  mark_irrelevant: 'לא רלוונטי',
  request_followup: 'פולואפ',
  mark_spam: 'ספאם',
  escalate_to_human: 'הועבר לנציג',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  return `$${usd.toFixed(4)}`;
}

function short(str: string | null | undefined, len = 8): string {
  if (!str) return '—';
  return str.length <= len ? str : str.slice(0, len) + '…';
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          {loading ? (
            <div className="h-6 w-16 bg-gray-100 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-bold text-gray-900">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Conversation Thread Dialog ───────────────────────────────────────────────

function ThreadDialog({ conv }: { conv: ConversationSummary }) {
  const facts = conv.conversation_context;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          הצג שיחה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-base">
            {conv.lead_name ?? short(conv.lead_uuid, 13)}
            {conv.lead_phone && (
              <span className="mr-2 text-sm font-normal text-gray-500">{conv.lead_phone}</span>
            )}
          </DialogTitle>
          <p className="text-xs text-gray-400 text-right">
            התחילה: {formatDate(conv.started_at)} · {conv.message_count} הודעות ·{' '}
            {formatCost(conv.total_cost_usd)} · {conv.total_tokens.toLocaleString()} טוקנים
          </p>
        </DialogHeader>

        {/* Extracted facts */}
        {Object.keys(facts).length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
            {facts.business_type && (
              <span className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-0.5">
                עסק: {facts.business_type}
              </span>
            )}
            {facts.pain_category && (
              <span className="text-xs bg-orange-50 text-orange-700 rounded px-2 py-0.5">
                כאב: {facts.pain_category}
              </span>
            )}
            {facts.main_challenge && (
              <span className="text-xs bg-purple-50 text-purple-700 rounded px-2 py-0.5">
                אתגר: {facts.main_challenge}
              </span>
            )}
            {facts.temperature && (
              <span
                className={`text-xs rounded px-2 py-0.5 ${
                  facts.temperature === 'hot'
                    ? 'bg-red-50 text-red-700'
                    : facts.temperature === 'warm'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {facts.temperature === 'hot' ? '🔥 חם' : facts.temperature === 'warm' ? '🌡 פושר' : '❄️ קר'}
              </span>
            )}
          </div>
        )}

        {/* Message thread */}
        <div className="overflow-y-auto flex-1 space-y-3 py-2 px-1">
          {conv.messages
            .filter((m) => m.role !== 'system')
            .map((m, i) => {
              const isUser = m.role === 'user';
              const meta = m.metadata as Record<string, unknown> | null;
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-teal-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {!isUser && meta && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-gray-200 pt-1.5">
                        {!!meta.action && (
                          <span className="text-[10px] text-gray-400">
                            {ACTION_LABELS[meta.action as string] ?? String(meta.action)}
                          </span>
                        )}
                        {!!meta.state && (
                          <span className="text-[10px] text-gray-400">
                            · {STATE_LABELS[meta.state as string] ?? String(meta.state)}
                          </span>
                        )}
                        {meta.cost_usd != null && (
                          <span className="text-[10px] text-gray-400 mr-auto">
                            {formatCost(meta.cost_usd as number)}
                          </span>
                        )}
                      </div>
                    )}
                    <p
                      className={`text-[10px] mt-1 ${isUser ? 'text-teal-200 text-left' : 'text-gray-400 text-right'}`}
                    >
                      {formatDate(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConversationsTab() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // 1. Fetch all messages (up to 500)
    const { data: messages, error: msgErr } = await supabase
      .from('conversation_messages')
      .select('lead_uuid, subscriber_id, role, content, metadata, created_at')
      .order('created_at', { ascending: true })
      .limit(500);

    if (msgErr) {
      setError(msgErr.message);
      setLoading(false);
      return;
    }

    const rows = (messages ?? []) as RawMessage[];

    // 2. Group by lead_uuid
    const grouped = new Map<string, RawMessage[]>();
    for (const m of rows) {
      if (!grouped.has(m.lead_uuid)) grouped.set(m.lead_uuid, []);
      grouped.get(m.lead_uuid)!.push(m);
    }

    // 3. Fetch lead info for all UUIDs
    const uuids = [...grouped.keys()];
    let leadsMap = new Map<string, LeadRow>();
    if (uuids.length > 0) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, phone, email, conversation_state, conversation_context')
        .in('id', uuids);
      for (const l of leads ?? []) {
        leadsMap.set(l.id, l as LeadRow);
      }
    }

    // 4. Build summaries
    const summaries: ConversationSummary[] = [];
    for (const [lead_uuid, msgs] of grouped.entries()) {
      const lead = leadsMap.get(lead_uuid);
      let total_cost = 0;
      let total_tokens = 0;
      let last_state = 'initial';

      for (const m of msgs) {
        if (m.role === 'assistant' && m.metadata) {
          const meta = m.metadata as Record<string, unknown>;
          if (typeof meta.cost_usd === 'number') total_cost += meta.cost_usd;
          if (typeof meta.total_tokens === 'number') total_tokens += meta.total_tokens;
          if (typeof meta.state === 'string') last_state = meta.state;
        }
      }

      summaries.push({
        lead_uuid,
        subscriber_id: msgs[0]?.subscriber_id ?? null,
        messages: msgs,
        message_count: msgs.filter((m) => m.role !== 'system').length,
        started_at: msgs[0]?.created_at ?? '',
        last_message_at: msgs[msgs.length - 1]?.created_at ?? '',
        total_cost_usd: total_cost,
        total_tokens,
        last_state,
        lead_name: lead?.name ?? null,
        lead_phone: lead?.phone ?? null,
        lead_email: lead?.email ?? null,
        conversation_context:
          (lead?.conversation_context as ConversationFacts | null) ?? {},
      });
    }

    // Sort newest first
    summaries.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
    setConversations(summaries);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── KPI aggregates
  const totalConvs = conversations.length;
  const totalCost = conversations.reduce((s, c) => s + c.total_cost_usd, 0);
  const avgMessages =
    totalConvs > 0
      ? (conversations.reduce((s, c) => s + c.message_count, 0) / totalConvs).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={MessageSquare} label="שיחות" value={String(totalConvs)} loading={loading} />
        <KpiCard icon={DollarSign} label="עלות כוללת" value={formatCost(totalCost)} loading={loading} />
        <KpiCard icon={BarChart2} label="ממוצע הודעות" value={avgMessages} loading={loading} />
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="px-4 py-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm">
          שגיאה בטעינה: {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>שיחות</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              אין שיחות עדיין. כשליד ישלח הודעה ב-WhatsApp היא תופיע כאן.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">התחלה</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Lead</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">הודעות</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">סטטוס</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">עלות</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">עובדות</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conv) => {
                    const facts = conv.conversation_context;
                    return (
                      <tr key={conv.lead_uuid}>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap tabular-nums text-xs">
                          {formatDate(conv.started_at)}
                        </td>

                        <td className="py-3 px-4">
                          {conv.lead_name ? (
                            <div>
                              <p className="font-medium text-gray-800">{conv.lead_name}</p>
                              {conv.lead_phone && (
                                <p className="text-xs text-gray-400">{conv.lead_phone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-gray-400">
                              {short(conv.lead_uuid, 13)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-medium text-gray-700">
                          {conv.message_count}
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant={STATE_VARIANT[conv.last_state] ?? 'outline'}>
                            {STATE_LABELS[conv.last_state] ?? conv.last_state}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 tabular-nums text-xs text-gray-600">
                          {formatCost(conv.total_cost_usd)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {facts.temperature && (
                              <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">
                                {facts.temperature === 'hot' ? '🔥' : facts.temperature === 'warm' ? '🌡' : '❄️'}{' '}
                                {facts.temperature}
                              </span>
                            )}
                            {facts.business_type && (
                              <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 max-w-[100px] truncate">
                                {facts.business_type}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <ThreadDialog conv={conv} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
