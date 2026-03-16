import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testEndpoints() {
    const endpoints = [
        `/chat/findChats/${instance}`,
        `/chat/fetchChats/${instance}`,
        `/chat/findContacts/${instance}`,
        `/chat/findMessages/${instance}`,
        `/chat/fetchMessages/${instance}`,
        `/message/findAll/${instance}`
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n--- Testando ${endpoint} ---`);
            const response = await axios.get(`${url}${endpoint}`, { headers: { 'apiKey': key } });
            console.log(`✅ Sucesso! Status: ${response.status}`);
        } catch (error) {
            console.log(`❌ Falha: ${error.response?.status || error.message}`);
        }
    }
}

testEndpoints();
