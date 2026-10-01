import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Shield, 
  Lock
} from 'lucide-react';
import type { ChatMessage, AuditEvent, TestCase } from '../../types';
import { Badge } from '../common/Badge';

interface ChatViewProps {
  chatMessages: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (text: string, presetId?: string) => Promise<void>;
  onSelectAudit: (event: AuditEvent) => void;
  testCases: TestCase[];
}

export const ChatView: React.FC<ChatViewProps> = ({
  chatMessages,
  isProcessing,
  onSendMessage,
  onSelectAudit,
  testCases
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessing]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    onSendMessage(inputText, selectedPresetId);
    setInputText('');
    setSelectedPresetId(undefined);
  };

  const loadPreset = (tc: TestCase) => {
    setInputText(tc.raw_input);
    setSelectedPresetId(tc.test_id);
  };

  const sampleQuickPrompts = [
    { label: 'Benign Coding (FP-001)', id: 'FP-001', color: 'allow' },
    { label: 'Academic Auth (FP-002)', id: 'FP-002', color: 'allow' },
    { label: 'Base64 Smuggling (PI-005)', id: 'PI-005', color: 'review' },
    { label: 'Markdown Breakout (PI-004)', id: 'PI-004', color: 'review' },
    { label: 'Direct Override (PI-001)', id: 'PI-001', color: 'block' },
    { label: 'Fabricated Secret (OUT-001)', id: 'OUT-001', color: 'info' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', maxWidth: '1080px', margin: '0 auto', gap: '16px' }}>
      {/* Top Banner: Defense Status */}
      <div className="glass-panel" style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={16} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Protected Assistant Session</span>
              <span className="badge badge-allow" style={{ fontSize: '9px', padding: '1px 5px' }}>DOUBLE-SCREENED</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Dual control plane: Input canonicalized before Guard & Model output verified before release
            </div>
          </div>
        </div>

        {/* Quick presets pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick test:</span>
          {sampleQuickPrompts.map(p => {
            const tc = testCases.find(t => t.test_id === p.id);
            if (!tc) return null;
            return (
              <button
                key={p.id}
                onClick={() => loadPreset(tc)}
                className={`badge badge-${p.color}`}
                style={{
                  cursor: 'pointer',
                  border: '1px solid currentColor',
                  background: 'rgba(255, 255, 255, 0.04)',
                  fontSize: '10px'
                }}
                title={`Load ${tc.name}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="glass-panel" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {chatMessages.map(msg => {
          const isUser = msg.sender === 'user';
          const tel = msg.telemetry;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '6px',
                width: '100%'
              }}
            >
              {/* Message Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                padding: '0 4px'
              }}>
                <span style={{ fontWeight: 600, color: isUser ? 'var(--brand-cyan)' : 'var(--brand-primary)' }}>
                  {isUser ? 'USER CLIENT (Untrusted Zone)' : 'PRISMGUARD ASSISTANT'}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>

                {msg.decision && (
                  <Badge decision={msg.decision} style={{ fontSize: '9px', padding: '1px 5px' }} />
                )}
              </div>

              {/* Message Bubble */}
              <div style={{
                maxWidth: '82%',
                background: isUser ? 'rgba(99, 102, 241, 0.16)' : 'var(--bg-card-subtle)',
                border: isUser ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-medium)',
                borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                padding: '14px 18px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: '1.6',
                boxShadow: isUser ? '0 2px 12px rgba(99, 102, 241, 0.15)' : 'none',
                position: 'relative'
              }}>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.text}
                </div>

                {/* Telemetry Card on Messages */}
                {tel && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>GW: {tel.gateway_request_id}</span>
                      <span style={{
                        color: tel.risk_score > 60 ? 'var(--status-block)' : tel.risk_score > 30 ? 'var(--status-warn)' : 'var(--status-allow)'
                      }}>
                        Risk: {tel.risk_score}/100
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{tel.total_latency_ms}ms</span>
                    </div>

                    <button
                      onClick={() => onSelectAudit(tel)}
                      className="btn-ghost"
                      style={{
                        padding: '3px 8px',
                        fontSize: '10px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--brand-cyan)',
                        border: '1px solid rgba(6, 182, 212, 0.3)'
                      }}
                    >
                      Inspect Gateway Telemetry →
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Processing Pipeline Stepper */}
        {isProcessing && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--brand-primary)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '700px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-dot status-dot-allow animate-pulse-glow" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-cyan)' }}>
                Traversing PrismGuard Defense-in-Depth Pipeline...
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div className="pipeline-node active">
                <span>01 Normalizer</span>
              </div>
              <div className="pipeline-node active">
                <span>02 Detector</span>
              </div>
              <div className="pipeline-node active">
                <span>03 Guard Prompt</span>
              </div>
              <div className="pipeline-node active">
                <span>04 Risk & Policy</span>
              </div>
              <div className="pipeline-node active">
                <span>05 LLM & Output Guard</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Type a normal query or paste a synthetic attack vector (e.g. Base64, markdown jailbreak, role override)..."
            disabled={isProcessing}
            rows={2}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              lineHeight: '1.5'
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="btn btn-primary"
            style={{
              height: '42px',
              padding: '0 20px',
              opacity: !inputText.trim() || isProcessing ? 0.5 : 1
            }}
          >
            <span>Screen & Send</span>
            <Send size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={12} color="var(--brand-cyan)" />
            <span>Synthetic security sandbox mode • SHA-256 hashed input verification</span>
          </div>
          <span>Press Enter to send, Shift+Enter for newline</span>
        </div>
      </form>
    </div>
  );
};
