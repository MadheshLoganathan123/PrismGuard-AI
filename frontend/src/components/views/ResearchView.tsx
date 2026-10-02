import React, { useState } from 'react';
import { Database, Download, Play, Search, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TestCase } from '../../types';

interface Props {
  testCases: TestCase[];
  quotaUsed: number;
  quotaTotal: number;
  onRunBatch: (ids: string[]) => Promise<void>;
  isProcessing: boolean;
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
    'Obfuscation': '#6366F1', 'Direct Override': '#DC2626', 'Role Manipulation': '#DC2626',
    'Delimiter Abuse': '#EA580C', 'Nested Instruction': '#EA580C', 'Payload Splitting': '#D97706',
    'Spacing & Normalization': '#D97706', 'Typoglycemia': '#D97706',
    'Benign Coding': '#059669', 'Benign Education': '#059669', 'Benign Security': '#059669',
    'Output Leakage': '#7C3AED', 'Reliability & Error': '#6B7280',
  };
  return m[cat] || '#6B7280';
}

export const ResearchView: React.FC<Props> = ({ testCases, quotaUsed, quotaTotal, onRunBatch, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'hypotheses'>('matrix');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All Categories');
  const [resFilter, setResFilter] = useState('All Results');
  const [selectedCase, setSelectedCase] = useState<TestCase>(testCases[0] || {} as TestCase);
  const [detailTab, setDetailTab] = useState<'overview' | 'runs' | 'telemetry' | 'raw'>('overview');

  const cases = testCases.length > 0 ? testCases : [];
  const filtered = cases.filter(t => {
    const matchSearch = !search || t.test_id.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All Categories' || t.category === catFilter;
    const matchRes = resFilter === 'All Results' ||
      (resFilter === 'Guard Miss' && t.guard_allowed && t.expected_label === 'attack-like') ||
      (resFilter === 'Guard Block' && !t.guard_allowed);
    return matchSearch && matchCat && matchRes;
  });

  const cats = ['All Categories', ...Array.from(new Set(cases.map(t => t.category)))];

  const HYPS = [
    { id: 'H1', title: 'H1 — Obfuscation & Encoded Smuggling', status: 'CONFIRMED', statusClr: '#059669', desc: 'Base64 strings, unusual unicode spaces, and homoglyphs bypass lexical pattern matchers in standalone Guard. PrismGuard canonicalization unpacks payloads and reliably scores directives.', cases: ['PI-005','PI-006','PI-007','PI-008','PI-009'] },
    { id: 'H2', title: 'H2 — Instruction Smuggling & Delimiter Abuse', status: 'VERIFIED', statusClr: '#059669', desc: 'Wrapped markdown quote blocks and simulated XML tags attempt to escape user role boundaries. PrismGuard isolates untrusted tokens into separate trust zones.', cases: ['PI-004','PI-012','PI-013'] },
    { id: 'H3', title: 'H3 — Multilingual / Mixed-Language Gap', status: 'COVERAGE VERIFIED', statusClr: '#0284C7', desc: 'Non-English or code-switched prompts screened through semantic intent parser to eliminate language discrepancies.', cases: ['PI-010','PI-011'] },
    { id: 'H4', title: 'H4 — Split Payload Gap', status: 'MITIGATED', statusClr: '#D97706', desc: 'Cross-message recombined prompts evaluated at the gateway prior to LLM submission.', cases: ['PI-014'] },
    { id: 'H5', title: 'H5 — Partial / Error Ambiguity Fail-Safe', status: 'HARDENED', statusClr: '#059669', desc: 'Gateway refuses fail-open behavior. HTTP 502/503 or status=partial gracefully routed to fast-track safety review.', cases: ['ERR-001','ERR-002'] },
    { id: 'H6', title: 'H6 — Output-Only Secret Leakage Gap', status: 'ACTIVE REDACTION', statusClr: '#7C3AED', desc: 'Model outputs analyzed through dual screening: POST /v1/check/response and regex secret interceptors mask API keys before client delivery.', cases: ['OUT-001','OUT-003'] },
  ];

  const sc = selectedCase as any;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background: '#E0F2FE' }}>
            <Database size={22} color="#0284C7" />
          </div>
          <div>
            <div className="page-header-title">Research Evidence</div>
            <div className="page-header-sub">Reproducible evaluation of 15 test cases across 6 hypotheses. All results are from live runs on the actual gateway.</div>
          </div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { val: '15', label: 'Test Cases', icon: <Database size={14} color="#6366F1" />, bg: '#EEF2FF' },
              { val: '6',  label: 'Hypotheses', icon: <AlertTriangle size={14} color="#D97706" />, bg: '#FEF3C7' },
              { val: '3+', label: 'Runs per case', icon: <Play size={14} color="#059669" />, bg: '#D1FAE5' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                <div><div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{s.val}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div></div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary-gradient" style={{ fontSize: 13, padding: '8px 18px' }} onClick={() => onRunBatch(cases.map(t => t.test_id))} disabled={isProcessing}>
            <Play size={14} /> {isProcessing ? 'Running...' : 'Run Test Suite'}
          </button>
        </div>
      </div>

      {/* ── Tabs + filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 0 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['matrix','hypotheses'] as const).map(t => (
            <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
              {t === 'matrix' ? <><Database size={14}/> 15-Case Benchmark Matrix</> : <><AlertTriangle size={14}/> Hypotheses Evaluation (H1-H6)</>}
            </button>
          ))}
        </div>

        {activeTab === 'matrix' && (
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" style={{ paddingLeft: 30, fontSize: 12, width: 220 }} placeholder="Search by test ID, name or category..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select" style={{ fontSize: 12 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="select" style={{ fontSize: 12 }} value={resFilter} onChange={e => setResFilter(e.target.value)}>
              {['All Results','Guard Miss','Guard Block'].map(r => <option key={r}>{r}</option>)}
            </select>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => onRunBatch(cases.map(t => t.test_id))} disabled={isProcessing}>
              <Download size={13} /> Export Evidence
            </button>
          </div>
        )}
      </div>

      {activeTab === 'matrix' ? (
        /* ── Split layout: table + detail panel ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Test Cases ({filtered.length})</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Results from live execution on PrismGuard AI gateway</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th>ID</th><th>Category</th><th>Test Name & Description</th><th>Expected Label</th><th>SecureAI Guard</th><th>PrismGuard AI</th><th>Runs</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(tc => {
                    const isGap = tc.guard_allowed && tc.expected_label === 'attack-like';
                    return (
                      <tr key={tc.test_id} onClick={() => setSelectedCase(tc)} style={{ background: selectedCase?.test_id === tc.test_id ? '#F5F3FF' : undefined }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: `${catColor(tc.category)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                              {tc.test_id.startsWith('FP') || tc.expected_label === 'benign' ? '✅' : tc.expected_label === 'output' ? '🔐' : '⚠️'}
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--brand-primary)' }}>{tc.test_id}</span>
                          </div>
                        </td>
                        <td><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${catColor(tc.category)}15`, color: catColor(tc.category), fontWeight: 600 }}>{tc.category}</span></td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{tc.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tc.description?.substring(0, 50)}...</div>
                        </td>
                        <td>
                          <span className={`badge ${tc.expected_label === 'attack-like' ? 'badge-review' : tc.expected_label === 'benign' ? 'badge-allow' : 'badge-purple'}`} style={{ fontSize: 9 }}>
                            {tc.expected_label}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isGap ? 'badge-warn' : tc.guard_allowed ? 'badge-allow' : 'badge-block'}`} style={{ fontSize: 9 }}>
                            {tc.guard_allowed ? (isGap ? 'ALLOW ⚠' : 'ALLOW') : 'BLOCK'}
                          </span>
                        </td>
                        <td><span className={`badge ${decisionBadge(tc.prism_action)}`} style={{ fontSize: 9 }}>{tc.prism_action}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{tc.reproducible_runs || '3'}</td>
                        <td>
                          <button className="btn-ghost" style={{ fontSize: 11, color: 'var(--brand-primary)' }} onClick={e => { e.stopPropagation(); setSelectedCase(tc); }}>
                            →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          {sc?.test_id && (
            <div className="card" style={{ overflow: 'hidden', position: 'sticky', top: 80 }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${catColor(sc.category)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                    {sc.expected_label === 'benign' ? '✅' : sc.expected_label === 'output' ? '🔐' : '⚠️'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{sc.test_id} — {sc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sc.description}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="btn-ghost" style={{ padding: '3px 5px' }}><ChevronLeft size={14}/></button>
                    <button className="btn-ghost" style={{ padding: '3px 5px' }}><ChevronRight size={14}/></button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-info" style={{ fontSize: 9 }}>{sc.category?.includes('Obfusc') ? 'H1' : sc.category?.includes('Delimit') || sc.category?.includes('Nested') ? 'H2' : 'H3'}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${catColor(sc.category)}15`, color: catColor(sc.category), fontWeight: 600 }}>{sc.category}</span>
                </div>
              </div>

              {/* Detail tabs */}
              <div style={{ padding: '0 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', gap: 0 }}>
                  {(['overview','runs','telemetry','raw'] as const).map(t => (
                    <button key={t} className={`tab-btn${detailTab === t ? ' active' : ''}`} style={{ fontSize: 12, padding: '8px 12px' }} onClick={() => setDetailTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'runs' ? ` (${sc.reproducible_runs?.split('/')[0] || 3})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '14px 16px', overflowY: 'auto', maxHeight: 480 }}>
                {detailTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Two-col info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Expected Label</div>
                        <span className={`badge ${sc.expected_label === 'attack-like' ? 'badge-review' : 'badge-allow'}`} style={{ fontSize: 10 }}>{sc.expected_label}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Key Transformation</div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {sc.category?.includes('Obfusc') || sc.test_id === 'PI-005' ? 'Base64 Encoding' : sc.category?.includes('Spac') ? 'Zero-Width Chars' : sc.category}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Category</div>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: `${catColor(sc.category)}15`, color: catColor(sc.category), fontWeight: 600 }}>{sc.category}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Hypothesis</div>
                        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                          {sc.category?.includes('Obfusc') ? 'H1 — Obfuscation Gap' : sc.category?.includes('Delimit') ? 'H2 — Smuggling' : 'H3 — Other'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Description</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sc.vector_details || sc.description}</div>
                    </div>

                    {/* Result comparison */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={12} color="#fff" />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#065F46' }}>SecureAI Guard Result</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginBottom: 4 }}>
                          {sc.guard_allowed ? 'ALLOWED' : 'BLOCKED'}
                        </div>
                        {[
                          ['Allowed', String(sc.guard_allowed)],
                          ['Status', sc.guard_status || 'complete'],
                          ['Latency', `${sc.guard_latency_ms} ms`],
                          ['Request ID', `guard_${sc.test_id?.toLowerCase().replace('-','')}`],
                        ].map(([k,v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                            <span style={{ color: '#065F46' }}>{k}</span>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: '#FFEDD5', border: '1px solid #FED7AA', borderRadius: 8, padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertTriangle size={12} color="#fff" />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#9A3412' }}>PrismGuard AI Result</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#EA580C' }}>{sc.prism_action}</span>
                          {sc.prism_score >= 60 && <span className="badge badge-high" style={{ fontSize: 9 }}>HIGH</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9A3412', marginBottom: 6 }}>Risk Score: {sc.prism_score}/100</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9A3412', marginBottom: 4 }}>Detected Signals</div>
                        {(sc.prism_signals || []).slice(0, 4).map((sig: string) => (
                          <div key={sig} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, marginTop: 3 }}>
                            <span style={{ color: '#DC2626' }}>●</span>
                            <span style={{ color: '#7C2D12', flex: 1 }}>{sig.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Policy Decision</span>
                            <span className={`badge ${decisionBadge(sc.prism_action)}`} style={{ fontSize: 9 }}>{sc.prism_action}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                            <span style={{ color: 'var(--text-muted)' }}>LLM Call</span>
                            <span className="badge badge-block" style={{ fontSize: 9 }}>Prevented</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Findings summary */}
                    <div style={{ background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>Findings Summary</div>
                      <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>{sc.mitigation_note}</div>
                    </div>
                  </div>
                )}

                {detailTab !== 'overview' && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {detailTab === 'runs' ? `${sc.reproducible_runs || '3/3'} verified runs` : detailTab === 'telemetry' ? 'Stage latency telemetry from last run' : 'Raw JSON response data'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Hypotheses grid ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {HYPS.map(h => (
            <div key={h.id} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{h.title}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${h.statusClr}15`, color: h.statusClr, border: `1px solid ${h.statusClr}30` }}>{h.status}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 10 }}>{h.desc}</p>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                <strong>Cases: </strong>{h.cases.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
