import re
from typing import List, Dict, Any, Tuple

# Targeted attack phrase signatures (case-insensitive)
DIRECT_OVERRIDE_PATTERNS = [
    r'ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?',
    r'disregard\s+(?:all\s+)?(?:rules|guidelines|safety|system\s+prompts?)',
    r'bypass\s+(?:all\s+)?(?:security|guardrails|safety\s+filters?)',
    r'from\s+now\s+on\s+you\s+(?:must|will)\s+obey',
    r'new\s+operating\s+(?:instructions?|mode)\s*:',
    r'override\s+(?:system|default)\s+directives?'
]

ROLE_MANIPULATION_PATTERNS = [
    r'you\s+are\s+now\s+(?:in\s+)?(?:dan|unrestricted|god\s+mode|jailbreak|chaos)',
    r'\bdan\b.*?\b(?:unrestricted|do\s+anything\s+now)\b',
    r'act\s+as\s+an?\s+(?:unrestricted|unfiltered|jailbroken|adversarial)\s+ai',
    r'enable\s+(?:developer\s+mode|unlimited\s+mode|sandbox\s+bypass)',
    r'pretend\s+you\s+have\s+no\s+(?:rules|filters|morals|limits)'
]

PROMPT_EXTRACTION_PATTERNS = [
    r'(?:repeat|print|reveal|show|output|leak|display)\s+(?:your\s+)?(?:complete\s+|full\s+|all\s+)?(?:system\s+prompt|initial\s+instructions?|system\s+instructions?)',
    r'what\s+are\s+your\s+(?:hidden|original|system)\s+(?:directives?|prompts?|rules?)',
    r'dump\s+(?:all\s+)?(?:internal|system)\s+(?:prompts?|instructions?|configuration)'
]

INSTRUCTION_SMUGGLING_PATTERNS = [
    r'<\|im_start\|>\s*(?:system|assistant|user)',
    r'\[\s*(?:system|admin|override)\s*\]',
    r'system\s*:\s*you\s+are\s+a',
    r'###\s*instruction\s*:\s*',
    r'\{"role"\s*:\s*"system"',
    r'"system_instruction"\s*:',
    r'<system_policy>',
    r'<!--\s*system\s*directive'
]


BENIGN_ACADEMIC_INDICATORS = [
    r'\b(?:for\s+a\s+class|in\s+an\s+academic|conceptually|syllabus|educational\s+purpose|cybersecurity\s+course)\b',
    r'\b(?:difference\s+between|explain\s+how\s+to\s+defend|security\s+best\s+practices|defensive\s+strategy)\b',
    r'\b(?:in\s+python|tutorial|syntax|beginner-friendly)\b'
]


def detect_security_signals(
    raw_text: str,
    canonical_text: str,
    norm_signals: List[str]
) -> Tuple[List[str], Dict[str, int], bool, bool]:
    """
    Detects targeted prompt injection and obfuscation weaknesses.
    
    Returns:
        signals: List of identified indicator tags
        category_breakdown: Points per category for the RiskEngine
        is_attack_like: Boolean indicating substantive attack indicators
        is_benign_educational: Boolean indicating benign academic/informative context
    """
    signals = list(norm_signals)
    cat_breakdown = {
        "obfuscation": 0,
        "instruction_manipulation": 0,
        "semantic_attack": 0,
        "context_anomaly": 0
    }

    # Evaluate against both raw and canonicalized representations
    eval_text = f"{raw_text} {canonical_text}".lower()

    # 1. Obfuscation scoring from normalization signals
    obfuscation_score = 0
    for s in norm_signals:
        if "BASE64" in s:
            obfuscation_score += 25
        elif "ZERO_WIDTH" in s:
            obfuscation_score += 20
        elif "HOMOGLYPH" in s:
            obfuscation_score += 15
        elif "SPACED_CHARACTER" in s:
            obfuscation_score += 18
        elif "REVERSED" in s:
            obfuscation_score += 20
        elif "DELIMITER" in s:
            obfuscation_score += 10

    cat_breakdown["obfuscation"] = min(25, obfuscation_score)

    # 2. Instruction Smuggling & Boundaries (0-25)
    instruction_score = 0
    for pattern in INSTRUCTION_SMUGGLING_PATTERNS:
        if re.search(pattern, raw_text, re.IGNORECASE) or re.search(pattern, canonical_text, re.IGNORECASE):
            signals.append(f"INSTRUCTION_SMUGGLING_BOUNDARY_VIOLATION:{pattern[:25]}")
            instruction_score += 20

    if re.search(r'```(?:json|xml|markdown)?\s*\{.*"instruction".*\}', eval_text, re.DOTALL):
        signals.append("NESTED_STRUCTURED_PAYLOAD")
        instruction_score += 15

    cat_breakdown["instruction_manipulation"] = min(25, instruction_score)

    # 3. Semantic Attack: Direct Overrides, Role Manipulation, Extraction (0-25)
    semantic_score = 0
    for pattern in DIRECT_OVERRIDE_PATTERNS:
        if re.search(pattern, eval_text):
            signals.append("DIRECT_INSTRUCTION_OVERRIDE_DETECTED")
            semantic_score += 25
            cat_breakdown["instruction_manipulation"] = min(25, cat_breakdown["instruction_manipulation"] + 20)
            break


    for pattern in ROLE_MANIPULATION_PATTERNS:
        if re.search(pattern, eval_text):
            signals.append("ROLE_MANIPULATION_ATTEMPT")
            semantic_score += 20
            break

    for pattern in PROMPT_EXTRACTION_PATTERNS:
        if re.search(pattern, eval_text):
            signals.append("PROMPT_LEAKAGE_EXTRACTION_PROBE")
            semantic_score += 20
            break

    cat_breakdown["semantic_attack"] = min(25, semantic_score)

    # 4. Context anomaly & Payload splitting
    context_score = 0
    if len(raw_text) > 2000:
        signals.append("ANOMALOUS_LONG_PROMPT")
        context_score += 5
    if re.search(r'\bpart\s+\d+/\d+\b|\[\s*payload\s*part\s*\]', eval_text):
        signals.append("PAYLOAD_SPLITTING_FRAGMENT_MARKER")
        context_score += 10

    cat_breakdown["context_anomaly"] = min(10, context_score)

    # 5. Benign Educational / Academic Context Check (preserve benign utility)
    is_benign_educational = False
    for pat in BENIGN_ACADEMIC_INDICATORS:
        if re.search(pat, raw_text, re.IGNORECASE):
            is_benign_educational = True
            signals.append("BENIGN_EDUCATIONAL_CONTEXT_DETECTED")
            break

    # Attack-like determination
    is_attack_like = (
        cat_breakdown["semantic_attack"] >= 20 or
        cat_breakdown["instruction_manipulation"] >= 20 or
        (cat_breakdown["obfuscation"] >= 18 and (cat_breakdown["semantic_attack"] > 0 or "BASE64" in " ".join(signals)))
    )

    return list(set(signals)), cat_breakdown, is_attack_like, is_benign_educational
