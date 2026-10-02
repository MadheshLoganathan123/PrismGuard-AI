import { useAppStore } from './store/useAppStore';
import { Header }      from './components/common/Header';
import { AuditDrawer } from './components/audit/AuditDrawer';
import { OverviewView }   from './components/views/OverviewView';
import { ChatView }       from './components/views/ChatView';
import { AttackLabView }  from './components/views/AttackLabView';
import { DashboardView }  from './components/views/DashboardView';
import { ResearchView }   from './components/views/ResearchView';
import { AuditView }      from './components/views/AuditView';
import { HealthView }     from './components/views/HealthView';

export function App() {
  const s = useAppStore();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <Header
        quotaUsed={s.quotaUsed}
        quotaTotal={s.quotaTotal}
        isLiveMode={s.isLiveMode}
        setIsLiveMode={s.setIsLiveMode}
        resetToDemoState={s.resetToDemoState}
        mobileMenuOpen={s.mobileMenuOpen}
        setMobileMenuOpen={s.setMobileMenuOpen}
        activeTab={s.activeTab}
        setActiveTab={s.setActiveTab}
        auditCount={s.auditEvents.length}
      />

      <main className="page-content" style={{ flex: 1 }}>
        {s.activeTab === 'overview'   && <OverviewView  setActiveTab={s.setActiveTab} auditEvents={s.auditEvents} quotaUsed={s.quotaUsed} quotaTotal={s.quotaTotal} onSelectAudit={s.setSelectedAuditDrawerEvent} />}
        {s.activeTab === 'chat'       && <ChatView      chatMessages={s.chatMessages} isProcessing={s.isProcessing} onSendMessage={s.sendChatMessage} onSelectAudit={s.setSelectedAuditDrawerEvent} testCases={s.testCases} />}
        {s.activeTab === 'attack-lab' && <AttackLabView testCases={s.testCases} activePreset={s.activeAttackPreset} setActivePreset={s.setActiveAttackPreset} setActiveTab={s.setActiveTab} onSendToChat={s.sendChatMessage} onSelectAudit={s.setSelectedAuditDrawerEvent} testPromptOnBackend={s.testPromptOnBackend} isLiveMode={s.isLiveMode} />}
        {s.activeTab === 'dashboard'  && <DashboardView auditEvents={s.auditEvents} testCases={s.testCases} />}
        {s.activeTab === 'research'   && <ResearchView  testCases={s.testCases} quotaUsed={s.quotaUsed} quotaTotal={s.quotaTotal} onRunBatch={s.runHarnessBatch} isProcessing={s.isProcessing} />}
        {s.activeTab === 'audit'      && <AuditView     auditEvents={s.auditEvents} onSelectAudit={s.setSelectedAuditDrawerEvent} onRefresh={s.refreshAuditEvents} isRefreshing={s.isProcessing} />}
        {s.activeTab === 'health'     && <HealthView    healthStatuses={s.healthStatuses} onRefreshHealth={s.refreshHealth} isProcessing={s.isProcessing} />}
      </main>

      <AuditDrawer
        event={s.selectedAuditDrawerEvent}
        onClose={() => s.setSelectedAuditDrawerEvent(null)}
      />
    </div>
  );
}

export default App;
