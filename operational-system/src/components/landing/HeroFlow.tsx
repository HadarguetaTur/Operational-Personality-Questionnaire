'use client';

import React from 'react';

/** A chat bubble with a tail — one incoming inquiry. Drawn around local (0,0). */
function Bubble() {
  return (
    <>
      <path
        d="M-19 -13 h38 a10 10 0 0 1 10 10 v6 a10 10 0 0 1 -10 10 h-27 l-8 7 v-9 a10 10 0 0 1 -3 -8 v-6 a10 10 0 0 1 10 -10 Z"
        fill="#ffffff"
        stroke="#E6E2F4"
        strokeWidth="1.2"
      />
      <circle cx="-8" cy="0" r="2" fill="#B3AFC9" />
      <circle cx="0" cy="0" r="2" fill="#B3AFC9" />
      <circle cx="8" cy="0" r="2" fill="#B3AFC9" />
    </>
  );
}

/** A processed, orderly item — one handled inquiry. Drawn around local (0,0). */
function Pill() {
  return (
    <>
      <rect x="-31" y="-14" width="62" height="28" rx="14" fill="#ffffff" stroke="#E6E2F4" strokeWidth="1.2" />
      <circle cx="17" cy="0" r="8" fill="#5B3FC4" />
      <path d="M13.6 0 l2.6 2.6 L21 -3" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="-25" y="-4.5" width="30" height="3.2" rx="1.6" fill="#EEEBF8" />
      <rect x="-25" y="1.5" width="20" height="3.2" rx="1.6" fill="#F3F0FB" />
    </>
  );
}

/**
 * "Chaos → order" flow strip under the hero: scattered inquiries drift in from
 * the right, pass through the system node, and exit left as an orderly,
 * evenly-spaced process. The product promise, shown instead of told.
 * Decorative only (aria-hidden); freezes into a readable still frame under
 * prefers-reduced-motion. Coordinates are LTR SVG space — motion reads
 * RTL-forward (right → left).
 */
export function HeroFlow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`studio-flowviz pointer-events-none select-none mx-auto w-full max-w-[560px] ${className}`}
      aria-hidden
      dir="ltr"
    >
      <svg viewBox="0 0 560 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <linearGradient id="fvNode" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7B61E8" />
            <stop offset="100%" stopColor="#4A32A4" />
          </linearGradient>
          {/* Lanes fade out toward the edges instead of stopping abruptly */}
          <linearGradient id="fvLaneR" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#5B3FC4" stopOpacity="0" />
            <stop offset="35%" stopColor="#5B3FC4" stopOpacity="1" />
            <stop offset="100%" stopColor="#5B3FC4" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="fvLaneL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5B3FC4" stopOpacity="0" />
            <stop offset="35%" stopColor="#5B3FC4" stopOpacity="1" />
            <stop offset="100%" stopColor="#5B3FC4" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Lanes — quiet dashed guides, fading at the outer edges */}
        <line
          x1="548" y1="60" x2="322" y2="60"
          stroke="url(#fvLaneR)" strokeOpacity="0.3" strokeWidth="1.3" strokeLinecap="round"
          className="studio-flow-dash"
        />
        <line
          x1="238" y1="60" x2="12" y2="60"
          stroke="url(#fvLaneL)" strokeOpacity="0.3" strokeWidth="1.3" strokeLinecap="round"
          className="studio-flow-dash"
        />

        {/* Incoming scattered inquiries */}
        <g className="fv-bubble fv-b1"><Bubble /></g>
        <g className="fv-bubble fv-b2"><Bubble /></g>
        <g className="fv-bubble fv-b3"><Bubble /></g>

        {/* The system node */}
        <g transform="translate(280 60)">
          <circle r="31" className="fv-pulse" fill="none" stroke="#5B3FC4" strokeWidth="1.2" />
          {/* soft ground shadow */}
          <ellipse cx="0" cy="27" rx="17" ry="3.5" fill="#0D1B2A" opacity="0.08" />
          <rect x="-23" y="-23" width="46" height="46" rx="15" fill="url(#fvNode)" />
          <rect x="-23" y="-23" width="46" height="46" rx="15" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
          <path d="M3 -11.5 L-7.5 2.5 L-1.5 2.5 L-3 11.5 L7.5 -2.5 L1.5 -2.5 Z" fill="#ffffff" />
        </g>

        {/* Ordered output */}
        <g className="fv-pill fv-p1"><Pill /></g>
        <g className="fv-pill fv-p2"><Pill /></g>
        <g className="fv-pill fv-p3"><Pill /></g>
      </svg>

      <div className="mt-1.5 flex items-center justify-between px-1 text-[12px] font-medium text-[#68707C]">
        <span className="font-semibold text-[#4A32A4]">תהליך אחד מסודר</span>
        <span>וואטסאפ · אינסטגרם · טלפון</span>
      </div>
    </div>
  );
}

export default HeroFlow;
