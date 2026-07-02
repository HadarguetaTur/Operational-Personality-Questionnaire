'use client';

import React from 'react';

/**
 * "Chaos → order" flow strip under the hero: scattered inquiries drift in from
 * the right, pass through the system node, and exit left as an orderly,
 * evenly-spaced process. This is the product promise, shown instead of told.
 * Decorative only (aria-hidden); the loop freezes into a readable still frame
 * under prefers-reduced-motion. Coordinates are LTR SVG space — motion reads
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
        {/* Lanes */}
        <line x1="544" y1="60" x2="326" y2="60" stroke="#0e7a6e" strokeOpacity="0.14" strokeWidth="1.5" />
        <line x1="234" y1="60" x2="16" y2="60" stroke="#0e7a6e" strokeOpacity="0.14" strokeWidth="1.5" />
        <line
          x1="544" y1="60" x2="326" y2="60"
          stroke="#0e7a6e" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round"
          className="studio-flow-dash"
        />
        <line
          x1="234" y1="60" x2="16" y2="60"
          stroke="#0e7a6e" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round"
          className="studio-flow-dash"
        />

        {/* Incoming scattered inquiries (chat bubbles) */}
        <g className="fv-bubble fv-b1">
          <rect x="-18" y="-12" width="36" height="24" rx="12" fill="#ffffff" stroke="#dce7ea" />
          <circle cx="-7" cy="0" r="1.9" fill="#7c8884" />
          <circle cx="0" cy="0" r="1.9" fill="#7c8884" />
          <circle cx="7" cy="0" r="1.9" fill="#7c8884" />
        </g>
        <g className="fv-bubble fv-b2">
          <rect x="-18" y="-12" width="36" height="24" rx="12" fill="#ffffff" stroke="#dce7ea" />
          <circle cx="-7" cy="0" r="1.9" fill="#7c8884" />
          <circle cx="0" cy="0" r="1.9" fill="#7c8884" />
          <circle cx="7" cy="0" r="1.9" fill="#7c8884" />
        </g>
        <g className="fv-bubble fv-b3">
          <rect x="-18" y="-12" width="36" height="24" rx="12" fill="#ffffff" stroke="#dce7ea" />
          <circle cx="-7" cy="0" r="1.9" fill="#7c8884" />
          <circle cx="0" cy="0" r="1.9" fill="#7c8884" />
          <circle cx="7" cy="0" r="1.9" fill="#7c8884" />
        </g>

        {/* The system node */}
        <g transform="translate(280 60)">
          <circle r="30" className="fv-pulse" fill="none" stroke="#0e7a6e" strokeWidth="1.5" />
          <rect x="-23" y="-23" width="46" height="46" rx="15" fill="#0e7a6e" />
          <path d="M2.5 -11 L-7 2 L-1.5 2 L-2.5 11 L7 -2 L1.5 -2 Z" fill="#ffffff" />
        </g>

        {/* Ordered output (processed items) */}
        <g className="fv-pill fv-p1">
          <rect x="-30" y="-13" width="60" height="26" rx="13" fill="#ffffff" stroke="#0e7a6e" strokeOpacity="0.35" />
          <circle cx="17" cy="0" r="7.5" fill="#0e7a6e" fillOpacity="0.12" />
          <path d="M13.5 0 l2.5 2.5 L21 -2.8" stroke="#0e7a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="-24" y="-1.5" width="28" height="3" rx="1.5" fill="#dce7ea" />
        </g>
        <g className="fv-pill fv-p2">
          <rect x="-30" y="-13" width="60" height="26" rx="13" fill="#ffffff" stroke="#0e7a6e" strokeOpacity="0.35" />
          <circle cx="17" cy="0" r="7.5" fill="#0e7a6e" fillOpacity="0.12" />
          <path d="M13.5 0 l2.5 2.5 L21 -2.8" stroke="#0e7a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="-24" y="-1.5" width="28" height="3" rx="1.5" fill="#dce7ea" />
        </g>
        <g className="fv-pill fv-p3">
          <rect x="-30" y="-13" width="60" height="26" rx="13" fill="#ffffff" stroke="#0e7a6e" strokeOpacity="0.35" />
          <circle cx="17" cy="0" r="7.5" fill="#0e7a6e" fillOpacity="0.12" />
          <path d="M13.5 0 l2.5 2.5 L21 -2.8" stroke="#0e7a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="-24" y="-1.5" width="28" height="3" rx="1.5" fill="#dce7ea" />
        </g>
      </svg>

      <div className="mt-1 flex items-center justify-between px-1 text-[11px] font-medium text-[#7c8884]">
        <span className="font-semibold text-[#0b5f56]">תהליך אחד מסודר</span>
        <span>וואטסאפ · אינסטגרם · טלפון</span>
      </div>
    </div>
  );
}

export default HeroFlow;
