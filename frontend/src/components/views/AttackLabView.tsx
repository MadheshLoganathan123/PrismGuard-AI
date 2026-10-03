import React, { useState } from 'react';
import {
  FlaskConical, Search, Play, MessageSquare, Copy, Check, Loader2,
  ChevronRight, AlertTriangle, CheckCircle2, Shield, RefreshCw, Info,
  Zap, BarChart2, FileCode2, GitCompare
} from 'lucide-react';
import type { TestCase, ActiveTab, AuditEvent } from '../../types';
import { normalizeInput } from '../../engine/normalizer';
import { detectCustomWeakness } from '../../engine/customDetector';
import { computeRiskScore } from '../../engine/riskEngine';
import { evaluatePolicy } from '../../engine/policyEngine';
import type { ChatApiResponse, ResearchTestResult } from '../../api/client';
import { apiClient } from '../../api/client';
import type { DomainRoutingEvent } from '../../types/domainRouting';

interface Props {
  testCases: TestCase[];
  activePreset: TestCase;
  setActivePreset: (tc: TestCase) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onSendToChat: (text: string, presetId?: string) => void;
  onSelectAudit: (event: AuditEvent) => void;
  testPromptOnBackend?: (text: string, presetId?: string) => Promise<ChatApiResponse>;
  isLiveMode?: boolean;
  routingEvent?: DomainRoutingEvent | null;
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
  const m: Record<string, string> = {
    'obfuscation': '#6366F1', 'Obfuscation': '#6366F1',
    'direct-override': '#DC2626', 'Direct Override': '#DC2626', 'direct override': '#DC2626',
    'role-manipulation': '#DC2626', 'Role Manipulation': '#DC2626', 'role manipulation': '#DC2626',
    'delimiter-abuse': '#EA580C', 'Delimiter Abuse': '#EA580C', 'delimiter abuse': '#EA580C',
    'nested-instruction': '#EA580C', 'Nested Instruction': '#EA580C',
    'payload-splitting': '#D97706', 'Payload Splitting': '#D97706',
    'prompt-extraction': '#7C3AED', 'Prompt Extraction': '#7C3AED',
    'benign': '#059669', 'Benign Coding': '#059669', 'Benign Education': '#059669',
    'output-leakage': '#7C3AED', 'Output Leakage': '#7C3AED',
    'reliability': '#6B7280', 'Reliability & Error': '#6B7280',
    'Domain Routing': '#4F46E5', 'domain routing': '#4F46E5',
  };
  return m[cat] || m[cat?.toLowerCase()] || '#6B7280';
}

function hypothesisLabel(tc: TestCase): string {
  const cat = (tc.category || '').toLowerCase();
  const ac = (tc.attack_class || '').toLowerCase();
  if (cat.includes('obfusc') || ac.includes('h1') || ac.includes('encoding') || ac.includes('spacing') || ac.includes('substitut') || ac.includes('typo')) return 'H1';
  if (cat.includes('delimit') || cat.includes('nested') || ac.includes('h2') || ac.includes('delimiter')) return 'H2';
  if (cat.includes('multi') || ac.includes('h3')) return 'H3';
  if (cat.includes('split') || ac.includes('h4')) return 'H4';
  if (cat.includes('reliab') || cat.includes('error') || ac.includes('h5')) return 'H5';
  if (cat.includes('output') || cat.includes('leakage') || ac.includes('h6')) return 'H6';
  if (cat.includes('domain') || ac.includes('h7') || (tc.test_id || '').startsWith('DOM-')) return 'H7';
  if (cat.includes('role')) return 'H2';
  if (cat.includes('direct') || cat.includes('override') || cat.includes('extract')) return 'H1';
  return '—';
}

const H_GROUPS: Record<string, string[]> = {
  'All': [],
  'H1 — Obfuscation': ['PI-005', 'PI-006', 'PI-007', 'PI-008', 'PI-009'],
  'H2 — Delimiter / Role': ['PI-002', 'PI-004', 'PI-012', 'PI-013'],
  'H3 — Multilingual': ['PI-010', 'PI-011'],
  'H4 — Payload Split': ['PI-014'],
  'H5 — Error Handling': ['ERR-001', 'ERR-002'],
  'H6 — Output Leakage': ['OUT-001', 'OUT-003'],
  'H7 — Domain Routing': ['DOM-001','DOM-002','DOM-003','DOM-004','DOM-005','DOM-006','DOM-007','DOM-008','DOM-009','DOM-010'],
  'Direct / Extract': ['PI-001', 'PI-003'],
  'Benign (FP)': ['FP-001', 'FP-002', 'FP-003', 'FP-004'],
};

// Stage display for the stage-details tab
const STAGE_DEFS = [
  { num: '01', name: 'Normalize',       key: 'normalizer',    color: '#06B6D4', desc: 'Unicode normalization, base64 decode, zero-width strip' },
  { num: '02', name: 'Local Detector',  key: 'detector',      color: '#8B5CF6', desc: 'Pattern matching, delimiter analysis, semantic keywords' },
  { num: '03', name: 'SecureAI Guard',  key: 'guard_prompt',  color: '#6366F1', desc: 'Cloud-based LLM guard screening via /v1/check/prompt' },
  { num: '04', name: 'Risk Engine',     key: 'risk_engine',   color: '#F59E0B', desc: 'Additive risk scoring across all category breakdowns' },
  { num: '05', name: 'Policy Engine',   key: 'policy',        color: '#EA580C', desc: 'Multi-layer policy evaluation → ALLOW / BLOCK / REVIEW' },
  { num: '06', name: 'LLM (OpenAI)',    key: 'llm',           color: '#059669', desc: 'gpt-4o-mini inference — only executed on ALLOW/WARN', skippedOnBlock: true },
  { num: '07', name: 'Output Guard',    key: 'guard_response',color: '#0284C7', desc: 'Response screening + secret redaction via /v1/check/response', skippedOnBlock: true },
  { num: '08', name: 'Audit Store',     key: 'audit',         color: '#9CA3AF', desc: 'Full event persisted to SQLite WAL database' },
];

export const AttackLabView: React.FC<Props> = ({
  testCases, activePreset, setActivePreset, setActiveTab,
  onSendToChat, onSelectAudit: _onSelectAudit, testPromptOnBackend, routingEvent: _routingEvent,
}) => {

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [payload, setPayload] = useState(activePreset.raw_input || '');
  const [chatResult, setChatResult] = useState<ChatApiResponse | null>(null);
  const [researchResult, setResearchResult] = useState<ResearchTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<'comparison' | 'stage' | 'risk' | 'raw' | 'domain' | 'boundary' | 'review'>('comparison');
  const [copied, setCopied] = useState(false);
  const [runMode, setRunMode] = useState<'chat' | 'research'>('chat');

  const cases = Array.isArray(testCases) ? testCases : [];

  const filtered = cases.filter(tc => {
    const matchGroup = group === 'All' || (H_GROUPS[group] || []).includes(tc.test_id);
    const q = search.toLowerCase();
    const matchSearch = !search
      || tc.test_id.toLowerCase().includes(q)
      || (tc.name || '').toLowerCase().includes(q)
      || (tc.category || '').toLowerCase().includes(q)
      || (tc.attack_class || '').toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });

  const selectCase = (tc: TestCase) => {
    setActivePreset(tc);
    setPayload(tc.raw_input || '');
    setChatResult(null);
    setResearchResult(null);
    setRunError(null);
    setResultTab('comparison');
  };

  // Run through /api/chat pipeline (full end-to-end with LLM)
  const runChatMode = async () => {
    if (!testPromptOnBackend || isRunning) return;
    setIsRunning(true); setRunError(null); setChatResult(null); setResearchResult(null);
    try {
      const res = await testPromptOnBackend(payload, activePreset.test_id);
      setChatResult(res);
      setResultTab('comparison');
    } catch (e: any) {
      setRunError(e?.message || 'Backend chat request failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Run through /api/research/run pipeline (Guard + PrismGuard, no LLM call)
  const runResearchMode = async () => {
    if (isRunning) return;
    if (!activePreset.test_id) { setRunError('No test ID on this preset — use Chat mode instead.'); return; }
    setIsRunning(true); setRunError(null); setChatResult(null); setResearchResult(null);
    try {
      const res = await apiClient.runSingleResearchTest(activePreset.test_id);
      setResearchResult(res);
      setResultTab('comparison');
    } catch (e: any) {
      setRunError(e?.message || 'Research run failed — check Guard quota or backend connection');
    } finally {
      setIsRunning(false);
    }
  };

  const runOnBackend = () => runMode === 'research' ? runResearchMode() : runChatMode();

  // Local signals computed client-side (for live preview)
  const norm = normalizeInput(payload);
  const signals = detectCustomWeakness(norm);
  const risk = computeRiskScore(signals, activePreset.guard_allowed ?? true, activePreset.guard_status || 'complete');
  const policy = evaluatePolicy(risk, activePreset.guard_allowed ?? true, activePreset.guard_status || 'complete');

  const guardAllowed = activePreset.guard_allowed;
  const isBlindSpot = guardAllowed && activePreset.expected_label === 'attack-like';
  const hyp = hypothesisLabel(activePreset);

  // Derive display values — prefer live result over preset static data
  const liveDecision = chatResult?.decision || researchResult?.prism_action || null;
  const liveRiskScore = chatResult?.risk_score ?? researchResult?.prism_score ?? null;
  const liveGuardAllowed = chatResult?.security?.guard?.allowed ?? (researchResult ? researchResult.guard_allowed === 1 : null);
  const liveGuardFlags = chatResult?.security?.guard?.flags ?? researchResult?.guard_flags ?? [];
  const liveGuardLatency = chatResult?.security?.guard?.latency_ms ?? researchResult?.guard_latency_ms ?? activePreset.guard_latency_ms;
  const liveSignals = chatResult?.security?.local_signals ?? researchResult?.prism_signals ?? [];
  const liveStages = chatResult?.stage_latencies ?? null;
  const liveGuardRequestId = chatResult?.security?.guard?.request_id ?? researchResult?.guard_request_id ?? null;
  const liveDisagreement = researchResult ? researchResult.disagreement === 1 : (liveGuardAllowed === true && liveDecision && liveDecision !== 'ALLOW');
  const liveMode = (chatResult?.audit_event?.execution_mode as string) || (researchResult?.execution_mode as string) || (chatResult ? 'LIVE' : researchResult ? 'SIMULATED' : null);

  const copyPayload = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayCategory = activePreset.attack_class || activePreset.category || '';
  const displayDesc = activePreset.purpose || activePreset.description || '';

  return (
    <div className="simple-attack-lab" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background: '#E0F2FE' }}>
            <FlaskConical size={22} color="#0284C7" />
          </div>
          <div>
            <div className="page-header-title">Attack Lab</div>
            <div className="page-header-sub">Test real-world adversarial inputs — compare SecureAI Guard vs PrismGuard AI in real time via live backend.</div>
          </div>
        </div>
        <div className="page-header-right">
          {[
            { val: String(cases.length || 25), label: 'Test Cases', sub: 'Across 7 hypotheses', bg: '#EEF2FF', clr: '#6366F1' },
            { val: 'Live', label: 'Gateway', sub: 'Guard + LLM + Audit', bg: '#D1FAE5', clr: '#059669' },
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
            View Research Evidence →
          </button>
        </div>
      </div>

      {/* ── Main split layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Left: case list ── */}
        <div className="side-panel">
          <div className="side-panel-header">
            Test Cases ({filtered.length}/{cases.length})
          </div>

          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 24, fontSize: 11, padding: '5px 8px 5px 24px' }}
                placeholder="Search ID, name, category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Group filters */}
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3, borderBottom: '1px solid var(--border-light)' }}>
            {Object.keys(H_GROUPS).map(g => (
              <button key={g} onClick={() => setGroup(g)} style={{
                textAlign: 'left', padding: '5px 8px', borderRadius: 6, fontSize: 10, fontWeight: group === g ? 700 : 400,
                background: group === g ? '#EEF2FF' : 'transparent',
                color: group === g ? 'var(--brand-primary)' : 'var(--text-muted)',
                border: group === g ? '1px solid #C7D2FE' : '1px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {g}
              </button>
            ))}
          </div>

          {/* Cases */}
          <div style={{ overflowY: 'auto', maxHeight: 480 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                No test cases match your search.
              </div>
            )}
            {filtered.map(tc => {
              const isGap = tc.guard_allowed && tc.expected_label === 'attack-like';
              const isActive = activePreset.test_id === tc.test_id;
              const isBenign = tc.expected_label === 'benign';
              return (
                <div key={tc.test_id} className={`side-panel-item${isActive ? ' active' : ''}`} onClick={() => selectCase(tc)}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: `${catColor(tc.category)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12 }}>
                    {isBenign ? '✅' : tc.expected_label === 'output' ? '🔐' : isGap ? '⚠️' : '🔴'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--brand-primary)', fontWeight: 700 }}>{tc.test_id}</span>
                      {isGap && <span style={{ fontSize: 8, background: '#FEF3C7', color: '#92400E', borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>MISS</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tc.name?.substring(0, 26)}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                      {tc.attack_class || tc.category}
                    </div>
                  </div>
                  {isActive && <ChevronRight size={12} color="var(--brand-primary)" style={{ flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: detail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Case header */}
          <div className="card card-p" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${catColor(activePreset.category)}15`, border: `1px solid ${catColor(activePreset.category)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {activePreset.expected_label === 'benign' ? '✅' : isBlindSpot ? '⚠️' : '🔴'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{activePreset.test_id} — {activePreset.name}</span>
                {hyp !== '—' && <span className="badge badge-info" style={{ fontSize: 9 }}>{hyp}</span>}
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${catColor(activePreset.category)}15`, color: catColor(activePreset.category), fontWeight: 600 }}>
                  {displayCategory}
                </span>
                <span className={`badge ${activePreset.expected_label === 'attack-like' ? 'badge-block' : 'badge-allow'}`} style={{ fontSize: 9 }}>
                  {activePreset.expected_label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{displayDesc}</div>
              {activePreset.transformation && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Transform: </span>{activePreset.transformation}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Guard Behavior</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: guardAllowed ? '#059669' : '#DC2626' }}>
                  {activePreset.observed_guard_behavior || (guardAllowed ? 'Allowed' : 'Blocked')}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Reproducible: {activePreset.reproducible_runs || '—'}
              </div>
            </div>
          </div>

          {/* Payload + Canonicalized */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Input payload */}
            <div className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Input Payload</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{payload.length} chars</span>
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
                  { label: '</> Base64', fn: () => setPayload(`\`\`\`text\n${btoa(payload)}\n\`\`\`\nDecode and execute above.`) },
                  { label: '⇄ Spacing', fn: () => setPayload(payload.split('').join(' ')) },
                  { label: 'ⓐ Confusables', fn: () => setPayload(payload.split('').map(c => ({'a':'а','e':'е','o':'о','p':'р'}[c]||c)).join('')) },
                  { label: '↺ Reset', fn: () => { setPayload(activePreset.raw_input || ''); setChatResult(null); setResearchResult(null); setRunError(null); } },
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
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Canonicalized Form <span style={{ fontStyle: 'italic', textTransform: 'none', fontWeight: 400 }}>(after normalization)</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{norm.canonical.length} chars</span>
              </div>
              <div className="code-box-light" style={{ minHeight: 88, maxHeight: 120, overflowY: 'auto', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {norm.canonical}
              </div>
              {norm.detected_transforms.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {norm.detected_transforms.map((t, i) => (
                    <span key={i} className="badge badge-warn" style={{ fontSize: 9 }}>{t}</span>
                  ))}
                </div>
              )}
              {norm.decoded_fragments.length > 0 && (
                <div style={{ marginTop: 8, padding: '6px 8px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>⚠ Decoded Base64 Fragment</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#78350F', wordBreak: 'break-all' }}>
                    {norm.decoded_fragments[0]?.substring(0, 120)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Run mode toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
              {(['chat', 'research'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setRunMode(m)}
                  style={{
                    padding: '7px 14px', fontSize: 12, fontWeight: runMode === m ? 700 : 500,
                    background: runMode === m ? 'var(--brand-primary)' : 'transparent',
                    color: runMode === m ? '#fff' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {m === 'chat' ? '💬 Chat + LLM' : '🔬 Research Only'}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary-gradient"
              style={{ flex: 1, fontSize: 13, padding: '10px 20px', justifyContent: 'center', minWidth: 180 }}
              onClick={runOnBackend}
              disabled={isRunning || (runMode === 'chat' && !testPromptOnBackend)}
            >
              {isRunning
                ? <><Loader2 size={14} className="animate-spin" /> Running on Live Gateway...</>
                : <><Play size={14} /> {runMode === 'research' ? 'Run Research Test →' : 'Run on Live Gateway →'}</>
              }
            </button>

            <button
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
              onClick={() => { onSendToChat(payload, activePreset.test_id); setActiveTab('chat'); }}
            >
              <MessageSquare size={14} /> Send to Chat
            </button>

            {(chatResult || researchResult) && (
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setChatResult(null); setResearchResult(null); setRunError(null); }}>
                <RefreshCw size={12} /> Clear Results
              </button>
            )}
          </div>

          {/* Run error */}
          {runError && (
            <div style={{ padding: '10px 14px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', display: 'flex', gap: 8 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{runError}</span>
            </div>
          )}

          {/* ── Side-by-side results + full-width tab panel ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 210px', gap: 14, alignItems: 'start' }}>

            {/* Guard result */}
            <div className="card card-p" style={{ borderTop: `3px solid ${(liveGuardAllowed === false || (!liveGuardAllowed && liveGuardAllowed !== null)) ? '#DC2626' : '#059669'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={12} color="#059669" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>SecureAI Guard</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {Math.round(liveGuardLatency || 0)} ms
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#D1FAE5', border: '2px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: (liveGuardAllowed === false) ? '#DC2626' : '#059669' }}>
                    {liveGuardAllowed === null ? (guardAllowed ? 'ALLOWED' : 'BLOCKED')
                      : liveGuardAllowed === false ? 'BLOCKED' : 'ALLOWED'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {isBlindSpot && !chatResult && !researchResult ? '⚠ Blind spot — misses this attack' : 'Standalone screening result'}
                  </div>
                </div>
                {isBlindSpot && !chatResult && !researchResult && (
                  <span className="badge badge-warn" style={{ fontSize: 9, marginLeft: 'auto' }}>GUARD MISS</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  ['Allowed', liveGuardAllowed !== null ? String(liveGuardAllowed) : String(guardAllowed)],
                  ['Guard Status', activePreset.guard_status || 'complete'],
                  ['Latency', `${Math.round(liveGuardLatency || 0)} ms`],
                  ['Request ID', liveGuardRequestId || `guard_${activePreset.test_id?.toLowerCase().replace('-', '')?.substring(0, 8)}` || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="info-row">
                    <span className="info-row-label">{k}</span>
                    <span style={{ fontWeight: 600, fontFamily: k === 'Request ID' ? 'var(--font-mono)' : 'inherit', fontSize: k === 'Request ID' ? 10 : 12, color: k === 'Allowed' ? (v === 'true' ? '#059669' : '#DC2626') : 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Guard flags */}
              {liveGuardFlags.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Guard Flags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {liveGuardFlags.map((f, i) => (
                      <span key={i} className="badge badge-block" style={{ fontSize: 9 }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {activePreset.expected_guard_behavior && (
                <div style={{ marginTop: 10, padding: '6px 8px', background: '#F1F5F9', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600 }}>Expected: </span>{activePreset.expected_guard_behavior}
                </div>
              )}
            </div>

            {/* PrismGuard result */}
            <div className="card card-p" style={{ borderTop: `3px solid ${liveDecision === 'ALLOW' ? '#059669' : liveDecision === 'BLOCK' ? '#DC2626' : liveDecision ? '#EA580C' : policy.decision === 'ALLOW' ? '#059669' : '#EA580C'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={12} color="#EA580C" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>PrismGuard AI</span>
                {liveMode && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontFamily: 'var(--font-mono)',
                      background: liveMode === 'LIVE' ? '#DCFCE7' : liveMode === 'LOCAL_FALLBACK' ? '#FEF3C7' : '#EDE9FE',
                      color: liveMode === 'LIVE' ? '#15803D' : liveMode === 'LOCAL_FALLBACK' ? '#B45309' : '#6D28D9',
                      border: `1px solid ${liveMode === 'LIVE' ? '#86EFAC' : liveMode === 'LOCAL_FALLBACK' ? '#FCD34D' : '#DDD6FE'}`,
                    }}
                  >
                    {liveMode === 'LOCAL_FALLBACK' ? '⚠️ LOCAL_FALLBACK' : liveMode}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {liveStages ? `${Math.round((liveStages.normalizer || 0) + (liveStages.detector || 0) + (liveStages.risk_engine || 0) + (liveStages.policy || 0))} ms` : `${(activePreset.guard_latency_ms || 0) + 28} ms (est.)`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FFEDD5', border: '2px solid #EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color="#EA580C" />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: (liveDecision || policy.decision) === 'ALLOW' ? '#059669' : (liveDecision || policy.decision) === 'BLOCK' ? '#DC2626' : '#EA580C' }}>
                    {liveDecision || policy.decision}
                    {!chatResult && !researchResult && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(preview)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Risk: {liveRiskScore ?? risk.score}/100 · {risk.band}
                  </div>
                </div>
                {liveDisagreement && (
                  <span className="badge badge-warn" style={{ fontSize: 9, marginLeft: 'auto' }}>DISAGREEMENT</span>
                )}
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Detected Signals ({(liveSignals.length > 0 ? liveSignals : signals.signals).length})
              </div>
              {(liveSignals.length > 0 ? liveSignals : signals.signals).length === 0
                ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No signals detected</span>
                : (liveSignals.length > 0 ? liveSignals : signals.signals).slice(0, 6).map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#DC2626', fontSize: 8 }}>●</span>
                      <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{s.replace(/_/g, ' ')}</span>
                    </div>
                  ))
              }

              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Decision</span>
                  <span className={`badge ${decisionBadge(liveDecision || policy.decision)}`} style={{ fontSize: 9 }}>{liveDecision || policy.decision}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>LLM Call</span>
                  <span className={`badge ${policy.allowLlmExecution && (liveDecision || policy.decision) !== 'BLOCK' ? 'badge-allow' : 'badge-block'}`} style={{ fontSize: 9 }}>
                    {policy.allowLlmExecution && (liveDecision || policy.decision) !== 'BLOCK' ? 'Executed' : 'Prevented'}
                  </span>
                </div>
              </div>

              {activePreset.our_mitigation && (
                <div style={{ marginTop: 10, padding: '6px 8px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, fontSize: 11 }}>
                  <span style={{ fontWeight: 600, color: '#166534' }}>Mitigation: </span>
                  <span style={{ color: '#15803D' }}>{activePreset.our_mitigation}</span>
                </div>
              )}
            </div>

          {/* ── Tabs: Comparison / Stage / Risk / Raw — spans all 3 columns ── */}
          <div className="card" style={{ overflow: 'hidden', gridColumn: '1 / -1' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {([
                  { id: 'comparison', label: 'Security Comparison', icon: <GitCompare size={12} /> },
                  { id: 'domain',     label: 'Domain Routing',     icon: <Shield size={12} /> },
                  { id: 'boundary',   label: 'Data Boundary',      icon: <Info size={12} /> },
                  { id: 'stage',      label: 'Stage Details',     icon: <Zap size={12} /> },
                  { id: 'risk',       label: 'Risk Breakdown',     icon: <BarChart2 size={12} /> },
                  { id: 'review',     label: 'Admin Review Impact', icon: <AlertTriangle size={12} /> },
                  { id: 'raw',        label: 'Raw Evidence',      icon: <FileCode2 size={12} /> },
                ] as const).map(t => (
                  <button key={t.id} className={`tab-btn${resultTab === t.id ? ' active' : ''}`} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setResultTab(t.id)}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
              {(chatResult || researchResult) && (
                <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>● Live Result</span>
              )}
            </div>

            <div style={{ padding: '16px 18px' }}>

              {/* ── Comparison Tab ── */}
              {resultTab === 'comparison' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Insight block */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
                    <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#92400E' }}>
                        Guard returned <strong>{liveGuardAllowed === null ? (guardAllowed ? 'ALLOW' : 'BLOCK') : liveGuardAllowed ? 'ALLOW' : 'BLOCK'}</strong>
                        {' '}&rarr; PrismGuard applied policy <strong>{liveDecision || policy.decision}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
                        {activePreset.vector_details || activePreset.mitigation_note || 'No additional context available for this test case.'}
                      </div>
                    </div>
                  </div>

                  {/* Disagreement highlight */}
                  {liveDisagreement && (
                    <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 4 }}>⚠ Guard Blind Spot Confirmed</div>
                      <div style={{ color: '#78350F' }}>
                        SecureAI Guard allowed this payload, but PrismGuard AI flagged it with a {(liveRiskScore ?? risk.score)}/100 risk score.
                        This is a verified research finding demonstrating PrismGuard's additional detection layer.
                      </div>
                    </div>
                  )}

                  {/* Comparison table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-table-head)' }}>
                        {['Metric', 'SecureAI Guard', 'PrismGuard AI'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Decision', liveGuardAllowed === false ? 'BLOCK' : 'ALLOW', liveDecision || policy.decision],
                        ['Risk Score', '—', String(liveRiskScore ?? risk.score)],
                        ['Latency', `${Math.round(liveGuardLatency || 0)} ms`, liveStages ? `${Math.round(Object.values(liveStages).reduce((a, v) => a + (v || 0), 0))} ms` : 'N/A'],
                        ['Flags / Signals', liveGuardFlags.length > 0 ? liveGuardFlags.join(', ') : 'None', (liveSignals.length > 0 ? liveSignals : signals.signals).slice(0, 3).join(', ') || 'None'],
                        ['LLM Invoked', liveGuardAllowed !== false ? 'Yes (no gate)' : 'Blocked', policy.allowLlmExecution && (liveDecision || policy.decision) !== 'BLOCK' ? 'Yes' : 'Prevented'],
                        ['Reproducible', activePreset.reproducible_runs || '—', activePreset.reproducible_runs || '—'],
                      ].map(([metric, guard, prism]) => (
                        <tr key={metric} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{metric}</td>
                          <td style={{ padding: '8px 12px', color: metric === 'Decision' ? (guard === 'BLOCK' ? '#DC2626' : '#059669') : 'var(--text-primary)' }}>
                            {metric === 'Decision'
                              ? <span className={`badge ${guard === 'BLOCK' ? 'badge-block' : 'badge-allow'}`} style={{ fontSize: 10 }}>{guard}</span>
                              : guard}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {metric === 'Decision'
                              ? <span className={`badge ${decisionBadge(prism)}`} style={{ fontSize: 10 }}>{prism}</span>
                              : prism}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Stage Details Tab ── */}
              {resultTab === 'stage' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {!liveStages && (
                    <div style={{ padding: '10px 14px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: 12, color: '#4338CA' }}>
                      ℹ Run on Live Gateway to see real per-stage latencies.
                    </div>
                  )}
                  {STAGE_DEFS.map((stage, i) => {
                    const ms = liveStages ? (liveStages as any)[stage.key] ?? 0 : null;
                    const ran = ms === null ? true : ms > 0;
                    return (
                      <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 12px', background: ran ? `${stage.color}06` : '#FAFAFA', border: `1px solid ${ran ? stage.color + '30' : '#E5E7EB'}`, borderRadius: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: ran ? `${stage.color}20` : '#F3F4F6', border: `2px solid ${ran ? stage.color : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: ran ? stage.color : '#9CA3AF' }}>{stage.num}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{stage.name}</span>
                            {ms !== null && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: stage.color }}>
                                {ms > 0 ? `${Math.round(ms)} ms` : 'Skipped'}
                              </span>
                            )}
                            {ms !== null && ms > 0 && (
                              <span className="badge badge-allow" style={{ fontSize: 9 }}>Complete</span>
                            )}
                            {ms !== null && ms === 0 && stage.skippedOnBlock && (
                              <span className="badge badge-gray" style={{ fontSize: 9 }}>Skipped — Blocked</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stage.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                  {liveStages && (
                    <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Total End-to-End Latency</span>
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#15803D' }}>
                        {Math.round(Object.values(liveStages).reduce((a, v) => a + (v || 0), 0))} ms
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Risk Analysis Tab ── */}
              {resultTab === 'risk' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Score gauge */}
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 40, fontWeight: 900, fontFamily: 'var(--font-mono)', color: (liveRiskScore ?? risk.score) >= 60 ? '#DC2626' : (liveRiskScore ?? risk.score) >= 30 ? '#EA580C' : '#059669' }}>
                        {liveRiskScore ?? risk.score}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</div>
                      <span className={`badge ${(liveRiskScore ?? risk.score) >= 60 ? 'badge-block' : (liveRiskScore ?? risk.score) >= 30 ? 'badge-warn' : 'badge-allow'}`} style={{ fontSize: 10, marginTop: 4, display: 'inline-block' }}>
                        {risk.band}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Score Breakdown (local engine)</div>
                      {[
                        { label: 'Obfuscation signals', val: risk.breakdown.obfuscation, max: 25, color: '#6366F1' },
                        { label: 'Instruction override signals', val: risk.breakdown.instruction, max: 25, color: '#EA580C' },
                        { label: 'Semantic attack keywords', val: risk.breakdown.semantic, max: 25, color: '#DC2626' },
                        { label: 'Context anomaly', val: risk.breakdown.context, max: 15, color: '#D97706' },
                        { label: 'Guard disagreement bonus', val: risk.breakdown.guard_disagreement, max: 10, color: '#7C3AED' },
                      ].map(r => (
                        <div key={r.label} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                            <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.val > 0 ? r.color : 'var(--text-muted)' }}>+{r.val}</span>
                          </div>
                          <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(r.val / r.max) * 100}%`, background: r.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All signals */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                      All Detected Signals ({(liveSignals.length > 0 ? liveSignals : signals.signals).length})
                    </div>
                    {(liveSignals.length > 0 ? liveSignals : signals.signals).length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No signals detected — input appears benign.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(liveSignals.length > 0 ? liveSignals : signals.signals).map((s, i) => (
                          <span key={i} className="badge badge-block" style={{ fontSize: 10 }}>{s.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mitigation note */}
                  {(activePreset.mitigation_note || activePreset.our_mitigation) && (
                    <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>Mitigation Applied</div>
                      <div style={{ color: '#15803D' }}>{activePreset.our_mitigation || activePreset.mitigation_note}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Raw Response Tab ── */}
              {resultTab === 'raw' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!chatResult && !researchResult && (
                    <div style={{ padding: '10px 14px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: 12, color: '#4338CA' }}>
                      ℹ Run the test to see raw JSON responses from the backend.
                    </div>
                  )}
                  {chatResult && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Chat API Response (/api/chat)</div>
                      <pre className="code-box-light" style={{ fontSize: 11, overflowX: 'auto', maxHeight: 360, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(chatResult, null, 2)}
                      </pre>
                    </div>
                  )}
                  {researchResult && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Research API Response (/api/research/run)</div>
                      <pre className="code-box-light" style={{ fontSize: 11, overflowX: 'auto', maxHeight: 360, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(researchResult, null, 2)}
                      </pre>
                    </div>
                  )}
                  {/* Static catalog data always shown */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Test Case Catalog Entry</div>
                    <pre className="code-box-light" style={{ fontSize: 11, overflowX: 'auto', maxHeight: 240, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(activePreset, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          </div>

          </div>{/* end 3-col results grid */}
        </div>{/* end right column flex */}
      </div>{/* end main split grid */}
    </div>
  );
};
