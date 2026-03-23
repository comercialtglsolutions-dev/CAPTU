import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// A raiz do projeto CAPTU (indo de backend/src/services para a raiz do repositório)
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

export interface CommandResult {
  stdout: string;
  stderr: string;
  success: boolean;
  error?: string;
}

export class AgentDevService {
  /**
   * Executa um comando no terminal a partir da raiz do projeto.
   */
  static async executeCommand(command: string): Promise<CommandResult> {
    console.log(`[AgentDev] Executando comando: ${command}`);
    try {
      // Bloqueio preventivo de comandos extremamente perigosos (opcional, já que é local)
      if (command.includes('rm -rf /') || command.includes(':(){ :|:& };:')) {
        throw new Error('Comando proibido por motivos de segurança.');
      }

      const { stdout, stderr } = await execPromise(command, { cwd: PROJECT_ROOT });
      return { stdout, stderr, success: true };
    } catch (error: any) {
      console.error(`[AgentDev] Erro ao executar ${command}:`, error.message);
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || '', 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Lê a estrutura de arquivos do projeto (de forma recursiva limitada).
   */
  static async getFileTree(dir: string = '.', maxDepth: number = 7): Promise<string[]> {
    const fullPath = path.resolve(PROJECT_ROOT, dir);
    const results: string[] = [];

    async function walk(currentDir: string, currentDepth: number) {
      if (currentDepth > maxDepth) return;
      
      const files = await fs.readdir(currentDir, { withFileTypes: true });
      for (const file of files) {
        const res = path.resolve(currentDir, file.name);
        const relativePath = path.relative(PROJECT_ROOT, res);
        
        // Ignorar node_modules, .git e pastas de build
        if (file.name === 'node_modules' || file.name === '.git' || file.name === 'dist' || file.name === '.next') {
          continue;
        }

        if (file.isDirectory()) {
          results.push(`${relativePath}/`);
          await walk(res, currentDepth + 1);
        } else {
          results.push(relativePath);
        }
      }
    }

    try {
      await walk(fullPath, 0);
      return results;
    } catch (e) {
      console.error('[AgentDev] Erro ao ler árvore de arquivos:', e);
      return [];
    }
  }

  /**
   * Lê o conteúdo de um arquivo específico.
   */
  static async readFile(filePath: string): Promise<string | null> {
    try {
      const fullPath = path.resolve(PROJECT_ROOT, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (e) {
      console.error(`[AgentDev] Erro ao ler arquivo ${filePath}:`, e);
      return null;
    }
  }

  /**
   * Escreve ou sobrescreve o conteúdo de um arquivo.
   * Cria diretórios se necessário.
   */
  static async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(PROJECT_ROOT, filePath);
      const dir = path.dirname(fullPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      
      console.log(`[AgentDev] Arquivo escrito com sucesso: ${filePath}`);
      return true;
    } catch (e) {
      console.error(`[AgentDev] Erro ao escrever arquivo ${filePath}:`, e);
      return false;
    }
  }

  /**
   * Abstração para operações comuns de Git.
   */
  static async gitOperation(action: 'branch' | 'commit' | 'push' | 'status', params?: { name?: string, message?: string }) {
    switch (action) {
      case 'branch':
        return this.executeCommand(`git checkout -b ${params?.name || 'ai-feature'}`);
      case 'commit':
        await this.executeCommand('git add .');
        return this.executeCommand(`git commit -m "${params?.message || 'feat: update from Agent'}"`);
      case 'status':
        return this.executeCommand('git status');
      default:
        throw new Error('Ação Git não suportada.');
    }
  }

  /**
   * Patcheia um arquivo substituindo um trecho específico.
   * Inclui normalização básica para lidar com variações de aspas e espaços.
   */
  static async patchFile(filePath: string, search: string, replace: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(PROJECT_ROOT, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // Tentativa 1: Match Exato
      if (content.includes(search)) {
        const newContent = content.replace(search, replace);
        await fs.writeFile(fullPath, newContent, 'utf-8');
        console.log(`[AgentDev] Patch exato aplicado: ${filePath}`);
        return true;
      }

      // Tentativa 2: Match Normalizado (ignora espaços extras e aspas simples/duplas no código)
      // Nota: Esta é uma estratégia simplificada para aumentar a taxa de sucesso do "Accept All"
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      const normalizedContent = normalize(content);
      const normalizedSearch = normalize(search);

      if (normalizedContent.includes(normalizedSearch)) {
         console.warn(`[AgentDev] Match exato falhou, mas match normalizado encontrado em ${filePath}. Tentando patch via regex...`);
         // Cria uma regex que ignora espaços
         const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
         const regex = new RegExp(escapedSearch, 'g');
         const newContent = content.replace(regex, replace);
         
         if (newContent !== content) {
           await fs.writeFile(fullPath, newContent, 'utf-8');
           return true; 
         }
      }
      
      throw new Error(`Texto de busca não encontrado no arquivo: ${filePath}`);
    } catch (e: any) {
      console.error(`[AgentDev] Erro ao patchear arquivo ${filePath}:`, e.message);
      return false;
    }
  }
}
