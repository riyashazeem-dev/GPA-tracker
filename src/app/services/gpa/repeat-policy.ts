import { RepeatConfig } from '../../models';

/**
 * Default repeat-examination policy.
 *
 * The supplied regulations fix the attempt cap and the 2.00 award but do NOT
 * specify the complete passing procedure, so success is configurable here.
 * Default: a repeat is successful when the attempt mark is a C or above (>= 50).
 */
export const DEFAULT_REPEAT_CONFIG: RepeatConfig = {
  maxAttempts: 2,
  isSuccess: (marks: number) => marks >= 50,
  successfulRepeatGradePoint: 2.0,
  maxAwardedGradePointAfterRepeat: 2.0,
};