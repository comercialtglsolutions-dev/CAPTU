import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

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
    return { success: true, pattern: patternNote, provider: usedProvider };

  } catch (error: any) {
    console.error('[Experience] Error distilling:', error.message);
    throw error;
  }
}

// ROTA MANUAL DE DESTILAÇÃO (O "Sincronizar Agora" da UI)
router.post('/distill', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'UserID is required' });

  try {
    const result = await distillExperience(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
