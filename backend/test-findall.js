import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testFindAll() {
    try {
        console.log(`\n--- Testando /message/findAll com POST: ${instance} ---`);
        const response = await axios.post(
            `${url}/message/findAll/${instance}`,
            { remoteJid: '5511952867866@s.whatsapp.net', page: 1 }, 
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso (POST)!', response.data.length);
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
    }
}

testFindAll();
