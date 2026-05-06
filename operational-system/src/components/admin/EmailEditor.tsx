'use client';

import React, { useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

const EmailEditorComponent = dynamic(() => import('react-email-editor').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border">
      <p className="text-gray-400">טוען עורך מייל...</p>
    </div>
  ),
});

interface EmailEditorProps {
  initialDesign?: Record<string, unknown>;
  onSave: (html: string, design: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function EmailEditor({ initialDesign, onSave, onCancel }: EmailEditorProps) {
  const editorRef = useRef<any>(null);

  const onReady = useCallback(() => {
    if (initialDesign && editorRef.current) {
      editorRef.current.loadDesign(initialDesign);
    }
  }, [initialDesign]);

  const handleSave = () => {
    if (!editorRef.current) return;

    editorRef.current.exportHtml((data: { html: string; design: Record<string, unknown> }) => {
      onSave(data.html, data.design);
    });
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <EmailEditorComponent
          ref={editorRef}
          onReady={onReady}
          options={{
            locale: 'he-IL',
            features: {
              textEditor: {
                tables: true,
              },
            },
            appearance: {
              theme: 'light',
            },
            mergeTags: [
              { name: 'שם', value: '{{name}}' },
              { name: 'אימייל', value: '{{email}}' },
              { name: 'קישור לדוח', value: '{{report_url}}' },
              { name: 'קישור לטופס', value: '{{form_url}}' },
              { name: 'קישור לפגישה', value: '{{meeting_url}}' },
              { name: 'דפוס ניהולי', value: '{{pattern}}' },
            ],
          }}
        />
      </div>
      <div className="flex items-center gap-3 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            ביטול
          </Button>
        )}
        <Button onClick={handleSave}>
          שמור תבנית
        </Button>
      </div>
    </div>
  );
}
