import React from 'react';
import {
  Activity, RefreshCw, Shield, Clock, Database, Brain,
  Server, ExternalLink, ChevronRight, Lock, Users, Settings, FileText
} from 'lucide-react';
import type { ServiceHealth } from '../../types';

interface HealthViewProps {
  healthStatuses: ServiceHealth[];
  onRefreshHealth: () => void;
  isProcessing: boolean;
  quotaUsed?: number;
  quotaTotal?: number;
}

/* ── SVG Multi-line Latency Graph ── */
function LatencyGraph() {
  return (
    <svg width="100%" height="160" viewBox="0 0 600 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="llm-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[20, 50, 80, 110, 140].map((y, i) => (
        <line key={i} x1="35" y1={y} x2="590" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
      ))}

      {/* Y Axis text */}
      <text x="5" y="24" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">800</text>
      <text x="5" y="54" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">600</text>
      <text x="5" y="84" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">400</text>
      <text x="5" y="114" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">200</text>
      <text x="18" y="144" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">0</text>

      {/* Area for LLM curve */}
      <path
        d="M 35,90 C 80,88 120,85 160,86 C 200,87 230,80 270,82 C 310,84 340,75 380,80 C 420,85 460,78 500,80 C 540,82 560,80 590,82 L 590,140 L 35,140 Z"
        fill="url(#llm-grad)"
      />

      {/* Line 1: LLM (GPT-4o-mini) — Orange ~360ms */}
      <path
        d="M 35,90 C 80,88 120,85 160,86 C 200,87 230,80 270,82 C 310,84 340,75 380,80 C 420,85 460,78 500,80 C 540,82 560,80 590,82"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Line 2: SecureAI Guard — Green ~164ms */}
      <path
        d="M 35,115 C 80,113 120,116 160,114 C 200,112 230,115 270,114 C 310,113 340,116 380,114 C 420,112 460,115 500,114 C 540,113 560,115 590,114"
        fill="none"
        stroke="#10B981"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Line 3: PrismGuard API — Purple ~15ms */}
      <path
        d="M 35,134 C 80,133 120,134 160,133 C 200,134 230,133 270,134 C 310,133 340,134 380,133 C 420,134 460,133 500,134 C 540,133 560,134 590,133"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Line 4: Database — Blue ~2ms */}
      <path
        d="M 35,138 C 80,138 120,138 160,138 C 200,138 230,138 270,138 C 310,138 340,138 380,138 C 420,138 460,138 500,138 C 540,138 560,138 590,138"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* X Axis labels */}
      <text x="35" y="156" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">13:15</text>
      <text x="160" y="156" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">13:30</text>
      <text x="290" y="156" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">13:45</text>
      <text x="420" y="156" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">14:00</text>
      <text x="555" y="156" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">14:15</text>
    </svg>
  );
}

export const HealthView: React.FC<HealthViewProps> = ({ healthStatuses, onRefreshHealth, isProcessing, quotaUsed, quotaTotal }) => {
  const beStatus = healthStatuses.find(s => s.id === 'health-be');
  const guardStatus = healthStatuses.find(s => s.id.includes('guard'));
  const llmStatus = healthStatuses.find(s => s.id === 'health-llm');
  const dbStatus = healthStatuses.find(s => s.id === 'health-db');

  const used = quotaUsed ?? 0;
  const total = quotaTotal || 120;
  const quotaPct = Math.round((used / total) * 100);

  return (
    <div className="compact-health" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Top Header ── */}
      <div
        className="card"
        style={{
          padding: '18px 24px',
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={22} color="#059669" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              System Health
            </h1>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              Monitor the health and readiness of all services in the PrismGuard AI security gateway.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B' }}>
            <Clock size={14} color="#64748B" />
            <span>Last Checked</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#0F172A', fontWeight: 600 }}>
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          <button
            onClick={onRefreshHealth}
            disabled={isProcessing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 8,
              background: '#6366F1',
              color: '#FFFFFF',
              border: 'none',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
            {isProcessing ? 'Checking...' : 'Re-check All Services'}
          </button>
        </div>
      </div>

      {/* ── Row 1: 4 Service Status Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {/* Card 1: PrismGuard Backend */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={18} color="#059669" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: beStatus?.status === 'READY' ? '#ECFDF5' : '#FEF2F2', color: beStatus?.status === 'READY' ? '#059669' : '#DC2626', border: `1px solid ${beStatus?.status === 'READY' ? '#A7F3D0' : '#FECACA'}`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className={`dot ${beStatus?.status === 'READY' ? 'dot-allow' : 'dot-block'} animate-pulse-glow`} style={{ width: 5, height: 5 }} />
                {beStatus?.status === 'READY' ? 'ONLINE' : 'OFFLINE'}
              </span>
              <ChevronRight size={14} color="#94A3B8" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>PrismGuard Backend</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>FastAPI • :8000</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 'auto', fontSize: 11 }}>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>{beStatus?.latency_ms !== undefined ? `${beStatus.latency_ms} ms` : '—'}</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Ping Latency</span>
            </div>
            <div>
              <strong style={{ color: '#059669', display: 'block', fontSize: 12 }}>100%</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Availability</span>
            </div>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>v1.0.0</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Version</span>
            </div>
          </div>
        </div>

        {/* Card 2: SecureAI Guard */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#059669" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: guardStatus?.status === 'READY' ? '#ECFDF5' : '#FFFBEB', color: guardStatus?.status === 'READY' ? '#059669' : '#D97706', border: `1px solid ${guardStatus?.status === 'READY' ? '#A7F3D0' : '#FDE68A'}`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className={`dot ${guardStatus?.status === 'READY' ? 'dot-allow' : 'dot-warn'} animate-pulse-glow`} style={{ width: 5, height: 5 }} />
                {guardStatus?.status === 'READY' ? 'CONNECTED' : 'STANDBY'}
              </span>
              <ChevronRight size={14} color="#94A3B8" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>SecureAI Guard</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>/v1/check/prompt</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 'auto', fontSize: 11 }}>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>{guardStatus?.latency_ms !== undefined ? `${guardStatus.latency_ms} ms` : '—'}</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Avg Latency</span>
            </div>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>{used} / {total}</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>API Usage</span>
            </div>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>{quotaPct}%</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Quota Used</span>
            </div>
          </div>
        </div>

        {/* Card 3: LLM (GPT-4o-mini) */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="#059669" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="dot dot-allow animate-pulse-glow" style={{ width: 5, height: 5 }} />
                READY
              </span>
              <ChevronRight size={14} color="#94A3B8" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>LLM (GPT-4o-mini)</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>OpenAI API</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 'auto', fontSize: 11 }}>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>{llmStatus?.latency_ms !== undefined ? `${llmStatus.latency_ms} ms` : '—'}</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Avg Latency</span>
            </div>
            <div>
              <strong style={{ color: '#059669', display: 'block', fontSize: 12 }}>100%</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Availability</span>
            </div>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>v4o-mini</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Model</span>
            </div>
          </div>
        </div>

        {/* Card 4: SQLite Database */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={18} color="#059669" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="dot dot-allow animate-pulse-glow" style={{ width: 5, height: 5 }} />
                READY
              </span>
              <ChevronRight size={14} color="#94A3B8" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>SQLite Database</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>prismguard.db (WAL)</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 'auto', fontSize: 11 }}>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>{dbStatus?.latency_ms !== undefined ? `${dbStatus.latency_ms} ms` : '—'}</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Query Latency</span>
            </div>
            <div>
              <strong style={{ color: '#059669', display: 'block', fontSize: 12 }}>100%</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Availability</span>
            </div>
            <div>
              <strong style={{ color: '#0F172A', display: 'block', fontSize: 12 }}>WAL</strong>
              <span style={{ color: '#64748B', fontSize: 10 }}>Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Latency Chart + SecureAI Guard API Usage ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 16 }}>
        {/* Latency Graph */}
        <div className="card" style={{ padding: '20px 24px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Service Latency (Last 1 Hour)</span>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8B5CF6' }} />
                <span style={{ color: '#64748B' }}>PrismGuard API</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ color: '#64748B' }}>SecureAI Guard</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ color: '#64748B' }}>LLM (GPT-4o-mini)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6' }} />
                <span style={{ color: '#64748B' }}>Database</span>
              </div>
            </div>
          </div>

          <LatencyGraph />
        </div>

        {/* SecureAI Guard API Usage */}
        <div className="card" style={{ padding: '20px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={15} color="#2563EB" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>SecureAI Guard API Usage</span>
            </div>
            <button className="btn-ghost" style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 600 }}>
              View Details →
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{used} / {total} calls used</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>{quotaPct}%</span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, quotaPct)}%`, height: '100%', background: '#6366F1', borderRadius: 4 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{Math.max(0, total - used)}</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Remaining Calls</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{total}</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Daily Limit</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="#DC2626" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>24h Rolling</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>Reset Window</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: 3 Cards (Status Details + Fault Tolerance + System Info) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) 280px', gap: 16 }}>

        {/* Card 1: Service Status Details Table */}
        <div className="card" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Service Status Details</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ margin: 0, width: '100%', minWidth: 580 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 12px', whiteSpace: 'nowrap' }}>Service</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 10px', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 10px' }}>Endpoint / Details</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 10px', whiteSpace: 'nowrap' }}>Latency</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 10px', whiteSpace: 'nowrap' }}>Last Checked</th>
                  <th style={{ fontSize: 11, fontWeight: 600, color: '#64748B', padding: '10px 10px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {healthStatuses.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', padding: '10px 12px', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ fontSize: 11, padding: '10px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className={`dot ${s.status === 'READY' ? 'dot-allow' : s.status === 'DEGRADED' ? 'dot-warn' : 'dot-block'} animate-pulse-glow`} style={{ width: 6, height: 6 }} />
                        <span style={{ color: s.status === 'READY' ? '#059669' : s.status === 'DEGRADED' ? '#D97706' : '#DC2626', fontWeight: 600 }}>{s.status}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)', padding: '10px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.endpoint || s.details}</td>
                    <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '10px 10px', whiteSpace: 'nowrap' }}>{s.latency_ms} ms</td>
                    <td style={{ fontSize: 11, color: '#64748B', padding: '10px 10px', whiteSpace: 'nowrap' }}>{s.last_checked || 'Active'}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <button
                        onClick={onRefreshHealth}
                        disabled={isProcessing}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#EFF6FF',
                          border: '1px solid #DBEAFE',
                          color: '#2563EB',
                          fontSize: 10.5,
                          fontWeight: 600,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ExternalLink size={10} />
                        Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Fault Tolerance Policy (H5) */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} color="#059669" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Fault Tolerance Policy (H5)</span>
            </div>
            <button className="btn-ghost" style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 600 }}>
              Learn More →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                icon: <Shield size={14} color="#059669" />,
                iconBg: '#ECFDF5',
                title: 'Fail-Closed on Critical Outage',
                desc: 'Block or review when Guard/LLM unavailable',
              },
              {
                icon: <Users size={14} color="#D97706" />,
                iconBg: '#FFFBEB',
                title: 'Ambiguous → Review',
                desc: 'Send uncertain cases for human review',
              },
              {
                icon: <Clock size={14} color="#2563EB" />,
                iconBg: '#EFF6FF',
                title: 'Rate Limiting & Retry-After',
                desc: 'Respect API limits and handle 429 responses',
              },
              {
                icon: <Lock size={14} color="#D97706" />,
                iconBg: '#FFFBEB',
                title: 'Secret Handling',
                desc: 'Never log raw secrets or sensitive data',
              },
            ].map(p => (
              <div key={p.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: p.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A' }}>{p.title}</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>{p.desc}</div>
                  </div>
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: System Information */}
        <div className="card" style={{ padding: '18px 20px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} color="#64748B" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>System Information</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5 }}>
            {[
              { label: 'Environment', val: 'Development (Active)' },
              { label: 'Backend Gateway', val: beStatus?.status === 'READY' ? 'Online (:8000)' : 'Offline' },
              { label: 'Database', val: 'SQLite (WAL)' },
              { label: 'Guard Base URL', val: 'Configured & Screened' },
              { label: 'LLM Model', val: 'gpt-4o-mini' },
              { label: 'Client Timezone', val: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
              { label: 'Gateway Session', val: 'Active' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F8FAFC', paddingBottom: 4 }}>
                <span style={{ color: '#64748B' }}>{item.label}</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
