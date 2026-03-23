import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/TGL Solutions/Desktop/CAPTU/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
  console.log('Attempting to add chat_id column to agent_proposals table...');
  // We don't have a direct raw SQL endpoint unless we use RPC or something.
  // But maybe we can try to use the agent_chats table if we can't add it?
  
  // Let's try to just insert WITHOUT chat_id for a second to see if it works.
  const { data, error } = await supabase.from('agent_proposals').insert({
    user_id: '5fdd75f0-0fe4-4201-9e36-b352a8e452c5', // FROM SAMPLE
    path: 'src/pages/AgentPage.tsx',
    type: 'patch',
    search: 'test',
    replace: 'test2',
    description: 'test proposal',
    status: 'pending'
  }).select();
  
  if (error) {
    console.error('Insert WITHOUT chat_id failed:', error.message);
  } else {
    console.log('Insert WITHOUT chat_id succeeded! Data:', data);
  }
}

addColumn();
