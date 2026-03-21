
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

async function main() {
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: c } = await db.from('campaigns').select('*').limit(1);
  if (c && c[0]) {
    console.log('Campaign sample:', JSON.stringify(c[0], null, 2));
  }
}

main();
