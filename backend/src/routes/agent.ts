import express from 'express';
import axios from 'axios';
import { IntegrationService } from '../services/integrationService.js';
import { searchLeads } from '../services/googlePlaces.js';
import { searchLinkedinCompanies } from '../services/linkedinSearch.js';

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
      description: "Consulta o banco de dados do CAPTU para retornar a lista de contatos/leads mais recentes que o usuário possui. Use isso sempre que o usuário perguntar sobre leads, quem são os contatos, pesquisas do google maps ou linkedin, ou estatísticas da base dele.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Quantidade máxima de leads a consultar. O padrão é 10 e o máximo razoável é 50." },
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "buscar_campanhas_ativas",
      description: "Consulta o banco de dados do CAPTU para retornar as campanhas ativas de prospecção do projeto. Retorna Nomes, Status, Limites Diários, e Nicho de envio.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Quantidade máxima de campanhas a consultar. O padrão é 5." },
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "relatorio_geral_projeto",
      description: "Retorna um resumo estatístico profundo de todo o projeto CAPTU do usuário: contagem total de leads, total de campanhas, total de disparos/histórico e leads em fila. Use isso se o usuário pedir dados em geral da plataforma, resumos ou estatísticas do projeto todo.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "buscar_historico_contatos",
      description: "Consulta o banco de dados para retornar o histórico de mensagens enviadas recentemente aos leads. Use isso para ver o que foi falado nas conversas e qual o status de envio no whatsapp ou email.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Quantidade máxima de históricos a consultar. Padrão 5." },
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "criar_nova_campanha",
      description: "Cria uma nova campanha de prospecção no banco de dados. Use isso quando o usuário der o 'OK' para o seu plano estratégico. IMPORTANTE: O campo niche é usado para salvar o Script/Template da mensagem.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da campanha (ex: Prospecção Barbearias SP)" },
          message_script: { type: "string", description: "O script de prospecção completo com placeholders {{segment}}, {{city}}, etc." },
          daily_limit: { type: "number", description: "Limite de envios por dia. Padrão 50." },
          city: { type: "string", description: "Cidade alvo opcional." }
        },
        required: ["name", "message_script"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pesquisar_leads_google",
      description: "Inicia uma pesquisa técnica e salvamento automático de leads via Google Maps. Use parâmetros idênticos à interface manual.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nicho ou segmento (ex: 'Oficinas Mecânicas')" },
          location: { type: "string", description: "Cidade/Região (ex: 'São Paulo, SP')" },
          radius: { type: "number", description: "Raio de busca em metros (ex: 15000 para 15km). Padrão 15000." },
          min_rating: { type: "number", description: "Avaliação mínima (0 a 5). Padrão 0." },
          min_reviews: { type: "number", description: "Mínimo de avaliações. Padrão 0." },
          only_without_website: { type: "boolean", description: "Se verdadeiro, busca apenas empresas sem site próprio." },
          only_with_phone: { type: "boolean", description: "Se verdadeiro, busca apenas empresas com telefone listado." }
        },
        required: ["query", "location"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pesquisar_leads_linkedin",
      description: "Inicia uma pesquisa técnica e salvamento automático de leads/empresas via LinkedIn.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Setor ou cargo (ex: 'Diretores de Marketing')" },
          city: { type: "string", description: "Cidade de busca (ex: 'Curitiba')" }
        },
        required: ["query", "city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "adicionar_leads_campanha",
      description: "Adiciona uma lista de IDs de leads a uma campanha específica. Use isso quando o usuário der o OK para incluir leads encontrados em uma campanha.",
      parameters: {
        type: "object",
        properties: {
          campaign_id: { type: "string", description: "O ID da campanha de destino." },
          lead_ids: { type: "array", items: { type: "string" }, description: "Lista de IDs dos leads a serem adicionados." }
        },
        required: ["campaign_id", "lead_ids"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "verificar_ferramentas_conectadas",
      description: "Consulta quais ferramentas externas (CRMs, Planilhas, etc) o usuário possui conectadas no CAPTU (ex: Pipedrive, HubSpot, Google Sheets). Use isso sempre que o usuário perguntar o que está conectado ou se a IA tem acesso a tal ferramenta.",
      parameters: { type: "object", properties: {} }
    }
  }
];

// ─── DESPACHANTE CENTRAL DE FERRAMENTAS ──────────────────────────────────────
async function handleToolCalls(toolCalls: any[], userId: string | undefined, dbClient: any) {
  const results: any[] = [];
  
  for (const tool of toolCalls) {
    let toolResult: any;
    const name = tool.function?.name || tool.name; // Suporta OpenAI e Gemini formats
    const args = typeof tool.function?.arguments === 'string' ? JSON.parse(tool.function.arguments || '{}') : (tool.args || tool.function?.arguments || {});

    console.log(`[CAPTU AI] Executando Tool: ${name}`, args);

    if (name === 'buscar_leads_qualificados') {
      const limit = args.limit || 10;
      const { data, error } = await dbClient.from('leads').select('*').limit(limit).order('created_at', { ascending: false });
      toolResult = error ? { erro: error.message } : (data || []).map((l: any) => ({ id: l.id, n: l.name, ph: l.phone, st: l.status }));

    } else if (name === 'buscar_campanhas_ativas') {
      const limit = args.limit || 5;
      const { data, error } = await dbClient.from('campaigns').select('*').limit(limit).order('created_at', { ascending: false });
      toolResult = error ? { erro: error.message } : (data || []).map((c: any) => ({ id: c.id, name: c.name, status: c.status, niche: c.niche }));

    } else if (name === 'relatorio_geral_projeto') {
      try {
        const [leads, camps, hist] = await Promise.all([
          dbClient.from('leads').select('*', { count: 'exact', head: true }),
          dbClient.from('campaigns').select('*', { count: 'exact', head: true }),
          dbClient.from('contact_history').select('*', { count: 'exact', head: true })
        ]);
        toolResult = { total_leads: leads.count || 0, total_campanhas: camps.count || 0, total_contatos: hist.count || 0 };
      } catch (e: any) { toolResult = { erro: e.message }; }

    } else if (name === 'criar_nova_campanha') {
      const { data, error } = await dbClient.from('campaigns').insert({
        name: args.name,
        niche: args.message_script,
        daily_limit: args.daily_limit || 50,
        city: args.city || null,
        status: 'Pausada'
      }).select();
      toolResult = error ? { erro: error.message } : { sucesso: true, mensagem: `Campanha '${args.name}' criada.`, id: data?.[0]?.id };

    } else if (name === 'pesquisar_leads_google') {
      try {
        const filters = { radius: args.radius || 15000, minRating: args.min_rating || 0, minReviews: args.min_reviews || 0, onlyWithoutWebsite: args.only_without_website || false, onlyWithPhone: args.only_with_phone || false };
        const leads = await searchLeads(args.query, args.location, filters);
        if (leads && leads.length > 0) {
          const leadsToSave = leads.map((l: any) => ({ ...l, origin: 'google_places' }));
          await dbClient.from('leads').upsert(leadsToSave, { onConflict: 'place_id', ignoreDuplicates: true });
          toolResult = { sucesso: true, mensagem: `${leads.length} leads salvos com sucesso.` };
        } else { toolResult = { message: "Nenhum lead encontrado." }; }
      } catch (e: any) { toolResult = { erro: e.message }; }

    } else if (name === 'pesquisar_leads_linkedin') {
      try {
        const leads = await searchLinkedinCompanies(args.query, args.city);
        if (leads && leads.length > 0) {
          await dbClient.from('leads').upsert(leads, { onConflict: 'website', ignoreDuplicates: true });
          toolResult = { sucesso: true, mensagem: `${leads.length} leads do LinkedIn salvos.` };
        } else { toolResult = { message: "Nada no LinkedIn." }; }
      } catch (e: any) { toolResult = { erro: e.message }; }

    } else if (name === 'adicionar_leads_campanha') {
      try {
        const records = args.lead_ids.map((lid: string) => ({ campaign_id: args.campaign_id, lead_id: lid, status: 'pending' }));
        const { error } = await dbClient.from('campaign_leads').upsert(records, { onConflict: 'campaign_id, lead_id' });
        toolResult = error ? { erro: error.message } : { sucesso: true, mensagem: `${args.lead_ids.length} leads vinculados.` };
      } catch (e: any) { toolResult = { erro: e.message }; }
    } else if (name === 'verificar_ferramentas_conectadas') {
      try {
        const { data, error } = await dbClient.from('tenant_integrations').select('provider, is_active').eq('user_id', userId);
        if (error) throw error;
        toolResult = {
          conectadas: (data || []).map((i: any) => ({ ferramenta: i.provider, status: i.is_active ? 'Ativa' : 'Inativa' }))
        };
      } catch (e: any) { toolResult = { erro: e.message }; }
    }

    results.push({ name, callId: tool.id || name, result: toolResult });
  }
  return results;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * GET /api/agent/available-models
 * Returns which models have active API keys configured
 */
router.get('/available-models', (_req, res) => {
  res.json({
    available: [
      { id: 'gemini', available: !!GEMINI_API_KEY },
      { id: 'openai', available: !!OPENAI_API_KEY },
      { id: 'claude', available: !!ANTHROPIC_API_KEY },
      { id: 'elevenlabs', available: !!ELEVENLABS_API_KEY },
      { id: 'manus', available: !!MANUS_API_KEY },
      { id: 'grok', available: false },
      { id: 'perplexity', available: false },
    ]
  });
});

/**
 * POST /api/agent/chat
 * Proxy para as APIs de IA com suporte a múltiplos provedores
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, provider = 'gemini', systemPrompt, fileContent, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Carregar Chave Customizada do Cliente se existir (OpenAI, Anthropic, Gemini, etc)
    let customKey = null;
    if (userId) {
      try {
        const integ = await IntegrationService.getIntegration(userId, provider);
        if (integ && integ.is_active && integ.credentials?.apiKey) {
          customKey = integ.credentials.apiKey;
        }
      } catch (err) {
        console.warn(`[CAPTU AI] Erro ao buscar chave customizada para ${provider}:`, err);
      }
    }

    // Contexto base do CAPTU injetado em todas as conversas
    let captuContext = systemPrompt || `Você é o CAPTU AI, um assistente de inteligência artificial especializado em prospecção B2B e vendas.
Você tem acesso ao contexto da plataforma CAPTU, que é uma ferramenta de prospecção de leads.
Você pode ajudar com:
- Geração de scripts de prospecção personalizados
- Análise de leads e empresas
- Criação de relatórios de vendas
- Estratégias de abordagem B2B
- Análise de campanhas e métricas
- Sugestões de follow-up e automações
- Qualificação de leads por perfil de empresa
- Verificação de ferramentas e CRMs conectados (Pipedrive, HubSpot, Sheets, etc.)

Seja direto, profissional e focado em resultados de vendas. Responda sempre em português do Brasil.
Você tem permissão para verificar quais ferramentas externas estão conectadas para dar respostas mais precisas sobre integrações.
Use markdown quando útil: negrito para termos importantes, listas para sequências, tabelas para comparações.
${fileContent ? `\n\nO usuário enviou um arquivo com o seguinte conteúdo:\n${fileContent}` : ''}`;

    // ─── INJEÇÃO DE CONTEXTO VIVO DO PROJETO ──────────────────────────────────
    try {
      if (userId) {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
        const { createClient } = await import('@supabase/supabase-js');
        const db = createClient(supabaseUrl, supabaseKey);

          const [leadsRes, campsRes, contextRes] = await Promise.all([
          db.from('leads').select('*', { count: 'exact', head: true }),
          db.from('campaigns').select('*').limit(10).order('created_at', { ascending: false }),
          db.from('tenant_context').select('*').eq('user_id', userId).eq('is_active', true)
        ]);

        const totalLeads = leadsRes.count || 0;
        const recentCampaigns = (campsRes.data || []).map(c => `- ${c.name} (${c.status}): ${c.niche || 'Geral'}`).join('\n');
        const userContextItems = (contextRes.data || []).map(ctx => `[${ctx.type.toUpperCase()}: ${ctx.name}] ${ctx.content?.substring(0, 10000)}`).join('\n\n');

        captuContext += `\n\n--- DADOS EM REAL-TIME DO PROJETO ---\nNo momento, o usuário possui ${totalLeads} leads capturados no banco de dados.\nCampanhas recentes:\n${recentCampaigns || 'Nenhuma campanha criada ainda.'}\n-------------------------------------\n`;
        
        if (userContextItems) {
          captuContext += `\n\n--- BASE DE CONHECIMENTO E CONTEXTO DO USUÁRIO ---\n${userContextItems}\n--------------------------------------------------\n`;
        }

        captuContext += `\nINSTRUÇÕES ESTRATÉGICAS (MANDATÓRIO):
1. Você é o BRAÇO DIREITO do usuário na prospecção B2B. Sua comunicação deve ser **DIRETA, CONCISA E PROFISSIONAL**.
2. **MODALIDADE DE RESPOSTA**: 
   - Para perguntas simples ou confirmação de tarefas: Responda de forma curta e objetiva.
   - Para pedidos de análise, resumos de projeto ou relatórios estratégicos: Use a **ESTRUTURA COMPLETA** (Introdução, Tabela, Análise, Insight). 
   - Se não for um relatório, **NUNCA** repita a estrutura de tabelas em toda resposta.
3. Use os dados de forma NATURAL e priorize as informações da BASE DE CONHECIMENTO acima para alinhar tom de voz e estratégias.
4. **MANDATÓRIO: PERMISSÃO (HUMAN-IN-THE-LOOP)**: Antes de qualquer ação de escrita (buscar leads, criar campanha ou vincular contatos), você deve apresentar a estratégia e perguntar: "Posso prosseguir?". Só execute a ferramenta técnica APÓS o 'OK' do usuário.
5. Se vir uma campanha pausada ou oportunidade, sugira ações acionáveis.`;
      }
    } catch (dbErr) {
      console.warn('[CAPTU AI] Falha ao injetar contexto vivo:', dbErr);
    }

    // ─── GEMINI ───────────────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const activeKey = customKey || GEMINI_API_KEY;
      if (!activeKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });

      const geminiContents = messages.map((msg: Message) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Injeta ferramentas mapeadas para formato Gemini
      const toolsManifest = [{ functionDeclarations: CAPTU_TOOLS.map(t => t.function) }];

      const callGemini = async (contents: any[]) => axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${activeKey}`,
        { 
          contents, 
          systemInstruction: { parts: [{ text: captuContext }] },
          tools: toolsManifest,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        }
      );

      let response = await callGemini(geminiContents);
      let candidate = response.data.candidates?.[0];
      let firstPart = candidate?.content?.parts?.[0];

      // Suporte a Function Calling no Gemini
      if (firstPart?.functionCall) {
        console.log('[CAPTU AI] Gemini solicitou ferramentas:', firstPart.functionCall.name);
        
        const { createClient } = await import('@supabase/supabase-js');
        const dbClient = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        const toolResults = await handleToolCalls([firstPart.functionCall], userId, dbClient);

        // Enviar resultados de volta para o Gemini
        const updatedContents = [
          ...geminiContents,
          candidate.content,
          {
            role: 'function',
            parts: toolResults.map(r => ({
              functionResponse: { name: r.name, response: { content: r.result } }
            }))
          }
        ];

        const finalResponse = await callGemini(updatedContents);
        const finalCandidate = finalResponse.data.candidates?.[0];
        return res.json({ reply: finalCandidate?.content?.parts?.[0]?.text || 'Ação executada com sucesso.', provider: 'gemini' });
      }

      return res.json({ reply: firstPart?.text || 'Sem resposta.', provider: 'gemini' });
    }

    // ─── OPENAI ───────────────────────────────────────────────────────────────
    if (provider === 'openai') {
      const activeKey = customKey || OPENAI_API_KEY;
      if (!activeKey) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no sistema nem no seu painel de Integrações.' });

      console.log(`[CAPTU AI] OpenAI Key ${customKey ? '(Custom Tenant)' : '(Global Env)'}: ${activeKey.substring(0, 12)}...`);

      const openaiMessages = [
        { role: 'system', content: captuContext },
        ...messages.map((msg: Message) => ({ role: msg.role, content: msg.content }))
      ];

      const makeOpenAICall = async (msgs: any[]) => axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: msgs,
          max_tokens: 2048,
          temperature: 0.7,
          tools: CAPTU_TOOLS,
          tool_choice: "auto"
        },
        {
          headers: {
            'Authorization': `Bearer ${activeKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let response = await makeOpenAICall(openaiMessages);
      let responseMsg = response.data.choices?.[0]?.message;

      if (responseMsg?.tool_calls) {
        const { createClient } = await import('@supabase/supabase-js');
        const dbClient = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        const toolResults = await handleToolCalls(responseMsg.tool_calls, userId, dbClient);

        const updatedMessages = [
          ...openaiMessages,
          responseMsg,
          ...toolResults.map(r => ({
            role: 'tool',
            tool_call_id: r.callId,
            content: JSON.stringify(r.result)
          }))
        ];

        const finalRes = await makeOpenAICall(updatedMessages);
        responseMsg = finalRes.data.choices?.[0]?.message;
      }

      const text = responseMsg?.content || 'Ações executadas com sucesso.';
      return res.json({ reply: text, provider: 'openai' });
    }

    // ─── CLAUDE (ANTHROPIC) ───────────────────────────────────────────────────
    if (provider === 'claude') {
      const activeKey = customKey || ANTHROPIC_API_KEY;
      if (!activeKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada.' });

      const claudeMessages = messages.map((msg: Message) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          system: captuContext,
          messages: claudeMessages
        },
        {
          headers: {
            'x-api-key': activeKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      const text = response.data.content?.[0]?.text || 'Sem resposta.';
      return res.json({ reply: text, provider: 'claude' });
    }

    // ─── ELEVENLABS (Text to Speech) ──────────────────────────────────────────
    if (provider === 'elevenlabs') {
      const activeKey = customKey || ELEVENLABS_API_KEY;
      if (!activeKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY não configurada.' });

      // Para ElevenLabs, primeiro usamos Gemini para gerar o script e depois convertemos em áudio
      let scriptText = messages[messages.length - 1]?.content || '';

      // Se a mensagem for uma solicitação de criação, gera o script com Gemini
      const elevenLabsPrompt = `${captuContext}\n\nGere um script de áudio curto e profissional (máximo 200 palavras) para ser narrado. Escreva apenas o texto do script, sem formatação markdown, sem títulos. O texto deve ser natural para fala.`;

      if (GEMINI_API_KEY) {
        try {
          const scriptResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              contents: [{ role: 'user', parts: [{ text: scriptText }] }],
              systemInstruction: { parts: [{ text: elevenLabsPrompt }] },
              generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
            },
            { headers: { 'Content-Type': 'application/json' } }
          );
          scriptText = scriptResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || scriptText;
        } catch (geminiError) {
          console.warn('[ElevenLabs] Gemini text generation failed, falling back to raw text. Error:', geminiError);
        }
      }

      // Converter para áudio com ElevenLabs (Voz: Rachel - profissional e clara)
      const audioResponse = await axios.post(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        {
          text: scriptText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        },
        {
          headers: {
            'xi-api-key': activeKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer'
        }
      );

      const base64Audio = Buffer.from(audioResponse.data).toString('base64');
      return res.json({
        reply: `🔊 **Script de áudio gerado com sucesso!**\n\n_Texto narrado:_\n\n${scriptText}`,
        provider: 'elevenlabs',
        audio: `data:audio/mpeg;base64,${base64Audio}`,
        script: scriptText
      });
    }

    // ─── MANUS AI (Autonomous Agent) ──────────────────────────────────────────
    if (provider === 'manus') {
      const activeKey = customKey || MANUS_API_KEY;
      if (!activeKey) return res.status(500).json({ error: 'MANUS_API_KEY não configurada.' });

      // O Manus é um agente autônomo. Vamos enviar o histórico e o contexto.
      const lastMessage = messages[messages.length - 1]?.content || '';
      const prompt = `${captuContext}\n\nHistórico da conversa:\n${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}\n\nUsuário: ${lastMessage}`;

      console.log('[CAPTU AI] Iniciando tarefa no Manus AI...');

      try {
        // 1. Criar a Tarefa
        const createResponse = await axios.post(
          'https://api.manus.ai/v1/tasks',
          {
            prompt: prompt,
            agentProfile: 'manus-1.6',
            task_mode: 'agent',
            tools: CAPTU_TOOLS // Tenta passar as ferramentas do CAPTU
          },
          {
            headers: {
              'API_KEY': activeKey,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('[CAPTU AI] Resposta da criação no Manus:', JSON.stringify(createResponse.data));

        // Tentar extrair o ID de qualquer lugar possível na estrutura comum de APIs
        const taskId = createResponse.data.id || 
                       createResponse.data.taskId || 
                       createResponse.data.data?.id || 
                       createResponse.data.task_id;

        const taskUrl = createResponse.data.task_url || `https://manus.im/app/${taskId}`;

        if (!taskId) {
           console.error('[CAPTU AI] Resposta do Manus não contém ID:', createResponse.data);
           const apiError = createResponse.data.error || createResponse.data.message;
           throw new Error(apiError ? `Erro na API do Manus: ${apiError}` : 'Falha ao obter ID da tarefa do Manus. Estrutura de resposta inesperada.');
        }

        console.log(`[CAPTU AI] Tarefa ${taskId} criada no Manus. Aguardando conclusão...`);

        // 2. Polling (Aguardar conclusão)
        let status = 'pending';
        let result = null;
        let attempts = 0;
        const maxAttempts = 120; // ~6 minutos total (120 * 3s)

        while ((status === 'pending' || status === 'processing' || status === 'running') && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          attempts++;

          const statusResponse = await axios.get(
            `https://api.manus.ai/v1/tasks/${taskId}`,
            { headers: { 'API_KEY': activeKey } }
          );

          status = statusResponse.data.status;
          console.log(`[CAPTU AI] Status Manus (${taskId}): ${status} (Tentativa ${attempts})`);

          if (status === 'completed') {
            result = statusResponse.data.output || statusResponse.data.results;
            break;
          }

          if (status === 'failed' || status === 'error') {
            throw new Error(`A tarefa no Manus falhou com status: ${status}`);
          }
        }

        if (status !== 'completed') {
          return res.json({
            reply: `⏳ **O Manus AI ainda está processando sua solicitação.**\n\nDevido à complexidade da pesquisa, ele pode demorar alguns minutos. \n\nVocê pode acompanhar o progresso em tempo real aqui: [Abrir Tarefa no Manus](${taskUrl})\n\nTarefa ID: \`${taskId}\``,
            provider: 'manus'
          });
        }

        // Se o resultado for um objeto complexo, vamos tentar extrair o texto de forma inteligente
        let finalReply = '';
        
        if (typeof result === 'string') {
          finalReply = result;
        } else if (Array.isArray(result)) {
          // No Manus, o 'output' costuma ser uma lista de mensagens. 
          // Queremos a última mensagem do 'assistant'.
          const assistantMessages = result.filter((m: any) => m.role === 'assistant');
          if (assistantMessages.length > 0) {
            const lastMsg = assistantMessages[assistantMessages.length - 1];
            // O conteúdo pode ser um array (com type: output_text)
            if (Array.isArray(lastMsg.content)) {
              finalReply = lastMsg.content.map((c: any) => c.text || '').join('\n');
            } else {
              finalReply = lastMsg.content || '';
            }
          } else {
            // Fallback: se não achou assistant, mas tem mensagens, pega a última
            const lastMsg = result[result.length - 1];
            if (lastMsg && lastMsg.content) {
               finalReply = Array.isArray(lastMsg.content) ? lastMsg.content[0]?.text : lastMsg.content;
            }
          }
        }
        
        // Se ainda estiver vazio ou não for array, usa o stringify como último recurso
        if (!finalReply) {
          finalReply = JSON.stringify(result, null, 2);
        }

        return res.json({
          reply: finalReply || 'O Manus concluiu a tarefa, mas não retornou um conteúdo textual claro.',
          provider: 'manus'
        });

      } catch (manusError: any) {
        console.error('[CAPTU AI] Erro no Manus:', manusError.response?.data || manusError.message);
        throw new Error(`Erro na integração com Manus: ${manusError.response?.data?.message || manusError.message}`);
      }
    }

    // ─── PROVEDOR NÃO DISPONÍVEL ──────────────────────────────────────────────
    return res.json({
      reply: `⚠️ A integração com **${provider}** ainda não está disponível. Use **Gemini**, **OpenAI** ou **Claude** por enquanto.`,
      provider
    });

  } catch (error: any) {
    console.error('[CAPTU AI] Erro:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Falha ao obter resposta da IA.',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

export default router;
