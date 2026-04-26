import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const KNOWLEDGE_DIR = path.join(PROJECT_ROOT, 'knowledge');

export class KnowledgeSyncService {
  /**
   * Sincroniza o contexto do banco de dados para arquivos locais Markdown.
   * Isso permite que IAs locais (como o Hermes) leiam a base de conhecimento diretamente via ferramentas de arquivo.
   */
  static async syncToLocal(userId: string) {
    console.log(`[KnowledgeSync] Sincronizando base para o usuário: ${userId}`);
    
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('tenant_context')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (!data) return;

      await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });

      for (const item of data) {
        const fileName = `${item.type}_${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        const filePath = path.join(KNOWLEDGE_DIR, fileName);
        
        const content = `---
ID: ${item.id}
Nome: ${item.name}
Tipo: ${item.type}
Categoria: ${item.categoria}
---

${item.content}`;

        await fs.writeFile(filePath, content, 'utf-8');
      }

      console.log(`[KnowledgeSync] ${data.length} arquivos sincronizados em ${KNOWLEDGE_DIR}`);
      return true;
    } catch (e: any) {
      console.error('[KnowledgeSync] Erro na sincronização:', e.message);
      return false;
    }
  }
}
