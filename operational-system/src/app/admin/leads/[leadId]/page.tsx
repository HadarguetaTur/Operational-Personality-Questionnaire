'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getReportUrl } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  ExternalLink,
  Mail,
  FileText,
  Calendar,
  CreditCard,
  Save,
  User,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

interface LeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  marketing_consent: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  result_pattern: string | null;
  result_scale_stage: string | null;
  result_top_metric: string | null;
  report_token: string | null;
  payment_status: string | null;
  payment_date: string | null;
  payment_amount: number | null;
  drive_folder_url: string | null;
  followup_submitted_at: string | null;
  meeting_booked_at: string | null;
  lead_status: string | null;
  notes: string | null;
  tags: string[] | null;
}

interface EmailLog {
  id: string;
  subject: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface DocumentRow {
  id: string;
  file_name: string;
  file_url: string;
  drive_url: string | null;
  uploaded_at: string;
}

const leadStatusLabels: Record<string, string> = {
  new: 'חדש',
  in_progress: 'באבחון',
  completed: 'הושלם',
  paid: 'שילם',
  followup_sent: 'טופס נשלח',
  meeting_booked: 'פגישה נקבעה',
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'לא שולם',
  pending: 'ממתין',
  paid: 'שולם',
  refunded: 'הוחזר',
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const supabase = createClient();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editTags, setEditTags] = useState('');

  const fetchData = useCallback(async () => {
    const [leadRes, emailsRes, docsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('email_logs').select('id, subject, status, sent_at, created_at').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('documents').select('id, file_name, file_url, drive_url, uploaded_at').eq('lead_id', leadId).order('uploaded_at', { ascending: false }),
    ]);

    if (leadRes.data) {
      setLead(leadRes.data as LeadDetail);
      setEditNotes(leadRes.data.notes ?? '');
      setEditStatus(leadRes.data.lead_status ?? 'new');
      setEditTags((leadRes.data.tags ?? []).join(', '));
    }
    setEmails(emailsRes.data ?? []);
    setDocuments(docsRes.data ?? []);
    setLoading(false);
  }, [supabase, leadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('leads')
      .update({
        lead_status: editStatus,
        notes: editNotes || null,
        tags: editTags ? editTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })
      .eq('id', leadId);
    setSaving(false);
    toast.success('הליד עודכן');
    fetchData();
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">ליד לא נמצא</p>
        <Button variant="outline" onClick={() => router.push('/admin/leads')}>חזרה ללידים</Button>
      </div>
    );
  }

  // Build timeline events
  const timeline: { date: string; icon: React.ElementType; label: string; color: string }[] = [];
  if (lead.created_at) timeline.push({ date: lead.created_at, icon: User, label: 'ליד נוצר', color: 'text-blue-500' });
  if (lead.started_at) timeline.push({ date: lead.started_at, icon: Clock, label: 'התחיל אבחון', color: 'text-purple-500' });
  if (lead.completed_at) timeline.push({ date: lead.completed_at, icon: FileText, label: 'השלים אבחון', color: 'text-green-500' });
  if (lead.payment_date) timeline.push({ date: lead.payment_date, icon: CreditCard, label: 'ביצע תשלום', color: 'text-emerald-500' });
  if (lead.followup_submitted_at) timeline.push({ date: lead.followup_submitted_at, icon: FileText, label: 'הגיש טופס המשך', color: 'text-orange-500' });
  if (lead.meeting_booked_at) timeline.push({ date: lead.meeting_booked_at, icon: Calendar, label: 'קבע פגישה', color: 'text-teal-500' });
  emails.forEach((e) => {
    if (e.sent_at) timeline.push({ date: e.sent_at, icon: Mail, label: `מייל: ${e.subject ?? 'ללא נושא'}`, color: 'text-pink-500' });
  });
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button onClick={() => router.push('/admin/leads')} className="hover:text-gray-700">לידים</button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span className="font-medium text-gray-900">{lead.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-gray-500 mt-1" dir="ltr">{lead.email} {lead.phone ? `| ${lead.phone}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {lead.report_token && (
            <a href={getReportUrl(lead.report_token)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                צפה בדוח
              </Button>
            </a>
          )}
          {lead.drive_folder_url && (
            <a href={lead.drive_folder_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                תיקיית דרייב
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Info + Edit */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פרטי ליד</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">דפוס ניהולי</span>
                  <span className="font-medium">{lead.result_pattern ?? '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">שלב סקאלה</span>
                  <span className="font-medium">{lead.result_scale_stage ?? '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">מטריקה מובילה</span>
                  <span className="font-medium">{lead.result_top_metric ?? '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">משך אבחון</span>
                  <span className="font-medium">{lead.duration_seconds ? `${Math.round(lead.duration_seconds / 60)} דקות` : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">סכום תשלום</span>
                  <span className="font-medium">{lead.payment_amount ? `₪${lead.payment_amount}` : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">הסכמה שיווקית</span>
                  <span className="font-medium">{lead.marketing_consent ? 'כן' : 'לא'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">עדכון ליד</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סטטוס ליד</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(leadStatusLabels).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>תגיות (מופרדות בפסיק)</Label>
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="VIP, בעדיפות גבוהה, ..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>הערות</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="הערות פנימיות..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </CardContent>
          </Card>

          {/* Documents */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  מסמכים ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <span className="text-sm font-medium">{doc.file_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDate(doc.uploaded_at)}</span>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                ציר זמן
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-400">אין פעילות עדיין</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, idx) => {
                    const Icon = event.icon;
                    return (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center ${event.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {idx < timeline.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-gray-900">{event.label}</p>
                          <p className="text-xs text-gray-400">{formatDate(event.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">סטטוס</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">סטטוס ליד</span>
                <Badge>{leadStatusLabels[lead.lead_status ?? 'new'] ?? 'חדש'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">תשלום</span>
                <Badge variant={lead.payment_status === 'paid' ? 'success' : 'secondary'}>
                  {paymentStatusLabels[lead.payment_status ?? 'unpaid'] ?? 'לא שולם'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">נוצר</span>
                <span className="text-sm">{formatDate(lead.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
