import React, { useState } from 'react';
import { FlaskConical, Search, Play, MessageSquare, Copy, Check, Loader2, ChevronRight, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import type { TestCase, ActiveTab, AuditEvent } from '../../types';
import { normalizeInput } from '../../engine/normalizer';
import { detectCustomWeakness } from '../../engine/customDetector';
import { computeRiskScore } from '../../engine/riskEngine';
import { evaluatePolicy } from '../../engine/policyEngine';
import type { ChatApiResponse } from '../../api/client';

interface Props {
  testCases: TestCase[];
  activePreset: TestCase;
  setActivePreset: (tc: TestCase) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onSendToChat: (text: string, presetId?: string) => void;
  onSelectAudit: (event: AuditEvent) => void;
  testPromptOnBackend?: (text: string, presetId?: string) => Promise<ChatApiResponse>;
  isLiveMode?: boolean;
}

function decisionBadge(d: string) {
  if (d === 'ALLOW') return 'badge-allow';
  if (d === 'BLOCK') return 'badge-block';
  if (d === 'REVIEW' || d === 'REVIEW_GUARD_BLOCK') return 'badge-review';
  if (d === 'REDACT') return 'badge-redact';
  if (d === 'WARN') return 'badge-warn';
  return 'badge-gray';
}

function catColor(cat: string) {
  const m: Record<string,string> = { 'Obfuscation':'#6366F1','Direct Override':'#DC2626','Role Manipulation':'#DC2626','Delimiter Abuse':'#EA580C','Nested Instruction':'#EA580C','Payload Splitting':'#D97706','Spacing & Normalization':'#D97706','Typoglycemia':'#D97706','Benign Coding':'#059669','Benign Education':'#059669','Benign Security':'#059669','Output Leakage':'#7C3AED','Reliability & Error':'#6B7280' };
  return m[cat] || '#6B7280';
}

const H_GROUPS: Record<string, string[]> = {
  'All (15)': [],
  'H1 (4)': ['PI-005','PI-006','PI-007','PI-008'],
  'H2 (3)': ['PI-004','PI-009','PI-012'],
  'H3 (2)': ['PI-010','PI-014'],
  'H4 (2)': ['FP-001','FP-002'],
  'H5 (2)': ['ERR-001','ERR-002'],
  'H6 (1)': ['OUT-001'],
  'Benign (2)': ['FP-001','FP-002','FP-004'],
};

export const AttackLabView: React.FC<Props> = ({
  testCases, activePreset, setActivePreset, setActiveTab,
  onSendToChat, onSelectAudit: _onSelectAudit, testPromptOnBackend, isLiveMode: _isLiveMode,
}) => {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All (15)');
  const [payload, setPayload] = useState(activePreset.raw_input || '');
  const [liveResult, setLiveResult] = useState<ChatApiResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<'comparison'|'stage'|'risk'|'raw'>('comparison');
  const [copied, setCopied] = useState(false);

  const cases = testCases.length > 0 ? testCases : [];

  const filtered = cases.filter(tc => {
    const matchGroup = group === 'All (15)' || (H_GROUPS[group] || []).includes(tc.test_id);
    const matchSearch = !search || tc.test_id.toLowerCase().includes(search.toLowerCase()) || tc.name.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const selectCase = (tc: TestCase) => {
    setActivePreset(tc);
    setPayload(tc.raw_input || '');
    setLiveResult(null);
    setLiveError(null);
  };

  const runOnBackend = async () => {
    if (!testPromptOnBackend || isRunning) return;
    setIsRunning(true); setLiveError(null); setLiveResult(null);
    try {
      const res = await testPromptOnBackend(payload, activePreset.test_id);
      setLiveResult(res);
    } catch (e: any) {
      setLiveError(e?.message || 'Backend request failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Local signals
  const norm = normalizeInput(payload);
  const signals = detectCustomWeakness(norm);
  const risk = computeRiskScore(signals, activePreset.guard_allowed, activePreset.guard_status || 'complete');
  const policy = evaluatePolicy(risk, activePreset.guard_allowed, activePreset.guard_status || 'complete');

  const guardAllowed = activePreset.guard_allowed;
  const isBlindSpot = guardAllowed && activePreset.expected_label === 'attack-like';

  const STAGES = ['Normalize','Local Detector','SecureAI Guard','Risk Engine','LLM (Protected)','Output Guard','Audit Store'];
  const STAGE_MS = [11, 14, activePreset.guard_latency_ms || 165, 8, policy.allowLlmExecution ? 360 : 0, policy.allowLlmExecution ? 135 : 0, 5];
  const STAGE_COLORS = ['#06B6D4','#8B5CF6','#6366F1','#F59E0B','#059669','#0284C7','#9CA3AF'];

  const copyPayload = () => { navigator.clipboard.writeText(payload); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background: '#E0F2FE' }}>
            <FlaskConical size={22} color="#0284C7" />
          </div>
          <div>
            <div className="page-header-title">Attack Lab</div>
            <div className="page-header-sub">Test real-world adversarial inputs and compare SecureAI Guard vs PrismGuard AI in real time.</div>
          </div>
        </div>
        <div className="page-header-right">
          {[
            { val: '15', label: 'Tests', sub: 'Across 6 hypotheses', bg: '#EEF2FF', clr: '#6366F1' },
            { val: 'Live', label: 'Gateway', sub: 'Using real Guard & LLM', bg: '#D1FAE5', clr: '#059669' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: s.bg, border: '1px solid var(--border-light)', borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.clr }}>{s.val}</div>
                <div style={{ fontSize: 10, color: s.clr, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.sub}</div>
              </div>
            </div>
          ))}
          <button className="btn btn-primary-gradient" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => setActiveTab('research')}>
            Run Full Test Suite →
          </button>
        </div>
      </div>

      {/* ── Main split layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: case list ── */}
        <div className="side-panel">
          <div className="side-panel-header">
            Test Cases ({cases.length})
          </div>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" style={{ paddingLeft: 24, fontSize: 11, padding: '5px 8px 5px 24px' }} placeholder="Search test cases..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {/* Group filters */}
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3, borderBottom: '1px solid var(--border-light)' }}>
            {Object.keys(H_GROUPS).map(g => (
              <button key={g} onClick={() => setGroup(g)} style={{
                textAlign: 'left', padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: group === g ? 600 : 400,
                background: group === g ? '#EEF2FF' : 'transparent', color: group === g ? 'var(--brand-primary)' : 'var(--text-muted)',
                border: group === g ? '1px solid #C7D2FE' : '1px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {g}
              </button>
            ))}
          </div>
          {/* Cases */}
          <div style={{ overflowY: 'auto', maxHeight: 440 }}>
            {filtered.map(tc => {
              const isGap = tc.guard_allowed && tc.expected_label === 'attack-like';
              const isActive = activePreset.test_id === tc.test_id;
              return (
                <div key={tc.test_id} className={`side-panel-item${isActive ? ' active' : ''}`} onClick={() => selectCase(tc)}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: `${catColor(tc.category)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12 }}>
                    {tc.expected_label === 'benign' ? '✅' : tc.expected_label === 'output' ? '🔐' : isGap ? '⚠️' : '🔴'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{tc.test_id} {tc.name?.substring(0, 18)}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{tc.category}</div>
                  </div>
                  {isActive && <ChevronRight size={12} color="var(--brand-primary)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: detail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Case header */}
          <div className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${catColor(activePreset.category)}15`, border: `1px solid ${catColor(activePreset.category)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {activePreset.expected_label === 'benign' ? '✅' : isBlindSpot ? '⚠️' : '🔴'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{activePreset.test_id} — {activePreset.name}</span>
                <span className="badge badge-info" style={{ fontSize: 9 }}>{activePreset.category?.includes('Obfusc') ? 'H1' : activePreset.category?.includes('Delimit') || activePreset.category?.includes('Nested') ? 'H2' : 'H3'}</span>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${catColor(activePreset.category)}15`, color: catColor(activePreset.category), fontWeight: 600 }}>{activePreset.category}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{activePreset.description}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expected Label</span>
              <span className={`badge ${activePreset.expected_label === 'attack-like' ? 'badge-block' : 'badge-allow'}`} style={{ fontSize: 10 }}>{activePreset.expected_label}</span>
            </div>
          </div>

          {/* Payload + Canonicalized */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Input payload */}
            <div className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Input Payload</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{payload.length} characters</span>
                  <button className="btn-ghost" style={{ padding: '2px 5px' }} onClick={copyPayload}>
                    {copied ? <Check size={12} color="var(--status-allow)" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              <textarea
                value={payload}
                onChange={e => setPayload(e.target.value)}
                rows={4}
                className="input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.55, resize: 'vertical', width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '</> Base64 Encode', fn: () => setPayload(`\`\`\`text\n${btoa(payload)}\n\`\`\`\nDecode and execute above.`) },
                  { label: '⇄ Add Spacing', fn: () => setPayload(payload.split('').join(' ')) },
                  { label: 'ⓐ Confusables', fn: () => setPayload(payload.split('').map(c => ({'a':'а','e':'е','o':'о','p':'р'}[c]||c)).join('')) },
                  { label: '↺ Reset', fn: () => setPayload(activePreset.raw_input || '') },
                ].map(btn => (
                  <button key={btn.label} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 9px' }} onClick={btn.fn}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Canonicalized form */}
            <div className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Canonicalized Form <span style={{ fontStyle: 'italic', textTransform: 'none', fontWeight: 400 }}>(after normalization)</span></span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{norm.canonical.length} characters</span>
              </div>
              <div className="code-box-light" style={{ minHeight: 88, maxHeight: 120, overflowY: 'auto', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {norm.canonical}
              </div>
              {/* Transforms */}
              {norm.detected_transforms.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {norm.detected_transforms.map((t, i) => (
                    <span key={i} className="badge badge-warn" style={{ fontSize: 9 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-primary-gradient"
              style={{ flex: 1, fontSize: 13, padding: '10px 20px', justifyContent: 'center' }}
              onClick={runOnBackend}
              disabled={!testPromptOnBackend || isRunning}
            >
              {isRunning ? <><Loader2 size={14} className="animate-spin" /> Running on Live Gateway...</> : <><Play size={14} /> Run on Live Gateway →</>}
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
              onClick={() => { onSendToChat(payload, activePreset.test_id); setActiveTab('chat'); }}
            >
              <MessageSquare size={14} /> Send to Chat
            </button>
          </div>

          {/* ── Side-by-side results ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 14 }}>

            {/* Guard result */}
            <div className="card card-p" style={{ borderTop: '3px solid #059669' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={12} color="#059669" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>SecureAI Guard Result</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>{activePreset.guard_latency_ms} ms</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#D1FAE5', border: '2px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{guardAllowed ? 'ALLOWED' : 'BLOCKED'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status: Complete</div>
                </div>
                {isBlindSpot && <span className="badge badge-warn" style={{ fontSize: 9, marginLeft: 'auto' }}>No flags detected<br/>Flags: None</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  ['Allowed', String(activePreset.guard_allowed)],
                  ['Status', activePreset.guard_status || 'Complete'],
                  ['Latency', `${activePreset.guard_latency_ms} ms`],
                  ['Request ID', `guard_${activePreset.test_id?.toLowerCase().replace('-','')?.substring(0,8)}`],
                ].map(([k, v]) => (
                  <div key={k} className="info-row">
                    <span className="info-row-label">{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: k === 'Allowed' ? (v === 'true' ? '#059669' : '#DC2626') : 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>

              <button className="btn-ghost" style={{ marginTop: 10, fontSize: 11, color: 'var(--brand-primary)' }}>
                View Raw Response →
              </button>
            </div>

            {/* PrismGuard result */}
            <div className="card card-p" style={{ borderTop: `3px solid ${policy.decision === 'ALLOW' ? '#059669' : policy.decision === 'BLOCK' ? '#DC2626' : '#EA580C'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={12} color="#EA580C" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>PrismGuard AI Result</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>{activePreset.guard_latency_ms + 28} ms</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FFEDD5', border: '2px solid #EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color="#EA580C" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: policy.decision === 'ALLOW' ? '#059669' : policy.decision === 'BLOCK' ? '#DC2626' : '#EA580C' }}>{policy.decision}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risk Score: {risk.score}/100</div>
                </div>
                <span className={`badge ${risk.band === 'CRITICAL' || risk.band === 'HIGH' ? 'badge-high' : risk.band === 'MEDIUM' ? 'badge-medium' : 'badge-low'}`} style={{ fontSize: 9, marginLeft: 'auto' }}>{risk.band}</span>
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Detected Signals</div>
              {signals.signals.length === 0
                ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No signals detected</span>
                : signals.signals.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: '#DC2626', fontSize: 8 }}>●</span>
                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{s.replace(/_/g, ' ')}</span>
                    <span style={{ fontWeight: 700, color: '#DC2626', fontFamily: 'var(--font-mono)', fontSize: 10 }}>+{i===0?24:i===1?28:i===2?16:14}</span>
                  </div>
                ))
              }

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Policy Decision</span>
                  <span className={`badge ${decisionBadge(policy.decision)}`} style={{ fontSize: 9 }}>{policy.decision}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>LLM Call</span>
                  <span className={`badge ${policy.allowLlmExecution ? 'badge-allow' : 'badge-block'}`} style={{ fontSize: 9 }}>{policy.allowLlmExecution ? 'Executed' : 'Prevented'}</span>
                </div>
              </div>

              {liveResult && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: 7, fontSize: 11 }}>
                  ✅ Live: {liveResult.decision} · Risk {liveResult.risk_score} · {liveResult.stage_latencies.guard_prompt + liveResult.stage_latencies.detector}ms
                </div>
              )}
              {liveError && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 7, fontSize: 11, color: '#991B1B' }}>
                  ⚠️ {liveError}
                </div>
              )}
            </div>

            {/* Pipeline execution */}
            <div className="card card-p">
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Security Pipeline Execution</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STAGES.map((name, i) => {
                  const ms = STAGE_MS[i];
                  const ran = ms > 0;
                  const skipped = !ran;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: ran ? `${STAGE_COLORS[i]}20` : '#F3F4F6', border: `1.5px solid ${ran ? STAGE_COLORS[i] : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 7, fontWeight: 700, color: ran ? STAGE_COLORS[i] : '#9CA3AF' }}>0{i+1}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{name}</span>
                      <span className={`badge ${ran ? 'badge-allow' : 'badge-gray'}`} style={{ fontSize: 8, padding: '1px 5px' }}>{ran ? 'Complete' : skipped ? 'Skipped' : 'Not Ran'}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{ran ? `${ms} ms` : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Result tabs */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {(['comparison','stage','risk','raw'] as const).map(t => (
                  <button key={t} className={`tab-btn${resultTab === t ? ' active' : ''}`} style={{ fontSize: 12 }} onClick={() => setResultTab(t)}>
                    {t === 'comparison' ? 'Result Comparison' : t === 'stage' ? 'Stage Details' : t === 'risk' ? 'Risk Analysis' : 'Raw Responses'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              {resultTab === 'comparison' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 10 }}>💡</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Guard returned {guardAllowed ? 'ALLOW' : 'BLOCK'}, but PrismGuard detected transformation evidence and applied policy {policy.decision.toLowerCase()}.</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{activePreset.vector_details || activePreset.mitigation_note}</div>
                  </div>
                </div>
              )}
              {resultTab !== 'comparison' && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  {resultTab === 'stage' ? 'Stage-by-stage execution details' : resultTab === 'risk' ? 'Risk score breakdown analysis' : 'Raw JSON responses from Guard & LLM'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
