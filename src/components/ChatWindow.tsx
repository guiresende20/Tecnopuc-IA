'use client';

import { useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/gemini';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
}

// Converte markdown simples em HTML seguro
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

export function ChatWindow({ messages, isStreaming, streamingText }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const visibleMessages = messages.filter((m) => m.role !== 'assistant' || m.content);

  return (
    <div
      id="chat-window"
      style={{
        flex: 1,
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
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}
        >
          <div
            style={{
              maxWidth: '82%',
              padding: '12px 16px',
              borderRadius:
                msg.role === 'user'
                  ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
                  : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
              background:
                msg.role === 'user'
                  ? 'var(--color-ocre)'
                  : 'var(--surface-secondary)',
              border:
                msg.role === 'user'
                  ? 'none'
                  : '1px solid var(--surface-border)',
              color:
                msg.role === 'user' ? '#fff' : 'var(--color-body-dark)',
              fontSize: '0.9375rem',
              lineHeight: 1.65,
            }}
          >
            {msg.role === 'assistant' ? (
              <div
                className="prose-tecnopuc"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
              />
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}

      {/* Indicador de streaming */}
      {isStreaming && (
        <div
          className="animate-fade-in-up"
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
          }}
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
              <div
                className="prose-tecnopuc"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }}
              />
            ) : (
              /* Dots de loading */
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
  );
}
