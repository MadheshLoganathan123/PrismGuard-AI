export interface NormalizationResult {
  raw: string;
  canonical: string;
  detected_transforms: string[];
  has_base64: boolean;
  decoded_fragments: string[];
  stripped_zero_width_count: number;
}

export function normalizeInput(input: string): NormalizationResult {
  const transforms: string[] = [];
  let canonical = input.normalize('NFKC');

  // Strip zero-width characters (\u200B, \u200C, \u200D, \uFEFF)
  const zeroWidthRegex = /[\u200B\u200C\u200D\uFEFF]/g;
  const zeroWidthMatches = canonical.match(zeroWidthRegex);
  const stripped_count = zeroWidthMatches ? zeroWidthMatches.length : 0;
  if (stripped_count > 0) {
    canonical = canonical.replace(zeroWidthRegex, '');
    transforms.push(`stripped_${stripped_count}_zero_width_chars`);
  }

  // Detect and bounded decode Base64
  // Look for base64 sequences of at least 16 chars
  const base64Regex = /([A-Za-z0-9+/=]{16,})/g;
  const decoded_fragments: string[] = [];
  let has_base64 = false;

  let match: RegExpExecArray | null;
  while ((match = base64Regex.exec(canonical)) !== null) {
    const candidate = match[1];
    try {
      // Basic check: length multiple of 4 or valid padding
      if (candidate.length % 4 === 0 || candidate.endsWith('=')) {
        const decoded = atob(candidate);
        // Ensure decoded string is mostly printable ASCII
        if (/^[\x20-\x7E\r\n\t]+$/.test(decoded)) {
          decoded_fragments.push(decoded);
          has_base64 = true;
        }
      }
    } catch {
      // not valid base64
    }
  }

  if (has_base64) {
    transforms.push('bounded_base64_decoded');
    // If base64 decoded string contains instruction, append it to canonical text for screening
    canonical = canonical + ' [DECODED_PAYLOAD: ' + decoded_fragments.join(' ') + ']';
  }

  // Collapse excess whitespace
  if (/\s{3,}/.test(canonical)) {
    canonical = canonical.replace(/\s+/g, ' ');
    transforms.push('collapsed_excess_whitespace');
  }

  return {
    raw: input,
    canonical: canonical.trim(),
    detected_transforms: transforms,
    has_base64,
    decoded_fragments,
    stripped_zero_width_count: stripped_count
  };
}
