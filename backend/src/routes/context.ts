import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Listar contextos do usuário
router.get('/list/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('tenant_context')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Adicionar contexto via URL
router.post('/add-url', async (req, res) => {
  const { userId, url, name } = req.body;
  if (!userId || !url) return res.status(400).json({ error: 'UserID and URL are required' });

  try {
    console.log(`[Context] Scraping URL: ${url}`);
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CAPTU-AI/1.0' }
    });
    
    const html = response.data;
    // Limpeza básica de HTML para extrair texto útil para a IA
    const textContent = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, '')
      .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gm, '')
      .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gm, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
                            
    const { error } = await supabase.from('tenant_context').insert({
      user_id: userId,
      type: 'url',
      name: name || url.replace(/^https?:\/\//, '').split('/')[0],
      content: textContent.substring(0, 30000), // Captura até 30k caracteres
      source_url: url
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) { 
    console.error('[Context] Erro ao processar URL:', e.message);
    res.status(500).json({ error: 'Falha ao processar URL: ' + e.message }); 
  }
});

// Adicionar contexto via Texto/Arquivo
router.post('/add-text', async (req, res) => {
  const { userId, name, content, type = 'text' } = req.body;
  if (!userId || !content) return res.status(400).json({ error: 'UserID and Content are required' });

  const { error } = await supabase.from('tenant_context').insert({
    user_id: userId,
    type: type, // 'file', 'text' ou 'persona'
    name: name || 'Nota Estratégica',
    content: content
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Deletar contexto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('tenant_context').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
