import React from 'react';
import { 
  HeartPulse, 
  RefreshCw, 
  ShieldCheck 
} from 'lucide-react';
import type { ServiceHealth } from '../../types';

interface HealthViewProps {
  healthStatuses: ServiceHealth[];
  onRefreshHealth: () => void;
  isProcessing: boolean;
}

export const HealthView: React.FC<HealthViewProps> = ({
  healthStatuses,
  onRefreshHealth,
  isProcessing
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <HeartPulse size={20} color="var(--status-allow)" />
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                System Health & Operational Resilience
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Real-time telemetry and fault tolerance status across the PrismGuard AI defense grid.
            </p>
          </div>

          <button
            onClick={onRefreshHealth}
            disabled={isProcessing}
            className="btn btn-secondary"
            style={{ fontSize: '12px' }}
          >
            <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
            <span>{isProcessing ? 'Probing Endpoints...' : 'Re-check All Services'}</span>
          </button>
        </div>
      </div>

      {/* Services Health Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {healthStatuses.map(svc => (
          <div key={svc.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-dot status-dot-allow animate-pulse-glow" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {svc.name}
                </span>
              </div>
              <span className="badge badge-allow" style={{ fontSize: '10px' }}>
                {svc.status}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {svc.details}
            </div>

            {svc.endpoint && (
              <div style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--brand-cyan)'
              }}>
                {svc.endpoint}
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '8px',
              marginTop: 'auto'
            }}>
              <span>Ping: <strong>{svc.latency_ms}ms</strong></span>
              <span>Checked: {svc.last_checked}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Fail-Safe Degradation Policy Cards */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <ShieldCheck size={18} color="var(--brand-cyan)" />
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Fault Tolerance & Graceful Degradation Policy (H5)</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-block)', marginBottom: '6px' }}>
              1. Fail-Closed on Critical Outage
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              If SecureAI Guard returns HTTP 502/503 or network timeout during high-risk prompt screening, the gateway refuses fail-open execution and diverts to quarantine.
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-warn)', marginBottom: '6px' }}>
              2. Ambiguous & Partial Safety Review
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              When Guard reports <code>status=partial</code>, PrismGuard tags the request with <code>REVIEW_GUARD_BLOCK</code> and preserves developer utility via bounded sandbox evaluation.
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '6px' }}>
              3. Rate Limiting & Retry-After Adherence
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Exponential backoff respecting <code>Retry-After</code> headers prevents quota exhaustion and avoids repeat authentication loops on HTTP 401.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
