---
categoria: "Operacional"
tags: [sdr, b2b, captu, inteligência]
peso_prioridade: 5
---

# Guia de Cadência SDR 

> [!abstract] Objetivo Operacional
> Traduzir os artefatos brutos `01_Funil_Vendas.csv` e `04_IA_Treinada.csv` numa lógica fluida de máquina de vendas para os Agentes IA da Plataforma CAPTU.

## A Matriz do Funil B2B

Para que a inteligência artificial assuma a prospecção ativa como SDR, o funil (*01_Funil_Vendas.csv*) deve rodar obedecendo ao fluxo:

1. **Step 1: Ponto de Contato Frio (Cold Outreach)**
   - **Gatilho da IA:** A IA (diretrizes de `04_IA_Treinada.csv`) constrói o primeiro email baseada no nicho da empresa prospectada.
   - **Regra de Ouro:** Aplique a regra de escuta ativa e prevenção de defensividade de [[Fundamentos_Decisao_B2B]] aqui. Menos de 15 palavras por frase. Sem apontar defeitos.

2. **Step 2: Follow-Up Nutritivo (Dia 3)**
   - **Gatilho da IA:** Envio focado em "dar valor" antes de pedir tempo.
   - **Critério Estratégico:** A IA deve mencionar uma dor específica do mercado que está mapeada nas estratégias de *crisisprevention.com* e *portaldacomunicacao.com.br*.

3. **Step 3: Quebra de Gelo Final / Despedida (Dia 7)**
   - **Gatilho da IA:** Se não houver retorno, aplicar a mensagem de arquivamento preservando a credibilidade institucional.

---

> **Aviso para Automação N8N/AIs:** Sempre cheque as tags e limites operacionais antes de escalar massivamente o volume do roteiro acima. Tudo neste documento é o "SDR Book" em formato de Grafo.
