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
   * AUTOCLASSIFICAÇÃO via LLM
   */
  static async autoCategorize(text: string): Promise<{ categoria: string; peso_prioridade: number }> {
    const defaultResult = { categoria: "Operacional", peso_prioridade: 3 };
    const classes = [
      "Comportamento Humano", "Cultura e Marca", "Operacional", 
      "Produto Técnico", "Inteligência de Mercado", "Compliance", "Troubleshooting"
    ];
    
    // Pegamos muito mais texto (10.000 caracteres do miolo) para evitar ler só os menus/headers de sites
    const startIndex = text.length > 2000 ? 1000 : 0; // Pula os primeiros 1000 chars que costumam ser NavBar
    const sample = text.substring(startIndex, startIndex + 10000);

    const prompt = `Você é o Diretor de Conhecimento (RAG) da IA CAPTU.
Abaixo está um resumo do meio de um documento/site inserido no nosso cérebro.
Sua missão é ler o texto e deduzir o seu propósito real (focando no núcleo da mensagem, ignore menus, links e navegação de site).

Classifique o conteúdo em EXATAMENTE UMA destas categorias:
1. Comportamento Humano: Psicologia, tom de voz, timing, engajamento, microexpressões, neurociência.
2. Cultura e Marca: Missão da empresa, manifesto, estilo de escrita, como tratar haters.
3. Operacional: Playbooks de vendas, processos de SDR, como usar CRM, fluxos do dia a dia.
4. Produto Técnico: Documentação de API, features, integrações de software (N8N, Zapier).
5. Inteligência de Mercado: Personas, ICP, concorrentes, dores do mercado alvo.
6. Compliance: LGPD, regras de negócio inquebráveis, leis, política de descontos e tabelas de preço fixas.
7. Troubleshooting: Como resolver erros, FAQ de suporte, árvores de decisão.

Defina também um 'peso_prioridade' de 1 a 5.
- Peso 5: Regras fixas, Compliance, Leis, Política de Privacidade.
- Peso 4: Playbooks técnicos e Roteiros comerciais.
- Peso 3: Metodologias e conhecimentos gerais (Padrão).
- Peso 2 ou 1: Opiniões de blog, artigos inspiracionais, jargões soltos.

Responda APENAS em JSON válido, sem NENHUM texto extra:
{"categoria": "Nome da Categoria", "peso_prioridade": 3}

Texto Analisado:
${sample}`;

    let jsonText = '';

    // Utilizando APENAS a OpenAI (GPT-4o-mini) para categorização, conforme requisitado
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: prompt }]
        });
        jsonText = response.choices[0].message.content || '{}';
        console.log('[RAG] Autocategorizado via OpenAI com sucesso.');
      } catch (oErr: any) {
        console.warn(`[RAG] OpenAI falhou na autocategorização: ${oErr.message}.`);
      }
    } else {
      console.warn('[RAG] Chave da OpenAI não encontrada no .env para categorização.');
    }

    // PROCESSAMENTO DO RESULTADO
    try {
      if (jsonText) {
        const data = JSON.parse(jsonText);
        return {
          categoria: data.categoria && classes.includes(data.categoria) ? data.categoria : "Operacional",
          peso_prioridade: typeof data.peso_prioridade === 'number' ? data.peso_prioridade : 3
        };
      }
    } catch (parseErr: any) {
      console.warn('[RAG] Falha ao ler o JSON gerado pelo LLM:', parseErr.message, jsonText);
    }
    
    console.warn('[RAG] Usando categoria padrão.');
    return defaultResult;
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
  static async vectorizeContext(userId: string, contextId: string, content: string, sourceName: string, categoryInfo: {categoria: string, peso_prioridade: number}) {
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
            total_chunks: chunks.length,
            categoria: categoryInfo.categoria,
            peso_prioridade: categoryInfo.peso_prioridade
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
