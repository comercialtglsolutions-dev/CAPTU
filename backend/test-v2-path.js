import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testV2Path() {
    try {
        console.log(`\n--- Testando /v2/chat/findChats/${instance} ---`);
        const response = await axios.get(
            `${url}/v2/chat/findChats/${instance}`,
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso! Total:', response.data.length);
    } catch (error) {
        console.log(`❌ Erro /v2/...: ${error.response?.status || error.message}`);
        
        console.log(`\n--- Testando /chat/findChats/${instance} (Novamente com apikey em lowercase) ---`);
        try {
            const response2 = await axios.get(
                `${url}/chat/findChats/${instance}`,
                { headers: { 'apikey': key } }
            );
            console.log('✅ Sucesso! Total:', response2.data.length);
        } catch (err) {
            console.log(`❌ Erro: ${err.response?.status || err.message}`);
        }
    }
}

testV2Path();
