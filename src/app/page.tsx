'use client';

import { useState, useCallback } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { VoiceButton } from '@/components/VoiceButton';
import { ChatMessage } from '@/lib/gemini';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const addMessage = (role: ChatMessage['role'], content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const handleSend = useCallback(
    async (query: string) => {
      if (isStreaming) return;

      const userMessage: ChatMessage = { role: 'user', content: query };
      const newMessages = [...messages, userMessage];

      setMessages(newMessages);
      setIsStreaming(true);
      setStreamingText('');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, query }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Erro na API: ${res.status}`);
        }

        // Lê o stream chunk a chunk
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamingText(fullText);
        }

        // Finaliza: adiciona mensagem completa ao histórico
        setMessages((prev) => [...prev, { role: 'assistant', content: fullText }]);
      } catch (err) {
        console.error('[Chat] Erro:', err);
        addMessage('assistant', 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.');
      } finally {
        setIsStreaming(false);
        setStreamingText('');
      }
    },
    [messages, isStreaming]
  );

  // Quando a conversa por voz termina um turno, adiciona ao histórico de texto
  const handleVoiceTranscript = useCallback((aiText: string, userText: string) => {
    if (userText) addMessage('user', userText);
    if (aiText) addMessage('assistant', aiText);
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-dark)',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient decorativo */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--gradient-brand)',
          opacity: 0.15,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-20%',
          right: '-10%',
          width: '60vw',
          height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(85,37,131,0.3) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Chat container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 680,
          height: 'min(85vh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          background: 'rgba(26, 15, 46, 0.85)',
          border: '1px solid var(--surface-border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {/* Logo mark + título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid var(--color-ocre)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--color-ocre)',
                flexShrink: 0,
              }}
            >
              T
            </div>
            <div>
              <h1
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--color-title-dark)',
                  letterSpacing: '0.08em',
                  lineHeight: 1,
                }}
              >
                TECNOPUC
              </h1>
              <p style={{ fontSize: '0.65rem', color: 'var(--color-gray)', marginTop: 2, lineHeight: 1 }}>
                Parque Científico e Tecnológico da PUCRS
              </p>
            </div>
          </div>

          {/* Modo de voz */}
          <VoiceButton onTranscript={handleVoiceTranscript} disabled={isStreaming} />
        </header>

        {/* Área de mensagens */}
        <ChatWindow
          messages={messages}
          isStreaming={isStreaming}
          streamingText={streamingText}
        />

        {/* Input de texto */}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>

      {/* Sugestões de perguntas iniciais */}
      {messages.length === 0 && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            marginTop: 16,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            maxWidth: 680,
          }}
        >
          {[
            'O que é o TecnoPUC?',
            'Quais empresas estão no parque?',
            'Como posso fazer parte do TecnoPUC?',
          ].map((suggestion) => (
            <button
              key={suggestion}
              id={`suggestion-${suggestion.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => handleSend(suggestion)}
              disabled={isStreaming}
              style={{
                background: 'var(--surface-primary)',
                border: '1px solid var(--surface-border)',
                borderRadius: 99,
                padding: '8px 16px',
                fontSize: '0.8rem',
                color: 'var(--color-body-dark)',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'border-color 0.2s, background 0.2s',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-ocre)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-secondary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-border)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-primary)';
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
