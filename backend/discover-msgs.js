import axios from 'axios';

const url = 'https://evolution.tglsolutions.com.br';
const key = 'evolution_api_key_12345';
const instance = 'user_hh7c8f2';
const jid = '5511952867866@s.whatsapp.net';

async function discoverMessageEndpoint() {
    const endpoints = [
        { path: `/chat/fetchMessages/${instance}`, method: 'post', data: { remoteJid: jid } },
        { path: `/chat/findMessages/${instance}`, method: 'post', data: { remoteJid: jid } },
        { path: `/chat/fetchMessages/${instance}`, method: 'get', params: { remoteJid: jid } },
        { path: `/chat/findMessages/${instance}`, method: 'get', params: { remoteJid: jid } },
        { path: `/message/findAll/${instance}`, method: 'get', params: { remoteJid: jid } },
        { path: `/message/fetchMessages/${instance}`, method: 'post', data: { remoteJid: jid } }
    ];

    for (const e of endpoints) {
        try {
            console.log(`Testing ${e.method.toUpperCase()} ${e.path}...`);
            const config = { headers: { 'apiKey': key } };
            if (e.params) config.params = e.params;
            
            const res = e.method === 'post' 
                ? await axios.post(`${url}${e.path}`, e.data, config)
                : await axios.get(`${url}${e.path}`, config);
            
            console.log(`✅ SUCCESS! ${e.method.toUpperCase()} ${e.path}`);
            console.log('Response excerpt:', JSON.stringify(res.data).substring(0, 100));
            return;
        } catch (err) {
            console.log(`❌ Failed: ${err.response?.status || err.message}`);
        }
    }
}

discoverMessageEndpoint();
