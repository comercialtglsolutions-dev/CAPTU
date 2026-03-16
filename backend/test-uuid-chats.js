import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const id = '26502979-8eb1-422c-8227-50e68d5d148e';

async function testWithUuid() {
    try {
        console.log(`\n--- Testando findChats com UUID: ${id} ---`);
        const response = await axios.get(
            `${url}/chat/findChats/${id}`,
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso! Total:', response.data.length);
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
    }
}

testWithUuid();
