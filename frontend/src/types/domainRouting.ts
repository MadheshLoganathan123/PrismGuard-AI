import type { DecisionType, ExecutionMode, RiskBand } from './index';

export type DomainType = 'BANKING' | 'GOVERNMENT' | 'COMPANY' | 'OTHER';

export type KeywordFilterStatus = 'PASS' | 'WARN' | 'BLOCK';

export type PipelineStageStatus = 'pending' | 'processing' | 'passed' | 'warning' | 'blocked' | 'skipped';

export type ReviewStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

export type ReviewPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReviewLabel =
  | 'MALICIOUS'
  | 'BENIGN'
  | 'SENSITIVE_BUT_ALLOWED'
  | 'WRONG_DOMAIN'
  | 'OUTPUT_LEAKAGE'
  | 'POLICY_ERROR'
  | 'NEEDS_MORE_CONTEXT';

export type FeedbackUpdateStatus = 'DRAFT' | 'READY_FOR_APPROVAL' | 'ACTIVE' | 'ROLLED_BACK';

export type RoutingOutcome =
  | 'BLOCKED_BEFORE_ROUTING'
  | 'HELD_FOR_REVIEW'
  | 'ROUTED_TO_BANKING'
  | 'ROUTED_TO_GOVERNMENT'
  | 'ROUTED_TO_COMPANY'
  | 'ROUTED_TO_OTHER';

export interface KeywordFilterResult {
  status: KeywordFilterStatus;
  matchedKeywords: string[];
  categories: string[];
  sanitizedPrompt: string;
  detectedDomains: DomainType[];
  maliciousIntentScore: number;
  rationale: string;
  version: string;
}

export interface SecureScreeningResult {
  executionMode: ExecutionMode;
  guardStatus: 'complete' | 'partial' | 'error';
  guardAllowed: boolean | null;
  guardFlags: string[];
  localSignals: string[];
  riskScore: number;
  riskBand: RiskBand;
  screeningDecision: DecisionType;
  screeningRationale: string;
  latencyMs: number;
}

export interface DomainPolicy {
  version: string;
  allowRouting: boolean;
  requiresReview: boolean;
  crossDomainViolation: boolean;
  accessMode: 'NONE' | 'READ_ONLY_SYNTHETIC';
  notes: string;
}

export interface DomainRoutingResult {
  selectedDomain: DomainType;
  confidence: number;
  matchedSignals: string[];
  alternativeDomains: { domain: DomainType; confidence: number }[];
  routingReason: string;
  policy: DomainPolicy;
}

export interface DomainContext {
  requestId: string;
  executionMode: ExecutionMode;
  sanitizedPrompt: string;
  screening: SecureScreeningResult;
  routing: DomainRoutingResult;
}

export interface DomainResponse {
  domain: DomainType;
  modelName: string;
  resourceName: string;
  accessMode: 'NONE' | 'READ_ONLY_SYNTHETIC';
  demoLabel: string;
  syntheticDisclaimer: string;
  text: string;
  leakedPatternsRedacted: string[];
  resourceAccessed: boolean;
}

export interface DomainModelAdapter {
  domain: DomainType;
  modelName: string;
  resourceName: string;
  allowedCapabilities: string[];
  generateResponse(prompt: string, context: DomainContext): Promise<DomainResponse>;
}

export interface DomainAuditMetadata {
  executionMode: ExecutionMode;
  keywordFilterStatus: KeywordFilterStatus;
  matchedKeywordCategories: string[];
  selectedDomain?: DomainType;
  domainConfidence?: number;
  domainSignals?: string[];
  modelAdapter?: string;
  resourceBoundary?: string;
  resourceAccessed: boolean;
  reviewItemId?: string;
  feedbackUpdateId?: string;
  routingOutcome?: RoutingOutcome;
  adapterExecuted: boolean;
}

export interface PipelineStageTrace {
  id: string;
  name: string;
  status: PipelineStageStatus;
  latencyMs: number;
  note: string;
}

export interface DomainRoutingEvent {
  id: string;
  createdAt: string;
  promptHash: string;
  redactedPromptPreview: string;
  scenarioId?: string;
  executionMode: ExecutionMode;
  keywordFilter: KeywordFilterResult;
  screening: SecureScreeningResult;
  routing: DomainRoutingResult;
  policyDecision: DecisionType;
  routingOutcome: RoutingOutcome;
  adapter?: {
    modelName: string;
    resourceName: string;
    accessMode: 'NONE' | 'READ_ONLY_SYNTHETIC';
  };
  domainResponse?: DomainResponse;
  resourceAccessed: boolean;
  reviewRequired: boolean;
  reviewItemId?: string;
  auditEventId: string;
  stages: PipelineStageTrace[];
  simulatedDemo: true;
}

export interface ReviewItem {
  id: string;
  createdAt: string;
  status: ReviewStatus;
  priority: ReviewPriority;
  promptHash: string;
  redactedPromptPreview: string;
  selectedDomain?: DomainType;
  proposedDomain?: DomainType;
  decision: DecisionType;
  riskScore: number;
  riskBand: RiskBand;
  matchedSignals: string[];
  reason: string;
  reviewer?: string;
  reviewerLabel?: ReviewLabel;
  reviewerNotes?: string;
  feedbackStatus: 'NONE' | 'QUEUED' | 'APPLIED';
  eventId?: string;
  executionMode: ExecutionMode;
}

export interface SimulatedModelUpdate {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  sourceReviewIds: string[];
  status: FeedbackUpdateStatus;
  version: string;
  previousVersion: string;
  regressionPassRate: number;
  regressionSummary: string;
  simulated: true;
  rollbackAvailable: boolean;
}

export interface DomainScenario {
  id: string;
  group: 'Banking' | 'Government' | 'Company' | 'Other Resources' | 'Cross-domain attack' | 'Ambiguous prompt' | 'Prompt injection + domain request' | 'Output leakage';
  name: string;
  prompt: string;
  expectedOutcome: RoutingOutcome;
}

export interface DomainDemoMetrics {
  label: 'Demo dataset' | 'Simulated telemetry' | 'Local sample data';
  totalRouted: number;
  banking: number;
  government: number;
  company: number;
  other: number;
  heldForReview: number;
  blockedBeforeRouting: number;
  crossDomainBlocked: number;
  averageConfidence: number;
  pendingReviews: number;
  updatesAwaitingApproval: number;
  regressionPassRate: number;
}

export interface DomainResearchRow {
  test_id: string;
  input_domain: DomainType | 'AMBIGUOUS' | 'CROSS';
  expected_domain: DomainType | 'REVIEW' | 'BLOCK';
  selected_domain?: DomainType;
  confidence: number;
  guard_result: string;
  prism_decision: DecisionType;
  resource_boundary: string;
  cross_domain_violation: boolean;
  review_outcome: string;
  execution_mode: ExecutionMode;
  routing_outcome: RoutingOutcome;
}
