// src/app/api/voice-context/route.ts
// Retorna um systemInstruction enriquecido com contexto RAG para a Gemini Live API.
// O frontend chama este endpoint antes de abrir a sessão WebSocket de voz.
// Como a Live API não suporta RAG dinâmico, o contexto é pré-carregado no system prompt.

import { NextResponse } from 'next/server';
import { matchDocuments, getSystemPrompt, supabase } from '@/lib/supabase';
import { buildSystemPrompt } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Busca os chunks mais representativos sem uma query específica.
    // Estratégia: pega os primeiros N documentos ordenados pela fonte (cobertura ampla).
    const { data, error } = await supabase
      .from('documents')
      .select('content, metadata')
      .order('id', { ascending: true })
      .limit(20); // Limite razoável para caber no system prompt da Live API

    if (error) {
      console.error('[/api/voice-context] Erro Supabase:', error);
      throw error;
    }

    const docs = data ?? [];

    // Monta o contexto concatenando todos os chunks recuperados
    const context =
      docs.length > 0
        ? docs
            .map((doc) => {
              const source = (doc.metadata as { source?: string })?.source ?? 'geral';
              return `[${source}]\n${doc.content}`;
            })
            .join('\n\n---\n\n')
        : 'Base de conhecimento ainda não indexada.';

    const basePrompt = await getSystemPrompt();
    const systemInstruction = buildSystemPrompt(context, basePrompt);

    return NextResponse.json({ systemInstruction });
  } catch (error) {
    console.error('[/api/voice-context] Erro:', error);

    // Fallback: retorna system prompt sem contexto RAG
    const fallbackBase = await getSystemPrompt();
    const fallbackInstruction = buildSystemPrompt(
      'Base de conhecimento temporariamente indisponível. Responda de forma geral sobre o TecnoPUC.',
      fallbackBase
    );

    return NextResponse.json({ systemInstruction: fallbackInstruction });
  }
}
