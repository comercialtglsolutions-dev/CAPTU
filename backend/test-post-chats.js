import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testPostFindChats() {
    try {
        console.log(`\n--- Testando findChats com POST: ${instance} ---`);
        const response = await axios.post(
            `${url}/chat/findChats/${instance}`,
            {}, // Body vazio se for apenas listagem
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso (POST)! Total:', response.data.length);
        if (response.data.length > 0) console.log('Exemplo:', JSON.stringify(response.data[0], null, 2));
    } catch (error) {
        console.log(`❌ Erro POST findChats: ${error.response?.status || error.message}`);
        if (error.response?.data) console.log('Resposta do Erro:', JSON.stringify(error.response.data, null, 2));
    }
}

testPostFindChats();
