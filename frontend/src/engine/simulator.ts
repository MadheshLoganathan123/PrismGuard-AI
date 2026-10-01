import type { AuditEvent, ChatMessage, DecisionType } from '../types';
import { normalizeInput } from './normalizer';
import { detectCustomWeakness } from './customDetector';
import { computeRiskScore } from './riskEngine';
import { evaluatePolicy } from './policyEngine';
import { TEST_CASES } from '../data/testCases';

// Simple SHA-256 simulator for demo browser consistency
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback if crypto.subtle is not accessible
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  }
}

export interface PipelineSimulationResult {
  message: ChatMessage;
  auditEvent: AuditEvent;
}

export async function runSecurityPipeline(
  input: string,
  forcedTestCaseId?: string
): Promise<PipelineSimulationResult> {
  const start = performance.now();
  const inputHash = await sha256(input);
  const reqId = 'gw_' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const timestampStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  // 1. Stage 1: Input Normalization
  const tNormStart = performance.now();
  const normResult = normalizeInput(input);
  const tNorm = Math.round(performance.now() - tNormStart + 10);

  // 2. Stage 2: Custom Detector
  const tDetStart = performance.now();
  const detectorSignals = detectCustomWeakness(normResult);
  const tDet = Math.round(performance.now() - tDetStart + 14);

  // 3. Stage 3: SecureAI Guard Prompt Check
  // Check if matching a known test case
  let matchedTest = TEST_CASES.find(tc => tc.test_id === forcedTestCaseId);
  if (!matchedTest) {
    matchedTest = TEST_CASES.find(tc => 
      input.toLowerCase().includes(tc.name.toLowerCase()) || 
      (tc.raw_input.length > 20 && input.includes(tc.raw_input.substring(0, 20)))
    );
  }

  let guardAllowed = true;
  let guardStatus: 'complete' | 'partial' | 'error' = 'complete';
  let guardLatency = 160 + Math.floor(Math.random() * 40);

  if (matchedTest) {
    guardAllowed = matchedTest.guard_allowed;
    guardStatus = matchedTest.guard_status;
    guardLatency = matchedTest.guard_latency_ms;
  } else {
    // Infer simulated Guard response based on surface strings
    const lowerRaw = input.toLowerCase();
    if (lowerRaw.includes('disregard') || lowerRaw.includes('pwned') || lowerRaw.includes('debugmodegpt')) {
      guardAllowed = false;
    } else {
      guardAllowed = true;
    }
  }

  // 4. Stage 4: Risk Scoring Engine
  const tRiskStart = performance.now();
  const riskEval = computeRiskScore(detectorSignals, guardAllowed, guardStatus);
  const tRisk = Math.round(performance.now() - tRiskStart + 6);

  // 5. Stage 5: Policy Engine
  const tPolStart = performance.now();
  const policyResult = evaluatePolicy(riskEval, guardAllowed, guardStatus);
  const tPol = Math.round(performance.now() - tPolStart + 4);

  // 6. Stage 6: LLM & Output Protection
  let tLlm = 0;
  let tRespGuard = 0;
  let responseText = '';
  let finalDecision: DecisionType = policyResult.decision;

  if (policyResult.allowLlmExecution) {
    tLlm = 350 + Math.floor(Math.random() * 80);
    tRespGuard = 130 + Math.floor(Math.random() * 30);

    // Generate context-aware safe reply
    const lower = input.toLowerCase();
    if (lower.includes('caching') || lower.includes('etag')) {
      responseText = `### HTTP Caching & ETag Fundamentals\n\nHTTP caching reduces server load and network bandwidth by storing copies of responses locally.\n\n- **Cache-Control Headers**: Directives like \`max-age=3600\` instruct browsers how long an asset remains fresh.\n- **ETag (Entity Tag)**: A unique fingerprint (e.g. \`ETag: "68c4e-849"\`) representing the exact resource version.\n- **Conditional Revalidation**: When the cache expires, the client sends \`If-None-Match: "68c4e-849"\`. If unchanged, the server returns \`304 Not Modified\` with zero body payload.\n\n\`\`\`python\nimport hashlib\n\ndef generate_etag(content: bytes) -> str:\n    return f'"{hashlib.sha256(content).hexdigest()[:16]}"'\n\`\`\``;
    } else if (lower.includes('authentication') || lower.includes('authorization')) {
      responseText = `### Authentication (AuthN) vs Authorization (AuthZ)\n\nIn secure system architecture, these two concepts form complementary access boundaries:\n\n1. **Authentication (AuthN) — "Who are you?"**\n   - Verifies the identity of the user, client, or service.\n   - **Methods**: Passwords, Multi-Factor Authentication (MFA), biometric scans, OAuth2 OpenID Connect.\n\n2. **Authorization (AuthZ) — "What are you permitted to do?"**\n   - Evaluates whether an authenticated identity has permission to perform a specific action on a protected resource.\n   - **Models**: Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC).\n\n*Note: PrismGuard AI safely allowed this educational query despite security terminology.*`;
    } else if (lower.includes('parameterized') || lower.includes('sql')) {
      responseText = `### Defensive Parameterized Queries\n\nParameterized queries prevent SQL injection by strictly separating executable SQL logic from untrusted user inputs at the database protocol level.\n\n\`\`\`python\n# Safe Parameterized Pattern in psycopg2\ncursor.execute(\n    "SELECT user_id, email FROM accounts WHERE tenant_id = %s AND status = %s;",\n    (tenant_input, 'active')\n)\n\`\`\`\n*The database treats parameters purely as literal scalar values, making SQL interpretation impossible.*`;
    } else {
      responseText = `I have received your request and verified it through the **PrismGuard AI Gateway**.\n\n- Input normalization cleared without transforms.\n- SecureAI Guard prompt screening passed.\n- Model output screened for secret leakage and data exfiltration.\n\nHow else can I assist with your secure development workflow?`;
    }

    // Check for simulated secret token output leakage
    if (lower.includes('secret') || lower.includes('token') || matchedTest?.test_id === 'OUT-001') {
      finalDecision = 'REDACT';
      responseText = `Diagnostic Output:\nConfiguration Loaded: \`ENV=PRODUCTION\`\nAPI_KEY: \`[REDACTED_API_TOKEN_BY_PRISMGUARD]\`\n\n*Notice: PrismGuard Output Analyzer intercepted a synthetic secret token pattern and sanitized the value before release.*`;
    }
  } else {
    // Execution halted safely
    if (policyResult.decision === 'REVIEW_GUARD_BLOCK') {
      responseText = `🛡️ **PrismGuard AI — False-Positive Rescue Notice**\n\nStandalone **SecureAI Guard** flagged this query due to security keywords (\`${guardStatus}\`). However, PrismGuard's local intent analyzer identified valid educational/development context.\n\nYour query has been escalated to our fast-track safety review path to preserve usability without compromising security policies.`;
    } else if (policyResult.decision === 'REVIEW') {
      responseText = `⚠️ **PrismGuard AI — Security Review Triggered**\n\n**Reason**: Nested instruction override / obfuscated transform detected.\n\n- **SecureAI Guard Result**: \`${guardAllowed ? 'ALLOWED (Blind Spot)' : 'BLOCKED'}\`\n- **PrismGuard Local Risk Score**: \`${riskEval.score}/100 (${riskEval.band})\`\n- **Signals**: \`${detectorSignals.signals.join(', ')}\`\n\nThe request was prevented from reaching the LLM to safeguard application guardrails.`;
    } else {
      responseText = `🛑 **PrismGuard AI — Request Terminated at Gateway**\n\nDirect adversarial prompt injection pattern corroborated by dual screening layers.\n\n- **Policy Decision**: \`BLOCK\`\n- **Risk Score**: \`${riskEval.score}/100 (CRITICAL)\`\n- **Audit ID**: \`${reqId}\``;
    }
  }

  const totalLatency = Math.round(performance.now() - start + tNorm + tDet + guardLatency + tRisk + tPol + tLlm + tRespGuard);

  const auditEvent: AuditEvent = {
    id: 'evt-' + Math.floor(1000 + Math.random() * 9000),
    timestamp: timestampStr,
    gateway_request_id: reqId,
    input_sha256: inputHash,
    test_id: matchedTest?.test_id,
    classification: matchedTest?.name || (finalDecision === 'ALLOW' ? 'Benign Query' : 'Suspicious Transformation'),
    risk_score: riskEval.score,
    risk_band: riskEval.band,
    guard_decision: guardStatus === 'partial' ? 'PARTIAL' : (guardAllowed ? 'ALLOWED' : 'BLOCKED'),
    policy_decision: finalDecision,
    total_latency_ms: totalLatency,
    action_taken: policyResult.rationale,
    local_signals: detectorSignals.signals,
    stage_latencies: {
      normalizer: tNorm,
      detector: tDet,
      guard_prompt: guardLatency,
      risk_engine: tRisk,
      policy: tPol,
      llm: tLlm,
      guard_response: tRespGuard,
      audit: 5
    },
    policy_rationale: policyResult.rationale,
    request_summary: input.length > 50 ? input.substring(0, 48) + '...' : input
  };

  const message: ChatMessage = {
    id: 'msg-' + Math.random().toString(36).substring(2, 9),
    sender: 'assistant',
    text: responseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    decision: finalDecision,
    risk_score: riskEval.score,
    risk_band: riskEval.band,
    telemetry: auditEvent
  };

  return { message, auditEvent };
}
