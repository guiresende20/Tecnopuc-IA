// src/lib/supabase.ts
// Cliente Supabase para uso exclusivo no servidor (API Routes).
// Usa a service_role key — nunca deve ser importado em componentes client-side.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas no .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Tipos para os documentos indexados
export interface Document {
  id: number;
  content: string;
  metadata: {
    source: string;       // ex: "empresas-residentes.md"
    chunkIndex: number;
    category?: string;    // ex: "empresa", "servico", "evento"
  };
  similarity?: number;
}

export interface KnowledgeSource {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export interface ChatbotSetting {
  setting_key: string;
  setting_value: string;
}

export interface AppSettings {
  system_prompt: string;
  temperature: number;
  thinkingLevel: 'low' | 'high';
  similarityThreshold: number;
  matchCount: number;
  voice: string;
  maxTokens: number;
}

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('chatbot_settings')
    .select('setting_key, setting_value');

  const defaultSettings: AppSettings = {
    system_prompt: 'Você é um assistente virtual experiente do TecnoPUC. Responda com base no contexto fornecido.',
    temperature: 0.5,
    thinkingLevel: 'low',
    similarityThreshold: 0.65,
    matchCount: 5,
    voice: 'Aoede',
    maxTokens: 1024
  };

  if (error || !data) return defaultSettings;

  const settings = data.reduce((acc: Record<string, string>, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});

  return {
    system_prompt: settings.system_prompt || defaultSettings.system_prompt,
    temperature: settings.temperature ? parseFloat(settings.temperature) : defaultSettings.temperature,
    thinkingLevel: (settings.thinkingLevel as 'low' | 'high') || defaultSettings.thinkingLevel,
    similarityThreshold: settings.similarityThreshold ? (parseFloat(settings.similarityThreshold) / 100) : defaultSettings.similarityThreshold,
    matchCount: settings.matchCount ? parseInt(settings.matchCount) : defaultSettings.matchCount,
    voice: settings.voice || defaultSettings.voice,
    maxTokens: settings.maxTokens ? parseInt(settings.maxTokens) : defaultSettings.maxTokens,
  };
}

// Busca documentos similares à query via pgvector
export async function matchDocuments(
  queryEmbedding: number[],
  matchCount = 5,
  matchThreshold = 0.65
): Promise<Document[]> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) {
    console.error('[Supabase] Erro na busca de documentos:', error);
    throw new Error(`Erro na busca vetorial: ${error.message}`);
  }

  return (data as Document[]) ?? [];
}
