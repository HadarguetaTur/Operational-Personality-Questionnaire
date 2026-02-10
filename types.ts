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

export interface Question {
  id: string;
  layer: "A" | "B";
  text: string;
  answers: AnswerOption[];
  branchMetric?: MetricID; // If this is a branch question, which metric triggered it
}

export interface Config {
  metadata: {
    version: string;
    name: string;
    metrics: MetricID[];
  };
  questions: Question[];
  branchQuestions: Record<MetricID, Question[]>;
}

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
}

export interface ArchetypeResult {
  id: string;
  name: string;
  description: string;
  oneLiner: string;
  diagram: string;
}

export interface Flag {
  id: string;
  title: string;
  message: string;
  severity: "High" | "Medium";
}

export type MaturityLevel = "Low" | "Medium" | "High";

export interface ReportContent {
  executiveSummary: string;
  bottlenecks: { title: string; description: string }[];
  scorecard: Record<MetricID, MaturityLevel>;
  roadmap: string[];
}

export interface DiagnosticResult {
  archetype: ArchetypeResult;
  flags: Flag[];
  normalizedScores: MetricScores;
  topMetric: MetricID;
  userInfo?: {
    name: string;
    email: string;
  };
}