---
title: "Crossplatform Health Strategy"
date: 2026-04-06
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "Complete cross-platform health tracking strategy for MOVT covering Apple Watch (iOS via HealthKit/react-native-health) and all Android smartwatches (via Health Connect/react-native-health-connect). Shows the unified NativeHealthManager architecture, what already exists vs what needs to be built, and a step-by-step implementation plan. Includes the definitive architecture diagram showing how both platforms converge into a single data pipeline to Supabase."
tags: [antigravity, contexto, importado]
---
# 🍎🤖 Estratégia Cross-Platform: Apple Watch + Android Watches

## Arquitetura Unificada

```
┌──────────────────────────────────────────────────────────────┐
│                        DISPOSITIVOS                          │
│                                                              │
│   🍎 Apple Watch          🤖 Samsung / Amazfit / Garmin      │
│   (WatchOS)               (Qualquer relógio Android)         │
└──────────┬───────────────────────────┬───────────────────────┘
           │                           │
           ▼                           ▼
┌──────────────────┐       ┌───────────────────────┐
│   Apple          │       │  Google               │
│   HealthKit      │       │  Health Connect       │
│   (iOS nativo)   │       │  (Android nativo)     │
└──────────┬───────┘       └──────────┬────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────┐
│              NativeHealthManager                    │
│        (Platform.OS === 'ios' ? HealthKit           │
│                               : HealthConnect)      │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  useHealthTracking│
              │  (hook unificado) │
              └──────────┬────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Supabase    Estado    AsyncStorage
        (healthkit)    React     (cache local)
```

---

## 🍎 iOS — Apple Watch (já ~90% pronto)

### O que já existe

| Arquivo | Status |
|---|---|
| `appleHealthKitService.ts` | ✅ Lê steps + BPM via `react-native-health` |
| `nativeHealthManager.ts` | ✅ Roteia para HealthKit no iOS |
| Permissões `HeartRate`, `Steps`, `ActiveEnergyBurned` | ✅ Declaradas |

### Como funciona com Apple Watch

```
Apple Watch → Bluetooth → iPhone → HealthKit → react-native-health → MOVT
```

O Apple Watch sincroniza automaticamente com o HealthKit do iPhone via Bluetooth. O app não precisa de código BLE — o HealthKit é o intermediário.

### O que ainda falta no iOS

```typescript
// ❌ Hoje: só faz snapshot (pega 1 leitura do passado)
AppleHealthKit.getHeartRateSamples(options, callback)

// ✅ Precisa: observer em tempo real (notificação quando BPM muda)
AppleHealthKit.setObserver({ type: 'HeartRate' }, callback)
```

**Também falta buscar Calorias Ativas (ActiveEnergyBurned):**
```typescript
// Ainda não implementado no appleHealthKitService.ts
AppleHealthKit.getActiveEnergyBurned(options, callback)
```

---

## 🤖 Android — Qualquer Relógio (precisa trocar Google Fit)

### Situação atual
```
Google Fit (DESCONTINUADO 2024) ← googleFitService.ts
```

### O que precisa ser feito
```
Health Connect (padrão Google 2024+) ← healthConnectService.ts (CRIAR)
```

### Por que o Health Connect funciona com qualquer relógio Android?

```
Samsung Galaxy Watch → App Samsung Health → Health Connect API
Amazfit → App Zepp → Health Connect API
Garmin → App Garmin Connect → Health Connect API
Xiaomi Mi Band → App Mi Fitness → Health Connect API
Fitbit → App Fitbit → Health Connect API
```

Todos os apps de relógio já sincronizam com o Health Connect automaticamente. O MOVT apenas lê de lá.

---

## 📦 Pacotes Necessários

| Plataforma | Pacote | Status |
|---|---|---|
| iOS (Apple Watch) | `react-native-health` | ✅ Já instalado |
| Android (qualquer relógio) | `react-native-health-connect` | ❌ Precisa instalar |

```bash
# Apenas esse pacote novo é necessário
npx expo install react-native-health-connect
```

---

## 🏗️ Implementação — O que mudar

### 1. Criar `healthConnectService.ts` (Android)

```typescript
import { initialize, requestPermission, readRecords } from 'react-native-health-connect';

export const ensureHealthConnectPermissions = async (): Promise<boolean> => {
  await initialize();
  const granted = await requestPermission([
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  ]);
  return granted.length > 0;
};

export const fetchHealthConnectHeartRate = async (): Promise<number> => {
  const results = await readRecords('HeartRate', {
    timeRangeFilter: { operator: 'between', startTime: '...', endTime: '...' }
  });
  const last = results[results.length - 1];
  return last?.samples[0]?.beatsPerMinute ?? 0;
};

export const fetchHealthConnectCalories = async (): Promise<number> => {
  const results = await readRecords('TotalCaloriesBurned', { ... });
  return results.reduce((sum, r) => sum + r.energy.inKilocalories, 0);
};
```

### 2. Atualizar `appleHealthKitService.ts` (iOS)

```typescript
// Adicionar observer em tempo real para BPM
export const subscribeHeartRate = (callback: (bpm: number) => void): () => void => {
  AppleHealthKit.setObserver({ type: AppleHealthKit.Constants.Observers.HeartRate },
    () => {
      // Quando relógio envia nova leitura, busca o valor
      fetchHealthKitHeartRate().then(callback);
    }
  );
  return () => AppleHealthKit.removeObserver({ type: 'HeartRate' });
};

// Adicionar leitura de calorias ativas
export const fetchHealthKitCalories = (): Promise<number> => {
  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned({ startDate: todayStart }, (err, results) => {
      const total = results?.reduce((sum, r) => sum + r.value, 0) ?? 0;
      resolve(total);
    });
  });
};
```

### 3. Atualizar `nativeHealthManager.ts` (Bridge Unificado)

```typescript
// ANTES: Google Fit (obsoleto) vs HealthKit
// DEPOIS: Health Connect (Android) vs HealthKit (iOS)

import { fetchHealthConnectHeartRate, fetchHealthConnectCalories } from './healthConnectService';
import { fetchHealthKitHeartRate, fetchHealthKitCalories } from './appleHealthKitService';

export const NativeHealthManager = {
  authorize: async () => {
    if (Platform.OS === 'android') return ensureHealthConnectPermissions();
    if (Platform.OS === 'ios')    return ensureHealthKitPermissions();
    return false;
  },

  fetchHeartRate: async () => {
    if (Platform.OS === 'android') return fetchHealthConnectHeartRate();
    if (Platform.OS === 'ios')    return fetchHealthKitHeartRate();
    return 0;
  },

  fetchCalories: async () => {
    if (Platform.OS === 'android') return fetchHealthConnectCalories();
    if (Platform.OS === 'ios')    return fetchHealthKitCalories();
    return 0;
  },
};
```

---

## 📋 Permissões — AndroidManifest.xml

```xml
<!-- Health Connect (substitui Google Fit) -->
<uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
<uses-permission android:name="android.permission.health.READ_STEPS"/>
<uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED"/>
<uses-permission android:name="android.permission.health.READ_SLEEP"/>
<uses-permission android:name="android.permission.health.READ_BLOOD_OXYGEN"/>

<!-- Intent para abrir Health Connect caso não instalado -->
<queries>
  <package android:name="com.google.android.apps.healthdata" />
</queries>
```

---

## 📋 Permissões — Info.plist (iOS)

```xml
<!-- Apple HealthKit (já deve existir) -->
<key>NSHealthShareUsageDescription</key>
<string>MOVT usa seus dados de saúde para monitorar seu treino e bem-estar.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>MOVT pode salvar dados de hidratação no Apple Health.</string>
```

---

## 🗺️ Roadmap de Implementação

| Passo | Tarefa | Esforço | Prioridade |
|---|---|---|---|
| 1 | Instalar `react-native-health-connect` | 15 min | 🔴 Crítico |
| 2 | Criar `healthConnectService.ts` | 2h | 🔴 Crítico |
| 3 | Atualizar `nativeHealthManager.ts` | 1h | 🔴 Crítico |
| 4 | Adicionar observer de BPM no iOS | 1h | 🟡 Importante |
| 5 | Adicionar fetch de calorias (iOS + Android) | 1h | 🟡 Importante |
| 6 | Atualizar `AndroidManifest.xml` | 15 min | 🔴 Crítico |
| 7 | Testar Android com relógio real | — | 🔴 Crítico |
| 8 | Testar iOS com Apple Watch | — | 🔴 Crítico |

**Tempo total estimado: ~1 dia de desenvolvimento**

---

> [!NOTE]
> O `useHealthTracking.ts` e toda a UI (HeartbeatsScreen, DataScreen, etc.) **não precisam mudar nada** — eles já consomem a camada do `NativeHealthManager` de forma agnóstica à plataforma.

> [!WARNING]
> Para testar isso você precisa de **builds nativas** (não funciona no Expo Go). Use `npx expo run:android` e `npx expo run:ios`.

> [!TIP]
> Se quiser testar antes de ter Apple Watch ou relógio Android físico, pode **inserir dados manualmente** no Health Connect (Android) ou no app Saúde (iOS) e o MOVT vai ler normalmente.
