# TecnoPUC Chatbot — Guia para o Claude CLI

## Visão Geral do Projeto

Chatbot inteligente do **TecnoPUC (Parque Científico e Tecnológico da PUCRS)** com arquitetura RAG (Retrieval-Augmented Generation). O sistema responde perguntas com base em arquivos de conhecimento, usando embeddings vetoriais para recuperar contexto relevante antes de gerar a resposta.

**Stack:**
- **Framework:** Next.js 16 (App Router) com TypeScript
- **IA:** Google Gemini API (`@google/generative-ai`)
- **Banco de dados vetorial:** Supabase (pgvector)
- **Voz:** Gemini Multimodal Live API (WebSocket)
- **Estilos:** Tailwind CSS v4

---

## Arquitetura

```
src/
  app/
    page.tsx                  # Interface principal do chatbot
    admin/page.tsx            # Painel de administração
    api/
      chat/route.ts           # Endpoint principal do chat (RAG pipeline)
      ingest/route.ts         # Ingestão de documentos via API
      admin/
        settings/route.ts     # Configurações do admin
        sources/route.ts      # Gerenciamento de fontes
        upload/route.ts       # Upload de documentos
      voice-context/route.ts  # Contexto para modo de voz
  components/
    ChatInput.tsx             # Input com suporte a voz
    ChatWindow.tsx            # Janela de mensagens
    VoiceButton.tsx           # Botão de ativação de voz
  lib/
    gemini.ts                 # Cliente Gemini + buildSystemPrompt()
    gemini-live.ts            # WebSocket para voz em tempo real
    supabase.ts               # Cliente Supabase

knowledge/                    # Base de conhecimento em Markdown (.md)
scripts/
  ingest.ts                   # Script de ingestão para o Supabase
```

---

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev          # Inicia servidor em http://localhost:3000

# Build e produção
npm run build
npm run start

# Ingestão da base de conhecimento (rodar após alterar arquivos em knowledge/)
npx tsx scripts/ingest.ts

# Lint
npm run lint
```

---

## Fluxo RAG

1. Usuário envia pergunta
2. `api/chat/route.ts` gera embedding da pergunta via Gemini
3. Busca por similaridade no Supabase (pgvector)
4. Trechos relevantes dos arquivos `.md` são injetados no system prompt via `buildSystemPrompt(context)`
5. Gemini gera resposta baseada **apenas** no contexto recuperado

---

## Arquivos Críticos para Edição

### Personalidade da IA
Edite `src/lib/gemini.ts` — função `buildSystemPrompt(context: string)`:
- Define o tom de voz, regras de comunicação e identidade do assistente
- **Nunca remover** as tags `--- CONTEXTO ---` e `--- FIM DO CONTEXTO ---`

### Base de Conhecimento
- Arquivos `.md` em `knowledge/`
- Após qualquer alteração, rodar: `npx tsx scripts/ingest.ts`

### Voz do Robô
Edite `src/lib/gemini-live.ts` — campo `voiceName`:
- `Puck` — masculina, descontraída
- `Aoede` — feminina, suave
- `Charon` — masculina, séria
- `Kore` — feminina, firme
- `Fenrir` — masculina, dinâmica

---

## Variáveis de Ambiente

O projeto requer um arquivo `.env.local` na raiz com:
```
GEMINI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Banco de Dados (Supabase)

- Setup inicial: executar `supabase-setup.sql` e `admin-setup.sql` no painel do Supabase
- A tabela de documentos usa a extensão `pgvector` para busca semântica

---

## Convenções

- TypeScript estrito — sem `any` desnecessário
- Componentes React em `src/components/` com nomes em PascalCase
- Rotas de API em `src/app/api/` seguindo App Router do Next.js
- Variáveis de ambiente públicas prefixadas com `NEXT_PUBLIC_`
