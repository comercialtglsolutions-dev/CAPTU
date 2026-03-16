import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testQueryParams() {
    const endpoints = [
        '/chat/findChats',
        '/chat/fetchChats',
        '/chat/findMessages',
        '/message/findMessages'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n--- Testando ${endpoint} + QueryParam ---`);
            const response = await axios.get(`${url}${endpoint}`, { 
                headers: { 'apiKey': key },
                params: { instance: instance }
            });
            console.log(`✅ Sucesso! Status: ${response.status}`);
        } catch (error) {
            console.log(`❌ Falha ${endpoint}: ${error.response?.status || error.message}`);
        }
    }
}

testQueryParams();
