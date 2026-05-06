'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmailEditor } from '@/components/admin/EmailEditor';
import { ArrowRight, Save, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface FunnelOption {
  id: string;
  name: string;
}

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;
  const isNew = templateId === 'new';
  const supabase = createClient();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [funnelId, setFunnelId] = useState<string>('');
  const [funnels, setFunnels] = useState<FunnelOption[]>([]);
  const [design, setDesign] = useState<Record<string, unknown> | undefined>(undefined);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [lastSavedHtml, setLastSavedHtml] = useState('');

  const fetchTemplate = useCallback(async () => {
    const [templateRes, funnelsRes] = await Promise.all([
      isNew ? Promise.resolve({ data: null }) : supabase.from('email_templates').select('*').eq('id', templateId).single(),
      supabase.from('funnels').select('id, name'),
    ]);

    setFunnels(funnelsRes.data ?? []);

    if (templateRes.data) {
      setName(templateRes.data.name);
      setSubject(templateRes.data.subject);
      setFunnelId(templateRes.data.funnel_id ?? '');
      if (templateRes.data.json_design) {
        setDesign(templateRes.data.json_design as Record<string, unknown>);
      }
    }
    setLoading(false);
  }, [supabase, templateId, isNew]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async (html: string, jsonDesign: Record<string, unknown>) => {
    setSaving(true);

    const variables = extractVariables(html);
    const payload = {
      name: name || 'תבנית ללא שם',
      subject,
      html_content: html,
      json_design: jsonDesign,
      variables,
      funnel_id: funnelId && funnelId !== 'none' ? funnelId : null,
    };

    if (isNew) {
      const { data } = await supabase
        .from('email_templates')
        .insert(payload)
        .select('id')
        .single();
      if (data?.id) {
        router.replace(`/admin/templates/${data.id}`);
      }
    } else {
      await supabase
        .from('email_templates')
        .update(payload)
        .eq('id', templateId);
    }

    setLastSavedHtml(html);
    setSaving(false);
    toast.success('התבנית נשמרה בהצלחה');
  };

  const handleTestSend = async () => {
    setSendingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('לא נמצא אימייל מחובר');
        return;
      }

      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          to_email: user.email,
        }),
      });

      if (res.ok) {
        toast.success(`מייל נשלח ל-${user.email}`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'שגיאה בשליחה');
      }
    } catch {
      toast.error('שגיאה בשליחת מייל');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button onClick={() => router.push('/admin/templates')} className="hover:text-gray-700">תבניות מייל</button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span className="font-medium text-gray-900">{isNew ? 'תבנית חדשה' : name}</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isNew ? 'יצירת תבנית חדשה' : 'עריכת תבנית'}</CardTitle>
            {!isNew && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSend}
                disabled={sendingTest}
                className="gap-2"
              >
                <SendHorizontal className="w-4 h-4" />
                {sendingTest ? 'שולח...' : 'שלח מייל ניסיון'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם התבנית</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="למשל: מייל דוח אבחון"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">נושא המייל</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="למשל: הדוח שלך מוכן - {{name}}"
              />
            </div>
            <div className="space-y-2">
              <Label>משפך משויך</Label>
              <Select value={funnelId} onValueChange={setFunnelId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר משפך..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא</SelectItem>
                  {funnels.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <EmailEditor
        initialDesign={design}
        onSave={handleSave}
        onCancel={() => router.push('/admin/templates')}
      />

      {saving && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[90]">
          <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-3">
            <Save className="w-5 h-5 animate-pulse text-blue-600" />
            <span>שומר תבנית...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function extractVariables(html: string): Record<string, string> {
  const matches = html.match(/\{\{(\w+)\}\}/g);
  if (!matches) return {};
  const vars: Record<string, string> = {};
  matches.forEach((m) => {
    const key = m.replace(/\{|\}/g, '');
    vars[key] = key;
  });
  return vars;
}
