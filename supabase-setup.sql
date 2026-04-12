-- ============================================================
-- TecnoPUC Chatbot — Setup do Supabase
-- Execute este SQL no Editor SQL do Supabase Dashboard
-- Modelo: gemini-embedding-exp-03-07 com outputDimensionality=768
-- ============================================================

-- 1. Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Dropar tabela e função anteriores (recriação limpa)
DROP FUNCTION IF EXISTS match_documents;
DROP TABLE IF EXISTS documents;

-- 3. Criar tabela de documentos (768 dims — compatível com ivfflat)
CREATE TABLE documents (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT NOT NULL,
  metadata  JSONB,
  embedding VECTOR(768)
);

-- 4. Índice para busca por similaridade (cosine distance)
CREATE INDEX documents_embedding_idx
ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 5. Função de busca semântica
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_count     INT   DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE(
  id         BIGINT,
  content    TEXT,
  metadata   JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ============================================================
-- Verificação: rodar após a ingestão para confirmar os dados
-- ============================================================
-- SELECT id, metadata->>'source' as source, LEFT(content, 80) as preview
-- FROM documents
-- ORDER BY id;
