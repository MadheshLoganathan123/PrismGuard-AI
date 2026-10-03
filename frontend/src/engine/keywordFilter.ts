import type { DomainType, KeywordFilterResult } from '../types/domainRouting';

export const KEYWORD_FILTER_VERSION = 'v1.3.0';

export const KEYWORD_GROUPS: Record<string, string[]> = {
  credentialAccess: ['password', 'private key', 'secret key', 'api key', 'admin token'],
  bankingSensitive: ['bank account', 'routing number', 'card number', 'transaction history', 'wire transfer'],
  governmentSensitive: ['citizen record', 'passport', 'social security', 'benefits record', 'government database'],
  companySensitive: ['internal database', 'employee record', 'confidential report', 'company secret', 'private repository'],
  promptInjection: ['ignore previous instructions', 'system prompt', 'developer message', 'jailbreak', 'bypass security'],
  exfiltration: ['send externally', 'upload secrets', 'webhook', 'exfiltrate', 'forward credentials'],
};

const DOMAIN_HINTS: Record<DomainType, string[]> = {
  BANKING: ['bank', 'account balance', 'transaction', 'card', 'payment', 'loan', 'mortgage', 'wire transfer', 'routing number', 'financial statement', 'fraud claim'],
  GOVERNMENT: ['citizen', 'passport', 'public benefits', 'tax', 'government policy', 'permit', 'public service', 'municipality', 'welfare scheme', 'immigration record'],
  COMPANY: ['internal policy', 'employee', 'hr', 'company database', 'internal report', 'corporate finance', 'private repository', 'organization', 'confidential project'],
  OTHER: ['research paper', 'public documentation', 'general knowledge', 'public dataset', 'open-source', 'educational', 'web documentation'],
};

const CREDENTIAL_INTENT = /\b(dump|reveal|show|steal|extract|leak|print|exfiltrat|forward|upload)\b/i;
const EDUCATIONAL_HINT = /\b(how (does|do|to)|what is|explain|difference between|hashing|authentication vs|best practice)\b/i;

function stripZeroWidth(input: string): string {
  return input.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
}

function decodeBoundedBase64(input: string): string {
  const base64Regex = /([A-Za-z0-9+/=]{16,})/g;
  let extra = '';
  let match: RegExpExecArray | null;
  while ((match = base64Regex.exec(input)) !== null) {
    const candidate = match[1];
    try {
      if (candidate.length % 4 === 0 || candidate.endsWith('=')) {
        const decoded = atob(candidate);
        if (/^[\x20-\x7E\r\n\t]+$/.test(decoded)) extra += ' ' + decoded;
      }
    } catch {
      /* ignore invalid fragments */
    }
  }
  return extra;
}

function redactSecrets(text: string): string {
  return text
    .replace(/\b(sk|pk|api)[-_]?[A-Za-z0-9]{12,}\b/gi, '[REDACTED_TOKEN]')
    .replace(/\b\d{13,19}\b/g, '[REDACTED_NUMBER]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
}

function findMatches(haystack: string, phrases: string[]): string[] {
  const found: string[] = [];
  for (const phrase of phrases) {
    if (haystack.includes(phrase.toLowerCase())) found.push(phrase);
  }
  return found;
}

export function applyKeywordFilter(prompt: string): KeywordFilterResult {
  const stripped = stripZeroWidth(prompt || '');
  const decodedExtra = decodeBoundedBase64(stripped);
  const scan = `${stripped} ${decodedExtra}`.toLowerCase();
  const sanitizedPrompt = redactSecrets(stripped.replace(/\s+/g, ' ').trim());

  const matchedKeywords: string[] = [];
  const categories: string[] = [];
  const detectedDomains = new Set<DomainType>();

  for (const [category, phrases] of Object.entries(KEYWORD_GROUPS)) {
    const hits = findMatches(scan, phrases);
    if (hits.length) {
      categories.push(category);
      matchedKeywords.push(...hits);
    }
  }

  for (const [domain, hints] of Object.entries(DOMAIN_HINTS) as [DomainType, string[]][]) {
    if (findMatches(scan, hints).length) detectedDomains.add(domain);
  }

  if (categories.includes('bankingSensitive')) detectedDomains.add('BANKING');
  if (categories.includes('governmentSensitive')) detectedDomains.add('GOVERNMENT');
  if (categories.includes('companySensitive')) detectedDomains.add('COMPANY');

  const injection = categories.includes('promptInjection');
  const exfil = categories.includes('exfiltration');
  const creds = categories.includes('credentialAccess');
  const sensitiveDomain = categories.some(c => c.endsWith('Sensitive'));
  const educational = EDUCATIONAL_HINT.test(scan);
  const credIntent = CREDENTIAL_INTENT.test(scan);

  let maliciousIntentScore = 0;
  if (injection) maliciousIntentScore += 45;
  if (exfil) maliciousIntentScore += 35;
  if (creds && credIntent) maliciousIntentScore += 25;
  if (creds && !educational) maliciousIntentScore += 10;
  if (decodedExtra) maliciousIntentScore += 15;
  if (sensitiveDomain && (injection || exfil || credIntent)) maliciousIntentScore += 15;
  maliciousIntentScore = Math.min(100, maliciousIntentScore);

  let status: KeywordFilterResult['status'] = 'PASS';
  let rationale = 'No first-pass keyword threats. Prompt annotated for downstream Secure AI screening.';

  if (exfil || (injection && (creds || sensitiveDomain || credIntent)) || (creds && credIntent && !educational)) {
    status = 'BLOCK';
    rationale = 'Keyword filter rejected an obviously disallowed pattern (injection, credential harvest, or exfiltration). This is a first-pass gate, not a final security decision.';
  } else if (injection || (sensitiveDomain && !educational) || (creds && !educational)) {
    status = 'WARN';
    rationale = 'Sensitive keywords or injection phrasing detected. Downstream Secure AI screening remains authoritative.';
  } else if (educational && (creds || scan.includes('authentication'))) {
    status = 'PASS';
    rationale = 'Benign authentication/security education language. Keyword filter annotated but did not block.';
  }

  return {
    status,
    matchedKeywords: [...new Set(matchedKeywords)],
    categories,
    sanitizedPrompt,
    detectedDomains: Array.from(detectedDomains),
    maliciousIntentScore,
    rationale,
    version: KEYWORD_FILTER_VERSION,
  };
}
