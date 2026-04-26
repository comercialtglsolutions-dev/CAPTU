---
title: "Implementation Plan Emoji Attachments"
date: 2026-03-16
type: ARTIFACT_TYPE_IMPLEMENTATION_PLAN
summary: "Implementation plan for adding a WhatsApp-style emoji picker and attachment menu. 
- Integrated emoji-mart with Twemoji set for better visual parity.
- Created a floating attachment menu with options for Document, Gallery, Camera, Audio, Contact, and Poll.
- Implemented file selection logic for media and documents."
tags: [antigravity, contexto, importado]
---
# Plano de Implementação: Picker de Emoji e Menu de Anexos

Vamos transformar a área de entrada de mensagem para ficar idêntica ao WhatsApp Web.

## 1. Picker de Emojis
- **Biblioteca:** `emoji-mart` com o set `twitter` (Twemoji).
- **Integração:** Adicionar um Popover ao icone de carinha.
- **Funcionalidade:** Ao clicar em um emoji, ele será inserido na posição atual do cursor no textarea (ou ao final se não houver foco).

## 2. Menu de Anexos
- **Layout:** Menu suspenso (dropdown/popover) que abre para cima.
- **Opções:**
    - **Documento:** Seleciona qualquer arquivo.
    - **Fotos e Vídeos:** Filtra por imagens e vídeos.
    - **Câmera:** Abre a câmera do dispositivo (se suportado).
    - **Áudio:** Seleciona arquivos de som.
    - **Contato:** Abre uma lista lateral para selecionar um contato existente.
    - **Enquete:** Abre um modal simplificado para criar enquete.

## 3. Logica de Envio
- Utilizar os inputs ocultos de arquivo para disparar o envio através da API já existente (`/api/chat/send/media`).

## 4. UI/UX
- Garantir que os menus usem o tema escuro do sistema.
- Adicionar animações de entrada (zoom-in/slide-up) para sentir o sistema "vivo".

### Próximos Passos
1. Adicionar imports necessários.
2. Criar os inputs ocultos para upload.
3. Implementar o `EmojiPickerComponent`.
4. Implementar o `AttachmentMenuComponent`.
5. Ajustar o `ChatPage` para usar esses componentes.
