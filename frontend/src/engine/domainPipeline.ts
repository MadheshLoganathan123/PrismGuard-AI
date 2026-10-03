import type { AuditEvent, ChatMessage, DecisionType, ExecutionMode } from '../types';
import type {
  DomainRoutingEvent,
  PipelineStageTrace,
  ReviewItem,
  RoutingOutcome,
  SecureScreeningResult,
} from '../types/domainRouting';
import { sha256, runSecurityPipeline } from './simulator';
import { TEST_CASES } from '../data/testCases';
import { applyKeywordFilter } from './keywordFilter';
import { routeDomain } from './domainRouter';
import { getAdapter, runSelectedAdapter } from './domainAdapters';

function outcomeFor(decision: DecisionType, domain: DomainRoutingEvent['routing']['selectedDomain'], allow: boolean, review: boolean): RoutingOutcome {
  if (!allow && (decision === 'BLOCK' || decision === 'REDACT')) return 'BLOCKED_BEFORE_ROUTING';
  if (!allow || review) return 'HELD_FOR_REVIEW';
  if (domain === 'BANKING') return 'ROUTED_TO_BANKING';
  if (domain === 'GOVERNMENT') return 'ROUTED_TO_GOVERNMENT';
  if (domain === 'COMPANY') return 'ROUTED_TO_COMPANY';
  return 'ROUTED_TO_OTHER';
}

function stage(id: string, name: string, status: PipelineStageTrace['status'], latencyMs: number, note: string): PipelineStageTrace {
  return { id, name, status, latencyMs, note };
}

function redactPreview(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim().slice(0, 96);
  return cleaned.length < prompt.trim().length ? `${cleaned}…` : cleaned;
}

export function screeningFromAudit(audit: AuditEvent, executionMode: ExecutionMode): SecureScreeningResult {
  return {
    executionMode,
    guardStatus: audit.guard_decision === 'PARTIAL' ? 'partial' : audit.guard_decision === 'ERROR' ? 'error' : 'complete',
    guardAllowed: audit.guard_decision === 'ALLOWED' ? true : audit.guard_decision === 'BLOCKED' ? false : null,
    guardFlags: [],
    localSignals: audit.local_signals || [],
    riskScore: audit.risk_score,
    riskBand: audit.risk_band,
    screeningDecision: audit.policy_decision,
    screeningRationale: audit.policy_rationale,
    latencyMs: audit.total_latency_ms,
  };
}

export async function screenPromptLocally(
  input: string,
  forcedTestCaseId: string | undefined,
  executionMode: ExecutionMode,
): Promise<{ screening: SecureScreeningResult; auditEvent: AuditEvent; message: ChatMessage }> {
  const { message, auditEvent } = await runSecurityPipeline(input, forcedTestCaseId, executionMode);
  return { screening: screeningFromAudit(auditEvent, executionMode), auditEvent, message };
}

export async function runDomainRoutingPipeline(
  input: string,
  options?: {
    executionMode?: ExecutionMode;
    scenarioId?: string;
    forcedTestCaseId?: string;
    screeningOverride?: SecureScreeningResult;
    existingAudit?: AuditEvent;
  },
): Promise<{ event: DomainRoutingEvent; auditEvent: AuditEvent; message: ChatMessage; reviewItem: ReviewItem | null; adapterCalled: boolean }> {
  const executionMode = options?.executionMode || 'SIMULATED';
  const t0 = performance.now();
  const hash = await sha256(input);
  const reqId = 'pg-domain-' + Math.random().toString(36).slice(2, 8);

  const tKw = performance.now();
  const keyword = applyKeywordFilter(input);
  const kwMs = Math.max(1, Math.round(performance.now() - tKw));

  let screening: SecureScreeningResult;
  let auditEvent: AuditEvent;
  let message: ChatMessage;

  if (options?.screeningOverride && options?.existingAudit) {
    screening = options.screeningOverride;
    auditEvent = options.existingAudit;
    message = {
      id: 'msg-' + Math.random().toString(36).slice(2, 8),
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      execution_mode: executionMode,
      decision: screening.screeningDecision,
      risk_score: screening.riskScore,
      risk_band: screening.riskBand,
      telemetry: auditEvent,
    };
  } else {
    const local = await screenPromptLocally(input, options?.forcedTestCaseId, executionMode);
    screening = local.screening;
    auditEvent = local.auditEvent;
    message = local.message;
  }

  // Keyword BLOCK cannot be weaker than existing policy, but existing BLOCK always wins.
  let policyDecision = screening.screeningDecision;
  if (keyword.status === 'BLOCK' && policyDecision !== 'BLOCK' && policyDecision !== 'REDACT') {
    policyDecision = 'BLOCK';
  }

  const degradedGuard = screening.guardStatus === 'partial' || screening.guardStatus === 'error';
  if (degradedGuard && policyDecision !== 'BLOCK') {
    policyDecision = policyDecision === 'ALLOW' || policyDecision === 'WARN' ? 'REVIEW' : policyDecision;
  }

  const routing = routeDomain(input, keyword, policyDecision, screening.riskBand, screening.riskScore);
  const adapterMeta = getAdapter(routing.selectedDomain);
  const reviewRequired = routing.policy.requiresReview
    || policyDecision === 'REVIEW'
    || policyDecision === 'REVIEW_GUARD_BLOCK'
    || keyword.status === 'BLOCK';

  const canCallAdapter = routing.policy.allowRouting
    && policyDecision !== 'BLOCK'
    && policyDecision !== 'REVIEW'
    && policyDecision !== 'REVIEW_GUARD_BLOCK'
    && keyword.status !== 'BLOCK';

  let domainResponse = null;
  let adapterCalled = false;
  const tAd = performance.now();
  if (canCallAdapter) {
    domainResponse = await runSelectedAdapter({
      requestId: reqId,
      executionMode,
      sanitizedPrompt: keyword.sanitizedPrompt,
      screening,
      routing,
    });
    adapterCalled = domainResponse !== null;
  }
  const adMs = Math.max(0, Math.round(performance.now() - tAd));

  const outputLeak = /sk-[A-Za-z0-9]{8,}|api[_-]?key\s*[:=]/i.test(domainResponse?.text || '');
  if (outputLeak && domainResponse) {
    domainResponse.text = domainResponse.text.replace(/sk-[A-Za-z0-9]{8,}/g, '[REDACTED_API_TOKEN_BY_PRISMGUARD]');
    domainResponse.leakedPatternsRedacted = ['synthetic_token_pattern'];
    policyDecision = 'REDACT';
  }

  const routingOutcome = outcomeFor(policyDecision, routing.selectedDomain, canCallAdapter && adapterCalled, reviewRequired && !adapterCalled);
  const eventId = 'drevt-' + Math.random().toString(36).slice(2, 9);
  const reviewId = reviewRequired ? 'rev-' + Math.random().toString(36).slice(2, 9) : undefined;

  const kwStageStatus = keyword.status === 'BLOCK' ? 'blocked' : keyword.status === 'WARN' ? 'warning' : 'passed';
  const screenStatus = policyDecision === 'BLOCK' ? 'blocked' : (policyDecision.startsWith('REVIEW') ? 'warning' : 'passed');
  const routerStatus = routing.policy.crossDomainViolation ? 'warning' : (canCallAdapter ? 'passed' : (policyDecision === 'BLOCK' ? 'blocked' : 'warning'));
  const adapterStatus = adapterCalled ? 'passed' : 'skipped';

  const stages: PipelineStageTrace[] = [
    stage('recv', 'Prompt Received', 'passed', 1, 'Ingress accepted'),
    stage('kw', 'Keyword Filter', kwStageStatus, kwMs, keyword.rationale),
    stage('secure', 'Secure AI', screenStatus, screening.latencyMs, screening.screeningRationale),
    stage('router', 'PrismGuard Router', routerStatus, 4, routing.routingReason),
    stage('adapter', 'Domain Adapter', adapterStatus, adapterCalled ? adMs : 0, adapterCalled ? adapterMeta.modelName : 'NOT EXECUTED'),
    stage('resource', 'Resource Boundary', adapterStatus, adapterCalled ? 2 : 0, adapterCalled ? adapterMeta.resourceName : 'NOT EXECUTED'),
    stage('output', 'Output Guard', adapterCalled ? (policyDecision === 'REDACT' ? 'warning' : 'passed') : 'skipped', adapterCalled ? 6 : 0, adapterCalled ? 'Response screened' : 'NOT EXECUTED'),
    stage('review', 'Admin Review / Audit', reviewRequired ? 'warning' : 'passed', 3, reviewRequired ? 'Queued for review' : 'Audit recorded'),
  ];

  const event: DomainRoutingEvent = {
    id: eventId,
    createdAt: new Date().toISOString(),
    promptHash: hash,
    redactedPromptPreview: redactPreview(keyword.sanitizedPrompt),
    scenarioId: options?.scenarioId,
    executionMode,
    keywordFilter: keyword,
    screening,
    routing,
    policyDecision,
    routingOutcome,
    adapter: {
      modelName: adapterMeta.modelName,
      resourceName: adapterMeta.resourceName,
      accessMode: canCallAdapter ? 'READ_ONLY_SYNTHETIC' : 'NONE',
    },
    domainResponse: domainResponse || undefined,
    resourceAccessed: Boolean(domainResponse?.resourceAccessed),
    reviewRequired,
    reviewItemId: reviewId,
    auditEventId: auditEvent.id,
    stages,
    simulatedDemo: true,
  };

  const matched = TEST_CASES.find(tc => tc.test_id === options?.forcedTestCaseId);

  auditEvent = {
    ...auditEvent,
    policy_decision: policyDecision,
    execution_mode: executionMode,
    test_id: options?.forcedTestCaseId || auditEvent.test_id,
    classification: matched?.name || `Domain ${routing.selectedDomain} · ${routingOutcome.replace(/_/g, ' ')}`,
    action_taken: routing.routingReason,
    policy_rationale: `${screening.screeningRationale} | ${routing.routingReason}`,
    total_latency_ms: Math.round(performance.now() - t0 + screening.latencyMs),
    domain_metadata: {
      executionMode,
      keywordFilterStatus: keyword.status,
      matchedKeywordCategories: keyword.categories,
      selectedDomain: routing.selectedDomain,
      domainConfidence: routing.confidence,
      domainSignals: routing.matchedSignals,
      modelAdapter: adapterMeta.modelName,
      resourceBoundary: adapterMeta.resourceName,
      resourceAccessed: event.resourceAccessed,
      reviewItemId: reviewId,
      routingOutcome,
      adapterExecuted: adapterCalled,
    },
  };

  const assistantText = !canCallAdapter
    ? (policyDecision === 'BLOCK'
      ? 'Blocked before domain routing. No domain model or resource was accessed.'
      : 'Held for admin review. No domain model or resource was accessed.')
    : (domainResponse?.text || message.text);

  message = {
    ...message,
    text: assistantText,
    decision: policyDecision,
    execution_mode: executionMode,
    telemetry: auditEvent,
    routing: event,
  };

  let reviewItem: ReviewItem | null = null;
  if (reviewRequired && reviewId) {
    const disagreement = screening.guardAllowed === true && (policyDecision === 'REVIEW' || policyDecision === 'BLOCK');
    reviewItem = {
      id: reviewId,
      createdAt: event.createdAt,
      status: 'PENDING',
      priority: policyDecision === 'BLOCK' || routing.policy.crossDomainViolation ? 'HIGH' : (screening.riskBand === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM'),
      promptHash: hash,
      redactedPromptPreview: event.redactedPromptPreview,
      selectedDomain: routing.selectedDomain,
      proposedDomain: routing.selectedDomain,
      decision: policyDecision,
      riskScore: screening.riskScore,
      riskBand: screening.riskBand,
      matchedSignals: [...keyword.matchedKeywords, ...routing.matchedSignals, ...(disagreement ? ['guard_local_disagreement'] : [])],
      reason: routing.routingReason,
      feedbackStatus: 'NONE',
      eventId: event.id,
      executionMode,
    };
  }

  return { event, auditEvent, message, reviewItem, adapterCalled };
}
