import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testV2Chats() {
    try {
        console.log(`\n--- Testando Busca de Chats (Headers v2): ${instance} ---`);
        const response = await axios.get(
            `${url}/chat/findChats`,
            { 
                headers: { 
                    'apiKey': key,
                    'instance': instance 
                } 
            }
        );
        console.log('✅ Sucesso! Total de chats:', response.data.length);
        if (response.data.length > 0) console.log('Primeiro chat:', JSON.stringify(response.data[0], null, 2));
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
        if (error.response?.data) console.log('Erro detalhado:', JSON.stringify(error.response.data, null, 2));
    }
}

testV2Chats();
