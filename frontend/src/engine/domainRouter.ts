import type { DecisionType, RiskBand } from '../types';
import type {
  DomainPolicy,
  DomainRoutingResult,
  DomainType,
  KeywordFilterResult,
} from '../types/domainRouting';

export const DOMAIN_ROUTING_POLICY_VERSION = 'v1.1.0';

export const DOMAIN_SIGNALS: Record<DomainType, string[]> = {
  BANKING: [
    'banking', 'account balance', 'transaction', 'card', 'payment', 'loan', 'mortgage',
    'wire transfer', 'routing number', 'financial statement', 'fraud claim', 'bank',
  ],
  GOVERNMENT: [
    'citizen', 'passport', 'public benefits', 'tax', 'government policy', 'permit',
    'public service', 'municipality', 'welfare scheme', 'immigration record', 'government',
  ],
  COMPANY: [
    'internal policy', 'employee', 'hr', 'company database', 'internal report',
    'corporate finance', 'private repository', 'organization', 'confidential project', 'company',
  ],
  OTHER: [
    'research paper', 'public documentation', 'general knowledge', 'public dataset',
    'open-source', 'educational', 'web documentation', 'etag', 'caching', 'authentication',
  ],
};

function scoreDomain(text: string, domain: DomainType): { score: number; matched: string[] } {
  const matched: string[] = [];
  let score = 0;
  for (const signal of DOMAIN_SIGNALS[domain]) {
    if (text.includes(signal)) {
      matched.push(signal);
      score += signal.length > 10 ? 2 : 1;
    }
  }
  return { score, matched };
}

function neverDowngradeBlock(decision: DecisionType, policy: DomainPolicy): DomainPolicy {
  if (decision === 'BLOCK') {
    return {
      ...policy,
      allowRouting: false,
      requiresReview: policy.requiresReview,
      accessMode: 'NONE',
      notes: `${policy.notes} Existing BLOCK decision remains authoritative; router cannot downgrade BLOCK to ALLOW.`,
    };
  }
  return policy;
}

export function routeDomain(
  prompt: string,
  keyword: KeywordFilterResult,
  screeningDecision: DecisionType,
  riskBand: RiskBand,
  riskScore: number,
): DomainRoutingResult {
  const text = `${keyword.sanitizedPrompt} ${prompt}`.toLowerCase();
  const scored = (Object.keys(DOMAIN_SIGNALS) as DomainType[]).map(domain => {
    const { score, matched } = scoreDomain(text, domain);
    const keywordBoost = keyword.detectedDomains.includes(domain) ? 2 : 0;
    return { domain, raw: score + keywordBoost, matched };
  });

  const total = scored.reduce((s, d) => s + d.raw, 0) || 1;
  const ranked = scored
    .map(d => ({ ...d, confidence: Math.min(0.99, d.raw / Math.max(total, 4) + (d.raw > 0 ? 0.35 : 0.05)) }))
    .sort((a, b) => b.confidence - a.confidence);

  const top = ranked[0];
  const second = ranked[1];
  const highRisk = riskBand === 'HIGH' || riskBand === 'CRITICAL' || riskScore >= 60;
  const mediumRisk = riskBand === 'MEDIUM' || riskScore >= 30;
  const distinctStrong = scored.filter(d => d.raw >= 3 && d.domain !== 'OTHER').length;
  const crossDomain = distinctStrong >= 2 || (
    top.domain !== 'OTHER' && second.raw >= 3 && second.domain !== 'OTHER' && second.domain !== top.domain
  );

  let selectedDomain: DomainType = top.raw > 0 ? top.domain : 'OTHER';
  let confidence = top.raw > 0 ? Number(top.confidence.toFixed(3)) : 0.42;
  let routingReason = `Dominant domain ${selectedDomain} selected from lexical signals.`;

  let policy: DomainPolicy = {
    version: DOMAIN_ROUTING_POLICY_VERSION,
    allowRouting: true,
    requiresReview: false,
    crossDomainViolation: false,
    accessMode: 'READ_ONLY_SYNTHETIC',
    notes: 'Router selects a constrained adapter/data boundary only. It never grants real access.',
  };

  if (keyword.status === 'BLOCK' || screeningDecision === 'BLOCK') {
    policy.allowRouting = false;
    policy.accessMode = 'NONE';
    routingReason = 'Security policy blocked the request before any domain model or resource could run.';
  } else if (
    screeningDecision === 'REVIEW' ||
    screeningDecision === 'REVIEW_GUARD_BLOCK' ||
    screeningDecision === 'REDACT'
  ) {
    policy.allowRouting = false;
    policy.requiresReview = true;
    policy.accessMode = 'NONE';
    routingReason = 'Held for admin review. No domain model or resource was accessed.';
  } else if (crossDomain) {
    policy.crossDomainViolation = true;
    policy.requiresReview = true;
    policy.allowRouting = false;
    policy.accessMode = 'NONE';
    routingReason = 'Cross-domain access attempt detected. Request held for review / blocked at the boundary.';
  } else if (confidence < 0.55 && (highRisk || mediumRisk)) {
    policy.requiresReview = true;
    policy.allowRouting = false;
    policy.accessMode = 'NONE';
    selectedDomain = top.raw > 0 ? top.domain : 'OTHER';
    routingReason = 'Low-confidence routing with elevated risk must go to admin review.';
  } else if (confidence < 0.55 && !highRisk && !mediumRisk) {
    selectedDomain = 'OTHER';
    confidence = Math.max(confidence, 0.62);
    routingReason = 'Low-confidence, low-risk public/educational prompt routed to OTHER resources.';
  }

  policy = neverDowngradeBlock(screeningDecision, policy);

  return {
    selectedDomain,
    confidence,
    matchedSignals: top.matched.slice(0, 8),
    alternativeDomains: ranked.slice(1, 4).map(d => ({
      domain: d.domain,
      confidence: Number(d.confidence.toFixed(3)),
    })),
    routingReason,
    policy,
  };
}

export function routingNeverDowngradesBlock(
  screeningDecision: DecisionType,
  result: DomainRoutingResult,
): boolean {
  if (screeningDecision !== 'BLOCK') return true;
  return result.policy.allowRouting === false && result.policy.accessMode === 'NONE';
}
