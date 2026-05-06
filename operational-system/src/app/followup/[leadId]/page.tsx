'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react';

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

export default function FollowupFormPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const supabase = createClient();

  const [lead, setLead] = useState<{ name: string; email: string } | null>(null);
  const [fields, setFields] = useState<FormFieldDef[]>(DEFAULT_FIELDS);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchLead = async () => {
      const { data } = await supabase
        .from('leads')
        .select('name, email, funnel_id, current_stage_id, followup_submitted_at')
        .eq('id', leadId)
        .single();

      if (!data) {
        setError('טופס לא נמצא');
        setLoading(false);
        return;
      }

      if (data.followup_submitted_at) {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      setLead({ name: data.name, email: data.email });

      // Load custom form config if exists
      if (data.current_stage_id) {
        const { data: config } = await supabase
          .from('questionnaire_configs')
          .select('questions')
          .eq('stage_id', data.current_stage_id)
          .single();

        if (config?.questions && Array.isArray(config.questions) && config.questions.length > 0) {
          setFields(config.questions as FormFieldDef[]);
        }
      }

      setLoading(false);
    };

    fetchLead();
  }, [leadId, supabase]);

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
    setSubmitting(true);
    setError('');

    try {
      // Validate required fields
      for (const field of fields) {
        if (field.required && field.type !== 'file' && !formData[field.id]?.trim()) {
          setError(`נא למלא את השדה: ${field.label}`);
          setSubmitting(false);
          return;
        }
      }

      // Upload files to Supabase Storage
      const uploadedDocs: Array<{ fileName: string; fileUrl: string; mimeType: string; fileSize: number; storagePath: string }> = [];

      for (const file of files) {
        const ext = file.name.split('.').pop() ?? 'bin';
        const storagePath = `followup/${leadId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath);

        uploadedDocs.push({
          fileName: file.name,
          fileUrl: urlData.publicUrl,
          mimeType: file.type || `application/${ext}`,
          fileSize: file.size,
          storagePath,
        });
      }

      // Save form submission
      await supabase.from('followup_submissions').insert({
        lead_id: leadId,
        form_data: formData,
      });

      // Save document records
      for (const doc of uploadedDocs) {
        await supabase.from('documents').insert({
          lead_id: leadId,
          file_name: doc.fileName,
          file_url: doc.fileUrl,
          mime_type: doc.mimeType,
          file_size: doc.fileSize,
          storage_path: doc.storagePath,
        });
      }

      // Update lead status
      await supabase
        .from('leads')
        .update({ followup_submitted_at: new Date().toISOString(), lead_status: 'completed' })
        .eq('id', leadId);

      // Trigger Drive folder creation and file sync
      try {
        await fetch('/api/drive/create-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        });
      } catch (driveErr) {
        console.error('Drive folder creation failed:', driveErr);
      }

      // Send meeting booking email + WhatsApp
      try {
        await fetch('/api/notifications/followup-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        });
      } catch (notifErr) {
        console.error('Notification send failed:', notifErr);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Form submission error:', err);
      setError('שגיאה בשליחת הטופס. נסי שוב.');
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
            <Button variant="outline" onClick={() => router.push('/')}>חזרה לדף הבית</Button>
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
            <Button variant="outline" onClick={() => router.push('/')}>חזרה לדף הבית</Button>
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
                        <option key={opt} value={opt}>{opt}</option>
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
                      <label htmlFor={field.id} className="text-sm text-gray-700">{field.placeholder}</label>
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
                              <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
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

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
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
