'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { isTurnstileSiteConfigured, TurnstileWidget } from '@/components/security/TurnstileWidget';

interface FormFieldDef {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'file' | 'date' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  accept?: string;
  maxFiles?: number;
}

const DEFAULT_FIELDS: FormFieldDef[] = [
  { id: 'business_name', type: 'text', label: 'שם העסק', placeholder: 'הזיני את שם העסק', required: true },
  { id: 'business_description', type: 'textarea', label: 'תיאור קצר של העסק', placeholder: 'ספרי בכמה משפטים מה העסק עושה...', required: true },
  { id: 'team_size', type: 'select', label: 'גודל הצוות', required: true, options: ['עצמאית (ללא עובדים)', '1-3 עובדים', '4-10 עובדים', '11-25 עובדים', '25+'] },
  { id: 'main_challenge', type: 'textarea', label: 'מה האתגר התפעולי המרכזי שלך?', placeholder: 'תארי את האתגר העיקרי...', required: true },
  { id: 'current_tools', type: 'textarea', label: 'אילו כלים/מערכות את משתמשת בהם היום?', placeholder: 'למשל: מאנדיי, גוגל שיטס, CRM...', required: false },
  { id: 'documents', type: 'file', label: 'מסמכים רלוונטיים (אופציונלי)', placeholder: '', required: false, accept: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg', maxFiles: 5 },
  { id: 'additional_notes', type: 'textarea', label: 'הערות נוספות', placeholder: 'כל מה שחשוב שאדע לפני הפגישה...', required: false },
];

interface MetadataResponse {
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    followup_submitted_at: string | null;
  };
  fields: FormFieldDef[] | null;
}

function FollowupFormInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = params.leadId as string;
  const followupToken =
    searchParams.get('t') ?? searchParams.get('token') ?? undefined;

  const [lead, setLead] = useState<{ name: string; email: string } | null>(null);
  const [fields, setFields] = useState<FormFieldDef[]>(DEFAULT_FIELDS);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileMountKey, setTurnstileMountKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams({ leadId });
    if (followupToken) q.set('token', followupToken);
    return q.toString();
  }, [leadId, followupToken]);

  const loadMetadata = useCallback(async () => {
    const res = await fetch(`/api/followup/metadata?${query}`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data?.error === 'string' ? data.error : 'טופס לא נמצא');
      setLoading(false);
      return;
    }
    const m = data as MetadataResponse;
    if (m.lead?.followup_submitted_at) {
      setSubmitted(true);
      setLoading(false);
      return;
    }

    setLead({
      name: m.lead.name ?? '',
      email: m.lead.email ?? '',
    });

    if (m.fields && Array.isArray(m.fields) && m.fields.length > 0) {
      setFields(m.fields as FormFieldDef[]);
    }

    setLoading(false);
  }, [query]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const handleChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    const maxFiles = fields.find((f) => f.type === 'file')?.maxFiles ?? 5;
    setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isTurnstileSiteConfigured() && (!turnstileToken || turnstileToken.trim() === '')) {
      setError('נא לאמת את האבטחה לפני השליחה');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      for (const field of fields) {
        if (field.required && field.type !== 'file' && !formData[field.id]?.trim()) {
          setError(`נא למלא את השדה: ${field.label}`);
          setSubmitting(false);
          return;
        }
      }

      const payload: Record<string, unknown> = { ...formData };
      fields.forEach((f) => {
        if (f.type === 'checkbox') {
          payload[f.id] = formData[f.id] === 'true';
        }
      });

      const fd = new FormData();
      fd.append('leadId', leadId);
      if (followupToken) fd.append('token', followupToken);
      if (turnstileToken) fd.append('turnstileToken', turnstileToken);
      fd.append('formData', JSON.stringify(payload));
      files.forEach((f) => fd.append('file', f));

      const res = await fetch('/api/followup/submit', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof out?.error === 'string' ? out.error : 'שגיאה בשליחת הטופס');
        setTurnstileToken(null);
        setTurnstileMountKey((k) => k + 1);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('שגיאה בשליחת הטופס. נסי שוב.');
      setTurnstileToken(null);
      setTurnstileMountKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">הטופס נשלח בהצלחה!</h2>
            <p className="text-gray-500 mb-6">
              תודה! קיבלנו את כל הפרטים. בקרוב תקבלי למייל קישור לקביעת פגישה.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>
              חזרה לדף הבית
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.push('/')}>
              חזרה לדף הבית
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">טופס פרטים לפני הפגישה</CardTitle>
            <CardDescription>
              {lead?.name ? `שלום ${lead.name}, ` : ''}
              נא למלא את הפרטים הבאים כדי שנוכל להתכונן לפגישה בצורה הטובה ביותר.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-red-500 mr-1">*</span>}
                  </Label>

                  {field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'date' ? (
                    <Input
                      id={field.id}
                      type={field.type === 'phone' ? 'tel' : field.type}
                      placeholder={field.placeholder}
                      value={formData[field.id] ?? ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                      dir={field.type === 'email' || field.type === 'phone' ? 'ltr' : undefined}
                    />
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder}
                      value={formData[field.id] ?? ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                      rows={4}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={field.id}
                      value={formData[field.id] ?? ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      required={field.required}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">בחר...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2">
                      <input
                        id={field.id}
                        type="checkbox"
                        checked={formData[field.id] === 'true'}
                        onChange={(e) => handleChange(field.id, e.target.checked ? 'true' : 'false')}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor={field.id} className="text-sm text-gray-700">
                        {field.placeholder}
                      </label>
                    </div>
                  ) : field.type === 'file' ? (
                    <div className="space-y-3">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">לחצי להעלאת קבצים</p>
                        <p className="text-xs text-gray-400 mt-1">
                          עד {field.maxFiles ?? 5} קבצים. {field.accept ?? 'PDF, DOC, XLSX, תמונות'}
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={field.accept}
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {files.length > 0 && (
                        <div className="space-y-2">
                          {files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <span className="text-sm text-gray-700 truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              {isTurnstileSiteConfigured() ? (
                <div className="flex justify-center">
                  <TurnstileWidget
                    key={turnstileMountKey}
                    onToken={setTurnstileToken}
                    className="min-h-[65px]"
                  />
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={
                  submitting ||
                  (isTurnstileSiteConfigured() && !turnstileToken)
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  'שלח טופס'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FollowupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}

export default function FollowupFormPage() {
  return (
    <Suspense fallback={<FollowupLoading />}>
      <FollowupFormInner />
    </Suspense>
  );
}
