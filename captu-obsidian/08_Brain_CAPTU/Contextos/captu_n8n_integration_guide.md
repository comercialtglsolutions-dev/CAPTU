---
title: "Captu N8n Integration Guide"
date: 2026-03-23
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "DocumentaÃ§Ã£o tÃ©cnica completa contendo as estratÃ©gias, tabelas de schema, inputs e outputs para a refatoraÃ§Ã£o e teste da automaÃ§Ã£o n8n para a plataforma CAPTU, focada no Manus AI corrigir o workflow e integrar via webhooks."
tags: [antigravity, contexto, importado]
---
# Documentação Técnica: Integração n8n <> CAPTU (Busca Avançada com IA)

Esta documentação fornece as diretrizes exatas para adaptar o workflow original do n8n em um motor de inteligência compatível com as regras de negócio e rotas de recebimento da plataforma **CAPTU**. 

---

## 1. Visão Geral da Arquitetura
A integração transformará o n8n em um motor de scraping de background (*Background Worker*). O fluxo não terá mais interface própria (*Form Trigger*) nem salvará respostas primárias em planilhas (*Google Sheets*). Tudo será orquestrado via APIs REST(Webhooks).

**Fluxo Ideal da Nova Arquitetura:**
1. A interface da **CAPTU** enviará as instruções e critérios de busca via `POST` para o **Webhook de Entrada do n8n**.
2. O **n8n** deve responder imediatamente com um *Status 200 OK* para liberar a tela de carregamento na CAPTU sem causar timeout.
3. O **n8n** vai iterar seus processos lentos em background: *Apify, LLM Agents, Tavily, LinkedIn Hunter*.
4. Para cada lead processado no loop (independentemente de achar email ou não), ao final de sua esteira, o **n8n** fará um `POST` HTTP para o **Webhook de Rota Interna da CAPTU**.
5. O Backend NodeJS da CAPTU salvará estes dados finais ativamente no Banco de Dados integrado.

---

## 2. Modificações no Gatilho (Input do n8n)

### A. Substituição do Trigger Atual
*   **Remover Nó:** *Form Trigger* (`On form submission`).
*   **Adicionar Nó:** *Webhook*.
    *   **Method:** `POST`
    *   **Respond:** `Immediately` _(Configuração crítica para não crachar a UX do CAPTU, impedindo timeouts no client HTTP. O Node de webhook já devolve resposta imediata, ativando as rotinas secundárias)._
    *   **Path:** Sugere-se `/captu-busca-ia`.

### B. Especificação de Mapeamento do Payload
A CAPTU injetará este contrato literal de JSON. **Todas as expressões da automação que apontavam para o antigo Form devem apontar para estas variáveis em `$json.body.[chave]`.**

**JSON Recebido pelo Webhook de Entrada (n8n):**
```json
{
  "tipo_estabelecimento": "Oficina Mecânica",
  "marca_segmento": "Toyota",
  "cargo_alvo": "Gerente de Pós-Vendas",
  "pais": "Brasil",
  "cidade_estado": "São Paulo, SP",
  "quantidade": 10
}
```

*   **Exemplificação Prática de Renomeação:**
    *Onde lia:* `$item("On form submission").$node["On form submission"].json["Quantidade"]`
    *Agora lerá:* `$json.body.quantidade` ou `{{ $json.body.quantidade }}`.

---

## 3. Disparo de Resultados (Output do n8n para CAPTU)

### A. Substituição Estrutural
Temos atualmente o fluxo sendo dividido por validações "If / Else" alimentando quatro nós idênticos de "Google Sheets". 

*   **Ação (Remover):** Exclua os quatro nós verdes de integração nativa do **Google Sheets**.
*   **Ação (Adicionar):** Centralize todas as ramificações finais em um/vários nós do tipo **HTTP Request**.
    *   **Method:** `POST`
    *   **URL Final Target:** `http://localhost:3000/api/leads/webhook-receive` (Ou URL interna/ngrok de túnel). *(Se o n8n rodar no mesmo host via Docker, pode usar `http://host.docker.internal:3000/api/leads/webhook-receive`)*.
    *   **Body Type:** `JSON` (enviar o payload do lead validado).

### B. Payload Final (Dados que o n8n DEVE enviar para a CAPTU)
Cada Lead enriquecido no fim do processamento do *Loop Over Items* lançará a requisição repassando rigorosamente esta estrutura. Se um dado não foi encontrado, evite strings com nomes falsos como "Não Encontrado", mas injete preferencialmente `null` ou strings de tamanho 0 `""` .

**Schema Base de Output (JSON Request Body do Webhook n8n -> CAPTU):**
```json
{
  "nome_empresa": "Mecânica Master LTDA",
  "categoria": "Oficina Mecânica",
  "segmento": "Toyota",
  "cargo_alvo": "Gerente de Pós-Vendas",
  "endereco": "Rua das Flores, 123",
  "bairro": "Centro",
  "rua": "Rua das Flores",
  "cidade": "São Paulo",
  "estado": "SP",
  "codigo_postal": "01000-000",
  "pais": "BR",
  "website": "https://mecanicamaster.com.br",
  "telefone": "11999999999",
  "nota_maps": 4.8,
  "reviews": 150,
  "link_maps": "https://maps.google.com/...",
  "nome_decisor": "João Silva",
  "linkedin_url": "https://linkedin.com/in/joaosilva",
  "email": "joao.silva@mecanicamaster.com.br",
  "status_email": "validado",
  "status_linkedin": "encontrado"
}
```

---

## 4. Guia de Teste (Como Manus AI deve Homologar)

A homologação da Inteligência Artificial ou Dev antes de ser atada à interface reativa final deve seguir este protocolo rigoroso de *sandbox*.

**Passo 1: Testar Recepção de Gatilho (Trigger Test)**
1. No n8n, ative o Botão de *Listen for Event* do nó Webhook de Teste.
2. Em um software como Postman ou via cURL, mande um `POST` local injetando o payload *JSON Recebido pelo Webhook de Entrada* diretamente na URL e garantindo que o cabeçalho seja `Content-Type: application/json`.
3. Confira se o Nó da Apify (Google Maps) absorveu a string de busca perfeitamente, interpolando a cidade, estado e modalidade. 

**Passo 2: Mapear Saída Temporária com Webhook de Debug**
1. Antes de criar a rota no backend nativo NodeJS da CAPTU, valide se o seu nó final "HTTP Request" no n8n está construindo e despachando os JSONs sem erro de formatação.
2. Crie um binário temporário no site [Webhook.site](https://webhook.site/) e ponha o link copiado dentro do `URL Final Target` do nó "HTTP Request" do painel N8n.
3. Ative o Workflow por Completo e atente para a interface do `Webhook.site`. Analise aba por aba se recebeu múltiplos disparos do seu Loop para os leads captados do Apify e tratados pelas ferramentas de LangChain/Hunter. 

**Passo 3: Verificação de "Erros Silenciosos" dos Agentes**
Verifique criticamente as portas Else (falsas) do workflow n8n.
No desenho original, haviam condições como *"Se o Email Não For Encontrado"*, etc. 
Reajuste essas portas de ramificação para dispararem o n8n em direção à ação centralizada do seu Node de *HTTP Request*, garantindo que `nome_decisor` falhos ou perfis vazios continuem respeitando a chave no JSON como `null`, não quebrando o tipo de contrato estabelecido. A CAPTU precisa ser populada, inclusive com as falhas enriquecidas, de forma persistente no banco de dados.
