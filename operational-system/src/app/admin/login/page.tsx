'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><p className="text-gray-400">טוען...</p></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const errorParam = searchParams.get('error');
  const justRegistered = searchParams.get('just_registered') === '1';

  const getRedirectUrl = () => {
    const redirect = searchParams.get('redirect') || '/admin';
    if (redirect === '/admin/login' || redirect.startsWith('/admin/login?')) {
      return '/admin';
    }
    return redirect;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = authError.message;
      if (msg === 'Invalid login credentials') {
        setError('אימייל או סיסמה שגויים');
      } else if (msg === 'Email not confirmed') {
        setError('החשבון עדיין לא מאושר. פני למנהלת המערכת.');
      } else {
        setError(msg);
      }
      setLoading(false);
      return;
    }

    router.push(getRedirectUrl());
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <CardTitle className="text-2xl">כניסה לניהול</CardTitle>
          <CardDescription>הזיני את פרטי ההתחברות כדי להיכנס לדאשבורד</CardDescription>
        </CardHeader>

        <CardContent>
          {justRegistered && (
            <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200 mb-4">
              החשבון נוצר בהצלחה! התחברי כעת עם הסיסמה שהגדרת.
            </div>
          )}
          {errorParam === 'unauthorized' && (
            <div className="p-3 text-sm text-amber-700 bg-amber-50 rounded-md border border-amber-200 mb-4">
              אין לך הרשאה לגשת לדאשבורד. פני למנהלת המערכת.
            </div>
          )}
          {errorParam === 'no_admin_configured' && (
            <div className="p-3 text-sm text-amber-700 bg-amber-50 rounded-md border border-amber-200 mb-4">
              המערכת לא מוגדרת. יש להגדיר ADMIN_EMAILS במשתני הסביבה.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">אימייל</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">סיסמה</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-500">
              אין לך חשבון? קבלת גישה רק בהזמנה ממנהלת המערכת.
            </p>
            <p className="text-xs text-gray-400">
              שכחת סיסמה? פני למנהלת המערכת לאיפוס.
            </p>
            <a href="/" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors mt-3">
              חזרה לאתר הראשי
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
