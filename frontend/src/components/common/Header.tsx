import React from 'react';
import {
  LayoutDashboard, MessageSquare, FlaskConical,
  BarChart3, FileText, SlidersHorizontal, Activity, Sun, ChevronDown, RefreshCw, RotateCcw
} from 'lucide-react';
import type { ActiveTab } from '../../types';

interface HeaderProps {
  quotaUsed?: number;
  quotaTotal?: number;
  isLiveMode: boolean;
  setIsLiveMode: (v: boolean) => void;
  resetToDemoState: () => void;
  onRefreshData?: () => void;
  onRefreshSession?: () => void;
  isProcessing?: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  auditCount?: number;
}

export function PrismLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="prism-red" x1="18" y1="2" x2="28" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F87171" />
          <stop offset="1" stopColor="#EF4444" />
        </linearGradient>
        <linearGradient id="prism-green" x1="4" y1="30" x2="16" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="prism-blue" x1="32" y1="30" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      {/* Top Facet */}
      <path d="M18 3.5C18.6 3.5 19.2 3.8 19.5 4.4L31 24.5C31.5 25.4 30.9 26.6 29.8 26.7L18 19L18 3.5Z" fill="url(#prism-red)" />
      {/* Left Facet */}
      <path d="M18 3.5L18 19L6.2 26.7C5.1 26.6 4.5 25.4 5 24.5L16.5 4.4C16.8 3.8 17.4 3.5 18 3.5Z" fill="url(#prism-green)" />
      {/* Bottom Facet */}
      <path d="M18 19L29.8 26.7C30.4 27.5 29.8 28.5 28.8 28.5H7.2C6.2 28.5 5.6 27.5 6.2 26.7L18 19Z" fill="url(#prism-blue)" />
    </svg>
  );
}

const NAV: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',        icon: <LayoutDashboard size={15} /> },
  { id: 'chat',       label: 'Protected Chat',  icon: <MessageSquare   size={15} /> },
  { id: 'attack-lab', label: 'Attack Lab',      icon: <FlaskConical    size={15} /> },
  { id: 'dashboard',  label: 'Dashboard',       icon: <BarChart3       size={15} /> },
  { id: 'research',   label: 'Research',        icon: <FileText        size={15} /> },
  { id: 'audit',      label: 'Audit Trail',     icon: <SlidersHorizontal size={15} /> },
  { id: 'health',     label: 'System Health',   icon: <Activity        size={15} /> },
];

export const Header: React.FC<HeaderProps> = ({
  isLiveMode, setIsLiveMode, resetToDemoState,
  onRefreshData, onRefreshSession, isProcessing = false,
  activeTab, setActiveTab, auditCount = 0,
}) => {
  return (
    <header className="topnav">
      {/* Brand */}
      <div className="topnav-brand" onClick={() => setActiveTab('overview')} role="button" tabIndex={0}>
        <div className="topnav-logo-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PrismLogo size={28} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
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
            <span>{item.label}</span>
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
            style={{ width: 7, height: 7 }}
          />
          <span>{isLiveMode ? 'Gateway Online' : 'Simulated'}</span>
        </button>

        {/* Sun / theme */}
        <button className="btn-ghost" title="Theme" style={{ padding: '6px 7px', borderRadius: 8 }} onClick={() => {}}>
          <Sun size={17} color="#64748B" />
        </button>

        {/* Refresh Data */}
        <button
          className="btn-ghost"
          title="Refresh Data — re-fetch audit events, health &amp; quota from backend"
          style={{ padding: '6px 7px', borderRadius: 8, opacity: isProcessing ? 0.5 : 1 }}
          onClick={onRefreshData ?? resetToDemoState}
          disabled={isProcessing}
        >
          <RefreshCw
            size={15}
            color="#64748B"
            style={{
              transition: 'transform 0.6s ease',
              animation: isProcessing ? 'spin 1s linear infinite' : 'none'
            }}
          />
        </button>

        {/* Refresh Session */}
        <button
          className="btn-ghost"
          title="Refresh Session — clear chat history &amp; re-sync backend"
          style={{ padding: '6px 7px', borderRadius: 8, opacity: isProcessing ? 0.5 : 1 }}
          onClick={onRefreshSession ?? resetToDemoState}
          disabled={isProcessing}
        >
          <RotateCcw
            size={15}
            color="#64748B"
            style={{
              transition: 'transform 0.6s ease',
              animation: isProcessing ? 'spin 1s linear infinite' : 'none'
            }}
          />
        </button>

        {/* User avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '4px 6px', borderRadius: 8 }}>
          <div className="user-avatar" style={{ background: '#1E293B', color: '#FFFFFF', fontWeight: 600, width: 28, height: 28, fontSize: 12 }}>
            M
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }} className="hide-sm">
            Mathew
          </span>
          <ChevronDown size={14} color="#64748B" className="hide-sm" />
        </div>
      </div>
    </header>
  );
};
