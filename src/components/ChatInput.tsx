'use client';

import { useState, useRef, KeyboardEvent, useCallback } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  onTypingChange?: (typing: boolean) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, onStop, onTypingChange, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    onTypingChange?.(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onTypingChange?.(e.target.value.length > 0);
  };

  const isStopMode = disabled && !!onStop;

  return (
    <div
      id="chat-input-area"
      style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid var(--surface-border)',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'var(--surface-secondary)',
          border: `1px solid ${focused ? 'var(--color-ocre)' : 'var(--surface-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '10px 12px',
          transition: 'border-color 0.2s',
          boxShadow: focused ? '0 0 0 2px rgba(234,152,47,0.15)' : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          id="chat-text-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Pergunte sobre o TecnoPUC..."
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '0.9375rem',
            color: 'var(--color-title-dark)',
            lineHeight: 1.5,
            maxHeight: 140,
            overflowY: 'auto',
          }}
        />

        {isStopMode ? (
          <button
            onClick={onStop}
            aria-label="Parar geração"
            title="Parar resposta"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ef4444',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#ef4444'; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#fff">
              <rect x="1" y="1" width="10" height="10" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            id="chat-send-button"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            aria-label="Enviar mensagem"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: value.trim() && !disabled ? 'var(--color-ocre)' : 'var(--surface-border)',
              border: 'none',
              cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (value.trim() && !disabled)
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-glow-ocre)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-gray)', marginTop: 8 }}>
        {isStopMode
          ? 'Clique em ■ para interromper a resposta'
          : 'Enter para enviar · Shift+Enter para nova linha'}
      </p>
    </div>
  );
}
