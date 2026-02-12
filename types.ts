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

/** Scale from Q1 – determines which questions are shown (e.g. Q3 vs Q4). */
export type ScaleContext = "solo" | "small_team" | "growing_team";

export interface Question {
  id: string;
  layer: "A" | "B";
  text: string;
  answers: AnswerOption[];
  branchMetric?: MetricID;
  /** For transition copy between clusters (e.g. dependency, cognitive, process, knowledge, strategic). */
  cluster?: string;
  /** If set, question is shown only for these scales (Q3 = solo/small_team, Q4 = growing_team). */
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

/** Inferred operational scale from behavior (not from "how many employees"). */
export type ScaleStage = "solo" | "small_team" | "growing_team";

export interface UserState {
  answers: Record<string, string>; // questionId -> answerId
  scores: MetricScores;
  maxScores: MetricScores; // Max possible score per metric based on questions seen
  questionQueue: string[]; // IDs of questions to ask
  currentQuestionIndex: number;
  completed: boolean;
  history: { questionId: string; answerText: string }[];
  startTime: number;
  userInfo?: {
    name: string;
    email: string;
  };
  /** Id of lead row in Supabase (set after LeadForm submit). */
  leadId?: string;
  /** Inferred from answers (e.g. dependency + delegation signals). */
  inferredScale?: ScaleStage;
  /** From Q1 – determines question flow (solo vs small_team vs growing_team). */
  scaleContext?: ScaleContext;
}

/** Row shape for Supabase leads table. */
export interface LeadRow {
  id: string;
  name: string;
  email: string;
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
}

/** Management pattern = how the business is currently structured and managed (not personality). */
export interface ManagementPattern {
  id: string;
  name: string;
  description: string;
  oneLiner: string;
  diagram: string;
}

/** @deprecated Use ManagementPattern */
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
  /** AS-IS: factual description of current state */
  currentState: string;
  /** What already works – never report only negative */
  existingAssets: string[];
  /** One main operational limitation */
  centralGap: string;
  /** TO-BE: structural direction, not tools */
  directionOfBuild: string;
  /** What to do now (recommendations) – fallback when quickWins/structuralSteps absent */
  recommendations: string[];
  /** What NOT to do now and why */
  constraints: string[];
  /** Risks if unchanged – neutral, logical */
  risksIfUnchanged: string[];
  /** Legacy / summary */
  executiveSummary: string;
  /** One-line current state for executive summary */
  executiveOneLine?: string;
  /** Cost/risk if not addressed (one line) */
  executiveRiskCost?: string;
  /** Top 3 urgent actions with KPI per action */
  executiveTopActions?: { action: string; kpi: string }[];
  /** One-line decision required for managerial format */
  decisionRequired?: string;
  /** Fixed intro for executive summary (once per report) */
  executiveIntro?: string;
  /** Fixed closing sentence for every report */
  reportClosingSentence?: string;
  /** Operational effects and symptoms */
  operationalSymptoms?: string[];
  /** Quick Wins (7–14 days) - supports ActionItem or legacy string */
  quickWins?: (ActionItem | string)[];
  /** Structural steps (30–60 days) - supports ActionItem or legacy string */
  structuralSteps?: (ActionItem | string)[];
  /** Suggested success metrics */
  kpis?: string[];
  /** Evidence from diagnosis (2-3 sentences from answered questions) */
  evidence?: string[];
  bottlenecks: { title: string; description: string }[];
  scorecard: Record<MetricID, MaturityLevel>;
  roadmap: string[];
}

export interface DiagnosticResult {
  /** Dominant management pattern (דפוס ניהול) */
  pattern: ManagementPattern;
  /** Secondary tendency when signals are mixed */
  secondaryPattern?: ManagementPattern | null;
  /** Reflect uncertainty when data is ambiguous */
  patternUncertainty?: boolean;
  /** Inferred scale for calibration of interpretation */
  scaleStage?: ScaleStage;
  archetype: ManagementPattern;
  flags: Flag[];
  normalizedScores: MetricScores;
  topMetric: MetricID;
  userInfo?: {
    name: string;
    email: string;
  };
}