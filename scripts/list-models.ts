import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  const bidiModels = data.models.filter((m: any) => m.supportedGenerationMethods.includes('bidiGenerateContent'));
  console.log('Bidi models available:');
  bidiModels.forEach((m: any) => console.log(`- ${m.name}`));
}

main();
