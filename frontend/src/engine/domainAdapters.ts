import type { DomainContext, DomainModelAdapter, DomainResponse, DomainType } from '../types/domainRouting';

export const DEMO_DATA_BANNER = 'DEMO DATA — NOT A REAL RECORD';
export const SYNTHETIC_DISCLAIMER = 'Synthetic data only — no real domain system accessed';

const CAPABILITIES: Record<DomainType, string[]> = {
  BANKING: ['read synthetic balances', 'explain mock products', 'summarize demo fraud policy'],
  GOVERNMENT: ['summarize public-style demo policies', 'explain mock benefit programs'],
  COMPANY: ['summarize demo internal policy', 'describe mock org structure'],
  OTHER: ['public documentation', 'educational answers', 'open research summaries'],
};

function envelope(domain: DomainType, modelName: string, resourceName: string, body: string, redacted: string[] = []): DomainResponse {
  return {
    domain,
    modelName,
    resourceName,
    accessMode: 'READ_ONLY_SYNTHETIC',
    demoLabel: 'SIMULATED DEMO',
    syntheticDisclaimer: SYNTHETIC_DISCLAIMER,
    text: `${DEMO_DATA_BANNER}\n\n${body}\n\n_${SYNTHETIC_DISCLAIMER}_`,
    leakedPatternsRedacted: redacted,
    resourceAccessed: true,
  };
}

const bankingAdapter: DomainModelAdapter = {
  domain: 'BANKING',
  modelName: 'Banking ML Model — DEMO',
  resourceName: 'Mock Banking Systems',
  allowedCapabilities: CAPABILITIES.BANKING,
  async generateResponse(_prompt, ctx) {
    return envelope('BANKING', this.modelName, this.resourceName, [
      `Domain: BANKING`,
      `Model: ${this.modelName}`,
      `Resource boundary: ${this.resourceName}`,
      `Access: Read-only synthetic data`,
      `Request: ${ctx.requestId}`,
      '',
      'Mock product snapshot (fictional):',
      '- Demo checking ****4412 · available 1,240.00 (sandbox units)',
      '- Demo savings ****9921 · available 8,410.00 (sandbox units)',
      '- Last mock posting: card-present grocery · 24.50',
      '',
      'No live bank APIs, card PANs, or customer records were queried.',
    ].join('\n'));
  },
};

const governmentAdapter: DomainModelAdapter = {
  domain: 'GOVERNMENT',
  modelName: 'Government ML Model — DEMO',
  resourceName: 'Mock Government Databases',
  allowedCapabilities: CAPABILITIES.GOVERNMENT,
  async generateResponse(_prompt, ctx) {
    return envelope('GOVERNMENT', this.modelName, this.resourceName, [
      `Domain: GOVERNMENT`,
      `Model: ${this.modelName}`,
      `Resource boundary: ${this.resourceName}`,
      `Access: Read-only synthetic data`,
      `Request: ${ctx.requestId}`,
      '',
      'Public-style demo policy excerpt (fictional municipality):',
      '- Benefit program PG-DEMO-14: eligibility based on sandbox residency flag',
      '- Permit desk hours: weekdays 09:00–16:00 (demo calendar)',
      '',
      'No citizen, passport, tax, or immigration records exist in this environment.',
    ].join('\n'));
  },
};

const companyAdapter: DomainModelAdapter = {
  domain: 'COMPANY',
  modelName: 'Company ML Model — DEMO',
  resourceName: 'Mock Company Databases',
  allowedCapabilities: CAPABILITIES.COMPANY,
  async generateResponse(_prompt, ctx) {
    return envelope('COMPANY', this.modelName, this.resourceName, [
      `Domain: COMPANY`,
      `Model: ${this.modelName}`,
      `Resource boundary: ${this.resourceName}`,
      `Access: Read-only synthetic data`,
      `Request: ${ctx.requestId}`,
      '',
      'Demo internal policy (fictional org):',
      '- Remote work: core hours 10:00–15:00 local',
      '- Expense receipts required above 25 sandbox units',
      '',
      'No employee records, private repositories, or confidential files were accessed.',
    ].join('\n'));
  },
};

const otherAdapter: DomainModelAdapter = {
  domain: 'OTHER',
  modelName: 'Research ML Model — DEMO',
  resourceName: 'Public/Research Resources',
  allowedCapabilities: CAPABILITIES.OTHER,
  async generateResponse(prompt, ctx) {
    const lower = prompt.toLowerCase();
    const educational = lower.includes('etag') || lower.includes('caching') || lower.includes('authentication');
    return envelope('OTHER', this.modelName, this.resourceName, [
      `Domain: OTHER`,
      `Model: ${this.modelName}`,
      `Resource boundary: ${this.resourceName}`,
      `Access: Read-only synthetic / public-style demo`,
      `Request: ${ctx.requestId}`,
      '',
      educational
        ? 'Educational summary generated from public documentation patterns. No private datasets were used.'
        : 'General research-style answer generated inside the public/other resource boundary.',
    ].join('\n'));
  },
};

export const DOMAIN_ADAPTER_REGISTRY: Record<DomainType, DomainModelAdapter> = {
  BANKING: bankingAdapter,
  GOVERNMENT: governmentAdapter,
  COMPANY: companyAdapter,
  OTHER: otherAdapter,
};

export function getAdapter(domain: DomainType): DomainModelAdapter {
  return DOMAIN_ADAPTER_REGISTRY[domain];
}

export async function runSelectedAdapter(ctx: DomainContext): Promise<DomainResponse | null> {
  if (!ctx.routing.policy.allowRouting) return null;
  const adapter = getAdapter(ctx.routing.selectedDomain);
  return adapter.generateResponse(ctx.sanitizedPrompt, ctx);
}
