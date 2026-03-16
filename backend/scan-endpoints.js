import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';

async function scanEndpoints() {
    const resources = ['chat', 'message', 'instance', 'group'];
    const actions = ['find', 'fetch', 'get', 'list', 'findAll'];
    const targets = ['Chats', 'Messages', 'Contacts', 'Instances'];
    
    for (const r of resources) {
        for (const a of actions) {
            for (const t of targets) {
                const endpoint = `/${r}/${a}${t}/${instance}`;
                try {
                    const response = await axios.get(`${url}${endpoint}`, { headers: { 'apiKey': key } });
                    console.log(`✅ DISCOV! URL: ${endpoint} -> Status: ${response.status}`);
                } catch (e) {}
            }
        }
    }
}

scanEndpoints();
