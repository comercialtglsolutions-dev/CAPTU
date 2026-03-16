import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';
const jid = '5511952867866@s.whatsapp.net'; // Um JID válido do teste anterior

async function testHistory() {
    try {
        console.log(`\n--- Testando fetchMessages com POST: ${instance} ---`);
        const response = await axios.post(
            `${url}/chat/fetchMessages/${instance}`,
            { remoteJid: jid, page: 1 }, 
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso (POST)! Mensagens:', response.data.messages?.length || response.data.length);
    } catch (error) {
        console.log(`❌ Erro POST fetchMessages: ${error.response?.status || error.message}`);
        
        console.log(`\n--- Testando fetchMessages com GET: ${instance} ---`);
        try {
            const response2 = await axios.get(
                `${url}/chat/fetchMessages/${instance}`,
                { 
                    params: { remoteJid: jid, page: 1 },
                    headers: { 'apiKey': key } 
                }
            );
            console.log('✅ Sucesso (GET)! Mensagens:', response2.data.messages?.length || response2.data.length);
        } catch (err) {
             console.log(`❌ Erro GET fetchMessages: ${err.response?.status || err.message}`);
        }
    }
}

testHistory();
