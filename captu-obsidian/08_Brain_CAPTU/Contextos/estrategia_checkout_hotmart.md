---
title: "Estrategia Checkout Hotmart"
date: 2026-03-13
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "EstratÃ©gia para simplificar o login no checkout inspirada no fluxo da Hotmart. O foco Ã© permitir o acesso total ao checkout para visitantes, oferecendo um botÃ£o de login rÃ¡pido em modal para usuÃ¡rios jÃ¡ cadastrados."
tags: [antigravity, contexto, importado]
---
# Nova Estratégia de Checkout "Hotmart Style" - Eleven Auto Parts

Para replicar a facilidade do checkout da Hotmart, vamos permitir que o usuário preencha todos os dados de envio e pagamento sem ser forçado a logar antes. O login será uma opção de conveniência, não um bloqueio.

## 1. Experiência do Usuário (UX)

### Fluxo de Checkout para Visitantes:
1. **Acesso Direto**: A página `/checkout` abrirá normalmente para usuários não logados.
2. **Dados Pessoais Integrados**: O primeiro passo do checkout exibirá campos de **E-mail**, **Nome Completo**, **CPF** e **Telefone**.
3. **Botão "Fazer Login"**: Exibiremos um botão discreto (ex: "Já tem conta? Fazer login") que abrirá um **Modal de Login** sem tirar o usuário da página.
4. **Resumo Visual**: O usuário vê o produto e o valor enquanto preenche seus dados, mantendo o foco na conclusão da compra.

## 2. Implementação Técnica

### Componente `LoginModal`
- Criaremos um componente de modal reutilizável em `frontend/src/components/auth/LoginModal.tsx`.
- Esse modal conterá o formulário de login (e-mail/senha) e botões de login social (Google).
- Após o login bem-sucedido, o modal se fecha e o `AuthContext` atualiza o estado global, o que fará o `Checkout.tsx` carregar os endereços salvos automaticamente.

### Alterações no `Checkout.tsx`
- **Remover Redirecionamento**: Retirar o bloqueio de `!user`.
- **Formulário Dinâmico**:
    - Se `!user`: Mostrar campos de cadastro (E-mail, CPF, Nome).
    - Se `user`: Mostrar boas-vindas e seleção de endereços salvos.
- **Criação de Conta no "Checkout"**:
    - Ao clicar em finalizar pedido, se o usuário não estiver logado, realizaremos o `signUp` no Supabase em segundo plano ou usaremos um fluxo de `signInWithOtp` para validar o e-mail e criar a conta simultaneamente.

## 3. Benefícios
- **Redução Radical de Cliques**: Menos telas entre o carrinho e o pagamento.
- **Familiaridade**: Copia um modelo de sucesso (Hotmart/Eduzz) que os usuários já conhecem.
- **Flexibilidade**: Atende tanto o cliente que quer comprar rápido quanto o que quer usar seus dados salvos.

---

**Posso prosseguir com a criação do `LoginModal.tsx` e a atualização do `Checkout.tsx` para este novo formato?**
