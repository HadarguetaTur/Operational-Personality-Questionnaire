'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'הזימון לא נמצא. ייתכן שהקישור שגוי.',
  revoked: 'הזימון בוטל על ידי מנהלת המערכת.',
  accepted: 'הזימון כבר נוצל. נסי להתחבר.',
  expired: 'הזימון פג תוקף. בקשי זימון חדש.',
};

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setReason('not_found');
      setLoading(false);
      return;
    }
    fetch(`/api/admin/invitations/accept?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setValid(true);
          setEmail(data.email);
          setFullName(data.full_name);
        } else {
          setReason(data.reason || 'not_found');
        }
      })
      .catch(() => setReason('not_found'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (password !== confirmPassword) {
      setError('הסיסמאות לא תואמות');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'יצירת החשבון נכשלה');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/admin/login?just_registered=1'), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500" />
          <CardTitle className="text-2xl">
            {success ? 'החשבון נוצר!' : valid ? 'הגדרת סיסמה' : 'הזימון לא תקף'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'מעבירה אותך למסך ההתחברות...'
              : valid
              ? 'בחרי סיסמה חזקה וסיימי את ההרשמה'
              : 'לא ניתן להמשיך עם הזימון הזה'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                התחברי עם <span dir="ltr" className="font-medium">{email}</span> והסיסמה שהגדרת.
              </p>
            </div>
          )}

          {!success && !valid && (
            <div className="text-center py-6">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-3" />
              <p className="text-sm text-gray-700 mb-4">{REASON_MESSAGES[reason] || REASON_MESSAGES.not_found}</p>
              <Button variant="outline" onClick={() => router.push('/')}>חזרה לעמוד הראשי</Button>
            </div>
          )}

          {!success && valid && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input id="email" type="email" value={email} disabled dir="ltr" className="h-11 bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full-name">שם מלא</Label>
                <Input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה (לפחות 8 תווים)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">אישור סיסמה</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="h-11"
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'יצירת חשבון'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
