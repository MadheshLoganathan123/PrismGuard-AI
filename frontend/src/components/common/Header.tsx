import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Zap, Clock, Activity, Menu, X, ShieldAlert } from 'lucide-react';
import type { ActiveTab } from '../../types';

interface HeaderProps {
  quotaUsed: number;
  quotaTotal: number;
  isLiveMode: boolean;
  setIsLiveMode: (live: boolean) => void;
  resetToDemoState: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  quotaUsed,
  quotaTotal,
  isLiveMode,
  setIsLiveMode,
  resetToDemoState,
  mobileMenuOpen,
  setMobileMenuOpen,
  activeTab,
  setActiveTab
}) => {
  const [timeStr, setTimeStr] = useState<string>('2026-10-01 17:42:15 UTC');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toISOString().substring(0, 19).replace('T', ' ') + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = quotaTotal - quotaUsed;
  const quotaPct = Math.round((remaining / quotaTotal) * 100);

  return (
    <header className="header-bar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(11, 16, 29, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Left side: Brand Logo + Status Chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn-ghost" 
          style={{ padding: '6px', borderRadius: '6px', display: 'none' }}
          id="mobile-menu-btn"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div 
          onClick={() => setActiveTab('overview')} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-indigo)'
          }}>
            <Shield size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>PrismGuard AI</span>
              <span className="badge badge-purple" style={{ fontSize: '9px', padding: '1px 5px' }}>GATEWAY</span>
              <span className="badge badge-info hide-on-mobile" style={{ fontSize: '9px', padding: '1px 5px' }}>{activeTab.replace('-', ' ').toUpperCase()}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Adaptive Defense Layer</div>
          </div>
        </div>

        {/* Quota Banner */}
        <div className="hide-on-mobile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          color: 'var(--status-warn)'
        }}>
          <Zap size={13} />
          <span><strong>Guard quota:</strong> {quotaPct}% ({remaining}/{quotaTotal} remaining)</span>
        </div>
      </div>

      {/* Center: Demo Safeguard Notice */}
      <div className="hide-on-mobile" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '5px 12px',
        borderRadius: '6px',
        border: '1px solid var(--border-subtle)'
      }}>
        <ShieldAlert size={14} color="var(--brand-cyan)" />
        <span>Synthetic Research Mode • Zero Raw Secrets Retained</span>
      </div>

      {/* Right side: Timestamp & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="hide-on-mobile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}>
          <Clock size={12} />
          <span>{timeStr}</span>
        </div>

        {/* Live / Simulated Toggle */}
        <button
          onClick={() => setIsLiveMode(!isLiveMode)}
          className="btn"
          style={{
            fontSize: '11px',
            padding: '5px 10px',
            background: isLiveMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
            border: isLiveMode ? '1px solid var(--status-allow)' : '1px solid var(--border-medium)',
            color: isLiveMode ? 'var(--status-allow)' : 'var(--text-secondary)'
          }}
          title="Toggle between Simulated Sandbox and Live Guard API"
        >
          <Activity size={12} />
          <span>{isLiveMode ? 'LIVE API' : 'SIMULATED'}</span>
        </button>

        {/* Reset State */}
        <button
          onClick={resetToDemoState}
          className="btn btn-secondary"
          style={{ fontSize: '11px', padding: '5px 10px' }}
          title="Reset demonstration state to original benchmark"
        >
          <RefreshCw size={12} />
          <span className="hide-on-mobile">Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
