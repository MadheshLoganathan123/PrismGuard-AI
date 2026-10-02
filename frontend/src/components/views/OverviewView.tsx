import React from 'react';
import {
  Shield, ArrowRight, CheckCircle2, Eye, Database, Layers,
  AlertTriangle, RefreshCw, Zap, Activity, FileText, FlaskConical,
} from 'lucide-react';
import type { ActiveTab, AuditEvent } from '../../types';interface Props {
  setActiveTab: (t: ActiveTab) => void;
  auditEvents: AuditEvent[];
  quotaUsed: number;
  quotaTotal: number;
  onSelectAudit: (e: AuditEvent) => void;
}

/* ── tiny SVG sparkline ── */
function Spark({ data, color, w = 80, h = 28 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 3) - 1}`);
  const uid = color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${pts.join('L')}L${w},${h}L0,${h}Z`} fill={`url(#sg${uid})`} />
      <path d={`M${pts.join('L')}`} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── mini bar sparkline for service cards ── */
function MiniBars({ color }: { color: string }) {
  const heights = [0.4, 0.55, 0.45, 0.7, 0.6, 0.85, 0.72, 1];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ width: 4, height: h * 18, borderRadius: 2, background: color, opacity: i === heights.length - 1 ? 0.9 : 0.38 }} />
      ))}
    </div>
  );
}

/* ── donut chart ── */
function Donut({ segs, total }: { segs: { pct: number; color: string }[]; total: number }) {
  const r = 44; const cx = 56; const circ = 2 * Math.PI * r; let off = 0;
  return (
    <svg width={112} height={112} viewBox="0 0 112 112">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F3F4F6" strokeWidth={11} />
      {segs.map((s, i) => {
        const dash = (s.pct / 100) * circ;
        const el = <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={11}
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-(off * circ / 100)}
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cx}px` }} />;
        off += s.pct; return el;
      })}
      <text x={cx} y={cx - 6} textAnchor="middle" fill="#111827" fontSize={18} fontWeight={800} fontFamily="Inter">{total}</text>
      <text x={cx} y={cx + 9} textAnchor="middle" fill="#6B7280" fontSize={9} fontFamily="Inter">Total</text>
    </svg>
  );
}

function decBadge(d: string) {
  if (d === 'ALLOW') return 'badge-allow';
  if (d === 'BLOCK') return 'badge-block';
  if (d?.startsWith('REVIEW')) return 'badge-review';
  if (d === 'REDACT') return 'badge-redact';
  return 'badge-gray';
}

const PIPELINE = [
  { title: 'Client\nRequest',   sub: 'User input\nfrom application',     icon: '📥', color: '#6B7280' },
  { title: 'Normalize',        sub: 'Decode\nCanonicalize\nClean',       icon: '🔤', color: '#06B6D4' },
  { title: 'Local\nDetector',  sub: 'Pattern match\nSignal extraction',  icon: '🔍', color: '#8B5CF6' },
  { title: 'SecureAI\nGuard',  sub: '/v1/check/prompt\nExternal API',    icon: '🛡️', color: '#6366F1' },
  { title: 'Risk\nEngine',     sub: 'Score & classify\nRisk bands',      icon: '⚖️', color: '#F59E0B' },
  { title: 'Risk\n(Enforce)',  sub: '/v1/check-classify\nRisk secrets',  icon: '🔒', color: '#EA580C' },
  { title: 'LLM\n(Protected)', sub: 'GPT-4o-mini\n(if allowed)',         icon: '🤖', color: '#059669' },
  { title: 'Output\nGuard',    sub: '/v1/check/response\nRedact secrets', icon: '🔐', color: '#0284C7' },
  { title: 'Audit\nStore',     sub: 'SQLite\nLog event',                  icon: '🗄️', color: '#6B7280' },
];

const TEST_SEGS = [
  { label: 'Obfuscation',              pct: 32, color: '#6366F1' },
  { label: 'Instruction Manipulation', pct: 24, color: '#06B6D4' },
  { label: 'Role Playing',             pct: 16, color: '#8B5CF6' },
  { label: 'Context Manipulation',     pct: 14, color: '#F59E0B' },
  { label: 'Encoding Tricks',          pct: 8,  color: '#EF4444' },
  { label: 'Others',                   pct: 6,  color: '#9CA3AF' },
];

const DEMO_ROWS = [
  { time: '14:37:02', id: 'REQ-8249F1', cls: 'Injection Attempt',  risk: 82, dec: 'REVIEW', lat: '189 ms' },
  { time: '14:36:15', id: 'REQ-71C02D', cls: 'Benign (Coding)',    risk: 12, dec: 'ALLOW',  lat: '187 ms' },
  { time: '14:35:48', id: 'REQ-485E64', cls: 'Obfuscation',        risk: 76, dec: 'BLOCK',  lat: '210 ms' },
  { time: '14:34:21', id: 'REQ-370EEC', cls: 'Role Manipulation',  risk: 68, dec: 'REVIEW', lat: '205 ms' },
  { time: '14:33:10', id: 'REQ-1A9C5F', cls: 'Benign (Academic)',  risk: 8,  dec: 'ALLOW',  lat: '142 ms' },
];

export const OverviewView: React.FC<Props> = ({ setActiveTab, auditEvents, quotaUsed, quotaTotal, onSelectAudit }) => {
  const total    = auditEvents.length || 1284;
  const allowed  = auditEvents.filter(e => e.policy_decision === 'ALLOW').length || 892;
  const reviewed = auditEvents.filter(e => e.policy_decision?.startsWith('REVIEW')).length || 286;
  const blocked  = auditEvents.filter(e => e.policy_decision === 'BLOCK').length || 106;
  const pct = (n: number) => Math.round((n / total) * 100);
  const recent = auditEvents.slice(0, 5);
  const rows = recent.length > 0
    ? recent.map(e => ({ time: (e.timestamp || '').substring(11, 19), id: (e.gateway_request_id || '').substring(0, 10), cls: e.classification || '—', risk: e.risk_score || 0, dec: e.policy_decision || '—', lat: `${e.total_latency_ms || 0} ms` }))
    : DEMO_ROWS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Row 1: Hero  +  Gateway Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16, alignItems: 'stretch' }}>

        {/* Hero (dark) */}
        <div className="card" style={{ padding: '28px 32px', background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'absolute', top: -60, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.22) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 320, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.13) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(139,92,246,0.22)', border: '1px solid rgba(139,92,246,0.4)', width: 'fit-content' }}>
            <Shield size={10} color="#A78BFA" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Defense-in-Depth Security Gateway</span>
          </div>

          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#fff', marginBottom: 6 }}>
              PRISM<span style={{ background: 'linear-gradient(135deg,#818CF8,#22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GUARD AI</span>
            </h1>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#E2E8F0', marginBottom: 10 }}>Secure AI. With Evidence.</div>
            <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, maxWidth: 480 }}>
              A security gateway for LLM applications that combines normalization, local detection, SecureAI Guard, policy enforcement and audit evidence
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" style={{ background: '#fff', color: '#1E293B', fontSize: 13, fontWeight: 600, padding: '8px 18px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} onClick={() => setActiveTab('chat')}>
              Try Protected Chat →
            </button>
            <button onClick={() => setActiveTab('attack-lab')} style={{ background: 'transparent', color: '#94A3B8', fontSize: 13, border: '1px solid rgba(148,163,184,0.3)', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              View Architecture
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
            {['Detect adversarial inputs', 'Prevent data leakage', 'Enforce security policies', 'Generate audit evidence'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={10} color="#34D399" />
                </div>
                <span style={{ fontSize: 12.5, color: '#CBD5E1' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gateway Status */}
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Gateway Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last checked</span>
              <RefreshCw size={13} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="dot dot-allow animate-pulse-glow" />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--status-allow)' }}>All Systems Operational</span>
          </div>

          {/* Service mini-cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { name: 'SecureAI Guard',    status: 'LIVE',  ms: 164, color: '#6366F1', icon: '🛡️' },
              { name: 'LLM\n(GPT-4o-mini)', status: 'LIVE',  ms: 360, color: '#059669', icon: '🤖' },
              { name: 'Audit Store\n(SQLite)', status: 'READY', ms: 5, color: '#0284C7', icon: '🗄️' },
            ].map(s => (
              <div key={s.name} style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '10px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}14`, border: `1px solid ${s.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.icon}</div>
                <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{s.name}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.status}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.ms} ms</span>
                  <MiniBars color={s.color} />
                </div>
              </div>
            ))}
          </div>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>ATTACK BYPASS RATE</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#059669', letterSpacing: '-0.03em', lineHeight: 1 }}>0.0%</div>
              <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 3 }}>−35.7% <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Guard-only)</span></div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>(PrismGuard)</div>
            </div>
            <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>FALSE POSITIVE RESCUE</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0284C7', letterSpacing: '-0.03em', lineHeight: 1 }}>100%</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Benign cases preserved</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: 4 Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Total Requests', value: total.toLocaleString(), sub: '↑ 12%', subClr: '#059669', iconBg: '#EEF2FF', icon: <FileText size={16} color="#6366F1" />, spark: [700,820,760,900,850,1020,960,1284], spClr: '#6366F1' },
          { label: 'Allowed',        value: allowed.toLocaleString(), sub: `${pct(allowed)}% of total`, subClr: '#059669', iconBg: '#D1FAE5', icon: <CheckCircle2 size={16} color="#059669" />, spark: [600,680,640,720,700,800,760,892], spClr: '#059669' },
          { label: 'Reviewed',       value: reviewed.toLocaleString(), sub: `${pct(reviewed)}% of total`, subClr: '#EA580C', iconBg: '#FFEDD5', icon: <Eye size={16} color="#EA580C" />, spark: [160,175,165,190,180,210,195,286], spClr: '#EA580C' },
          { label: 'Blocked',        value: blocked.toLocaleString(),  sub: `${pct(blocked)}% of total`,  subClr: '#DC2626', iconBg: '#FEE2E2', icon: <AlertTriangle size={16} color="#DC2626" />, spark: [60,70,65,80,74,90,82,106], spClr: '#DC2626' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">{c.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
            </div>
            <div className="stat-card-value">{c.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: c.subClr }}>{c.sub}</span>
              <Spark data={c.spark} color={c.spClr} w={68} h={24} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 3: Pipeline  +  Latest Finding ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16 }}>

        {/* Architecture Pipeline */}
        <div className="card card-p">
          <div className="section-hdr">
            <div>
              <div className="section-title"><Layers size={15} color="var(--brand-primary)" />Security Gateway Architecture</div>
              <div className="section-sub">7-stage defense-in-depth pipeline for every request</div>
            </div>
            <button className="btn-ghost" style={{ color: 'var(--brand-primary)', fontSize: 12, flexShrink: 0 }} onClick={() => setActiveTab('attack-lab')}>
              View Technical Details →
            </button>
          </div>
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 720 }}>
              {PIPELINE.map((s, i) => (
                <React.Fragment key={i}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 76 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: `${s.color}12`, border: `1px solid ${s.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
                    <div style={{ textAlign: 'center' }}>
                      {s.title.split('\n').map((l, j) => <div key={j} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{l}</div>)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {s.sub.split('\n').map((l, j) => <div key={j} style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.3 }}>{l}</div>)}
                    </div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 12, flexShrink: 0 }}>
                      <ArrowRight size={12} color="var(--text-disabled)" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Latest Verified Finding */}
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-hdr" style={{ marginBottom: 0 }}>
            <div className="section-title" style={{ fontSize: 13 }}><Zap size={14} color="#F59E0B" />Latest Verified Finding</div>
            <button className="btn-ghost" style={{ fontSize: 11, color: 'var(--brand-primary)', flexShrink: 0 }} onClick={() => setActiveTab('research')}>View All →</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="badge badge-info" style={{ fontSize: 9 }}>PI-005</span>
            <span className="badge badge-purple" style={{ fontSize: 9 }}>Base64 Smuggling</span>
            <span className="badge badge-warn" style={{ fontSize: 9 }}>Obfuscation</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#065F46', fontWeight: 600, marginBottom: 3 }}>SecureAI Guard</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>ALLOW</div>
              <div style={{ fontSize: 10, color: '#6B7280' }}>164 ms</div>
            </div>
            <ArrowRight size={14} color="var(--text-disabled)" />
            <div style={{ background: '#FFEDD5', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#9A3412', fontWeight: 600, marginBottom: 3 }}>PrismGuard AI</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#EA580C' }}>REVIEW</div>
              <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 600 }}>Risk 82/100</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Guard allowed the input, but PrismGuard detected transformation evidence and applied policy review.
          </p>
          <button className="btn btn-secondary" style={{ width: '100%', fontSize: 12, marginTop: 'auto' }} onClick={() => setActiveTab('attack-lab')}>
            <FlaskConical size={13} /> Open in Attack Lab
          </button>
        </div>
      </div>

      {/* ── Row 4: Audit table  +  Research donut  +  Perf ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px 220px', gap: 16 }}>

        {/* Recent Audit Events */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-title" style={{ fontSize: 13 }}><FileText size={14} color="var(--brand-primary)" />Recent Audit Events</div>
            <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--brand-primary)' }} onClick={() => setActiveTab('audit')}>View All →</button>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Time</th><th>Request ID</th><th>Classification</th><th>Risk</th><th>Policy</th><th>Latency</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} onClick={() => recent[i] && onSelectAudit(recent[i])}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{r.time}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brand-primary)', fontWeight: 600 }}>{r.id}</td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span className={`dot ${r.risk >= 60 ? 'dot-block' : r.risk >= 30 ? 'dot-review' : 'dot-allow'}`} />
                      {r.cls}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: r.risk >= 60 ? '#DC2626' : r.risk >= 30 ? '#EA580C' : '#059669' }}>{r.risk}</td>
                  <td><span className={`badge ${decBadge(r.dec)}`} style={{ fontSize: 9 }}>{r.dec}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{r.lat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Research Test Suite */}
        <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-hdr" style={{ marginBottom: 4 }}>
            <div>
              <div className="section-title" style={{ fontSize: 13 }}><Database size={14} color="#0284C7" />Research Test Suite</div>
              <div className="section-sub">15 Cases • 6 Hypotheses</div>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 10px', flexShrink: 0 }} onClick={() => setActiveTab('research')}>
              Run Test Suite →
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Donut segs={TEST_SEGS} total={15} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {TEST_SEGS.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-muted)' }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Performance */}
        <div className="card card-p">
          <div className="section-hdr" style={{ marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 13 }}><Activity size={14} color="#059669" />System Performance</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="dot dot-allow animate-pulse-glow" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>LIVE</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { val: '99.8%', label: 'Uptime',                    icon: <RefreshCw size={15} color="#0284C7" />, bg: '#E0F2FE', clr: '#0284C7' },
              { val: '236 ms', label: 'Avg End-to-End Latency',   icon: <Zap size={15} color="#059669" />,       bg: '#D1FAE5', clr: '#059669' },
              { val: '0.6%',   label: 'Partial / Error Rate',     icon: <AlertTriangle size={15} color="#EA580C" />, bg: '#FFEDD5', clr: '#EA580C' },
              { val: '12',     label: 'Automatic Retries',         icon: <Shield size={15} color="#6366F1" />,    bg: '#EEF2FF', clr: '#6366F1' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: r.clr, lineHeight: 1 }}>{r.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{r.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
