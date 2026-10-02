import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Copy, 
  Check, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import type { AuditEvent } from '../../types';
import { Badge } from '../common/Badge';

interface AuditViewProps {
  auditEvents: AuditEvent[];
  onSelectAudit: (event: AuditEvent) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AuditView: React.FC<AuditViewProps> = ({
  auditEvents,
  onSelectAudit,
  onRefresh,
  isRefreshing = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filteredEvents = auditEvents.filter(evt => {
    const matchesSearch = 
      evt.gateway_request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.classification.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.input_sha256.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDecision = decisionFilter === 'ALL' || evt.policy_decision === decisionFilter;
    const matchesRisk = riskFilter === 'ALL' || evt.risk_band === riskFilter;

    return matchesSearch && matchesDecision && matchesRisk;
  });

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const exportAuditLog = () => {
    const blob = new Blob([JSON.stringify(auditEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prismguard_audit_trail_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FileText size={20} color="var(--brand-primary)" />
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Enterprise Audit Trail & Zero-Trust Telemetry
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Deterministic SHA-256 evidence logging. Zero raw client secrets stored in audit databases.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onRefresh && (
              <button onClick={onRefresh} disabled={isRefreshing} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync from SQLite'}</span>
              </button>
            )}
            <button onClick={exportAuditLog} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              <Download size={14} />
              <span>Export Trail (JSON)</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by Request ID, SHA-256, or classification..."
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                padding: '7px 10px 7px 32px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          {/* Decision Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Decision:</span>
            <select
              value={decisionFilter}
              onChange={e => setDecisionFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="ALL">All Decisions</option>
              <option value="ALLOW">ALLOW</option>
              <option value="REVIEW">REVIEW</option>
              <option value="BLOCK">BLOCK</option>
              <option value="REDACT">REDACT</option>
              <option value="REVIEW_GUARD_BLOCK">REVIEW (GUARD BLOCK)</option>
            </select>
          </div>

          {/* Risk Band Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk:</span>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="ALL">All Risk Bands</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}>Request ID</th>
              <th style={{ padding: '10px 8px' }}>Timestamp</th>
              <th style={{ padding: '10px 8px' }}>Input SHA-256</th>
              <th style={{ padding: '10px 8px' }}>Classification</th>
              <th style={{ padding: '10px 8px' }}>Risk Score</th>
              <th style={{ padding: '10px 8px' }}>Guard</th>
              <th style={{ padding: '10px 8px' }}>Policy Decision</th>
              <th style={{ padding: '10px 8px' }}>Latency</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <FileText size={28} color="var(--text-muted)" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No audit events found</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Send prompts through Chat or Attack Lab to generate real-time audit records in SQLite.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEvents.map(evt => (
              <tr 
                key={evt.id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
                className="glass-panel-hover"
                onClick={() => onSelectAudit(evt)}
              >
                <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-cyan)' }}>
                  {evt.gateway_request_id}
                </td>
                <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {evt.timestamp}
                </td>
                <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{evt.input_sha256.substring(0, 10)}...</span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        copyHash(evt.input_sha256);
                      }}
                      className="btn-ghost"
                      style={{ padding: '2px', borderRadius: '4px' }}
                      title="Copy full SHA-256 hash"
                    >
                      {copiedHash === evt.input_sha256 ? <Check size={11} color="var(--status-allow)" /> : <Copy size={11} />}
                    </button>
                  </div>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evt.classification}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{evt.action_taken}</div>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: evt.risk_score > 60 ? 'var(--status-block)' : evt.risk_score > 30 ? 'var(--status-warn)' : 'var(--status-allow)'
                  }}>
                    {evt.risk_score}/100 ({evt.risk_band})
                  </span>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span className={`badge badge-${evt.guard_decision === 'ALLOWED' ? 'allow' : 'block'}`} style={{ fontSize: '9px' }}>
                    {evt.guard_decision}
                  </span>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <Badge decision={evt.policy_decision} style={{ fontSize: '9px' }} />
                </td>
                <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px' }}>
                  {evt.total_latency_ms}ms
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSelectAudit(evt);
                    }}
                    className="btn btn-ghost"
                    style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--brand-cyan)' }}
                  >
                    <span>Inspect</span>
                    <ArrowRight size={11} />
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
