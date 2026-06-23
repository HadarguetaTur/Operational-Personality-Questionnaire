'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AssistantChat } from './AssistantChat';

interface ResultChatLauncherProps {
  /** The lead's report_token — forwarded to AssistantChat to resolve the session. */
  token: string;
}

/**
 * Floating chat button on the result page. Tapping it opens an overlay panel
 * (bottom sheet on mobile, docked card on desktop) that embeds the same
 * AssistantChat used on the meeting page. The chat is lazy-mounted on first
 * open so /api/webchat/start fires on intent, not on page load.
 */
export function ResultChatLauncher({ token }: ResultChatLauncherProps) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  openRef.current = open;

  const openChat = useCallback(() => {
    setTeaser(false);
    setHasOpened(true);
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Esc closes; move focus into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeChat]);

  // CTA buttons elsewhere on the page open the chat by dispatching this event.
  useEffect(() => {
    const onOpen = () => openChat();
    window.addEventListener('qa:open-chat', onOpen);
    return () => window.removeEventListener('qa:open-chat', onOpen);
  }, [openChat]);

  // Surface a gentle invitation bubble shortly after landing — once per session,
  // and only if the visitor hasn't already opened the chat themselves.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('qa-teaser-shown')) return;
    const t = window.setTimeout(() => {
      if (!openRef.current) {
        setTeaser(true);
        sessionStorage.setItem('qa-teaser-shown', '1');
      }
    }, 3500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {/* Invitation bubble — appears shortly after landing, above the button */}
      {teaser && !open && (
        <div className="qa-teaser" dir="rtl" role="status">
          <button
            type="button"
            onClick={openChat}
            className="qa-teaser-body"
            aria-label="קביעת פגישה עם הדר דרך העוזרת הדיגיטלית"
          >
            רוצה שאקבע לך פגישה עם הדר? דברי איתי כאן ועכשיו 👋
          </button>
          <button
            type="button"
            onClick={() => setTeaser(false)}
            className="qa-teaser-close"
            aria-label="סגירת ההודעה"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Floating button — RTL bottom-left, clear of the CTA flow */}
      <button
        ref={buttonRef}
        onClick={openChat}
        aria-label="קביעת פגישה עם הדר דרך העוזרת הדיגיטלית"
        className={`qa-launch ${open ? 'qa-launch-hidden' : ''}`}
        dir="rtl"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>קבעי פגישה עם הדר</span>
        <i className="qa-launch-pulse" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="qa-overlay"
          dir="rtl"
          onClick={closeChat}
        >
          <div
            className="qa-panel"
            role="dialog"
            aria-modal="true"
            aria-label="צ'אט עם העוזרת הדיגיטלית"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qa-panel-head">
              <p className="qa-panel-title">העוזרת תקבע לך פגישה עם הדר</p>
              <button
                ref={closeRef}
                onClick={closeChat}
                aria-label="סגירה"
                className="qa-panel-close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="qa-panel-body">
              {hasOpened && <AssistantChat token={token} />}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .qa-launch {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 20px;
          border-radius: 999px;
          background: var(--qa-accent);
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          box-shadow: 0 14px 34px -12px rgba(20, 184, 166, 0.55), 0 4px 12px -6px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s, opacity 0.2s;
        }
        .qa-launch:hover {
          transform: translateY(-2px);
        }
        .qa-launch:active {
          transform: scale(0.97);
        }
        .qa-launch-hidden {
          opacity: 0;
          pointer-events: none;
        }
        .qa-teaser {
          position: fixed;
          bottom: 78px;
          left: 20px;
          z-index: 51;
          display: flex;
          align-items: flex-start;
          gap: 6px;
          max-width: min(78vw, 290px);
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid var(--qa-border);
          background: var(--qa-surface);
          box-shadow: 0 16px 38px -14px rgba(0, 0, 0, 0.5);
          animation: qa-slide-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .qa-teaser-body {
          flex: 1;
          text-align: right;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
          color: var(--qa-text-primary);
        }
        .qa-teaser-close {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          color: var(--qa-text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .qa-teaser-close:hover {
          background: var(--qa-accent-soft);
          color: var(--qa-accent);
        }
        .qa-launch-pulse {
          position: absolute;
          inset: -3px;
          border-radius: 999px;
          border: 2px solid var(--qa-accent);
          opacity: 0.5;
          animation: qa-launch-pulse 2.4s ease-out infinite;
          pointer-events: none;
        }
        @keyframes qa-launch-pulse {
          0% {
            transform: scale(0.96);
            opacity: 0.5;
          }
          70%,
          100% {
            transform: scale(1.12);
            opacity: 0;
          }
        }
        .qa-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          padding: 0;
          animation: qa-fade 0.2s ease both;
        }
        .qa-panel {
          width: 100%;
          max-width: 100%;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          background: var(--qa-surface);
          border-top-left-radius: 22px;
          border-top-right-radius: 22px;
          border: 1px solid var(--qa-border);
          box-shadow: 0 -20px 50px -20px rgba(0, 0, 0, 0.5);
          animation: qa-slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .qa-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--qa-border-light);
        }
        .qa-panel-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--qa-text-primary);
        }
        .qa-panel-close {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: var(--qa-text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .qa-panel-close:hover {
          background: var(--qa-accent-soft);
          color: var(--qa-accent);
        }
        .qa-panel-body {
          padding: 12px;
          overflow: hidden;
        }
        @keyframes qa-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes qa-slide-up {
          from {
            transform: translateY(24px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        /* Desktop: dock as a card in the bottom-left corner */
        @media (min-width: 768px) {
          .qa-overlay {
            background: rgba(0, 0, 0, 0.4);
            padding: 24px;
          }
          .qa-panel {
            width: min(92vw, 420px);
            max-height: 82vh;
            border-radius: 22px;
          }
        }
      `}</style>
    </>
  );
}
