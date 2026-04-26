---
title: "Estrategia Migracao Obsidian"
date: 2026-04-13
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "EstratÃ©gia para migraÃ§Ã£o de contextos do Antigravity para o Obsidian.
O plano envolve a extraÃ§Ã£o de documentos de estratÃ©gia e planos de implementaÃ§Ã£o gerados em sessÃµes anteriores e sua organizaÃ§Ã£o em uma nova pasta dentro do vault 'captu-obsidian'."
tags: [antigravity, contexto, importado]
---
# Estratégia de Migração: Banco de Dados Antigravity -> Obsidian

Este documento detalha o plano para centralizar todo o conhecimento acumulado pelo Antigravity (Knowledge Items e Artefatos de Contexto) no seu vault do Obsidian.

## 1. Origem dos Dados
Os dados estão localizados no diretório de dados do sistema:
`C:\Users\TGL Solutions\.gemini\antigravity`

Os "Contextos" relevantes incluem:
- **Artefatos de Estratégia**: Arquivos `.md` gerados em missões passadas (ex: estratégias de checkout, planos de Bluetooth, etc).
- **Metadados**: Arquivos `.metadata.json` que contêm resumos e datas de atualização.
- **Histórico de Conversas**: Sumários das sessões de desenvolvimento.

## 2. Estratégia de Organização no Obsidian
Criaremos uma nova estrutura dentro de `captu-obsidian/`:

```text
captu-obsidian/
├── 08_Brain_CAPTU/           <-- Nova pasta raiz para a inteligência da IA
│   ├── Contextos/             <-- Planos de implementação e estratégias
│   │   ├── [Categoria]/       <-- (Opcional) Agrupamento por tema
│   │   └── Note_Title.md      <-- Notas individuais com Frontmatter
│   └── Logs_Sessoes/          <-- Registro cronológico de conversas (se disponível)
```

## 3. Processo de Importação (Automação)
Para garantir que os dados sejam importados corretamente com organização, seguiremos estes passos:

1.  **Escaneamento**: Identificar todos os arquivos `.md` e `.json` nas pastas `brain/`.
2.  **Processamento de Metadados**:
    - Extrair o `summary` do JSON para usar como `abstract` no Obsidian.
    - Converter o `updatedAt` para o campo `date` no Frontmatter.
    - Identificar o `artifactType` para categorização.
3.  **Formatação para Obsidian**:
    - Adicionar propriedades YAML (Data, Tipo, Resumo, Projeto).
    - Limpar nomes de arquivos (Ex: `estrategia_checkout_hotmart` -> `Estratégia Checkout Hotmart`).
4.  **Transferência**: Mover/Copiar os arquivos processados para a pasta destino no vault.

## 4. Próximos Passos
1.  [ ] Validar a estrutura de pastas sugerida.
2.  [ ] Executar script de extração inicial (Vou gerar um script PowerShell para isso).
3.  [ ] Fazer o link das novas notas no seu `00_Dashboard.md` do Obsidian.

> [!IMPORTANT]
> A migração focará em arquivos legíveis (Markdown). Históricos binários (.pb) não serão importados diretamente, mas seus artefatos resultantes sim.

Você concorda com essa estrutura ou gostaria de mover os contextos para alguma das pastas existentes (01_Cultura, 04_Produto_Tecnico, etc)?
