import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { EmbeddingService } from '../services/embeddings.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// Upload de Documento (PDF, TXT, DOCX)
router.post('/upload', upload.single('file'), async (req, res) => {
  const { userId } = req.body;
  const file = req.file;

  if (!userId || !file) return res.status(400).json({ error: 'UserID and File are required' });

  try {
    let textContent = '';
    const fileName = file.originalname;
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mime = file.mimetype;

    if (mime === 'application/pdf' || extension === 'pdf') {
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      textContent = result.text;
      await parser.destroy();
    } else if (extension === 'docx' || mime.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      textContent = result.value;
    } else if (mime === 'text/plain' || extension === 'txt') {
      textContent = file.buffer.toString('utf-8');
    } else {
      console.warn(`[Context] Unsuported format: MIME=${mime}, Ext=${extension}`);
      return res.status(400).json({ error: 'Formato não suportado. Use PDF, DOCX ou TXT.' });
    }

    if (!textContent.trim()) {
      return res.status(400).json({ error: 'O arquivo parece estar vazio ou não pôde ser lido.' });
    }

    const { data: inserted, error } = await supabase.from('tenant_context').insert({
      user_id: userId,
      type: 'file',
      name: fileName,
      content: textContent,
      source_url: null
    }).select().single();

    if (error) throw error;

    // ─── VETORIZAÇÃO RAG (ASSÍNCRONA) ───
    if (inserted) {
      EmbeddingService.vectorizeContext(userId, inserted.id, textContent, fileName)
        .catch(e => console.error('[RAG] Erro no upload:', e.message));
    }

    res.json({ success: true, id: inserted?.id });
  } catch (e: any) {
    console.error('[Context] Erro no upload:', e.message);
    res.status(500).json({ error: 'Falha ao processar arquivo: ' + e.message });
  }
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
    const { load } = await import('cheerio');
    const $ = load(html);

    // Remover elementos irrelevantes para o contexto da IA
    $('script, style, nav, footer, header, noscript, svg, i, button, link, meta').remove();
    
    // Tenta focar no conteúdo principal se existir, senão pega o body
    const mainContent = $('main, #content, .content, article').text() || $('body').text();
    
    const textContent = mainContent
      .replace(/\s+/g, ' ')
      .trim();
                            
    const { data: inserted, error } = await supabase.from('tenant_context').insert({
      user_id: userId,
      type: 'url',
      name: name || url.replace(/^https?:\/\//, '').split('/')[0],
      content: textContent.substring(0, 40000), // Captura até 40k caracteres
      source_url: url
    }).select().single();

    if (error) throw error;

    // ─── VETORIZAÇÃO RAG (ASSÍNCRONA) ───
    if (inserted) {
      EmbeddingService.vectorizeContext(userId, inserted.id, textContent, inserted.name)
        .catch(e => console.error('[RAG] Erro na URL:', e.message));
    }

    res.json({ success: true, id: inserted?.id });
  } catch (e: any) { 
    console.error('[Context] Erro ao processar URL:', e.message);
    res.status(500).json({ error: 'Falha ao processar URL: ' + e.message }); 
  }
});

// Adicionar contexto via Texto/Arquivo (Manual)
router.post('/add-text', async (req, res) => {
  const { userId, name, content, type = 'text' } = req.body;
  if (!userId || !content) return res.status(400).json({ error: 'UserID and Content are required' });

  const { data: inserted, error } = await supabase.from('tenant_context').insert({
    user_id: userId,
    type: type, // 'file', 'text' ou 'persona'
    name: name || 'Nota Estratégica',
    content: content
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // ─── VETORIZAÇÃO RAG (ASSÍNCRONA) ───
  if (inserted) {
    EmbeddingService.vectorizeContext(userId, inserted.id, content, inserted.name)
      .catch(e => console.error('[RAG] Erro no texto:', e.message));
  }

  res.json({ success: true, id: inserted?.id });
});

// Deletar contexto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('tenant_context').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
