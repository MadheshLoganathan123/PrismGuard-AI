import React from 'react';
import { HeartPulse, RefreshCw, ShieldCheck, Activity, Zap, Database, Shield, AlertTriangle } from 'lucide-react';
import type { ServiceHealth } from '../../types';

interface HealthViewProps {
  healthStatuses: ServiceHealth[];
  onRefreshHealth: () => void;
  isProcessing: boolean;
}

function statusColor(status: string) {
  if (status === 'READY' || status === 'LIVE') return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', dot: '#059669' };
  if (status === 'DEGRADED' || status === 'CONFIG_REQUIRED') return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', dot: '#D97706' };
  return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB', dot: '#9CA3AF' };
}

export const HealthView: React.FC<HealthViewProps> = ({ healthStatuses, onRefreshHealth, isProcessing }) => {
  const allHealthy = healthStatuses.every(s => s.status === 'READY' || s.status === 'LIVE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background: '#D1FAE5' }}>
            <HeartPulse size={22} color="#059669" />
          </div>
          <div>
            <div className="page-header-title">System Health &amp; Operational Resilience</div>
            <div className="page-header-sub">Real-time telemetry and fault tolerance status across the PrismGuard AI defense grid.</div>
          </div>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: allHealthy ? '#D1FAE5' : '#FEF3C7', border: `1px solid ${allHealthy ? '#A7F3D0' : '#FDE68A'}`, borderRadius: 8 }}>
            <span className={`dot ${allHealthy ? 'dot-allow' : 'dot-warn'} animate-pulse-glow`} />
            <span style={{ fontSize: 12, fontWeight: 600, color: allHealthy ? '#065F46' : '#92400E' }}>
              {allHealthy ? 'All Systems Operational' : 'Partial Degradation'}
            </span>
          </div>
          <button onClick={onRefreshHealth} disabled={isProcessing} className="btn btn-secondary" style={{ fontSize: 12 }}>
            <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
            {isProcessing ? 'Probing Endpoints...' : 'Re-check All Services'}
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {healthStatuses.map(svc => {
          const clr = statusColor(svc.status);
          return (
            <div key={svc.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: clr.dot }} className="animate-pulse-glow" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{svc.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: clr.bg, color: clr.text, border: `1px solid ${clr.border}`, fontFamily: 'var(--font-mono)' }}>
                  {svc.status}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{svc.details}</div>

              {svc.endpoint && (
                <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {svc.endpoint}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 10, marginTop: 'auto' }}>
                <span>Ping: <strong style={{ color: 'var(--text-primary)' }}>{svc.latency_ms}ms</strong></span>
                <span>Checked: {svc.last_checked}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fault Tolerance Policy */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldCheck size={18} color="var(--brand-cyan)" />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Fault Tolerance &amp; Graceful Degradation Policy (H5)</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {[
            {
              icon: <Shield size={16} color="#DC2626" />,
              iconBg: '#FEE2E2',
              title: '1. Fail-Closed on Critical Outage',
              titleColor: '#991B1B',
              body: 'If SecureAI Guard returns HTTP 502/503 or network timeout during high-risk prompt screening, the gateway refuses fail-open execution and diverts to quarantine.',
            },
            {
              icon: <AlertTriangle size={16} color="#D97706" />,
              iconBg: '#FEF3C7',
              title: '2. Ambiguous & Partial Safety Review',
              titleColor: '#92400E',
              body: 'When Guard reports status=partial, PrismGuard tags the request with REVIEW_GUARD_BLOCK and preserves developer utility via bounded sandbox evaluation.',
            },
            {
              icon: <Activity size={16} color="#6366F1" />,
              iconBg: '#EEF2FF',
              title: '3. Rate Limiting & Retry-After Adherence',
              titleColor: '#4338CA',
              body: 'Exponential backoff respecting Retry-After headers prevents quota exhaustion and avoids repeat authentication loops on HTTP 401.',
            },
          ].map(card => (
            <div key={card.title} style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-light)', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: card.titleColor }}>{card.title}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{card.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { val: '99.8%', label: 'Uptime SLA', icon: <RefreshCw size={16} color="#0284C7" />, bg: '#E0F2FE', clr: '#0284C7' },
          { val: '236 ms', label: 'Avg End-to-End Latency', icon: <Zap size={16} color="#059669" />, bg: '#D1FAE5', clr: '#059669' },
          { val: '0.6%', label: 'Partial / Error Rate', icon: <AlertTriangle size={16} color="#EA580C" />, bg: '#FFEDD5', clr: '#EA580C' },
          { val: '12', label: 'Automatic Retries', icon: <Shield size={16} color="#6366F1" />, bg: '#EEF2FF', clr: '#6366F1' },
        ].map(r => (
          <div key={r.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.icon}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: r.clr, letterSpacing: '-0.02em', lineHeight: 1 }}>{r.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
