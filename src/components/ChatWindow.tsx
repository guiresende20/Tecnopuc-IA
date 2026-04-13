'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/gemini';

interface Source {
  source: string;
  similarity: string;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  messageSources?: Record<number, Source[]>;
  isUserTyping?: boolean;
}

export function ChatWindow({ messages, isStreaming, streamingText, messageSources = {}, isUserTyping = false }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < 80;
    setShowScrollBtn(distanceFromBottom > 120);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, isUserTyping]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback silencioso
    }
  };

  const visibleMessages = messages.filter((m) => m.role !== 'assistant' || m.content);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div
        ref={scrollRef}
        id="chat-window"
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Estado vazio */}
        {visibleMessages.length === 0 && !isStreaming && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              opacity: 0.6,
              textAlign: 'center',
              padding: '40px 0',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '2px solid var(--color-ocre)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: 'var(--color-ocre)',
                fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              T
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-body-dark)' }}>
              Olá! Como posso ajudar você hoje?
              <br />
              Pergunte sobre o <strong>TecnoPUC</strong>.
            </p>
          </div>
        )}

        {/* Mensagens */}
        {visibleMessages.map((msg, i) => (
          <div
            key={i}
            className="animate-fade-in-up"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 4,
            }}
          >
            {/* Balão */}
            <div
              style={{
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius:
                  msg.role === 'user'
                    ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
                    : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
                background:
                  msg.role === 'user' ? 'var(--color-ocre)' : 'var(--surface-secondary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--surface-border)',
                color: msg.role === 'user' ? '#fff' : 'var(--color-body-dark)',
                fontSize: '0.9375rem',
                lineHeight: 1.65,
              }}
            >
              {msg.role === 'assistant' ? (
                <div className="prose-tecnopuc">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>

            {/* Metadados de mensagens do assistente: copiar + fontes */}
            {msg.role === 'assistant' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  maxWidth: '82%',
                  flexWrap: 'wrap',
                }}
              >
                {/* Botão copiar */}
                <button
                  onClick={() => copyMessage(msg.content, i)}
                  title="Copiar resposta"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: 4,
                    color: copiedIndex === i ? '#4ade80' : '#64748b',
                    fontSize: '0.68rem',
                    fontFamily: 'Montserrat, sans-serif',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (copiedIndex !== i)
                      (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    if (copiedIndex !== i)
                      (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                  }}
                >
                  {copiedIndex === i ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copiar
                    </>
                  )}
                </button>

                {/* Fontes RAG */}
                {messageSources[i] && messageSources[i].length > 0 && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: '#475569',
                      fontFamily: 'Montserrat, sans-serif',
                      lineHeight: 1.4,
                    }}
                  >
                    Fontes:{' '}
                    {messageSources[i].map((s, si) => (
                      <span key={si}>
                        {si > 0 && ' · '}
                        <span style={{ color: '#64748b' }}>
                          {s.source?.split('/').pop() ?? s.source}
                        </span>
                        {s.similarity && (
                          <span style={{ color: '#334155' }}> ({Math.round(parseFloat(s.similarity) * 100)}%)</span>
                        )}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Indicador de digitação do usuário */}
        {isUserTyping && !isStreaming && (
          <div
            className="animate-fade-in-up"
            style={{ display: 'flex', justifyContent: 'flex-end' }}
          >
            <div
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md) var(--radius-md) 4px var(--radius-md)',
                background: 'rgba(234,152,47,0.15)',
                border: '1px solid rgba(234,152,47,0.25)',
                display: 'flex',
                gap: 5,
                alignItems: 'center',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--color-ocre)',
                    display: 'inline-block',
                    opacity: 0.7,
                    animation: `wave 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Indicador de streaming */}
        {isStreaming && (
          <div
            className="animate-fade-in-up"
            style={{ display: 'flex', justifyContent: 'flex-start' }}
          >
            <div
              style={{
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
                background: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                fontSize: '0.9375rem',
                lineHeight: 1.65,
                color: 'var(--color-body-dark)',
              }}
            >
              {streamingText ? (
                <div className="prose-tecnopuc">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '1em',
                      background: 'var(--color-ocre)',
                      marginLeft: '2px',
                      verticalAlign: 'text-bottom',
                      animation: 'blink 1s step-end infinite',
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, padding: '4px 0' }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-ocre)',
                        display: 'inline-block',
                        animation: `wave 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Botão rolar para o final */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          aria-label="Rolar para o final"
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-purple-mid)',
            border: '1px solid var(--surface-border)',
            borderRadius: 99,
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#fff',
            fontSize: '0.75rem',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeInUp 0.2s ease forwards',
            zIndex: 10,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          Nova mensagem
        </button>
      )}
    </div>
  );
}
