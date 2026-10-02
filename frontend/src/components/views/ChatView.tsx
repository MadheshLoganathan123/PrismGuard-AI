import React, { useState, useRef, useEffect } from 'react';
import {
  Shield, Send, Paperclip, Copy, ThumbsUp, ThumbsDown,
  CheckCircle2, ChevronRight, Plus, Check, Code, FileText,
  AlertOctagon, Key, Sparkles, MessageSquare
} from 'lucide-react';
import type { ChatMessage, AuditEvent, TestCase } from '../../types';

interface ChatViewProps {
  chatMessages: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (text: string, presetId?: string) => Promise<void>;
  onSelectAudit: (event: AuditEvent) => void;
  testCases: TestCase[];
}

function getIconForTestCase(tc: TestCase) {
  if (tc.expected_label === 'output') {
    return { icon: <Key size={15} color="#D97706" />, bg: '#FEF3C7', badgeCls: 'orange' };
  }
  if (tc.expected_label === 'benign') {
    return { icon: <Code size={15} color="#2563EB" />, bg: '#EFF6FF', badgeCls: 'blue' };
  }
  if (tc.category?.toLowerCase().includes('role') || tc.category?.toLowerCase().includes('direct')) {
    return { icon: <AlertOctagon size={15} color="#DC2626" />, bg: '#FEF2F2', badgeCls: 'red' };
  }
  return { icon: <FileText size={15} color="#7C3AED" />, bg: '#EDE9FE', badgeCls: 'purple' };
}

export const ChatView: React.FC<ChatViewProps> = ({
  chatMessages,
  isProcessing,
  onSendMessage,
  onSelectAudit,
  testCases,
}) => {
  const [inputText, setInputText] = useState('');
  const [promptFilterTab, setPromptFilterTab] = useState<'all' | 'benign' | 'adversarial'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Latest message with telemetry from real conversation
  const latestMessageWithTelemetry = [...chatMessages].reverse().find(m => m.telemetry);
  const activeTelemetry: AuditEvent | undefined = latestMessageWithTelemetry?.telemetry;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isProcessing]);

  const handleSend = (textToSend?: string, presetId?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isProcessing) return;
    onSendMessage(text, presetId);
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter test cases from the real test catalog
  const filteredTestCases = testCases.filter(tc => {
    if (promptFilterTab === 'benign') return tc.expected_label === 'benign';
    if (promptFilterTab === 'adversarial') return tc.expected_label !== 'benign';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Top Header Bar ── */}
      <div
        className="card"
        style={{
          padding: '16px 24px',
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Title and Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#059669" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Protected Chat
            </h1>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              Interact with AI through a security-first gateway. Every message is analyzed, filtered and protected.
            </div>
          </div>
        </div>

        {/* Quick Tests from real catalog and New Chat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginRight: 4 }}>Quick Tests:</span>
          {testCases.slice(0, 6).map(tc => (
            <button
              key={tc.test_id}
              onClick={() => handleSend(tc.raw_input, tc.test_id)}
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                padding: '4px 9px',
                borderRadius: 7,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title={tc.name}
            >
              {tc.test_id}
            </button>
          ))}

          <button
            onClick={() => setInputText('')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              cursor: 'pointer',
              marginLeft: 6,
            }}
          >
            <Plus size={14} color="#0F172A" />
            New Chat
          </button>
        </div>
      </div>

      {/* ── 3-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>

        {/* ── Left Column: Example Prompts ── */}
        <div
          className="card"
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Example Prompts</div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Try these to see how PrismGuard works.</div>
          </div>

          {/* Segmented Filter Buttons */}
          <div
            style={{
              display: 'flex',
              padding: 3,
              borderRadius: 8,
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              onClick={() => setPromptFilterTab(promptFilterTab === 'benign' ? 'all' : 'benign')}
              style={{
                flex: 1,
                fontSize: 11.5,
                fontWeight: 600,
                padding: '5px 8px',
                borderRadius: 6,
                border: 'none',
                background: promptFilterTab === 'benign' ? '#FFFFFF' : 'transparent',
                color: promptFilterTab === 'benign' ? '#0F172A' : '#64748B',
                boxShadow: promptFilterTab === 'benign' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              Benign Prompts
            </button>
            <button
              onClick={() => setPromptFilterTab(promptFilterTab === 'adversarial' ? 'all' : 'adversarial')}
              style={{
                flex: 1,
                fontSize: 11.5,
                fontWeight: 600,
                padding: '5px 8px',
                borderRadius: 6,
                border: 'none',
                background: promptFilterTab === 'adversarial' ? '#FFFFFF' : 'transparent',
                color: promptFilterTab === 'adversarial' ? '#0F172A' : '#64748B',
                boxShadow: promptFilterTab === 'adversarial' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              Adversarial Prompts
            </button>
          </div>

          {/* Prompt Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredTestCases.slice(0, 8).map(tc => {
              const meta = getIconForTestCase(tc);

              return (
                <div
                  key={tc.test_id}
                  onClick={() => handleSend(tc.raw_input, tc.test_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  {/* Icon box */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: meta.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tc.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: meta.badgeCls === 'red' ? '#FEF2F2' : meta.badgeCls === 'orange' ? '#FEF3C7' : '#EFF6FF',
                          color: meta.badgeCls === 'red' ? '#DC2626' : meta.badgeCls === 'orange' ? '#D97706' : '#2563EB',
                          border: `1px solid ${meta.badgeCls === 'red' ? '#FECACA' : meta.badgeCls === 'orange' ? '#FDE68A' : '#BFDBFE'}`,
                        }}
                      >
                        {tc.test_id}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2,
                      }}
                    >
                      {tc.description || tc.raw_input}
                    </div>
                  </div>

                  <ChevronRight size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Middle Column: Chat Conversation ── */}
        <div
          className="card"
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 680,
          }}
        >
          {/* Conversation Status Header */}
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#10B981',
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Live Protected Session</span>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '24px 24px 16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {chatMessages.length === 0 ? (
              <div
                style={{
                  margin: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  padding: '40px 20px',
                  textAlign: 'center',
                  maxWidth: 420,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MessageSquare size={24} color="#059669" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Ready to screen messages
                </div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                  Type a prompt below or pick any quick test from the sidebar to send a request through the real PrismGuard pipeline.
                </div>
              </div>
            ) : (
              chatMessages.map(msg => {
                const isUser = msg.sender === 'user';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      gap: 6,
                      width: '100%',
                    }}
                  >
                    {/* Sender Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
                      {!isUser && (
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Sparkles size={12} color="#059669" />
                        </div>
                      )}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isUser ? '#2563EB' : '#059669',
                        }}
                      >
                        {isUser ? 'You' : 'Assistant'}
                      </span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{msg.timestamp}</span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={{
                        maxWidth: '85%',
                        background: isUser ? '#EFF6FF' : '#FFFFFF',
                        border: `1px solid ${isUser ? '#DBEAFE' : '#E2E8F0'}`,
                        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        padding: '14px 18px',
                        color: '#0F172A',
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.text}

                      {/* Action buttons on assistant message */}
                      {!isUser && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 12,
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: '1px solid #F1F5F9',
                          }}
                        >
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            title="Copy response"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {copiedId === msg.id ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                          </button>
                          <button
                            title="Helpful"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button
                            title="Not helpful"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  maxWidth: 400,
                }}
              >
                <span className="dot dot-allow animate-pulse-glow" />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#2563EB' }}>
                  Analyzing through PrismGuard pipeline...
                </span>
              </div>
            )}

            {/* ── Security Trace Card (Shown when telemetry exists) ── */}
            {activeTelemetry && (
              <div
                style={{
                  marginTop: 'auto',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    <Shield size={15} color="#059669" />
                    Security Trace
                  </div>
                  <button
                    onClick={() => onSelectAudit(activeTelemetry)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563EB',
                      cursor: 'pointer',
                    }}
                  >
                    View Full Telemetry →
                  </button>
                </div>

                {/* Horizontal Pipeline Status Nodes */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    overflowX: 'auto',
                    gap: 8,
                    padding: '4px 0',
                  }}
                >
                  {[
                    { name: 'Normalize', ms: `${activeTelemetry.stage_latencies?.normalizer || 0} ms` },
                    { name: 'Detect', ms: `${activeTelemetry.stage_latencies?.detector || 0} ms` },
                    { name: 'Guard', ms: `${activeTelemetry.stage_latencies?.guard_prompt || 0} ms` },
                    { name: 'Risk', ms: `${activeTelemetry.stage_latencies?.risk_engine || 0} ms` },
                    { name: 'LLM', ms: `${activeTelemetry.stage_latencies?.llm || 0} ms` },
                    { name: 'Output', ms: `${activeTelemetry.stage_latencies?.guard_response || 0} ms` },
                    { name: 'Audit', ms: `${activeTelemetry.stage_latencies?.audit || 0} ms` },
                  ].map((st, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        minWidth: 54,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} color="#059669" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{st.name}</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'var(--font-mono)' }}>{st.ms}</span>
                    </div>
                  ))}
                </div>

                {/* Trace Footer Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingTop: 8,
                    borderTop: '1px solid #E2E8F0',
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#64748B', fontWeight: 500 }}>Risk:</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: activeTelemetry.risk_score >= 60 ? '#FEF2F2' : activeTelemetry.risk_score >= 30 ? '#FFF7ED' : '#ECFDF5',
                        color: activeTelemetry.risk_score >= 60 ? '#DC2626' : activeTelemetry.risk_score >= 30 ? '#EA580C' : '#059669',
                        border: `1px solid ${activeTelemetry.risk_score >= 60 ? '#FECACA' : activeTelemetry.risk_score >= 30 ? '#FED7AA' : '#A7F3D0'}`,
                      }}
                    >
                      {activeTelemetry.risk_band || 'LOW'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#64748B', fontWeight: 500 }}>Policy:</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                      }}
                    >
                      {activeTelemetry.policy_decision || 'ALLOW'}
                    </span>
                  </div>

                  <div style={{ marginLeft: 'auto', fontSize: 11.5, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                    Total Latency: {activeTelemetry.total_latency_ms || 0} ms
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #F1F5F9',
              background: '#FFFFFF',
              borderRadius: '0 0 14px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '6px 10px 6px 14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              {/* Paperclip */}
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
              >
                <Paperclip size={18} />
              </button>

              {/* Text Input */}
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message..."
                disabled={isProcessing}
                rows={1}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  resize: 'none',
                  padding: '6px 0',
                  color: '#0F172A',
                  lineHeight: 1.4,
                }}
              />

              {/* Helper text */}
              <div
                className="hide-md"
                style={{
                  fontSize: 9.5,
                  color: '#94A3B8',
                  textAlign: 'right',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                }}
              >
                Press Enter to send<br />Shift + Enter for new line
              </div>

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isProcessing}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: !inputText.trim() || isProcessing ? '#94A3B8' : '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !inputText.trim() || isProcessing ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column: Request Telemetry ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Card 1: Request Telemetry */}
          <div
            className="card"
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Request Telemetry</span>
              {activeTelemetry && (
                <button
                  onClick={() => onSelectAudit(activeTelemetry)}
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#2563EB',
                    cursor: 'pointer',
                  }}
                >
                  Inspect Details →
                </button>
              )}
            </div>

            {!activeTelemetry ? (
              <div style={{ fontSize: 12, color: '#64748B', padding: '16px 0', textAlign: 'center' }}>
                No active telemetry. Send a message to inspect live gateway verification metrics.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                {/* Request ID */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Request ID</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                      {activeTelemetry.gateway_request_id}
                    </span>
                    <Copy
                      size={12}
                      color="#94A3B8"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleCopy('req-id', activeTelemetry.gateway_request_id)}
                    />
                  </div>
                </div>

                {/* Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Timestamp</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0F172A' }}>
                    {activeTelemetry.timestamp}
                  </span>
                </div>

                {/* Input SHA-256 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Input SHA-256</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748B' }}>
                      {activeTelemetry.input_sha256?.substring(0, 10)}...{activeTelemetry.input_sha256?.substring(activeTelemetry.input_sha256.length - 4)}
                    </span>
                    <Copy
                      size={12}
                      color="#94A3B8"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleCopy('sha-id', activeTelemetry.input_sha256)}
                    />
                  </div>
                </div>

                {/* Classification */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Classification</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    {activeTelemetry.classification || 'Benign Query'}
                  </span>
                </div>

                {/* Risk Score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Risk Score</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: activeTelemetry.risk_score >= 60 ? '#DC2626' : activeTelemetry.risk_score >= 30 ? '#EA580C' : '#059669',
                    }}
                  >
                    {activeTelemetry.risk_score} / 100
                  </span>
                </div>

                {/* Policy Decision */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Policy Decision</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #BFDBFE',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {activeTelemetry.policy_decision || 'ALLOW'}
                  </span>
                </div>

                {/* Guard Decision */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Guard Decision</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: activeTelemetry.guard_decision === 'BLOCKED' ? '#FEF2F2' : '#EFF6FF',
                      color: activeTelemetry.guard_decision === 'BLOCKED' ? '#DC2626' : '#2563EB',
                      border: `1px solid ${activeTelemetry.guard_decision === 'BLOCKED' ? '#FECACA' : '#BFDBFE'}`,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {activeTelemetry.guard_decision || 'ALLOW'}
                  </span>
                </div>

                {/* Total Latency */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Total Latency</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                    {activeTelemetry.total_latency_ms || 0} ms
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Local Detection Signals */}
          <div
            className="card"
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              <Shield size={15} color="#059669" />
              Local Detection Signals
            </div>

            {(!activeTelemetry || !activeTelemetry.local_signals || activeTelemetry.local_signals.length === 0) ? (
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>No significant signals detected</div>
                  <div style={{ fontSize: 11, color: '#15803D', marginTop: 2 }}>
                    Input appears to be a benign query.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {activeTelemetry.local_signals.map((sig, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: '#FFF7ED',
                      border: '1px solid #FED7AA',
                      color: '#9A3412',
                      padding: '4px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {sig}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Guard API Result */}
          <div
            className="card"
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                <Shield size={15} color="#D97706" />
                Guard API Result
              </div>
              {activeTelemetry && (
                <Copy
                  size={12}
                  color="#94A3B8"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCopy('guard-json', JSON.stringify({
                    status: 'Complete',
                    allowed: activeTelemetry.guard_decision !== 'BLOCKED',
                    latency: activeTelemetry.stage_latencies?.guard_prompt || 0
                  }))}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Status</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  {activeTelemetry ? 'Complete' : 'Ready'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Allowed</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                  {activeTelemetry ? (activeTelemetry.guard_decision === 'BLOCKED' ? 'False' : 'True') : '—'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Flags</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#64748B' }}>None</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Latency</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                  {activeTelemetry ? `${activeTelemetry.stage_latencies?.guard_prompt || 0} ms` : '—'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
