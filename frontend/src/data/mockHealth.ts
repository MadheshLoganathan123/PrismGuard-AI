import type { ServiceHealth } from '../types';

export const INITIAL_HEALTH_STATUS: ServiceHealth[] = [
  {
    id: 'health-fe',
    name: 'Frontend Application',
    status: 'READY',
    latency_ms: 1,
    details: 'React 18 SPA operational; zero sensitive credentials in bundle.',
    last_checked: 'Active',
    endpoint: 'http://localhost:5173',
    diagnostic_safe_note: 'DOM sandboxing active; safe rendering verified.'
  },
  {
    id: 'health-be',
    name: 'Backend Gateway API',
    status: 'READY',
    latency_ms: 2,
    details: 'FastAPI orchestrator connected; SQLite WAL active.',
    last_checked: 'Active',
    endpoint: '/api/health',
    diagnostic_safe_note: 'Processes requests server-side only; tokens isolated.'
  },
  {
    id: 'health-guard-conn',
    name: 'SecureAI Guard Connectivity',
    status: 'READY',
    latency_ms: 120,
    details: 'Live SecureAI Guard connected and screening active.',
    last_checked: 'Active',
    endpoint: 'https://secureai-guard-598609297408.europe-west4.run.app',
    diagnostic_safe_note: 'Pre-flight prompt screening active.'
  },
  {
    id: 'health-guard-auth',
    name: 'Guard Authorization Readiness',
    status: 'READY',
    latency_ms: 120,
    details: 'Bearer token authenticated with European Google Cloud Run cluster.',
    last_checked: 'Active',
    endpoint: 'Authorization: Bearer [SECURE_GUARD_TOKEN]',
    diagnostic_safe_note: 'No client-side authorization leakage possible.'
  },
  {
    id: 'health-guard-quota',
    name: 'Guard Quota & Throttling',
    status: 'READY',
    latency_ms: 5,
    details: 'Quota monitor active; dynamically synced with backend.',
    last_checked: 'Active',
    endpoint: '/api/guard/usage',
    diagnostic_safe_note: 'Throttling and cache active; prevents overage.'
  },
  {
    id: 'health-llm',
    name: 'LLM Adapter Connectivity',
    status: 'READY',
    latency_ms: 140,
    details: 'OpenAI GPT-4o-mini inference bridge configured and responsive.',
    last_checked: 'Active',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    diagnostic_safe_note: 'System policy segregated into un-overridable parameter.'
  },
  {
    id: 'health-db',
    name: 'Database & Audit Store',
    status: 'READY',
    latency_ms: 2,
    details: 'SQLite WAL audit storage active; real-time telemetry captured.',
    last_checked: 'Active',
    endpoint: 'backend/prismguard.db',
    diagnostic_safe_note: 'Zero raw secrets stored in database tables.'
  },
  {
    id: 'health-harness',
    name: 'Controlled Research Harness',
    status: 'READY',
    latency_ms: 2,
    details: 'Empirical benchmark suite and adversarial fixtures ready for execution.',
    last_checked: 'Active',
    endpoint: '/api/research/run',
    diagnostic_safe_note: 'Bounded execution mode strictly enforced.'
  }
];
