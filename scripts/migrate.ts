import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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
  } as any);
  return result.embedding.values;
}

async function main() {
  const knowledgeDir = path.join(process.cwd(), 'knowledge');
  if (!fs.existsSync(knowledgeDir)) return console.log('Pasta knowledge/ não encontrada.');

  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith('.md'));
  console.log(`\n🔍 Migrando ${files.length} arquivo(s) locais para a nova arquitetura (knowledge_sources)...\n`);

  for (const file of files) {
    const title = file;
    const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');

    // Salva na knowledge_sources
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert({ title, content, type: 'document' })
      .select('id').single();

    if (sourceError || !source) {
      console.error(`Erro ao salvar fonte ${file}:`, sourceError);
      continue;
    }

    const chunks = chunkText(content);
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`   chunk ${i + 1}/${chunks.length} de ${file}...\r`);
      const embedding = await generateEmbedding(chunks[i]);
      await supabase.from('documents').insert({
        content: chunks[i],
        metadata: { source_id: source.id, title, chunkIndex: i },
        embedding,
      });
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`   ✅ ${file} migrado com sucesso.         `);
  }
}

main().then(() => console.log('\nMigração concluída!')).catch(console.error);
