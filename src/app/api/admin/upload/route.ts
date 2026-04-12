import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';
import { authAdmin } from '../settings/route';

export const runtime = 'nodejs';
const PDFParser = require("pdf2json");

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
    pdfParser.on("pdfParser_dataReady", () => {
      // getRawTextContent contains the plain text when initiated with flag 1
      resolve(pdfParser.getRawTextContent());
    });
    pdfParser.parseBuffer(buffer);
  });
}

// Reutiliza função chunkText
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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let content = '';

    if (file.type === 'application/pdf') {
      content = await extractTextFromPDF(buffer);
    } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      content = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Formato não suportado. Use PDF, TXT ou MD.' }, { status: 400 });
    }

    // Sanitize text for PostgreSQL JSONB: remove null bytes and orphaned surrogates
    content = content.replace(/\0/g, '').replace(/[\uD800-\uDFFF]/g, '');

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'O arquivo parece estar vazio ou não possui texto legível.' }, { status: 400 });
    }

    const title = file.name;

    // 1. Salva a fonte
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert({ title, content, type: 'pdf_or_text' })
      .select('id').single();

    if (sourceError || !source) throw sourceError;

    // 2. Chunks e Embeddings em batch para PDFs longos
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
      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({ success: true, id: source.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
