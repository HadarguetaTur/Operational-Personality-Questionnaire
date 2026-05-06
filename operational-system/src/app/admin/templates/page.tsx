'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Copy, Eye, Mail } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  variables: Record<string, string>;
  funnel_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const supabase = createClient();

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .order('updated_at', { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('email_templates').delete().eq('id', deleteTarget.id);
    toast.success('התבנית נמחקה');
    setDeleteTarget(null);
    fetchTemplates();
  };

  const handleDuplicate = async (t: EmailTemplate) => {
    await supabase.from('email_templates').insert({
      name: `${t.name} (עותק)`,
      subject: t.subject,
      html_content: t.html_content,
      json_design: null,
      variables: t.variables,
      funnel_id: t.funnel_id,
    });
    toast.success('התבנית שוכפלה');
    fetchTemplates();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="text-gray-500">טוען...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">תבניות מייל</h1>
          <p className="text-gray-500 mt-1">ניהול תבניות הדיוור</p>
        </div>
        <Link href="/admin/templates/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            תבנית חדשה
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">אין תבניות מייל עדיין</p>
            <Link href="/admin/templates/new">
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                צור תבנית ראשונה
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const varCount = Object.keys(t.variables ?? {}).length;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-base">{t.name}</h3>
                    {varCount > 0 && <Badge variant="secondary">{varCount} משתנים</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 mb-1">נושא: {t.subject || '(ריק)'}</p>
                  <p className="text-xs text-gray-400 mb-4">
                    עודכן {new Date(t.updated_at).toLocaleDateString('he-IL')}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => { setPreviewHtml(t.html_content); setPreviewOpen(true); }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      תצוגה
                    </Button>
                    <Link href={`/admin/templates/${t.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Pencil className="w-3.5 h-3.5" />
                        עריכה
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDuplicate(t)}>
                      <Copy className="w-3.5 h-3.5" />
                      שכפל
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה</DialogTitle>
            <DialogDescription>כך המייל ייראה</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={previewHtml}
              className="w-full min-h-[400px] border-0"
              title="Email Preview"
              sandbox=""
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="מחיקת תבנית"
        description={`האם למחוק את התבנית "${deleteTarget?.name}"? פעולה זו לא ניתנת לביטול.`}
        confirmLabel="מחק"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
