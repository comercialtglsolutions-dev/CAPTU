---
title: "Google Login Fix Plan"
date: 2026-03-26
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "Plan to implement functional Google Login in the signinScreen.tsx for the MOVT app. This involves replacing the current placeholder alert with actual OAuth logic using expo-auth-session, ensuring it works in both production builds and provides a better experience in Expo Go."
tags: [antigravity, contexto, importado]
---
# Implementation Plan - Functional Google Login

The current `SignInScreen` has a hardcoded alert for Google Login that states it only works in builds, but then doesn't actually contain the code to execute the login in those builds. This plan will implement the full OAuth flow.

## 1. Environment & Dependencies
- Use `expo-auth-session/providers/google` (already imported).
- Ensure Client IDs from `.env` are correctly utilized.
- Import `Constants` from `expo-constants` to detect if the app is running in Expo Go.

## 2. Code Changes in `signinScreen.tsx`
### A. Define Google Auth Request Hook
- Call `Google.useAuthRequest` with:
    - `androidClientId`: `process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
    - `iosClientId`: `process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
    - `webClientId`: `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Required for the `AuthSession` redirection proxy)

### B. Handle OAuth Response
- Add a `useEffect` that listens to the `response` from the hook.
- If `response?.type === "success"`, extract the `authentication.accessToken`.
- Pass this token to `handleSignInWithSocialToken`.

### C. Refactor `signInWithGoogle`
- If running in Expo Go (detected via `Constants.appOwnership === 'expo'`), show a warning but allow the user to proceed anyway with a "Continuar" button.
- Otherwise (in build), call `promptAsync()` directly.

## 3. Client IDs Configuration
- Verified in `.env`:
    - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
    - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
    - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

## 4. Final Review
- Ensure `WebBrowser.maybeCompleteAuthSession()` is correctly called.
- Ensure the user gets a feedback if the login fails or is cancelled.
