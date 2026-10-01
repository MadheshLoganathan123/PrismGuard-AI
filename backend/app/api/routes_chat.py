import time
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    SecurityMeta,
    StageLatencies,
    AuditEventModel,
    DecisionType,
    ResponseDecisionType
)
from app.security.normalize import normalize_input
from app.security.detector import detect_security_signals
from app.security.risk import calculate_risk_score
from app.security.policy import evaluate_policy
from app.security.output import analyze_model_output
from app.guard.client import guard_client
from app.llm.client import llm_client
from app.audit.logger import audit_logger, compute_sha256

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest, req: Request):
    """
    Main gateway entrypoint for single-turn or short-context chat requests.
    Orchestrates defense-in-depth security verification before and after LLM inference.
    """
    total_start = time.perf_counter()
    request_id = f"pg-{uuid.uuid4().hex[:12]}"
    raw_text = request.message.strip()
    latencies = StageLatencies()

    # --- STAGE 1: Input Normalization ---
    s1_start = time.perf_counter()
    canonical_text, norm_meta, norm_signals = normalize_input(raw_text)
    latencies.normalizer = round((time.perf_counter() - s1_start) * 1000, 2)

    # --- STAGE 2: Custom Detector & Baseline Signals ---
    s2_start = time.perf_counter()
    local_signals, cat_breakdown, is_attack_like, is_benign_edu = detect_security_signals(
        raw_text, canonical_text, norm_signals
    )
    latencies.detector = round((time.perf_counter() - s2_start) * 1000, 2)

    # --- STAGE 3: SecureAI Guard Prompt Check ---
    s3_start = time.perf_counter()
    guard_res = await guard_client.check_prompt(raw_text, test_id=request.preset_test_id)
    latencies.guard_prompt = round((time.perf_counter() - s3_start) * 1000, 2)

    # --- STAGE 4: Additive Risk Scoring ---
    s4_start = time.perf_counter()
    risk_score, risk_band, scored_cats = calculate_risk_score(
        categories=cat_breakdown,
        guard_allowed=bool(guard_res.allowed),
        guard_status=guard_res.status.value,
        output_risk_points=0,
        is_benign_override=is_benign_edu
    )
    latencies.risk_engine = round((time.perf_counter() - s4_start) * 1000, 2)

    # --- STAGE 5: Multi-Layer Policy Evaluation ---
    s5_start = time.perf_counter()
    policy_decision, rationale, action_taken = evaluate_policy(
        risk_score=risk_score,
        risk_band=risk_band,
        guard_allowed=bool(guard_res.allowed),
        guard_status=guard_res.status.value,
        local_signals=local_signals,
        scored_categories=scored_cats
    )
    latencies.policy = round((time.perf_counter() - s5_start) * 1000, 2)

    assistant_text: str | None = None
    response_decision: str | None = None

    # --- STAGE 6 & 7: LLM Execution & Output Screening ---
    if policy_decision in (DecisionType.ALLOW, DecisionType.WARN):
        s6_start = time.perf_counter()
        raw_llm_output = await llm_client.generate_response(raw_text, session_id=request.session_id)
        latencies.llm = round((time.perf_counter() - s6_start) * 1000, 2)

        s7_start = time.perf_counter()
        # Local output analysis (secrets, prompt leakage, URLs)
        sanitized_text, out_dec, out_signals, out_points = analyze_model_output(raw_llm_output)
        
        # Screen with Guard /v1/check/response
        guard_resp_res = await guard_client.check_response(sanitized_text)
        latencies.guard_response = round((time.perf_counter() - s7_start) * 1000, 2)

        if not guard_resp_res.allowed:
            out_signals.append("GUARD_RESPONSE_SCREENING_FAILED")
            out_dec = ResponseDecisionType.BLOCK

        response_decision = out_dec.value
        local_signals.extend(out_signals)

        if out_dec == ResponseDecisionType.BLOCK:
            assistant_text = "⚠️ Response suppressed: Generated output violated downstream security policies."
        elif out_dec == ResponseDecisionType.REDACT:
            assistant_text = f"{sanitized_text}\n\n*(Notice: Output contained synthetic secrets which were automatically redacted by PrismGuard AI)*"
        else:
            assistant_text = sanitized_text
    else:
        # Request was blocked or held for review - LLM is NEVER called!
        latencies.llm = 0.0
        latencies.guard_response = 0.0
        if policy_decision == DecisionType.BLOCK:
            assistant_text = "🛡️ **Request Blocked by PrismGuard AI**: High confidence adversarial prompt injection or obfuscated override detected."
        elif policy_decision == DecisionType.REVIEW_GUARD_BLOCK:
            assistant_text = "🔍 **Request Held for Security Review**: SecureAI Guard flagged this prompt, but local analysis found no critical corroboration. Queued for human verification to reduce false positives."
        elif policy_decision == DecisionType.REVIEW:
            assistant_text = "⏳ **Request Quarantined for Review**: Ambiguous instruction boundaries or degraded screening detected."

    # --- STAGE 8: Structured Audit Logging ---
    s8_start = time.perf_counter()
    total_latency_ms = round((time.perf_counter() - total_start) * 1000, 2)
    latencies.audit = round((time.perf_counter() - s8_start) * 1000, 2)

    event_id = f"evt-{uuid.uuid4().hex[:12]}"
    iso_timestamp = datetime.now(timezone.utc).isoformat()
    input_sha256 = compute_sha256(raw_text)

    guard_decision_str = "ALLOWED" if guard_res.allowed else ("BLOCKED" if guard_res.allowed is False else "ERROR")
    if guard_res.status.value == "partial":
        guard_decision_str = "PARTIAL"

    audit_payload = {
        "id": event_id,
        "timestamp": iso_timestamp,
        "gateway_request_id": request_id,
        "test_id": request.preset_test_id,
        "input_sha256": input_sha256,
        "input_length": len(raw_text),
        "classification": "attack-like" if is_attack_like else ("benign" if is_benign_edu else "unknown"),
        "risk_score": risk_score,
        "risk_band": risk_band.value,
        "guard_decision": guard_decision_str,
        "guard_status": guard_res.status.value,
        "guard_allowed": guard_res.allowed,
        "guard_flags": guard_res.flags,
        "guard_checks": guard_res.checks,
        "guard_request_id": guard_res.request_id,
        "guard_latency_ms": guard_res.latency_ms,
        "policy_decision": policy_decision.value,
        "response_decision": response_decision,
        "total_latency_ms": total_latency_ms,
        "stage_latencies": latencies.model_dump(),
        "action_taken": action_taken,
        "local_signals": list(set(local_signals)),
        "policy_rationale": rationale,
        "request_summary": raw_text[:80] + ("..." if len(raw_text) > 80 else "")
    }

    audit_logger.record_event(audit_payload)

    audit_model = AuditEventModel(
        id=event_id,
        timestamp=iso_timestamp,
        gateway_request_id=request_id,
        test_id=request.preset_test_id,
        input_sha256=input_sha256,
        input_length=len(raw_text),
        classification=audit_payload["classification"],
        risk_score=risk_score,
        risk_band=risk_band,
        guard_decision=guard_decision_str,
        policy_decision=policy_decision,
        total_latency_ms=total_latency_ms,
        action_taken=action_taken,
        local_signals=list(set(local_signals)),
        stage_latencies=latencies,
        policy_rationale=rationale,
        request_summary=audit_payload["request_summary"]
    )

    return ChatResponse(
        request_id=request_id,
        decision=policy_decision,
        risk_score=risk_score,
        risk_band=risk_band,
        assistant_text=assistant_text,
        security=SecurityMeta(
            local_signals=list(set(local_signals)),
            guard=guard_res,
            response_decision=response_decision
        ),
        stage_latencies=latencies,
        audit_event=audit_model
    )
