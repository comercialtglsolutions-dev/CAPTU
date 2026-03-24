import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * SERVIÇO DE RAG (Embeddings e Chunking)
 */
export class EmbeddingService {
  
  /**
   * FATIAR TEXTO (Chunking) para o RAG
   * Segue o padrão de ~500-800 caracteres com overlap de 10%
   */
  static chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      const end = start + chunkSize;
      chunks.push(text.slice(start, end));
      start = end - overlap;
      if (start < 0) start = 0;
      if (end >= text.length) break;
    }
    
    return chunks;
  }

  /**
   * GERAR VETOR DE SIGNIFICADO (Embedding de 768 dimensões)
   */
  static async getEmbedding(text: string): Promise<number[]> {
    // TENTATIVA 1: GEMINI (768 dimensões nativas)
    try {
      if (process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        if (result.embedding.values.length > 0) {
          console.log('[RAG] Vetor gerado com sucesso via Gemini.');
          return result.embedding.values;
        }
      }
    } catch (e: any) {
      console.warn(`[RAG] Gemini Falhou (${e.message}). Tentando OpenAI...`);
    }

    // TENTATIVA 2: OPENAI (Fallback Híbrido)
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
          dimensions: 768
        });
        if (response.data[0].embedding.length > 0) {
          console.log('[RAG] Vetor gerado com sucesso via OpenAI!');
          return response.data[0].embedding;
        }
      } catch (e: any) {
        console.error('[RAG] OpenAI Falhou também:', e.message);
      }
    }

    throw new Error('Nenhum provedor de embedding disponível ou ativo.');
  }

  /**
   * VETORIZAR UM DOCUMENTO INTEIRO (Fatiar e Salvar no Supabase)
   */
  static async vectorizeContext(userId: string, contextId: string, content: string, sourceName: string) {
    console.log(`[RAG] Iniciando vetorização de "${sourceName}" para usuário ${userId}...`);
    
    const chunks = this.chunkText(content);
    console.log(`[RAG] Documento fatiado em ${chunks.length} partes.`);

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkContent = chunks[i];
        const embedding = await this.getEmbedding(chunkContent);
        
        const { error } = await supabase.from('knowledge_chunks').insert({
          user_id: userId,
          context_id: contextId,
          content: chunkContent,
          embedding,
          metadata: {
            source: sourceName,
            chunk_index: i,
            total_chunks: chunks.length
          }
        });

        if (error) throw error;
      } catch (err: any) {
        console.error(`[RAG] Erro ao salvar fatia ${i}:`, err.message);
      }
    }

    console.log(`[RAG] Sucesso! Documento "${sourceName}" agora é parte da memória semântica.`);
  }

  /**
   * BUSCA SEMÂNTICA (O Coração da IA Inteligente)
   */
  static async searchKnowledge(userId: string, query: string, matchCount = 4) {
    try {
      const embedding = await this.getEmbedding(query);
      
      const { data, error } = await supabase.rpc('match_chunks', {
        query_embedding: embedding,
        match_threshold: 0.5, // Nível de similaridade mínima
        match_count: matchCount,
        p_user_id: userId
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('[RAG] Erro na busca semântica:', err.message);
      return [];
    }
  }
}
