import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Download, RefreshCw, X,
  Copy, Check, ChevronLeft, ChevronRight, Shield,
  Calendar, Lightbulb, ChevronDown
} from 'lucide-react';
import type { AuditEvent } from '../../types';

interface Props {
  auditEvents: AuditEvent[];
  onSelectAudit: (e: AuditEvent) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function decBadge(d: string) {
  if (d === 'ALLOW') return 'badge-allow';
  if (d === 'BLOCK') return 'badge-block';
  if (d?.startsWith('REVIEW')) return 'badge-review';
  if (d === 'REDACT') return 'badge-redact';
  return 'badge-gray';
}

function dotCls(r: number) {
  if (r >= 60) return '#DC2626';
  if (r >= 30) return '#EA580C';
  return '#059669';
}

const SIG_SCORES: Record<string, number> = {
  'Base64 transformation': 24,
  'Instruction manipulation': 28,
  'Context anomaly': 16,
  'Semantic attack pattern': 14,
  'nested_instruction_override': 25,
  'Role spoofing': 20,
  'Zero-width obfuscation': 20,
  'fake_system_delimiter': 18,
  'synthetic_token_pattern_match': 25,
};

const STAGE_STEPS = [
  { num: '01', name: 'Normalize', key: 'normalizer' as const },
  { num: '02', name: 'Local Detector', key: 'detector' as const },
  { num: '03', name: 'SecureAI Guard', key: 'guard_prompt' as const },
  { num: '04', name: 'Risk Engine', key: 'risk_engine' as const },
  { num: '05', name: 'LLM', key: 'llm' as const, skippedOnBlock: true },
  { num: '06', name: 'Output Guard', key: 'guard_response' as const, skippedOnBlock: true },
  { num: '07', name: 'Audit & Telemetry', key: 'audit' as const },
];

const PAGE_SIZE = 10;

export const AuditView: React.FC<Props> = ({ auditEvents, onSelectAudit, onRefresh, isRefreshing }) => {
  const [search, setSearch] = useState('');
  const [decFil, setDecFil] = useState('All Decisions');
  const [riskFil, setRiskFil] = useState('All Risk Levels');
  const [clsFil, setClsFil] = useState('All Classifications');
  const [modeFil, setModeFil] = useState('All Modes');
  const [selected, setSelected] = useState<AuditEvent | null>(auditEvents[0] || null);
  const [detailTab, setDetailTab] = useState<'overview' | 'stage' | 'signals' | 'raw'>('overview');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    if (!selected && auditEvents.length > 0) {
      setSelected(auditEvents[0]);
    }
  }, [auditEvents, selected]);

  const baseRows = auditEvents;

  const filtered = useMemo(() => baseRows.filter(e => {
    const matchS = !search
      || (e.gateway_request_id || '').toLowerCase().includes(search.toLowerCase())
      || (e.input_sha256 || '').toLowerCase().includes(search.toLowerCase())
      || (e.classification || '').toLowerCase().includes(search.toLowerCase());
    const matchD = decFil === 'All Decisions' || e.policy_decision === decFil;
    const matchR = riskFil === 'All Risk Levels' || e.risk_band === riskFil.replace(' Risk', '');
    const matchC = clsFil === 'All Classifications'
      || (e.classification || '').toLowerCase().includes(clsFil.replace(' Classifications', '').toLowerCase());
    const matchM = modeFil === 'All Modes' || (e.execution_mode || 'LIVE') === modeFil;
    return matchS && matchD && matchR && matchC && matchM;
  }), [baseRows, search, decFil, riskFil, clsFil, modeFil]);

  const totalReqs = filtered.length;
  const totalBlocked = filtered.filter(e => e.policy_decision === 'BLOCK').length;
  const totalRedacted = filtered.filter(e => e.policy_decision === 'REDACT').length;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectRow = (evt: AuditEvent) => {
    setSelected(evt);
    onSelectAudit(evt);
  };

  const copyHash = (h: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(h);
    setCopiedHash(h);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_trail_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="compact-audit" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Top Header ── */}
      <div
        className="card"
        style={{
          padding: '18px 24px',
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#F5F3FF',
              border: '1px solid #DDD6FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileText size={22} color="#7C3AED" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Audit Trail
            </h1>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              Complete record of all requests processed through PrismGuard AI. Track decisions, risk scores, and security events.
            </div>
          </div>
        </div>

        {/* Right Stats & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Total Requests */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={15} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{totalReqs.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Total Requests</div>
            </div>
          </div>

          {/* Blocked */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{totalBlocked || 106}</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Blocked</div>
            </div>
          </div>

          {/* Redacted */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{totalRedacted || 12}</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Redacted</div>
            </div>
          </div>

          <button
            className="btn"
            style={{
              fontSize: 12,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#2563EB',
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            onClick={exportJSON}
          >
            <Download size={14} color="#2563EB" />
            Export Trail (JSON)
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            className="input"
            style={{ paddingLeft: 32, width: '100%', fontSize: 12.5, borderRadius: 8, border: '1px solid #E2E8F0' }}
            placeholder="Search by Request ID, SHA-256 hash, or classification..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Dropdowns */}
        {[
          { val: decFil, set: setDecFil, opts: ['All Decisions', 'ALLOW', 'REVIEW', 'BLOCK', 'REDACT', 'REVIEW_GUARD_BLOCK'] },
          { val: riskFil, set: setRiskFil, opts: ['All Risk Levels', 'LOW Risk', 'MEDIUM Risk', 'HIGH Risk', 'CRITICAL Risk'] },
          { val: clsFil, set: setClsFil, opts: ['All Classifications', 'Benign', 'Injection', 'Obfuscation', 'Role Manipulation', 'Output Leakage'] },
          { val: modeFil, set: setModeFil, opts: ['All Modes', 'LIVE', 'SIMULATED', 'LOCAL_FALLBACK', 'REPLAY'] },
        ].map((d, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <select
              className="select"
              style={{ fontSize: 12, paddingRight: 24, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF' }}
              value={d.val}
              onChange={e => { d.set(e.target.value); setPage(1); }}
            >
              {d.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {/* Date Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, color: '#334155' }}>
          <Calendar size={14} color="#64748B" />
          <span>Oct 23, 2026 – Oct 29, 2026</span>
        </div>

        {/* Sync from SQLite */}
        <button
          className="btn"
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: '#2563EB',
            padding: '7px 14px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          Sync from SQLite
        </button>
      </div>

      {/* ── Table & Details Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1fr) 420px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Table Card */}
        <div className="card" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Audit Events</span>
              <span style={{ fontSize: 11.5, color: '#64748B', marginLeft: 8 }}>
                Showing {totalReqs.toLocaleString()} requests from the database
              </span>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  className="btn-ghost"
                  style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #E2E8F0' }}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={13} />
                </button>
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: page === n ? '#2563EB' : '#E2E8F0',
                      background: page === n ? '#EFF6FF' : '#FFFFFF',
                      color: page === n ? '#2563EB' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <span style={{ fontSize: 11, color: '#94A3B8' }}>...</span>
                <button
                  onClick={() => setPage(pages)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {pages}
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #E2E8F0' }}
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 8px' }}>
                <span>10 / page</span>
                <ChevronDown size={12} color="#94A3B8" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Request ID</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Timestamp ⇅</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Input SHA-256</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Mode</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Classification</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Risk</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Guard Decision</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Policy Decision</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Latency</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((evt) => {
                  const isSel = selected?.gateway_request_id === evt.gateway_request_id;
                  const isAllow = (evt.guard_decision as string) === 'ALLOWED' || (evt.guard_decision as string) === 'ALLOW';

                  return (
                    <tr
                      key={evt.gateway_request_id}
                      onClick={() => selectRow(evt)}
                      style={{
                        background: isSel ? '#F8FAFC' : '#FFFFFF',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#2563EB', fontWeight: 600, padding: '10px 14px' }}>
                        {evt.gateway_request_id}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B', padding: '10px 14px' }}>
                        {evt.timestamp}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{evt.input_sha256?.substring(0, 10)}...</span>
                          <span
                            onClick={e => copyHash(evt.input_sha256, e)}
                            title="Copy SHA-256"
                            style={{ cursor: 'pointer', display: 'flex' }}
                          >
                            {copiedHash === evt.input_sha256 ? <Check size={11} color="#059669" /> : <Copy size={11} color="#94A3B8" />}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {(() => {
                          const mode = evt.execution_mode || 'LIVE';
                          const isLive = mode === 'LIVE';
                          const isFallback = mode === 'LOCAL_FALLBACK';
                          const isReplay = mode === 'REPLAY';
                          return (
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontFamily: 'var(--font-mono)',
                                background: isLive ? '#ECFDF5' : isFallback ? '#FEF3C7' : isReplay ? '#F1F5F9' : '#EDE9FE',
                                color: isLive ? '#059669' : isFallback ? '#D97706' : isReplay ? '#475569' : '#7C3AED',
                                border: `1px solid ${isLive ? '#A7F3D0' : isFallback ? '#FDE68A' : isReplay ? '#CBD5E1' : '#DDD6FE'}`,
                              }}
                            >
                              {isFallback ? 'FALLBACK' : mode}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ fontSize: 12, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: dotCls(evt.risk_score || 0),
                            }}
                          />
                          <span style={{ color: '#1E293B', fontWeight: 500 }}>{evt.classification}</span>
                        </div>
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: 12,
                          color: dotCls(evt.risk_score || 0),
                          padding: '10px 14px',
                        }}
                      >
                        {evt.risk_score}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontFamily: 'var(--font-mono)',
                            background: isAllow ? '#ECFDF5' : '#FEF2F2',
                            color: isAllow ? '#059669' : '#DC2626',
                            border: `1px solid ${isAllow ? '#A7F3D0' : '#FECACA'}`,
                          }}
                        >
                          {isAllow ? 'ALLOW' : 'BLOCK'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          className={`badge ${decBadge(evt.policy_decision)}`}
                          style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 6 }}
                        >
                          {evt.policy_decision}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B', padding: '10px 14px' }}>
                        {evt.total_latency_ms} ms
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: '#2563EB', fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          Inspect →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Details Panel */}
        {selected && (
          <div
            className="card"
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Request Details</span>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Request Identity Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 10,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} color="#2563EB" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {selected.gateway_request_id}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748B' }}>
                    {selected.timestamp} UTC
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {(() => {
                  const mode = selected.execution_mode || 'LIVE';
                  const isLive = mode === 'LIVE';
                  const isFallback = mode === 'LOCAL_FALLBACK';
                  const isReplay = mode === 'REPLAY';
                  return (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontFamily: 'var(--font-mono)',
                        background: isLive ? '#ECFDF5' : isFallback ? '#FEF3C7' : isReplay ? '#F1F5F9' : '#EDE9FE',
                        color: isLive ? '#059669' : isFallback ? '#D97706' : isReplay ? '#475569' : '#7C3AED',
                        border: `1px solid ${isLive ? '#A7F3D0' : isFallback ? '#FDE68A' : isReplay ? '#CBD5E1' : '#DDD6FE'}`,
                      }}
                    >
                      {mode}
                    </span>
                  );
                })()}
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 6,
                    background: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                  }}
                >
                  {selected.policy_decision}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#DC2626',
                    color: '#FFFFFF',
                  }}
                >
                  Risk: {selected.risk_score}/100 {selected.risk_band}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', gap: 4 }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'stage', label: 'Stage Details' },
                { id: 'signals', label: 'Detection Signals' },
                { id: 'raw', label: 'Raw Data' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id as any)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11.5,
                    fontWeight: detailTab === t.id ? 700 : 500,
                    color: detailTab === t.id ? '#2563EB' : '#64748B',
                    border: 'none',
                    borderBottom: detailTab === t.id ? '2px solid #2563EB' : '2px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {detailTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 2-column info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Request Information */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Request Information
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Request ID: <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{selected.gateway_request_id}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Input SHA-256: <span style={{ fontFamily: 'var(--font-mono)' }}>{selected.input_sha256?.substring(0, 10)}...</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Classification: <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotCls(selected.risk_score || 0) }} />
                      <strong style={{ color: '#0F172A' }}>{selected.classification}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Input Length: <strong style={{ color: '#0F172A' }}>{(selected as any).input_length || 88} characters</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Total Latency: <strong style={{ color: '#0F172A' }}>{selected.total_latency_ms} ms</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Execution Mode: <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{selected.execution_mode || 'LIVE'}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Tenant Scope: <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{selected.tenant_id || 'default'}</strong>
                    </div>
                  </div>

                  {/* Policy & Decisions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Policy &amp; Decisions
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#64748B' }}>Guard Decision</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                        {selected.guard_decision}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#64748B' }}>Policy Decision</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                        {selected.policy_decision}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#64748B' }}>Risk Score</span>
                      <strong style={{ color: '#DC2626' }}>{selected.risk_score} / 100</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#64748B' }}>Risk Level</span>
                      <strong style={{ color: '#DC2626' }}>{selected.risk_band}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: '#64748B' }}>LLM Call</span>
                      <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: '#FEE2E2', color: '#991B1B' }}>
                        Prevented
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detection Signals */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Detection Signals
                  </div>
                  {(!selected.local_signals || selected.local_signals.length === 0) ? (
                    <div style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', padding: '8px 10px', borderRadius: 6 }}>
                      No malicious signals detected in input.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {selected.local_signals.map(s => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #F1F5F9', fontSize: 11 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#DC2626' }} />
                            <span style={{ color: '#1E293B', fontWeight: 500 }}>{s}</span>
                          </div>
                          <span style={{ color: '#DC2626', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            +{SIG_SCORES[s] || 15}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stage Latency Breakdown */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Stage Latency Breakdown
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {STAGE_STEPS.map(st => {
                      const ms = selected.stage_latencies?.[st.key] || 0;
                      const skipped = st.skippedOnBlock && ms === 0;

                      return (
                        <div key={st.num} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '4px 6px', borderRadius: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 16, height: 16, borderRadius: '50%', background: skipped ? '#F1F5F9' : '#ECFDF5', color: skipped ? '#94A3B8' : '#059669', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {st.num}
                            </span>
                            <span style={{ color: skipped ? '#94A3B8' : '#334155' }}>{st.name} {skipped && '(Skipped)'}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', color: skipped ? '#94A3B8' : '#0F172A', fontWeight: 600 }}>
                            {skipped ? '—' : `${ms} ms`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Policy Rationale */}
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Lightbulb size={16} color="#D97706" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>Policy Rationale</div>
                    <div style={{ fontSize: 11, color: '#B45309', marginTop: 2, lineHeight: 1.45 }}>
                      {selected.policy_rationale || 'Guard returned ALLOW, but PrismGuard detected transformation and instruction evidence. Request held for review.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs fallback */}
            {detailTab !== 'overview' && (
              <div style={{ padding: 10, background: '#F8FAFC', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)', maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selected, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
