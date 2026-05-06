'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';

interface Funnel {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

const statusLabels: Record<string, { text: string; variant: 'default' | 'success' | 'warning' | 'secondary' }> = {
  draft: { text: 'טיוטה', variant: 'secondary' },
  active: { text: 'פעיל', variant: 'success' },
  paused: { text: 'מושהה', variant: 'warning' },
  archived: { text: 'ארכיון', variant: 'default' },
};

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Funnel | null>(null);
  const supabase = createClient();

  const fetchFunnels = useCallback(async () => {
    const { data } = await supabase
      .from('funnels')
      .select('*')
      .order('created_at', { ascending: false });
    setFunnels(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  const openCreateDialog = () => {
    setEditingFunnel(null);
    setFormName('');
    setFormDescription('');
    setDialogOpen(true);
  };

  const openEditDialog = (funnel: Funnel) => {
    setEditingFunnel(funnel);
    setFormName(funnel.name);
    setFormDescription(funnel.description ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editingFunnel) {
      await supabase
        .from('funnels')
        .update({ name: formName, description: formDescription || null })
        .eq('id', editingFunnel.id);
    } else {
      await supabase
        .from('funnels')
        .insert({ name: formName, description: formDescription || null, status: 'draft' });
    }
    setSaving(false);
    setDialogOpen(false);
    toast.success(editingFunnel ? 'המשפך עודכן' : 'משפך חדש נוצר');
    fetchFunnels();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('funnels').delete().eq('id', deleteTarget.id);
    toast.success('המשפך נמחק');
    setDeleteTarget(null);
    fetchFunnels();
  };

  const toggleStatus = async (funnel: Funnel) => {
    const newStatus = funnel.status === 'active' ? 'paused' : 'active';
    await supabase.from('funnels').update({ status: newStatus }).eq('id', funnel.id);
    toast.success(newStatus === 'active' ? 'המשפך הופעל' : 'המשפך הושהה');
    fetchFunnels();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">משפכים</h1>
          <p className="text-gray-500 mt-1">ניהול קמפיינים ומשפכי שיווק</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          משפך חדש
        </Button>
      </div>

      {funnels.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500 mb-4">אין משפכים עדיין</p>
            <Button onClick={openCreateDialog} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              צור משפך ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((funnel) => {
            const statusInfo = statusLabels[funnel.status] ?? statusLabels.draft;
            return (
              <Card key={funnel.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{funnel.name}</CardTitle>
                    <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                  </div>
                  {funnel.description && (
                    <p className="text-sm text-gray-500 mt-1">{funnel.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <span>נוצר {new Date(funnel.created_at).toLocaleDateString('he-IL')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/funnels/${funnel.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        שלבים
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditDialog(funnel)}>
                      <Pencil className="w-3.5 h-3.5" />
                      עריכה
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleStatus(funnel)}>
                      {funnel.status === 'active' ? 'השהה' : 'הפעל'}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(funnel)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFunnel ? 'עריכת משפך' : 'משפך חדש'}</DialogTitle>
            <DialogDescription>
              {editingFunnel ? 'עדכני את פרטי המשפך' : 'הזיני שם ותיאור למשפך החדש'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="funnelName">שם המשפך</Label>
              <Input
                id="funnelName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="למשל: אבחון תפעולי"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="funnelDesc">תיאור (אופציונלי)</Label>
              <Textarea
                id="funnelDesc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="תיאור קצר של המשפך..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saving}>
              {saving ? 'שומר...' : editingFunnel ? 'עדכון' : 'צור משפך'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="מחיקת משפך"
        description={`האם למחוק את המשפך "${deleteTarget?.name}"? פעולה זו לא ניתנת לביטול.`}
        confirmLabel="מחק"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
