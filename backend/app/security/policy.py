from typing import Tuple, List, Dict
from app.models.schemas import DecisionType, RiskBand, GuardStatus


def evaluate_policy(
    risk_score: int,
    risk_band: RiskBand,
    guard_allowed: bool,
    guard_status: str,
    local_signals: List[str],
    scored_categories: Dict[str, int]
) -> Tuple[DecisionType, str, str]:
    """
    Applies multi-layered decision rules from Technical Proposal Section 7 & 16.
    
    Returns:
        decision: DecisionType
        rationale: Human-readable explanation of why this decision was reached
        action_taken: Operational label of gateway action
    """
    has_critical_override = (
        "DIRECT_INSTRUCTION_OVERRIDE_DETECTED" in local_signals or
        "ROLE_MANIPULATION_ATTEMPT" in local_signals or
        "BASE64_ENCODED_PAYLOAD_DETECTED" in "".join(local_signals)
    )

    # 1. Handling Partial or Error Guard States (H5 Partial/error ambiguity)
    if guard_status in (GuardStatus.PARTIAL.value, "partial", GuardStatus.ERROR.value, "error"):
        if risk_score >= 30 or has_critical_override:
            return (
                DecisionType.REVIEW,
                "SecureAI Guard returned partial or degraded status while local risk is elevated. "
                "Failing closed to REVIEW_UNAVAILABLE per strict security policy.",
                "HOLD_FOR_REVIEW_UNAVAILABLE"
            )
        else:
            return (
                DecisionType.WARN,
                "SecureAI Guard unavailable; proceeding with cautionary warning based on low local risk.",
                "RELEASE_WITH_SYSTEM_WARNING"
            )

    # 2. Guard Allowed = False (Guard caught something)
    if not guard_allowed:
        if risk_score >= 80 or (has_critical_override and scored_categories.get("semantic_attack", 0) >= 20):
            return (
                DecisionType.BLOCK,
                "Both SecureAI Guard and PrismGuard AI local corroboration confirmed critical security violation.",
                "GATEWAY_AND_GUARD_HARD_BLOCK"
            )
        else:
            # Crucial differentiator: A Guard-only block without local corroboration defaults to REVIEW_GUARD_BLOCK
            # rather than silently dropping legitimate traffic, preserving false-positive review workflows.
            return (
                DecisionType.REVIEW_GUARD_BLOCK,
                "SecureAI Guard blocked request without independent critical local corroboration. "
                "Routed to REVIEW_GUARD_BLOCK queue to prevent false-positive denial.",
                "ROUTE_TO_GUARD_REVIEW_QUEUE"
            )

    # 3. Guard Allowed = True, but Local Detectors Identified High/Critical Risk (The H1 Obfuscation Gap)
    if risk_score >= 80:
        return (
            DecisionType.BLOCK,
            "PrismGuard AI detected critical prompt manipulation or obfuscated override despite Guard pass. "
            "Defense-in-depth policy applied hard BLOCK.",
            "PRISMGUARD_INDEPENDENT_BLOCK"
        )

    # 4. Local Score 60-79 (High Risk)
    if risk_score >= 60:
        if has_critical_override:
            return (
                DecisionType.BLOCK,
                "High risk score with detected directive override. Gateway enforced BLOCK to protect downstream LLM.",
                "ELEVATED_RISK_BLOCK"
            )
        return (
            DecisionType.REVIEW,
            "High risk score with ambiguous instruction boundaries. Escalated to REVIEW queue.",
            "ESCALATE_TO_SECURITY_REVIEW"
        )

    # 5. Local Score 30-59 (Medium Risk)
    if risk_score >= 30:
        if "BENIGN_EDUCATIONAL_CONTEXT_DETECTED" in local_signals:
            return (
                DecisionType.WARN,
                "Moderate transformation detected within educational or research discussion. Released with WARN banner.",
                "RELEASE_WITH_ADVISORY_NOTICE"
            )
        return (
            DecisionType.WARN,
            "Medium risk signals detected. Permitted with gateway warning headers.",
            "LOG_AND_ATTACH_SECURITY_WARNING"
        )

    # 6. Low Risk & Guard Allowed (Clean Traffic)
    return (
        DecisionType.ALLOW,
        "Clean request: local risk is low and SecureAI Guard screening passed completely.",
        "PERMIT_AND_FORWARD_TO_MODEL"
    )
