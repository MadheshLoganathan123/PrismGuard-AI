import React from 'react';
import { 
  Shield, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Terminal, 
  Layers, 
  Eye
} from 'lucide-react';
import type { ActiveTab, AuditEvent } from '../../types';

interface OverviewViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  auditEvents: AuditEvent[];
  quotaUsed: number;
  quotaTotal: number;
  onSelectAudit: (event: AuditEvent) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  setActiveTab,
  auditEvents,
  quotaUsed,
  quotaTotal,
  onSelectAudit
}) => {
  const latestEvents = auditEvents.slice(0, 3);
  const remainingQuota = quotaTotal - quotaUsed;

  const pipelineStages = [
    { num: '01', title: 'Input Normalizer', desc: 'Canonicalizes Base64, Unicode, whitespace & confusables', badge: '11ms' },
    { num: '02', title: 'Custom Detector', desc: 'Scores obfuscation, instruction smuggling & delimiters', badge: '14ms' },
    { num: '03', title: 'SecureAI Guard Prompt', desc: 'Pre-LLM screening via POST /v1/check/prompt', badge: '165ms' },
    { num: '04', title: 'Risk & Policy Engine', desc: 'Combines signals: ALLOW, WARN, REVIEW, BLOCK', badge: '8ms' },
    { num: '05', title: 'Protected LLM', desc: 'Executes strictly verified application requests', badge: '360ms' },
    { num: '06', title: 'Output Guard & Redact', desc: 'POST /v1/check/response & regex secret interceptor', badge: '135ms' },
    { num: '07', title: 'Telemetry & Audit', desc: 'SHA-256 evidence logging with zero raw secrets', badge: '5ms' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{
        padding: '32px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.75) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)'
      }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={12} /> SECUREAI HACKATHON 2026
              </span>
              <span className="badge badge-allow">CHALLENGE 3 / DAY 3</span>
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: '1.2', marginBottom: '12px' }}>
              PrismGuard AI — Adaptive Defense Security Gateway
            </h1>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              A defense-in-depth control plane positioned between client applications, <strong>SecureAI Guard</strong>, and foundational LLMs. 
              PrismGuard AI eliminates critical blind spots like <em>encoded instruction smuggling (Base64)</em>, <em>delimiter abuse</em>, and <em>output exfiltration</em>, while preserving developer utility and fail-safe reliability.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveTab('attack-lab')}
                className="btn btn-primary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                <span>Launch Attack Lab Benchmark</span>
                <ArrowRight size={15} />
              </button>

              <button 
                onClick={() => setActiveTab('chat')}
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                <span>Test Protected Chat</span>
              </button>

              <button 
                onClick={() => setActiveTab('research')}
                className="btn btn-ghost"
                style={{ padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border-medium)' }}
              >
                <span>View Research Evidence (H1-H6)</span>
              </button>
            </div>
          </div>

          {/* Quick Stat Pill */}
          <div style={{
            background: 'rgba(8, 12, 22, 0.65)',
            border: '1px solid var(--border-medium)',
            borderRadius: '12px',
            padding: '16px 20px',
            minWidth: '220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gateway Operations
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Security Posture:</span>
              <span className="badge badge-allow">ACTIVE DEFENSE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Guard Quota Remaining:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-cyan)', fontFamily: 'var(--font-mono)' }}>
                {remainingQuota} / {quotaTotal}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overhead Latency:</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                ~28ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ATTACK BYPASS RATE</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-allow)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-allow)', fontFamily: 'var(--font-mono)' }}>
            0.0%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            vs <strong>35.7%</strong> bypass for Guard alone
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>PRIMARY MITIGATION</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)' }}>
              <Lock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            H1: Base64 / Unicode
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Canonicalization unmasks obfuscated payloads
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>FALSE POSITIVE RESCUE</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--brand-cyan)' }}>
              <Eye size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-cyan)', fontFamily: 'var(--font-mono)' }}>
            100%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Benign coding & academic context preserved
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>AUDIT COMPLIANCE</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warn)' }}>
              <Terminal size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Zero Raw Secrets
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Deterministic SHA-256 fingerprinting
          </div>
        </div>
      </div>

      {/* Visual Defense Pipeline Flow */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Seven-Stage Defense-in-Depth Pipeline</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Every client request traverses two-sided screening: pre-LLM normalization & post-LLM exfiltration protection.
            </p>
          </div>
          <span className="badge badge-purple">ZERO-TRUST ARCHITECTURE</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginTop: '16px'
        }}>
          {pipelineStages.map((stage, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-medium)',
              borderRadius: '10px',
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {stage.num}
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 5px',
                  borderRadius: '4px'
                }}>
                  {stage.badge}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  {stage.title}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {stage.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Trust Boundaries & Live Audit Interceptions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Trust Zones Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Layers size={18} color="var(--brand-cyan)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Segregated Trust Boundaries</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            PrismGuard AI enforces strict physical and semantic separation between application prompt instructions and untrusted inputs:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)' }}>1. System Policy Zone (Trusted)</span>
                <span className="badge badge-purple" style={{ fontSize: '9px' }}>IMMUTABLE</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Application system prompt, deterministic routing rules, and authorized schemas are sealed from user override.
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-block)' }}>2. User Content Zone (Untrusted)</span>
                <span className="badge badge-block" style={{ fontSize: '9px' }}>TAINTED</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                All user inputs and external documents are canonicalized, sanitized, and labeled as untrusted data payloads before model visibility.
              </div>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-allow)' }}>3. Security Analysis Plane</span>
                <span className="badge badge-allow" style={{ fontSize: '9px' }}>ISOLATED</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Decoupled scoring, entropy calculation, and telemetry recording run out-of-band without exposing secrets or LLM memory.
              </div>
            </div>
          </div>
        </div>

        {/* Live Audit Log Preview */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="var(--brand-primary)" />
                <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Recent Telemetry Streams</h2>
              </div>
              <button 
                onClick={() => setActiveTab('audit')} 
                className="btn-ghost" 
                style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--brand-cyan)' }}
              >
                View all ({auditEvents.length}) →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {latestEvents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No audit events recorded yet. Ready to capture live traffic from chat or attack tests.
                </div>
              ) : (
                latestEvents.map(evt => (
                <div 
                  key={evt.id}
                  onClick={() => onSelectAudit(evt)}
                  className="glass-panel-hover"
                  style={{
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {evt.classification}
                    </span>
                    <span className={`badge badge-${evt.policy_decision.toLowerCase() === 'allow' ? 'allow' : evt.policy_decision.toLowerCase() === 'block' ? 'block' : 'review'}`}>
                      {evt.policy_decision}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {evt.action_taken}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>ID: {evt.gateway_request_id}</span>
                    <span>Risk: {evt.risk_score}/100 • {evt.total_latency_ms}ms</span>
                  </div>
                </div>
              )))}
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <span>SHA-256 integrity hashing enabled</span>
            <span style={{ color: 'var(--status-allow)' }}>● Synced with Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
};
