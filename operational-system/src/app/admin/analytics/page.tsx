'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MousePointerClick, Rocket, TrendingUp, Users } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface LandingEvent {
  event_type: 'page_view' | 'cta_click' | 'quiz_start';
  visitor_id: string | null;
  cta_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  created_at: string;
}

type RangeKey = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 };

function formatDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface DailyRow {
  day: string;
  label: string;
  page_views: number;
  cta_clicks: number;
  quiz_starts: number;
}

interface SourceRow {
  source: string;
  medium: string;
  campaign: string;
  page_views: number;
  cta_clicks: number;
  quiz_starts: number;
  ctr: number;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [events, setEvents] = useState<LandingEvent[]>([]);
  /** Total rows visible to this admin (RLS). Used to distinguish empty range vs empty table. */
  const [globalEventCount, setGlobalEventCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setGlobalEventCount(null);
      const supabase = createClient();
      if (!supabase) return;
      const since = new Date();
      since.setDate(since.getDate() - RANGE_DAYS[range]);

      const [eventsRes, countRes] = await Promise.all([
        supabase
          .from('landing_events')
          .select('event_type, visitor_id, cta_id, utm_source, utm_medium, utm_campaign, referrer, created_at')
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('landing_events').select('*', { count: 'exact', head: true })
      ]);

      if (cancelled) return;

      if (!countRes.error && typeof countRes.count === 'number') {
        setGlobalEventCount(countRes.count);
      } else if (!countRes.error) {
        setGlobalEventCount(null);
      }

      if (eventsRes.error) {
        setError(eventsRes.error.message || 'טעינת נתונים נכשלה');
        setLoading(false);
        return;
      }
      setEvents((eventsRes.data ?? []) as LandingEvent[]);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [range]);

  const kpis = useMemo(() => {
    const pageViews = events.filter(e => e.event_type === 'page_view').length;
    const ctaClicks = events.filter(e => e.event_type === 'cta_click').length;
    const quizStarts = events.filter(e => e.event_type === 'quiz_start').length;
    const uniqueVisitors = new Set(
      events.filter(e => e.event_type === 'page_view' && e.visitor_id).map(e => e.visitor_id)
    ).size;
    const ctaCtr = pageViews > 0 ? (ctaClicks / pageViews) * 100 : 0;
    const completionRate = ctaClicks > 0 ? (quizStarts / ctaClicks) * 100 : 0;
    return { pageViews, ctaClicks, quizStarts, uniqueVisitors, ctaCtr, completionRate };
  }, [events]);

  const daily: DailyRow[] = useMemo(() => {
    const days = RANGE_DAYS[range];
    const buckets = new Map<string, DailyRow>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDay(d);
      buckets.set(key, { day: key, label: formatDayShort(d), page_views: 0, cta_clicks: 0, quiz_starts: 0 });
    }
    for (const e of events) {
      const key = formatDay(new Date(e.created_at));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (e.event_type === 'page_view')  bucket.page_views++;
      if (e.event_type === 'cta_click')  bucket.cta_clicks++;
      if (e.event_type === 'quiz_start') bucket.quiz_starts++;
    }
    return Array.from(buckets.values());
  }, [events, range]);

  const bySource: SourceRow[] = useMemo(() => {
    const map = new Map<string, SourceRow>();
    for (const e of events) {
      const source = e.utm_source ?? 'direct';
      const medium = e.utm_medium ?? 'none';
      const campaign = e.utm_campaign ?? 'none';
      const key = `${source}|${medium}|${campaign}`;
      let row = map.get(key);
      if (!row) {
        row = { source, medium, campaign, page_views: 0, cta_clicks: 0, quiz_starts: 0, ctr: 0 };
        map.set(key, row);
      }
      if (e.event_type === 'page_view')  row.page_views++;
      if (e.event_type === 'cta_click')  row.cta_clicks++;
      if (e.event_type === 'quiz_start') row.quiz_starts++;
    }
    return Array.from(map.values())
      .map(r => ({ ...r, ctr: r.page_views > 0 ? (r.cta_clicks / r.page_views) * 100 : 0 }))
      .sort((a, b) => b.page_views - a.page_views)
      .slice(0, 10);
  }, [events]);

  const ctaBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== 'cta_click') continue;
      const key = e.cta_id ?? 'unknown';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  return (
    <div className="space-y-6 p-6 md:p-8" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">אנליטיקת דף הנחיתה</h1>
          <p className="text-sm text-gray-500 mt-1">משפך מהדף הראשי אל השאלון, מקטוע לפי מקור.</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="tablist" aria-label="טווח זמן">
          {(['7d', '30d', '90d'] as RangeKey[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r === '7d' ? '7 ימים' : r === '30d' ? '30 ימים' : '90 ימים'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm">
          {error}. ייתכן שהמיגרציה <code>004_landing_analytics.sql</code> לא הורצה ב-Supabase, או שהמיגרציה{' '}
          <code>008_is_admin_alignment.sql</code> לא הורצה ו־RLS חוסם קריאה (במקביל צריך לסנכרן את רשימת{' '}
          <code>ADMIN_EMAILS</code> ל־Postgres — ראי הערה ב־<code>.env.example</code>).
        </div>
      )}

      {!loading && !error && globalEventCount !== null && globalEventCount > 0 && events.length === 0 && (
        <div role="status" className="px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
          יש בסך הכל <strong>{globalEventCount}</strong> אירועים במסד, אבל אף אחד מהם לא בטווח{' '}
          {RANGE_DAYS[range]} הימים האחרונים. נסי טווח ארוך יותר או בדקי ב־Supabase את{' '}
          <code>landing_events.created_at</code>.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Eye} label="צפיות בדף" value={kpis.pageViews} loading={loading} />
        <KpiCard icon={Users} label="מבקרים ייחודיים" value={kpis.uniqueVisitors} loading={loading} />
        <KpiCard icon={MousePointerClick} label="לחיצות על CTA" value={kpis.ctaClicks} loading={loading} />
        <KpiCard icon={Rocket} label="התחילו שאלון" value={kpis.quizStarts} loading={loading} />
        <KpiCard
          icon={TrendingUp}
          label="CTR (לחיצה / צפייה)"
          value={kpis.ctaCtr.toFixed(1) + '%'}
          loading={loading}
          accent
        />
      </div>

      {/* Daily chart */}
      <Card>
        <CardHeader>
          <CardTitle>פעילות יומית</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-72" dir="ltr">
            {loading ? (
              <div className="w-full h-full bg-gray-100 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                    labelFormatter={(l) => `יום ${l}`}
                  />
                  <Legend />
                  <Bar dataKey="page_views" name="צפיות"     fill="#0d9488" />
                  <Bar dataKey="cta_clicks" name="לחיצות"   fill="#f59e0b" />
                  <Bar dataKey="quiz_starts" name="התחלו שאלון" fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>פירוק לפי מקור (UTM)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : bySource.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">אין נתונים בטווח שנבחר.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right border-b border-gray-200 text-gray-600">
                      <th className="py-2 px-2 font-medium">מקור</th>
                      <th className="py-2 px-2 font-medium">קמפיין</th>
                      <th className="py-2 px-2 font-medium text-left tabular-nums">צפיות</th>
                      <th className="py-2 px-2 font-medium text-left tabular-nums">לחיצות</th>
                      <th className="py-2 px-2 font-medium text-left tabular-nums">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySource.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 px-2">
                          <div className="font-medium text-gray-900">{row.source}</div>
                          <div className="text-xs text-gray-500">{row.medium}</div>
                        </td>
                        <td className="py-2 px-2 text-gray-600">{row.campaign}</td>
                        <td className="py-2 px-2 text-left tabular-nums">{row.page_views}</td>
                        <td className="py-2 px-2 text-left tabular-nums">{row.cta_clicks}</td>
                        <td className="py-2 px-2 text-left tabular-nums text-teal-700">{row.ctr.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>פירוק לחיצות לפי כפתור</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : ctaBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">אין לחיצות בטווח שנבחר.</p>
            ) : (
              <ul className="space-y-2">
                {ctaBreakdown.map((row) => {
                  const max = ctaBreakdown[0].count;
                  const pct = max > 0 ? (row.count / max) * 100 : 0;
                  return (
                    <li key={row.name} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-gray-700 truncate" title={row.name}>{row.name}</span>
                      <div className="flex-1 h-6 rounded bg-gray-100 relative overflow-hidden" dir="ltr">
                        <div
                          className="absolute inset-y-0 right-0 bg-amber-400/80"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-left tabular-nums text-sm font-medium text-gray-900">{row.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-gray-500">
        טווח זמן: {RANGE_DAYS[range]} ימים אחרונים. שיעור השלמת מעבר לשאלון: {kpis.completionRate.toFixed(1)}% (התחילו / לחצו).
      </p>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  loading?: boolean;
  accent?: boolean;
}

function KpiCard({ icon: Icon, label, value, loading, accent }: KpiCardProps) {
  return (
    <Card className={accent ? 'border-teal-200 bg-teal-50/30' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600 font-medium">{label}</span>
          <Icon className={`w-4 h-4 ${accent ? 'text-teal-600' : 'text-gray-400'}`} />
        </div>
        {loading ? (
          <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className={`text-2xl md:text-3xl font-bold tabular-nums ${accent ? 'text-teal-700' : 'text-gray-900'}`}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
