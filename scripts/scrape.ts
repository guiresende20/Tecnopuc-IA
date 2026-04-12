// scripts/scrape.ts
// Faz scraping do site do TecnoPUC e gera arquivos .md na pasta knowledge/
// Execute com: npx tsx scripts/scrape.ts
//
// Após rodar, execute o ingest para atualizar o RAG:
//   npx tsx scripts/ingest.ts

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
// @ts-ignore
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// Remove elementos inúteis do markdown gerado
turndown.remove(['script', 'style', 'noscript', 'iframe', 'form', 'nav', 'footer', 'header']);

// ──────────────────────────────────────────────────────────────
// Páginas a raspar — adicione ou remova URLs conforme necessário
// ──────────────────────────────────────────────────────────────
const PAGES: { url: string; filename: string; title: string }[] = [
  {
    url: 'https://tecnopuc.pucrs.br',
    filename: 'scrape-home.md',
    title: 'TecnoPUC — Página Inicial',
  },
  {
    url: 'https://tecnopuc.pucrs.br/quem-somos/',
    filename: 'scrape-quem-somos.md',
    title: 'TecnoPUC — Quem Somos',
  },
  {
    url: 'https://tecnopuc.pucrs.br/nossos-ambientes/',
    filename: 'scrape-ambientes.md',
    title: 'TecnoPUC — Nossos Ambientes',
  },
  {
    url: 'https://tecnopuc.pucrs.br/os-hubs/',
    filename: 'scrape-hubs.md',
    title: 'TecnoPUC — Os Hubs',
  },
  {
    url: 'https://tecnopuc.pucrs.br/nossos-membros/',
    filename: 'scrape-membros.md',
    title: 'TecnoPUC — Nossos Membros',
  },
  {
    url: 'https://tecnopuc.pucrs.br/desenvolvimento-de-negocios/',
    filename: 'scrape-negocios.md',
    title: 'TecnoPUC — Desenvolvimento de Negócios',
  },
  {
    url: 'https://tecnopuc.pucrs.br/desenvolvimento-de-talentos/',
    filename: 'scrape-talentos.md',
    title: 'TecnoPUC — Desenvolvimento de Talentos',
  },
  {
    url: 'https://tecnopuc.pucrs.br/faca-parte/',
    filename: 'scrape-faca-parte.md',
    title: 'TecnoPUC — Faça Parte',
  },
  {
    url: 'https://tecnopuc.pucrs.br/nossos-cases/',
    filename: 'scrape-cases.md',
    title: 'TecnoPUC — Nossos Cases',
  },
  {
    url: 'https://tecnopuc.pucrs.br/contato/',
    filename: 'scrape-contato.md',
    title: 'TecnoPUC — Contato',
  },
];

// Seletores CSS do conteúdo principal do site da PUCRS
// Tenta cada um em ordem até encontrar conteúdo relevante
const CONTENT_SELECTORS = [
  'main',
  '[class*="content"]',
  '[class*="page-content"]',
  '[class*="entry"]',
  'article',
  '.container',
  '#content',
  'body',
];

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');

async function fetchPage(url: string): Promise<string> {
  console.log(`  ↓ Baixando: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TecnoPUC-Bot/1.0)',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao acessar ${url}`);
  }

  return res.text();
}

function extractContent($: cheerio.CheerioAPI): string {
  // Remove elementos de navegação e ruído
  $('nav, header, footer, .menu, .navbar, .breadcrumb, .sidebar, .widget, .cookie, [class*="banner"], [class*="popup"], [id*="cookie"]').remove();

  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector).first();
    if (el.length && el.text().trim().length > 200) {
      return el.html() ?? '';
    }
  }

  return $('body').html() ?? '';
}

function cleanMarkdown(md: string): string {
  return md
    // Remove linhas em branco excessivas (mais de 2 seguidas)
    .replace(/\n{3,}/g, '\n\n')
    // Remove links que são só URLs sem texto útil
    .replace(/\[([^\]]{0,3})\]\(https?:\/\/[^)]+\)/g, '$1')
    // Remove imagens
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Remove linhas com só espaços/hífens (separadores HTML virados em lixo)
    .replace(/^[\s\-_=]{0,3}$/gm, '')
    .trim();
}

async function scrapePage(page: typeof PAGES[number]): Promise<void> {
  const html = await fetchPage(page.url);
  const $ = cheerio.load(html);

  const pageTitle = $('title').text().trim() || page.title;
  const contentHtml = extractContent($);
  const rawMarkdown = turndown.turndown(contentHtml);
  const markdown = cleanMarkdown(rawMarkdown);

  if (markdown.length < 100) {
    console.warn(`  ⚠️  Conteúdo muito curto para ${page.url} — pode ter seletor errado`);
  }

  const output = `# ${page.title}\n\n> Fonte: ${page.url}\n\n${markdown}\n`;
  const filePath = path.join(KNOWLEDGE_DIR, page.filename);

  fs.writeFileSync(filePath, output, 'utf-8');
  console.log(`  ✅ Salvo: knowledge/${page.filename} (${markdown.length} chars)`);
}

async function main() {
  console.log('🔍 TecnoPUC Scraper\n');

  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const page of PAGES) {
    try {
      await scrapePage(page);
      success++;
      // Pausa curta entre requisições para não sobrecarregar o servidor
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`  ❌ Falhou: ${page.url} — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n📦 Concluído: ${success} páginas salvas, ${failed} falhas`);

  if (success > 0) {
    console.log('\n👉 Próximo passo: execute o ingest para atualizar o RAG:');
    console.log('   npx tsx scripts/ingest.ts\n');
  }
}

main();
