'use client';

import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import SignaturePadLib from 'signature_pad';

export interface SignaturePadHandle {
  /** PNG data URL, or null when empty. */
  toDataUrl: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  className?: string;
  onChange?: (empty: boolean) => void;
}

/** Canvas signature surface (mouse + touch), HiDPI-aware. */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { className, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePadLib(canvas, {
      penColor: '#1b1f3a',
      minWidth: 0.9,
      maxWidth: 2.4,
      backgroundColor: 'rgba(255,255,255,0)',
    });
    padRef.current = pad;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.clear();
      if (data.length) pad.fromData(data);
    };
    resize();
    window.addEventListener('resize', resize);

    const notify = () => onChange?.(pad.isEmpty());
    pad.addEventListener('endStroke', notify);

    return () => {
      window.removeEventListener('resize', resize);
      pad.removeEventListener('endStroke', notify);
      pad.off();
      padRef.current = null;
    };
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    toDataUrl: () => {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return null;
      return pad.toDataURL('image/png');
    },
    clear: () => {
      padRef.current?.clear();
      onChange?.(true);
    },
    isEmpty: () => padRef.current?.isEmpty() ?? true,
  }));

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ touchAction: 'none', width: '100%', height: '100%', display: 'block' }}
      aria-label="משטח חתימה"
    />
  );
});
