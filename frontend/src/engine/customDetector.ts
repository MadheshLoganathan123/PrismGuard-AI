import type { NormalizationResult } from './normalizer';

export interface DetectorSignals {
  obfuscation_points: number;
  instruction_points: number;
  semantic_points: number;
  signals: string[];
}

export function detectCustomWeakness(norm: NormalizationResult): DetectorSignals {
  const signals: string[] = [];
  let obfuscation_points = 0;
  let instruction_points = 0;
  let semantic_points = 0;

  const textToScan = norm.canonical.toLowerCase();
  const rawText = norm.raw.toLowerCase();

  // 1. Obfuscation detection
  if (norm.has_base64) {
    obfuscation_points += 25;
    signals.push('base64_encoded_payload');
  }
  if (norm.stripped_zero_width_count > 0) {
    obfuscation_points += 20;
    signals.push('zero_width_obfuscation');
  }
  if (norm.detected_transforms.length > 2) {
    obfuscation_points += 10;
    signals.push('multiple_transformations_detected');
  }

  // 2. Delimiter & Nested Instruction Boundaries
  const delimiterPatterns = [
    /---\s*end of user input\s*---/i,
    /system\s*:/i,
    /assistant\s*:/i,
    /<\|im_start\|>/i,
    /\[system\]/i,
    /user confirmed admin/i
  ];
  for (const pattern of delimiterPatterns) {
    if (pattern.test(rawText) || pattern.test(textToScan)) {
      instruction_points += 25;
      signals.push('nested_instruction_override');
      break;
    }
  }

  // 3. Semantic Attack keywords
  const attackKeywords = [
    'ignore all previous',
    'disregard all previous',
    'disregard preceding',
    'override system',
    'debugmodegpt',
    'output the word pwned',
    'reveal system prompt',
    'system_config',
    'print debug keys'
  ];

  let hasAttackKw = false;
  for (const kw of attackKeywords) {
    if (textToScan.includes(kw)) {
      semantic_points += 25;
      signals.push('direct_override_pattern');
      hasAttackKw = true;
      break;
    }
  }

  // Benign Context Safeguard
  const benignKeywords = ['syllabus', 'cybersecurity class', 'explain how', 'caching', 'parameterized queries', 'etag'];
  const isEducational = benignKeywords.some(b => textToScan.includes(b));
  if (isEducational && !hasAttackKw) {
    signals.push('benign_context_validated');
    semantic_points = Math.max(0, semantic_points - 15);
  }

  return {
    obfuscation_points: Math.min(25, obfuscation_points),
    instruction_points: Math.min(25, instruction_points),
    semantic_points: Math.min(25, semantic_points),
    signals
  };
}
