'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_OPTIONS: Array<[string, string]> = [
  ['manual', 'ידני'],
  ['whatsapp', 'וואטסאפ'],
  ['instagram', 'אינסטגרם'],
  ['facebook', 'פייסבוק'],
  ['landing_page', 'דף נחיתה'],
];

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new (or matched) lead id. Default: navigate to the lead page. */
  onCreated?: (leadId: string) => void;
}

/** "ליד חדש" modal — manual lead entry (dedupes by phone/email server-side). */
export function NewLeadDialog({ open, onOpenChange, onCreated }: NewLeadDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    business_name: '',
    lead_source: 'manual',
    notes: '',
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () =>
    setForm({ name: '', phone: '', email: '', business_name: '', lead_source: 'manual', notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('נא למלא שם');
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      toast.error('נדרש טלפון או אימייל');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/leads/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as {
        leadId?: string;
        existing?: boolean;
        name?: string;
        error?: string;
      };
      if (!res.ok || !data.leadId) {
        toast.error(data.error ?? 'יצירת הליד נכשלה');
        return;
      }
      if (data.existing) {
        toast.info(`כבר קיים ליד עם הפרטים האלה (${data.name ?? ''}) — נפתח הליד הקיים`);
      } else {
        toast.success('הליד נוצר');
      }
      reset();
      onOpenChange(false);
      if (onCreated) onCreated(data.leadId);
      else router.push(`/admin/leads/${data.leadId}`);
    } catch {
      toast.error('שגיאת רשת');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" />
            ליד חדש
          </DialogTitle>
          <DialogDescription>הוספת ליד ידנית. אם כבר קיים ליד עם אותו טלפון או אימייל, ייפתח הליד הקיים.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nl-name">שם מלא *</Label>
              <Input id="nl-name" value={form.name} onChange={(e) => set('name')(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nl-phone">טלפון</Label>
              <Input id="nl-phone" dir="ltr" value={form.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="050-0000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nl-email">אימייל</Label>
              <Input id="nl-email" dir="ltr" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nl-biz">שם העסק</Label>
              <Input id="nl-biz" value={form.business_name} onChange={(e) => set('business_name')(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>מקור הגעה</Label>
              <Select value={form.lead_source} onValueChange={set('lead_source')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nl-notes">הערות</Label>
              <Textarea id="nl-notes" rows={3} value={form.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="איך הגיע, מה ביקש, כל מה שחשוב..." />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? 'שומר...' : 'צור ליד'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
