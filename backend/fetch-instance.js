import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function fetchInstanceInfo() {
    try {
        console.log(`\n--- Buscando Configurações da Instância: ${instance} ---`);
        const response = await axios.get(
            `${url}/instance/fetchInstance/${instance}`,
            { headers: { 'apiKey': key } }
        );
        console.log('Configurações:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
    }
}

fetchInstanceInfo();
