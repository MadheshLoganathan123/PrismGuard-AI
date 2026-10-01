import type { ServiceHealth } from '../types';

export const INITIAL_HEALTH_STATUS: ServiceHealth[] = [
  {
    id: 'health-fe',
    name: 'Frontend Application',
    status: 'READY',
    latency_ms: 1,
    details: 'React 18 SPA operational; zero sensitive credentials in bundle.',
    last_checked: '17:42:08 UTC',
    endpoint: 'http://localhost:5173',
    diagnostic_safe_note: 'DOM sandboxing active; safe rendering verified.'
  },
  {
    id: 'health-be',
    name: 'Backend Gateway API',
    status: 'READY',
    latency_ms: 12,
    details: 'FastAPI orchestrator responsive; rate limiters and audit emitters active.',
    last_checked: '17:42:05 UTC',
    endpoint: '/health',
    diagnostic_safe_note: 'Processes requests server-side only; tokens isolated.'
  },
  {
    id: 'health-guard-conn',
    name: 'SecureAI Guard Connectivity',
    status: 'CONFIG_REQUIRED',
    latency_ms: 184,
    details: 'Endpoint verified; team authorization token configured in sandbox environment.',
    last_checked: '17:41:59 UTC',
    endpoint: 'POST /v1/check/prompt',
    diagnostic_safe_note: 'Fallback to simulated Guard verified for local review.'
  },
  {
    id: 'health-guard-auth',
    name: 'Guard Authorization Readiness',
    status: 'READY',
    latency_ms: 184,
    details: 'Server-side Bearer authentication headers validated; token length ok.',
    last_checked: '17:41:55 UTC',
    endpoint: 'Authorization: Bearer [REDACTED]',
    diagnostic_safe_note: 'No client-side authorization leakage possible.'
  },
  {
    id: 'health-guard-quota',
    name: 'Guard Quota Status',
    status: 'QUOTA_LIMITED',
    latency_ms: 45,
    details: '84 calls remaining of 120 call hard ceiling (28% consumed). Reset in 6h 18m.',
    last_checked: '17:41:48 UTC',
    endpoint: 'GET /v1/usage',
    diagnostic_safe_note: 'Throttling and cache active; stops before overage.'
  },
  {
    id: 'health-llm',
    name: 'LLM Adapter Connectivity',
    status: 'READY',
    latency_ms: 382,
    details: 'Configured LLM inference bridge responsive; response timeout at 8000ms.',
    last_checked: '17:41:40 UTC',
    endpoint: 'POST /v1/chat/completions',
    diagnostic_safe_note: 'System policy segregated into un-overridable parameter.'
  },
  {
    id: 'health-db',
    name: 'Database & Storage',
    status: 'READY',
    latency_ms: 3,
    details: 'Audit event store connected; privacy-preserving hashes persisted.',
    last_checked: '17:41:35 UTC',
    endpoint: 'sqlite:///audit.db',
    diagnostic_safe_note: 'Zero raw secrets stored in database tables.'
  },
  {
    id: 'health-harness',
    name: 'Controlled Research Harness',
    status: 'READY',
    latency_ms: 14,
    details: '14 attack fixtures and 4 benign baselines cataloged; batch runner ready.',
    last_checked: '17:41:30 UTC',
    endpoint: 'POST /api/research/run',
    diagnostic_safe_note: 'Bounded execution mode strictly enforced.'
  }
];
