'use client';

import React, { useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export interface QuestionField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'phone' | 'file' | 'date';
  required: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

interface QuestionEditorProps {
  questions: QuestionField[];
  onChange: (questions: QuestionField[]) => void;
}

const fieldTypeLabels: Record<string, string> = {
  text: 'טקסט קצר',
  textarea: 'טקסט ארוך',
  select: 'בחירה מרשימה',
  radio: 'בחירה יחידה (כפתורים)',
  checkbox: 'בחירה מרובה',
  number: 'מספר',
  email: 'אימייל',
  phone: 'טלפון',
  file: 'העלאת קובץ',
  date: 'תאריך',
};

function generateId() {
  return 'q_' + Math.random().toString(36).substring(2, 9);
}

function QuestionCard({
  question,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onDuplicate,
}: {
  question: QuestionField;
  index: number;
  total: number;
  onUpdate: (q: QuestionField) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasOptions = ['select', 'radio', 'checkbox'].includes(question.type);

  return (
    <Card className="border border-gray-200 transition-shadow hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMove('up')}
              disabled={index === 0}
              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <GripVertical className="w-4 h-4 text-gray-300 mx-auto" />
            <button
              onClick={() => onMove('down')}
              disabled={index === total - 1}
              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate text-sm">
                {question.label || 'שדה ללא שם'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                {fieldTypeLabels[question.type]}
              </span>
              {question.required && (
                <span className="text-xs text-red-500 flex-shrink-0">חובה</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              {expanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onDuplicate} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 mr-10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">שם השדה</Label>
                <Input
                  value={question.label}
                  onChange={(e) => onUpdate({ ...question, label: e.target.value })}
                  placeholder="למשל: שם מלא"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">סוג שדה</Label>
                <Select
                  value={question.type}
                  onValueChange={(v) =>
                    onUpdate({
                      ...question,
                      type: v as QuestionField['type'],
                      options: ['select', 'radio', 'checkbox'].includes(v)
                        ? question.options?.length ? question.options : ['אפשרות 1', 'אפשרות 2']
                        : undefined,
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fieldTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">placeholder</Label>
                <Input
                  value={question.placeholder ?? ''}
                  onChange={(e) => onUpdate({ ...question, placeholder: e.target.value })}
                  placeholder="טקסט עזר..."
                  className="h-9 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">תיאור / עזרה</Label>
                <Input
                  value={question.description ?? ''}
                  onChange={(e) => onUpdate({ ...question, description: e.target.value })}
                  placeholder="הסבר נוסף לשדה..."
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={question.required}
                onCheckedChange={(checked) => onUpdate({ ...question, required: checked })}
              />
              <Label className="text-xs cursor-pointer">שדה חובה</Label>
            </div>

            {hasOptions && (
              <div className="space-y-2">
                <Label className="text-xs">אפשרויות</Label>
                {(question.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(question.options ?? [])];
                        newOpts[i] = e.target.value;
                        onUpdate({ ...question, options: newOpts });
                      }}
                      className="h-8 text-sm"
                      placeholder={`אפשרות ${i + 1}`}
                    />
                    <button
                      onClick={() => {
                        const newOpts = (question.options ?? []).filter((_, j) => j !== i);
                        onUpdate({ ...question, options: newOpts });
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onUpdate({
                      ...question,
                      options: [...(question.options ?? []), `אפשרות ${(question.options?.length ?? 0) + 1}`],
                    })
                  }
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  הוסף אפשרות
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function QuestionEditor({ questions, onChange }: QuestionEditorProps) {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        id: generateId(),
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
  };

  const updateQuestion = (index: number, updated: QuestionField) => {
    const newQuestions = [...questions];
    newQuestions[index] = updated;
    onChange(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newQuestions.length) return;
    [newQuestions[index], newQuestions[swapIdx]] = [newQuestions[swapIdx], newQuestions[index]];
    onChange(newQuestions);
  };

  const duplicateQuestion = (index: number) => {
    const newQ = { ...questions[index], id: generateId() };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, newQ);
    onChange(newQuestions);
  };

  return (
    <div className="space-y-3">
      {questions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
          <p className="mb-3">אין שדות עדיין</p>
          <Button variant="outline" onClick={addQuestion} className="gap-2">
            <Plus className="w-4 h-4" />
            הוסף שדה ראשון
          </Button>
        </div>
      ) : (
        <>
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onUpdate={(updated) => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
              onMove={(dir) => moveQuestion(i, dir)}
              onDuplicate={() => duplicateQuestion(i)}
            />
          ))}
        </>
      )}

      <Button variant="outline" onClick={addQuestion} className="w-full gap-2 border-dashed">
        <Plus className="w-4 h-4" />
        הוסף שדה
      </Button>
    </div>
  );
}
