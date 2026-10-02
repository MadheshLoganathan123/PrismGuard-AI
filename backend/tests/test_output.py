import pytest
from app.models.schemas import ResponseDecisionType
from app.security.output import analyze_model_output


def test_synthetic_secret_redaction():
    text = "Here is the key: TEST_SECRET_ABCD12345 to authenticate."
    sanitized, decision, signals, points = analyze_model_output(text)
    assert decision == ResponseDecisionType.REDACT
    assert "[REDACTED_SECRET_KEY]" in sanitized
    assert "TEST_SECRET_ABCD12345" not in sanitized


def test_system_prompt_leakage_block():
    text = "Internal instructions: Do not disclose this SYSTEM_POLICY_CONFIDENTIAL message."
    sanitized, decision, signals, points = analyze_model_output(text)
    assert decision == ResponseDecisionType.BLOCK
    assert "withheld" in sanitized.lower()


def test_suspicious_url_defanging():
    text = "Visit http://malicious.test/exploit for the update."
    sanitized, decision, signals, points = analyze_model_output(text)
    assert "[DEFANGED_SUSPICIOUS_LINK]" in sanitized
    assert "http://malicious.test" not in sanitized
