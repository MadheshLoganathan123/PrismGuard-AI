import { useAppStore } from './store/useAppStore';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AuditDrawer } from './components/audit/AuditDrawer';
import { OverviewView } from './components/views/OverviewView';
import { ChatView } from './components/views/ChatView';
import { AttackLabView } from './components/views/AttackLabView';
import { DashboardView } from './components/views/DashboardView';
import { ResearchView } from './components/views/ResearchView';
import { AuditView } from './components/views/AuditView';
import { HealthView } from './components/views/HealthView';

export function App() {
  const store = useAppStore();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Global Header */}
      <Header
        quotaUsed={store.quotaUsed}
        quotaTotal={store.quotaTotal}
        isLiveMode={store.isLiveMode}
        setIsLiveMode={store.setIsLiveMode}
        resetToDemoState={store.resetToDemoState}
        mobileMenuOpen={store.mobileMenuOpen}
        setMobileMenuOpen={store.setMobileMenuOpen}
        activeTab={store.activeTab}
        setActiveTab={store.setActiveTab}
      />

      {/* Main Layout Container */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={store.activeTab}
          setActiveTab={store.setActiveTab}
          auditCount={store.auditEvents.length}
          mobileOpen={store.mobileMenuOpen}
          setMobileOpen={store.setMobileMenuOpen}
        />

        {/* Dynamic Content View Area */}
        <main style={{
          flex: 1,
          padding: '24px 32px',
          overflowY: 'auto',
          minWidth: 0
        }}>
          {store.activeTab === 'overview' && (
            <OverviewView
              setActiveTab={store.setActiveTab}
              auditEvents={store.auditEvents}
              quotaUsed={store.quotaUsed}
              quotaTotal={store.quotaTotal}
              onSelectAudit={store.setSelectedAuditDrawerEvent}
            />
          )}

          {store.activeTab === 'chat' && (
            <ChatView
              chatMessages={store.chatMessages}
              isProcessing={store.isProcessing}
              onSendMessage={store.sendChatMessage}
              onSelectAudit={store.setSelectedAuditDrawerEvent}
              testCases={store.testCases}
            />
          )}

          {store.activeTab === 'attack-lab' && (
            <AttackLabView
              testCases={store.testCases}
              activePreset={store.activeAttackPreset}
              setActivePreset={store.setActiveAttackPreset}
              setActiveTab={store.setActiveTab}
              onSendToChat={store.sendChatMessage}
              onSelectAudit={store.setSelectedAuditDrawerEvent}
              testPromptOnBackend={store.testPromptOnBackend}
              isLiveMode={store.isLiveMode}
            />
          )}

          {store.activeTab === 'dashboard' && (
            <DashboardView
              auditEvents={store.auditEvents}
              testCases={store.testCases}
            />
          )}

          {store.activeTab === 'research' && (
            <ResearchView
              testCases={store.testCases}
              quotaUsed={store.quotaUsed}
              quotaTotal={store.quotaTotal}
              onRunBatch={store.runHarnessBatch}
              isProcessing={store.isProcessing}
            />
          )}

          {store.activeTab === 'audit' && (
            <AuditView
              auditEvents={store.auditEvents}
              onSelectAudit={store.setSelectedAuditDrawerEvent}
              onRefresh={store.refreshAuditEvents}
              isRefreshing={store.isProcessing}
            />
          )}

          {store.activeTab === 'health' && (
            <HealthView
              healthStatuses={store.healthStatuses}
              onRefreshHealth={store.refreshHealth}
              isProcessing={store.isProcessing}
            />
          )}
        </main>
      </div>

      {/* Slide-in Telemetry Audit Drawer */}
      <AuditDrawer
        event={store.selectedAuditDrawerEvent}
        onClose={() => store.setSelectedAuditDrawerEvent(null)}
      />
    </div>
  );
}

export default App;
