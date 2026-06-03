'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_SECTIONS, BotPromptSections } from '@/lib/ai/prompts/botPromptDefaults';
import { Lock, RotateCcw, Save } from 'lucide-react';

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTION_META: Array<{
  key: keyof BotPromptSections;
  label: string;
  description: string;
  rows: number;
}> = [
  {
    key: 'identity',
    label: 'זהות ומטרה',
    description: 'מי הסוכנת, מה המטרה שלה, ומבנה השיחה (6 שלבים). כאן קובעת את ה"אני" של הבוט ואת מה שהיא רוצה להשיג בכל שיחה.',
    rows: 14,
  },
  {
    key: 'product',
    label: 'מוצר ומחיר',
    description: 'תיאור המוצר "מהודעה לליד", שלבי המערכת, תוצאות ללקוחה, ומחיר פגישת האפיון.',
    rows: 10,
  },
  {
    key: 'target_audience',
    label: 'קהל יעד',
    description: 'מי הלקוחה האידיאלית שאחריה הסוכנת שואפת. משמש לסינון ולהחלטה האם להמשיך שיחה.',
    rows: 5,
  },
  {
    key: 'objections',
    label: 'התנגדויות',
    description: 'רשימת ההתנגדויות הנפוצות ואיך לטפל בכל אחת. כל שורה בפורמט: "ההתנגדות" → "התשובה".',
    rows: 12,
  },
  {
    key: 'testimonials',
    label: 'עדויות לקוחות',
    description: 'עדויות שהסוכנת יכולה להשתמש בהן כשמתאים — כשיש התנגדויות על אמינות או תוצאות.',
    rows: 8,
  },
  {
    key: 'rules',
    label: 'כללי שיחה',
    description: 'כללי ברזל לניהול השיחה + הסימנים לפעולה (מתי לקבוע פגישה, מתי לסמן כלא רלוונטי וכו\').',
    rows: 14,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BotConfigTab() {
  const [sections, setSections] = useState<BotPromptSections>(DEFAULT_SECTIONS);
  const [savedSections, setSavedSections] = useState<BotPromptSections>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bot-config');
      if (!res.ok) throw new Error(await res.text());
      const data: BotPromptSections = await res.json();
      setSections(data);
      setSavedSections(data);
    } catch (err) {
      toast.error('שגיאה בטעינת הגדרות הבוט');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sections),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'שגיאה בשמירה');
      }
      setSavedSections(sections);
      toast.success('ההגדרות נשמרו — הבוט יעודכן תוך דקה');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const resetSection = (key: keyof BotPromptSections) => {
    setSections((prev) => ({ ...prev, [key]: DEFAULT_SECTIONS[key] }));
  };

  const isDirty = JSON.stringify(sections) !== JSON.stringify(savedSections);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          סעיף <strong>פורמט JSON</strong> לא ניתן לעריכה מכאן — הוא אחראי לתקינות הפלט של הסוכנת ונקבע בקוד.
        </span>
      </div>

      {/* Save bar (sticky when dirty) */}
      {isDirty && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-teal-50 border border-teal-200">
          <span className="text-sm text-teal-700">יש שינויים שלא נשמרו</span>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'שומר...' : 'שמור הכל'}
          </Button>
        </div>
      )}

      {/* Section tabs */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">עריכת סעיפי ה-Prompt</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="identity" dir="rtl">
            <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
              {SECTION_META.map((s) => {
                const changed = sections[s.key] !== savedSections[s.key];
                return (
                  <TabsTrigger key={s.key} value={s.key} className="relative">
                    {s.label}
                    {changed && (
                      <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-teal-500" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {SECTION_META.map((s) => (
              <TabsContent key={s.key} value={s.key}>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                  <Textarea
                    value={sections[s.key]}
                    onChange={(e) =>
                      setSections((prev) => ({ ...prev, [s.key]: e.target.value }))
                    }
                    rows={s.rows}
                    className="font-mono text-sm resize-y leading-relaxed"
                    dir="rtl"
                    disabled={saving}
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-gray-500 hover:text-gray-700"
                      onClick={() => resetSection(s.key)}
                      disabled={sections[s.key] === DEFAULT_SECTIONS[s.key]}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      שחזר ברירת מחדל
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving || !isDirty}
                      size="sm"
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'שומר...' : 'שמור'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Locked section preview */}
      <Card className="border-dashed border-gray-300 bg-gray-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            פורמט JSON (נעול)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono text-gray-400 leading-relaxed whitespace-pre-wrap" dir="ltr">
{`{
  "reply": "הטקסט שישלח לליד",
  "action": "continue | book_meeting | mark_irrelevant | request_followup",
  "state": "initial | discovery | qualifying | pitching | objection | booking | closed | irrelevant",
  "extracted_facts": { ... }
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
