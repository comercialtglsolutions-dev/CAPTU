import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function testContacts() {
    try {
        console.log(`\n--- Testando /contact/fetchContacts/${instance} ---`);
        const response = await axios.get(
            `${url}/contact/fetchContacts/${instance}`,
            { headers: { 'apiKey': key } }
        );
        console.log('✅ Sucesso! Total:', response.data.length);
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
    }
}

testContacts();
