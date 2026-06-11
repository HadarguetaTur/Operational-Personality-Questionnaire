'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GitBranch, Mail, FileText, TrendingUp, Clock, Plus, Send, ArrowLeft, Instagram, Facebook, MessageCircle, Globe, Bell, CalendarX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardStats {
  totalLeads: number;
  activeFunnels: number;
  emailsSent: number;
  documentsUploaded: number;
  leadsThisWeek: number;
  completedQuizzes: number;
}

interface DailyLeadCount {
  date: string;
  count: number;
}

interface PaymentBreakdown {
  name: string;
  value: number;
  color: string;
}

interface SourceCard {
  key: string;
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

interface AttentionLead {
  id: string;
  name: string;
  meeting_at: string | null;
  meeting_type: string | null;
}

const MEETING_TYPE_HE: Record<string, string> = {
  intro: 'שיחת היכרות',
  diagnostic: 'שיחת אפיון',
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#6b7280', '#ef4444'];

const SOURCE_META: Array<{ key: string; label: string; icon: React.ElementType; color: string; bg: string }> = [
  { key: 'landing_page', label: 'דף נחיתה', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'instagram', label: 'אינסטגרם', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
  { key: 'facebook', label: 'פייסבוק', icon: Facebook, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'whatsapp', label: 'וואטסאפ', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeFunnels: 0,
    emailsSent: 0,
    documentsUploaded: 0,
    leadsThisWeek: 0,
    completedQuizzes: 0,
  });
  const [recentLeads, setRecentLeads] = useState<Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
    result_pattern: string | null;
    payment_status: string | null;
  }>>([]);
  const [dailyLeads, setDailyLeads] = useState<DailyLeadCount[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [sourceCards, setSourceCards] = useState<SourceCard[]>([]);
  const [pendingMeetings, setPendingMeetings] = useState<AttentionLead[]>([]);
  const [recentCancellations, setRecentCancellations] = useState<AttentionLead[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [leadsRes, funnelsRes, emailsRes, docsRes, recentRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('funnels').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
          supabase.from('documents').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id, name, email, created_at, result_pattern, payment_status').order('created_at', { ascending: false }).limit(8),
        ]);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const [weekLeadsRes, completedRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
          supabase.from('leads').select('id', { count: 'exact', head: true }).not('result_pattern', 'is', null),
        ]);

        setStats({
          totalLeads: leadsRes.count ?? 0,
          activeFunnels: funnelsRes.count ?? 0,
          emailsSent: emailsRes.count ?? 0,
          documentsUploaded: docsRes.count ?? 0,
          leadsThisWeek: weekLeadsRes.count ?? 0,
          completedQuizzes: completedRes.count ?? 0,
        });

        setRecentLeads(recentRes.data ?? []);

        // Leads per day (last 14 days)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const { data: allLeads } = await supabase
          .from('leads')
          .select('created_at')
          .gte('created_at', fourteenDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        const dailyMap: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
          dailyMap[key] = 0;
        }
        (allLeads ?? []).forEach((lead) => {
          const key = new Date(lead.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
          if (dailyMap[key] !== undefined) dailyMap[key]++;
        });
        setDailyLeads(Object.entries(dailyMap).map(([date, count]) => ({ date, count })));

        // Payment breakdown
        const { data: paymentLeads } = await supabase.from('leads').select('payment_status');
        const paymentMap: Record<string, number> = { paid: 0, pending: 0, unpaid: 0, refunded: 0 };
        (paymentLeads ?? []).forEach((l) => {
          const s = l.payment_status ?? 'unpaid';
          paymentMap[s] = (paymentMap[s] ?? 0) + 1;
        });
        setPaymentBreakdown([
          { name: 'שולם', value: paymentMap.paid, color: PIE_COLORS[0] },
          { name: 'ממתין', value: paymentMap.pending, color: PIE_COLORS[1] },
          { name: 'לא שולם', value: paymentMap.unpaid, color: PIE_COLORS[2] },
          { name: 'הוחזר', value: paymentMap.refunded, color: PIE_COLORS[3] },
        ].filter((p) => p.value > 0));

        // Leads per source (platform)
        const { data: sourceLeads } = await supabase.from('leads').select('lead_source');
        const sourceMap: Record<string, number> = {};
        (sourceLeads ?? []).forEach((l) => {
          const s = l.lead_source ?? 'landing_page';
          sourceMap[s] = (sourceMap[s] ?? 0) + 1;
        });
        setSourceCards(SOURCE_META.map((m) => ({ ...m, value: sourceMap[m.key] ?? 0 })));

        // Needs attention: meetings whose time passed without a status update,
        // and meetings the bot cancelled recently (replaces Slack alerts).
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const [pendingRes, cancelledRes] = await Promise.all([
          supabase
            .from('leads')
            .select('id, name, meeting_at, meeting_type')
            .eq('meeting_status', 'scheduled')
            .lt('meeting_at', new Date().toISOString())
            .order('meeting_at', { ascending: false })
            .limit(10),
          supabase
            .from('leads')
            .select('id, name, meeting_at, meeting_type')
            .eq('meeting_status', 'cancelled')
            .gte('meeting_at', twoWeeksAgo.toISOString())
            .order('meeting_at', { ascending: false })
            .limit(10),
        ]);
        setPendingMeetings((pendingRes.data ?? []) as AttentionLead[]);
        setRecentCancellations((cancelledRes.data ?? []) as AttentionLead[]);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  const statCards = [
    { label: 'סה"כ לידים', value: stats.totalLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'משפכים פעילים', value: stats.activeFunnels, icon: GitBranch, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'מיילים שנשלחו', value: stats.emailsSent, icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'מסמכים', value: stats.documentsUploaded, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'לידים השבוע', value: stats.leadsThisWeek, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'אבחונים שהושלמו', value: stats.completedQuizzes, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'paid': return { text: 'שולם', cls: 'bg-green-100 text-green-700' };
      case 'pending': return { text: 'ממתין', cls: 'bg-yellow-100 text-yellow-700' };
      default: return { text: 'לא שולם', cls: 'bg-gray-100 text-gray-600' };
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
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">דאשבורד</h1>
          <p className="text-gray-500 mt-1">סקירה כללית של המערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/funnels">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              משפך חדש
            </Button>
          </Link>
          <Link href="/admin/mailing">
            <Button className="gap-2">
              <Send className="w-4 h-4" />
              שלח דיוור
            </Button>
          </Link>
        </div>
      </div>

      {/* Needs attention */}
      {(pendingMeetings.length > 0 || recentCancellations.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              דורש טיפול
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {pendingMeetings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  פגישות שעברו בלי עדכון סטטוס ({pendingMeetings.length}) — עדכני אם התקיימו והוסיפי סיכום:
                </p>
                <div className="space-y-1.5">
                  {pendingMeetings.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-amber-100">
                      <Link href={`/admin/leads/${l.id}`} className="font-medium text-blue-600 hover:underline">
                        {l.name}
                      </Link>
                      <span className="text-gray-500">
                        {l.meeting_type ? `${MEETING_TYPE_HE[l.meeting_type] ?? l.meeting_type} · ` : ''}
                        {l.meeting_at ? new Date(l.meeting_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recentCancellations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <CalendarX className="w-4 h-4 text-red-500" />
                  פגישות שבוטלו לאחרונה ({recentCancellations.length}):
                </p>
                <div className="space-y-1.5">
                  {recentCancellations.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-amber-100">
                      <Link href={`/admin/leads/${l.id}`} className="font-medium text-blue-600 hover:underline">
                        {l.name}
                      </Link>
                      <span className="text-gray-500">
                        {l.meeting_type ? `${MEETING_TYPE_HE[l.meeting_type] ?? l.meeting_type} · ` : ''}
                        {l.meeting_at ? new Date(l.meeting_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leads by source (platform) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">לידים לפי מקור הגעה</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sourceCards.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.key}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${s.bg}`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads over time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">לידים - 14 ימים אחרונים</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyLeads.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyLeads}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [String(value), 'לידים']}
                    contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                אין נתונים להצגה
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">פילוח תשלומים</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {paymentBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [String(value), 'לידים']} />
                  <Legend
                    formatter={(value: string) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                אין נתונים להצגה
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">לידים אחרונים</CardTitle>
            <Link href="/admin/leads">
              <Button variant="ghost" size="sm" className="gap-1 text-blue-600">
                הצג הכל
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין לידים עדיין</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-2 font-medium text-gray-500">שם</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">אימייל</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">דפוס</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">תשלום</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">תאריך</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => {
                    const paymentStatus = getStatusLabel(lead.payment_status);
                    return (
                      <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <Link href={`/admin/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                            {lead.name}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-gray-600" dir="ltr">{lead.email}</td>
                        <td className="py-3 px-2">{lead.result_pattern ?? '-'}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatus.cls}`}>
                            {paymentStatus.text}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString('he-IL')}
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
