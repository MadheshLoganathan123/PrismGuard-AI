import React from 'react';
import {
  Shield, LayoutDashboard, MessageSquare, FlaskConical,
  BarChart3, Database, FileText, HeartPulse, Sun, ChevronDown, RefreshCw
} from 'lucide-react';
import type { ActiveTab } from '../../types';

interface HeaderProps {
  quotaUsed?: number;
  quotaTotal?: number;
  isLiveMode: boolean;
  setIsLiveMode: (v: boolean) => void;
  resetToDemoState: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  auditCount?: number;
}

const NAV: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',        icon: <LayoutDashboard size={14} /> },
  { id: 'chat',       label: 'Protected Chat',  icon: <MessageSquare   size={14} /> },
  { id: 'attack-lab', label: 'Attack Lab',      icon: <FlaskConical    size={14} /> },
  { id: 'dashboard',  label: 'Dashboard',       icon: <BarChart3       size={14} /> },
  { id: 'research',   label: 'Research',        icon: <Database        size={14} /> },
  { id: 'audit',      label: 'Audit Trail',     icon: <FileText        size={14} /> },
  { id: 'health',     label: 'System Health',   icon: <HeartPulse      size={14} /> },
];

export const Header: React.FC<HeaderProps> = ({
  isLiveMode, setIsLiveMode, resetToDemoState,
  activeTab, setActiveTab, auditCount = 0,
}) => {
  return (
    <header className="topnav">
      {/* Brand */}
      <div className="topnav-brand" onClick={() => setActiveTab('overview')} role="button" tabIndex={0}>
        <div className="topnav-logo">
          <Shield size={15} color="#fff" strokeWidth={2.5} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="topnav-brand-name">PRISMGUARD AI</span>
          <span className="topnav-brand-sub">Security Gateway</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="topnav-nav" aria-label="Main navigation">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`nav-link${activeTab === item.id ? ' active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            {item.icon}
            {item.label}
            {item.id === 'audit' && auditCount > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, lineHeight: 1,
                background: activeTab === 'audit' ? 'rgba(99,102,241,0.2)' : '#EEF2FF',
                color: '#4F46E5', padding: '2px 5px', borderRadius: 4,
                fontFamily: 'var(--font-mono)',
              }}>
                {auditCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div className="topnav-right">
        {/* Gateway status pill */}
        <button
          className="gateway-pill"
          onClick={() => setIsLiveMode(!isLiveMode)}
          title="Toggle Live / Simulated mode"
        >
          <span
            className="dot dot-allow animate-pulse-glow"
            style={{ width: 6, height: 6 }}
          />
          {isLiveMode ? 'Gateway Online' : 'Simulated'}
        </button>

        {/* Sun / theme */}
        <button className="btn-ghost" title="Theme" style={{ padding: '5px 6px' }} onClick={() => {}}>
          <Sun size={16} color="var(--text-muted)" />
        </button>

        {/* Refresh / sync */}
        <button
          className="btn-ghost"
          title="Clear session & sync from backend"
          style={{ padding: '5px 6px' }}
          onClick={resetToDemoState}
        >
          <RefreshCw size={15} color="var(--text-muted)" />
        </button>

        {/* User avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <div className="user-avatar">M</div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }} className="hide-sm">
            Mathew
          </span>
          <ChevronDown size={13} color="var(--text-muted)" className="hide-sm" />
        </div>
      </div>
    </header>
  );
};
