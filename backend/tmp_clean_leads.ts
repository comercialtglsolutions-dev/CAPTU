
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

async function main() {
  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  console.log('--- CAPTU AI: LIMPEZA RETRÔ INICIADA ---');
  
  // 1. Buscar todos os leads que possuem algo no campo website
  const { data: leads, error } = await db.from('leads').select('*').not('website', 'is', null);
  
  if (error) {
    console.error('Erro ao buscar leads:', error);
    return;
  }

  console.log(`Analisando ${leads.length} leads...`);
  
  let cleanedCount = 0;
  const socialDomains = ['instagram.com', 'facebook.com', 'linkedin.com', 'wa.me', 'whatsapp.com', 'api.whatsapp.com'];

  for (const lead of leads) {
    const ws = lead.website.toLowerCase();
    let updates: any = {};
    let shouldUpdate = false;

    // Detectar LinkedIn
    if (ws.includes('linkedin.com')) {
      updates.linkedin_url = lead.website;
      updates.website = null;
      shouldUpdate = true;
    }
    // Detectar Instagram
    if (ws.includes('instagram.com')) {
      updates.instagram_url = lead.website;
      updates.website = null;
      shouldUpdate = true;
    }
    // Detectar Facebook
    if (ws.includes('facebook.com')) {
      updates.facebook_url = lead.website;
      updates.website = null;
      shouldUpdate = true;
    }
    // Detectar WhatsApp
    if (ws.includes('wa.me') || ws.includes('whatsapp.com')) {
      updates.whatsapp_url = lead.website;
      updates.website = null;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      const { error: upErr } = await db.from('leads').update(updates).eq('id', lead.id);
      if (!upErr) cleanedCount++;
    }
  }

  console.log(`--- LIMPEZA CONCLUÍDA: ${cleanedCount} leads organizados. ---`);
}

main();
