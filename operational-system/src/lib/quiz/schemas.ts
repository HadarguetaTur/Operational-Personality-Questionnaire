import { z } from 'zod';

/**
 * Action item shape — matches ActionItem in types.ts (engine output).
 * All fields optional + passthrough so legacy snapshots with `title`/`detail`
 * still parse cleanly alongside current `{what, why, ...}` format.
 */
const actionItemSchema = z.object({
  what: z.string().optional(),
  why: z.string().optional(),
  owner: z.string().optional(),
  deliverable: z.string().optional(),
  deadline: z.string().optional(),
  kpi: z.string().optional(),
  effort: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional()
}).passthrough();

/** Schema for the result_snapshot JSON stored in Supabase leads table */
export const resultSnapshotSchema = z.object({
  pattern_id: z.string().default('REACTIVE'),
  normalized_scores: z.record(z.string(), z.number()).default({}),
  top_metric: z.string().default('Dependency_Index'),
  flags: z.array(z.object({
    id: z.string(),
    title: z.string(),
    severity: z.string()
  })).default([]),
  scorecard: z.record(z.string(), z.string()).default({}),
  current_state: z.string().default(''),
  existing_assets: z.array(z.string()).default([]),
  central_gap: z.string().default(''),
  direction_of_build: z.string().default(''),
  constraints: z.array(z.string()).default([]),
  risks_if_unchanged: z.array(z.string()).default([]),
  executive_summary: z.string().default(''),
  executive_intro: z.string().optional(),
  quick_wins: z.array(z.union([z.string(), actionItemSchema])).default([]),
  structural_steps: z.array(z.union([z.string(), actionItemSchema])).default([]),
  user_info: z.object({
    name: z.string().optional(),
    email: z.string().optional()
  }).optional(),
  scale_stage: z.string().optional(),
  history: z.array(z.object({
    questionId: z.string(),
    answerText: z.string()
  })).optional()
}).passthrough();

/** Schema for the ai_diagnosis JSON returned by OpenRouter (validated server-side). */
export const aiDiagnosisSchema = z.object({
  personal_executive_summary: z.string(),
  hidden_pattern: z.string().optional(),
  personalized_evidence: z.array(z.object({
    from_question: z.string(),
    insight: z.string()
  })).default([]),
  personalized_recommendations: z.array(z.object({
    what: z.string(),
    why: z.string().optional(),
    first_step: z.string().optional(),
    deadline: z.string().optional(),
    kpi: z.string().optional()
  })).default([]),
  risk_narrative: z.string().optional(),
  plan_30_60_90: z.object({
    '30': z.array(z.string()).default([]),
    '60': z.array(z.string()).default([]),
    '90': z.array(z.string()).default([])
  }).optional()
}).passthrough();

export type ValidatedAiDiagnosis = z.infer<typeof aiDiagnosisSchema>;

/** Schema for the leads table row when fetching by report_token */
export const leadRowSchema = z.object({
  result_pattern: z.string().nullable().optional(),
  result_scale_stage: z.string().nullable().optional(),
  result_top_metric: z.string().nullable().optional(),
  result_snapshot: resultSnapshotSchema.nullable().optional(),
  created_at: z.string().nullable().optional(),
  name: z.string().nullable().optional()
});

export type ValidatedSnapshot = z.infer<typeof resultSnapshotSchema>;
export type ValidatedLeadRow = z.infer<typeof leadRowSchema>;
