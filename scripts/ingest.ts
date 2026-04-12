// scripts/ingest.ts
// Script para ingestão local da knowledge base no Supabase.
// Execute com: npx tsx scripts/ingest.ts
// Requer: .env.local configurado com GEMINI_API_KEY e SUPABASE_*

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Validação de variáveis de ambiente
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Variáveis de ambiente não configuradas. Verifique .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Quebra texto em chunks com overlap
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 20) chunks.push(chunk);
    i += chunkSize - overlap;
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }], role: 'user' },
    outputDimensionality: 768,
  } as Parameters<typeof embeddingModel.embedContent>[0]);
  return result.embedding.values;
}

async function main() {
  const knowledgeDir = path.join(process.cwd(), 'knowledge');

  if (!fs.existsSync(knowledgeDir)) {
    console.error('❌  Pasta knowledge/ não encontrada.');
    process.exit(1);
  }

  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith('.md'));
  console.log(`\n🔍 Encontrados ${files.length} arquivo(s) para indexar.\n`);

  let totalChunks = 0;

  for (const file of files) {
    console.log(`📄 Processando: ${file}`);
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkText(content);

    // Remove versão anterior do arquivo
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('metadata->>source', file);

    if (deleteError) {
      console.warn(`   ⚠️  Erro ao deletar versão anterior: ${deleteError.message}`);
    }

    // Indexa cada chunk
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`   chunk ${i + 1}/${chunks.length}...\r`);

      const embedding = await generateEmbedding(chunks[i]);

      const { error } = await supabase.from('documents').insert({
        content: chunks[i],
        metadata: { source: file, chunkIndex: i },
        embedding,
      });

      if (error) {
        console.error(`\n   ❌  Erro ao inserir chunk ${i}: ${error.message}`);
      }

      // Pequena pausa para não sobrecarregar a API de embeddings
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log(`   ✅ ${chunks.length} chunks indexados.         `);
    totalChunks += chunks.length;
  }

  console.log(`\n🎉 Ingestão concluída! ${files.length} arquivo(s), ${totalChunks} chunk(s) total.\n`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
