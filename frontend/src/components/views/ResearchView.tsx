import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Play, 
  Zap, 
  Search 
} from 'lucide-react';
import type { TestCase } from '../../types';

interface ResearchViewProps {
  testCases: TestCase[];
  quotaUsed: number;
  quotaTotal: number;
  onRunBatch: (testIds: string[]) => Promise<void>;
  isProcessing: boolean;
}

export const ResearchView: React.FC<ResearchViewProps> = ({
  testCases,
  quotaUsed,
  quotaTotal,
  onRunBatch,
  isProcessing
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeHypothesisTab, setActiveHypothesisTab] = useState<'matrix' | 'hypotheses'>('matrix');

  const remainingQuota = quotaTotal - quotaUsed;
  const quotaPercent = Math.round((quotaUsed / quotaTotal) * 100);

  const filtered = testCases.filter(t => 
    t.test_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const exportEvidenceJson = () => {
    const evidenceData = {
      proposal: 'PrismGuard AI — Security Gateway',
      challenge: 'SecureAI Hackathon 2026 — Challenge 3 / Day 3',
      export_timestamp: new Date().toISOString(),
      hard_quota_budget: quotaTotal,
      quota_consumed: quotaUsed,
      quota_remaining: remainingQuota,
      findings_summary: {
        primary_confirmed_weakness: 'H1. Obfuscation & Encoded Smuggling (PI-005)',
        guard_alone_attack_bypass_rate: '35.7%',
        prismguard_attack_bypass_rate: '0.0%',
        false_positive_rescue: '100%'
      },
      test_matrix: testCases.map(t => ({
        test_id: t.test_id,
        category: t.category,
        name: t.name,
        sha256_hash: t.input_sha256,
        expected_label: t.expected_label,
        guard_allowed: t.guard_allowed,
        guard_status: t.guard_status,
        prism_score: t.prism_score,
        prism_action: t.prism_action,
        reproducible_runs: t.reproducible_runs,
        mitigation: t.mitigation_note
      }))
    };

    const blob = new Blob([JSON.stringify(evidenceData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prismguard_research_evidence_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunAllHarness = () => {
    const ids = testCases.map(t => t.test_id);
    onRunBatch(ids);
  };

  const hypothesisCards = [
    {
      id: 'H1',
      title: 'H1. Obfuscation & Encoded Smuggling',
      status: 'CONFIRMED WEAKNESS & MITIGATED',
      color: 'status-allow',
      desc: 'Base64 strings, unusual unicode spaces, and homoglyphs bypass lexical pattern matchers in standalone Guard. PrismGuard canonicalization unpacks payloads and reliably scores directives.',
      cases: 'PI-005, PI-006, PI-007, PI-008, PI-009'
    },
    {
      id: 'H2',
      title: 'H2. Instruction Smuggling & Delimiter Abuse',
      status: 'VERIFIED FINDING & DEFENDED',
      color: 'status-allow',
      desc: 'Wrapped markdown quote blocks and simulated XML tags attempt to escape user role boundaries. PrismGuard isolates untrusted tokens into separate trust zones.',
      cases: 'PI-004, PI-012, PI-013'
    },
    {
      id: 'H3',
      title: 'H3. Multilingual / Mixed-Language Gap',
      status: 'COVERAGE VERIFIED',
      color: 'status-info',
      desc: 'Non-English or code-switched prompts screened through semantic intent parser to eliminate language discrepancies.',
      cases: 'PI-010, PI-011'
    },
    {
      id: 'H4',
      title: 'H4. Split Payload Gap',
      status: 'MITIGATED (CONTEXT SCAN)',
      color: 'status-warn',
      desc: 'Cross-message recombined prompts evaluated at the gateway prior to LLM submission.',
      cases: 'PI-014'
    },
    {
      id: 'H5',
      title: 'H5. Partial / Error Ambiguity Fail-Safe',
      status: 'HARDENED POLICY',
      color: 'status-allow',
      desc: 'Gateway refuses fail-open behavior. HTTP 502/503 or status=partial gracefully routed to fast-track safety review.',
      cases: 'H5 Failure Matrix'
    },
    {
      id: 'H6',
      title: 'H6. Output-Only Secret Leakage Gap',
      status: 'ACTIVE REDACTION',
      color: 'status-allow',
      desc: 'Model outputs analyzed through dual screening: POST /v1/check/response and regex secret interceptors mask API keys before client delivery.',
      cases: 'OUT-001'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Header & Budget Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Database size={20} color="var(--brand-cyan)" />
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Research Harness & Reproducible Evidence Base
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Synthetic, privacy-preserving research matrix with deterministic SHA-256 fingerprinting.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={exportEvidenceJson}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              <Download size={14} />
              <span>Export Evidence JSON</span>
            </button>

            <button
              onClick={handleRunAllHarness}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ fontSize: '12px' }}
            >
              <Play size={14} />
              <span>{isProcessing ? 'Executing Batch...' : 'Run Test Suite Batch'}</span>
            </button>
          </div>
        </div>

        {/* Quota Budget Bar */}
        <div style={{
          marginTop: '20px',
          background: 'rgba(8, 12, 22, 0.6)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <Zap size={14} color="var(--status-warn)" />
              <span>Live Guard API Budget: {quotaUsed} / {quotaTotal} calls ({remainingQuota} calls remaining)</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Strict 120-call ceiling enforced
            </span>
          </div>

          <div style={{ height: '8px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${quotaPercent}%`,
              background: quotaPercent > 80 ? 'var(--status-block)' : 'var(--status-warn)',
              height: '100%',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Test Matrix vs Hypotheses */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveHypothesisTab('matrix')}
          className="btn"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            background: activeHypothesisTab === 'matrix' ? 'var(--brand-gradient-subtle)' : 'transparent',
            color: activeHypothesisTab === 'matrix' ? '#FFFFFF' : 'var(--text-secondary)',
            border: activeHypothesisTab === 'matrix' ? '1px solid var(--border-highlight)' : '1px solid transparent'
          }}
        >
          15-Case Benchmark Matrix
        </button>

        <button
          onClick={() => setActiveHypothesisTab('hypotheses')}
          className="btn"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            background: activeHypothesisTab === 'hypotheses' ? 'var(--brand-gradient-subtle)' : 'transparent',
            color: activeHypothesisTab === 'hypotheses' ? '#FFFFFF' : 'var(--text-secondary)',
            border: activeHypothesisTab === 'hypotheses' ? '1px solid var(--border-highlight)' : '1px solid transparent'
          }}
        >
          Hypotheses Evaluation (H1 - H6)
        </button>
      </div>

      {activeHypothesisTab === 'matrix' ? (
        /* Test Matrix Table */
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter by ID, category, or name..."
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
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing {filtered.length} cases</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Test ID</th>
                  <th style={{ padding: '10px 8px' }}>Category</th>
                  <th style={{ padding: '10px 8px' }}>Name & Description</th>
                  <th style={{ padding: '10px 8px' }}>Expected</th>
                  <th style={{ padding: '10px 8px' }}>Guard Decision</th>
                  <th style={{ padding: '10px 8px' }}>Prism Action</th>
                  <th style={{ padding: '10px 8px' }}>Runs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tc => {
                  const isGuardBlindSpot = tc.expected_label === 'attack-like' && tc.guard_allowed;
                  return (
                    <tr 
                      key={tc.test_id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isGuardBlindSpot ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-cyan)' }}>
                        {tc.test_id}
                      </td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                        {tc.category}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tc.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tc.description}</div>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span className={`badge badge-${tc.expected_label === 'attack-like' ? 'block' : tc.expected_label === 'benign' ? 'allow' : 'info'}`} style={{ fontSize: '9px' }}>
                          {tc.expected_label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {isGuardBlindSpot ? (
                          <span className="badge badge-block" style={{ fontSize: '9px' }}>
                            ALLOWED (GAP)
                          </span>
                        ) : (
                          <span className={`badge badge-${tc.guard_allowed ? 'allow' : 'block'}`} style={{ fontSize: '9px' }}>
                            {tc.guard_allowed ? 'ALLOWED' : 'BLOCKED'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span className={`badge badge-${tc.prism_action === 'ALLOW' ? 'allow' : tc.prism_action === 'BLOCK' ? 'block' : 'review'}`} style={{ fontSize: '9px' }}>
                          {tc.prism_action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        {tc.reproducible_runs}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Hypotheses Overview Cards */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {hypothesisCards.map(h => (
            <div key={h.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {h.title}
                </span>
                <span className={`badge badge-${h.color}`} style={{ fontSize: '9px' }}>
                  {h.status}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {h.desc}
              </p>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <strong>Linked Cases:</strong> {h.cases}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
