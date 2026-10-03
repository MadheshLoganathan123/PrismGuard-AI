import { useState, useEffect, useCallback } from 'react';
import type { ActiveTab, AuditEvent, ChatMessage, ServiceHealth, TestCase } from '../types';
import type { DomainType, DomainRoutingEvent, ReviewItem, ReviewLabel, SimulatedModelUpdate } from '../types/domainRouting';
import { TEST_CASES } from '../data/testCases';
import { INITIAL_HEALTH_STATUS } from '../data/mockHealth';
import { INITIAL_ROUTING_EVENTS } from '../data/domainRoutingMockData';
import { INITIAL_REVIEW_QUEUE } from '../data/mockReviewQueue';
import { INITIAL_MODEL_UPDATES } from '../data/mockModelUpdates';
import { runSecurityPipeline } from '../engine/simulator';
import { runDomainRoutingPipeline, screeningFromAudit } from '../engine/domainPipeline';
import { applyReviewResolution, buildSimulatedUpdate, runSimulatedRegression, rollbackSimulatedUpdate } from '../engine/feedbackLoop';
import { apiClient, ApiRequestError, type ChatApiResponse } from '../api/client';

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
          if (h.id === 'health-guard-quota') {
            return {
              ...h,
              status: 'READY',
              latency_ms: 5,
              details: `Guard quota monitored via /api/guard/usage`,
              last_checked: new Date().toLocaleTimeString() + ' UTC',
              endpoint: '/api/guard/usage'
            };
          }
          return h;
        }));
      }

      // Fetch SQLite audit events
      const eventsRaw = await apiClient.getAuditEvents(100);
      const liveEvents: AuditEvent[] = Array.isArray(eventsRaw)
        ? eventsRaw
        : Array.isArray((eventsRaw as any)?.events)
          ? (eventsRaw as any).events
          : Array.isArray((eventsRaw as any)?.items)
            ? (eventsRaw as any).items
            : [];
      if (liveEvents.length > 0) {
        setAuditEvents(liveEvents);
      }

      // Fetch test catalog
      const catalogRaw = await apiClient.getTestCases();
      // Backend may return a plain array OR a wrapped object like { test_cases: [...] }
      const catalog: TestCase[] = Array.isArray(catalogRaw)
        ? catalogRaw
        : Array.isArray((catalogRaw as any)?.test_cases)
          ? (catalogRaw as any).test_cases
          : Array.isArray((catalogRaw as any)?.items)
            ? (catalogRaw as any).items
            : [];
      if (catalog.length > 0) {
        setTestCasesList(catalog);
      }

      // Fetch live Guard quota
      let quotaSetFromGuard = false;
      try {
        const usage = await apiClient.getGuardUsage();
        if (usage?.used_today !== undefined) {
          setQuotaUsed(usage.used_today);
          setQuotaTotal(usage.daily_limit || 1000);
          quotaSetFromGuard = true;
        } else if (usage?.calls_used !== undefined) {
          setQuotaUsed(usage.calls_used);
          setQuotaTotal(usage.budget_limit || 120);
          quotaSetFromGuard = true;
        }
      } catch { /* quota fetch optional — requires VIEWER+ role */ }

      // Fetch research metrics (as fallback for quota if guard usage not available)
      if (!quotaSetFromGuard) {
        try {
          const researchData = await apiClient.getResearchResults();
          if (researchData?.metrics?.budget_calls_made !== undefined) {
            setQuotaUsed(researchData.metrics.budget_calls_made);
          }
          if (researchData?.metrics?.budget_ceiling !== undefined) {
            setQuotaTotal(researchData.metrics.budget_ceiling);
          }
        } catch { /* research metrics fetch optional */ }
      }
    } catch (e) {
      console.warn('Backend sync failed, running in fallback mode:', e);
      setBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const [fallbackActive, setFallbackActive] = useState<boolean>(false);
  const [activeDomainRoutingEvent, setActiveDomainRoutingEvent] = useState<DomainRoutingEvent | null>(null);
  const [routingEvents, setRoutingEvents] = useState<DomainRoutingEvent[]>(INITIAL_ROUTING_EVENTS);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>(INITIAL_REVIEW_QUEUE);
  const [modelUpdates, setModelUpdates] = useState<SimulatedModelUpdate[]>(INITIAL_MODEL_UPDATES);
  const [activeRoutingPolicyVersion] = useState('v1.1.0');
  const [selectedDomain, setSelectedDomain] = useState<DomainType | 'ALL'>('ALL');
  const [routingMode, setRoutingMode] = useState<'LIVE' | 'SIMULATED'>('SIMULATED');
  const [lastRegressionSummary, setLastRegressionSummary] = useState<string | null>(null);

  const ingestRoutingResult = (event: DomainRoutingEvent, reviewItem: ReviewItem | null, auditEvent: AuditEvent) => {
    setActiveDomainRoutingEvent(event);
    setRoutingEvents(prev => [event, ...prev]);
    if (reviewItem) setReviewQueue(prev => [reviewItem, ...prev]);
    setAuditEvents(prev => [auditEvent, ...prev.filter(e => e.id !== auditEvent.id)]);
  };

  const runDomainRouting = async (prompt: string, scenarioId?: string) => {
    if (!prompt.trim() || isProcessing) return null;
    setIsProcessing(true);
    try {
      setRoutingMode(isLiveMode ? 'LIVE' : 'SIMULATED');
      const executionMode = fallbackActive ? 'LOCAL_FALLBACK' : 'SIMULATED';
      const result = await runDomainRoutingPipeline(prompt, {
        executionMode,
        scenarioId,
        forcedTestCaseId: scenarioId?.startsWith('DOM-') ? scenarioId : undefined,
      });
      ingestRoutingResult(result.event, result.reviewItem, result.auditEvent);
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  const createReviewItem = (eventId: string) => {
    const event = routingEvents.find(e => e.id === eventId) || activeDomainRoutingEvent;
    if (!event) return;
    const item: ReviewItem = {
      id: 'rev-' + Math.random().toString(36).slice(2, 9),
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      priority: event.policyDecision === 'BLOCK' ? 'HIGH' : 'MEDIUM',
      promptHash: event.promptHash,
      redactedPromptPreview: event.redactedPromptPreview,
      selectedDomain: event.routing.selectedDomain,
      proposedDomain: event.routing.selectedDomain,
      decision: event.policyDecision,
      riskScore: event.screening.riskScore,
      riskBand: event.screening.riskBand,
      matchedSignals: event.routing.matchedSignals,
      reason: 'Manually queued from Domain Routing Lab',
      feedbackStatus: 'NONE',
      eventId: event.id,
      executionMode: event.executionMode,
    };
    setReviewQueue(prev => [item, ...prev]);
    setActiveDomainRoutingEvent({ ...event, reviewRequired: true, reviewItemId: item.id });
  };

  const resolveReviewItem = (id: string, label: ReviewLabel, notes: string) => {
    setReviewQueue(prev => prev.map(item => item.id === id ? applyReviewResolution(item, label, notes) : item));
  };

  const simulateRuleUpdate = (reviewIds: string[]) => {
    const reviews = reviewQueue.filter(r => reviewIds.includes(r.id));
    if (reviews.length === 0) return;
    const drafted = buildSimulatedUpdate(reviews, activeRoutingPolicyVersion);
    setModelUpdates(prev => [drafted, ...prev]);
    setReviewQueue(prev => prev.map(r => reviewIds.includes(r.id) ? { ...r, feedbackStatus: 'APPLIED' } : r));
  };

  const runRoutingRegressionSuite = () => {
    const draft = modelUpdates.find(u => u.status === 'DRAFT' || u.status === 'READY_FOR_APPROVAL');
    if (draft) {
      const updated = runSimulatedRegression(draft);
      setModelUpdates(prev => prev.map(u => u.id === draft.id ? updated : u));
      setLastRegressionSummary(updated.regressionSummary);
    } else {
      setLastRegressionSummary('Simulated regression: 29/30 domain-boundary checks passed (96.7%). No real model retraining.');
    }
  };

  const rollbackModelUpdate = (id: string) => {
    setModelUpdates(prev => prev.map(u => u.id === id ? rollbackSimulatedUpdate(u) : u));
  };

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
          const liveMode = resp.audit_event.execution_mode || 'LIVE';
          resp.audit_event.execution_mode = liveMode;
          setFallbackActive(false);

          const routed = await runDomainRoutingPipeline(text, {
            executionMode: liveMode,
            forcedTestCaseId: presetId,
            screeningOverride: screeningFromAudit(resp.audit_event, liveMode),
            existingAudit: resp.audit_event,
          });
          const botMsg: ChatMessage = {
            id: 'msg-b-' + Date.now(),
            sender: 'assistant',
            text: routed.message.text || resp.assistant_text || 'No response generated.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            execution_mode: liveMode,
            decision: routed.event.policyDecision,
            risk_score: resp.risk_score,
            risk_band: resp.risk_band,
            telemetry: routed.auditEvent,
            routing: routed.event,
          };
          userMsg.execution_mode = liveMode;
          userMsg.decision = routed.event.policyDecision;
          userMsg.risk_score = resp.risk_score;
          userMsg.risk_band = resp.risk_band;
          userMsg.telemetry = routed.auditEvent;
          userMsg.routing = routed.event;

          setChatMessages(prev => [...prev.slice(0, -1), userMsg, botMsg]);
          ingestRoutingResult(routed.event, routed.reviewItem, routed.auditEvent);
          setQuotaUsed(prev => Math.min(quotaTotal, prev + 1));
          return;
        } catch (e: any) {
          if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
            const authMessage: ChatMessage = {
              id: 'msg-b-' + Date.now(),
              sender: 'assistant',
              text: e.status === 401
                ? 'Gateway API key is missing. Open Chat settings and enter a key configured in PRISMGUARD_API_KEYS.'
                : 'Gateway rejected this API key. Open Chat settings and use a key configured in PRISMGUARD_API_KEYS.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatMessages(prev => [...prev.slice(0, -1), userMsg, authMessage]);
            return;
          }
          console.warn('Live gateway call failed, executing with explicit LOCAL_FALLBACK:', e);
          setFallbackActive(true);
          const routed = await runDomainRoutingPipeline(text, { executionMode: 'LOCAL_FALLBACK', forcedTestCaseId: presetId });
          userMsg.execution_mode = 'LOCAL_FALLBACK';
          userMsg.decision = routed.event.policyDecision;
          userMsg.risk_score = routed.auditEvent.risk_score;
          userMsg.risk_band = routed.auditEvent.risk_band;
          userMsg.telemetry = routed.auditEvent;
          userMsg.routing = routed.event;

          setChatMessages(prev => [...prev.slice(0, -1), userMsg, routed.message]);
          ingestRoutingResult(routed.event, routed.reviewItem, routed.auditEvent);
          setQuotaUsed(prev => Math.min(quotaTotal, prev + 1));
          return;
        }
      }

      // Offline / explicit simulator mode
      const routed = await runDomainRoutingPipeline(text, { executionMode: 'SIMULATED', forcedTestCaseId: presetId });
      userMsg.execution_mode = 'SIMULATED';
      userMsg.decision = routed.event.policyDecision;
      userMsg.risk_score = routed.auditEvent.risk_score;
      userMsg.risk_band = routed.auditEvent.risk_band;
      userMsg.telemetry = routed.auditEvent;
      userMsg.routing = routed.event;

      setChatMessages(prev => [...prev.slice(0, -1), userMsg, routed.message]);
      ingestRoutingResult(routed.event, routed.reviewItem, routed.auditEvent);
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
      if (!resp.audit_event.execution_mode) {
        resp.audit_event.execution_mode = isLiveMode ? 'LIVE' : 'SIMULATED';
      }
      const routed = await runDomainRoutingPipeline(text, {
        executionMode: resp.audit_event.execution_mode || (isLiveMode ? 'LIVE' : 'SIMULATED'),
        forcedTestCaseId: presetId,
        screeningOverride: screeningFromAudit(resp.audit_event, resp.audit_event.execution_mode || 'LIVE'),
        existingAudit: resp.audit_event,
      });
      ingestRoutingResult(routed.event, routed.reviewItem, routed.auditEvent);
      setQuotaUsed(prev => Math.min(quotaTotal, prev + 1));
      return {
        ...resp,
        decision: routed.event.policyDecision,
        assistant_text: routed.message.text,
        audit_event: routed.auditEvent,
      };
    } catch (e) {
      console.warn('Backend prompt check failed, executing local fallback:', e);
      setFallbackActive(true);
      const routed = await runDomainRoutingPipeline(text, { executionMode: 'LOCAL_FALLBACK', forcedTestCaseId: presetId });
      ingestRoutingResult(routed.event, routed.reviewItem, routed.auditEvent);
      return {
        request_id: routed.auditEvent.gateway_request_id,
        decision: routed.event.policyDecision,
        risk_score: routed.auditEvent.risk_score,
        risk_band: routed.auditEvent.risk_band,
        assistant_text: routed.message.text,
        security: {
          local_signals: routed.auditEvent.local_signals,
          guard: {
            status: routed.auditEvent.guard_decision === 'PARTIAL' ? 'partial' : 'complete',
            allowed: routed.auditEvent.guard_decision === 'ALLOWED',
            flags: [],
            checks: {},
            latency_ms: routed.auditEvent.stage_latencies.guard_prompt
          }
        },
        stage_latencies: routed.auditEvent.stage_latencies,
        audit_event: routed.auditEvent
      };
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
          setFallbackActive(false);
          return;
        } catch (e) {
          console.warn('Live research run failed, executing with explicit LOCAL_FALLBACK:', e);
          setFallbackActive(true);
          const newEvents: AuditEvent[] = [];
          for (const tid of testIds) {
            const tc = testCasesList.find(t => t.test_id === tid);
            if (tc) {
              const { auditEvent } = await runSecurityPipeline(tc.raw_input, tc.test_id, 'LOCAL_FALLBACK');
              newEvents.push(auditEvent);
            }
          }
          setAuditEvents(prev => [...newEvents, ...prev]);
          setQuotaUsed(prev => Math.min(quotaTotal, prev + testIds.length));
          return;
        }
      }

      const newEvents: AuditEvent[] = [];
      for (const tid of testIds) {
        const tc = testCasesList.find(t => t.test_id === tid);
        if (tc) {
          const { auditEvent } = await runSecurityPipeline(tc.raw_input, tc.test_id, 'SIMULATED');
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

  // Refresh all data from live backend & SQLite
  const refreshData = async () => {
    setIsProcessing(true);
    try {
      await syncWithBackend();
    } finally {
      setIsProcessing(false);
    }
  };

  // Refresh current session (clear chat conversation, reset drawer, resync backend)
  const refreshSession = async () => {
    setIsProcessing(true);
    try {
      setChatMessages([]);
      setSelectedAuditDrawerEvent(null);
      setActiveAttackPreset(testCasesList[0] || TEST_CASES[0]);
      await syncWithBackend();
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToDemoState = async () => {
    await refreshSession();
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
    fallbackActive,
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
    refreshData,
    refreshSession,
    resetToDemoState,
    testCases: testCasesList,
    activeDomainRoutingEvent,
    routingEvents,
    reviewQueue,
    modelUpdates,
    activeRoutingPolicyVersion,
    selectedDomain,
    setSelectedDomain,
    routingMode,
    lastRegressionSummary,
    runDomainRouting,
    createReviewItem,
    resolveReviewItem,
    simulateRuleUpdate,
    runRoutingRegressionSuite,
    rollbackModelUpdate,
  };
}
