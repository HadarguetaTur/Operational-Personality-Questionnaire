'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Loader2, Mail, ShieldCheck, AlertTriangle, Send, X, RotateCw, KeyRound, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_self: boolean;
}

interface Invitation {
  id: string;
  email: string;
  full_name: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  is_expired: boolean;
}

const STATUS_LABEL: Record<Invitation['status'], string> = {
  pending: 'ממתין',
  accepted: 'נקלט',
  expired: 'פג',
  revoked: 'בוטל',
};

const STATUS_VARIANT: Record<Invitation['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  accepted: 'secondary',
  expired: 'outline',
  revoked: 'destructive',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<Invitation | null>(null);
  const [confirmReset, setConfirmReset] = useState<AdminUser | null>(null);

  const loadData = async () => {
    try {
      const [usersRes, invitesRes] = await Promise.all([
        fetch('/api/admin/users/list'),
        fetch('/api/admin/invitations/list'),
      ]);
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users || []);
      }
      if (invitesRes.ok) {
        const d = await invitesRes.json();
        setInvitations(d.invitations || []);
      }
    } catch {
      toast.error('טעינת הנתונים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), full_name: inviteName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'שליחת הזימון נכשלה');
        return;
      }
      toast.success(`הזימון נשלח ל-${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      loadData();
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (invitation: Invitation) => {
    setActioningId(invitation.id);
    try {
      const res = await fetch('/api/admin/invitations/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitation.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'שליחה חוזרת נכשלה');
        return;
      }
      toast.success(`הזימון נשלח שוב ל-${invitation.email}`);
      loadData();
    } finally {
      setActioningId(null);
    }
  };

  const handleRevoke = async (invitation: Invitation) => {
    setActioningId(invitation.id);
    try {
      const res = await fetch('/api/admin/invitations/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitation.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'הביטול נכשל');
        return;
      }
      toast.success('הזימון בוטל');
      loadData();
    } finally {
      setActioningId(null);
      setConfirmRevoke(null);
    }
  };

  const handleConfirm = async (user: AdminUser) => {
    setActioningId(user.id);
    try {
      const res = await fetch('/api/admin/users/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'האישור נכשל');
        return;
      }
      toast.success('המשתמש אושר');
      loadData();
    } finally {
      setActioningId(null);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    setActioningId(user.id);
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'שליחת מייל האיפוס נכשלה');
        return;
      }
      toast.success(`מייל איפוס סיסמה נשלח ל-${user.email}`);
    } finally {
      setActioningId(null);
      setConfirmReset(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const pendingInvitations = invitations.filter((i) => i.status === 'pending' && !i.is_expired);
  const otherInvitations = invitations.filter((i) => i.status !== 'pending' || i.is_expired);

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h1>
        <p className="text-gray-500 text-sm mt-1">
          רק משתמשים שהזמנת יוכלו לגשת לדאשבורד.
        </p>
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5" />
            הזמן מנהל חדש
          </CardTitle>
          <CardDescription>
            מייל יישלח עם קישור להגדרת סיסמה. הקישור תקף ל-7 ימים.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="inv-name">שם מלא</Label>
              <Input
                id="inv-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="שם המנהל"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-email">אימייל</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={inviting} className="w-full md:w-auto">
              {inviting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  שלח הזמנה
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5" />
            מנהלים פעילים ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {users.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                אין מנהלים רשומים.
              </div>
            )}
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {user.full_name || user.email}
                    </span>
                    {user.is_self && (
                      <Badge variant="secondary" className="text-xs">את/ה</Badge>
                    )}
                    {!user.email_confirmed_at && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        לא מאושר
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1" dir="ltr">{user.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    נכנס לאחרונה: {formatDate(user.last_sign_in_at)}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!user.email_confirmed_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirm(user)}
                      disabled={actioningId === user.id}
                    >
                      {actioningId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'אשר משתמש תקוע'
                      )}
                    </Button>
                  )}
                  {!user.is_self && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmReset(user)}
                      disabled={actioningId === user.id}
                    >
                      <KeyRound className="w-4 h-4 ml-1.5" />
                      אפסי סיסמה
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5" />
            הזמנות פעילות ({pendingInvitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {pendingInvitations.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                אין הזמנות פעילות.
              </div>
            )}
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-4 gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{invitation.full_name}</div>
                  <div className="text-sm text-gray-500 mt-1" dir="ltr">{invitation.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    תוקף עד: {formatDate(invitation.expires_at)}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResend(invitation)}
                    disabled={actioningId === invitation.id}
                  >
                    {actioningId === invitation.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCw className="w-4 h-4 ml-1.5" />
                        שלח שוב
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmRevoke(invitation)}
                    disabled={actioningId === invitation.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 ml-1.5" />
                    בטל
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {otherInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">היסטוריית הזמנות</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {otherInvitations.map((invitation) => {
                const effectiveStatus = invitation.is_expired && invitation.status === 'pending'
                  ? 'expired'
                  : invitation.status;
                return (
                  <div key={invitation.id} className="flex items-center justify-between p-4 gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-700">{invitation.full_name}</div>
                      <div className="text-sm text-gray-500 mt-1" dir="ltr">{invitation.email}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        נשלח: {formatDate(invitation.created_at)}
                        {invitation.accepted_at && ` · נקלט: ${formatDate(invitation.accepted_at)}`}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[effectiveStatus as Invitation['status']]}>
                      {STATUS_LABEL[effectiveStatus as Invitation['status']]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmRevoke}
        onOpenChange={(o) => !o && setConfirmRevoke(null)}
        title="לבטל את ההזמנה?"
        description={confirmRevoke ? `הקישור של ${confirmRevoke.email} יפסיק לעבוד.` : ''}
        confirmLabel="בטל הזמנה"
        variant="danger"
        onConfirm={() => confirmRevoke && handleRevoke(confirmRevoke)}
      />

      <ConfirmDialog
        open={!!confirmReset}
        onOpenChange={(o) => !o && setConfirmReset(null)}
        title="לשלוח מייל איפוס סיסמה?"
        description={confirmReset ? `יישלח מייל ל-${confirmReset.email} עם קישור להגדרת סיסמה חדשה. הסיסמה הנוכחית תמשיך לעבוד עד שתוגדר חדשה.` : ''}
        confirmLabel="שלח מייל"
        onConfirm={() => confirmReset && handleResetPassword(confirmReset)}
      />
    </div>
  );
}
