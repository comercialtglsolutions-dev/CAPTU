
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

async function main() {
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // 1. Encontrar todos os leads de advocacia (buscando por termo no nome ou segmento)
  const { data: leads } = await db.from('leads')
    .select('id, name')
    .or('name.ilike.%advocacia%,segment.ilike.%advocacia%');
  
  console.log('Leads found:', leads?.length || 0);
  
  // 2. Encontrar a campanha alvo
  const { data: campaign } = await db.from('campaigns')
    .select('id, name')
    .ilike('name', '%Presença Online%')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (campaign && leads && leads.length > 0) {
    console.log(`Vincular ${leads.length} leads à campanha '${campaign.name}' (${campaign.id})`);
    
    const records = leads.map(l => ({
      campaign_id: campaign.id,
      lead_id: l.id,
      status: 'pending'
    }));
    
    const { error } = await db.from('campaign_leads')
      .upsert(records, { onConflict: 'campaign_id, lead_id' });
    
    if (error) {
      console.error('Error vincular:', error);
    } else {
      console.log('Sucesso: Leads vinculados à campanha.');
    }
  } else {
    console.log('Camapanha ou Leads não encontrados.');
  }
}

main();
