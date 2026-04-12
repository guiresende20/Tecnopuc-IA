Guia: Como Modificar o Conteúdo e a Voz da IA do TecnoPUC
Este projeto utiliza RAG (Retrieval-Augmented Generation), o que significa que a IA não inventa respostas; ela lê arquivos de conhecimento que você fornece para formular as respostas.

Aqui está o passo a passo de como alterar esses conhecimentos e o comportamento do robô.

1. Como Adicionar ou Alterar o Conteúdo (Base de Conhecimento)
Todo o que a IA "sabe" sobre o TecnoPUC fica armazenado na pasta knowledge/ dentro do projeto.

Passo 1: Editando ou criando novos arquivos
Abra a pasta knowledge/ no seu editor (VS Code).
Você verá arquivos Markdown (extensão .md).
Para alterar um conhecimento existente, basta abrir o arquivo (ex: empresas-residentes.md) e modificar o texto.
Para adicionar novo conhecimento, basta criar um novo arquivo .md na pasta knowledge/ (ex: eventos-2026.md) e escrever todo o conteúdo dentro dele. Use títulos com # e evite parágrafos excessivamente longos.
Passo 2: Atualizando o Banco de Dados (Ingestão)
Sempre que você alterar ou criar um arquivo .md na pasta knowledge/, a IA ainda não saberá disso. Você precisa enviar essas mudanças para o banco de dados vetorial de memória (Supabase).

Para fazer isso, abra o terminal do VS Code e rode o comando:

bash
npx tsx scripts/ingest.ts
Este script vai ler todos os arquivos MArkdown, transformá-los em matrizes matemáticas (embeddings) usando o Gemini, e salvá-los no Supabase.
Quando o script terminar (aparecerá 🎉 Ingestão concluída!), o chatbot já estará usando as informações novas instantaneamente!
2. Como Alterar o Tom de Voz (Personalidade da IA)
A forma como a IA raciocina, interpreta as regras e entende o mundo é controlada por um trecho principal do código chamado System Prompt. Ele define a "instrução do ator" da IA.

Para alterar a personalidade e regras base do robô, edite o arquivo src/lib/gemini.ts:

Abra src/lib/gemini.ts.
Procure pela função buildSystemPrompt(context: string) (por volta da linha 48).
Modifique o bloco de texto retornado pela função:
typescript
export function buildSystemPrompt(context: string): string {
  return `Você é o assistente virtual do TecnoPUC — Parque Científico e Tecnológico da PUCRS.
Sua personalidade é culta, maker e líder. Você se comunica de forma clara, convidativa e otimista.
Regras de comunicação:
- Use frases curtas e diretas.
- Fale sempre no plural quando se referir ao TecnoPUC ("reunimos", "construímos", "temos").
- Seja otimista: foque em soluções e potencial, não em problemas.
- Responda APENAS com base nas informações fornecidas no contexto abaixo.
--- CONTEXTO ---
${context}
--- FIM DO CONTEXTO ---`;
}
Você pode adicionar regras criativas como: "- Use gírias bem educadas de Porto Alegre." ou "- Dê exemplos reais sempre que possível."
Importante: Nunca remova ou desestruture as tags de --- CONTEXTO ---, pois é exatamente alí que os trechos relevantes dos arquivos .md são injetados de forma automática em cada busca do usuário.
Salve o arquivo. A mudança afetará todas as próximas mensagens logo em seguida.
3. Como Alterar a Voz do Robô (Áudio)
Na Gemini Multimodal Live API, existem diferentes perfis de captação de voz nativamente gerados pela engine do Google.

Para alterar o timbre da voz que você escuta quando o computador fala contigo:

Abra o arquivo src/lib/gemini-live.ts.
Procure pela diretriz de configuração interna prebuiltVoiceConfig (por volta da linha 59).
Mude a string voiceName:
typescript
speechConfig: {
                 voiceConfig: {
                   prebuiltVoiceConfig: {
                     voiceName: 'Puck', // <-- Altere aqui!
                   },
                 },
               },
Vozes em Inglês e Português do Gemini:
Puck (Voz masculina simpática, brilhante, descontraída - atualizada)
Aoede (Voz feminina suave, calma, relaxada)
Charon (Voz masculina madura, rústica e séria)
Kore (Voz feminina firme, atenciosa)
Fenrir (Voz masculina bem dinâmica, acelerada)
Apenas troque Puck pelo nome desejado, salve o arquivo, aperte F5 no site (para derrubar a conexão WebSocker atual) e ligue o microfone novamente.