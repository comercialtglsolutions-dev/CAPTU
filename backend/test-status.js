import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function checkStatus() {
    try {
        console.log(`\n--- Checando Status Real da Instância: ${instance} ---`);
        const response = await axios.get(
            `${url}/instance/connectionState/${instance}`,
            { headers: { 'apiKey': key } }
        );
        console.log('Dados Completos:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status || error.message}`);
        if (error.response?.data) console.log('Erro detalhado:', JSON.stringify(error.response.data, null, 2));
    }
}

checkStatus();
