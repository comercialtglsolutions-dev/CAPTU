import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. REGISTRAR EXPERIÊNCIA (O CADERNINHO)
router.post('/log', async (req, res) => {
  const { userId, type, action_description, outcome, feedback_note, metadata } = req.body;

  if (!userId || !type || !outcome) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { error } = await supabase.from('agent_experience').insert({
      user_id: userId,
      type,
      action_description,
      outcome,
      feedback_note,
      metadata: metadata || {}
    });

    if (error) throw error;
    res.json({ success: true, message: 'Experiência registrada com sucesso.' });
  } catch (error: any) {
    console.error('[Experience] Error logging:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. FUNÇÃO CENTRAL DE DESTILAÇÃO (Pode ser chamada via Rota ou Automaticamente)
export async function distillExperience(userId: string) {
  try {
    const { data: experiences, error } = await supabase
      .from('agent_experience')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!experiences || experiences.length < 1) {
      return { skip: true, message: 'Dados insuficientes.' };
    }

    const dataSummary = experiences.map(exp => 
      `[RESULTADO: ${exp.outcome.toUpperCase()}] Ação: ${exp.action_description}. Feedback: ${exp.feedback_note || 'N/A'}`
    ).join('\n');

    const prompt = `Analise os logs de prospecção e extraia UMA instrução de sucesso curta (Apenas 1 frase).
    Logs:
    ${dataSummary}
    
    Responda apenas com a instrução de comando.`;

    let patternNote = '';
    let usedProvider = '';

    // TENTATIVA 1: GEMINI (ALTA PERFORMANCE)
    try {
      if (process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        patternNote = result.response.text().trim();
        usedProvider = 'Gemini';
      }
    } catch (e: any) {
      console.warn(`[Experience] Gemini Falhou (${e.message}). Tentando OpenAI Fallback...`);
    }

    // TENTATIVA 2: OPENAI (FALLBACK ROBUSTO)
    if (!patternNote && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content: "Você é um analista de vendas B2B experiente." }, { role: "user", content: prompt }],
          model: "gpt-4o-mini",
        });
        patternNote = completion.choices[0].message.content?.trim() || '';
        usedProvider = 'OpenAI';
      } catch (e: any) {
        console.error(`[Experience] OpenAI Falhou também:`, e.message);
      }
    }

    if (!patternNote) throw new Error('Nenhum provedor de IA disponível ou com cota.');

    // Salvar o novo padrão na Base de Conhecimento (tenant_context)
    const { error: contextError } = await supabase.from('tenant_context').insert({
      user_id: userId,
      type: 'pattern',
      name: `Aprendizado Automático - ${new Date().toLocaleDateString('pt-BR')}`,
      content: patternNote
    });

    if (contextError) throw contextError;

    // --- NOVA LÓGICA: SALVAR NO OBSIDIAN AUTOMATICAMENTE ---
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      // __dirname é backend/src/routes, voltamos 3 níveis até CAPTU/captu-obsidian
      const obsidianDir = path.resolve(__dirname, '../../../captu-obsidian/03_Operacional');
      
      if (!fs.existsSync(obsidianDir)) {
        fs.mkdirSync(obsidianDir, { recursive: true });
      }

      // Cria um nome de arquivo único para não sobrescrever estratégias passadas
      const fileName = `Estrategia_${Date.now()}.md`;
      const filePath = path.join(obsidianDir, fileName);
      const mdContent = `---
categoria: "Operacional"
tags: [autonomo, IA, aprendizado]
---

# Padrão Identificado (${new Date().toLocaleDateString('pt-BR')})

> **Descoberta Autônoma da IA (Auto-Aprendizado):**
${patternNote}
`;
      fs.writeFileSync(filePath, mdContent, 'utf8');
      console.log(`[Obsidian] Novo padrão estratégico salvo em: ${fileName}`);
    } catch(err: any) {
      console.error('[Obsidian Autonomous] Erro ao gravar arquivo no Vault:', err.message);
    }
    // --------------------------------------------------------
    return { success: true, pattern: patternNote, provider: usedProvider };

  } catch (error: any) {
    console.error('[Experience] Error distilling:', error.message);
    throw error;
  }
}

const PASTAS_OBSIDIAN: Record<string, string> = {
  "Todas": "00_Dashboard",
  "Cultura e Marca": "01_Cultura_e_Marca",
  "Comportamento Humano": "02_Comportamento_Humano",
  "Operacional": "03_Operacional",
  "Produto Técnico": "04_Produto_Tecnico",
  "Inteligência de Mercado": "05_Inteligencia_de_Mercado",
  "Compliance": "06_Compliance",
  "Troubleshooting": "07_Troubleshooting"
};

export async function syncVaultRAG(userId: string) {
  try {
    const { data: contexts, error } = await supabase.from('tenant_context').select('*').eq('user_id', userId);
    if (error) throw error;
    if (!contexts || contexts.length === 0) return { skipped: true };

    const grouped: Record<string, any[]> = {};
    for (const ctx of contexts) {
      const cat = ctx.categoria || 'Operacional';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ctx);
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const baseObsidianDir = path.resolve(__dirname, '../../../captu-obsidian');

    let processedCount = 0;

    for (const [categoria, itens] of Object.entries(grouped)) {
      const folderName = PASTAS_OBSIDIAN[categoria] || "03_Operacional";
      const obsidianDir = path.join(baseObsidianDir, folderName);
      if (!fs.existsSync(obsidianDir)) fs.mkdirSync(obsidianDir, { recursive: true });

      const combinedText = itens.map(i => `[Fonte: ${i.name}] - ${i.content ? i.content.substring(0, 1500) : ''}`).join('\n\n');

      const fileName = `Matriz_${categoria.replace(/ /g, '_')}.md`;
      const filePath = path.join(obsidianDir, fileName);
      
      let currentContent = '';
      if (fs.existsSync(filePath)) {
        currentContent = fs.readFileSync(filePath, 'utf8');
      }

      let prompt = '';
      if (currentContent) {
        prompt = `Aja como o "Obsidian Manager" estratégico do projeto B2B. Sua missão é APRIMORAR E REESCREVER a nota Mestre da categoria '${categoria}'.
        
        [DOCUMENTO ATUAL (Mestre)]:
        ${currentContent}
        
        [NOVOS INSIGHTS BRUTOS (Filtro RAG)]:
        ${combinedText}

        INSTRUÇÃO:
        Incorpore todas as regras, táticas e lógicas adicionais presentes nos 'Novos Insights' de forma harmoniosa no 'Documento Atual'.
        Evolua o documento. Se os novos insights forem repetitivos em relação ao que já existe, ignore-os. Se trouxerem ângulos novos, adicione.
        Retorne a nota inteira (MarkDown completo), incluindo melhorias nos blockquotes e listas. Seja profundo.`;
      } else {
        prompt = `Aja como o "Obsidian Manager" estratégico do projeto B2B. Crie uma nota Mestre Inicial utilizando contextos brutos da categoria '${categoria}'.
        Conteúdos reais RAG mapeados:
        ${combinedText}

        Instruções Operacionais:
        Extrapole e destile TODAS as regras, insights, processos e táticas viáveis desses conteúdos.
        Transforme-as em um Markdown bem formatado. Aplique blockquotes para teorias centrais e use bullets detalhados.`;
      }

      let generatedMd = '';
      try {
        if (process.env.GEMINI_API_KEY) {
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const result = await model.generateContent(prompt);
          generatedMd = result.response.text().trim();
        } else if (process.env.OPENAI_API_KEY) {
           const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "Você é um Evoluidor de Conhecimento (Evergreen Notes)" }, { role: "user", content: prompt }],
            model: "gpt-4o-mini",
          });
          generatedMd = completion.choices[0].message.content?.trim() || '';
        }
      } catch (aiErr: any) {
        console.warn(`[VaultSync] Falha ao processar categoria ${categoria}:`, aiErr.message);
        continue;
      }

      if (generatedMd) {
        // Se a IA não retornou yaml no começo, nós garantimos que tenha.
        let finalContent = generatedMd;
        if (!finalContent.startsWith('---')) {
          finalContent = `---
categoria: "${categoria}"
tags: [RAG, evergreen, matriz]
ultima_atualizacao: "${new Date().toISOString()}"
---

${generatedMd}`;
        }
        
        fs.writeFileSync(filePath, finalContent, 'utf8');
        processedCount++;
      }
    }
    
    return { success: true, processedCategories: processedCount };
  } catch (error: any) {
    console.error('[VaultSync] Error:', error);
    return { error: error.message };
  }
}

// ROTA MANUAL DE DESTILAÇÃO E RAG SYNC
router.post('/distill', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'UserID is required' });

  try {
    const distillResult = await distillExperience(userId);
    const ragSyncResult = await syncVaultRAG(userId);
    
    res.json({ success: true, distillResult, ragSyncResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
