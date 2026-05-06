'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  FileText,
  Settings2,
  Mail,
  CreditCard,
  Calendar,
  Layout,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

interface Stage {
  id: string;
  funnel_id: string;
  name: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  email_template_id: string | null;
  is_active: boolean;
}

interface Funnel {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
}

const stageTypeLabels: Record<string, string> = {
  landing: 'דף נחיתה',
  questionnaire: 'שאלון',
  payment: 'תשלום',
  followup_form: 'טופס המשך',
  meeting_booking: 'קביעת פגישה',
  email: 'מייל',
};

const stageTypeColors: Record<string, string> = {
  landing: 'bg-blue-100 text-blue-700 border-blue-200',
  questionnaire: 'bg-purple-100 text-purple-700 border-purple-200',
  payment: 'bg-green-100 text-green-700 border-green-200',
  followup_form: 'bg-orange-100 text-orange-700 border-orange-200',
  meeting_booking: 'bg-teal-100 text-teal-700 border-teal-200',
  email: 'bg-pink-100 text-pink-700 border-pink-200',
};

const stageTypeIcons: Record<string, React.ElementType> = {
  landing: Layout,
  questionnaire: ClipboardList,
  payment: CreditCard,
  followup_form: FileText,
  meeting_booking: Calendar,
  email: Mail,
};

export default function FunnelStagesPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.funnelId as string;
  const supabase = createClient();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('email');
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>({});
  const [formTemplateId, setFormTemplateId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [funnelRes, stagesRes, templatesRes] = await Promise.all([
      supabase.from('funnels').select('*').eq('id', funnelId).single(),
      supabase.from('funnel_stages').select('*').eq('funnel_id', funnelId).order('order', { ascending: true }),
      supabase.from('email_templates').select('id, name, subject'),
    ]);
    setFunnel(funnelRes.data);
    setStages(stagesRes.data ?? []);
    setTemplates(templatesRes.data ?? []);
    setLoading(false);
  }, [supabase, funnelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    setEditingStage(null);
    setFormName('');
    setFormType('email');
    setFormConfig({});
    setFormTemplateId('');
    setDialogOpen(true);
  };

  const openEditDialog = (stage: Stage) => {
    setEditingStage(stage);
    setFormName(stage.name);
    setFormType(stage.type);
    setFormConfig(stage.config ?? {});
    setFormTemplateId(stage.email_template_id ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: formName,
      type: formType,
      config: formConfig,
      email_template_id: formTemplateId && formTemplateId !== 'none' ? formTemplateId : null,
    };

    if (editingStage) {
      await supabase.from('funnel_stages').update(payload).eq('id', editingStage.id);
      toast.success('השלב עודכן');
    } else {
      const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) + 1 : 0;
      await supabase.from('funnel_stages').insert({
        ...payload,
        funnel_id: funnelId,
        order: maxOrder,
        is_active: true,
      });
      toast.success('שלב חדש נוצר');
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`למחוק את השלב "${name}"?`)) return;
    await supabase.from('funnel_stages').delete().eq('id', id);
    toast.success('השלב נמחק');
    fetchData();
  };

  const moveStage = async (stageId: string, direction: 'up' | 'down') => {
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stages.length) return;

    await Promise.all([
      supabase.from('funnel_stages').update({ order: stages[swapIdx].order }).eq('id', stages[idx].id),
      supabase.from('funnel_stages').update({ order: stages[idx].order }).eq('id', stages[swapIdx].id),
    ]);
    fetchData();
  };

  const toggleActive = async (stage: Stage) => {
    await supabase.from('funnel_stages').update({ is_active: !stage.is_active }).eq('id', stage.id);
    toast.success(stage.is_active ? 'השלב הושבת' : 'השלב הופעל');
    fetchData();
  };

  const updateConfig = (key: string, value: unknown) => {
    setFormConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">משפך לא נמצא</p>
        <Button variant="outline" onClick={() => router.push('/admin/funnels')}>חזרה למשפכים</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button onClick={() => router.push('/admin/funnels')} className="hover:text-gray-700">משפכים</button>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span className="font-medium text-gray-900">{funnel.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">שלבי המשפך</h1>
          <p className="text-gray-500 mt-1">{funnel.name} — {stages.length} שלבים</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          שלב חדש
        </Button>
      </div>

      {/* Visual flow pipeline */}
      {stages.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, idx) => {
            const Icon = stageTypeIcons[stage.type] ?? Settings2;
            const colors = stageTypeColors[stage.type] ?? 'bg-gray-100 text-gray-600 border-gray-200';
            return (
              <React.Fragment key={stage.id}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${colors} ${!stage.is_active ? 'opacity-40' : ''}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {stage.name}
                </div>
                {idx < stages.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 rotate-180" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Stages list */}
      {stages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500 mb-4">אין שלבים עדיין. הוסיפי שלבים למשפך.</p>
            <Button onClick={openCreateDialog} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              הוסף שלב ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, idx) => {
            const Icon = stageTypeIcons[stage.type] ?? Settings2;
            const hasQuestionEditor = ['questionnaire', 'followup_form'].includes(stage.type);
            const configDesc = stage.config?.description as string | undefined;

            return (
              <Card key={stage.id} className={`transition-all ${!stage.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveStage(stage.id, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      <button
                        onClick={() => moveStage(stage.id, 'down')}
                        disabled={idx === stages.length - 1}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stageTypeColors[stage.type]?.split(' ').slice(0, 1).join('') ?? 'bg-gray-100'}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{stage.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageTypeColors[stage.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {stageTypeLabels[stage.type] ?? stage.type}
                        </span>
                        {!stage.is_active && <Badge variant="secondary">מושבת</Badge>}
                      </div>
                      {configDesc && (
                        <p className="text-xs text-gray-400 mt-0.5">{configDesc}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {hasQuestionEditor && (
                        <Link href={`/admin/funnels/${funnelId}/questions/${stage.id}`}>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <FileText className="w-3.5 h-3.5" />
                            עריכת שאלון
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(stage)}>
                        {stage.is_active ? 'השבת' : 'הפעל'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(stage)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(stage.id, stage.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stage create/edit dialog with type-specific config */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'עריכת שלב' : 'שלב חדש'}</DialogTitle>
            <DialogDescription>
              {editingStage ? 'עדכני את פרטי השלב וההגדרות' : 'הגדירי שם, סוג והגדרות לשלב החדש'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stageName">שם השלב</Label>
                <Input
                  id="stageName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="למשל: שאלון אבחון"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stageType">סוג השלב</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>תיאור</Label>
              <Textarea
                value={(formConfig.description as string) ?? ''}
                onChange={(e) => updateConfig('description', e.target.value)}
                placeholder="תיאור קצר של השלב..."
                rows={2}
              />
            </div>

            {/* Type-specific configuration */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-700">הגדרות ספציפיות</h4>

              {formType === 'landing' && (
                <>
                  <div className="space-y-2">
                    <Label>טקסט CTA</Label>
                    <Input
                      value={(formConfig.cta_text as string) ?? ''}
                      onChange={(e) => updateConfig('cta_text', e.target.value)}
                      placeholder="למשל: קבל את ההצעה שלי"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>כתובת הפניה (URL)</Label>
                    <Input
                      value={(formConfig.redirect_url as string) ?? ''}
                      onChange={(e) => updateConfig('redirect_url', e.target.value)}
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </div>
                </>
              )}

              {formType === 'payment' && (
                <>
                  <div className="space-y-2">
                    <Label>קישור תשלום (Sumit)</Label>
                    <Input
                      value={(formConfig.payment_url as string) ?? ''}
                      onChange={(e) => updateConfig('payment_url', e.target.value)}
                      placeholder="https://pay.sumit.co.il/..."
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>סכום (&#8362;)</Label>
                    <Input
                      type="number"
                      value={(formConfig.amount as string) ?? ''}
                      onChange={(e) => updateConfig('amount', e.target.value)}
                      placeholder="0"
                      dir="ltr"
                    />
                  </div>
                </>
              )}

              {formType === 'meeting_booking' && (
                <>
                  <div className="space-y-2">
                    <Label>קישור Cal.com</Label>
                    <Input
                      value={(formConfig.calcom_url as string) ?? ''}
                      onChange={(e) => updateConfig('calcom_url', e.target.value)}
                      placeholder="https://cal.com/username/session"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>משך פגישה (דקות)</Label>
                    <Input
                      type="number"
                      value={(formConfig.duration_minutes as string) ?? ''}
                      onChange={(e) => updateConfig('duration_minutes', e.target.value)}
                      placeholder="30"
                      dir="ltr"
                    />
                  </div>
                </>
              )}

              {formType === 'email' && (
                <div className="space-y-2">
                  <Label>תבנית מייל</Label>
                  <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תבנית..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא תבנית</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} — {t.subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(formType === 'questionnaire' || formType === 'followup_form') && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  לאחר יצירת השלב, לחצי על &ldquo;עריכת שאלון&rdquo; כדי להגדיר את שדות הטופס.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saving}>
              {saving ? 'שומר...' : editingStage ? 'עדכון' : 'הוסף שלב'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
