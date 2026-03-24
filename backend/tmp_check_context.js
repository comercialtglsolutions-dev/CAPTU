import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    const { data, error } = await supabase.from('tenant_context').select('*').limit(1);
    if (error) {
      console.error('Error fetching tenant_context:', error.message);
    } else {
      console.log('Success! Table exists.');
    }
  } catch (e) {
    console.error('Exception check:', e.message);
  }
}

checkTable();
