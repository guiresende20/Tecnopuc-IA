// src/app/api/ingest/route.ts
// Rota protegida para reindexação da knowledge base via HTTP.
// Útil para atualizar os documentos em produção sem acesso SSH ao servidor.
// Uso: POST /api/ingest com header Authorization: Bearer {INGEST_SECRET}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos para indexações grandes

// Quebra um texto em chunks com overlap
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks.filter((c) => c.trim().length > 20);
}

export async function POST(req: NextRequest) {
  // Verificação de segurança
  const authHeader = req.headers.get('Authorization');
  const expectedToken = `Bearer ${process.env.INGEST_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const knowledgeDir = path.join(process.cwd(), 'knowledge');

    if (!fs.existsSync(knowledgeDir)) {
      return NextResponse.json(
        { error: 'Pasta knowledge/ não encontrada.' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith('.md'));

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo .md encontrado na pasta knowledge/.' },
        { status: 404 }
      );
    }

    let totalChunks = 0;
    const results: { file: string; chunks: number }[] = [];

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = chunkText(content);

      // Deleta chunks antigos do mesmo arquivo antes de reinserir
      await supabase
        .from('documents')
        .delete()
        .eq('metadata->>source', file);

      // Processa e insere cada chunk
      const rows = [];
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await generateEmbedding(chunks[i]);
        rows.push({
          content: chunks[i],
          metadata: { source: file, chunkIndex: i },
          embedding,
        });
        // Delay mínimo para não sobrecarregar a API
        await new Promise((r) => setTimeout(r, 100));
      }

      const { error } = await supabase.from('documents').insert(rows);
      if (error) {
        console.error(`[ingest] Erro ao inserir ${file}:`, error);
        throw error;
      }

      results.push({ file, chunks: chunks.length });
      totalChunks += chunks.length;
      console.log(`[ingest] ✓ ${file}: ${chunks.length} chunks indexados`);
    }

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      totalChunks,
      results,
    });
  } catch (error) {
    console.error('[/api/ingest] Erro:', error);
    return NextResponse.json(
      { error: 'Erro durante a ingestão de documentos.' },
      { status: 500 }
    );
  }
}
