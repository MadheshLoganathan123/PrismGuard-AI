export type DecisionType = 
  | 'ALLOW' 
  | 'WARN' 
  | 'REVIEW' 
  | 'REVIEW_GUARD_BLOCK' 
  | 'BLOCK' 
  | 'REDACT';

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StageLatencies {
  normalizer: number;
  detector: number;
  guard_prompt: number;
  risk_engine: number;
  policy: number;
  llm: number;
  guard_response: number;
  audit: number;
}

export interface TestCase {
  test_id: string;
  category: string;
  name: string;
  description: string;
  raw_input: string;
  canonical_input: string;
  input_sha256: string;
  input_length: number;
  expected_label: 'attack-like' | 'benign' | 'output' | 'error';
  guard_allowed: boolean;
  guard_status: 'complete' | 'partial' | 'error';
  guard_flags: string[];
  guard_latency_ms: number;
  prism_score: number;
  prism_signals: string[];
  prism_action: DecisionType;
  reproducible_runs: string;
  mitigation_note: string;
  vector_details?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  gateway_request_id: string;
  input_sha256: string;
  test_id?: string;
  classification: string;
  risk_score: number;
  risk_band: RiskBand;
  guard_decision: 'ALLOWED' | 'BLOCKED' | 'PARTIAL' | 'ERROR';
  policy_decision: DecisionType;
  total_latency_ms: number;
  action_taken: string;
  local_signals: string[];
  stage_latencies: StageLatencies;
  policy_rationale: string;
  request_summary?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  decision?: DecisionType;
  risk_score?: number;
  risk_band?: RiskBand;
  telemetry?: AuditEvent;
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: 'READY' | 'DEGRADED' | 'CONFIG_REQUIRED' | 'QUOTA_LIMITED';
  latency_ms: number;
  details: string;
  last_checked: string;
  endpoint?: string;
  diagnostic_safe_note?: string;
}

export type ActiveTab = 
  | 'overview' 
  | 'chat' 
  | 'attack-lab' 
  | 'dashboard' 
  | 'research' 
  | 'audit' 
  | 'health';
