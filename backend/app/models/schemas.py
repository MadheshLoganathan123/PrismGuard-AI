from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DecisionType(str, Enum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    REVIEW = "REVIEW"
    REVIEW_GUARD_BLOCK = "REVIEW_GUARD_BLOCK"
    BLOCK = "BLOCK"
    REDACT = "REDACT"


class ResponseDecisionType(str, Enum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    REDACT = "REDACT"
    REGENERATE = "REGENERATE"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


class RiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class GuardStatus(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    ERROR = "error"


class GuardCheckResult(BaseModel):
    status: GuardStatus = GuardStatus.COMPLETE
    allowed: Optional[bool] = True
    flags: List[str] = Field(default_factory=list)
    checks: Dict[str, Any] = Field(default_factory=dict)
    latency_ms: float = 0.0
    request_id: Optional[str] = None
    error_message: Optional[str] = None


class StageLatencies(BaseModel):
    normalizer: float = 0.0
    detector: float = 0.0
    guard_prompt: float = 0.0
    risk_engine: float = 0.0
    policy: float = 0.0
    llm: float = 0.0
    guard_response: float = 0.0
    audit: float = 0.0


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="User input text, max 4000 chars")
    session_id: Optional[str] = Field(default=None, max_length=128)
    preset_test_id: Optional[str] = Field(default=None, max_length=32)


class SecurityMeta(BaseModel):
    local_signals: List[str] = Field(default_factory=list)
    guard: GuardCheckResult = Field(default_factory=GuardCheckResult)
    response_decision: Optional[str] = None


class AuditEventModel(BaseModel):
    id: str
    timestamp: str
    gateway_request_id: str
    test_id: Optional[str] = None
    input_sha256: str
    input_length: int
    classification: str
    risk_score: int
    risk_band: RiskBand
    guard_decision: str
    policy_decision: DecisionType
    total_latency_ms: float
    action_taken: str
    local_signals: List[str] = Field(default_factory=list)
    stage_latencies: StageLatencies
    policy_rationale: str
    request_summary: Optional[str] = None


class ChatResponse(BaseModel):
    request_id: str
    decision: DecisionType
    risk_score: int
    risk_band: RiskBand
    assistant_text: Optional[str] = None
    security: SecurityMeta
    stage_latencies: StageLatencies
    audit_event: AuditEventModel


class TestCaseModel(BaseModel):
    test_id: str
    category: str
    attack_class: str
    name: str
    transformation: str
    purpose: str
    raw_input: str
    canonical_input: str
    input_sha256: str
    input_length: int
    expected_label: str
    expected_guard_behavior: Optional[str] = None
    observed_guard_behavior: Optional[str] = None
    our_mitigation: str
    reproducible_runs: Optional[str] = "3/3 consistent"
    mitigation_note: Optional[str] = ""
    guard_allowed: Optional[bool] = None
    guard_status: Optional[str] = "complete"
    guard_flags: List[str] = Field(default_factory=list)
    guard_latency_ms: Optional[float] = 0.0
    prism_score: Optional[int] = 0
    prism_signals: List[str] = Field(default_factory=list)
    prism_action: Optional[DecisionType] = DecisionType.ALLOW


class ResearchRunRequest(BaseModel):
    test_ids: List[str] = Field(..., min_length=1, max_length=50)


class ResearchRunResult(BaseModel):
    run_id: str
    timestamp: str
    tests_executed: int
    results: List[Dict[str, Any]]
    quota_used_in_run: int
    total_quota_consumed: int
    budget_limit: int


class ServiceHealthItem(BaseModel):
    id: str
    name: str
    status: str
    latency_ms: float
    details: str
    last_checked: str
    endpoint: Optional[str] = None
    diagnostic_safe_note: Optional[str] = None
