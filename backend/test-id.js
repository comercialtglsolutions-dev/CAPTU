import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instanceId = '26502979-8eb1-422c-8227-50e68d5d148e';

async function testWithId() {
    try {
        console.log(`\n--- Testando fetchInstance com ID: ${instanceId} ---`);
        const response = await axios.get(
            `${url}/instance/fetchInstance/${instanceId}`,
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso! Dados:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Erro fetchInstance via ID: ${error.response?.status || error.message}`);
    }
}

testWithId();
