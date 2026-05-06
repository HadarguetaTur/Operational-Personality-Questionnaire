'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuestionEditor, QuestionField } from '@/components/admin/QuestionEditor';
import { ArrowRight, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionsEditorPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.funnelId as string;
  const stageId = params.stageId as string;
  const supabase = createClient();

  const [questions, setQuestions] = useState<QuestionField[]>([]);
  const [stageName, setStageName] = useState('');
  const [funnelName, setFunnelName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [funnelRes, stageRes, configRes] = await Promise.all([
      supabase.from('funnels').select('name').eq('id', funnelId).single(),
      supabase.from('funnel_stages').select('name').eq('id', stageId).single(),
      supabase.from('questionnaire_configs').select('*').eq('stage_id', stageId).single(),
    ]);

    setFunnelName(funnelRes.data?.name ?? '');
    setStageName(stageRes.data?.name ?? '');

    if (configRes.data?.questions) {
      setQuestions(configRes.data.questions as QuestionField[]);
    }

    setLoading(false);
  }, [supabase, funnelId, stageId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);

    const existing = await supabase
      .from('questionnaire_configs')
      .select('id')
      .eq('stage_id', stageId)
      .single();

    if (existing.data) {
      await supabase
        .from('questionnaire_configs')
        .update({ questions: questions as unknown as Record<string, unknown>[] })
        .eq('id', existing.data.id);
    } else {
      await supabase.from('questionnaire_configs').insert({
        funnel_id: funnelId,
        stage_id: stageId,
        questions: questions as unknown as Record<string, unknown>[],
      });
    }

    setSaving(false);
    toast.success('השאלון נשמר בהצלחה');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button onClick={() => router.push('/admin/funnels')} className="hover:text-gray-700">
          משפכים
        </button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <button onClick={() => router.push(`/admin/funnels/${funnelId}`)} className="hover:text-gray-700">
          {funnelName}
        </button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span className="font-medium text-gray-900">עריכת שאלון: {stageName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">עורך שאלון</h1>
          <p className="text-gray-500 mt-1">{stageName} — {questions.length} שדות</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'שומר...' : 'שמור שאלון'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">שדות השאלון</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionEditor questions={questions} onChange={setQuestions} />
        </CardContent>
      </Card>

      {/* Live preview */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">תצוגה מקדימה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              {questions.map((q) => (
                <div key={q.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {q.label || 'שדה ללא שם'}
                    {q.required && <span className="text-red-500 mr-1">*</span>}
                  </label>
                  {q.description && (
                    <p className="text-xs text-gray-400">{q.description}</p>
                  )}
                  {q.type === 'textarea' ? (
                    <textarea
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50"
                      placeholder={q.placeholder}
                      rows={3}
                      disabled
                    />
                  ) : q.type === 'select' ? (
                    <select className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50" disabled>
                      <option>{q.placeholder || 'בחר...'}</option>
                      {q.options?.map((o, i) => <option key={i}>{o}</option>)}
                    </select>
                  ) : q.type === 'radio' ? (
                    <div className="space-y-1">
                      {q.options?.map((o, i) => (
                        <label key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="radio" disabled name={q.id} />
                          {o}
                        </label>
                      ))}
                    </div>
                  ) : q.type === 'checkbox' ? (
                    <div className="space-y-1">
                      {q.options?.map((o, i) => (
                        <label key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox" disabled />
                          {o}
                        </label>
                      ))}
                    </div>
                  ) : q.type === 'file' ? (
                    <input type="file" className="text-sm text-gray-400" disabled />
                  ) : (
                    <input
                      type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50"
                      placeholder={q.placeholder}
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
