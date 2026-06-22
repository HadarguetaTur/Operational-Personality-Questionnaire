'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  BookOpen,
  Plus,
  Copy,
  ExternalLink,
  DownloadCloud,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface GuideStats {
  id: string;
  slug: string;
  name: string;
  file_url: string;
  is_active: boolean;
  created_at: string;
  total_downloads: number;
  downloads_7d: number;
  downloads_30d: number;
  unique_visitors: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function GuidesPage() {
  const [guides, setGuides] = useState<GuideStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const loadGuides = async () => {
    try {
      const res = await fetch('/api/admin/guides');
      if (!res.ok) throw new Error('בקשה נכשלה');
      const data = await res.json();
      setGuides(data.guides ?? []);
    } catch {
      toast.error('טעינת המדריכים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuides();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(val);
    setSlugManuallyEdited(val.length > 0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    // Excel often reports an empty / generic MIME on Windows — fall back to extension.
    const ALLOWED_EXT = /\.(pdf|docx|png|jpe?g|webp|xlsx)$/i;
    if (!ALLOWED.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
      toast.error('סוג קובץ לא נתמך. מותרים: PDF, DOCX, XLSX, PNG, JPG');
      return;
    }

    setUploading(true);
    setUploadedFileName('');
    setFileUrl('');

    try {
      const supabase = createClient();
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const storagePath = `${timestamp}-${safeName}`;

      // Resolve a sane content-type — Windows may hand us an empty file.type for .xlsx.
      const contentType =
        file.type ||
        (/\.xlsx$/i.test(file.name)
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/octet-stream');

      const { error } = await supabase.storage
        .from('guides')
        .upload(storagePath, file, { contentType, upsert: false });

      if (error) {
        toast.error(error.message ?? 'העלאה נכשלה');
        return;
      }

      const { data: urlData } = supabase.storage.from('guides').getPublicUrl(storagePath);
      setFileUrl(urlData.publicUrl);
      setUploadedFileName(file.name);
      toast.success('הקובץ הועלה בהצלחה');
    } catch {
      toast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddGuide = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileUrl) {
      toast.error('יש להעלות קובץ תחילה');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          file_url: fileUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'יצירה נכשלה');
        return;
      }

      toast.success(`המדריך "${name}" נוצר`);
      setName('');
      setSlug('');
      setFileUrl('');
      setUploadedFileName('');
      setSlugManuallyEdited(false);
      loadGuides();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (guide: GuideStats) => {
    setTogglingId(guide.id);
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guide.id, is_active: !guide.is_active }),
      });

      if (!res.ok) {
        toast.error('עדכון נכשל');
        return;
      }

      toast.success(guide.is_active ? 'המדריך הושהה' : 'המדריך הופעל');
      loadGuides();
    } finally {
      setTogglingId(null);
    }
  };

  const copyLink = (guideSlug: string) => {
    const link = `${origin}/dl/${guideSlug}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success('הקישור הועתק ללוח'),
      () => toast.error('ההעתקה נכשלה')
    );
  };

  const formValid = name.trim() && slug.trim() && fileUrl;

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">מדריכים להורדה</h1>
        <p className="text-gray-500 text-sm mt-1">
          קישורי הורדה לשיתוף בוואטסאפ ובכל ערוץ. כל הורדה נרשמת.
        </p>
      </div>

      {/* Add guide form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="w-5 h-5" />
            הוסף מדריך
          </CardTitle>
          <CardDescription>
            העלי קובץ PDF מהמחשב — הקישור ייוצר אוטומטית.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddGuide} className="space-y-4">
            {/* File upload */}
            <div className="space-y-2">
              <Label>קובץ המדריך</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="guide-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2 shrink-0"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'מעלה...' : 'בחרי קובץ'}
                </Button>

                {uploadedFileName && (
                  <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[200px]">{uploadedFileName}</span>
                  </div>
                )}

                {!uploadedFileName && !uploading && (
                  <span className="text-sm text-gray-400">PDF, DOCX, XLSX, PNG, JPG עד 10MB</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="guide-name">שם המדריך</Label>
                <Input
                  id="guide-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="מדריך שיווק לעסקים"
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="guide-slug">
                  כתובת קצרה
                  <span className="text-gray-400 font-normal mr-1">(לשיתוף)</span>
                </Label>
                <div className="flex items-center gap-1 border rounded-md px-3 bg-white focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
                  <span className="text-sm text-gray-400 shrink-0">/dl/</span>
                  <input
                    id="guide-slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="marketing-guide"
                    pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                    title="אותיות לטיניות קטנות, מספרים ומקפים בלבד"
                    dir="ltr"
                    required
                    className="flex-1 py-2 text-sm bg-transparent outline-none"
                  />
                </div>
                {slug && (
                  <p className="text-xs text-gray-500 truncate">
                    {origin}/dl/{slug}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving || uploading || !formValid}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                צור מדריך
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Guides table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            מדריכים ({guides.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : guides.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <DownloadCloud className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>אין מדריכים עדיין. הוסיפי את הראשון למעלה.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-right py-3 px-4">שם</th>
                    <th className="text-right py-3 px-4">קישור לשיתוף</th>
                    <th className="text-right py-3 px-4 tabular-nums">סה״כ</th>
                    <th className="text-right py-3 px-4 tabular-nums">7 ימים</th>
                    <th className="text-right py-3 px-4 tabular-nums">30 ימים</th>
                    <th className="text-right py-3 px-4 tabular-nums">ייחודיים</th>
                    <th className="text-right py-3 px-4">פעיל</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((guide) => (
                    <tr key={guide.id}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{guide.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{formatDate(guide.created_at)}</span>
                          <a
                            href={guide.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline inline-flex items-center gap-0.5"
                          >
                            קובץ
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <code
                            className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded"
                            dir="ltr"
                          >
                            /dl/{guide.slug}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyLink(guide.slug)}
                            className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="העתק קישור מלא"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-semibold text-gray-900">
                        {guide.total_downloads}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-600">
                        {guide.downloads_7d}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-600">
                        {guide.downloads_30d}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-600">
                        <div className="flex items-center gap-1">
                          {guide.unique_visitors}
                          {guide.total_downloads > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {Math.round((guide.unique_visitors / guide.total_downloads) * 100)}%
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {togglingId === guide.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <Switch
                            checked={guide.is_active}
                            onCheckedChange={() => handleToggleActive(guide)}
                            aria-label={`${guide.is_active ? 'השהה' : 'הפעל'} ${guide.name}`}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
