import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const target = 'user_hh7c8f2';

async function listInstances() {
    try {
        const response = await axios.get(
            `${url}/instance/fetchInstances`,
            { headers: { 'apiKey': key } }
        );
        const instances = response.data;
        const me = instances.find(i => i.name === target);
        console.log('Instância Alvo:', JSON.stringify(me, null, 2));
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
    }
}

listInstances();
