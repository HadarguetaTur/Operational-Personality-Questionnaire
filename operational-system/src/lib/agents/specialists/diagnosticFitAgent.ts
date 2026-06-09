/**
 * diagnosticFitAgent.ts — enriched fit & clarity assessment specialist
 *
 * Wraps the deterministic understandingEngine scores with LLM-generated
 * reasoning and gap identification. The scores are computed deterministically
 * (no hallucination risk); the LLM adds the "why" and "what's missing".
 */

import type { ConversationMessage } from '@/lib/db/conversationMessages';
import type { FitAssessment } from './types';
import {
  computeFitScore,
  computeClarityScore,
  getRecommendedNextStep,
  type UnderstandingContext,
} from '@/lib/agents/understandingEngine';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DIAGNOSTIC_FIT_MODEL = 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `אתה מומחה לאבחון התאמת ליד. קיבלת ניקוד fit ו-clarity שחושבו אוטומטית, וכל עובדות הליד.
תפקידך: להסביר למה הניקוד הוא כזה, ומה חסר להעלות אותו.

## כללים
- fit_reasoning: 1-2 משפטים. לא לחזור על המספרים — להסביר בעברית מדוע ליד זה מתאים/לא מתאים לשירות של הדר
- key_gaps: עד 3 פריטים שאם יתגלו ישנו את recommended_next_step. רק מה שחסר בפועל
- אסור להמציא עובדות שלא בהיסטוריה

## פורמט — JSON בלבד
{
  "fit_reasoning": "...",
  "key_gaps": []
}`;

function parseDiagnosticFit(
  raw: string,
  scores: { fit_score: number; clarity_score: number; recommended_next_step: string },
): FitAssessment | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.fit_reasoning !== 'string') return null;
    return {
      fit_score: scores.fit_score,
      clarity_score: scores.clarity_score,
      recommended_next_step: scores.recommended_next_step as FitAssessment['recommended_next_step'],
      fit_reasoning: parsed.fit_reasoning,
      key_gaps: Array.isArray(parsed.key_gaps) ? parsed.key_gaps : [],
    };
  } catch {
    return null;
  }
}

export async function runDiagnosticFit(input: {
  history: ConversationMessage[];
  context: Record<string, unknown>;
}): Promise<FitAssessment | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  // Compute deterministic scores — no LLM needed for the numbers
  const understandingCtx = input.context as UnderstandingContext;
  const fit_score = computeFitScore(understandingCtx);
  const clarity_score = computeClarityScore(understandingCtx);
  const recommended_next_step = getRecommendedNextStep(understandingCtx);

  const factLines: string[] = [
    `fit_score: ${fit_score}/100`,
    `clarity_score: ${clarity_score}/100`,
    `recommended_next_step: ${recommended_next_step}`,
  ];

  const signals: Array<[string, unknown]> = [
    ['active_business', input.context.active_business],
    ['problem_in_hadar_domain', input.context.problem_in_hadar_domain],
    ['process_exists', input.context.process_exists],
    ['open_to_guidance', input.context.open_to_guidance],
    ['reason_for_reaching_out', input.context.reason_for_reaching_out],
    ['business_type', input.context.business_type],
    ['main_challenge', input.context.main_challenge],
    ['process_flow_known', input.context.process_flow_known],
    ['gap_identified', input.context.gap_identified],
    ['bottleneck_identified', input.context.bottleneck_identified],
  ];
  for (const [k, v] of signals) {
    if (v != null && v !== '') factLines.push(`${k}: ${JSON.stringify(v)}`);
  }

  const userPrompt = [
    `## ניקוד ועובדות\n${factLines.join('\n')}`,
    'הסבר את ה-fit_reasoning וציין key_gaps. חזור JSON בלבד.',
  ].join('\n\n');

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hadarturgemanautomations.com',
        'X-Title': 'Hadar Diagnostic Fit',
      },
      body: JSON.stringify({
        model: DIAGNOSTIC_FIT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.0,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      // Fallback: return deterministic scores without LLM reasoning
      return {
        fit_score,
        clarity_score,
        recommended_next_step: recommended_next_step as FitAssessment['recommended_next_step'],
        fit_reasoning: '',
        key_gaps: [],
      };
    }

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? '';
    const result = parseDiagnosticFit(raw, { fit_score, clarity_score, recommended_next_step });

    if (result) {
      console.log(`[diagnosticFit] fit=${fit_score} clarity=${clarity_score} next=${recommended_next_step}`);
    }
    return result ?? { fit_score, clarity_score, recommended_next_step: recommended_next_step as FitAssessment['recommended_next_step'], fit_reasoning: '', key_gaps: [] };
  } catch (err) {
    console.warn('[diagnosticFit] failed (non-fatal):', err);
    return { fit_score, clarity_score, recommended_next_step: recommended_next_step as FitAssessment['recommended_next_step'], fit_reasoning: '', key_gaps: [] };
  }
}
