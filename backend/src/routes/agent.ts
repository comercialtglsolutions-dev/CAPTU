import express from 'express';
import axios from 'axios';
import { IntegrationService } from '../services/integrationService.js';
import { searchLeads } from '../services/googlePlaces.js';
import { searchLinkedinCompanies } from '../services/linkedinSearch.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentDevService } from '../services/AgentDevService.js';

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const MANUS_API_KEY = process.env.MANUS_API_KEY || '';

// ─── FERRAMENTAS DO CAPTU (REUTILIZÁVEIS) ──────────────────────────────────
const CAPTU_TOOLS = [
  {
    type: "function",
    function: {
      name: "buscar_leads_qualificados",
      description: "Consulta o banco de dados do CAPTU para retornar a lista de contatos/leads mais recentes.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Padrão 10." },
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "relatorio_geral_projeto",
      description: "Retorna estatísticas do projeto (Total leads, campanhas, etc).",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "terminal_execute",
      description: "Executa comandos no terminal do servidor (CMD/Powershell). Use para rodar installs, builds, testes ou operações git.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "O comando real a ser executado." }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Lê o conteúdo de um arquivo do projeto.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Caminho relativo." }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_patch",
      description: "Propõe uma alteração parcial no código via Live Preview.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Arquivo." },
          search: { type: "string", description: "Trecho Remover." },
          replace: { type: "string", description: "Trecho Inserir." },
          description: { type: "string", description: "Motivo." }
        },
        required: ["path", "search", "replace", "description"]
      }
    }
  }
];

// ─── DESPACHANTE CENTRAL DE FERRAMENTAS ──────────────────────────────────────
async function handleToolCalls(toolCalls: any[], userId: string | undefined, dbClient: any) {
  const results: any[] = [];
  for (const tool of toolCalls) {
    let toolResult: any;
    const name = tool.function?.name || tool.name; 
    const args = typeof tool.function?.arguments === 'string' ? JSON.parse(tool.function.arguments || '{}') : (tool.args || tool.function?.arguments || {});

    console.log(`[CAPTU AI] Executando Tool: ${name}`, args);

    if (name === 'relatorio_geral_projeto') {
      const [leads, camps] = await Promise.all([
        dbClient.from('leads').select('*', { count: 'exact', head: true }),
        dbClient.from('campaigns').select('*', { count: 'exact', head: true })
      ]);
      toolResult = { total_leads: leads.count || 0, total_campanhas: camps.count || 0 };
    } else if (name === 'terminal_execute') {
      toolResult = await AgentDevService.executeCommand(args.command);
    } else if (name === 'read_file') {
      const content = await AgentDevService.readFile(args.path);
      toolResult = content ? { content } : { erro: 'Não encontrado.' };
    } else if (name === 'propose_patch') {
      const { data, error } = await dbClient.from('agent_proposals').insert([{
        user_id: userId,
        path: args.path,
        type: 'patch',
        search: args.search,
        replace: args.replace,
        description: args.description,
        status: 'pending'
      }]).select().single();
      if (!error) await AgentDevService.patchFile(args.path, args.search, args.replace);
      toolResult = error ? { error: error.message } : { proposal_id: data.id, message: 'Aplicado Live Preview.' };
    }

    results.push({ name, callId: tool.id || name, result: toolResult });
  }
  return results;
}

// ─── ENDPOINTS ───────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { messages, provider = 'gemini', systemPrompt, userId, chatId, assistantMessageId } = req.body;
    
    // Configura SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const sendChunk = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const { createClient } = await import('@supabase/supabase-js');
    const dbClient = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const ENGINE_PROMPT = `VOCÊ É O CAPTU AI - ENGENHEIRO DE DEPLOY.
--- FLUXO GIT ---
Se pedir "Merge" ou "Produção", EXECUTE UM POR UM via terminal_execute:
1. git add .
2. git commit -m "feat(ai): finalizando implementações"
3. git checkout main
4. git pull origin main
5. git merge ai-test/vibe-coding
6. git push origin main
7. git push jvlima main
8. git checkout ai-test/vibe-coding

REGRAS: Use aspas duplas (") no Windows. NUNCA minta sobre sucesso sem rodar a ferramenta.`;
    
    const finalContext = (systemPrompt ? systemPrompt + "\n\n" : "") + ENGINE_PROMPT;
    let assistantReply = "";

    // ─── PLUGIN OPENAI (STREAMING) ──────────────────────────────────────────
    if (provider === 'openai') {
      const activeKey = OPENAI_API_KEY;
      let currentMessages: any[] = [{ role: 'system', content: finalContext }, ...messages.map((m: any) => ({ role: m.role, content: m.content }))];
      
      for (let i = 0; i < 5; i++) {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', { model: 'gpt-4o', messages: currentMessages, tools: CAPTU_TOOLS, stream: true }, { headers: { Authorization: `Bearer ${activeKey}` }, responseType: 'stream' });
        
        let responseMsg: any = { role: 'assistant', content: '', tool_calls: [] };
        let toolBuffer: any = {};
        let openaiBuffer = '';

        await new Promise((resolve) => {
          response.data.on('data', (chunk: any) => {
            openaiBuffer += chunk.toString();
            const lines = openaiBuffer.split('\n');
            openaiBuffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const dataStr = trimmed.substring(6);
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices[0]?.delta;
                if (delta?.content) { assistantReply += delta.content; responseMsg.content += delta.content; sendChunk({ part: delta.content }); }
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!toolBuffer[tc.index]) toolBuffer[tc.index] = { id: tc.id, function: { name: '', arguments: '' } };
                    if (tc.id) toolBuffer[tc.index].id = tc.id;
                    if (tc.function?.name) toolBuffer[tc.index].function.name += tc.function.name;
                    if (tc.function?.arguments) toolBuffer[tc.index].function.arguments += tc.function.arguments;
                  }
                }
              } catch (e) {}
            }
          });
          response.data.on('end', resolve);
        });

        const toolCalls = Object.values(toolBuffer).map((t: any) => ({ id: t.id, type: 'function', function: t.function }));
        if (toolCalls.length > 0) {
          responseMsg.tool_calls = toolCalls;
          const log = `\n[PENSANDO] Executando ferramentas...\n`;
          assistantReply += log; sendChunk({ part: log });
          const toolResults = await handleToolCalls(toolCalls, userId, dbClient);
          currentMessages.push(responseMsg);
          toolResults.forEach(r => currentMessages.push({ role: 'tool', tool_call_id: r.callId, content: JSON.stringify(r.result) }));
        } else break;
      }
    } else {
       // Gemini Fallback... (Omitido para brevidade ou implemente similar se necessário)
       sendChunk({ part: "Por favor, utilize OpenAI para este fluxo de engenharia." });
    }

    // SALVAMENTO FINAL
    if (userId && chatId && assistantReply) {
      await dbClient.from('agent_messages').insert({ id: assistantMessageId, user_id: userId, chat_id: chatId, role: 'assistant', content: assistantReply, provider });
    }

    res.write('event: end\ndata: {}\n\n');
    res.end();

  } catch (error: any) {
    console.error('[CAPTU Error]:', error.message);
    res.end();
  }
});

router.post('/rate', async (req, res) => {
  const { messageId, rating } = req.body;
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await db.from('agent_messages').update({ rating }).eq('id', messageId);
  res.json({ success: true });
});

router.get('/proposals/pending', async (req, res) => {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await db.from('agent_proposals').select('*').eq('status', 'pending');
  res.json(data || []);
});

router.post('/proposals/bulk-action', async (req, res) => {
  const { action } = req.body;
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: proposals } = await db.from('agent_proposals').select('*').eq('status', 'pending');
  if (proposals) {
    for (const p of proposals) {
      if (action === 'reject') await AgentDevService.patchFile(p.path, p.replace || '', p.search || '');
      await db.from('agent_proposals').update({ status: action === 'approve' ? 'accepted' : 'rejected' }).eq('id', p.id);
    }
  }
  res.json({ success: true });
});

export default router;
