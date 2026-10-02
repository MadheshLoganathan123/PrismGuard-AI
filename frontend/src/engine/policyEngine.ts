import type { DecisionType } from '../types';
import type { RiskEvaluation } from './riskEngine';

export interface PolicyResult {
  decision: DecisionType;
  rationale: string;
  allowLlmExecution: boolean;
}

export function evaluatePolicy(
  risk: RiskEvaluation,
  guardAllowed: boolean,
  guardStatus: string
): PolicyResult {
  // 1. Partial / Error handling
  if (guardStatus === 'partial' || guardStatus === 'error') {
    return {
      decision: 'REVIEW',
      rationale: 'SecureAI Guard returned incomplete coverage. Fail-closed posture applied; routed to REVIEW_UNAVAILABLE.',
      allowLlmExecution: false
    };
  }

  // 2. Critical score block
  if (risk.score >= 80) {
    return {
      decision: 'BLOCK',
      rationale: 'Critical adversarial injection corroborated by local pattern detectors. Request terminated at boundary.',
      allowLlmExecution: false
    };
  }

  // 3. Guard blocked cases
  if (!guardAllowed) {
    if (risk.score < 40) {
      // False-positive rescue!
      return {
        decision: 'REVIEW_GUARD_BLOCK',
        rationale: 'Guard blocked on surface keywords, but local context indicates benign/educational intent. Diverted to fast-track review to mitigate false positive.',
        allowLlmExecution: false
      };
    } else {
      return {
        decision: 'BLOCK',
        rationale: 'Corroborated malicious request blocked by both Guard and local analysis.',
        allowLlmExecution: false
      };
    }
  }

  // 4. High risk with Guard allowed (Blind Spot Case - e.g. PI-005)
  if (risk.score >= 60) {
    return {
      decision: 'REVIEW',
      rationale: 'Contradiction detected: Standalone Guard permitted request, but canonicalized detector flagged obfuscated instruction. Policy prevented silent execution.',
      allowLlmExecution: false
    };
  }

  // 5. Medium risk
  if (risk.score >= 30) {
    return {
      decision: 'WARN',
      rationale: 'Elevated technical or security phrasing detected with low threat probability. Response released with security guidance notice.',
      allowLlmExecution: true
    };
  }

  // 6. Safe Low Risk
  return {
    decision: 'ALLOW',
    rationale: 'Low-risk benign query. Guard and local analyzer agree with zero policy violations.',
    allowLlmExecution: true
  };
}
