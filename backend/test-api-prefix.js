import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testApiPrefix() {
    try {
        console.log(`\n--- Testando /api/instance/fetchInstances ---`);
        const response = await axios.get(
            `${url}/api/instance/fetchInstances`,
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso! /api/ prefix works!');
    } catch (error) {
        console.log(`❌ Falha /api/ prefix: ${error.response?.status || error.message}`);
    }
}

testApiPrefix();
