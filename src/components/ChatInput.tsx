'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
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
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 12px',
          transition: 'border-color 0.2s',
        }}
        onFocus={() => {}}
      >
        <textarea
          ref={textareaRef}
          id="chat-text-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
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

        {/* Botão enviar */}
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
            if (value.trim() && !disabled) {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-glow-ocre)';
            }
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
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-gray)', marginTop: 8 }}>
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  );
}
