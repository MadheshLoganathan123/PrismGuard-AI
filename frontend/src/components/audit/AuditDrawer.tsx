import React, { useState } from 'react';
import { X, Copy, Check, Shield, Layers } from 'lucide-react';
import type { AuditEvent } from '../../types';
import { Badge } from '../common/Badge';

interface AuditDrawerProps {
  event: AuditEvent | null;
  onClose: () => void;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ event, onClose }) => {
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  if (!event) return null;

  const copyGatewayId = () => {
    navigator.clipboard.writeText(event.gateway_request_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyRawJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const isBlockedOrReviewed = event.policy_decision === 'BLOCK' || event.policy_decision === 'REVIEW' || event.policy_decision === 'REVIEW_GUARD_BLOCK';

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div 
        className="drawer-content animate-slide-in-right" 
        onClick={e => e.stopPropagation()}
        style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Telemetry Inspection
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span>{event.classification}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px', borderRadius: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge decision={event.policy_decision} />
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: '4px',
              background: event.risk_score >= 60 ? 'var(--status-block-bg)' : 'rgba(255,255,255,0.06)',
              color: event.risk_score >= 60 ? 'var(--status-block)' : 'var(--text-secondary)'
            }}>
              Risk: {event.risk_score}/100 ({event.risk_band})
            </span>
          </div>

          <button onClick={copyGatewayId} className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
            {copiedId ? <Check size={12} color="var(--status-allow)" /> : <Copy size={12} />}
            <span>{event.gateway_request_id}</span>
          </button>
        </div>

        {/* Metadata Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Timestamp</div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{event.timestamp}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Latency</div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--brand-cyan)' }}>{event.total_latency_ms} ms</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Input SHA-256 (Privacy Retained)</div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {event.input_sha256}
            </div>
          </div>
        </div>

        {/* 6-Stage Pipeline Visual Flow */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="var(--brand-primary)" />
            <span>Layered Security Gateway Execution Flow</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Stage 1: Input Normalizer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-dot status-dot-allow" />
                <span style={{ fontWeight: 500 }}>1. Input Normalizer</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--status-allow)' }}>PASSED</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{event.stage_latencies?.normalizer || 12}ms</span>
              </div>
            </div>

            {/* Stage 2: Custom Detector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-dot ${event.local_signals.length > 0 && event.risk_score >= 40 ? 'status-dot-review' : 'status-dot-allow'}`} />
                <span style={{ fontWeight: 500 }}>2. Custom Detector</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: event.local_signals.length > 0 && event.risk_score >= 40 ? 'var(--status-review)' : 'var(--status-allow)' }}>
                  {event.local_signals.length > 0 && event.risk_score >= 40 ? 'FLAGS RAISED' : 'CLEAR'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{event.stage_latencies?.detector || 18}ms</span>
              </div>
            </div>

            {/* Stage 3: SecureAI Guard Prompt */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-dot ${event.guard_decision === 'ALLOWED' ? 'status-dot-allow' : 'status-dot-block'}`} />
                <span style={{ fontWeight: 500 }}>3. SecureAI Guard (Prompt)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: event.guard_decision === 'ALLOWED' ? 'var(--status-allow)' : 'var(--status-block)' }}>
                  {event.guard_decision}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{event.stage_latencies?.guard_prompt || 168}ms</span>
              </div>
            </div>

            {/* Stage 4: Risk & Policy Engine */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} color="var(--brand-primary)" />
                <span style={{ fontWeight: 600 }}>4. Policy Verdict</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge decision={event.policy_decision} showIcon={false} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{event.stage_latencies?.policy || 4}ms</span>
              </div>
            </div>

            {/* Stage 5: LLM & Output */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              opacity: isBlockedOrReviewed ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-dot ${isBlockedOrReviewed ? 'status-dot-warn' : 'status-dot-allow'}`} />
                <span style={{ fontWeight: 500 }}>5. Model & Output Shield</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: isBlockedOrReviewed ? 'var(--text-muted)' : 'var(--status-allow)' }}>
                  {isBlockedOrReviewed ? 'SKIPPED (SAFE HALT)' : 'PROTECTED'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {isBlockedOrReviewed ? '0ms' : `${(event.stage_latencies?.llm || 380) + (event.stage_latencies?.guard_response || 140)}ms`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Local Signals Triggered */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Local Signals Captured ({event.local_signals.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {event.local_signals.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None (Standard Clean Request)</span>
            ) : (
              event.local_signals.map((sig, i) => (
                <span key={i} className="badge badge-purple" style={{ fontSize: '11px', textTransform: 'none' }}>
                  {sig}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Policy Rationale Box */}
        <div style={{
          background: 'rgba(249, 115, 22, 0.08)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--status-review)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Decision Rationale
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
            {event.policy_rationale}
          </div>
        </div>

        {/* Raw JSON viewer */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Audit JSON Record</span>
            <button onClick={copyRawJson} className="btn-ghost" style={{ fontSize: '11px', padding: '2px 8px' }}>
              {copiedJson ? <Check size={12} color="var(--status-allow)" /> : <Copy size={12} />}
              <span>Copy JSON</span>
            </button>
          </div>
          <div className="code-box" style={{ maxHeight: '160px', overflowY: 'auto', fontSize: '11px' }}>
            {JSON.stringify(event, null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
};
