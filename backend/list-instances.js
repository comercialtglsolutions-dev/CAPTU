import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';

async function listInstances() {
    try {
        console.log(`\n--- Listando Instâncias ---`);
        const response = await axios.get(
            `${url}/instance/fetchInstances`,
            { headers: { 'apiKey': key } }
        );
        console.log('Instâncias:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
    }
}

listInstances();
