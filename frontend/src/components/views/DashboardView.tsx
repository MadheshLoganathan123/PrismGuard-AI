import React from 'react';
import { BarChart3, RefreshCw, Calendar, FileText, CheckCircle2, Eye, AlertTriangle, Zap, Database, GitBranch, Shield, RefreshCcw } from 'lucide-react';
import type { AuditEvent, TestCase } from '../../types';
import type { DomainRoutingEvent, ReviewItem, SimulatedModelUpdate } from '../../types/domainRouting';
import { DOMAIN_DEMO_METRICS } from '../../data/domainRoutingMockData';

interface Props {
  auditEvents: AuditEvent[];
  testCases: TestCase[];
  routingEvents?: DomainRoutingEvent[];
  reviewQueue?: ReviewItem[];
  modelUpdates?: SimulatedModelUpdate[];
}


/* ── Sparkline ── */
function Spark({ data, color, w = 72, h = 28 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 3) - 1}`);
  const id = `dsp${color.replace(/[^a-z0-9]/gi,'')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.2}/>
        <stop offset="100%" stopColor={color} stopOpacity={0}/>
      </linearGradient></defs>
      <path d={`M${pts.join('L')}L${w},${h}L0,${h}Z`} fill={`url(#${id})`}/>
      <path d={`M${pts.join('L')}`} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Bar chart ── */
function BarChart({ data, colors, labels, maxH = 120 }: { data: number[][]; colors: string[]; labels: string[]; maxH?: number }) {
  const overallMax = Math.max(...data.flat(), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: maxH, position: 'relative' }}>
      {/* Y-axis labels */}
      <div style={{ position: 'absolute', left: -28, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)' }}>
        {[100, 80, 60, 40, 20, 0].map(v => <span key={v}>{v}</span>)}
      </div>
      {labels.map((lbl, gi) => (
        <div key={gi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: maxH }}>
            {data.map((series, si) => (
              <div key={si} style={{
                width: 14, borderRadius: '3px 3px 0 0',
                height: `${(series[gi] / overallMax) * maxH}px`,
                background: colors[si], opacity: 0.85,
                transition: 'height 0.4s ease',
              }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{lbl}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut ── */
function Donut({ segs, total }: { segs: { pct: number; color: string; label: string; count: number }[]; total: number }) {
  const r = 54; const c = 68; const circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={136} height={136} viewBox="0 0 136 136">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#F3F4F6" strokeWidth={13}/>
        {segs.map((s, i) => {
          const dash = (s.pct / 100) * circ;
          const el = (<circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={13}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-(off * circ / 100)}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '68px 68px' }}/>);
          off += s.pct; return el;
        })}
        <text x={c} y={c - 7} textAnchor="middle" fill="#111827" fontSize={22} fontWeight={800} fontFamily="Inter">{total}</text>
        <text x={c} y={c + 8} textAnchor="middle" fill="#6B7280" fontSize={10} fontFamily="Inter">Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segs.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }}/>
            <span style={{ color: 'var(--text-secondary)', minWidth: 140 }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginLeft: 'auto' }}>{s.count} ({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function decisionBadge(d: string) {
  if (d === 'ALLOW') return 'badge-allow';
  if (d === 'BLOCK') return 'badge-block';
  if (d?.startsWith('REVIEW')) return 'badge-review';
  return 'badge-gray';
}

export const DashboardView: React.FC<Props> = ({ auditEvents, testCases: _testCases, reviewQueue = [], modelUpdates: _modelUpdates = [] }) => {

  const total    = auditEvents.length;
  const allowed  = auditEvents.filter(e => e.policy_decision === 'ALLOW').length;
  const reviewed = auditEvents.filter(e => e.policy_decision?.startsWith('REVIEW')).length;
  const blocked  = auditEvents.filter(e => e.policy_decision === 'BLOCK').length;
  const quota    = auditEvents.length;
  const quotaPct = Math.min(100, Math.round((quota / 120) * 100));
  const avgLat   = total > 0
    ? Math.round(auditEvents.reduce((acc, e) => acc + (e.total_latency_ms || 0), 0) / total)
    : 0;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const H_LABELS = ['Obfuscation\n(H1)', 'Instruction\nSmuggling (H2)', 'Multilingual\n(H3)', 'Payload Split\n(H4)', 'Partial/Error\n(H5)', 'Output Leakage\n(H6)'];
  const GUARD_DATA  = [35, 45, 50, 55, 40, 30];
  const PRISM_DATA  = [95, 92, 88, 90, 95, 98];
  const GUARD_DATA2 = [38, 42, 52, 50, 44, 35];
  const PRISM_DATA2 = [93, 90, 86, 88, 92, 96];

  const RISK_LABELS = ['0-20\n(LOW)', '21-40\n(MEDIUM)', '41-60\n(HIGH)', '61-80\n(HIGH)', '81-100\n(CRITICAL)'];
  const RISK_CNTS   = [
    auditEvents.filter(e => e.risk_score <= 20).length,
    auditEvents.filter(e => e.risk_score > 20 && e.risk_score <= 40).length,
    auditEvents.filter(e => e.risk_score > 40 && e.risk_score <= 60).length,
    auditEvents.filter(e => e.risk_score > 60 && e.risk_score <= 80).length,
    auditEvents.filter(e => e.risk_score > 80).length,
  ];
  const RISK_COLORS = ['#059669','#D97706','#EA580C','#DC2626','#7C3AED'];

  const STAGES = [
    { num: '01', name: 'Input Normalizer',       ms: 11,  color: '#06B6D4',  bar: 11/360 },
    { num: '02', name: 'Custom Detector',        ms: 14,  color: '#8B5CF6',  bar: 14/360 },
    { num: '03', name: 'SecureAI Guard',         ms: 165, color: '#6366F1',  bar: 165/360 },
    { num: '04', name: 'Risk & Policy Engine',   ms: 8,   color: '#F59E0B',  bar: 8/360 },
    { num: '05', name: 'LLM (GPT-4o-mini)',      ms: 360, color: '#059669',  bar: 1 },
    { num: '06', name: 'Output Guard + Redact',  ms: 135, color: '#0284C7',  bar: 135/360 },
    { num: '07', name: 'Audit & Telemetry',      ms: 5,   color: '#9CA3AF',  bar: 5/360 },
  ];

  return (
    <div className="simple-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background: '#EEF2FF' }}>
            <BarChart3 size={22} color="var(--brand-primary)" />
          </div>
          <div>
            <div className="page-header-title">Security Dashboard</div>
            <div className="page-header-sub">Real-time analytics and performance metrics from the PrismGuard AI security gateway.</div>
          </div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 7, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <Calendar size={14} /> Live Gateway Telemetry
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh Data
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
        {[
          { label:'Total Requests', value: total.toLocaleString(), sub: total > 0 ? `${total} recorded` : '0', subClr:'#059669', icon:<FileText size={15} color="#6366F1"/>, bg:'#EEF2FF', spark:[Math.max(0, total-3), Math.max(0, total-2), Math.max(0, total-1), total], spClr:'#6366F1' },
          { label:'Allowed',        value: allowed.toLocaleString(), sub:`${pct(allowed)}% of total`, subClr:'#059669', icon:<CheckCircle2 size={15} color="#059669"/>, bg:'#D1FAE5', spark:[Math.max(0, allowed-2), Math.max(0, allowed-1), allowed], spClr:'#059669' },
          { label:'Reviewed',       value: reviewed.toLocaleString(), sub:`${pct(reviewed)}% of total`, subClr:'#EA580C', icon:<Eye size={15} color="#EA580C"/>, bg:'#FFEDD5', spark:[Math.max(0, reviewed-2), Math.max(0, reviewed-1), reviewed], spClr:'#EA580C' },
          { label:'Blocked',        value: blocked.toLocaleString(), sub:`${pct(blocked)}% of total`, subClr:'#DC2626', icon:<AlertTriangle size={15} color="#DC2626"/>, bg:'#FEE2E2', spark:[Math.max(0, blocked-2), Math.max(0, blocked-1), blocked], spClr:'#DC2626' },
          { label:'Avg End-to-End Latency', value:`${avgLat} ms`, sub: total > 0 ? 'Live average' : 'N/A', subClr:'#059669', icon:<Zap size={15} color="#D97706"/>, bg:'#FEF3C7', spark:[avgLat, avgLat], spClr:'#D97706' },
          { label:'Guard API Usage', value:`${quota} / 120`, sub:`${quotaPct}% of daily quota`, subClr:'var(--text-muted)', icon:<Database size={15} color="#0284C7"/>, bg:'#E0F2FE', spark:[0, quota], spClr:'#0284C7', isProgress: true },
        ].map((c: any) => (
          <div key={c.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</span>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{c.value}</div>
            {c.isProgress
              ? <div className="prog-track" style={{ marginTop: 6 }}><div className="prog-fill" style={{ width: '35%', background: '#0284C7' }} /></div>
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c.subClr }}>{c.sub}</span>
                  <Spark data={c.spark} color={c.spClr} w={60} h={22} />
                </div>
            }
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Decision Distribution */}
        <div className="card card-p">
          <div className="section-hdr">
            <div>
              <div className="section-title">Gateway Decision Distribution</div>
              <div className="section-sub">Distribution of policy decisions across all requests</div>
            </div>
            <select className="select" style={{ fontSize: 11, padding: '4px 8px' }}>
              <option>Last 7 Days</option>
            </select>
          </div>
          <Donut segs={[
            { label: 'ALLOW', pct: pct(allowed), count: allowed, color: '#059669' },
            { label: 'REVIEW', pct: pct(reviewed), count: reviewed, color: '#EA580C' },
            { label: 'BLOCK', pct: pct(blocked), count: blocked, color: '#DC2626' },
            { label: 'REDACT', pct: 0, count: 0, color: '#7C3AED' },
            { label: 'REVIEW_GUARD_BLOCK', pct: 0, count: 0, color: '#F59E0B' },
          ]} total={total} />
        </div>

        {/* Guard-only vs PrismGuard bar */}
        <div className="card card-p">
          <div className="section-hdr">
            <div>
              <div className="section-title">Guard-only vs PrismGuard</div>
              <div className="section-sub">Attack detection comparison (from research test suite)</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {[['#D1D5DB','SecureAI Guard'],['#6366F1','PrismGuard AI']].map(([clr,lbl])=>(
              <div key={lbl as string} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
                <div style={{ width:10, height:10, borderRadius:2, background: clr as string }}/>
                {lbl}
              </div>
            ))}
          </div>
          <div style={{ paddingLeft: 32, position: 'relative' }}>
            <BarChart data={[GUARD_DATA, PRISM_DATA]} colors={['#D1D5DB','#6366F1']} labels={H_LABELS} maxH={110} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: 32 }}>
            {H_LABELS.map(l => <span key={l} style={{ fontSize: 8.5, color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>{l.split('\n')[0]}</span>)}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="card card-p">
          <div className="section-hdr">
            <div>
              <div className="section-title">Risk Score Distribution</div>
              <div className="section-sub">Distribution of risk scores for all requests</div>
            </div>
          </div>
          <div style={{ paddingLeft: 36, paddingBottom: 4, position: 'relative', marginTop: 8 }}>
            {/* Y-axis */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)' }}>
              {[250,200,150,100,50,0].map(v=><span key={v}>{v}</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {RISK_CNTS.map((cnt, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: RISK_COLORS[i], height: `${(cnt / 250) * 120}px`, transition: 'height 0.4s' }}/>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{cnt}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {RISK_LABELS.map(l=><span key={l} style={{ flex:1, fontSize:8.5, color:'var(--text-muted)', textAlign:'center', lineHeight:1.3 }}>{l}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Stage Latency */}
        <div className="card card-p">
          <div className="section-hdr">
            <div>
              <div className="section-title">Stage Latency Waterfall</div>
              <div className="section-sub">Average latency for each stage in the 7-stage pipeline</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STAGES.map(s => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 24, flexShrink: 0 }}>{s.num}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', minWidth: 160 }}>{s.name}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(3, s.bar * 100)}%`, background: s.color, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-muted)', width: 38, textAlign: 'right' }}>{s.ms} ms</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detection Rate by Attack Class */}
        <div className="card card-p">
          <div className="section-hdr">
            <div>
              <div className="section-title">Detection Rate by Attack Class</div>
              <div className="section-sub">From research test suite (15 cases)</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            {[['#D1D5DB','SecureAI Guard'],['#6366F1','PrismGuard AI']].map(([clr,lbl])=>(
              <div key={lbl as string} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-muted)'}}>
                <div style={{width:10,height:10,borderRadius:2,background:clr as string}}/>{lbl}
              </div>
            ))}
          </div>
          <div style={{ paddingLeft: 32, position: 'relative' }}>
            <BarChart data={[GUARD_DATA2, PRISM_DATA2]} colors={['#D1D5DB','#6366F1']} labels={H_LABELS.map(l => l.split('\n')[0])} maxH={100} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-title" style={{ fontSize: 13 }}>Recent Activity</div>
            <button className="btn-ghost" style={{ fontSize: 11, color: 'var(--brand-primary)' }}>View All →</button>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Time</th><th>Request ID</th><th>Decision</th><th>Risk</th><th>Latency</th></tr>
            </thead>
            <tbody>
              {auditEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 12 }}>
                    No audit events recorded in database yet.
                  </td>
                </tr>
              ) : (
                auditEvents.slice(0, 5).map((evt) => (
                  <tr key={evt.id || evt.gateway_request_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {(evt.timestamp || '').substring(11, 19) || evt.timestamp}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brand-primary)', fontWeight: 600 }}>
                      {evt.gateway_request_id?.substring(0, 10) || evt.id}
                    </td>
                    <td><span className={`badge ${decisionBadge(evt.policy_decision)}`} style={{ fontSize: 9 }}>{evt.policy_decision}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: evt.risk_score >= 60 ? '#DC2626' : evt.risk_score >= 30 ? '#EA580C' : '#059669' }}>{evt.risk_score}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{evt.total_latency_ms} ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Domain Routing Metrics ── */}
      <div className="card card-p" style={{ marginTop: 0 }}>
        <div className="section-hdr">
          <div>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GitBranch size={15} color="#4F46E5" /> Domain Routing &amp; Data Boundary Metrics
            </div>
            <div className="section-sub">Simulated telemetry — labeled demo dataset, not real domain system access</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 5, background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>SIMULATED DEMO</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr) repeat(3,1fr)', gap: 12, marginTop: 8 }}>
          {[
            { label: 'Banking', value: DOMAIN_DEMO_METRICS.banking, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Government', value: DOMAIN_DEMO_METRICS.government, color: '#0284C7', bg: '#E0F2FE' },
            { label: 'Company', value: DOMAIN_DEMO_METRICS.company, color: '#D97706', bg: '#FEF3C7' },
            { label: 'Other Resources', value: DOMAIN_DEMO_METRICS.other, color: '#7C3AED', bg: '#EDE9FE' },
            { label: 'Held for Review', value: DOMAIN_DEMO_METRICS.heldForReview, color: '#EA580C', bg: '#FFEDD5' },
            { label: 'Blocked Before Routing', value: DOMAIN_DEMO_METRICS.blockedBeforeRouting, color: '#DC2626', bg: '#FEE2E2' },
            { label: 'Cross-Domain Blocked', value: DOMAIN_DEMO_METRICS.crossDomainBlocked, color: '#7C3AED', bg: '#F5F3FF' },
          ].map(m => (
            <div key={m.label} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${m.bg === '#EFF6FF' ? '#DBEAFE' : '#E2E8F0'}`, background: m.bg }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: m.color, marginTop: 2 }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
          <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Avg Router Confidence</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{DOMAIN_DEMO_METRICS.averageConfidence}%</div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Pending Reviews</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#EA580C' }}>{reviewQueue.filter(r => r.status === 'PENDING').length || DOMAIN_DEMO_METRICS.pendingReviews}</div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Regression Pass Rate (simulated)</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>{DOMAIN_DEMO_METRICS.regressionPassRate}%</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: '#94A3B8', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={10} /> Synthetic read-only resources — no real Banking/Government/Company data</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCcw size={10} /> No real ML retraining — simulation mode</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Database size={10} /> {DOMAIN_DEMO_METRICS.label}</span>
        </div>
      </div>
    </div>
  );
};
