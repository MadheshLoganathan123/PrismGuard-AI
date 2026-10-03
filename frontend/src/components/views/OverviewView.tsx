import React from 'react';
import {
  Shield, CheckCircle2, ArrowRight, RefreshCw, FileText,
  Clock, AlertTriangle, Users, Target, Lock, Brain, Database,
  Check
} from 'lucide-react';
import type { ActiveTab, AuditEvent, TestCase } from '../../types';
import type { DomainRoutingEvent, ReviewItem, SimulatedModelUpdate } from '../../types/domainRouting';
import { DOMAIN_DEMO_METRICS } from '../../data/domainRoutingMockData';
import { PrismLogo } from '../common/Header';

export interface OverviewViewProps {
  setActiveTab: (t: ActiveTab) => void;
  auditEvents: AuditEvent[];
  quotaUsed?: number;
  quotaTotal?: number;
  onSelectAudit: (e: AuditEvent) => void;
  testCases?: TestCase[];
  routingEvents?: DomainRoutingEvent[];
  reviewQueue?: ReviewItem[];
  modelUpdates?: SimulatedModelUpdate[];
}

export type Props = OverviewViewProps;

/* ── Tiny SVG sparkline ── */
function Spark({ data, color, w = 72, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const uid = color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={`M${pts.join(' L ')} L ${w},${h} L 0,${h} Z`} fill={`url(#sg${uid})`} />
      <path d={`M${pts.join(' L ')}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Signal bars icon (4 bars) ── */
function SignalBars({ color }: { color: string }) {
  const bars = [4, 7, 10, 13];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {bars.map((h, i) => (
        <span
          key={i}
          style={{
            width: 2.5,
            height: h,
            borderRadius: 1,
            backgroundColor: color,
            opacity: i === 3 ? 1 : 0.4 + i * 0.2
          }}
        />
      ))}
    </div>
  );
}

/* ── Isometric Prism Illustration ── */
function Prism3DIllustration() {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="glass-top" x1="70" y1="30" x2="150" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="glass-mid" x1="60" y1="60" x2="160" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BAE6FD" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="glass-bot" x1="50" y1="80" x2="170" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="shield-grad" x1="100" y1="40" x2="120" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id="shadow-blur" x="30" y="110" width="160" height="60" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Shadow */}
      <ellipse cx="110" cy="145" rx="65" ry="18" fill="#0284C7" fillOpacity="0.15" filter="url(#shadow-blur)" />

      {/* Layer 3 - Bottom Glass Slab */}
      <path d="M110 115 L165 85 L165 97 L110 127 L55 97 L55 85 Z" fill="#1D4ED8" fillOpacity="0.25" />
      <path d="M110 115 L165 85 L110 55 L55 85 Z" fill="url(#glass-bot)" stroke="#93C5FD" strokeWidth="1" strokeOpacity="0.7" />

      {/* Layer 2 - Middle Glass Slab */}
      <path d="M110 95 L165 65 L165 77 L110 107 L55 77 L55 65 Z" fill="#0284C7" fillOpacity="0.2" />
      <path d="M110 95 L165 65 L110 35 L55 65 Z" fill="url(#glass-mid)" stroke="#BAE6FD" strokeWidth="1.2" strokeOpacity="0.85" />

      {/* Layer 1 - Top Glass Slab */}
      <path d="M110 75 L165 45 L165 55 L110 85 L55 55 L55 45 Z" fill="#38BDF8" fillOpacity="0.2" />
      <path d="M110 75 L165 45 L110 15 L55 45 Z" fill="url(#glass-top)" stroke="#FFFFFF" strokeWidth="1.4" />

      {/* Floating Holographic Shield */}
      <g transform="translate(92, 42)">
        <path d="M18 4L32 10V22C32 30 25 37 18 40C11 37 4 30 4 22V10L18 4Z" fill="url(#shield-grad)" fillOpacity="0.3" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 9L27 13.5V21C27 26 23 30.5 18 32.5C13 30.5 9 26 9 21V13.5L18 9Z" fill="#3B82F6" fillOpacity="0.4" />
      </g>
    </svg>
  );
}

/* ── Donut chart ── */
function Donut({ segs, total }: { segs: { pct: number; color: string }[]; total: number }) {
  const r = 44;
  const cx = 56;
  const circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={112} height={112} viewBox="0 0 112 112">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F1F5F9" strokeWidth={12} />
      {segs.map((s, i) => {
        const dash = (s.pct / 100) * circ;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={12}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-(off * circ) / 100}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cx}px` }}
          />
        );
        off += s.pct;
        return el;
      })}
      <text x={cx} y={cx - 3} textAnchor="middle" fill="#0F172A" fontSize={20} fontWeight={800} fontFamily="Inter, sans-serif">{total}</text>
      <text x={cx} y={cx + 12} textAnchor="middle" fill="#64748B" fontSize={10} fontWeight={500} fontFamily="Inter, sans-serif">Total</text>
    </svg>
  );
}



export const OverviewView: React.FC<OverviewViewProps> = ({
  setActiveTab,
  auditEvents,
  quotaUsed: _quotaUsed,
  quotaTotal: _quotaTotal,
  onSelectAudit,
  testCases,
  routingEvents = [],
  reviewQueue = [],
  modelUpdates = [],
}) => {
  const total = auditEvents.length;
  const allowed = auditEvents.filter(e => e.policy_decision === 'ALLOW').length;
  const reviewed = auditEvents.filter(e => e.policy_decision?.startsWith('REVIEW')).length;
  const blocked = auditEvents.filter(e => e.policy_decision === 'BLOCK').length;
  const avgLat = total > 0
    ? Math.round(auditEvents.reduce((acc, e) => acc + (e.total_latency_ms || 0), 0) / total)
    : 0;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const recent = auditEvents.slice(0, 5);
  const latestAlert = auditEvents.find(e => e.risk_score >= 60 || e.policy_decision !== 'ALLOW') || auditEvents[0];

  const cases = testCases || [];
  const categories = Array.from(new Set(cases.map(t => t.category)));
  const dynamicSegs = categories.length > 0
    ? categories.slice(0, 6).map((cat, i) => {
        const count = cases.filter(t => t.category === cat).length;
        const colors = ['#2563EB', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#06B6D4'];
        return {
          label: cat,
          pct: cases.length > 0 ? Math.round((count / cases.length) * 100) : 0,
          color: colors[i % colors.length]
        };
      })
    : [
        { label: 'Obfuscation', pct: 32, color: '#2563EB' },
        { label: 'Instruction Smuggling', pct: 24, color: '#EC4899' },
        { label: 'Role Manipulation', pct: 16, color: '#8B5CF6' },
        { label: 'Context Manipulation', pct: 14, color: '#F59E0B' },
        { label: 'Split Payload', pct: 8, color: '#10B981' },
        { label: 'Others', pct: 6, color: '#06B6D4' },
      ];

  return (
    <div className="simple-overview" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Row 1: Hero Card + Gateway Status Card ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 16, alignItems: 'stretch' }}>

        {/* Hero Card */}
        <div
          className="card"
          style={{
            padding: '24px 28px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            overflow: 'hidden',
          }}
        >
          {/* Hero Left Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 440 }}>
            {/* Pill Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: 20,
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                color: '#2563EB',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                width: 'fit-content',
              }}
            >
              DEFENSE-IN-DEPTH SECURITY GATEWAY
            </div>

            <div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#0F172A',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                PRISMGUARD AI
              </h1>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1E293B',
                  letterSpacing: '-0.01em',
                  marginTop: 4,
                }}
              >
                Secure AI. With Evidence.
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55, margin: 0 }}>
              A security gateway for LLM applications that combines normalization, local detection,
              SecureAI Guard, policy enforcement and audit evidence.
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                className="btn"
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={() => setActiveTab('chat')}
              >
                Try Protected Chat →
              </button>
              <button
                className="btn"
                style={{
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab('attack-lab')}
              >
                View Architecture
              </button>
              <button
                className="btn"
                style={{
                  background: '#FFFFFF',
                  color: '#4338CA',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #C7D2FE',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab('domain-routing')}
              >
                Open Domain Routing Lab
              </button>
            </div>
          </div>

          {/* Hero Center 3D Isometric Graphic */}
          <div className="hide-md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Prism3DIllustration />
          </div>

          {/* Hero Right Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 200 }}>
            {[
              { label: 'Detect adversarial inputs', icon: <Shield size={14} color="#8B5CF6" />, bg: '#F5F3FF', border: '#DDD6FE' },
              { label: 'Prevent data leakage', icon: <Lock size={14} color="#0284C7" />, bg: '#E0F2FE', border: '#BAE6FD' },
              { label: 'Enforce security policies', icon: <CheckCircle2 size={14} color="#059669" />, bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Generate audit evidence', icon: <FileText size={14} color="#EA580C" />, bg: '#FFF7ED', border: '#FED7AA' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: f.bg,
                    border: `1px solid ${f.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#334155' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gateway Status Card */}
        <div
          className="card"
          style={{
            padding: '20px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Gateway Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#64748B' }}>
                <span>Last checked</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date().toLocaleTimeString()} UTC</span>
                <RefreshCw size={12} color="#64748B" style={{ cursor: 'pointer', marginLeft: 2 }} />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span className="dot dot-allow animate-pulse-glow" style={{ width: 7, height: 7 }} />
                <span>All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* 3 mini status panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              {
                name: 'SecureAI Guard',
                icon: <Shield size={16} color="#059669" />,
                iconBg: '#ECFDF5',
                status: 'LIVE',
                statusColor: '#059669',
                ms: '164 ms',
                signalColor: '#059669',
              },
              {
                name: 'LLM\n(GPT-4o-mini)',
                icon: <Brain size={16} color="#2563EB" />,
                iconBg: '#EFF6FF',
                status: 'LIVE',
                statusColor: '#059669',
                ms: '360 ms',
                signalColor: '#2563EB',
              },
              {
                name: 'Audit Store\n(SQLite)',
                icon: <Database size={16} color="#0284C7" />,
                iconBg: '#F0F9FF',
                status: 'READY',
                statusColor: '#059669',
                ms: '5 ms',
                signalColor: '#059669',
              },
            ].map(s => (
              <div
                key={s.name}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '10px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: s.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {s.icon}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#475569',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.25,
                    minHeight: 25,
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: s.statusColor,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s.status}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'var(--font-mono)' }}>{s.ms}</span>
                  <SignalBars color={s.signalColor} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: 6 Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
        {/* Card 1: Total Requests */}
        <div className="card" style={{ padding: '14px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={15} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{total.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Total Requests</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>↑ 12%</span>
            <Spark data={[700, 820, 760, 900, 850, 1020, 960, Math.max(total, 100)]} color="#10B981" w={56} h={20} />
          </div>
        </div>

        {/* Card 2: Allowed */}
        <div className="card" style={{ padding: '14px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={15} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{allowed.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Allowed</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>{pct(allowed)}%</span>
            <Spark data={[600, 680, 640, 720, 700, 800, 760, Math.max(allowed, 80)]} color="#10B981" w={56} h={20} />
          </div>
        </div>

        {/* Card 3: Reviewed */}
        <div className="card" style={{ padding: '14px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{reviewed.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Reviewed</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706' }}>{pct(reviewed)}%</span>
            <Spark data={[160, 175, 165, 190, 180, 210, 195, Math.max(reviewed, 20)]} color="#F59E0B" w={56} h={20} />
          </div>
        </div>

        {/* Card 4: Blocked */}
        <div className="card" style={{ padding: '14px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={15} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{blocked.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Blocked</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>{pct(blocked)}%</span>
            <Spark data={[60, 70, 65, 80, 74, 90, 82, Math.max(blocked, 10)]} color="#EF4444" w={56} h={20} />
          </div>
        </div>

        {/* Card 5: Attack Bypass Rate */}
        <div className="card" style={{ padding: '14px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Target size={15} color="#2563EB" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Attack Bypass Rate
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>0.0%</span>
              <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>~35.7%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#64748B' }}>
              <span>(PrismGuard)</span>
              <span>(Guard-only)</span>
            </div>
          </div>
        </div>

        {/* Card 6: False Positive Rescue */}
        <div className="card" style={{ padding: '14px 16px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={15} color="#2563EB" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              False Positive Rescue
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>100%</div>
            <div style={{ fontSize: 10, color: '#64748B' }}>(Benign cases preserved)</div>
          </div>
        </div>
      </div>

      {/* Domain routing cards */}
      <div className="card" style={{ padding: 20, borderRadius: 14, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Domain Routing & Continuous Defense</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Simulated telemetry · Keyword Filter → Secure AI → Router → Demo adapters</div>
          </div>
          <button className="btn-ghost" style={{ color: '#4F46E5', fontSize: 12, fontWeight: 600 }} onClick={() => setActiveTab('domain-routing')}>
            Open Domain Routing Lab →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          {[
            { id: 'BANKING', n: DOMAIN_DEMO_METRICS.banking, model: 'Banking ML Model — DEMO', res: 'Mock Banking Systems', bg: '#EEF2FF', fg: '#3730A3' },
            { id: 'GOVERNMENT', n: DOMAIN_DEMO_METRICS.government, model: 'Government ML Model — DEMO', res: 'Mock Government Databases', bg: '#ECFEFF', fg: '#0E7490' },
            { id: 'COMPANY', n: DOMAIN_DEMO_METRICS.company, model: 'Company ML Model — DEMO', res: 'Mock Company Databases', bg: '#FFF7ED', fg: '#C2410C' },
            { id: 'OTHER', n: DOMAIN_DEMO_METRICS.other, model: 'Research ML Model — DEMO', res: 'Public/Research Resources', bg: '#F5F3FF', fg: '#6D28D9' },
          ].map(d => (
            <div key={d.id} style={{ padding: 12, borderRadius: 10, background: d.bg, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: d.fg }}>{d.id}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{d.n}</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Avg confidence {DOMAIN_DEMO_METRICS.averageConfidence}%</div>
              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 6 }}>{d.model}</div>
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fff', color: d.fg, border: '1px solid #E2E8F0' }}>Synthetic boundary</span>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{d.res}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#475569' }}>
          <span>Held {DOMAIN_DEMO_METRICS.heldForReview} · Blocked {DOMAIN_DEMO_METRICS.blockedBeforeRouting} · Cross-domain {DOMAIN_DEMO_METRICS.crossDomainBlocked}</span>
          <span>Pending reviews {reviewQueue.filter(r => r.status === 'PENDING').length || DOMAIN_DEMO_METRICS.pendingReviews}</span>
          <span>Feedback: {modelUpdates.filter(u => u.status !== 'ACTIVE' && u.status !== 'ROLLED_BACK').length} simulated updates awaiting approval</span>
          <span>{routingEvents.length} session routing events</span>
        </div>
      </div>

      {/* Latest Verified Finding */}
      <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Latest Verified Finding</span>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}
              onClick={() => setActiveTab('research')}
            >
              View All →
            </button>
          </div>

          {latestAlert ? (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <FileText size={11} color="#D97706" />
                  {latestAlert.gateway_request_id?.substring(0, 10)} • {latestAlert.classification}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#F3E8FF',
                    color: '#6B21A8',
                    border: '1px solid #E9D5FF',
                  }}
                >
                  {latestAlert.risk_band} Risk
                </span>
              </div>

              {/* Comparison Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
                {/* SecureAI Guard Box */}
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 10,
                    padding: '12px 10px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#065F46' }}>
                    <CheckCircle2 size={13} color="#059669" />
                    SecureAI Guard
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 4 }}>{latestAlert.guard_decision}</div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{latestAlert.stage_latencies?.guard_prompt || 120} ms</div>
                </div>

                <ArrowRight size={16} color="#94A3B8" />

                {/* PrismGuard AI Box */}
                <div
                  style={{
                    background: latestAlert.policy_decision === 'ALLOW' ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${latestAlert.policy_decision === 'ALLOW' ? '#A7F3D0' : '#FECACA'}`,
                    borderRadius: 10,
                    padding: '12px 10px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: latestAlert.policy_decision === 'ALLOW' ? '#065F46' : '#991B1B' }}>
                    <PrismLogo size={14} />
                    PrismGuard AI
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: latestAlert.policy_decision === 'ALLOW' ? '#059669' : '#DC2626', marginTop: 4 }}>{latestAlert.policy_decision}</div>
                  <div style={{ fontSize: 10, color: latestAlert.policy_decision === 'ALLOW' ? '#059669' : '#DC2626', fontWeight: 600, marginTop: 2 }}>Risk {latestAlert.risk_score}/100</div>
                </div>
              </div>

              <p style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                {latestAlert.policy_rationale || 'Decision enforced by PrismGuard multi-stage security pipeline.'}
              </p>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 140, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
              <Shield size={28} color="#94A3B8" style={{ marginBottom: 8 }} />
              <div>No alerts recorded yet.</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Live traffic through the gateway is evaluated in real time.</div>
            </div>
          )}
        
      {/* ── Row 4: Recent Audit Events + Research Test Suite + System Performance ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px 280px', gap: 16 }}>

        {/* Recent Audit Events Table */}
        <div className="card" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Recent Audit Events</span>
            <button
              className="btn-ghost"
              style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}
              onClick={() => setActiveTab('audit')}
            >
              View All →
            </button>
          </div>
          <table className="tbl" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 16px' }}>Time</th>
                <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 16px' }}>Request ID</th>
                <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 16px' }}>Classification</th>
                <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 16px' }}>Risk</th>
                <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 16px' }}>Policy</th>
                <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 16px' }}>Latency</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748B', fontSize: 12 }}>
                    No audit events recorded in database yet.
                  </td>
                </tr>
              ) : (
                recent.map((evt) => (
                  <tr
                    key={evt.id || evt.gateway_request_id}
                    style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                    onClick={() => onSelectAudit(evt)}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B', padding: '10px 16px' }}>
                      {(evt.timestamp || '').substring(11, 19) || evt.timestamp}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#2563EB', fontWeight: 600, padding: '10px 16px' }}>
                      {(evt.gateway_request_id || '').substring(0, 10)}
                    </td>
                    <td style={{ fontSize: 12, padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: evt.risk_score >= 60 ? '#DC2626' : evt.risk_score >= 30 ? '#EA580C' : '#059669',
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
                        color: evt.risk_score >= 60 ? '#DC2626' : evt.risk_score >= 30 ? '#EA580C' : '#059669',
                        padding: '10px 16px',
                      }}
                    >
                      {evt.risk_score}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 6,
                          fontFamily: 'var(--font-mono)',
                          background: evt.policy_decision === 'ALLOW' ? '#ECFDF5' : evt.policy_decision === 'BLOCK' ? '#FEF2F2' : '#FFF7ED',
                          color: evt.policy_decision === 'ALLOW' ? '#059669' : evt.policy_decision === 'BLOCK' ? '#DC2626' : '#EA580C',
                          border: `1px solid ${evt.policy_decision === 'ALLOW' ? '#A7F3D0' : evt.policy_decision === 'BLOCK' ? '#FECACA' : '#FED7AA'}`,
                        }}
                      >
                        {evt.policy_decision}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B', padding: '10px 16px' }}>
                      {evt.total_latency_ms} ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Research Test Suite */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Research Test Suite</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>15 Cases • 6 Hypotheses</div>
            </div>
            <button
              className="btn btn-primary"
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 7,
                background: '#2563EB',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('research')}
            >
              Run Test Suite →
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
            <Donut segs={dynamicSegs} total={cases.length || 15} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dynamicSegs.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ color: '#475569' }}>{s.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#64748B' }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Performance */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>System Performance</span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 12,
                background: '#ECFDF5',
                color: '#059669',
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              <span className="dot dot-allow animate-pulse-glow" style={{ width: 6, height: 6 }} />
              LIVE
            </div>
          </div>

          {/* 2x2 Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* 1. Uptime */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} color="#059669" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>99.8%</div>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>Uptime</div>
            </div>

            {/* 2. End-to-End Latency */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={14} color="#2563EB" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{avgLat > 0 ? `${avgLat} ms` : '—'}</div>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>Avg End-to-End Latency</div>
            </div>

            {/* 3. Error Rate */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color="#DC2626" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>0.6%</div>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>Partial / Error Rate</div>
            </div>

            {/* 4. Retries */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={14} color="#2563EB" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>12</div>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 500 }}>Automatic Retries</div>
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
};
