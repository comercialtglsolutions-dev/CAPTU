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
      if (command.includes('rm -rf /')) {
        throw new Error('Comando proibido por segurança.');
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

  static async readFile(filePath: string): Promise<string | null> {
    try {
      const fullPath = path.resolve(PROJECT_ROOT, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (e) {
      console.error(`[AgentDev] Erro ao ler arquivo ${filePath}:`, e);
      return null;
    }
  }

  static async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(PROJECT_ROOT, filePath);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return true;
    } catch (e) {
      console.error(`[AgentDev] Erro ao escrever arquivo ${filePath}:`, e);
      return false;
    }
  }

  /**
   * Patcheia um arquivo substituindo um trecho específico.
   */
  static async patchFile(filePath: string, search: string, replace: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(PROJECT_ROOT, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      if (content.includes(search)) {
        const newContent = content.replace(search, replace);
        await fs.writeFile(fullPath, newContent, 'utf-8');
        return true;
      }
      
      // Tentativa via regex se o match exato falhar (lidar com espaços)
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const regex = new RegExp(escapedSearch, 'g');
      const newContent = content.replace(regex, replace);
      
      if (newContent !== content) {
        await fs.writeFile(fullPath, newContent, 'utf-8');
        return true;
      }

      throw new Error(`Texto de busca não encontrado no arquivo: ${filePath}`);
    } catch (e: any) {
      console.error(`[AgentDev] Erro ao aplicar patch em ${filePath}:`, e.message);
      return false;
    }
  }
}
