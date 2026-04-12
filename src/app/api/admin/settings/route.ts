import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Valida credenciais contra a lista de admins configurada em ADMIN_USERS
// Formato da variável de ambiente ADMIN_USERS (JSON):
//   [{"username":"fulano","password":"senha1"},{"username":"ciclano","password":"senha2"}]
// Fallback: ADMIN_USERNAME + ADMIN_PASSWORD (legado, um único usuário)
export function authAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;

  const token = authHeader.split(' ')[1];
  const decoded = atob(token);
  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return false;

  const username = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  // Lista de múltiplos usuários
  const adminUsersEnv = process.env.ADMIN_USERS;
  if (adminUsersEnv) {
    try {
      const users: { username: string; password: string }[] = JSON.parse(adminUsersEnv);
      return users.some((u) => u.username === username && u.password === password);
    } catch {
      // JSON inválido — cai no fallback abaixo
    }
  }

  // Fallback legado: ADMIN_USERNAME / ADMIN_PASSWORD
  return username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('chatbot_settings')
    .select('setting_key, setting_value');

  if (error || !data) return NextResponse.json({});
  
  const settings = data.reduce((acc: Record<string, string>, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});
  
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  if (!authAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    
    if (!body || typeof body !== 'object') {
       return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const updates = Object.entries(body).map(([key, value]) => ({
      setting_key: key,
      setting_value: typeof value === 'string' ? value : String(value),
      updated_at: new Date().toISOString()
    }));

    if (updates.length > 0) {
      const { error } = await supabase
        .from('chatbot_settings')
        .upsert(updates, { onConflict: 'setting_key' });

      if (error) throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
