import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testChats() {
    try {
        console.log(`\n--- Testando Busca de Chats: ${instance} ---`);
        const response = await axios.get(
            `${url}/chat/findChats/${instance}`,
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso! Total de chats:', response.data.length);
        console.log('Primeiro chat:', JSON.stringify(response.data[0], null, 2));
    } catch (error) {
        console.log(`❌ Erro em findChats/${instance}: ${error.response?.status || error.message}`);
        if (error.response?.status === 404) {
            console.log('Tentando endpoint sem a instância no path (padrão v2 query param)...');
            try {
                const response2 = await axios.get(
                    `${url}/chat/findChats`,
                    { 
                        headers: { 'apiKey': key },
                        params: { instanceName: instance }
                    }
                );
                console.log('✅ Sucesso (v2 format)! Total de chats:', response2.data.length);
            } catch (err) {
                 console.log(`❌ Erro no formato v2: ${err.response?.status || err.message}`);
            }
        }
    }
}

testChats();
