---
title: "Estrategia Passo Identificacao"
date: 2026-03-13
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "EstratÃ©gia para adicionar um passo de "IdentificaÃ§Ã£o" antes do passo de "EndereÃ§o" no checkout, criando um fluxo de 4 estÃ¡gios."
tags: [antigravity, contexto, importado]
---
# Estratégia: Adição de Passo "Identificação" no Checkout

Para atender ao novo requisito, vamos reestruturar os passos do checkout para incluir a identificação como o primeiro estágio obrigatório.

## 1. Nova Estrutura de Passos (Progress Bar)
O checkout passará a ter 4 etapas bem definidas:
1. **Identificação**: Coleta de E-mail, Nome, CPF e Senha (para visitantes) ou confirmação de conta (para usuários logados).
2. **Endereço**: Seleção de endereço salvo ou preenchimento de novo CEP e frete.
3. **Pagamento**: Escolha da forma de pagamento e inserção de dados financeiros.
4. **Resumo**: Confirmação final dos itens e detalhes da compra.

## 2. Experiência em "Identificação" (Passo 1)
- **Visitante**: Verá o formulário completo (E-mail, Nome Completo, CPF, Senha) com o botão de "Já tenho conta" para abrir o modal.
- **Usuário Logado**: Verá uma mensagem de confirmação (ex: "Você está logado como [Nome]"), com opção de prosseguir ou trocar de conta. Se estiver logado, o sistema pode pular automaticamente para o passo 2 para agilizar.

## 3. Alterações Técnicas em `Checkout.tsx`
- **Atualização da constante `steps`**: Inserir o novo objeto no início e reajustar os IDs subsequentes.
- **Lógica de Navegação**:
    - `nextStep`: No passo 1, validar apenas os campos de identificação.
    - No passo 2, validar apenas o endereço e frete.
- **Refatoração da UI**:
    - Isolar o bloco de `Identificação` no `step === 1`.
    - Mover o bloco de `Endereço` para o `step === 2`.

## 4. Benefícios
- **Clareza**: O usuário entende exatamente em qual fase da compra está.
- **Foco**: Remove a poluição visual de ter dados pessoais e endereço na mesma tela.
- **Padrão de Mercado**: Segue o fluxo de grandes plataformas como Hotmart e Amazon.

---

**Posso prosseguir com a reestruturação dos passos do checkout?**
Assim que autorizado, aplicarei as mudanças para refletir os 4 estágios.
