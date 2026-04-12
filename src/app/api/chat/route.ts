// src/app/api/chat/route.ts
// Endpoint principal do RAG pipeline com streaming.
// Fluxo: recebe query → gera embedding → busca Supabase → monta prompt → streama Gemini

import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding, streamChat, buildSystemPrompt, ChatMessage } from '@/lib/gemini';
import { matchDocuments, getSettings } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, query }: { messages: ChatMessage[]; query: string } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query é obrigatório.' }, { status: 400 });
    }

    // Obter as configs dinâmicas em alta resolução do Admin DB
    const settings = await getSettings();

    // 1. Gerar embedding da query do usuário
    const queryEmbedding = await generateEmbedding(query);

    // 2. Buscar os chunks mais relevantes no Supabase (pgvector) dinamicamente
    const relevantDocs = await matchDocuments(
      queryEmbedding, 
      settings.matchCount, 
      settings.similarityThreshold
    );

    // 3. Montar o contexto com os documentos recuperados
    let contextText: string;
    if (relevantDocs.length === 0) {
      contextText = 'Nenhuma informação específica encontrada na base de conhecimento.';
    } else {
      contextText = relevantDocs
        .map((doc, i) => {
          const source = doc.metadata?.source ?? 'desconhecido';
          return `[Fonte ${i + 1}: ${source}]\n${doc.content}`;
        })
        .join('\n\n---\n\n');
    }

    // 4. Montar o system prompt enriquecido com o contexto RAG
    const systemPrompt = buildSystemPrompt(contextText, settings.system_prompt);

    // 5. Iniciar streaming da resposta do Gemini com a temperatura paramétrica e tokens max
    const stream = await streamChat(
      messages, 
      systemPrompt, 
      settings.temperature, 
      settings.maxTokens
    );

    // 6. Retornar o stream para o frontend
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Sources': JSON.stringify(
          relevantDocs.map((d) => ({
            source: d.metadata?.source,
            similarity: d.similarity?.toFixed(2),
          }))
        ),
      },
    });
  } catch (error) {
    console.error('[/api/chat] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a mensagem.' },
      { status: 500 }
    );
  }
}
