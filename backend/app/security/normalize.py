import unicodedata
import re
import base64
import binascii
from typing import Tuple, Dict, Any, List


# Homoglyph lookup table for common Latin lookalikes (Cyrillic, Greek, etc.)
HOMOGLYPH_MAP = {
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
    'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w',
    'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I',
    'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T',
    'Υ': 'Y', 'Χ': 'X',
}

# Leetspeak translation table
LEET_MAP = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '@': 'a', '$': 's', '!': 'i'
}

# Zero-width and invisible characters
ZERO_WIDTH_CHARS = {
    '\u200b', '\u200c', '\u200d', '\ufeff', '\u200e', '\u200f',
    '\u202a', '\u202b', '\u202c', '\u202d', '\u202e'
}


def normalize_input(text: str) -> Tuple[str, Dict[str, Any], List[str]]:
    """
    Performs bounded canonicalization and detects obfuscation patterns without
    silently altering legitimate user intent.
    
    Returns:
        canonical_text: normalized version of the text
        metadata: dictionary of metrics and transformations
        signals: list of local detection signal tags
    """
    signals: List[str] = []
    transformations: List[str] = []
    original_len = len(text)

    # 1. Zero-width character inspection and stripping
    has_zero_width = any(c in ZERO_WIDTH_CHARS for c in text)
    if has_zero_width:
        signals.append("OBFUSCATION_ZERO_WIDTH_CHARS")
        transformations.append("strip_zero_width")
        cleaned_chars = [c for c in text if c not in ZERO_WIDTH_CHARS]
        text_no_zw = "".join(cleaned_chars)
    else:
        text_no_zw = text

    # 2. Unicode NFKC Normalization
    nfkc_text = unicodedata.normalize('NFKC', text_no_zw)
    if nfkc_text != text_no_zw:
        signals.append("UNICODE_NORMALIZATION_APPLIED")
        transformations.append("nfkc_normalization")

    # 3. Homoglyph / Confusable detection and mapping
    confusable_count = 0
    mapped_chars = []
    for char in nfkc_text:
        if char in HOMOGLYPH_MAP:
            mapped_chars.append(HOMOGLYPH_MAP[char])
            confusable_count += 1
        else:
            mapped_chars.append(char)
    
    if confusable_count > 0:
        signals.append(f"HOMOGLYPH_CONFUSABLES_DETECTED:{confusable_count}")
        transformations.append("homoglyph_replacement")
    homoglyph_normalized = "".join(mapped_chars)

    # 4. Spaced-out character collapse (e.g. "i g n o r e   p r e v i o u s")
    # Look for sequences of single letters separated by single spaces
    spaced_pattern = re.compile(r'(?:(?<=\s)|^)([a-zA-Z])(?:\s+([a-zA-Z]))+(?=(?:\s|$))')
    collapsed_spaced = homoglyph_normalized
    if spaced_pattern.search(homoglyph_normalized):
        signals.append("SPACED_CHARACTER_OBFUSCATION")
        transformations.append("collapse_spaced_chars")
        collapsed_spaced = re.sub(
            spaced_pattern,
            lambda m: "".join(m.group(0).split()),
            homoglyph_normalized
        )

    # 5. Consecutive whitespace and delimiter collapse
    whitespace_collapsed = re.sub(r'[ \t\r\f\v]+', ' ', collapsed_spaced).strip()
    excessive_delimiters = len(re.findall(r'[-_=*~`#]{4,}', text)) > 0
    if excessive_delimiters:
        signals.append("DELIMITER_ABUSE_WRAPPER")

    # 6. Bounded Base64 Candidate Detection & Decoding
    # Look for base64-like blocks (minimum 16 valid base64 chars)
    b64_candidates = re.findall(r'[A-Za-z0-9+/]{16,}={0,2}', whitespace_collapsed)
    decoded_payloads: List[str] = []
    for candidate in b64_candidates:
        try:
            # Must be valid length or padded
            padded = candidate + "=" * ((4 - len(candidate) % 4) % 4)
            decoded_bytes = base64.b64decode(padded, validate=True)
            # Check if printable ASCII/UTF-8
            decoded_str = decoded_bytes.decode('utf-8', errors='ignore')
            if len(decoded_str) >= 6 and any(c.isalpha() for c in decoded_str):
                signals.append(f"BASE64_ENCODED_PAYLOAD_DETECTED:{candidate[:10]}...")
                transformations.append("base64_decoded")
                decoded_payloads.append(decoded_str)
        except Exception:
            pass

    # 7. Safe Reversible / Reversed text heuristic
    # Check if reversed text contains key injection tokens
    reversed_candidate = whitespace_collapsed[::-1]
    if any(k in reversed_candidate.lower() for k in ["ignore previous", "system prompt", "developer mode"]):
        signals.append("REVERSED_TEXT_OBFUSCATION")
        transformations.append("reversed_text_unwrapped")

    # Final canonical text representation (base normalized)
    canonical = whitespace_collapsed
    if decoded_payloads:
        canonical += f" [DECODED_REPRESENTATION: {' '.join(decoded_payloads)}]"

    metadata = {
        "original_length": original_len,
        "canonical_length": len(canonical),
        "transformations_applied": transformations,
        "confusables_found": confusable_count,
        "base64_payloads_found": len(decoded_payloads),
        "compression_ratio": round(len(canonical) / max(1, original_len), 3)
    }

    return canonical, metadata, signals
