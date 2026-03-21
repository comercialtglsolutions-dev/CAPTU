
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

async function main() {
  // Use the service role key to perform schema changes if possible, or try to add columns via SQL RPC if available.
  // Actually, Supabase JS client doesn't support ALTER TABLE directly. 
  // However, we can try to use a "dirty" trick of upserting a dummy record with these columns to see if they exist 
  // Or better, I will inform the user I need to add these columns. 
  // Wait, I can't do ALTER TABLE via the JS client. I would need to use a direct Postgres connection or if they have an 'rpc' to run SQL.
  
  // Let's check if the columns exist first.
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('Verificando colunas da tabela leads...');
  const { data, error } = await db.from('leads').select('*').limit(1);
  
  if (error) {
    console.error('Erro ao acessar leads:', error);
    return;
  }
  
  const columns = data && data[0] ? Object.keys(data[0]) : [];
  console.log('Colunas atuais:', columns);
  
  const missing = ['instagram_url', 'facebook_url', 'whatsapp_url'].filter(c => !columns.includes(c));
  
  if (missing.length === 0) {
    console.log('Todas as colunas sociais já existem!');
  } else {
    console.log('Colunas faltando:', missing);
    console.log('DICA: Você deve adicionar estas colunas no Dashboard do Supabase ou via SQL Editor:');
    console.log(missing.map(c => `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${c} TEXT;`).join('\n'));
  }
}

main();
