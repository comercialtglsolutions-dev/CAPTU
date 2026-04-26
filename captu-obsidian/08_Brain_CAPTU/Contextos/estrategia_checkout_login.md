---
title: "Estrategia Checkout Login"
date: 2026-03-13
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "EstratÃ©gia para simplificar o processo de login durante o checkout na Eleven Auto Parts. O plano foca em remover a obrigatoriedade de login prÃ©vio e integrar a identificaÃ§Ã£o rÃ¡pida (OTP) diretamente no fluxo de compra."
tags: [antigravity, contexto, importado]
---
# Estratégia de Simplificação de Login no Checkout - Eleven Auto Parts

Para melhorar a conversão e reduzir o abandono de carrinho, propomos transformar o login em um processo integrado e fluido dentro do Checkout.

## 1. Mudança de Paradigma: "Identificar para Comprar"
Atualmente, o checkout é bloqueado se o usuário não estiver logado. Vamos mudar para um fluxo onde o usuário se identifica **durante** o checkout.

### Fluxo Proposto (Passo a Passo):
1. **Passo 0: Identificação (Apenas se não logado)**
   - Campo único: **E-mail**.
   - Ao digitar o e-mail, o sistema verifica se o usuário já existe.
   - **Se existe**: Solicita o código de acesso rápido (OTP - 6 dígitos) enviado por e-mail ou uma senha simplificada.
   - **Se não existe**: Solicita apenas os dados básicos obrigatórios (**Nome Completo e CPF**) e prossegue para o endereço.

2. **Integração com Supabase OTP**
   - Utilizar o `auth.signInWithOtp` do Supabase. Isso elimina a necessidade de o usuário lembrar senhas complexas durante a compra.
   - O usuário recebe um código de 6 dígitos e pronto, já está "dentro".

## 2. Alterações Técnicas

### Frontend (`frontend/src/pages/Checkout.tsx`)
- Remover o bloqueio `if (!user) return null`.
- Implementar um componente `CheckoutAuth` que gerencia a identificação inicial.
- Ajustar os hooks `useAddresses` e `useOrders` para lidarem com o estado de transição (usuário sendo criado/logado na hora).

### Hooks e Contexto (`frontend/src/contexts/AuthContext.tsx`)
- Adicionar suporte explicitamente para login via OTP se ainda não houver.

### Backend
- O sistema já possui integração com Bling e Stripe. A criação do pedido deve garantir que, mesmo se o usuário for recém-criado, os dados de CPF e Nome de perfil fluam corretamente para a Nota Fiscal.

## 3. Benefícios
- **Menor Atrito**: O usuário não precisa sair da página de checkout para logar ou registrar.
- **Velocidade**: Login por código é mais rápido em dispositivos móveis.
- **Conversão**: Menos cliques até o botão "Finalizar Pedido".

---

**Você autoriza prosseguirmos com a implementação desta estratégia?**
Se sim, começarei modificando a estrutura do `Checkout.tsx`.
