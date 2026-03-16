import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testFetchChats() {
    try {
        console.log(`\n--- Testando /chat/fetchChats (instance in path) ---`);
        const response = await axios.get(
            `${url}/chat/fetchChats/${instance}`,
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso! Total:', response.data.length);
    } catch (error) {
        console.log(`❌ Erro fetchChats in path: ${error.response?.status || error.message}`);
        
        console.log(`\n--- Testando /chat/fetchChats (instance in header) ---`);
        try {
            const response2 = await axios.get(
                `${url}/chat/fetchChats`,
                { headers: { 'apiKey': key, 'instance': instance } }
            );
            console.log('✅ Sucesso! Total:', response2.data.length);
        } catch (err) {
            console.log(`❌ Erro fetchChats in header: ${err.response?.status || err.message}`);
        }
    }
}

testFetchChats();
