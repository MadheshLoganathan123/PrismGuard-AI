import React from 'react';
import { GitBranch, Shield, Ban, Eye } from 'lucide-react';
import type { DomainRoutingEvent } from '../../types/domainRouting';

const DOMAIN_CLR: Record<string, { bg: string; fg: string; bd: string }> = {
  BANKING: { bg: '#EEF2FF', fg: '#3730A3', bd: '#C7D2FE' },
  GOVERNMENT: { bg: '#ECFEFF', fg: '#0E7490', bd: '#A5F3FC' },
  COMPANY: { bg: '#FFF7ED', fg: '#C2410C', bd: '#FED7AA' },
  OTHER: { bg: '#F5F3FF', fg: '#6D28D9', bd: '#DDD6FE' },
};

function outcomeColor(o: string) {
  if (o.startsWith('ROUTED')) return { bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' };
  if (o.includes('REVIEW')) return { bg: '#FFEDD5', fg: '#C2410C', bd: '#FED7AA' };
  return { bg: '#FEE2E2', fg: '#B91C1C', bd: '#FECACA' };
}

export const RoutingDecisionCard: React.FC<{ event?: DomainRoutingEvent | null; compact?: boolean }> = ({ event, compact }) => {
  if (!event) {
    return (
      <div className="card" style={{ padding: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Routing Decision</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>No routing event yet. Send a prompt to inspect domain routing.</div>
      </div>
    );
  }
  const d = DOMAIN_CLR[event.routing.selectedDomain] || DOMAIN_CLR.OTHER;
  const oc = outcomeColor(event.routingOutcome);
  const blocked = event.routingOutcome === 'BLOCKED_BEFORE_ROUTING';
  const review = event.routingOutcome === 'HELD_FOR_REVIEW';
  return (
    <div className="card" style={{ padding: compact ? 14 : 16, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitBranch size={15} color="#4F46E5" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Routing Decision</span>
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: 4, background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>
          SIMULATED DEMO
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: d.bg, color: d.fg, border: `1px solid ${d.bd}` }}>
          {event.routing.selectedDomain}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: oc.bg, color: oc.fg, border: `1px solid ${oc.bd}` }}>
          {event.routingOutcome.replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#64748B' }}>
          {(event.routing.confidence * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
        {blocked && 'Blocked before domain routing. No domain model or resource was accessed.'}
        {review && 'Held for admin review. No domain model or resource was accessed.'}
        {!blocked && !review && 'Routed to a constrained demo adapter. Synthetic data only — no real domain system accessed.'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
        <Row k="Adapter" v={event.adapter?.modelName || '—'} />
        <Row k="Resource boundary" v={event.adapter?.resourceName || '—'} />
        <Row k="Access" v={event.resourceAccessed ? 'Read-only synthetic data' : 'NONE — not executed'} />
        <Row k="Execution mode" v={event.executionMode} />
      </div>
      {event.routing.matchedSignals.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {event.routing.matchedSignals.slice(0, 6).map(s => (
            <span key={s} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>{s}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
        {blocked ? <Ban size={12} color="#DC2626" /> : review ? <Eye size={12} color="#EA580C" /> : <Shield size={12} color="#059669" />}
        Keyword {event.keywordFilter.status} · Policy {event.policyDecision}
      </div>
    </div>
  );
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: '#64748B' }}>{k}</span>
      <span style={{ fontWeight: 600, color: '#0F172A', textAlign: 'right', fontSize: 11 }}>{v}</span>
    </div>
  );
}
