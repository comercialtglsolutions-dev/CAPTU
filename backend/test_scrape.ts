import { searchLeads } from './src/services/googlePlaces.js';

async function run() {
    try {
        console.log("Iniciando...");
        const res = await searchLeads('barbearia', 'são paulo');
        console.log("RESULTADO:", res.length, "leads encontrados.");
        console.log(JSON.stringify(res, null, 2));
    } catch(e) {
        console.error("ERRO:", e);
    }
}

run();
