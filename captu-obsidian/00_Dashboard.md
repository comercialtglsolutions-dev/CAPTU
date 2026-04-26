---
tags: [dashboard, captu, ia, obsidian]
aliases: [Home, CAPTU Brain]
---

# 🧠 Cérebro CAPTU - Central de Inteligência

Bem-vindo ao **Cérebro CAPTU**, o Vault personalizado criado para integrar os contextos de negócios, operacionais e humanos da plataforma com a memória da Inteligência Artificial (Claude / Qwen).

## 🚀 Objetivo
Servir como o *Second Brain* da Plataforma CAPTU. Todas as interações, aprendizados e diretrizes inseridos aqui são lidos pela IA e utilizados para melhorar prospecção B2B (SDR), personalizar campanhas e adaptar o tom de voz.

## 📂 Categorias de Contexto

A IA categoriza os conhecimentos absorvidos no banco de dados e neste Vault conforme abaixo:

- [[01_Cultura_e_Marca/Cultura_e_Marca_Index|🎭 Cultura e Marca]]: Identidade TGL Solutions, manifesto, voz e tom.
- [[02_Comportamento_Humano/Comportamento_Humano_Index|🧠 Comportamento Humano]]: Entendimento profundo de dores, gatilhos e psicologia B2B.
- [[03_Operacional/Operacional_Index|⚙️ Operacional]]: Processos de SDR, rotinas de vendas e playbooks.
- [[04_Produto_Tecnico/Produto_Tecnico_Index|💻 Produto Técnico]]: Arquitetura do CAPTU, features, integrações.
- [[05_Inteligencia_de_Mercado/Mercado_Index|📊 Inteligência de Mercado]]: Concorrência, nichos, ICP.
- [[06_Compliance/Compliance_Index|⚖️ Compliance]]: Regras de LGPD, limites de atuação da IA.
- [[07_Troubleshooting/Troubleshooting_Index|🔧 Troubleshooting]]: Padrões de erros conhecidos e resoluções.
- [[08_Brain_CAPTU/Contextos/|🧠 Brain CAPTU]]: Memória de longo prazo, estratégias e contextos importados.

## 🔄 Como o fluxo funciona:
1. **Upload de Documento no App**: Usuário faz o upload de PDF/DOCX (ex: `contextos-humanos-para-ai.pdf`).
2. **Vetorização RAG**: O backend (`context.ts`) cria vetores e salva no Supabase (`tenant_context`).
3. **Sincronização Vault**: O conteúdo destilado e regras centrais devem ser trazidos para este Vault, onde o desenvolvedor ou o próprio Claude organizam o raciocínio.
4. **Agentes Claude**: O agente lê este Vault localmente e aplica nas campanhas automatizadas e chat de suporte.

---

> **Nota para a IA (Claude)**: Ao criar ou editar notas neste Vault, sempre utilize o padrão de propriedades (frontmatter YAML) e mantenha links bidirecionais ativos para construir o gráfico de conhecimento (Knowledge Graph).
