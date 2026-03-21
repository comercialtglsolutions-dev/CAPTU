
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

async function main() {
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: cl } = await db.from('campaign_leads').select('*').limit(1);
  console.log('campaign_leads columns:', cl && cl[0] ? Object.keys(cl[0]) : 'No data');
  
  const { data: l } = await db.from('leads').select('*').limit(1);
  console.log('Lead columns:', l && l[0] ? Object.keys(l[0]) : 'No data');
}

main();
