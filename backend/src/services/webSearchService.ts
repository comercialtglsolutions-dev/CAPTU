import axios from 'axios';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

export class WebSearchService {
  /**
   * Realiza uma busca na web utilizando a API do Tavily.
   * Focado em buscar documentações, exemplos de código e soluções de erros.
   * @param query Termo de pesquisa (ex: 'shadcn data-table selection example')
   */
  static async search(query: string, maxResults: number = 5): Promise<any[]> {
    console.log(`[WebSearch] Pesquisando: ${query}`);
    
    if (!TAVILY_API_KEY || TAVILY_API_KEY.includes('...')) {
      console.warn('[WebSearch] TAVILY_API_KEY não configurada. Retornando vazio.');
      return [];
    }

    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: TAVILY_API_KEY,
        query: query,
        max_results: maxResults,
        search_depth: "advanced" // Profundidade maior para documentos técnicos
      });

      if (response.status === 200 && response.data.results) {
        return response.data.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          snippet: r.snippet || (r.content ? r.content.substring(0, 200) : '')
        }));
      }
      
      return [];
    } catch (error: any) {
      console.error('[WebSearch] Erro ao buscar no Tavily:', error.message);
      return [];
    }
  }
}
