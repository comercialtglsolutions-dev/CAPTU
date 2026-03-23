import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/TGL Solutions\Desktop/CAPTU/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRowWithChatId() {
  console.log('Searching for any row with chat_id column...');
  const { data, error } = await supabase.from('agent_proposals').select('*');
  if (error) {
    console.error('Error fetching data:', error.message);
  } else {
    const rowWithChatId = data.find(r => 'chat_id' in r);
    if (rowWithChatId) {
       console.log('Found a row with chat_id:', rowWithChatId);
    } else {
       console.log('No row has a chat_id property among', data.length, 'rows');
       if (data.length > 0) {
          console.log('Properties of first row:', Object.keys(data[0]));
       }
    }
  }
}

findRowWithChatId();
