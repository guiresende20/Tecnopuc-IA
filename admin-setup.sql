-- ============================================================
-- TecnoPUC Chatbot — Atualização do Supabase para Admin Panel
-- ============================================================

-- 1. Cria a tabela de documentos originais (fonte da verdade)
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        VARCHAR(50) DEFAULT 'document',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Modifica a tabela de documents (chunks/vetores) para ligar à knowledge_sources
-- Como nossos dados atuais são irrelevantes porque migraremos do zero,
-- podemos limpar e dropar a tabela antiga de documentos com segurança se necessário.
-- Mas vamos apenas garantir que ela suporte um UUID/BIGINT fonte na metadata.
-- Apenas limpa a tabela de documentos atual, afinal o painel de admin será a nova fonte:
DELETE FROM documents;

-- 3. Cria a tabela de configurações para salvar o Tom de Voz
CREATE TABLE IF NOT EXISTS chatbot_settings (
  setting_key   VARCHAR(50) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insere o System Prompt padrão na tabela
INSERT INTO chatbot_settings (setting_key, setting_value)
VALUES (
  'system_prompt', 
  'Você é o assistente virtual do TecnoPUC — Parque Científico e Tecnológico da PUCRS.
Sua personalidade é culta, maker e líder. Você se comunica de forma clara, convidativa e otimista.

Regras de comunicação:
- Use frases curtas e diretas.
- Fale sempre no plural quando se referir ao TecnoPUC ("reunimos", "construímos", "temos").
- Seja otimista: foque em soluções e potencial, não em problemas.
- Responda APENAS com base nas informações fornecidas no contexto.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Confirma a estrutura do match_documents
-- Nenhuma modificação na função de match é necessária, visto que os metadados continuarão rodando jsonb.
