import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';
import { authAdmin } from '../settings/route';

export async function GET(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('id, title, content, type, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

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

export async function POST(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { title, content, type = 'document' } = await req.json();
    if (!title || !content) return NextResponse.json({ error: 'Título e conteúdo obrigatórios.' }, { status: 400 });

    // 1. Salva a fonte
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert({ title, content, type })
      .select('id').single();

    if (sourceError || !source) throw sourceError;

    // 2. Chunks e Embeddings (Processamento em Lotes)
    const chunks = chunkText(content);
    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (chunk, idx) => {
         const chunkIndex = i + idx;
         const embedding = await generateEmbedding(chunk);
         const { error: insError } = await supabase.from('documents').insert({
           content: chunk,
           metadata: { source_id: source.id, title, chunkIndex },
           embedding,
         });
         if (insError) console.error(`Erro vetor chunk ${chunkIndex}:`, insError);
      }));
      await new Promise(r => setTimeout(r, 200)); // Rate limit breathing room
    }

    return NextResponse.json({ success: true, id: source.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id, title, content } = await req.json();
    if (!id || !title || !content) return NextResponse.json({ error: 'ID, Título e conteúdo obrigatórios.' }, { status: 400 });

    // 1. Atualizar a fonte (update)
    const { error: sourceError } = await supabase
      .from('knowledge_sources')
      .update({ title, content })
      .eq('id', id);

    if (sourceError) throw sourceError;

    // 2. Apagar os chunks antigos
    const { error: docError } = await supabase
      .from('documents')
      .delete()
      .eq('metadata->>source_id', id.toString());

    if (docError) throw docError;

    // 3. Re-gerar novos Chunks e Embeddings em lotes
    const chunks = chunkText(content);
    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (chunk, idx) => {
         const chunkIndex = i + idx;
         const embedding = await generateEmbedding(chunk);
         const { error: insError } = await supabase.from('documents').insert({
           content: chunk,
           metadata: { source_id: id, title, chunkIndex },
           embedding,
         });
         if (insError) console.error(`Erro vetor chunk ${chunkIndex}:`, insError);
      }));
      await new Promise(r => setTimeout(r, 200)); // Rate limit breathing room
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

    // Deleta os chunks
    const { error: docError } = await supabase
      .from('documents')
      .delete()
      .eq('metadata->>source_id', id.toString());

    if (docError) throw docError;

    // Deleta a fonte
    const { error: sourceError } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', id);

    if (sourceError) throw sourceError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
