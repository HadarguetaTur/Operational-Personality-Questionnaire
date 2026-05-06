'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, ExternalLink, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GeneralSettings {
  admin_email: string;
  calcom_url: string;
  company_name: string;
}

interface NotificationSettings {
  email_on_new_lead: boolean;
  email_on_payment: boolean;
  email_on_followup: boolean;
}

interface EmailDefaults {
  from_name: string;
  reply_to: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [general, setGeneral] = useState<GeneralSettings>({
    admin_email: '',
    calcom_url: '',
    company_name: 'ארכיטקטורת סקייל',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_on_new_lead: true,
    email_on_payment: true,
    email_on_followup: true,
  });

  const [emailDefaults, setEmailDefaults] = useState<EmailDefaults>({
    from_name: 'ארכיטקטורת סקייל',
    reply_to: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.general) setGeneral((prev) => ({ ...prev, ...data.general }));
          if (data.notifications) setNotifications((prev) => ({ ...prev, ...data.notifications }));
          if (data.email_defaults) setEmailDefaults((prev) => ({ ...prev, ...data.email_defaults }));
        }
      } catch {
        // Settings table might not exist yet
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          general,
          notifications,
          email_defaults: emailDefaults,
        }),
      });
      if (res.ok) {
        toast.success('ההגדרות נשמרו בהצלחה');
      } else {
        toast.error('שגיאה בשמירת ההגדרות');
      }
    } catch {
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  const integrations = [
    {
      key: 'supabase',
      label: 'Supabase',
      connected: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      url: 'https://supabase.com/dashboard',
    },
    {
      key: 'google',
      label: 'Google Workspace (Gmail + Drive)',
      connected: false,
      url: 'https://console.cloud.google.com',
    },
    {
      key: 'sumit',
      label: 'Sumit (תשלומים)',
      connected: !!process.env.NEXT_PUBLIC_PAYMENT_URL,
      url: 'https://app.sumit.co.il',
    },
    {
      key: 'calcom',
      label: 'Cal.com (פגישות)',
      connected: !!general.calcom_url,
      url: 'https://cal.com',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-gray-500 mt-1">הגדרות מערכת, התראות ואינטגרציות</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'שומר...' : 'שמור הגדרות'}
        </Button>
      </div>

      <Tabs defaultValue="general" dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">כללי</TabsTrigger>
          <TabsTrigger value="notifications">התראות</TabsTrigger>
          <TabsTrigger value="email">אימייל</TabsTrigger>
          <TabsTrigger value="integrations">אינטגרציות</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">הגדרות כלליות</CardTitle>
              <CardDescription>הגדרות בסיסיות של המערכת</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>שם העסק</Label>
                <Input
                  value={general.company_name}
                  onChange={(e) => setGeneral({ ...general, company_name: e.target.value })}
                  placeholder="שם העסק שלך"
                />
              </div>
              <div className="space-y-2">
                <Label>אימייל מנהל (לקבלת התראות)</Label>
                <Input
                  type="email"
                  value={general.admin_email}
                  onChange={(e) => setGeneral({ ...general, admin_email: e.target.value })}
                  placeholder="admin@yourdomain.com"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>קישור Cal.com לקביעת פגישות</Label>
                <Input
                  value={general.calcom_url}
                  onChange={(e) => setGeneral({ ...general, calcom_url: e.target.value })}
                  placeholder="https://cal.com/yourusername/session"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">התראות</CardTitle>
              <CardDescription>בחרי אילו התראות לקבל</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">ליד חדש</p>
                  <p className="text-xs text-gray-400">קבלי הודעה כשליד חדש נרשם</p>
                </div>
                <Switch
                  checked={notifications.email_on_new_lead}
                  onCheckedChange={(v) => setNotifications({ ...notifications, email_on_new_lead: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">תשלום התקבל</p>
                  <p className="text-xs text-gray-400">קבלי הודעה כשתשלום מתקבל</p>
                </div>
                <Switch
                  checked={notifications.email_on_payment}
                  onCheckedChange={(v) => setNotifications({ ...notifications, email_on_payment: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">טופס המשך הוגש</p>
                  <p className="text-xs text-gray-400">קבלי הודעה כשליד מגיש טופס המשך</p>
                </div>
                <Switch
                  checked={notifications.email_on_followup}
                  onCheckedChange={(v) => setNotifications({ ...notifications, email_on_followup: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">הגדרות מייל</CardTitle>
              <CardDescription>ברירות מחדל לשליחת מיילים</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>שם שולח</Label>
                <Input
                  value={emailDefaults.from_name}
                  onChange={(e) => setEmailDefaults({ ...emailDefaults, from_name: e.target.value })}
                  placeholder="שם העסק"
                />
              </div>
              <div className="space-y-2">
                <Label>Reply-To</Label>
                <Input
                  type="email"
                  value={emailDefaults.reply_to}
                  onChange={(e) => setEmailDefaults({ ...emailDefaults, reply_to: e.target.value })}
                  placeholder="reply@yourdomain.com"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">סטטוס אינטגרציות</CardTitle>
              <CardDescription>מצב חיבורי השירותים החיצוניים</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.key}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {integration.connected ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <div>
                        <span className="font-medium text-gray-900 text-sm">{integration.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={integration.connected ? 'success' : 'warning'}>
                        {integration.connected ? 'מחובר' : 'לא מוגדר'}
                      </Badge>
                      <a href={integration.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">קישורים מועילים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard' },
                  { label: 'Google Cloud Console', url: 'https://console.cloud.google.com' },
                  { label: 'Vercel Dashboard', url: 'https://vercel.com/dashboard' },
                  { label: 'Cal.com', url: 'https://cal.com' },
                ].map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {link.label}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
