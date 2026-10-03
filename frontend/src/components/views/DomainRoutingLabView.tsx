import React, { useMemo, useState } from 'react';
import {
  GitBranch, Play, Shield, Ban, Eye, Tag, Database, RefreshCw, CheckCircle2, AlertTriangle
} from 'lucide-react';
import type { DomainRoutingEvent, ReviewItem, ReviewLabel, SimulatedModelUpdate, DomainScenario } from '../../types/domainRouting';
import { DOMAIN_SCENARIOS, DOMAIN_DEMO_METRICS } from '../../data/domainRoutingMockData';
import { RoutingDecisionCard } from '../domain/RoutingDecisionCard';

const STAGE_COLORS: Record<string, string> = {
  processing: '#2563EB',
  passed: '#059669',
  warning: '#D97706',
  blocked: '#DC2626',
  skipped: '#94A3B8',
  pending: '#CBD5E1',
};

interface Props {
  event: DomainRoutingEvent | null;
  events: DomainRoutingEvent[];
  reviewQueue: ReviewItem[];
  modelUpdates: SimulatedModelUpdate[];
  isProcessing: boolean;
  executionHint: string;
  lastRegressionSummary: string | null;
  onRun: (prompt: string, scenarioId?: string) => Promise<unknown>;
  onCreateReview: (eventId: string) => void;
  onResolve: (id: string, label: ReviewLabel, notes: string) => void;
  onSimulateUpdate: (ids: string[]) => void;
  onRegression: () => void;
}

export const DomainRoutingLabView: React.FC<Props> = ({
  event, events, reviewQueue, modelUpdates, isProcessing, executionHint, lastRegressionSummary,
  onRun, onCreateReview, onResolve, onSimulateUpdate, onRegression,
}) => {
  const [group, setGroup] = useState('All');
  const [notes, setNotes] = useState('');
  const [label, setLabel] = useState<ReviewLabel>('MALICIOUS');
  const groups = ['All', ...Array.from(new Set(DOMAIN_SCENARIOS.map(s => s.group)))];
  const filtered = DOMAIN_SCENARIOS.filter(s => group === 'All' || s.group === group);
  const pending = reviewQueue.filter(r => r.status === 'PENDING');
  const active = event || events[0] || null;

  const beforeAfter = useMemo(() => {
    const latest = modelUpdates[0];
    return latest ? `${latest.previousVersion} → ${latest.version} (${latest.status})` : 'No simulated updates yet';
  }, [modelUpdates]);

  const runScenario = (s: DomainScenario) => onRun(s.prompt, s.id);

  return (
    <div className="compact-routing" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '16px 24px', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={20} color="#4F46E5" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0F172A' }}>Domain Routing Lab</h1>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              Keyword Filter → Secure AI → PrismGuard Router → Domain Adapter → Output Guard → Audit
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>SIMULATED DEMO</span>
          <span style={{ fontSize: 11, color: '#64748B' }}>{executionHint}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#EA580C' }}>{pending.length} pending reviews</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0,1fr) 320px', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', fontSize: 13, fontWeight: 700 }}>Scenarios</div>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 3, borderBottom: '1px solid #F1F5F9' }}>
            {groups.map(g => (
              <button key={g} onClick={() => setGroup(g)} style={{
                textAlign: 'left', padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: group === g ? 700 : 500,
                background: group === g ? '#EEF2FF' : 'transparent', color: group === g ? '#4F46E5' : '#64748B',
                border: group === g ? '1px solid #C7D2FE' : '1px solid transparent', cursor: 'pointer',
              }}>{g}</button>
            ))}
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map(s => (
              <button key={s.id} onClick={() => runScenario(s)} disabled={isProcessing} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none',
                borderBottom: '1px solid #F8FAFC', background: active?.scenarioId === s.id ? '#F5F3FF' : '#fff', cursor: 'pointer',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{s.name}</div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.group}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16, borderRadius: 14, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Routing Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(active?.stages?.length ? active.stages : [
                { id: 'recv', name: 'Prompt Received', status: 'pending' as const, latencyMs: 0, note: '' },
                { id: 'kw', name: 'Keyword Filter', status: 'pending' as const, latencyMs: 0, note: '' },
                { id: 'secure', name: 'Secure AI', status: 'pending' as const, latencyMs: 0, note: '' },
                { id: 'router', name: 'PrismGuard Router', status: 'pending' as const, latencyMs: 0, note: '' },
                { id: 'adapter', name: 'Domain Adapter', status: 'pending' as const, latencyMs: 0, note: '' },
                { id: 'resource', name: 'Resource Boundary', status: 'pending' as const, latencyMs: 0, note: '' },
                { id: 'output', name: 'Output Guard', status: 'pending' as const, latencyMs: 0, note: '' },
                { id: 'review', name: 'Admin Review / Audit', status: 'pending' as const, latencyMs: 0, note: '' },
              ]).map(st => {
                const c = STAGE_COLORS[st.status] || '#94A3B8';
                return (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: `${c}10`, border: `1px solid ${c}33` }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{st.name}</div>
                      <div style={{ fontSize: 10, color: '#64748B' }}>{st.note || (st.status === 'skipped' ? 'NOT EXECUTED' : st.status)}</div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#64748B' }}>{st.latencyMs ? `${st.latencyMs}ms` : '—'}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: c }}>{st.status.toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {active?.domainResponse && (
            <div className="card" style={{ padding: 16, borderRadius: 14, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Mock adapter response</div>
              <pre className="code-box-light" style={{ fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto' }}>{active.domainResponse.text}</pre>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RoutingDecisionCard event={active} />
          <div className="card" style={{ padding: 14, borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Decision summary</div>
            <div>Final decision: <strong>{active?.policyDecision || '—'}</strong></div>
            <div>Review required: <strong>{active?.reviewRequired ? 'Yes' : 'No'}</strong></div>
            <div>Resource accessed: <strong>{active?.resourceAccessed ? 'Synthetic read-only' : 'No'}</strong></div>
            <div style={{ fontSize: 10, color: '#64748B' }}>Synthetic data only — no real domain system accessed</div>
            {active && (
              <button className="btn btn-secondary" style={{ fontSize: 12, marginTop: 6 }} onClick={() => onCreateReview(active.id)}>
                Create review item
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, borderRadius: 14, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Feedback loop</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Admin labels → feedback dataset → simulated rule update → regression → DRAFT / READY FOR APPROVAL / ACTIVE</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => onSimulateUpdate(pending.slice(0, 3).map(r => r.id))}><Tag size={13} /> Simulated rule update</button>
            <button className="btn btn-primary-gradient" style={{ fontSize: 12 }} onClick={onRegression}><Play size={13} /> Run regression</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Pending reviews ({pending.length})</div>
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.slice(0, 8).map(r => (
                <div key={r.id} style={{ padding: 10, border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC' }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{r.id} · {r.priority} · {r.selectedDomain || '—'}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{r.redactedPromptPreview}</div>
                  <div style={{ fontSize: 10, color: '#92400E', marginTop: 4 }}>{r.reason}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <select className="select" style={{ fontSize: 12 }} value={label} onChange={e => setLabel(e.target.value as ReviewLabel)}>
                {['MALICIOUS','BENIGN','SENSITIVE_BUT_ALLOWED','WRONG_DOMAIN','OUTPUT_LEAKAGE','POLICY_ERROR','NEEDS_MORE_CONTEXT'].map(l => <option key={l}>{l}</option>)}
              </select>
              <input className="input" style={{ fontSize: 12, flex: 1 }} placeholder="Reviewer notes" value={notes} onChange={e => setNotes(e.target.value)} />
              <button className="btn btn-secondary" style={{ fontSize: 12 }} disabled={!pending[0]} onClick={() => pending[0] && onResolve(pending[0].id, label, notes || 'Resolved in Domain Routing Lab')}>
                Resolve review
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Simulated updates</div>
            {modelUpdates.slice(0, 5).map(u => (
              <div key={u.id} style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>{u.title}</div>
                <div style={{ color: '#64748B', fontSize: 11 }}>{u.version} · {u.status.replace(/_/g, ' ')} · {u.regressionPassRate ? `${u.regressionPassRate}%` : 'pending'}</div>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 11, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
              Before/after: {beforeAfter}<br />
              {lastRegressionSummary || 'Regression not run in this session.'}<br />
              Demo metrics: {DOMAIN_DEMO_METRICS.totalRouted} routed · {DOMAIN_DEMO_METRICS.averageConfidence}% avg confidence · {DOMAIN_DEMO_METRICS.label}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: '#64748B' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Shield size={12} color="#059669" /> {DOMAIN_DEMO_METRICS.totalRouted} demo routed</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ban size={12} color="#DC2626" /> {DOMAIN_DEMO_METRICS.blockedBeforeRouting} blocked before routing</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={12} color="#EA580C" /> {DOMAIN_DEMO_METRICS.heldForReview} held</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} color="#D97706" /> {DOMAIN_DEMO_METRICS.crossDomainBlocked} cross-domain blocked</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Database size={12} color="#7C3AED" /> Synthetic read-only resources</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} color="#059669" /> {DOMAIN_DEMO_METRICS.regressionPassRate}% regression (simulated)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><RefreshCw size={12} /> No real ML retraining</span>
      </div>
    </div>
  );
};
