import React, { useState } from 'react';
import { X, Copy, Check, Shield, Layers, FileText, CheckCircle, AlertTriangle, AlertCircle, ShieldAlert, Ban } from 'lucide-react';
import type { AuditEvent } from '../../types';

interface AuditDrawerProps {
  event: AuditEvent | null;
  onClose: () => void;
}

function DecisionBadge({ decision, showIcon = true }: { decision: AuditEvent['policy_decision']; showIcon?: boolean }) {
  const config = {
    ALLOW: ['badge-allow', CheckCircle, 'ALLOWED'], WARN: ['badge-warn', AlertTriangle, 'WARN'],
    REVIEW: ['badge-review', AlertCircle, 'REVIEW'], REVIEW_GUARD_BLOCK: ['badge-review', ShieldAlert, 'REVIEW (GUARD BLOCK)'],
    BLOCK: ['badge-block', Ban, 'BLOCK'], REDACT: ['badge-info', FileText, 'REDACT'],
  } as const;
  const [className, Icon, label] = config[decision] || ['badge-info', FileText, decision];
  return <span className={`badge ${className}`}>{showIcon && <Icon size={11} />}<span>{label}</span></span>;
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
  const STAGE_COLORS = ['#06B6D4', '#8B5CF6', '#6366F1', '#F59E0B', '#059669', '#0284C7', '#9CA3AF'];
  const STAGE_NAMES = ['Input Normalizer', 'Custom Detector', 'SecureAI Guard (Prompt)', 'Risk & Policy Engine', 'LLM (GPT-4o-mini)', 'Output Guard', 'Audit & Telemetry'];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel animate-slide-right"
        onClick={e => e.stopPropagation()}
        style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} color="var(--brand-primary)" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Audit Inspection
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {event.classification}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DecisionBadge decision={event.policy_decision} />
            <span style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              borderRadius: 5,
              background: event.risk_score >= 60 ? 'var(--status-block-bg)' : event.risk_score >= 30 ? 'var(--status-review-bg)' : 'var(--status-allow-bg)',
              color: event.risk_score >= 60 ? 'var(--status-block-text)' : event.risk_score >= 30 ? 'var(--status-review-text)' : 'var(--status-allow-text)',
              border: `1px solid ${event.risk_score >= 60 ? 'var(--status-block-border)' : event.risk_score >= 30 ? 'var(--status-review-border)' : 'var(--status-allow-border)'}`,
              fontWeight: 700,
            }}>
              Risk: {event.risk_score}/100 ({event.risk_band})
            </span>
          </div>
          <button onClick={copyGatewayId} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>
            {copiedId ? <Check size={12} color="var(--status-allow)" /> : <Copy size={12} />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{event.gateway_request_id}</span>
          </button>
        </div>

        {/* Metadata Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-light)',
          borderRadius: 8,
          padding: 14,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Timestamp</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{event.timestamp}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Total Latency</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--brand-cyan)', fontWeight: 600 }}>{event.total_latency_ms} ms</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Input SHA-256 (Privacy Retained)</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.input_sha256}
            </div>
          </div>
        </div>

        {/* Pipeline Execution Flow */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} color="var(--brand-primary)" />
            <span>Layered Security Gateway Execution Flow</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STAGE_NAMES.map((name, i) => {
              const latencyKeys = ['normalizer', 'detector', 'guard_prompt', 'risk_engine', 'llm', 'guard_response', 'audit'] as const;
              const ms = event.stage_latencies?.[latencyKeys[i]] || 0;
              const ran = ms > 0;
              const isGuard = i === 2;
              const isAllowed = (event.guard_decision as string) === 'ALLOWED' || (event.guard_decision as string) === 'ALLOW';
              const dotClass = i === 1 && event.local_signals?.length > 0 && event.risk_score >= 40
                ? 'dot-review'
                : isGuard
                  ? (isAllowed ? 'dot-allow' : 'dot-block')
                  : ran ? 'dot-allow' : 'dot-muted';

              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 7,
                  background: i === 3 ? '#F5F3FF' : 'var(--bg-surface-2)',
                  border: `1px solid ${i === 3 ? '#DDD6FE' : 'var(--border-light)'}`,
                  fontSize: 12, opacity: !ran && i > 3 ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: ran ? `${STAGE_COLORS[i]}18` : '#F3F4F6', border: `1.5px solid ${ran ? STAGE_COLORS[i] : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 7, fontWeight: 700, color: ran ? STAGE_COLORS[i] : '#9CA3AF' }}>0{i+1}</span>
                    </div>
                    {i === 3
                      ? <Shield size={13} color="var(--brand-primary)" />
                      : <span className={`dot ${dotClass}`} />
                    }
                    <span style={{ fontWeight: i === 3 ? 600 : 500, color: 'var(--text-secondary)' }}>{name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i === 3
                      ? <DecisionBadge decision={event.policy_decision} showIcon={false} />
                      : <span style={{ fontSize: 11, color: ran ? (i === 1 && event.local_signals?.length > 0 && event.risk_score >= 40 ? 'var(--status-review)' : 'var(--status-allow)') : 'var(--text-disabled)' }}>
                          {ran ? (i === 1 && event.local_signals?.length > 0 && event.risk_score >= 40 ? 'FLAGS RAISED' : i === 2 ? (isAllowed ? 'ALLOW' : 'BLOCK') : 'PASSED') : (isBlockedOrReviewed && i >= 4 ? 'SKIPPED' : 'NOT RAN')}
                        </span>
                    }
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 38, textAlign: 'right' }}>{ran ? `${ms}ms` : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Local Signals */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Local Signals Captured ({event.local_signals?.length || 0})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(!event.local_signals || event.local_signals.length === 0) ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None (Standard Clean Request)</span>
            ) : (
              event.local_signals.map((sig, i) => (
                <span key={i} className="badge badge-purple" style={{ fontSize: 11, textTransform: 'none' }}>
                  {sig}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Policy Rationale */}
        <div style={{
          background: '#FEFCE8',
          border: '1px solid #FDE68A',
          borderRadius: 8,
          padding: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', marginBottom: 5 }}>
            Decision Rationale
          </div>
          <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
            {event.policy_rationale}
          </div>
        </div>

        {/* Raw JSON viewer */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Audit JSON Record</span>
            <button onClick={copyRawJson} className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
              {copiedJson ? <Check size={12} color="var(--status-allow)" /> : <Copy size={12} />}
              <span>Copy JSON</span>
            </button>
          </div>
          <div className="code-box-light" style={{ maxHeight: 160, overflowY: 'auto', fontSize: 11 }}>
            {JSON.stringify(event, null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
};
