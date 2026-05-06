// ============================
// Quiz / Diagnostic Types
// ============================

export type MetricID =
  | "Dependency_Index"
  | "Cognitive_Load"
  | "Process_Standardization"
  | "Knowledge_Asset_Value"
  | "Strategic_Maturity";

export type MetricScores = Record<MetricID, number>;

export interface AnswerOption {
  id: string;
  text: string;
  score: Partial<MetricScores>;
}

export type ScaleContext = "solo" | "small_team" | "growing_team";

export interface Question {
  id: string;
  layer: "A" | "B";
  text: string;
  answers: AnswerOption[];
  branchMetric?: MetricID;
  cluster?: string;
  showForScale?: ScaleContext[];
}

export interface Config {
  metadata: {
    version: string;
    name: string;
    metrics: MetricID[];
  };
  questions: Question[];
  branchQuestions: Partial<Record<MetricID, Question[]>>;
}

export type ScaleStage = "solo" | "small_team" | "growing_team";

export interface UserState {
  answers: Record<string, string>;
  scores: MetricScores;
  maxScores: MetricScores;
  questionQueue: string[];
  currentQuestionIndex: number;
  completed: boolean;
  history: { questionId: string; answerText: string }[];
  startTime: number;
  userInfo?: { name: string; email: string };
  leadId?: string;
  inferredScale?: ScaleStage;
  scaleContext?: ScaleContext;
}

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  marketing_consent: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  result_pattern: string | null;
  result_scale_stage: string | null;
  result_top_metric: string | null;
  result_snapshot: Record<string, unknown> | null;
  report_token: string | null;
  funnel_id: string | null;
  current_stage_id: string | null;
  payment_status: string | null;
  payment_date: string | null;
  drive_folder_url: string | null;
}

export interface ManagementPattern {
  id: string;
  name: string;
  description: string;
  oneLiner: string;
  diagram: string;
}

export type ArchetypeResult = ManagementPattern;

export interface Flag {
  id: string;
  title: string;
  message: string;
  severity: "High" | "Medium";
}

export type MaturityLevel = "Low" | "Medium" | "High";

export interface ActionItem {
  what: string;
  why?: string;
  owner?: string;
  deliverable?: string;
  deadline?: string;
  kpi?: string;
  effort?: string;
}

export interface ReportContent {
  currentState: string;
  existingAssets: string[];
  centralGap: string;
  directionOfBuild: string;
  recommendations: string[];
  constraints: string[];
  risksIfUnchanged: string[];
  executiveSummary: string;
  executiveOneLine?: string;
  executiveRiskCost?: string;
  executiveTopActions?: { action: string; kpi: string }[];
  decisionRequired?: string;
  executiveIntro?: string;
  reportClosingSentence?: string;
  operationalSymptoms?: string[];
  quickWins?: (ActionItem | string)[];
  structuralSteps?: (ActionItem | string)[];
  kpis?: string[];
  evidence?: string[];
  bottlenecks: { title: string; description: string }[];
  scorecard: Record<MetricID, MaturityLevel>;
  roadmap: string[];
}

export interface DiagnosticResult {
  pattern: ManagementPattern;
  secondaryPattern?: ManagementPattern | null;
  patternUncertainty?: boolean;
  scaleStage?: ScaleStage;
  archetype: ManagementPattern;
  flags: Flag[];
  normalizedScores: MetricScores;
  topMetric: MetricID;
  userInfo?: { name: string; email: string };
}

// ============================
// Funnel / Campaign Types
// ============================

export type FunnelStatus = 'draft' | 'active' | 'paused' | 'archived';

export type StageType =
  | 'landing'
  | 'questionnaire'
  | 'payment'
  | 'followup_form'
  | 'meeting_booking'
  | 'email';

export interface Funnel {
  id: string;
  name: string;
  description: string | null;
  status: FunnelStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  type: StageType;
  order: number;
  config: Record<string, unknown>;
  email_template_id: string | null;
  is_active: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  variables: Record<string, string>;
  funnel_id: string | null;
  stage_trigger: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  lead_id: string;
  funnel_id: string | null;
  file_name: string;
  file_url: string;
  drive_url: string | null;
  uploaded_at: string;
}

export interface EmailLog {
  id: string;
  lead_id: string;
  template_id: string | null;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
  error: string | null;
}

export interface QuestionnaireConfig {
  id: string;
  funnel_id: string;
  stage_id: string;
  questions: Record<string, unknown>;
  scoring_config: Record<string, unknown>;
  branching_rules: Record<string, unknown>;
}

// ============================
// Follow-up Form Types
// ============================

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'file'
  | 'date'
  | 'checkbox'
  | 'signature'
  | 'email'
  | 'phone';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  accept?: string;
  maxFiles?: number;
}

export interface FormConfig {
  title: string;
  description?: string;
  fields: FormField[];
  submitButtonText?: string;
  successMessage?: string;
}
