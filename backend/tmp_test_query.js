import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPending() {
  console.log('Testing query on agent_proposals with chat_id filter...');
  const { data, error } = await supabase.from('agent_proposals').select('*').eq('chat_id', 'some-id');
  if (error) {
    console.error('Query with chat_id failed:', error.message);
  } else {
    console.log('Query with chat_id succeeded!');
  }
}

checkPending();
