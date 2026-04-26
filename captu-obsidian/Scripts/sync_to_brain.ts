import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importações dos serviços reais do backend do CAPTU (Ajuste os caminhos conforme necessário)
// import { supabase } from '../../backend/src/config/supabase';
// import { EmbeddingService } from '../../backend/src/services/embeddings';

// Caminho para o diretório base do Vault (Onde este script está executando)
const vaultBaseDir = path.resolve(__dirname, '..');

/**
 * Função para mapear diretórios e arquivos do Vault e extrair dados cruciais para o RAG.
 */
async function syncObsidianToSupabase() {
    console.log("Iniciando sincronização local (Obsidian) -> Banco (Supabase)...");
    
    // Ler todos os arquivos `.md` do diretório captu-obsidian recursivamente
    const files = getMarkdownFiles(vaultBaseDir);
    let syncedCount = 0;

    for (const file of files) {
        if (file.includes('Scripts') || file.includes('.obsidian')) continue; // ignora pastas ocultas / scripts próprios

        const content = fs.readFileSync(file, 'utf-8');
        const filename = path.basename(file);
        
        console.log(`\n📄 Processando nota: ${filename}`);

        // Opcional: Aqui poderíamos tentar parsear o Frontmatter para pegar a Categoria e tags
        const categoryMatch = content.match(/categoria:\s+"([^"]+)"/);
        const categoryName = categoryMatch ? categoryMatch[1] : 'Outros';

        // Vetoriza e injeta na base do Claude / LLM (MOCK de lógica, adaptar para usar RAG real do supabase)
        try {
            // Em um ambiente real, você inseriria primeiro no `tenant_context` se não existir, depois chamaria o EmbeddingService.
            // Para efeitos deste MVP Script, simula-se a chamada onde o Claude consumirá isso.
            console.log(`[RAG] Vetorizando conteúdo de ${filename} na categoria [${categoryName}]...`);
            
            // Exemplo de como chamaria o serviço do backend:
            // await EmbeddingService.vectorizeContext("ID_GENERICO_SYSTEM", "ID_NOTA", content, filename, { categoria: categoryName, peso_prioridade: 5 });
            console.log(`   ✔️ Vetorização simulada concluída com sucesso.`);
            syncedCount++;
        } catch (error) {
            console.error(`   ❌ Falha ao processar ${filename}:`, error);
        }
    }
    
    console.log(`\n🎉 Sincronização Finalizada! ${syncedCount} notas lidas. O cérebro da IA está atualizado.`);
}

function getMarkdownFiles(dir: string, fileList: string[] = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getMarkdownFiles(filePath, fileList);
        } else if (filePath.endsWith('.md')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// Execução
syncObsidianToSupabase();
