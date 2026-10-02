import { useState, useEffect, useCallback } from 'react';
import type { ActiveTab, AuditEvent, ChatMessage, ServiceHealth, TestCase } from '../types';
import { TEST_CASES } from '../data/testCases';
import { INITIAL_HEALTH_STATUS } from '../data/mockHealth';
import { runSecurityPipeline } from '../engine/simulator';
import { apiClient, type ChatApiResponse } from '../api/client';

export function useAppStore() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [quotaUsed, setQuotaUsed] = useState<number>(0);
  const [quotaTotal, setQuotaTotal] = useState<number>(120);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedAuditDrawerEvent, setSelectedAuditDrawerEvent] = useState<AuditEvent | null>(null);
  const [testCasesList, setTestCasesList] = useState<TestCase[]>(TEST_CASES);
  const [activeAttackPreset, setActiveAttackPreset] = useState<TestCase>(TEST_CASES[0]); // PI-005
  const [healthStatuses, setHealthStatuses] = useState<ServiceHealth[]>(INITIAL_HEALTH_STATUS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Sync health and database data on mount or when live mode is toggled
  const syncWithBackend = useCallback(async () => {
    try {
      const healthData = await apiClient.getHealth();
      setBackendConnected(true);

      // Update service health tiles from live backend probe
      if (healthData && healthData.services) {
        setHealthStatuses(prev => prev.map(h => {
          if (h.id === 'health-fe') {
            return {
              ...h,
              status: 'READY',
              latency_ms: 1,
              last_checked: new Date().toLocaleTimeString() + ' UTC'
            };
          }
          if (h.id === 'health-be') {
            return {
              ...h,
              status: healthData.status === 'healthy' ? 'READY' : 'DEGRADED',
              latency_ms: 3,
              details: `FastAPI Gateway Active (${healthData.services.database?.engine || 'SQLite WAL'})`,
              last_checked: new Date().toLocaleTimeString() + ' UTC',
              endpoint: '/api/health'
            };
          }
          if (h.id === 'health-guard-conn' || h.id === 'health-guard-auth') {
            const guardSvc = healthData.services.secureai_guard || {};
            const isReady = guardSvc.status === 'READY';
            return {
              ...h,
              status: isReady ? 'READY' : 'DEGRADED',
              latency_ms: Math.round(guardSvc.latency_ms || 95),
              details: `Live SecureAI Guard connected (${guardSvc.status_code === 200 ? '200 OK' : guardSvc.status})`,
              last_checked: new Date().toLocaleTimeString() + ' UTC',
              endpoint: guardSvc.endpoint || 'https://secureai-guard-598609297408.europe-west4.run.app'
            };
          }
          if (h.id === 'health-llm') {
            const llmSvc = healthData.services.llm_adapter || {};
            return {
              ...h,
              status: llmSvc.configured ? 'READY' : 'CONFIG_REQUIRED',
              latency_ms: 140,
              details: `OpenAI LLM inference adapter: ${llmSvc.model || 'gpt-4o-mini'}`,
              last_checked: new Date().toLocaleTimeString() + ' UTC',
              endpoint: `${llmSvc.base_url || 'https://api.openai.com/v1'}/chat/completions`
            };
          }
          if (h.id === 'health-db') {
            const dbSvc = healthData.services.database || {};
            return {
              ...h,
              status: dbSvc.status === 'READY' ? 'READY' : 'DEGRADED',
              latency_ms: 2,
              details: `SQLite WAL Database Active: ${healthData.config_summary?.database_path || 'prismguard.db'}`,
              last_checked: new Date().toLocaleTimeString() + ' UTC',
              endpoint: 'backend/prismguard.db'
            };
          }
          return h;
        }));
      }

      // Fetch SQLite audit events
      const liveEvents = await apiClient.getAuditEvents(100);
      if (liveEvents && liveEvents.length > 0) {
        setAuditEvents(liveEvents);
      }

      // Fetch test catalog
      const catalog = await apiClient.getTestCases();
      if (catalog && catalog.length > 0) {
        setTestCasesList(catalog);
      }

      // Fetch live Guard quota
      try {
        const usage = await apiClient.getGuardUsage();
        if (usage?.used_today !== undefined) {
          setQuotaUsed(usage.used_today);
          setQuotaTotal(usage.daily_limit || 1000);
        } else if (usage?.calls_used !== undefined) {
          setQuotaUsed(usage.calls_used);
          setQuotaTotal(usage.budget_limit || 120);
        }
      } catch { /* quota fetch optional */ }

      // Fetch research metrics (as fallback for quota)
      const researchData = await apiClient.getResearchResults();
      if (researchData && researchData.metrics && quotaUsed === 0) {
        if (researchData.metrics.budget_calls_made !== undefined) {
          setQuotaUsed(researchData.metrics.budget_calls_made);
        }
      }
    } catch (e) {
      console.warn('Backend sync failed, running in fallback mode:', e);
      setBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  // Send message through security pipeline
  const sendChatMessage = async (text: string, presetId?: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    const userMsg: ChatMessage = {
      id: 'msg-u-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);

    try {
      if (isLiveMode) {
        try {
          const resp = await apiClient.sendChat(text, undefined, presetId);
          const botMsg: ChatMessage = {
            id: 'msg-b-' + Date.now(),
            sender: 'assistant',
            text: resp.assistant_text || 'No response generated.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            decision: resp.decision,
            risk_score: resp.risk_score,
            risk_band: resp.risk_band,
            telemetry: resp.audit_event
          };
          userMsg.decision = resp.decision;
          userMsg.risk_score = resp.risk_score;
          userMsg.risk_band = resp.risk_band;
          userMsg.telemetry = resp.audit_event;

          setChatMessages(prev => [...prev.slice(0, -1), userMsg, botMsg]);
          setAuditEvents(prev => [resp.audit_event, ...prev]);
          setQuotaUsed(prev => Math.min(quotaTotal, prev + 1));
          return;
        } catch (e: any) {
          console.warn('Live gateway call failed, using client-side fallback:', e);
        }
      }

      // Offline / fallback simulator
      const { message: botMsg, auditEvent } = await runSecurityPipeline(text, presetId);
      userMsg.decision = auditEvent.policy_decision;
      userMsg.risk_score = auditEvent.risk_score;
      userMsg.risk_band = auditEvent.risk_band;
      userMsg.telemetry = auditEvent;

      setChatMessages(prev => [...prev.slice(0, -1), userMsg, botMsg]);
      setAuditEvents(prev => [auditEvent, ...prev]);
      setQuotaUsed(prev => Math.min(quotaTotal, prev + 1));
    } finally {
      setIsProcessing(false);
    }
  };

  // Test prompt on backend without necessarily adding to chat history (e.g. from AttackLabView)
  const testPromptOnBackend = async (text: string, presetId?: string): Promise<ChatApiResponse> => {
    setIsProcessing(true);
    try {
      const resp = await apiClient.sendChat(text, undefined, presetId);
      setAuditEvents(prev => [resp.audit_event, ...prev]);
      setQuotaUsed(prev => Math.min(quotaTotal, prev + 1));
      return resp;
    } finally {
      setIsProcessing(false);
    }
  };

  // Run batch harness tests
  const runHarnessBatch = async (testIds: string[]) => {
    setIsProcessing(true);
    try {
      if (isLiveMode) {
        try {
          const batchRes = await apiClient.runResearchBatch(testIds);
          const evts = await apiClient.getAuditEvents(100);
          if (evts && evts.length > 0) {
            setAuditEvents(evts);
          }
          setQuotaUsed(batchRes.total_quota_consumed);
          return;
        } catch (e) {
          console.warn('Live research run failed, using local execution:', e);
        }
      }

      const newEvents: AuditEvent[] = [];
      for (const tid of testIds) {
        const tc = testCasesList.find(t => t.test_id === tid);
        if (tc) {
          const { auditEvent } = await runSecurityPipeline(tc.raw_input, tc.test_id);
          newEvents.push(auditEvent);
        }
      }

      setAuditEvents(prev => [...newEvents, ...prev]);
      setQuotaUsed(prev => Math.min(quotaTotal, prev + testIds.length));
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-check health diagnostic
  const refreshHealth = async () => {
    setIsProcessing(true);
    try {
      await syncWithBackend();
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToDemoState = async () => {
    setChatMessages([]);
    setSelectedAuditDrawerEvent(null);
    setActiveAttackPreset(testCasesList[0] || TEST_CASES[0]);
    await syncWithBackend();
  };

  const refreshAuditEvents = async () => {
    setIsProcessing(true);
    try {
      const liveEvents = await apiClient.getAuditEvents(100);
      if (liveEvents && liveEvents.length > 0) {
        setAuditEvents(liveEvents);
      }
      const stats = await apiClient.getAuditStats();
      if (stats?.total_requests !== undefined) {
        // stats available, update quota
      }
    } catch (e) {
      console.warn('Audit refresh failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    isLiveMode,
    setIsLiveMode,
    backendConnected,
    quotaUsed,
    quotaTotal,
    chatMessages,
    auditEvents,
    selectedAuditDrawerEvent,
    setSelectedAuditDrawerEvent,
    activeAttackPreset,
    setActiveAttackPreset,
    healthStatuses,
    isProcessing,
    mobileMenuOpen,
    setMobileMenuOpen,
    sendChatMessage,
    testPromptOnBackend,
    runHarnessBatch,
    refreshHealth,
    refreshAuditEvents,
    resetToDemoState,
    testCases: testCasesList
  };
}
