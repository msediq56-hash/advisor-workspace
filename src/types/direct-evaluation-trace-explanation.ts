/**
 * Trace-level Arabic explanation rendering types for direct evaluation.
 *
 * Consumed by a dedicated renderer only — not by execution, result assembly,
 * or persistence modules directly.
 * No UI types. No persistence row types. No workflow types.
 */

import type { DirectEvaluationRuleExecutionOutcome } from "./direct-evaluation-execution";

/** Input for rendering one rule trace Arabic explanation. */
export interface RenderDirectEvaluationRuleTraceExplanationInput {
  ruleTypeKey: string;
  outcome: DirectEvaluationRuleExecutionOutcome;
  matchedCount?: number;
  requiredCount?: number;
}

/** Result of rendering one rule trace Arabic explanation. */
export interface RenderDirectEvaluationRuleTraceExplanationResult {
  explanationAr: string;
}
