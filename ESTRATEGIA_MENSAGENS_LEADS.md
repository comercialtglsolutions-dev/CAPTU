# Captu — Estratégia de Mensagens e Interação com Leads

> Data: 01/07/2026 · Baseado em auditoria do código (backend/src, automation-*.json, ChatPage)
> Objetivo: aumentar taxa de resposta e conversão dos leads prospectados, sem colocar o número de WhatsApp em risco.

---

## 1. Diagnóstico do que existe hoje

| Área | Estado atual | Avaliação |
|---|---|---|
| Envio WhatsApp | Evolution API (não oficial), envio manual + campanha n8n | Funciona, mas 100% do risco em 1 número |
| Campanhas | 1 disparo único, cron 1 min, delay aleatório **5–10s** | Delay curto demais = padrão de spam detectável |
| Copy | Gemini gera 1 mensagem fria por lead (score ≥ 60) | Bom, mas sem variação de sequência |
| **Inbound** | Webhook só invalida cache e faz broadcast | **Gap crítico: lead responde e ninguém responde** |
| Cadência | Não existe (track-send/track-reply existem, mas sem motor) | Follow-up é onde está a conversão |
| E-mail | Não integrado (sem SMTP/Resend/Brevo no código) | Canal barato e sem risco de ban, desperdiçado |
| Agente IA | GPT-4o com tools — mas para o **operador**, não para o lead | Base pronta para virar SDR IA |
| CRM | OAuth stubs HubSpot/Pipedrive/Salesforce | Parcial |

**Conclusão do diagnóstico:** o gargalo não é enviar mais mensagens — é o que acontece *depois* que o lead responde (nada) e *depois* que ele não responde (nada também).

---

## 2. Estratégia em 3 camadas

### Camada 1 — SDR IA no inbound (maior impacto, fazer primeiro)

O momento mais quente do funil é a resposta do lead, e hoje ele esfria esperando humano.

- No webhook `messages.upsert`, disparar agente IA (Claude/GPT) que responde em segundos.
- Roteiro de qualificação em 3 perguntas (dor → urgência → contexto/budget), espelhando o fluxo SDR IA já documentado no funil da TGL.
- Lead scoring atualizado pela conversa: quente → notifica humano (Slack/WhatsApp interno) + cria deal no CRM; morno → nutrição; frio → descarte educado.
- **Handoff obrigatório:** botão "assumir conversa" no ChatPage pausa a IA naquele JID. IA nunca negocia preço nem fecha.
- Simulação de digitação (presence `composing` da Evolution) + delay proporcional ao tamanho da resposta — humaniza e reduz padrão de bot.
- Fora do horário comercial: IA responde e agenda; registra para follow-up humano de manhã.

### Camada 2 — Motor de cadência multi-toque (conversão)

Campanha de 1 disparo desperdiça o custo de aquisição do lead.

- Estado por lead no Supabase: `cadence_step`, `next_touch_at`, `status` (active / replied / opted_out / exhausted).
- Sequência sugerida (para na primeira resposta — *stop-on-reply* usando o `track-reply` que já existe):
  - **D0** WhatsApp — abordagem atual (Gemini)
  - **D2** WhatsApp — ângulo diferente (prova social do nicho, não repetir oferta)
  - **D5** E-mail — case ou diagnóstico gratuito (canal novo, custo zero de ban)
  - **D9** WhatsApp — break-up message ("encerro por aqui?" — historicamente boa taxa de resposta)
- Worker de fila com janelas de envio (seg–sex, 8h30–18h) em vez de cron cego de 1 min.
- Opt-out automático: "sair"/"remover" marca `opted_out` e bloqueia a fila (LGPD).

### Camada 3 — Estratégia de canais e mitigação de risco

O risco hoje: prospecção fria em massa via Evolution API viola os ToS da Meta. Um ban derruba prospecção **e** atendimento juntos.

- **Separar números:** instância A (descartável) só para 1º toque frio; instância B (preservada) para conversas ativas. Ban na A não mata o funil.
- **Anti-ban na instância fria:** máx. 60–80 envios/dia por número, warm-up de 2 semanas para número novo, delays de 45–180s (não 5–10s), variação real de texto (a IA já garante), envio só em horário comercial.
- **E-mail como segundo canal:** Resend ou Brevo (MCP disponível), domínio próprio aquecido, SPF/DKIM. Toques 3+ da cadência migram para e-mail.
- **Médio prazo — Cloud API oficial:** para reengajamento da base que já respondeu (opt-in), templates aprovados, ~R$ 0,31/mensagem marketing. Frio continua fora dela (Meta não aprova template de cold outreach). Estrutura: frio na Evolution (risco aceito e isolado), relacionamento na Cloud API (protegido).

---

## 3. Melhorias no chat (ChatPage) — experiência do operador

1. **Indicador de IA ativa/pausada** por conversa + botão de takeover.
2. **Sugestão de resposta:** IA rascunha, humano aprova com 1 clique (meio-termo antes de confiar no autopilot).
3. **Resumo da conversa** no topo (quem é o lead, dor detectada, score, próximo passo) — dados que o backend já tem espalhados em leads + OSINT.
4. **Fila "aguardando humano":** conversas onde a IA detectou intenção de compra, ordenadas por score, em vez de lista cronológica de chats.
5. **Templates rápidos** com variáveis ({{nome}}, {{cidade}}, {{diagnóstico}}) para respostas manuais.

---

## 4. Roadmap priorizado

| Fase | Entrega | Esforço | Impacto |
|---|---|---|---|
| 1 (semana 1) | Anti-ban: delays 45–180s, limite diário, janela de horário, stop-on-reply | Baixo (ajustar n8n + 1 flag) | Protege o ativo inteiro |
| 2 (semanas 1–2) | SDR IA no webhook inbound + takeover no ChatPage | Médio | Maior alavanca de conversão |
| 3 (semanas 3–4) | Motor de cadência D0/D2/D5/D9 no Supabase | Médio | 2ª maior alavanca |
| 4 (semana 5) | E-mail (Resend/Brevo) como canal do toque D5+ | Baixo | Reduz dependência do WhatsApp |
| 5 (backlog) | Cloud API oficial para base opt-in + separação de instâncias | Médio | Sustentabilidade de longo prazo |

**Métricas para validar cada fase:** taxa de resposta por toque, tempo até 1ª resposta ao lead (meta: < 60s com IA), reuniões agendadas/semana, e saúde da instância (envios bloqueados, avisos da Evolution).

---

## 5. Riscos e decisões em aberto

- **Evolution API é violação de ToS da Meta.** A estratégia acima *mitiga* o risco (limites, número descartável, migração parcial para e-mail e Cloud API) mas não o elimina. Decisão de negócio: aceitar o risco no 1º toque frio ou mover o frio inteiro para e-mail/LinkedIn.
- **IA respondendo lead sem supervisão** pode errar tom ou prometer o que não existe. Mitigação: fase de "sugestão com aprovação" antes do autopilot, e escopo travado (qualificar e agendar, nunca precificar).
- **LGPD:** leads raspados de Google Places não deram opt-in. Base legal = legítimo interesse B2B, mas opt-out precisa funcionar de verdade (Fase 1).
