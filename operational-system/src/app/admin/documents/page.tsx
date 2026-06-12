'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { openLeadDocument } from '@/lib/admin/openLeadDocument';

interface DocumentRow {
  id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  storage_path: string | null;
  drive_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  leads?: { name: string; email: string } | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*, leads(name, email)')
      .order('uploaded_at', { ascending: false })
      .limit(100);
    setDocuments(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const filtered = search.trim()
    ? documents.filter(
        (d) =>
          d.file_name.toLowerCase().includes(search.toLowerCase()) ||
          (d.leads && (d.leads as { name: string; email: string }).name?.toLowerCase().includes(search.toLowerCase()))
      )
    : documents;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">מסמכים</h1>
        <p className="text-gray-500 mt-1">מסמכים שהועלו על ידי לידים</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="חיפוש לפי שם קובץ או ליד..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-gray-500">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>אין מסמכים עדיין</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">קובץ</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">ליד</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">סוג</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">גודל</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">תאריך</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">קישורים</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => {
                    const leadData = doc.leads as { name: string; email: string } | null;
                    return (
                      <tr key={doc.id}>
                        <td className="py-3 px-4 font-medium">{doc.file_name}</td>
                        <td className="py-3 px-4 text-gray-600">{leadData?.name ?? doc.lead_id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-gray-500">{doc.mime_type ?? '-'}</td>
                        <td className="py-3 px-4 text-gray-500">{formatFileSize(doc.file_size)}</td>
                        <td className="py-3 px-4 text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('he-IL')}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const r = await openLeadDocument(doc.storage_path, doc.file_url);
                                if (!r.ok) toast.error(r.message);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                              title="פתח קובץ"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            {doc.drive_url && (
                              <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800" title="Google Drive">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
