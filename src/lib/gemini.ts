// src/lib/gemini.ts
// Funções para interação com a API Gemini no servidor:
// - Geração de embeddings (text-embedding-004)
// - Chat com streaming (Gemini Flash)

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Variável GEMINI_API_KEY não configurada no .env.local');
}

const genAI = new GoogleGenerativeAI(apiKey);

// ------------------------------------------------------------------
// EMBEDDINGS
// ------------------------------------------------------------------

const embeddingModel = genAI.getGenerativeModel(
  { model: 'gemini-embedding-2-preview' } // 3072 dimensões nativamente
);

/**
 * Gera um vetor de embedding (768 dimensões) para um texto via gemini-embedding-2-preview.
 * Usado para indexar documentos e para buscar contexto relevante.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // outputDimensionality: 768 trunca o vetor para 768 dims (compatível com ivfflat e o schema do Supabase)
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }], role: 'user' },
    outputDimensionality: 768,
  } as Parameters<typeof embeddingModel.embedContent>[0]);
  return result.embedding.values;
}

// ------------------------------------------------------------------
// CHAT COM STREAMING
// ------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Monta o system prompt do TecnoPUC com o contexto RAG injetado.
 */
export function buildSystemPrompt(context: string, basePrompt: string): string {
  return `${basePrompt}

--- CONTEXTO PARA RESPOSTA ---
${context}
--- FIM DO CONTEXTO ---`;
}

/**
 * Streama uma resposta do Gemini com contexto RAG injetado.
 * Retorna um ReadableStream compatível com a Response API do Next.js.
 */
export async function streamChat(
  messages: ChatMessage[],
  systemPrompt: string,
  temperature: number = 0.5,
  maxOutputTokens: number = 1024
): Promise<ReadableStream<Uint8Array>> {
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chatModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  });

  const chat = chatModel.startChat({
    history,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  const result = await chat.sendMessageStream(lastMessage.content);

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        console.error('[Gemini] Erro durante streaming:', err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}
