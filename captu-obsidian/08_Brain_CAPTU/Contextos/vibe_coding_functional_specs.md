---
title: "Vibe Coding Functional Specs"
date: 2026-03-21
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "DescriÃ§Ã£o detalhada de todas as funÃ§Ãµes e processos do Agente de Vibe Coding da CAPTU. 
Este documento desmiÃºÃ§a as capacidades de leitura, escrita, execuÃ§Ã£o de terminal, busca na web e rastreamento de raciocÃ­nio da IA, servindo como base tÃ©cnica para a implementaÃ§Ã£o."
tags: [antigravity, contexto, importado]
---
# Detalhamento de Funções: Agente de Vibe Coding CAPTU

Este documento descreve cada função técnica e processo que compõe a estratégia de desenvolvimento autônomo e transparente dentro da plataforma CAPTU.

## 1. Ferramentas do Agente (Capabilities)

Para atuar como um desenvolvedor profissional, a IA terá acesso às seguintes funções de sistema:

| Função | Descrição | Objetivo |
| :--- | :--- | :--- |
| **`read_project_tree`** | Lê a estrutura de pastas e arquivos do projeto. | Entender a arquitetura (onde ficam componentes, hooks, rotas). |
| **`read_code_content`** | Lê o conteúdo exato de um arquivo específico. | Analisar padrões de código, imports e lógicas existentes. |
| **`write_code`** | Cria novos arquivos ou edita arquivos existentes. | Implementar novas interfaces, lógicas de backend e rotas. |
| **`execute_terminal`** | Roda comandos de shell (`npm`, `npx`, `git`, `lint`). | Instalar pacotes, adicionar componentes Shadcn, rodar builds. |
| **`db_inspector`** | Acessa e analisa o schema do banco de dados (Prisma/SQL). | Sugerir alterações no banco e validar fluxos de dados. |
| **`web_crawler`** | Realiza buscas no Google/Documentações em tempo real. | Encontrar exemplos de código modernos e resolver erros de build. |
| **`emit_step_trace`** | Envia uma mensagem de status para a interface do chat. | Manter o usuário informado sobre o que a IA está "pensando" ou fazendo. |

## 2. Processos Autônomos (The "Vibe" Loop)

O desenvolvimento autônomo seguirá este fluxo lógico:

### I. Fase de Contextualização (Awareness)
Toda solicitação do usuário ativa um crawler de contexto. A IA não "chuta" o código; ela primeiro lê os arquivos relacionados à tarefa para garantir que o novo código siga o mesmo estilo e arquitetura do projeto CAPTU.

### II. Planejamento Transparente (Reasoning)
Antes de agir, a IA gera um plano interno. Esse plano é fatiado em "Steps". Cada vez que um step é iniciado, a função `emit_step_trace` atualiza sua interface de chat com uma animação (ex: "Analisando dependências...").

### III. Ciclo de Execução e Erro (Self-Correction)
Se a IA rodar um comando e o terminal retornar erro, ela:
1.  Lê o log de erro do terminal automaticamente.
2.  Busca a solução na Web ou no código existente.
3.  Aplica o fix e roda o comando novamente.
4.  **Tudo isso sem o usuário precisar intervir.**

### IV. Validação Técnica (Quality Assurance)
Ao finalizar a escrita do código, a IA executa comandos de validação (`npm run build` ou `lint`) em background para garantir que a plataforma CAPTU continue estável após as alterações.

---

## 3. Infraestrutura de Comunicação

- **Agente Backend**: Um serviço centralizado que recebe as ordens do LLM e possui as permissões de leitura/escrita no disco.
- **Canal Duplex (Streaming)**: Uso de Server-Sent Events (SSE) para que, enquanto a IA "pensa" e executa no servidor, os passos apareçam instantaneamente no seu chat, garantindo a transparência total.
- **Neural Library (Padrões)**: Um pequeno cache de padrões onde a IA anota coisas como: "O usuário prefere cores da escala Slate", "Todos os formulários usam Zod para validação".

---

**Esta descrição detalhada cobre todos os pontos que você esperava?**
Se sim, estamos prontos para iniciar a construção do **Agente Backend (Fase 1)**.
