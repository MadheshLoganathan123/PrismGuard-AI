import type { ReviewItem, ReviewLabel, SimulatedModelUpdate } from '../types/domainRouting';

export const FEEDBACK_WORKER_MODE = 'simulation mode';

export function applyReviewResolution(
  item: ReviewItem,
  label: ReviewLabel,
  notes: string,
  reviewer = 'Mathew',
): ReviewItem {
  return {
    ...item,
    status: 'RESOLVED',
    reviewer,
    reviewerLabel: label,
    reviewerNotes: notes,
    feedbackStatus: 'QUEUED',
  };
}

export function buildSimulatedUpdate(reviews: ReviewItem[], previousVersion: string): SimulatedModelUpdate {
  const topic = reviews[0]?.reviewerLabel || 'POLICY_ERROR';
  const nextPatch = Number(previousVersion.split('.').pop() || '0') + 1;
  const version = previousVersion.replace(/\.\d+$/, `.${nextPatch}`);
  return {
    id: 'upd-' + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    title: `Simulated update · ${topic.replace(/_/g, ' ')}`,
    description: 'Draft rule generated from admin-labelled feedback. This is a simulated update — no real model retraining occurred.',
    sourceReviewIds: reviews.map(r => r.id),
    status: 'DRAFT',
    version,
    previousVersion,
    regressionPassRate: 0,
    regressionSummary: 'Pending simulated regression suite.',
    simulated: true,
    rollbackAvailable: true,
  };
}

export function runSimulatedRegression(update: SimulatedModelUpdate): SimulatedModelUpdate {
  return {
    ...update,
    status: 'READY_FOR_APPROVAL',
    regressionPassRate: 96.7,
    regressionSummary: 'Simulated regression: 29/30 domain-boundary checks passed. Ready for approval — not deployed as live ML weights.',
  };
}

export function activateSimulatedUpdate(update: SimulatedModelUpdate): SimulatedModelUpdate {
  return { ...update, status: 'ACTIVE' };
}

export function rollbackSimulatedUpdate(update: SimulatedModelUpdate): SimulatedModelUpdate {
  return {
    ...update,
    status: 'ROLLED_BACK',
    description: `${update.description} Rolled back to ${update.previousVersion} (simulated).`,
  };
}
