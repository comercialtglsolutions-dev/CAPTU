---
title: "Bluetooth Strategy"
date: 2026-04-06
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "Comprehensive analysis of the MOVT app's current Bluetooth and health tracking infrastructure, identifying what's already built (wearOsHealthService, nativeHealthManager, Google Fit, HealthKit, Supabase healthkit table) vs what's missing for production (actual BLE connection layer). Presents 3 integration options: A) Google Health Connect (recommended, easiest, widest compatibility), B) BLE Direct via react-native-ble-plx (real-time, needs BLE GATT), C) Wear OS Companion App (most complete, highest effort). Includes migration warning that Google Fit is deprecated in 2024 and production apps must migrate to Health Connect."
tags: [antigravity, contexto, importado]
---
# 🔵 Diagnóstico Bluetooth / Wearable MOVT

## O que já existe no projeto

### ✅ Infraestrutura Pronta (Backend / Serviços)

| Arquivo | Status | O que faz |
|---|---|---|
| `wearOsHealthService.ts` | ✅ Completo | Lê BPM, pressão, SpO2 do Supabase (`healthkit` table) |
| `wearOsPermissions.ts` | ✅ Completo | Solicita permissões Android para BODY_SENSORS |
| `nativeHealthManager.ts` | ✅ Completo | Bridge: Google Fit (Android) / HealthKit (iOS) |
| `googleFitService.ts` | ✅ Completo | Passos e steps via Google Fit |
| `appleHealthKitService.ts` | ✅ Completo | BPM + steps via HealthKit (iOS) |
| `useHealthTracking.ts` (hook) | ✅ Completo | Agrega BPM, passos, calorias, sono, treino |
| Supabase `healthkit` table | ✅ Configurado | Recebe dados via `tipo_dado` = `heart_rate`, `blood_pressure`, etc. |
| Supabase `dispositivos` table | ✅ Configurado | Registra relógio do usuário |

### ⚡ O que o sistema JÁ FAZ automaticamente

```
Dispositivo Wear OS
       |
       v
Envia dados via BLE → Tabela `healthkit` no Supabase (via API/BT)
       |
       v
`wearOsHealthService.ts` faz polling (a cada 5s)
       |
       v
`useHealthTracking.ts` atualiza estado: heartRate, calorias, etc.
       |
       v
UI exibe em HeartbeatsScreen, DataScreen, etc.
```

---

## 🔴 O que está FALTANDO para produção

### Problema Central: O GAP de Bluetooth

> O projeto lê dados do Supabase, mas **não tem código que conecta diretamente no relógio via BLE**.
> Alguém (ou um app intermediário) precisa colocar os dados lá.

### Existem 3 caminhos possíveis:

---

## 📡 Opção A — Google Health Connect (Android) — RECOMENDADA

**Como funciona:**
1. O relógio (Garmin, Samsung, Fitbit etc.) sincroniza BPM com o **Google Health Connect** nativamente via Bluetooth
2. O app MOVT lê os dados do Health Connect usando `react-native-health-connect`
3. Sem necessidade de parear manualmente

**Vantagens:**
- Suporta quase **todos os relógios Android** do mercado
- Sem código BLE manual — o Google já faz o Bluetooth
- API padronizada, estável e aprovada pela play store

**Pacote:** `react-native-health-connect` (oficial do Google)

```bash
npx expo install react-native-health-connect
```

**Fluxo:**
```
Relógio → Google Health Connect → (react-native-health-connect) → MOVT App → Supabase
```

---

## 📡 Opção B — BLE Direto (react-native-ble-plx) — AVANÇADA

**Como funciona:**
1. O app escaneia relógios BLE próximos
2. Conecta no relógio e se inscreve nas notificações de BPM usando o **perfil GATT Heart Rate**
3. Dados chegam em tempo real via callbacks

**Quando usar:** Relógios que expõem BLE padrão GATT (maioria dos genéricos e alguns Garmin)

```bash
npx expo install react-native-ble-plx
```

**UUID BLE padrão para BPM:** `0x180D` / `0x2A37`

**Fluxo:**
```
Relógio BLE → react-native-ble-plx → useBluetoothHeartRate hook → MOVT App → Supabase
```

---

## 📡 Opção C — Wear OS Companion App — MAIS COMPLETA

**Como funciona:**
1. Desenvolver um **mini-app no próprio relógio** (Wear OS)
2. O relógio envia dados via DataClient para o celular
3. O celular recebe e grava no Supabase

**Quando usar:** Relógio Samsung/Google/TicWatch com Wear OS

**Vantagem:** Acesso a TODOS os sensores (BPM contínuo, ECG, SpO2)
**Desvantagem:** Precisa publicar 2 apps (celular + watch app)

---

## 🎯 Recomendação para Produção

| Critério | Opção A (Health Connect) | Opção B (BLE Plx) | Opção C (Wear App) |
|---|---|---|---|
| Facilidade de implementação | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Compatibilidade de relógios | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| BPM em tempo real | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Pronto para Play Store | ✅ | ✅ | ⚠️ (2 apps) |
| Esforço de implementação | Baixo | Médio | Alto |

**👉 Melhor caminho para hoje: Opção A (Health Connect)**

---

## 🗺️ Próximos Passos Concretos (Opção A)

### 1. Instalar o Health Connect
```bash
npx expo install react-native-health-connect
```

### 2. Adicionar ao AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
<uses-permission android:name="android.permission.health.READ_STEPS"/>
<uses-permission android:name="android.permission.health.READ_CALORIES_TOTAL"/>
```

### 3. Criar `healthConnectService.ts`
Chama a API do Health Connect, busca BPM e calorias, e publica no Supabase via `healthkit`.

### 4. Atualizar `nativeHealthManager.ts`
Adicionar Health Connect como provedor Android substituindo Google Fit.

### 5. Testar com relógio real
Sincronizar um Amazfit/Samsung/Garmin com o Health Connect e ver os dados no app.

---

> [!IMPORTANT]
> O **Google Fit** (usado hoje em `googleFitService.ts`) está **descontinuado desde 2024** e vai parar de funcionar. A migração para **Health Connect** é obrigatória para produção na Play Store.

> [!NOTE]
> O Supabase (`healthkit` table + `dispositivos` table) e os serviços de polling já estão prontos. O único gap é o "coletor" de Bluetooth. Com a Opção A implementada, os dados fluirão automaticamente para toda a UI existente sem precisar mudar mais nada.
