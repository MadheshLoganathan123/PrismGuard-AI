import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Download, RefreshCw, X,
  Copy, Check, ChevronLeft, ChevronRight, Shield,
  Calendar, AlertTriangle
} from 'lucide-react';
import type { AuditEvent } from '../../types';

interface Props {
  auditEvents: AuditEvent[];
  onSelectAudit: (e: AuditEvent) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/* ── helpers ── */
function decBadge(d: string) {
  if (d === 'ALLOW') return 'badge-allow';
  if (d === 'BLOCK') return 'badge-block';
  if (d?.startsWith('REVIEW')) return 'badge-review';
  if (d === 'REDACT') return 'badge-redact';
  return 'badge-gray';
}
function riskClr(r: number) {
  if (r >= 60) return '#DC2626';
  if (r >= 30) return '#EA580C';
  return '#059669';
}
function dotCls(r: number) {
  if (r >= 60) return 'dot-block';
  if (r >= 30) return 'dot-review';
  return 'dot-allow';
}

/* ── Stage config ── */
const STAGES = [
  { key: 'normalizer'   as const, label: 'Normalize',             color: '#06B6D4' },
  { key: 'detector'     as const, label: 'Local Detector',        color: '#8B5CF6' },
  { key: 'guard_prompt' as const, label: 'SecureAI Guard',        color: '#6366F1' },
  { key: 'risk_engine'  as const, label: 'Risk Engine',           color: '#F59E0B' },
  { key: 'llm'          as const, label: 'LLM (Protected)',       color: '#059669' },
  { key: 'guard_response' as const, label: 'Output Guard',        color: '#0284C7' },
  { key: 'audit'        as const, label: 'Audit & Telemetry',     color: '#9CA3AF' },
];

/* ── Hardcoded demo rows exactly matching screenshot ── */
const DEMO: AuditEvent[] = [
  { id:'1',  timestamp:'Oct 29, 14:37:02', gateway_request_id:'REQ-82A9F1', input_sha256:'a91e3f...72bc', classification:'Injection Attempt',   risk_score:82, risk_band:'HIGH', guard_decision:'ALLOW', policy_decision:'REVIEW', total_latency_ms:199, action_taken:'Held for review',  local_signals:['Base64 transformation','Instruction manipulation','Context anomaly','Semantic attack pattern'], stage_latencies:{normalizer:11,detector:14,guard_prompt:165,risk_engine:8,policy:4,llm:0,    guard_response:0,   audit:5}, policy_rationale:'Guard returned ALLOW, but PrismGuard detected transformation and instruction evidence. Request held for review.', request_summary:'Base64-encoded instruction override', input_length:88 },
  { id:'2',  timestamp:'Oct 29, 14:36:15', gateway_request_id:'REQ-71C02D', input_sha256:'5d72ab...9f11', classification:'Benign (Coding)',     risk_score:12, risk_band:'LOW',  guard_decision:'ALLOW', policy_decision:'ALLOW',  total_latency_ms:187, action_taken:'Passed through', local_signals:[],                                                                                         stage_latencies:{normalizer:11,detector:14,guard_prompt:155,risk_engine:5,policy:3,llm:340,  guard_response:120, audit:5}, policy_rationale:'Low-risk benign coding query. All checks passed.',                                                                                 request_summary:'HTTP caching explanation',       input_length:95  },
  { id:'3',  timestamp:'Oct 29, 14:35:48', gateway_request_id:'REQ-48E654', input_sha256:'c3f9e2...a1d7', classification:'Obfuscation',         risk_score:76, risk_band:'HIGH', guard_decision:'ALLOW', policy_decision:'BLOCK',  total_latency_ms:210, action_taken:'Blocked',        local_signals:['Base64 transformation','Zero-width obfuscation'],                                           stage_latencies:{normalizer:11,detector:14,guard_prompt:165,risk_engine:8,policy:4,llm:0,    guard_response:0,   audit:5}, policy_rationale:'Obfuscation vectors detected. Request blocked.',                                                                                           request_summary:'Unicode homoglyph injection',    input_length:62  },
  { id:'4',  timestamp:'Oct 29, 14:34:21', gateway_request_id:'REQ-37D8EC', input_sha256:'9b1ac4...e3d9', classification:'Role Manipulation',   risk_score:68, risk_band:'HIGH', guard_decision:'ALLOW', policy_decision:'REVIEW', total_latency_ms:205, action_taken:'Held for review', local_signals:['Role spoofing'],                                                                              stage_latencies:{normalizer:11,detector:14,guard_prompt:165,risk_engine:8,policy:4,llm:0,    guard_response:0,   audit:5}, policy_rationale:'Role manipulation signals detected.',                                                                                                   request_summary:'You are now DAN',                input_length:93  },
  { id:'5',  timestamp:'Oct 29, 14:33:10', gateway_request_id:'REQ-1A9C5F', input_sha256:'e72d9b...4c11', classification:'Benign (Academic)',   risk_score:8,  risk_band:'LOW',  guard_decision:'ALLOW', policy_decision:'ALLOW',  total_latency_ms:142, action_taken:'Passed through', local_signals:[],                                                                                         stage_latencies:{normalizer:11,detector:14,guard_prompt:112,risk_engine:4,policy:2,llm:300,  guard_response:100, audit:5}, policy_rationale:'Benign academic content.',                                                                                                            request_summary:'Auth vs authorization',          input_length:98  },
  { id:'6',  timestamp:'Oct 29, 14:31:56', gateway_request_id:'REQ-F34D21', input_sha256:'812f9d...6a3c', classification:'Output Leakage',      risk_score:64, risk_band:'HIGH', guard_decision:'ALLOW', policy_decision:'REDACT', total_latency_ms:298, action_taken:'Output redacted',  local_signals:['synthetic_token_pattern_match'],                                                            stage_latencies:{normalizer:11,detector:14,guard_prompt:155,risk_engine:7,policy:3,llm:360,  guard_response:140, audit:5}, policy_rationale:'Output contained synthetic secret pattern. Redacted before delivery.',                                                                request_summary:'Generate mock config output',    input_length:40  },
  { id:'7',  timestamp:'Oct 29, 14:30:44', gateway_request_id:'REQ-9B7E2A', input_sha256:'3ce9d1...b7f2', classification:'Instruction Smuggling',risk_score:71, risk_band:'HIGH', guard_decision:'ALLOW', policy_decision:'BLOCK',  total_latency_ms:224, action_taken:'Blocked',        local_signals:['nested_instruction_override'],                                                              stage_latencies:{normalizer:11,detector:14,guard_prompt:165,risk_engine:8,policy:4,llm:0,    guard_response:0,   audit:5}, policy_rationale:'Instruction smuggling boundary violation.',                                                                                            request_summary:'Multi-role injection sequence',  input_length:121 },
  { id:'8',  timestamp:'Oct 29, 14:29:33', gateway_request_id:'REQ-6D3C8B', input_sha256:'a4f28e...c9d8', classification:'Multilingual',        risk_score:28, risk_band:'LOW',  guard_decision:'ALLOW', policy_decision:'ALLOW',  total_latency_ms:190, action_taken:'Passed through', local_signals:[],                                                                                         stage_latencies:{normalizer:11,detector:14,guard_prompt:145,risk_engine:6,policy:3,llm:340,  guard_response:115, audit:5}, policy_rationale:'Multilingual benign query.',                                                                                                       request_summary:'Non-English instruction',        input_length:64  },
  { id:'9',  timestamp:'Oct 29, 14:28:11', gateway_request_id:'REQ-3F91C4', input_sha256:'bd72c9...1e8f', classification:'Delimiter Smuggling', risk_score:66, risk_band:'HIGH', guard_decision:'ALLOW', policy_decision:'REVIEW', total_latency_ms:212, action_taken:'Held for review', local_signals:['fake_system_delimiter'],                                                                    stage_latencies:{normalizer:11,detector:14,guard_prompt:165,risk_engine:8,policy:4,llm:0,    guard_response:0,   audit:5}, policy_rationale:'Delimiter abuse detected.',                                                                                                           request_summary:'Markdown structural breakout',   input_length:114 },
  { id:'10', timestamp:'Oct 29, 14:27:05', gateway_request_id:'REQ-0E5D77', input_sha256:'f91a2b...6e3d', classification:'Benign (General)',    risk_score:10, risk_band:'LOW',  guard_decision:'ALLOW', policy_decision:'ALLOW',  total_latency_ms:156, action_taken:'Passed through', local_signals:[],                                                                                         stage_latencies:{normalizer:11,detector:14,guard_prompt:120,risk_engine:4,policy:2,llm:310,  guard_response:105, audit:5}, policy_rationale:'General benign request.',                                                                                                         request_summary:'Binary search complexity',       input_length:49  },
];

/* ── Signal score map ── */
const SIG_SCORES: Record<string, number> = {
  'Base64 transformation': 24, 'Instruction manipulation': 28,
  'Context anomaly': 16, 'Semantic attack pattern': 14,
  'nested_instruction_override': 25, 'Role spoofing': 20,
  'Zero-width obfuscation': 20, 'fake_system_delimiter': 18,
  'synthetic_token_pattern_match': 25,
};

const PAGE_SIZE = 10;

export const AuditView: React.FC<Props> = ({ auditEvents, onSelectAudit, onRefresh, isRefreshing }) => {
  const [search,    setSearch]    = useState('');
  const [decFil,    setDecFil]    = useState('All Decisions');
  const [riskFil,   setRiskFil]   = useState('All Risk Levels');
  const [clsFil,    setClsFil]    = useState('All Classifications');
  const [selected,  setSelected]  = useState<AuditEvent | null>(DEMO[0]);
  const [detailTab, setDetailTab] = useState<'overview'|'stage'|'signals'|'raw'>('overview');
  const [copiedHash, setCopiedHash] = useState<string|null>(null);
  const [page, setPage] = useState(1);

  const baseRows = auditEvents.length > 0 ? auditEvents : DEMO;

  const filtered = useMemo(() => baseRows.filter(e => {
    const matchS = !search
      || (e.gateway_request_id||'').toLowerCase().includes(search.toLowerCase())
      || (e.input_sha256||'').toLowerCase().includes(search.toLowerCase())
      || (e.classification||'').toLowerCase().includes(search.toLowerCase());
    const matchD = decFil === 'All Decisions' || e.policy_decision === decFil;
    const matchR = riskFil === 'All Risk Levels' || e.risk_band === riskFil.replace(' Risk','');
    const matchC = clsFil === 'All Classifications'
      || (e.classification||'').toLowerCase().includes(clsFil.replace(' Classifications','').toLowerCase());
    return matchS && matchD && matchR && matchC;
  }), [baseRows, search, decFil, riskFil, clsFil]);

  const totalReqs     = filtered.length;
  const totalBlocked  = filtered.filter(e => e.policy_decision === 'BLOCK').length;
  const totalRedacted = filtered.filter(e => e.policy_decision === 'REDACT').length;
  const pages         = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows      = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const selectRow = (evt: AuditEvent) => {
    setSelected(evt); setDetailTab('overview'); onSelectAudit(evt);
  };

  const copyHash = (h: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(h);
    setCopiedHash(h);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_trail_${Date.now()}.json`;
    a.click();
  };

  /* pagination display numbers */
  const pNums = [1, 2, 3];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* ══ PAGE HEADER ══════════════════════════════════════════ */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background:'#EEF2FF' }}>
            <FileText size={22} color="#6366F1" />
          </div>
          <div>
            <div className="page-header-title">Audit Trail</div>
            <div className="page-header-sub">
              Complete record of all requests processed through PrismGuard AI. Track decisions, risk scores, and security events.
            </div>
          </div>
        </div>

        <div className="page-header-right">
          {/* Stat chips */}
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8 }}>
            <div style={{ width:28, height:28, borderRadius:6, background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileText size={14} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#111827', lineHeight:1 }}>{totalReqs.toLocaleString()}</div>
              <div style={{ fontSize:10, color:'#6B7280' }}>Total Requests</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8 }}>
            <div style={{ width:28, height:28, borderRadius:6, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#111827', lineHeight:1 }}>{totalBlocked}</div>
              <div style={{ fontSize:10, color:'#6B7280' }}>Blocked</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8 }}>
            <div style={{ width:28, height:28, borderRadius:6, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={14} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#111827', lineHeight:1 }}>{totalRedacted}</div>
              <div style={{ fontSize:10, color:'#6B7280' }}>Redacted</div>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ fontSize:12, gap:6, display:'flex', alignItems:'center' }}
            onClick={exportJSON}
          >
            <Download size={13} />
            Export Trail (JSON)
          </button>
        </div>
      </div>

      {/* ══ FILTER BAR ══════════════════════════════════════════ */}
      <div className="card" style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:'1 1 240px', minWidth:0 }}>
          <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', pointerEvents:'none' }} />
          <input
            className="input"
            style={{ paddingLeft:30, width:'100%', fontSize:12 }}
            placeholder="Search by Request ID, SHA-256 hash, or classification..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Dropdowns */}
        {[
          { val:decFil,  set:setDecFil,  opts:['All Decisions','ALLOW','REVIEW','BLOCK','REDACT','REVIEW_GUARD_BLOCK'] },
          { val:riskFil, set:setRiskFil, opts:['All Risk Levels','LOW Risk','MEDIUM Risk','HIGH Risk','CRITICAL Risk'] },
          { val:clsFil,  set:setClsFil,  opts:['All Classifications','Benign','Injection','Obfuscation','Role Manipulation','Output Leakage'] },
        ].map((d, i) => (
          <div key={i} style={{ position:'relative' }}>
            <select
              className="select"
              style={{ fontSize:12, paddingRight:24 }}
              value={d.val}
              onChange={e => { d.set(e.target.value); setPage(1); }}
            >
              {d.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {/* Date range */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:'var(--bg-surface)', border:'1px solid var(--border-medium)', borderRadius:7, fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
          <Calendar size={13} color="var(--text-muted)" />
          Oct 23, 2026 – Oct 29, 2026
        </div>

        {/* Sync */}
        <button
          className="btn btn-secondary"
          style={{ fontSize:12, gap:6 }}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          Sync from SQLite
        </button>
      </div>

      {/* ══ TABLE + DETAIL PANEL ════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) 400px' : '1fr', gap:16, alignItems:'start' }}>

        {/* ── TABLE ── */}
        <div className="card" style={{ overflow:'hidden' }}>
          {/* Table header row */}
          <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Audit Events</span>
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:8 }}>
                Showing {totalReqs.toLocaleString()} requests from the database
              </span>
            </div>

            {/* Pagination */}
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                <button className="btn-ghost" style={{ padding:'4px 6px' }} onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>
                  <ChevronLeft size={13} />
                </button>
                {pNums.map(n => (
                  <button
                    key={n}
                    className="btn-ghost"
                    style={{ padding:'4px 8px', fontWeight: page===n ? 700 : 400, color: page===n ? 'var(--brand-primary)' : undefined, background: page===n ? '#EEF2FF' : undefined, borderRadius:5 }}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <span style={{ fontSize:12, color:'var(--text-muted)', padding:'0 4px' }}>...</span>
                <button className="btn-ghost" style={{ padding:'4px 8px' }} onClick={() => setPage(pages)}>
                  {pages}
                </button>
                <button className="btn-ghost" style={{ padding:'4px 6px' }} onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}>
                  <ChevronRight size={13} />
                </button>
              </div>
              <select className="select" style={{ fontSize:11, padding:'4px 6px' }}>
                <option>10 / page</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX:'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Timestamp <span style={{ color:'#6366F1', fontSize:10 }}>↕</span></th>
                  <th>Input SHA-256</th>
                  <th>Classification</th>
                  <th>Risk</th>
                  <th>Guard Decision</th>
                  <th>Policy Decision</th>
                  <th>Latency</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(evt => {
                  const isSelected = selected?.id === evt.id;
                  return (
                    <tr
                      key={evt.id}
                      onClick={() => selectRow(evt)}
                      style={{ background: isSelected ? '#F5F3FF' : undefined, cursor:'pointer' }}
                    >
                      {/* Request ID */}
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, color:'#6366F1', whiteSpace:'nowrap' }}>
                        {evt.gateway_request_id}
                      </td>

                      {/* Timestamp */}
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {evt.timestamp}
                      </td>

                      {/* SHA-256 */}
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span>{(evt.input_sha256||'').substring(0,12)}</span>
                          <button
                            style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', color:'var(--text-disabled)', display:'flex' }}
                            onClick={e => copyHash(evt.input_sha256||'', e)}
                          >
                            {copiedHash === evt.input_sha256
                              ? <Check size={10} color="var(--status-allow)" />
                              : <Copy size={10} />
                            }
                          </button>
                        </div>
                      </td>

                      {/* Classification with dot */}
                      <td style={{ fontSize:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span className={`dot ${dotCls(evt.risk_score||0)}`} />
                          {evt.classification}
                        </div>
                      </td>

                      {/* Risk score */}
                      <td>
                        <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color: riskClr(evt.risk_score||0) }}>
                          {evt.risk_score}
                        </span>
                      </td>

                      {/* Guard Decision */}
                      <td>
                        <span className={`badge ${evt.guard_decision==='ALLOW'||evt.guard_decision==='ALLOWED' ? 'badge-allow' : 'badge-block'}`} style={{ fontSize:10 }}>
                          {evt.guard_decision==='ALLOW'||evt.guard_decision==='ALLOWED' ? 'ALLOW' : evt.guard_decision}
                        </span>
                      </td>

                      {/* Policy Decision */}
                      <td>
                        <span className={`badge ${decBadge(evt.policy_decision)}`} style={{ fontSize:10 }}>
                          {evt.policy_decision}
                        </span>
                      </td>

                      {/* Latency */}
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {evt.total_latency_ms} ms
                      </td>

                      {/* Inspect */}
                      <td>
                        <button
                          className="btn-ghost"
                          style={{ fontSize:11, color:'#6366F1', fontWeight:500 }}
                          onClick={e => { e.stopPropagation(); selectRow(evt); }}
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── REQUEST DETAIL PANEL ── */}
        {selected && (
          <div
            className="card"
            style={{ position:'sticky', top:76, overflow:'hidden', display:'flex', flexDirection:'column' }}
          >
            {/* Panel header */}
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Request Details</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {/* Icon + ID + timestamp */}
                  <div style={{ width:32, height:32, borderRadius:7, background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <FileText size={15} color="#6366F1" />
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>
                      {selected.gateway_request_id}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{selected.timestamp}</div>
                  </div>
                  <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
                    <span className={`badge ${decBadge(selected.policy_decision)}`} style={{ fontSize:10 }}>
                      {selected.policy_decision}
                    </span>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                      background: selected.risk_score>=60 ? '#FEE2E2' : selected.risk_score>=30 ? '#FEF3C7' : '#D1FAE5',
                      color:      selected.risk_score>=60 ? '#991B1B' : selected.risk_score>=30 ? '#92400E' : '#065F46',
                      border:`1px solid ${selected.risk_score>=60 ? '#FECACA' : selected.risk_score>=30 ? '#FDE68A' : '#A7F3D0'}`,
                    }}>
                      {selected.risk_score>=60 ? 'HIGH' : selected.risk_score>=30 ? 'MEDIUM' : 'LOW'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', color:'var(--text-muted)', display:'flex', flexShrink:0 }}
                onClick={() => setSelected(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Detail tabs */}
            <div style={{ borderBottom:'1px solid var(--border-light)', padding:'0 4px', display:'flex' }}>
              {(['overview','stage','signals','raw'] as const).map(t => (
                <button
                  key={t}
                  className={`tab-btn${detailTab===t?' active':''}`}
                  style={{ fontSize:12, padding:'8px 12px' }}
                  onClick={() => setDetailTab(t)}
                >
                  {t==='overview' ? 'Overview' : t==='stage' ? 'Stage Details' : t==='signals' ? 'Detection Signals' : 'Raw Data'}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div style={{ padding:'14px 16px', overflowY:'auto', maxHeight:460, display:'flex', flexDirection:'column', gap:14 }}>

              {detailTab === 'overview' && (
                <>
                  {/* 2-col: Request Info + Policy */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

                    {/* Request Information */}
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>
                        Request Information
                      </div>
                      {[
                        { k:'Request ID',      v: selected.gateway_request_id },
                        { k:'Input SHA-256',   v: (selected.input_sha256||'').substring(0,12)+'...', mono:true },
                        { k:'Classification',  v: selected.classification, dot:true },
                        { k:'Input Length',    v: `${selected.input_length||88} characters` },
                        { k:'Total Latency',   v: `${selected.total_latency_ms} ms` },
                      ].map(row => (
                        <div key={row.k} className="info-row">
                          <span className="info-row-label" style={{ fontSize:11 }}>{row.k}</span>
                          <span style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)', fontFamily: row.mono ? 'var(--font-mono)' : undefined, display:'flex', alignItems:'center', gap:5 }}>
                            {(row as any).dot && <span className={`dot ${dotCls(selected.risk_score||0)}`} />}
                            {row.v}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Policy & Decisions */}
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>
                        Policy &amp; Decisions
                      </div>
                      <div className="info-row">
                        <span className="info-row-label" style={{ fontSize:11 }}>Guard Decision</span>
                        <span className={`badge ${selected.guard_decision==='ALLOW'||selected.guard_decision==='ALLOWED' ? 'badge-allow' : 'badge-block'}`} style={{ fontSize:9 }}>
                          {selected.guard_decision==='ALLOW'||selected.guard_decision==='ALLOWED' ? 'ALLOW' : selected.guard_decision}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-row-label" style={{ fontSize:11 }}>Policy Decision</span>
                        <span className={`badge ${decBadge(selected.policy_decision)}`} style={{ fontSize:9 }}>
                          {selected.policy_decision}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-row-label" style={{ fontSize:11 }}>Risk Score</span>
                        <span style={{ fontSize:12, fontWeight:800, color: riskClr(selected.risk_score||0) }}>
                          {selected.risk_score} / 100
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-row-label" style={{ fontSize:11 }}>Risk Level</span>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                          background: selected.risk_score>=60 ? '#FEE2E2' : selected.risk_score>=30 ? '#FEF3C7' : '#D1FAE5',
                          color:      selected.risk_score>=60 ? '#991B1B' : selected.risk_score>=30 ? '#92400E' : '#065F46',
                        }}>
                          {selected.risk_band||'LOW'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-row-label" style={{ fontSize:11 }}>LLM Call</span>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                          background: selected.stage_latencies?.llm ? '#D1FAE5' : '#FEE2E2',
                          color:      selected.stage_latencies?.llm ? '#065F46' : '#991B1B',
                        }}>
                          {selected.stage_latencies?.llm ? 'Executed' : 'Prevented'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detection Signals */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>
                      Detection Signals
                    </div>
                    {(selected.local_signals||[]).length === 0 ? (
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>No signals detected</span>
                    ) : (
                      (selected.local_signals||[]).map((sig, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, marginBottom:5 }}>
                          <span style={{ color:'#DC2626', fontSize:8 }}>●</span>
                          <span style={{ color:'var(--text-secondary)', flex:1 }}>
                            {sig.replace(/_/g,' ')}
                          </span>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:'#DC2626' }}>
                            +{SIG_SCORES[sig] || 14}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Stage Latency Breakdown */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>
                      Stage Latency Breakdown
                    </div>
                    {STAGES.map((s, i) => {
                      const ms = selected.stage_latencies?.[s.key] || 0;
                      const ran = ms > 0;
                      const llmSkipped = !selected.stage_latencies?.llm && i >= 4;
                      const label = ran ? 'Complete' : llmSkipped ? 'Skipped' : '—';
                      return (
                        <div key={s.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                          {/* Numbered circle */}
                          <div style={{
                            width:18, height:18, borderRadius:'50%', flexShrink:0,
                            background: ran ? `${s.color}18` : '#F3F4F6',
                            border:`1.5px solid ${ran ? s.color : '#E5E7EB'}`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>
                            <span style={{ fontSize:7, fontWeight:700, color: ran ? s.color : '#9CA3AF' }}>
                              0{i+1}
                            </span>
                          </div>
                          <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1 }}>{s.label}</span>
                          <span style={{
                            fontSize:9, fontWeight:600, padding:'1px 6px', borderRadius:4,
                            background: ran ? '#D1FAE5' : '#F3F4F6',
                            color:      ran ? '#065F46' : '#6B7280',
                          }}>
                            {label}
                          </span>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', width:36, textAlign:'right' }}>
                            {ran ? `${ms} ms` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Policy Rationale */}
                  <div style={{ background:'#FEFCE8', border:'1px solid #FDE68A', borderRadius:8, padding:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <AlertTriangle size={13} color="#D97706" />
                      <span style={{ fontSize:11, fontWeight:700, color:'#92400E' }}>Policy Rationale</span>
                    </div>
                    <div style={{ fontSize:12, color:'#78350F', lineHeight:1.6 }}>
                      {selected.policy_rationale}
                    </div>
                  </div>
                </>
              )}

              {detailTab === 'stage' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {STAGES.map((s, i) => {
                    const ms = selected.stage_latencies?.[s.key] || 0;
                    return (
                      <div key={s.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--bg-surface-2)', borderRadius:7, border:'1px solid var(--border-light)' }}>
                        <div style={{ width:20, height:20, borderRadius:'50%', background:`${s.color}18`, border:`1.5px solid ${s.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ fontSize:7, fontWeight:700, color:s.color }}>0{i+1}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:500, flex:1 }}>{s.label}</span>
                        <div style={{ width:80, height:6, background:'#F3F4F6', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', background:s.color, borderRadius:3, width:`${ms > 0 ? Math.min(100,(ms/360)*100) : 0}%` }} />
                        </div>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, color: ms > 0 ? 'var(--text-primary)' : 'var(--text-muted)', width:40, textAlign:'right' }}>
                          {ms > 0 ? `${ms} ms` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {detailTab === 'signals' && (
                <div>
                  {(selected.local_signals||[]).length === 0 ? (
                    <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:13 }}>No detection signals for this request</div>
                  ) : (
                    (selected.local_signals||[]).map((sig, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'var(--bg-surface-2)', borderRadius:7, border:'1px solid var(--border-light)', marginBottom:6 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:'#DC2626', flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1 }}>{sig.replace(/_/g,' ')}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:'#DC2626', fontFamily:'var(--font-mono)' }}>+{SIG_SCORES[sig]||14}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === 'raw' && (
                <pre className="code-box" style={{ fontSize:10.5, maxHeight:420, overflowY:'auto' }}>
                  {JSON.stringify(selected, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
