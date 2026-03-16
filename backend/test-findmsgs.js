import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';
const jid = '5511952867866@s.whatsapp.net';

async function testFindMessages() {
    try {
        console.log(`\n--- Testando /chat/findMessages/${instance} ---`);
        const response = await axios.get(
            `${url}/chat/findMessages/${instance}`,
            { 
                params: { remoteJid: jid, page: 1 },
                headers: { 'apiKey': key } 
            }
        );
        console.log('✅ Sucesso! Mensagens:', response.data.length);
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
    }
}

testFindMessages();
