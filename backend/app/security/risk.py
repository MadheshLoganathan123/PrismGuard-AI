from typing import Dict, Any, Tuple
from app.models.schemas import RiskBand, GuardStatus


def calculate_risk_score(
    categories: Dict[str, int],
    guard_allowed: bool,
    guard_status: str,
    output_risk_points: int = 0,
    is_benign_override: bool = False
) -> Tuple[int, RiskBand, Dict[str, int]]:
    """
    Computes explainable, additive risk score (0 to 100) and risk band based on
    documented category caps from Technical Proposal Section 16.
    
    Category caps:
      - obfuscation: 0-25
      - instruction_manipulation: 0-25
      - semantic_attack: 0-25
      - context_anomaly: 0-10
      - guard_disagreement: 0-10
      - output_risk: 0-15
      - failure_state: 0-20
    """
    scored_categories = {
        "obfuscation": min(25, max(0, categories.get("obfuscation", 0))),
        "instruction_manipulation": min(25, max(0, categories.get("instruction_manipulation", 0))),
        "semantic_attack": min(25, max(0, categories.get("semantic_attack", 0))),
        "context_anomaly": min(10, max(0, categories.get("context_anomaly", 0))),
        "guard_disagreement": 0,
        "output_risk": min(15, max(0, output_risk_points)),
        "failure_state": 0
    }

    # Guard disagreement penalty (e.g. Guard allows an obfuscated payload or blocks benign query)
    local_subtotal = (
        scored_categories["obfuscation"] +
        scored_categories["instruction_manipulation"] +
        scored_categories["semantic_attack"]
    )
    if guard_allowed and local_subtotal >= 25:
        # Guard permitted something local detectors caught as highly suspicious
        scored_categories["guard_disagreement"] = 10
    elif not guard_allowed and local_subtotal < 15 and is_benign_override:
        # Guard flagged benign academic/education query
        scored_categories["guard_disagreement"] = 5

    # Failure / partial state penalty
    if guard_status in (GuardStatus.PARTIAL.value, "partial"):
        scored_categories["failure_state"] = 15
    elif guard_status in (GuardStatus.ERROR.value, "error"):
        scored_categories["failure_state"] = 20

    raw_sum = sum(scored_categories.values())

    # Benign dampening: if educational/academic discussion is verified and no hard override exists,
    # avoid overblocking legitimate security students/researchers
    if is_benign_override and scored_categories["semantic_attack"] < 25:
        raw_sum = int(raw_sum * 0.4)

    final_score = min(100, max(0, raw_sum))

    # Determine risk band
    if final_score >= 80:
        band = RiskBand.CRITICAL
    elif final_score >= 60:
        band = RiskBand.HIGH
    elif final_score >= 30:
        band = RiskBand.MEDIUM
    else:
        band = RiskBand.LOW

    return final_score, band, scored_categories
