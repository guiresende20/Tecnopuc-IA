import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper básico para validar auth das rotas administrativas
export function authAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;
  
  const token = authHeader.split(' ')[1];
  const decoded = atob(token);
  const [username, password] = decoded.split(':');
  
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
