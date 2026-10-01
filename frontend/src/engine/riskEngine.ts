import type { DetectorSignals } from './customDetector';
import type { RiskBand } from '../types';

export interface RiskEvaluation {
  score: number;
  band: RiskBand;
  breakdown: {
    obfuscation: number;
    instruction: number;
    semantic: number;
    context: number;
    guard_disagreement: number;
  };
}

export function computeRiskScore(
  detector: DetectorSignals,
  guardAllowed: boolean,
  guardStatus: string
): RiskEvaluation {
  let context_points = 0;
  let guard_disagreement_points = 0;

  // If local signals detected high risk but Guard says allowed => disagreement
  const localEvidenceTotal = detector.obfuscation_points + detector.instruction_points + detector.semantic_points;
  if (guardAllowed && localEvidenceTotal >= 40) {
    guard_disagreement_points = 10;
  }

  if (guardStatus === 'partial') {
    context_points += 15;
  }

  const rawScore = 
    detector.obfuscation_points +
    detector.instruction_points +
    detector.semantic_points +
    context_points +
    guard_disagreement_points;

  const score = Math.min(100, Math.max(0, rawScore));

  let band: RiskBand = 'LOW';
  if (score >= 80) band = 'CRITICAL';
  else if (score >= 60) band = 'HIGH';
  else if (score >= 30) band = 'MEDIUM';
  else band = 'LOW';

  return {
    score,
    band,
    breakdown: {
      obfuscation: detector.obfuscation_points,
      instruction: detector.instruction_points,
      semantic: detector.semantic_points,
      context: context_points,
      guard_disagreement: guard_disagreement_points
    }
  };
}
