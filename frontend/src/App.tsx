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
import { DomainRoutingLabView } from './components/views/DomainRoutingLabView';

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
        onRefreshData={s.refreshData}
        onRefreshSession={s.refreshSession}
        isProcessing={s.isProcessing}
        mobileMenuOpen={s.mobileMenuOpen}
        setMobileMenuOpen={s.setMobileMenuOpen}
        activeTab={s.activeTab}
        setActiveTab={s.setActiveTab}
        auditCount={s.auditEvents.length}
        reviewCount={s.reviewQueue.filter(r => r.status === 'PENDING').length}
      />

      {s.fallbackActive && (
        <div
          style={{
            background: '#FEF3C7',
            borderBottom: '1px solid #FCD34D',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            color: '#92400E',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span>
              <strong>Local Fallback Active:</strong> Live backend gateway was unreachable. Current results are tagged with explicit <code>LOCAL_FALLBACK</code> simulation telemetry.
            </span>
          </div>
          <button
            onClick={() => s.refreshData()}
            style={{
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              background: '#FFFFFF',
              border: '1px solid #FCD34D',
              borderRadius: 6,
              color: '#B45309',
              cursor: 'pointer',
            }}
          >
            Retry Live Connection
          </button>
        </div>
      )}

      <main className="page-content" style={{ flex: 1 }}>
        {s.activeTab === 'overview'   && <OverviewView  setActiveTab={s.setActiveTab} auditEvents={s.auditEvents} quotaUsed={s.quotaUsed} quotaTotal={s.quotaTotal} onSelectAudit={s.setSelectedAuditDrawerEvent} testCases={s.testCases} routingEvents={s.routingEvents} reviewQueue={s.reviewQueue} modelUpdates={s.modelUpdates} />}
        {s.activeTab === 'chat'       && <ChatView      chatMessages={s.chatMessages} isProcessing={s.isProcessing} onSendMessage={s.sendChatMessage} onSelectAudit={s.setSelectedAuditDrawerEvent} testCases={s.testCases} />}
        {s.activeTab === 'attack-lab' && <AttackLabView testCases={s.testCases} activePreset={s.activeAttackPreset} setActivePreset={s.setActiveAttackPreset} setActiveTab={s.setActiveTab} onSendToChat={s.sendChatMessage} onSelectAudit={s.setSelectedAuditDrawerEvent} testPromptOnBackend={s.testPromptOnBackend} isLiveMode={s.isLiveMode} routingEvent={s.activeDomainRoutingEvent} />}
        {s.activeTab === 'domain-routing' && (
          <DomainRoutingLabView
            event={s.activeDomainRoutingEvent}
            events={s.routingEvents}
            reviewQueue={s.reviewQueue}
            modelUpdates={s.modelUpdates}
            isProcessing={s.isProcessing}
            executionHint={s.fallbackActive ? 'LOCAL_FALLBACK' : (s.isLiveMode ? 'Gateway live · adapters SIMULATED DEMO' : 'SIMULATED')}
            lastRegressionSummary={s.lastRegressionSummary}
            onRun={s.runDomainRouting}
            onCreateReview={s.createReviewItem}
            onResolve={s.resolveReviewItem}
            onSimulateUpdate={s.simulateRuleUpdate}
            onRegression={s.runRoutingRegressionSuite}
          />
        )}
        {s.activeTab === 'dashboard'  && <DashboardView auditEvents={s.auditEvents} testCases={s.testCases} routingEvents={s.routingEvents} reviewQueue={s.reviewQueue} modelUpdates={s.modelUpdates} />}
        {s.activeTab === 'research'   && <ResearchView  testCases={s.testCases} quotaUsed={s.quotaUsed} quotaTotal={s.quotaTotal} onRunBatch={s.runHarnessBatch} isProcessing={s.isProcessing} routingEvents={s.routingEvents} onRunDomainSuite={() => s.runHarnessBatch(s.testCases.filter(t => t.test_id.startsWith('DOM-')).map(t => t.test_id))} />}
        {s.activeTab === 'audit'      && <AuditView     auditEvents={s.auditEvents} onSelectAudit={s.setSelectedAuditDrawerEvent} onRefresh={s.refreshAuditEvents} isRefreshing={s.isProcessing} />}
        {s.activeTab === 'health'     && <HealthView    healthStatuses={s.healthStatuses} onRefreshHealth={s.refreshHealth} isProcessing={s.isProcessing} quotaUsed={s.quotaUsed} quotaTotal={s.quotaTotal} />}
      </main>

      <AuditDrawer
        event={s.selectedAuditDrawerEvent}
        onClose={() => s.setSelectedAuditDrawerEvent(null)}
      />
    </div>
  );
}

export default App;
