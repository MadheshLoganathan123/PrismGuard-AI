import { useState } from 'react';
import type { ActiveTab, AuditEvent, ChatMessage, ServiceHealth, TestCase } from '../types';
import { TEST_CASES } from '../data/testCases';
import { INITIAL_AUDIT_EVENTS } from '../data/initialAuditEvents';
import { INITIAL_HEALTH_STATUS } from '../data/mockHealth';
import { runSecurityPipeline } from '../engine/simulator';
import { apiClient } from '../api/client';

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-seed-1',
    sender: 'user',
    text: 'Explain the difference between authentication and authorization for a cybersecurity class syllabus.',
    timestamp: '17:32',
    decision: 'ALLOW',
    risk_score: 12,
    risk_band: 'LOW'
  },
  {
    id: 'msg-seed-2',
    sender: 'assistant',
    text: `### Authentication (AuthN) vs Authorization (AuthZ)\n\nIn secure system architecture, these two concepts form complementary access boundaries:\n\n1. **Authentication (AuthN) — "Who are you?"**\n   - Verifies the identity of the user, client, or service.\n   - **Methods**: Passwords, Multi-Factor Authentication (MFA), biometric scans, OAuth2 OpenID Connect.\n\n2. **Authorization (AuthZ) — "What are you permitted to do?"**\n   - Evaluates whether an authenticated identity has permission to perform a specific action on a protected resource.\n   - **Models**: Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC).\n\n*Protected and verified by PrismGuard AI (Input Normalized, SecureAI Guard Prompt Passed, Output Sanitized).*`,
    timestamp: '17:32',
    decision: 'ALLOW',
    risk_score: 12,
    risk_band: 'LOW',
    telemetry: INITIAL_AUDIT_EVENTS[3]
  }
];

export function useAppStore() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [quotaUsed, setQuotaUsed] = useState<number>(36);
  const [quotaTotal] = useState<number>(120);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [selectedAuditDrawerEvent, setSelectedAuditDrawerEvent] = useState<AuditEvent | null>(null);
  const [activeAttackPreset, setActiveAttackPreset] = useState<TestCase>(TEST_CASES[0]); // PI-005
  const [healthStatuses, setHealthStatuses] = useState<ServiceHealth[]>(INITIAL_HEALTH_STATUS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
        } catch (e) {
          console.warn('Live gateway call failed, using client-side fallback:', e);
        }
      }

      const { message: botMsg, auditEvent } = await runSecurityPipeline(text, presetId);
      
      // Attach telemetry to user msg as well for visualization
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

  // Run batch harness tests
  const runHarnessBatch = async (testIds: string[]) => {
    setIsProcessing(true);
    try {
      if (isLiveMode) {
        try {
          const batchRes = await apiClient.runResearchBatch(testIds);
          const evts = await apiClient.getAuditEvents(50);
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
        const tc = TEST_CASES.find(t => t.test_id === tid);
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
    if (isLiveMode) {
      try {
        const healthData = await apiClient.getHealth();
        if (healthData && healthData.services) {
          setHealthStatuses(prev => prev.map(h => {
            if (h.id === 'srv-guard') {
              return {
                ...h,
                status: healthData.services.secureai_guard?.status === 'READY' ? 'READY' : 'DEGRADED',
                latency_ms: healthData.services.secureai_guard?.latency_ms || 42,
                last_checked: new Date().toISOString().substring(11, 19) + ' UTC',
                details: `SecureAI Guard endpoint: ${healthData.services.secureai_guard?.endpoint || 'Connected'}`
              };
            }
            if (h.id === 'srv-gateway') {
              return {
                ...h,
                status: healthData.status === 'healthy' ? 'READY' : 'DEGRADED',
                latency_ms: 4,
                last_checked: new Date().toISOString().substring(11, 19) + ' UTC',
                details: `FastAPI Security Gateway Active (${healthData.services.database?.status || 'Ready'})`
              };
            }
            return h;
          }));
          setIsProcessing(false);
          return;
        }
      } catch (e) {
        console.warn('Live health check failed, using simulated response:', e);
      }
    }

    setTimeout(() => {
      const updated = healthStatuses.map(h => ({
        ...h,
        last_checked: new Date().toISOString().substring(11, 19) + ' UTC',
        latency_ms: Math.max(1, Math.round(h.latency_ms + (Math.random() * 8 - 4)))
      }));
      setHealthStatuses(updated);
      setIsProcessing(false);
    }, 600);
  };


  const resetToDemoState = () => {
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setAuditEvents(INITIAL_AUDIT_EVENTS);
    setQuotaUsed(36);
    setSelectedAuditDrawerEvent(null);
    setActiveAttackPreset(TEST_CASES[0]);
  };

  return {
    activeTab,
    setActiveTab,
    isLiveMode,
    setIsLiveMode,
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
    runHarnessBatch,
    refreshHealth,
    resetToDemoState,
    testCases: TEST_CASES
  };
}
