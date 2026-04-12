'use client';

import { useState, useEffect, useCallback } from 'react';
import { GeminiLiveChat, LiveChatStatus } from '@/lib/gemini-live';

interface VoiceButtonProps {
  onTranscript?: (aiText: string, userText: string) => void;
  disabled?: boolean;
}

const STATUS_LABEL: Record<LiveChatStatus, string> = {
  disconnected: 'Falar',
  connecting: 'Conectando...',
  connected: 'Conectado',
  listening: 'Ouvindo...',
  speaking: 'Respondendo...',
  error: 'Erro',
};

const STATUS_COLOR: Record<LiveChatStatus, string> = {
  disconnected: 'var(--color-purple-mid)',
  connecting: 'var(--color-gray)',
  connected: 'var(--color-purple-light)',
  listening: 'var(--color-ocre)',
  speaking: 'var(--color-purple-light)',
  error: '#e74c3c',
};

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [status, setStatus] = useState<LiveChatStatus>('disconnected');
  const [liveChat, setLiveChat] = useState<GeminiLiveChat | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isActive = status !== 'disconnected' && status !== 'error';

  const handleStop = useCallback(() => {
    liveChat?.stop();
    setLiveChat(null);
    setStatus('disconnected');
  }, [liveChat]);

  const handleStart = useCallback(async () => {
    setErrorMsg(null);
    setStatus('connecting');

    try {
      // 1. Busca o systemInstruction enriquecido com RAG da API route
      const res = await fetch('/api/voice-context');
      const { systemInstruction } = await res.json();

      // 2. Cria e inicia a sessão Gemini Live
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_GEMINI_API_KEY não configurada.');
      }

      const chat = new GeminiLiveChat(apiKey, {
        onStatusChange: setStatus,
        onTurnComplete: (aiText, userText) => {
          onTranscript?.(aiText, userText);
        },
        onError: (err) => {
          setErrorMsg(err);
          setStatus('error');
        },
      }, systemInstruction);

      setLiveChat(chat);
      await chat.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar voz.';
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [onTranscript]);

  // Limpa ao desmontar
  useEffect(() => {
    return () => {
      liveChat?.stop();
    };
  }, [liveChat]);

  const handleClick = () => {
    if (disabled) return;
    if (isActive) {
      handleStop();
    } else {
      handleStart();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        id="voice-toggle-button"
        onClick={handleClick}
        disabled={disabled || status === 'connecting'}
        aria-label={isActive ? 'Encerrar conversa por voz' : 'Iniciar conversa por voz'}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: `2px solid ${STATUS_COLOR[status]}`,
          background: isActive
            ? STATUS_COLOR[status]
            : 'transparent',
          cursor: disabled || status === 'connecting' ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease',
          boxShadow: status === 'listening'
            ? 'var(--shadow-glow-ocre)'
            : status === 'speaking'
            ? 'var(--shadow-glow-purple)'
            : 'none',
          animation: status === 'listening' ? 'pulse-glow 2s ease infinite' : 'none',
        }}
      >
        {/* Ícone de microfone */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={isActive ? '#fff' : STATUS_COLOR[status]}
          stroke="none"
        >
          <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" />
          <path d="M17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12H5C5 15.53 7.61 18.43 11 18.93V23H13V18.93C16.39 18.43 19 15.53 19 12H17Z" />
        </svg>
      </button>

      {/* Status label */}
      <span
        style={{
          fontSize: '0.65rem',
          color: STATUS_COLOR[status],
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          transition: 'color 0.25s',
        }}
      >
        {STATUS_LABEL[status]}
      </span>

      {/* Ondas de áudio quando falando/ouvindo */}
      {(status === 'listening' || status === 'speaking') && (
        <div style={{ display: 'flex', gap: 3, height: 16, alignItems: 'center' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                width: 3,
                height: '100%',
                borderRadius: 2,
                background: status === 'listening' ? 'var(--color-ocre)' : 'var(--color-purple-light)',
                animation: `wave 1s ease-in-out ${i * 0.15}s infinite`,
                display: 'block',
              }}
            />
          ))}
        </div>
      )}

      {/* Mensagem de erro */}
      {errorMsg && (
        <p style={{ fontSize: '0.7rem', color: '#e74c3c', maxWidth: 200, textAlign: 'center' }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
