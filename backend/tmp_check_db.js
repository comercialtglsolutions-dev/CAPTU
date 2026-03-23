import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from('agent_proposals').select('*').limit(1);
  if (error) {
    console.error('Error fetching agent_proposals:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
  } else {
    console.log('No data to check columns.');
  }
}

checkTable();
