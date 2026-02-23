// Centralização de configurações e credenciais do projeto

// API_URL aponta para o backend:
// - Em desenvolvimento local: lê VITE_API_URL do .env (ex: http://localhost:3000)
// - Em produção (Vercel): usa VITE_API_URL configurado nas env vars da Vercel
//   (ex: https://captu-jqjg.vercel.app)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// As credenciais do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
// são lidas diretamente no arquivo de inicialização do cliente Supabase,
// localizado em 'src/integrations/supabase/client.ts'.
