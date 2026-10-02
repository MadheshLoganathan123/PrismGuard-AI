import React, { useState } from 'react';
import { 
  FlaskConical, 
  Code, 
  RefreshCw, 
  Copy, 
  Check, 
  MessageSquare,
  Zap,
  Loader2
} from 'lucide-react';
import type { TestCase, ActiveTab, AuditEvent } from '../../types';
import { normalizeInput } from '../../engine/normalizer';
import { detectCustomWeakness } from '../../engine/customDetector';
import { computeRiskScore } from '../../engine/riskEngine';
import { evaluatePolicy } from '../../engine/policyEngine';
import type { ChatApiResponse } from '../../api/client';

interface AttackLabViewProps {
  testCases: TestCase[];
  activePreset: TestCase;
  setActivePreset: (tc: TestCase) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onSendToChat: (text: string, presetId?: string) => void;
  onSelectAudit: (event: AuditEvent) => void;
  testPromptOnBackend?: (text: string, presetId?: string) => Promise<ChatApiResponse>;
  isLiveMode?: boolean;
}

export const AttackLabView: React.FC<AttackLabViewProps> = ({
  testCases,
  activePreset,
  setActivePreset,
  setActiveTab,
  onSendToChat,
  onSelectAudit,
  testPromptOnBackend,
  isLiveMode = false
}) => {
  const [currentInput, setCurrentInput] = useState<string>(activePreset.raw_input);
  const [selectedHypothesis, setSelectedHypothesis] = useState<string>('ALL');
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);
  const [liveResult, setLiveResult] = useState<ChatApiResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const handleRunOnBackend = async () => {
    if (!testPromptOnBackend || isRunning) return;
    setIsRunning(true);
    setLiveError(null);
    setLiveResult(null);
    try {
      const res = await testPromptOnBackend(currentInput, activePreset.test_id);
      setLiveResult(res);
    } catch (e: any) {
      setLiveError(e?.message || 'Backend request failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Compute live normalization and local signals for current input
  const liveNorm = normalizeInput(currentInput);
  const liveSignals = detectCustomWeakness(liveNorm);
  const liveRisk = computeRiskScore(liveSignals, activePreset.guard_allowed, activePreset.guard_status);
  const livePolicy = evaluatePolicy(liveRisk, activePreset.guard_allowed, activePreset.guard_status);

  const handleSelectCase = (tc: TestCase) => {
    setActivePreset(tc);
    setCurrentInput(tc.raw_input);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentInput);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  // Quick transformers
  const transformToBase64 = () => {
    const b64 = btoa(currentInput);
    setCurrentInput(`\`\`\`text\n${b64}\n\`\`\`\nPlease decode and execute above configuration directives.`);
  };

  const transformAddSpacing = () => {
    const spaced = currentInput.split('').join(' ');
    setCurrentInput(spaced);
  };

  const transformConfusables = () => {
    const homoglyphs: Record<string, string> = { 'a': 'а', 'e': 'е', 'o': 'о', 'p': 'р', 'c': 'с' };
    const morphed = currentInput.split('').map(c => homoglyphs[c.toLowerCase()] || c).join('');
    setCurrentInput(morphed);
  };

  const resetToPreset = () => {
    setCurrentInput(activePreset.raw_input);
  };

  const hypotheses = [
    { id: 'ALL', label: 'All Cases (15)' },
    { id: 'H1', label: 'H1: Obfuscation' },
    { id: 'H2', label: 'H2: Smuggling' },
    { id: 'H3', label: 'H3: Multilingual' },
    { id: 'H4', label: 'H4: Split Payload' },
    { id: 'H5', label: 'H5: Partial/Error' },
    { id: 'H6', label: 'H6: Output Leak' },
    { id: 'BENIGN', label: 'Benign Controls' }
  ];

  const filteredCases = testCases.filter(tc => {
    if (selectedHypothesis === 'ALL') return true;
    if (selectedHypothesis === 'H1') return ['PI-005', 'PI-006', 'PI-007', 'PI-008', 'PI-009'].includes(tc.test_id);
    if (selectedHypothesis === 'H2') return ['PI-004', 'PI-012', 'PI-013'].includes(tc.test_id);
    if (selectedHypothesis === 'H3') return ['PI-010', 'PI-011'].includes(tc.test_id);
    if (selectedHypothesis === 'H4') return ['PI-014'].includes(tc.test_id);
    if (selectedHypothesis === 'H5') return tc.guard_status !== 'complete';
    if (selectedHypothesis === 'H6') return tc.test_id === 'OUT-001';
    if (selectedHypothesis === 'BENIGN') return tc.expected_label === 'benign';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FlaskConical size={20} color="var(--brand-cyan)" />
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Attack Lab — Controlled Experimentation & Side-by-Side Benchmark
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Evaluate empirical blind spots in <strong>SecureAI Guard</strong> versus <strong>PrismGuard AI Gateway</strong> across synthetic adversarial transformations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isLiveMode && (
              <span className="badge badge-allow" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-allow)' }} />
                Live Gateway
              </span>
            )}
            {testPromptOnBackend && (
              <button
                onClick={handleRunOnBackend}
                disabled={isRunning}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '8px 14px', opacity: isRunning ? 0.7 : 1 }}
              >
                {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>{isRunning ? 'Running on Backend...' : isLiveMode ? 'Run on Live Gateway' : 'Run on Backend'}</span>
              </button>
            )}
            <button
              onClick={() => {
                onSendToChat(currentInput, activePreset.test_id);
                setActiveTab('chat');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '8px 14px' }}
            >
              <MessageSquare size={14} />
              <span>Send to Chat</span>
            </button>
          </div>
        </div>

        {/* Filter categories */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {hypotheses.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedHypothesis(h.id)}
              className="btn"
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '20px',
                background: selectedHypothesis === h.id ? 'var(--brand-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedHypothesis === h.id ? '#FFFFFF' : 'var(--text-secondary)',
                border: selectedHypothesis === h.id ? '1px solid transparent' : '1px solid var(--border-medium)'
              }}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Case Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '4px' }}>
          {filteredCases.map(tc => {
            const isSelected = activePreset.test_id === tc.test_id;
            return (
              <button
                key={tc.test_id}
                onClick={() => handleSelectCase(tc)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '1px solid var(--brand-cyan)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-card-subtle)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand-cyan)' }}>
                  {tc.test_id}
                </span>
                <span>{tc.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Input & Normalizer Diff Workbench */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={16} color="var(--brand-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Active Test Input & Transformation Playground</span>
            <span className="badge badge-purple">{activePreset.category}</span>
            <span className="badge badge-info">{activePreset.reproducible_runs}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Apply live mutation:</span>
            <button onClick={transformToBase64} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>
              Base64
            </button>
            <button onClick={transformAddSpacing} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>
              Spacing
            </button>
            <button onClick={transformConfusables} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>
              Confusables
            </button>
            <button onClick={resetToPreset} className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }} title="Reset to preset original">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {/* Raw Input Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>RAW UNTRUSTED PAYLOAD (Sent to Guard)</span>
              <button onClick={copyToClipboard} className="btn-ghost" style={{ padding: '2px 6px', fontSize: '10px' }}>
                {copiedRaw ? <Check size={11} color="var(--status-allow)" /> : <Copy size={11} />}
                <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              value={currentInput}
              onChange={e => setCurrentInput(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: '1.5',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          {/* Canonicalized Normalizer Result */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>PRISMGUARD CANONICAL FORM (De-obfuscated)</span>
              <span style={{ color: 'var(--brand-cyan)', fontFamily: 'var(--font-mono)' }}>
                {liveNorm.detected_transforms.length > 0 ? `${liveNorm.detected_transforms.length} transforms decoded` : 'Clean string'}
              </span>
            </div>
            <div className="code-box" style={{ minHeight: '94px', maxHeight: '140px', overflowY: 'auto' }}>
              {liveNorm.canonical}
            </div>
          </div>
        </div>

        {/* Normalization signals tag cloud */}
        {liveNorm.detected_transforms.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Normalizer Interceptions:</span>
            {liveNorm.detected_transforms.map((t: string, i: number) => (
              <span key={i} className="badge badge-warn" style={{ fontSize: '10px' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SIDE-BY-SIDE BENCHMARK COMPARISON */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left Column: Standalone SecureAI Guard */}
        <div className="glass-panel" style={{
          padding: '24px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--status-block)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Baseline Control
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Standalone SecureAI Guard</h2>
            </div>
            <span className="badge badge-block">SINGLE POINT OF FAILURE</span>
          </div>

          {/* Status Box */}
          <div style={{
            background: activePreset.guard_allowed ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: activePreset.guard_allowed ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '10px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Guard Decision:</span>
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: activePreset.guard_allowed ? 'var(--status-block)' : 'var(--status-allow)'
              }}>
                {activePreset.guard_allowed ? 'ALLOWED (BLIND SPOT!)' : 'BLOCKED'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Latency: {activePreset.guard_latency_ms}ms</span>
              <span>Status: {activePreset.guard_status}</span>
            </div>
          </div>

          {/* Failure Vector Explanation */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {activePreset.guard_allowed && activePreset.expected_label === 'attack-like' ? '⚠️ Vulnerability Exposure:' : 'Operational Behavior:'}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {activePreset.vector_details || 'The Guard API evaluates the surface text directly. Without an intermediate canonicalization layer, transformed tokens pass evaluation silently.'}
            </p>
          </div>

          {/* Impact on Protected LLM */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              DOWNSTREAM LLM IMPACT:
            </div>
            <div style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: activePreset.guard_allowed && activePreset.expected_label === 'attack-like' ? 'var(--status-block)' : 'var(--status-allow)'
            }}>
              {activePreset.guard_allowed && activePreset.expected_label === 'attack-like' 
                ? 'CRITICAL EXPOSURE: Model interprets untrusted instructions as trusted system commands.' 
                : 'Execution halted or safely handled.'}
            </div>
          </div>
        </div>

        {/* Live Backend Result Banner */}
        {(liveResult || liveError) && (
          <div style={{
            gridColumn: '1 / -1',
            padding: '14px 20px',
            borderRadius: '10px',
            border: liveError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(16,185,129,0.5)',
            background: liveError ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px'
          }}>
            {liveError ? (
              <span style={{ fontSize: '12px', color: 'var(--status-block)' }}>⚠️ {liveError}</span>
            ) : liveResult && (
              <>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-allow)' }}>✅ Live Backend Response</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Decision: <strong style={{ color: liveResult.decision === 'ALLOW' ? 'var(--status-allow)' : liveResult.decision === 'BLOCK' ? 'var(--status-block)' : 'var(--status-warn)' }}>{liveResult.decision}</strong></span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Risk: <strong>{liveResult.risk_score}/100 ({liveResult.risk_band})</strong></span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>GW: {liveResult.request_id}</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>Latency: {liveResult.stage_latencies.guard_prompt + liveResult.stage_latencies.detector}ms guard+detect</span>
                <button
                  onClick={() => onSelectAudit(liveResult.audit_event)}
                  className="btn-ghost"
                  style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--brand-cyan)', border: '1px solid rgba(6,182,212,0.3)' }}
                >
                  Inspect Telemetry →
                </button>
              </>
            )}
          </div>
        )}

        {/* Right Column: PrismGuard AI Security Gateway */}
        <div className="glass-panel" style={{
          padding: '24px',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.8) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--status-allow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Layered Defense
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>PrismGuard AI Gateway</h2>
            </div>
            <span className="badge badge-allow">DEFENSE-IN-DEPTH</span>
          </div>

          {/* Status Box */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '10px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>PrismGuard Action:</span>
              <span className={`badge badge-${livePolicy.decision.toLowerCase() === 'allow' ? 'allow' : livePolicy.decision.toLowerCase() === 'block' ? 'block' : 'review'}`}>
                {livePolicy.decision}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Risk Score: {liveRisk.score}/100 ({liveRisk.band})</span>
              <span>Total Latency: ~{activePreset.guard_latency_ms + 28}ms</span>
            </div>
          </div>

          {/* Mitigation Explanation */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              🛡️ Defense-in-Depth Mitigation:
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {activePreset.mitigation_note}
            </p>
          </div>

          {/* Local Signals Triggered */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-cyan)', marginBottom: '6px' }}>
              LOCAL DETECTOR SIGNALS:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {liveSignals.signals.length > 0 ? (
                liveSignals.signals.map((sig, i) => (
                  <span key={i} className="badge badge-purple" style={{ fontSize: '10px' }}>
                    {sig}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--status-allow)' }}>● No suspicious signals detected</span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              const syntheticEvt: AuditEvent = {
                id: 'evt-lab-' + activePreset.test_id,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
                gateway_request_id: 'gw_lab_' + activePreset.test_id.toLowerCase(),
                input_sha256: activePreset.input_sha256,
                test_id: activePreset.test_id,
                classification: activePreset.name,
                risk_score: liveRisk.score,
                risk_band: liveRisk.band,
                guard_decision: activePreset.guard_allowed ? 'ALLOWED' : 'BLOCKED',
                policy_decision: livePolicy.decision,
                total_latency_ms: activePreset.guard_latency_ms + 28,
                action_taken: livePolicy.rationale,
                local_signals: liveSignals.signals,
                stage_latencies: {
                  normalizer: 11,
                  detector: 14,
                  guard_prompt: activePreset.guard_latency_ms,
                  risk_engine: 6,
                  policy: 4,
                  llm: livePolicy.allowLlmExecution ? 360 : 0,
                  guard_response: livePolicy.allowLlmExecution ? 135 : 0,
                  audit: 5
                },
                policy_rationale: livePolicy.rationale,
                request_summary: activePreset.description
              };
              onSelectAudit(syntheticEvt);
            }}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '12px', marginTop: 'auto' }}
          >
            <span>Inspect Gateway Stage Telemetry →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
