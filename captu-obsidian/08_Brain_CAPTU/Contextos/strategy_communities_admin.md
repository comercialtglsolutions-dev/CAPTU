---
title: "Strategy Communities Admin"
date: 2026-04-11
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "Detailed implementation strategy for adding community management (create, edit, delete) directly into the AdminDashboardScreen, following the same BottomSheet-inline pattern already used for Gyms, Trainers, and Plans. Covers all states, refs, business functions, and JSX layout needed."
tags: [antigravity, contexto, importado]
---
# 🗂 Estratégia: Gestão de Comunidades no Admin Dashboard

## Contexto

O `AdminDashboardScreen.tsx` já gerencia Usuários, Trainers, Academias e Planos via BottomSheets
próprios (inline, sem componentes externos). O `CommunityManagementSheet.tsx` já existe como
componente standalone (usado na `communityScreen.tsx`), com CRUD completo de comunidades
(criar, editar, excluir) e todos os campos corretos.

---

## Abordagem Escolhida: Integração Nativa com BottomSheets Inline (mesma arquitetura dos Gyms)

> Seguir **exatamente** o padrão das Academias no AdminDashboardScreen, que usa refs de BottomSheet
> diretos, estados locais e funções inline — sem depender de componentes externos.

---

## Fase 1 — Estados e Refs

Adicionar ao `AdminDashboardScreen.tsx`:

| Item | Tipo | Descrição |
|------|------|-----------|
| `communitiesSheetRef` | `React.useRef<BottomSheet>` | Sheet lista de comunidades |
| `communityFormSheetRef` | `React.useRef<BottomSheet>` | Sheet formulário criar/editar |
| `adminCommunities` | `any[]` | Lista de comunidades |
| `communitySearchQuery` | `string` | Busca na lista |
| `editingCommunity` | `any \| null` | Comunidade sendo editada |
| `communityForm` | `object` | Campos do formulário (= campos do `CommunityManagementSheet`) |
| `communitySelectedImage` | `ImagePickerAsset \| null` | Imagem selecionada |
| `communityCategories` | `string[]` | Lista de categorias |
| `isCommunityDatePickerVisible` | `boolean` | Controla o DateTimePicker |
| `isNewCommunityCategory` | `boolean` | Modal nova categoria |
| `newCommCategoryName` | `string` | Nome da nova categoria |

---

## Fase 2 — Funções de Negócio

| Função | Descrição |
|--------|-----------|
| `fetchAdminCommunities(silent?)` | GET `/comunidades`, preenche `adminCommunities`, expande sheet (se não silent) |
| `fetchCommunityCategories()` | GET `/comunidade-categorias`, preenche `communityCategories` |
| `openCreateCommunity()` | Reseta form, seta `editingCommunity = null`, expande `communityFormSheetRef` |
| `openEditCommunity(comm)` | Preenche form com dados da comunidade, expande `communityFormSheetRef` |
| `saveCommunity()` | POST ou PUT multipart/form-data para criar/atualizar (igual ao `handleSave` do sheet) |
| `deleteCommunity(id, name)` | Alert + DELETE `/admin/communities/{id}` |
| `pickCommunityImage()` | `expo-image-picker`, seta `communitySelectedImage` |
| `handleCommunityDateConfirm(date)` | Seta `communityForm.data_evento` |
| `addCommunityCategory()` | POST `/admin/comunidade-categorias`, atualiza lista |
| `filteredAdminCommunities` | useMemo: filtra por `communitySearchQuery` |

---

## Fase 3 — Cards de Acesso Rápido no Dashboard

Adicionar um **card de Ação Rápida** "Comunidades" na seção de KPIs ou na nova seção de
"Gestão Operacional" (próximo dos cards de Academias/Trainers), com:
- Ícone: `Users` (ou `Layers`) + cor `#6366F1` (roxo, diferente das academias)
- Valor: `adminCommunities.length` (carregado em background)
- `onPress`: chama `fetchAdminCommunities()`

---

## Fase 4 — BottomSheet: Lista de Comunidades (`communitiesSheetRef`)

**Seguindo o padrão do sheet de Academias (`gymsSheetRef`):**

```
┌─────────────────────────────────────────┐
│  🏘 Comunidades          [+ Criar]      │
│  ──────────────────────────────────── │
│  🔍 Buscar comunidade...               │
│  ──────────────────────────────────── │
│  [Img] Nome da Comunidade              │
│        Corrida · 45/100 membros        │
│                          [✏️] [🗑️]    │
│  ...                                   │
└─────────────────────────────────────────┘
```

- Campo de busca (filtra por nome/categoria)
- `BottomSheetFlatList` com card por comunidade
- Cada card: imagem thumbnail, nome, categoria badge, `participantes/max_participantes`, botões Edit e Delete
- Botão `+ Criar` no header → abre `communityFormSheetRef`
- Botão `✏️` → `openEditCommunity(item)` → abre `communityFormSheetRef`
- Botão `🗑️` → `deleteCommunity(item.id_comunidade, item.nome)`

---

## Fase 5 — BottomSheet: Formulário (`communityFormSheetRef`)

**Seguindo o padrão do formulário de Planos (`editPlanSheetRef`) e do `CommunityManagementSheet`:**

Campos (em ordem, exatamente como no `CommunityManagementSheet`):
1. Upload de Imagem (área clicável com preview)
2. Nome da comunidade/evento *
3. Descrição *
4. Categoria (scroll horizontal com chips, botão "+ Nova categoria")
5. Tipo (Presencial / Online — scroll chips)
6. Máx participantes | Data e hora do evento
7. Local início | Local fim
8. Duração estimada | Calorias est.
9. Faixa etária (chips: Livre / +18 / +14)
10. Premiação/brindes
11. Telefone para contato
12. Botão `[Criar / Atualizar comunidade]`

Modal para nova categoria: mesmo padrão do `CommunityManagementSheet`.
DateTimePicker: `react-native-modal-datetime-picker` (já importado).

---

## Fase 6 — Integração no `renderKPI` / Quick Actions

No `renderKPI`, adicionar mapeamento para `id === "communities"`:
```ts
else if (item.id === "communities") fetchAdminCommunities();
```

Ou, se o backend não retornar esse KPI, adicionar uma **seção de Ações Rápidas** manual
(como alguns dashboards fazem) com um `TouchableOpacity` para abrir o sheet de comunidades.

---

## Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---------|----------------|
| `AdminDashboardScreen.tsx` | Adicionar refs, estados, funções e JSX para os dois novos BottomSheets de Comunidades |

> **Nenhum arquivo existente é deletado.** O `CommunityManagementSheet.tsx` continua existindo
> para a `communityScreen.tsx`.

---

## Estimativa de Linhas Adicionadas

| Seção | Linhas aprox. |
|-------|---------------|
| Refs | +2 |
| Estados | +12 |
| useMemo filteredCommunities | +6 |
| Funções de negócio (7 funções) | ~120 |
| JSX Sheet Lista | ~80 |
| JSX Sheet Formulário | ~200 |
| Card de acesso no dashboard | ~20 |
| **Total** | **~440 linhas** |

---

## ✅ Checklist de Aprovação

- [ ] Todos os campos de `CommunityManagementSheet` presentes no formulário
- [ ] Imagem com upload via `ImagePicker` + preview
- [ ] DateTimePicker para data_evento
- [ ] Modal para criação de nova categoria
- [ ] Busca na lista
- [ ] Criação, edição e exclusão funcionais
- [ ] Card de acesso rápido no dashboard clicável
- [ ] Formatação 100% consistente com o padrão das Academias
