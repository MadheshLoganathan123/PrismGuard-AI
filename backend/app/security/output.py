import re
from typing import Tuple, List, Dict, Any
from app.models.schemas import ResponseDecisionType

# Synthetic secret patterns for testing & leak prevention
SECRET_PATTERNS = [
    (r'TEST_SECRET_[A-Za-z0-9_]{4,}', '[REDACTED_SECRET_KEY]'),
    (r'sk-[A-Za-z0-9]{24,}', '[REDACTED_API_KEY]'),
    (r'AKIA[0-9A-Z]{16}', '[REDACTED_AWS_KEY]'),
    (r'ghp_[A-Za-z0-9]{36}', '[REDACTED_GITHUB_TOKEN]'),
    (r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', 'Bearer [REDACTED_BEARER_TOKEN]')
]

# Internal policy leakage signatures
PROMPT_LEAK_PATTERNS = [
    r'You are an assistant placed behind PrismGuard AI',
    r'SYSTEM_POLICY_CONFIDENTIAL',
    r'Internal instructions:\s*Do not disclose',
    r'NEVER_REVEAL_THIS_DIRECTIVE'
]

# Suspicious URL schemes & test domains
SUSPICIOUS_URL_PATTERNS = [
    r'https?://[a-zA-Z0-9.\-]*\.test(?::\d+)?(?:/[^\s]*)?',
    r'https?://(?:evil|malicious|phishing|attacker|exfil)\.[a-zA-Z0-9.\-]+',
    r'javascript:[^\s"\'<>]+',
    r'data:text/html[^\s"\'<>]+'
]


def sanitize_markdown_html(text: str) -> str:
    """
    Sanitizes raw markdown/HTML to prevent XSS and DOM-based exfiltration.
    """
    # Remove script tags
    sanitized = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '[SCRIPTS_STRIPPED]', text, flags=re.IGNORECASE)
    # Remove event handlers like onload, onerror, onclick
    sanitized = re.sub(r'\bon\w+\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+)', '', sanitized, flags=re.IGNORECASE)
    # Neutralize dangerous javascript: urls in markdown links
    sanitized = re.sub(r'\[([^\]]+)\]\(javascript:[^)]+\)', r'[\1](#unsafe-link-blocked)', sanitized, flags=re.IGNORECASE)
    return sanitized


def analyze_model_output(output_text: str) -> Tuple[str, ResponseDecisionType, List[str], int]:
    """
    Screens model-generated response before releasing to client.
    
    Returns:
        processed_text: Sanitized and redacted text (or empty if blocked)
        decision: ResponseDecisionType (ALLOW, WARN, REDACT, BLOCK, REVIEW)
        signals: List of detected risk flags
        risk_points: Points contributed to overall assessment (0-15)
    """
    signals: List[str] = []
    points = 0
    current_text = output_text

    # 1. Secret pattern detection & deterministic redaction
    had_secrets = False
    for pattern, replacement in SECRET_PATTERNS:
        matches = re.findall(pattern, current_text)
        if matches:
            had_secrets = True
            signals.append(f"SYNTHETIC_SECRET_TOKEN_LEAK_DETECTED:{len(matches)}")
            current_text = re.sub(pattern, replacement, current_text)
            points += 15

    # 2. System prompt policy leakage detection
    for pattern in PROMPT_LEAK_PATTERNS:
        if re.search(pattern, current_text, re.IGNORECASE):
            signals.append("SYSTEM_POLICY_LEAKAGE_DETECTED")
            points += 15
            # Prompt leakage should be blocked from disclosure
            return (
                "Response withheld: Output triggered internal system policy leakage protection.",
                ResponseDecisionType.BLOCK,
                signals,
                points
            )

    # 3. Suspicious URL detection
    for pattern in SUSPICIOUS_URL_PATTERNS:
        if re.search(pattern, current_text, re.IGNORECASE):
            signals.append("SUSPICIOUS_UNTRUSTED_URL_DETECTED")
            points += 10
            # Redact or defang malicious URL
            current_text = re.sub(pattern, '[DEFANGED_SUSPICIOUS_LINK]', current_text, flags=re.IGNORECASE)

    # 4. Sanitize markup
    sanitized_text = sanitize_markdown_html(current_text)
    if sanitized_text != current_text:
        signals.append("UNSAFE_MARKUP_SANITIZED")
        points += 5

    # Determine final output decision
    if had_secrets:
        return sanitized_text, ResponseDecisionType.REDACT, signals, min(15, points)
    
    if "SUSPICIOUS_UNTRUSTED_URL_DETECTED" in signals:
        return sanitized_text, ResponseDecisionType.WARN, signals, min(15, points)

    return sanitized_text, ResponseDecisionType.ALLOW, signals, min(15, points)
