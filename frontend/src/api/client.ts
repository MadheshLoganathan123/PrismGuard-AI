import type { AuditEvent, TestCase, DecisionType, RiskBand } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ChatApiResponse {
  request_id: string;
  decision: DecisionType;
  risk_score: number;
  risk_band: RiskBand;
  assistant_text?: string;
  security: {
    local_signals: string[];
    guard: {
      status: string;
      allowed?: boolean;
      flags: string[];
      checks: Record<string, any>;
      latency_ms: number;
      request_id?: string;
    };
    response_decision?: string;
  };
  stage_latencies: {
    normalizer: number;
    detector: number;
    guard_prompt: number;
    risk_engine: number;
    policy: number;
    llm: number;
    guard_response: number;
    audit: number;
  };
  audit_event: AuditEvent;
}

export interface ResearchBatchResponse {
  run_id: string;
  timestamp: string;
  tests_executed: number;
  results: ResearchTestResult[];
  quota_used_in_run: number;
  total_quota_consumed: number;
  budget_limit: number;
}

export interface ResearchTestResult {
  id: string;
  test_id: string;
  run_id: string;
  timestamp: string;
  category: string;
  description: string;
  input_sha256: string;
  input_length: number;
  guard_allowed: number | null;  // 1=allowed, 0=blocked, null=error
  guard_status: string;
  guard_flags: string[];
  guard_latency_ms: number;
  guard_request_id?: string;
  prism_score: number;
  prism_signals: string[];
  prism_action: string;
  expected_label: string;
  disagreement: number;  // 1 = Guard allowed but PrismGuard flagged
  notes: string;
}

export const apiClient = {
  /**
   * Sends user message through the backend security gateway pipeline.
   */
  async sendChat(message: string, sessionId?: string, presetTestId?: string): Promise<ChatApiResponse> {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        preset_test_id: presetTestId
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Server returned ${res.status}`);
    }

    return res.json();
  },

  /**
   * Executes research harness test batch with hard quota budget checks.
   */
  async runResearchBatch(testIds: string[]): Promise<ResearchBatchResponse> {
    const res = await fetch(`${API_BASE_URL}/api/research/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_ids: testIds })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Batch execution failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Runs a single test case through the full research pipeline (Guard + PrismGuard).
   * Used by Attack Lab "Run on Live Gateway" button.
   */
  async runSingleResearchTest(testId: string): Promise<ResearchTestResult> {
    const res = await fetch(`${API_BASE_URL}/api/research/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_ids: [testId] })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Research run failed (${res.status})`);
    }

    const data: ResearchBatchResponse = await res.json();
    if (!data.results || data.results.length === 0) {
      throw new Error('No results returned from research run');
    }
    return data.results[0];
  },

  /**
   * Fetches aggregate research metrics and recent case executions.
   */
  async getResearchResults(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/research/results`);
    if (!res.ok) throw new Error(`Failed to fetch research metrics (${res.status})`);
    return res.json();
  },

  /**
   * Retrieves test cases catalog from backend.
   */
  async getTestCases(): Promise<TestCase[]> {
    const res = await fetch(`${API_BASE_URL}/api/research/test-cases`);
    if (!res.ok) throw new Error(`Failed to fetch test cases (${res.status})`);
    return res.json();
  },

  /**
   * Retrieves paginated privacy-preserving audit events from SQLite.
   */
  async getAuditEvents(limit = 50, offset = 0, decision?: string, riskBand?: string): Promise<AuditEvent[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    if (decision) params.append('decision', decision);
    if (riskBand) params.append('risk_band', riskBand);

    const res = await fetch(`${API_BASE_URL}/api/audit?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch audit events (${res.status})`);
    return res.json();
  },

  /**
   * Fetches measured summary statistics for the dashboard.
   */
  async getAuditStats(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/audit/stats`);
    if (!res.ok) throw new Error(`Failed to fetch audit stats (${res.status})`);
    return res.json();
  },

  /**
   * Checks health and configuration readiness of backend, Guard, and LLM services.
   */
  async getHealth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
    return res.json();
  },

  /**
   * Fetches live Guard quota usage from /api/guard/usage
   */
  async getGuardUsage(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/guard/usage`);
    if (!res.ok) throw new Error(`Guard usage returned ${res.status}`);
    return res.json();
  }
};
