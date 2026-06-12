'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getReportUrl } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ExternalLink, Download, ChevronUp, ChevronDown, Eye, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  result_pattern: string | null;
  result_scale_stage: string | null;
  payment_status: string | null;
  lead_status: string | null;
  lead_source: string | null;
  report_token: string | null;
  drive_folder_url: string | null;
  marketing_consent: boolean;
}

const paymentStatusLabels: Record<string, { text: string; cls: string }> = {
  paid: { text: 'שולם', cls: 'bg-green-100 text-green-700' },
  pending: { text: 'ממתין', cls: 'bg-yellow-100 text-yellow-700' },
  unpaid: { text: 'לא שולם', cls: 'bg-gray-100 text-gray-600' },
  refunded: { text: 'הוחזר', cls: 'bg-red-100 text-red-600' },
};

const leadStatusLabels: Record<string, string> = {
  new: 'חדש',
  in_progress: 'באבחון',
  completed: 'הושלם',
  paid: 'שילם',
  followup_sent: 'טופס נשלח',
  meeting_booked: 'פגישה נקבעה',
  meeting_completed: 'פגישה התקיימה',
  awaiting_quote: 'מחכה להצעת מחיר',
  awaiting_diagnostic: 'מחכה לאפיון',
  meeting_cancelled: 'פגישה בוטלה',
};

const leadSourceLabels: Record<string, string> = {
  instagram: 'אינסטגרם',
  facebook: 'פייסבוק',
  landing_page: 'דף נחיתה',
  whatsapp: 'וואטסאפ',
};

type SortField = 'created_at' | 'name' | 'email' | 'payment_status';
type SortDir = 'asc' | 'desc';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 50;
  const supabase = createClient();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order(sortField, { ascending: sortDir === 'asc' })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (statusFilter !== 'all') {
      query = query.eq('payment_status', statusFilter);
    }
    if (leadStatusFilter !== 'all') {
      query = query.eq('lead_status', leadStatusFilter);
    }
    if (sourceFilter !== 'all') {
      query = query.eq('lead_source', sourceFilter);
    }
    if (searchDebounced.trim()) {
      query = query.or(`name.ilike.%${searchDebounced}%,email.ilike.%${searchDebounced}%,phone.ilike.%${searchDebounced}%`);
    }

    const { data, count } = await query;
    setLeads(data ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [supabase, page, statusFilter, leadStatusFilter, sourceFilter, searchDebounced, sortField, sortDir]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const exportCsv = () => {
    const headers = ['שם', 'אימייל', 'טלפון', 'מקור הגעה', 'דפוס', 'סטטוס תשלום', 'סטטוס ליד', 'תאריך'];
    const rows = leads.map((l) => [
      l.name,
      l.email,
      l.phone ?? '',
      l.lead_source ? (leadSourceLabels[l.lead_source] ?? l.lead_source) : '',
      l.result_pattern ?? '',
      paymentStatusLabels[l.payment_status ?? 'unpaid']?.text ?? '',
      leadStatusLabels[l.lead_status ?? 'new'] ?? '',
      new Date(l.created_at).toLocaleDateString('he-IL'),
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    await supabase
      .from('leads')
      .update({ lead_status: newStatus })
      .in('id', Array.from(selectedIds));
    toast.success(`${selectedIds.size} לידים עודכנו`);
    setSelectedIds(new Set());
    fetchLeads();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">לידים</h1>
          <p className="text-gray-500 mt-1">{totalCount} לידים בסה&quot;כ</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Select onValueChange={bulkUpdateStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={`עדכן ${selectedIds.size} נבחרים`} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leadStatusLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="תשלום" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל התשלומים</SelectItem>
            <SelectItem value="unpaid">לא שולם</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="paid">שולם</SelectItem>
            <SelectItem value="refunded">הוחזר</SelectItem>
          </SelectContent>
        </Select>
        <Select value={leadStatusFilter} onValueChange={(v) => { setLeadStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="סטטוס ליד" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(leadStatusLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="מקור הגעה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המקורות</SelectItem>
            {Object.entries(leadSourceLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-gray-500">טוען...</div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center text-gray-500">לא נמצאו לידים</div>
          ) : (
            <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border/60">
              {leads.map((lead) => {
                const ps = paymentStatusLabels[lead.payment_status ?? 'unpaid'] ?? paymentStatusLabels.unpaid;
                return (
                  <Link
                    key={lead.id}
                    href={`/admin/leads/${lead.id}`}
                    className="block px-4 py-3 active:bg-accent/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{lead.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${ps.cls}`}>{ps.text}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate" dir="ltr">
                      {lead.phone ?? lead.email}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{leadStatusLabels[lead.lead_status ?? 'new'] ?? lead.lead_status ?? '-'}</span>
                      <span>·</span>
                      <span>{lead.lead_source ? (leadSourceLabels[lead.lead_source] ?? lead.lead_source) : 'מקור לא ידוע'}</span>
                      <span className="ms-auto">{new Date(lead.created_at).toLocaleDateString('he-IL')}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="admin-table-wrap hidden md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="py-3 px-3 w-10">
                      <button onClick={toggleSelectAll} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.size === leads.length ? 'bg-primary border-primary' : 'border-input'}`}>
                        {selectedIds.size === leads.length && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                      שם <SortIcon field="name" />
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('email')}>
                      אימייל <SortIcon field="email" />
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">טלפון</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">מקור</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">דפוס</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">סטטוס</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('payment_status')}>
                      תשלום <SortIcon field="payment_status" />
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                      תאריך <SortIcon field="created_at" />
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const ps = paymentStatusLabels[lead.payment_status ?? 'unpaid'] ?? paymentStatusLabels.unpaid;
                    const isSelected = selectedIds.has(lead.id);
                    return (
                      <tr key={lead.id} data-selected={isSelected}>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleSelect(lead.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}
                          >
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-medium">{lead.name}</td>
                        <td className="py-3 px-3 text-gray-600" dir="ltr">{lead.email}</td>
                        <td className="py-3 px-3 text-gray-600" dir="ltr">{lead.phone ?? '-'}</td>
                        <td className="py-3 px-3 text-gray-600">{lead.lead_source ? (leadSourceLabels[lead.lead_source] ?? lead.lead_source) : '-'}</td>
                        <td className="py-3 px-3">{lead.result_pattern ?? '-'}</td>
                        <td className="py-3 px-3">
                          <span className="text-xs">{leadStatusLabels[lead.lead_status ?? 'new'] ?? lead.lead_status ?? '-'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ps.cls}`}>{ps.text}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-500">{new Date(lead.created_at).toLocaleDateString('he-IL')}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/leads/${lead.id}`}>
                              <Button variant="ghost" size="sm" className="p-1 h-auto">
                                <Eye className="w-4 h-4 text-gray-400" />
                              </Button>
                            </Link>
                            {lead.report_token && (
                              <a href={getReportUrl(lead.report_token)} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:text-blue-800">
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
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            הקודם
          </Button>
          <span className="text-sm text-gray-500">
            עמוד {page + 1} מתוך {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            הבא
          </Button>
        </div>
      )}
    </div>
  );
}
