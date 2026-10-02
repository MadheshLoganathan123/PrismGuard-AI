import pytest
from app.models.schemas import RiskBand, DecisionType
from app.security.risk import calculate_risk_score
from app.security.policy import evaluate_policy


def test_additive_risk_score_and_band():
    cats = {
        "obfuscation": 25,
        "instruction_manipulation": 20,
        "semantic_attack": 25,
        "context_anomaly": 10
    }
    score, band, scored_cats = calculate_risk_score(
        categories=cats,
        guard_allowed=True,
        guard_status="complete"
    )
    # 25 + 20 + 25 + 10 + 10 (disagreement) = 90
    assert score >= 80
    assert band == RiskBand.CRITICAL


def test_guard_only_block_defaults_to_review_guard_block():
    # If Guard blocks but local evidence has low risk
    cats = {"obfuscation": 0, "instruction_manipulation": 0, "semantic_attack": 0}
    score, band, scored_cats = calculate_risk_score(
        categories=cats,
        guard_allowed=False,
        guard_status="complete"
    )
    decision, rationale, action = evaluate_policy(
        risk_score=score,
        risk_band=band,
        guard_allowed=False,
        guard_status="complete",
        local_signals=[],
        scored_categories=scored_cats
    )
    assert decision == DecisionType.REVIEW_GUARD_BLOCK
    assert "REVIEW_GUARD_BLOCK" in rationale or "false-positive" in rationale


def test_obfuscation_gap_independent_block():
    # Guard allowed=True, but local score is critical (score >= 80)
    cats = {"obfuscation": 25, "instruction_manipulation": 25, "semantic_attack": 25}
    score, band, scored_cats = calculate_risk_score(
        categories=cats,
        guard_allowed=True,
        guard_status="complete"
    )
    decision, rationale, action = evaluate_policy(
        risk_score=score,
        risk_band=band,
        guard_allowed=True,
        guard_status="complete",
        local_signals=["DIRECT_INSTRUCTION_OVERRIDE_DETECTED"],
        scored_categories=scored_cats
    )
    assert decision == DecisionType.BLOCK
    assert "PRISMGUARD_INDEPENDENT_BLOCK" in action or "defense-in-depth" in rationale.lower()
