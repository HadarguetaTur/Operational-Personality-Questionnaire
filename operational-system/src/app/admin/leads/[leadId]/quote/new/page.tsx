'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Bot, FileSignature, Loader2, RotateCcw, Send, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * /admin/leads/[leadId]/quote/new — the AI interview.
 * Request/response chat (no streaming); when the interviewer says it has
 * enough, "הכיני הצעה" generates the draft and opens the editor.
 */
export default function NewQuotePage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const supabase = createClient();

  const [leadName, setLeadName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [facts, setFacts] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    supabase
      .from('leads')
      .select('name')
      .eq('id', leadId)
      .single()
      .then(({ data }) => setLeadName(data?.name ?? ''));
  }, [supabase, leadId]);

  const callInterview = useCallback(
    async (history: ChatMsg[], message?: string) => {
      setThinking(true);
      try {
        const res = await fetch('/api/admin/quotes/interview', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId, history, message }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? 'ה-AI לא זמין');
          return;
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: json.reply }]);
        if (json.collected_facts && typeof json.collected_facts === 'object') setFacts(json.collected_facts);
        setReady(Boolean(json.ready_to_generate));
      } catch {
        toast.error('שגיאת רשת');
      } finally {
        setThinking(false);
      }
    },
    [leadId],
  );

  // Opening message
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    callInterview([]);
  }, [callInterview]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    await callInterview(messages, text);
  };

  const generate = async () => {
    if (messages.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/quotes/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, history: messages, collected_facts: facts }),
      });
      const json = await res.json();
      if (!res.ok || !json.quoteId) {
        toast.error(json.error ?? 'יצירת ההצעה נכשלה');
        return;
      }
      toast.success('טיוטת ההצעה מוכנה — אפשר לערוך');
      router.push(`/admin/leads/${leadId}/quote/${json.quoteId}`);
    } catch {
      toast.error('שגיאת רשת');
    } finally {
      setGenerating(false);
    }
  };

  const restart = () => {
    setMessages([]);
    setFacts({});
    setReady(false);
    callInterview([]);
  };

  const factEntries = Object.entries(facts).filter(([, v]) =>
    Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null,
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button onClick={() => router.push('/admin/leads')} className="hover:text-gray-700">לידים</button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <button onClick={() => router.push(`/admin/leads/${leadId}`)} className="hover:text-gray-700">{leadName || 'ליד'}</button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span className="font-medium text-gray-900">הצעת מחיר חדשה</span>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-brand-500" />
            ראיון להצעת מחיר
          </h1>
          <p className="text-gray-500 mt-1">
            העוזרת שואלת אותך על הלקוח/ה והעבודה, ומנסחת מזה טיוטה שתוכלי לערוך לפני שליחה.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={restart} disabled={thinking || generating} className="gap-2">
            <RotateCcw className="w-4 h-4" /> התחלה מחדש
          </Button>
          <Button
            onClick={generate}
            disabled={generating || thinking || messages.filter((m) => m.role === 'user').length === 0}
            className={`gap-2 ${ready ? 'bg-brand-600 hover:bg-brand-700' : ''}`}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            {generating ? 'מנסחת הצעה...' : 'הכיני הצעה'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardContent className="p-0 flex flex-col h-[70vh]">
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  ) : null}
                </div>
              ))}
              {thinking ? (
                <div className="flex gap-2 items-center text-gray-400 text-sm">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <Loader2 className="w-4 h-4 animate-spin" /> חושבת...
                </div>
              ) : null}
            </div>
            <div className="border-t border-gray-100 p-3">
              {ready ? (
                <div className="mb-2 text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
                  יש מספיק מידע. אפשר ללחוץ <b>הכיני הצעה</b>, או להמשיך לדייק.
                </div>
              ) : null}
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="ספרי על הלקוח/ה, על העבודה, על המחיר... (Enter לשליחה, Shift+Enter לשורה חדשה)"
                  rows={2}
                  className="resize-none"
                  disabled={thinking || generating}
                />
                <Button onClick={send} disabled={!input.trim() || thinking || generating} className="h-[58px] px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-gray-900 mb-3">מה נאסף עד עכשיו</h2>
            {factEntries.length === 0 ? (
              <p className="text-sm text-gray-400">עוד לא נאסף מידע. ספרי לעוזרת על הלקוח/ה.</p>
            ) : (
              <dl className="space-y-3 text-sm">
                {factEntries.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-gray-500 text-xs">{FACT_LABELS[k] ?? k}</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">
                      {Array.isArray(v) ? (
                        <ul className="list-disc pr-4">
                          {v.map((x, i) => (
                            <li key={i}>{String(x)}</li>
                          ))}
                        </ul>
                      ) : (
                        String(v)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const FACT_LABELS: Record<string, string> = {
  client_description: 'הלקוח/ה והעסק',
  problem: 'הבעיה / המטרה',
  scope: 'היקף העבודה',
  exclusions: 'לא כלול',
  existing_tools: 'כלים קיימים',
  timeline: 'לו"ז',
  pricing_notes: 'מחיר',
  payment_terms: 'תנאי תשלום',
  discount: 'הנחה',
  special_notes: 'הערות מיוחדות',
};
