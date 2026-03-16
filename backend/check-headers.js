import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';

async function checkHeaders() {
    try {
        const response = await axios.get(
            `${url}/instance/fetchInstances`,
            { headers: { 'apiKey': key } }
        );
        console.log('Headers:', JSON.stringify(response.headers, null, 2));
        console.log('Example Instance Keys:', Object.keys(response.data[0]));
    } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
    }
}

checkHeaders();
