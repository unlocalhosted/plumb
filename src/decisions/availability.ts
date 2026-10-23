import type { Decision, JudgedFamily } from '../report.js';
import type { DecisionRecord } from './index.js';

/** Evidence that a family has project decisions, including an active numeric base.
 * Framework-only spacing uses cannot claim the numeric base as their decision. */
export function projectDecision(record: Pick<DecisionRecord, 'decisions' | 'numericSpacing'>, family: JudgedFamily, includeNumericSpacing = true): Decision | undefined {
  return record.decisions.find(decision => decision.family === family && decision.origin !== 'framework') ??
    (family === 'spacing' && includeNumericSpacing && record.numericSpacing && !record.numericSpacing.replaced ? record.numericSpacing.unit : undefined);
}
