'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Mail, Eye, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  funnel_id: string | null;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  payment_status: string | null;
  lead_status: string | null;
  result_pattern: string | null;
}

export default function MailingPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [templatesRes, leadsRes] = await Promise.all([
      supabase.from('email_templates').select('id, name, subject, html_content, funnel_id'),
      supabase.from('leads').select('id, name, email, payment_status, lead_status, result_pattern').order('created_at', { ascending: false }),
    ]);
    setTemplates(templatesRes.data ?? []);
    setLeads(leadsRes.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLeads = leads.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'paid') return l.payment_status === 'paid';
    if (filter === 'unpaid') return l.payment_status === 'unpaid' || !l.payment_status;
    if (filter === 'completed') return l.lead_status === 'completed';
    if (filter === 'new') return l.lead_status === 'new' || !l.lead_status;
    return true;
  });

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
    setSelectAll(!selectAll);
  };

  const selectedTemplate$ = templates.find((t) => t.id === selectedTemplate);

  const handleSend = async () => {
    if (!selectedTemplate || selectedLeadIds.size === 0) {
      toast.error('בחרי תבנית ולפחות נמען אחד');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate,
          lead_ids: Array.from(selectedLeadIds),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.sent ?? selectedLeadIds.size} מיילים נשלחו בהצלחה`);
        setSelectedLeadIds(new Set());
        setSelectAll(false);
      } else {
        const err = await res.json();
        toast.error(err.error || 'שגיאה בשליחה');
      }
    } catch {
      toast.error('שגיאה בשליחת מיילים');
    } finally {
      setSending(false);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">שליחת דיוור</h1>
        <p className="text-gray-500 mt-1">בחרי תבנית, סנני נמענים ושלחי</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template selection + filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5" />
                בחירת תבנית
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="בחרי תבנית מייל..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate$ && (
                <div className="text-sm space-y-1 p-3 bg-gray-50 rounded-lg">
                  <p><span className="text-gray-500">נושא:</span> {selectedTemplate$.subject}</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-blue-600"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-3.5 h-3.5 ml-1" />
                    {showPreview ? 'הסתר תצוגה מקדימה' : 'תצוגה מקדימה'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                סינון נמענים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={filter} onValueChange={(v) => { setFilter(v); setSelectedLeadIds(new Set()); setSelectAll(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הלידים</SelectItem>
                  <SelectItem value="paid">שילמו</SelectItem>
                  <SelectItem value="unpaid">לא שילמו</SelectItem>
                  <SelectItem value="completed">השלימו אבחון</SelectItem>
                  <SelectItem value="new">חדשים</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{filteredLeads.length} לידים</span>
                <span className="text-sm font-medium text-blue-600">{selectedLeadIds.size} נבחרו</span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSend}
            disabled={sending || !selectedTemplate || selectedLeadIds.size === 0}
            className="w-full gap-2 h-12 text-base"
          >
            <Send className="w-5 h-5" />
            {sending ? 'שולח...' : `שלח ל-${selectedLeadIds.size} נמענים`}
          </Button>
        </div>

        {/* Right: Lead selection + preview */}
        <div className="lg:col-span-2 space-y-4">
          {showPreview && selectedTemplate$ && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">תצוגה מקדימה</CardTitle>
                <CardDescription>נושא: {selectedTemplate$.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border rounded-lg p-4 bg-white max-h-[300px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate$.html_content }}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">רשימת נמענים</CardTitle>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectAll ? 'בטל בחירה' : 'בחר הכל'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b">
                      <th className="py-2 px-4 text-right w-10"></th>
                      <th className="py-2 px-4 text-right font-medium text-gray-500">שם</th>
                      <th className="py-2 px-4 text-right font-medium text-gray-500">אימייל</th>
                      <th className="py-2 px-4 text-right font-medium text-gray-500">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className={`border-b border-gray-50 cursor-pointer transition-colors ${selectedLeadIds.has(lead.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleLead(lead.id)}
                      >
                        <td className="py-2 px-4">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedLeadIds.has(lead.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                            {selectedLeadIds.has(lead.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </td>
                        <td className="py-2 px-4 font-medium">{lead.name}</td>
                        <td className="py-2 px-4 text-gray-600" dir="ltr">{lead.email}</td>
                        <td className="py-2 px-4">
                          <Badge variant={lead.payment_status === 'paid' ? 'success' : 'secondary'}>
                            {lead.payment_status === 'paid' ? 'שולם' : 'לא שולם'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          אין לידים התואמים לסינון
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
