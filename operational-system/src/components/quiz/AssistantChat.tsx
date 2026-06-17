'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface AssistantChatProps {
  /** The lead's report_token — used to resolve the conversation + first name. */
  token: string;
}

const POLL_MS = 2000;

/**
 * On-site chat with the digital assistant. Same bot brain as WhatsApp, delivered
 * through the `web` channel: POST /start to resolve the lead + seed the opening,
 * POST /send for each message, GET /messages on a poll for replies.
 */
export function AssistantChat({ token }: AssistantChatProps) {
  const [leadUuid, setLeadUuid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');

  const lastTsRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const awaitingReply =
    sending || (messages.length > 0 && messages[messages.length - 1].role === 'user');

  // Merge server messages (source of truth), dropping any optimistic locals.
  const mergeServer = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    lastTsRef.current = incoming[incoming.length - 1].created_at;
    setMessages((prev) => {
      const real = prev.filter((m) => !m.id.startsWith('local-'));
      const seen = new Set(real.map((m) => m.id));
      const merged = [...real];
      for (const m of incoming) if (!seen.has(m.id)) merged.push(m);
      return merged;
    });
  }, []);

  const poll = useCallback(
    async (uuid: string) => {
      try {
        const qs = new URLSearchParams({ leadUuid: uuid });
        if (lastTsRef.current) qs.set('after', lastTsRef.current);
        const res = await fetch(`/api/webchat/messages?${qs.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages: ChatMessage[] };
        mergeServer(data.messages ?? []);
      } catch {
        // transient — next tick retries
      }
    },
    [mergeServer],
  );

  // Start the session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/webchat/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) throw new Error('start failed');
        const data = (await res.json()) as { leadUuid: string };
        if (cancelled) return;
        setLeadUuid(data.leadUuid);
        setStatus('ready');
        await poll(data.leadUuid);
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, poll]);

  // Poll loop.
  useEffect(() => {
    if (!leadUuid) return;
    const id = setInterval(() => poll(leadUuid), POLL_MS);
    return () => clearInterval(id);
  }, [leadUuid, poll]);

  // Keep pinned to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, awaitingReply]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !leadUuid || sending) return;
    setInput('');
    setSending(true);
    // Optimistic echo so the lead sees her message instantly.
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() },
    ]);
    try {
      await fetch('/api/webchat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadUuid, message: text }),
      });
      await poll(leadUuid);
    } catch {
      // leave the optimistic bubble; the poll loop will reconcile
    } finally {
      setSending(false);
    }
  }, [input, leadUuid, sending, poll]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="qa-chat" dir="rtl">
      {/* Identity header */}
      <header className="qa-chat-head">
        <div className="qa-chat-avatar" aria-hidden="true">
          <span>ה</span>
          <i className="qa-chat-pulse" />
        </div>
        <div className="qa-chat-id">
          <p className="qa-chat-name">העוזרת הדיגיטלית של הדר</p>
          <p className="qa-chat-presence">
            <span className="qa-chat-dot" /> זמינה עכשיו, עונה בדקות
          </p>
        </div>
      </header>

      {/* Transcript */}
      <div className="qa-chat-scroll" ref={scrollRef}>
        {status === 'error' && (
          <p className="qa-chat-sys">
            רגע, משהו לא נטען כמו שצריך. אפשר לרענן את העמוד ולנסות שוב.
          </p>
        )}
        {status === 'connecting' && messages.length === 0 && (
          <div className="qa-chat-row qa-assistant">
            <Bubble role="assistant">
              <Typing />
            </Bubble>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={m.id}
            className={`qa-chat-row ${m.role === 'assistant' ? 'qa-assistant' : 'qa-user'}`}
            style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
          >
            <Bubble role={m.role}>{m.content}</Bubble>
          </div>
        ))}

        {awaitingReply && status === 'ready' && (
          <div className="qa-chat-row qa-assistant">
            <Bubble role="assistant">
              <Typing />
            </Bubble>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="qa-chat-composer">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="כתבי לי כאן..."
          rows={1}
          disabled={status !== 'ready'}
          className="qa-chat-input"
          dir="rtl"
        />
        <button
          onClick={send}
          disabled={!input.trim() || status !== 'ready' || sending}
          className="qa-chat-send"
          aria-label="שליחה"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="6 11 12 5 18 11" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .qa-chat {
          display: flex;
          flex-direction: column;
          height: min(68vh, 620px);
          border-radius: 22px;
          overflow: hidden;
          background:
            radial-gradient(120% 60% at 100% 0%, var(--qa-accent-soft), transparent 60%),
            var(--qa-surface);
          border: 1px solid var(--qa-border);
          box-shadow: 0 24px 60px -28px rgba(58, 90, 107, 0.45), 0 2px 8px -4px rgba(0, 0, 0, 0.08);
        }
        .qa-chat-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: var(--qa-accent);
          color: #fff;
        }
        .qa-chat-avatar {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.16);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
        }
        .qa-chat-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.4);
          animation: qa-pulse 2.6s ease-out infinite;
        }
        .qa-chat-id {
          line-height: 1.3;
        }
        .qa-chat-name {
          font-size: 15px;
          font-weight: 700;
        }
        .qa-chat-presence {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.85;
        }
        .qa-chat-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #7CFEC8;
          box-shadow: 0 0 0 0 rgba(124, 254, 200, 0.7);
          animation: qa-live 1.8s ease-out infinite;
        }
        .qa-chat-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scrollbar-width: thin;
        }
        .qa-chat-row {
          display: flex;
          animation: qa-bubble-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .qa-chat-row.qa-assistant {
          justify-content: flex-start;
        }
        .qa-chat-row.qa-user {
          justify-content: flex-end;
        }
        .qa-chat-sys {
          text-align: center;
          font-size: 13px;
          color: var(--qa-text-muted);
          padding: 12px;
        }
        .qa-chat-composer {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid var(--qa-border-light);
          background: var(--qa-surface);
        }
        .qa-chat-input {
          flex: 1;
          resize: none;
          max-height: 120px;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid var(--qa-border);
          background: var(--qa-bg);
          color: var(--qa-text-primary);
          font-size: 15px;
          line-height: 1.45;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .qa-chat-input:focus {
          border-color: var(--qa-accent);
          box-shadow: 0 0 0 3px var(--qa-accent-soft);
        }
        .qa-chat-input:disabled {
          opacity: 0.6;
        }
        .qa-chat-send {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #fff;
          background: var(--qa-accent);
          transition: transform 0.12s, opacity 0.15s;
        }
        .qa-chat-send:not(:disabled):hover {
          transform: translateY(-1px);
        }
        .qa-chat-send:not(:disabled):active {
          transform: scale(0.95);
        }
        .qa-chat-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        @keyframes qa-bubble-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes qa-pulse {
          0% {
            transform: scale(0.9);
            opacity: 0.7;
          }
          70%,
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }
        @keyframes qa-live {
          0% {
            box-shadow: 0 0 0 0 rgba(124, 254, 200, 0.7);
          }
          70%,
          100% {
            box-shadow: 0 0 0 7px rgba(124, 254, 200, 0);
          }
        }
      `}</style>
    </div>
  );
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  return (
    <div className={`qa-bubble ${role}`}>
      {children}
      <style jsx>{`
        .qa-bubble {
          max-width: 80%;
          padding: 11px 15px;
          font-size: 15px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .qa-bubble.assistant {
          background: var(--qa-bg);
          color: var(--qa-text-primary);
          border: 1px solid var(--qa-border-light);
          border-radius: 18px 18px 18px 5px;
        }
        .qa-bubble.user {
          background: var(--qa-accent);
          color: #fff;
          border-radius: 18px 18px 5px 18px;
          box-shadow: 0 6px 16px -8px rgba(58, 90, 107, 0.6);
        }
      `}</style>
    </div>
  );
}

function Typing() {
  return (
    <span className="qa-typing" aria-label="מקלידה">
      <i />
      <i />
      <i />
      <style jsx>{`
        .qa-typing {
          display: inline-flex;
          gap: 4px;
          padding: 2px 0;
        }
        .qa-typing i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--qa-text-muted);
          animation: qa-typing 1.2s infinite ease-in-out both;
        }
        .qa-typing i:nth-child(2) {
          animation-delay: 0.15s;
        }
        .qa-typing i:nth-child(3) {
          animation-delay: 0.3s;
        }
        @keyframes qa-typing {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
      `}</style>
    </span>
  );
}
