/**
 * Direct evaluation orchestration result types.
 *
 * Composed runtime result for British direct evaluation.
 * No persistence types. No UI types.
 */

import type { PreparedBritishDirectEvaluation } from "./prepared-british-direct-evaluation";
import type { ResolvedDirectEvaluationRuleContext } from "./direct-evaluation-resolved-rule-context";
import type { ExecuteDirectEvaluationRuleContextResult } from "./direct-evaluation-execution";
import type { AssembledDirectEvaluationResult } from "./direct-evaluation-result-assembly";

/** Full in-memory British direct evaluation runtime result. */
export interface RunBritishDirectEvaluationResult {
  prepared: PreparedBritishDirectEvaluation;
  resolvedContext: ResolvedDirectEvaluationRuleContext;
  execution: ExecuteDirectEvaluationRuleContextResult;
  assembled: AssembledDirectEvaluationResult;
  primaryReasonAr: string;
  nextStepAr: string;
  advisoryNotesAr: readonly string[];
}
