/**
 * Types for qualification answer payload and simple-form assembly output.
 *
 * No normalized types. No evaluator/result types. No persistence types.
 */

import type { CurrentWorkspaceCapabilities } from "./workspace-capabilities";
import type { ActiveQualificationDefinitionRead } from "./qualification-definition-read";
import type { RawQualificationProfile } from "./qualification-raw-profile";

/** A single answer field entry keyed by field_key. */
export interface QualificationAnswerFieldValue {
  fieldKey: string;
  value: unknown;
}

/** Ordered list of answer field entries for a qualification question set. */
export type QualificationAnswerPayload = readonly QualificationAnswerFieldValue[];

/** Assembled and validated simple-form raw profile with workspace context. */
export interface AssembledSimpleFormRawProfile {
  workspace: CurrentWorkspaceCapabilities;
  qualificationDefinition: ActiveQualificationDefinitionRead;
  rawProfile: RawQualificationProfile;
}
