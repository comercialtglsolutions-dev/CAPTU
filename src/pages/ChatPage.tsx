import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Search,
    Check,
    CheckCheck,
    Smile,
    Paperclip,
    Send,
    Loader2,
    MessageSquare,
    Filter,
    MapPin,
    Globe,
    Star,
    Archive,
    Trash,
    ChevronLeft,
    ExternalLink,
    Image as ImageIcon,
    FileText,
    QrCode,
    LogOut,
    Users,
    Maximize2,
    X,
    Play,
    Pause,
    Mic,
    ArrowRight,
    Info,
    Copy,
    CornerUpLeft,
    CornerUpRight,
    CheckSquare,
    Lock,
    Pin,
    Camera,
    Music,
    UserPlus,
    BarChart3,
    Eye,
    Download,
} from "lucide-react";
import EmojiPicker, { Theme, EmojiStyle, Categories } from 'emoji-picker-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { WA_API_URL } from "@/config";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ─── Interfaces de Tipagem Baseadas no Proxy ────────────────────────────────

interface ProxyContact {
    id: string; // JID
    name?: string;
    pushName?: string;
    imgUrl?: string;
}

interface ProxyMessage {
    id: string; // Message ID
    text: string;
    direction: 'inbound' | 'outbound';
    timestamp: number;
    status: string; // sent, delivered, read (opcional)
    sender?: string; // JID de quem enviou (útil para grupos)
    mediaUrl?: string;
    type?: string;
    duration?: number;
    quoted?: {
        text: string;
        sender?: string;
    };
    raw?: any;
    reactions?: Record<string, string>;
    filename?: string;
    mimetype?: string;
    remoteJid?: string;
}

interface ProxyChat {
    id: string; // JID
    name?: string; // Nome derivado (contato > pushName > JID)
    phoneNumber?: string;
    avatar?: string | null;
    lastMessage?: string;
    lastMessageSender?: string; // PushName de quem mandou a última msgs no grupo
    lastMessageTime?: number;
    pinned?: number; // Timestamp se for fixado
    unreadCount: number;
    type: 'individual' | 'group' | 'community';
}

// ─── Funções Auxiliares ─────────────────────────────────────────────────────

function extractTextFromWhatsAppMessage(msg: any): string {
    if (!msg || typeof msg !== 'object') return "";
    if (!msg.message) return "";
    
    // Desembrulhar mensagens aninhadas (ephemeral, viewOnce, etc.)
    let messageContent = msg.message;
    if (messageContent.ephemeralMessage) messageContent = messageContent.ephemeralMessage.message;
    if (messageContent.viewOnceMessage) messageContent = messageContent.viewOnceMessage.message;
    if (messageContent.viewOnceMessageV2) messageContent = messageContent.viewOnceMessageV2.message;
    if (messageContent.viewOnceMessageV2Extension) messageContent = messageContent.viewOnceMessageV2Extension.message;
    if (messageContent.documentWithCaptionMessage) messageContent = messageContent.documentWithCaptionMessage.message;
    if (messageContent.groupInviteMessage) return `📩 Convite para grupo: ${messageContent.groupInviteMessage.groupName || 'Grupo'}`;

    let text = messageContent?.conversation ||
           messageContent?.extendedTextMessage?.text ||
           messageContent?.imageMessage?.caption ||
           messageContent?.videoMessage?.caption ||
           messageContent?.documentMessage?.caption ||
           messageContent?.templateButtonReplyMessage?.selectedId ||
           messageContent?.buttonsResponseMessage?.selectedDisplayText ||
           messageContent?.listResponseMessage?.title || "";

    if (messageContent?.imageMessage) return text || 'Foto';
    if (messageContent?.videoMessage) return text || 'Vídeo';
    if (messageContent?.audioMessage) return 'Áudio';
    if (messageContent?.documentMessage) return text || `📄 Documento`;
    if (messageContent?.stickerMessage) return `🏷️ Figurinha`;
    if (messageContent?.locationMessage) return `📍 Localização`;
    if (messageContent?.contactMessage || messageContent?.contactsArrayMessage) return `👤 Contato`;
    if (messageContent?.pollCreationMessage) return `📊 Enquete`;
    if (messageContent?.reactionMessage) return ``;  // Reactions are never shown as message bubbles
    
    // Se ainda não tiver texto, mas for uma mensagem de protocolo (ex: deletada)
    if (!text && messageContent?.protocolMessage) {
        return 'Mensagem de Sistema';
    }
    
    return text || "";
}

function formatAudioTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

const senderColors: string[] = [
    'text-blue-400',
    'text-purple-400',
    'text-orange-400',
    'text-pink-400',
    'text-emerald-400',
    'text-yellow-400',
    'text-cyan-400',
    'text-indigo-400'
];

function getSenderColor(jid: string): string {
    let hash = 0;
    for (let i = 0; i < jid.length; i++) {
        hash = jid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % senderColors.length);
    return senderColors[index];
}

function formatWhatsAppNumber(jid: string): string {
    if (!jid) return '';
    if (jid.endsWith('@newsletter') || jid.includes('status')) return '';

    const cleanJid = jid.split('@')[0].split(':')[0];
    const digits = cleanJid.replace(/\D/g, '');
    
    if (!digits) return '';

    // Lógica para números Brasileiros (55 + DDD + Número)
    if (digits.startsWith('55')) {
        const body = digits.substring(2);
        // Retorna DDD + Número se tiver 10 ou 11 dígitos
        if (body.length === 10 || body.length === 11) return body;
        // Se for maior (LID ou dispositivo), mas começa com 55 + DDD válido
        const ddd = parseInt(body.substring(0, 2));
        if (ddd >= 11 && ddd <= 99 && body.length >= 10) return body.substring(0, 11);
    }
    
    // Se não tem 55 mas tem formato de número brasileiro
    if (digits.length === 10 || digits.length === 11) {
        const ddd = parseInt(digits.substring(0, 2));
        if (ddd >= 11 && ddd <= 99) return digits;
    }

    // Fallback para outros países ou IDs curtos
    if (digits.length >= 8 && digits.length <= 15) return digits;

    return '';
}

function safeFormatDate(timestamp: any, formatStr: string, options?: any) {
    if (!timestamp) return '';
    try {
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return '';
        return format(d, formatStr, options);
    } catch (e) {
        return '';
    }
}

function getHostname(url: string | undefined) {
    if (!url) return '';
    try {
        const u = new URL(url);
        return u.hostname;
    } catch (e) {
        return url || '';
    }
}

function getDocExtension(filename: string): string {
    return filename?.split('.')?.pop()?.toUpperCase() || 'DOC';
}

function getDocIconColor(ext: string): string {
    const map: Record<string, string> = {
        PDF: '#e8453c',
        DOC: '#295394', DOCX: '#295394',
        XLS: '#1d6f42', XLSX: '#1d6f42',
        PPT: '#c43e1c', PPTX: '#c43e1c',
        ZIP: '#f5a623', RAR: '#f5a623',
        MP4: '#9b59b6', AVI: '#9b59b6', MOV: '#9b59b6',
    };
    return map[ext] || '#607d8b';
}

export default function ChatPage() {
    const [searchParams] = useSearchParams();
    const [selectedJid, setSelectedJid] = useState<string | null>(searchParams.get("leadId"));

    // Identificador único da instância para este usuário (Multi-tenant)
    const instanceName = useMemo(() => {
        const saved = localStorage.getItem('evolution_instance_name');
        if (saved) return saved;
        const newId = `user_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('evolution_instance_name', newId);
        return newId;
    }, []);

    const chatHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        'x-instance-name': instanceName
    }), [instanceName]);
    // Estados do Proxy (In-Memory Database)
    const [chats, setChats] = useState<Record<string, ProxyChat>>({});
    const [messagesByChat, setMessagesByChat] = useState<Record<string, ProxyMessage[]>>({});
    const [contacts, setContacts] = useState<Record<string, ProxyContact>>({});
    const [lidMap, setLidMap] = useState<Record<string, string>>({});

    const [searchQuery, setSearchQuery] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showLeadInfo, setShowLeadInfo] = useState(true);
    
    // Status do Motor WhatsApp
    const [waStatus, setWaStatus] = useState<string>("close");
    const [waQr, setWaQr] = useState<string | null>(null);
    const [isPaired, setIsPaired] = useState<boolean>(false);
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [docPreview, setDocPreview] = useState<{ url: string; name: string; ext: string } | null>(null);
    const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Refs para o envio de anexos
    const docInputRef = useRef<HTMLInputElement | null>(null);
    const mediaInputRef = useRef<HTMLInputElement | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const audioInputRef = useRef<HTMLInputElement | null>(null);

    // Estados para Progresso Atômico 6.0
    const [syncPercentage, setSyncPercentage] = useState(0);
    const [syncStage, setSyncStage] = useState<string>("Iniciando...");
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [leadInfo, setLeadInfo] = useState<any>(null);
    const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number } | null>(null);
    const [msgContextMenu, setMsgContextMenu] = useState<{ visible: boolean; x: number; y: number; msg: ProxyMessage | null; isGroup: boolean } | null>(null);
    const [replyingTo, setReplyingTo] = useState<ProxyMessage | null>(null);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        setIsSelecting(false);
        setSelectedMessages(new Set());
    }, [selectedJid]);

    const [favoritedMessages, setFavoritedMessages] = useState<Record<string, Set<string>>>(() => {
        try {
            const saved = localStorage.getItem('chat_favorites');
            if (saved) {
                const parsed = JSON.parse(saved);
                return Object.keys(parsed).reduce((acc, key) => {
                    acc[key] = new Set(parsed[key]);
                    return acc;
                }, {} as Record<string, Set<string>>);
            }
        } catch (e) {}
        return {};
    });
    const [pinnedMessages, setPinnedMessages] = useState<Record<string, Set<string>>>(() => {
        try {
            const saved = localStorage.getItem('chat_pins');
            if (saved) {
                const parsed = JSON.parse(saved);
                return Object.keys(parsed).reduce((acc, key) => {
                    acc[key] = new Set(parsed[key]);
                    return acc;
                }, {} as Record<string, Set<string>>);
            }
        } catch (e) {}
        return {};
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lidMapRef = useRef<Record<string, string>>({});
    const channelRef = useRef<any>(null);

    // Função para resolver o nome/número de exibição dinamicamente
    const resolveSenderDisplay = (senderJid: string) => {
        if (!senderJid) return '';
        
        // 1. Resolver o JID real através do Mapa de LIDs (Síncrono via Ref)
        const realJid = lidMapRef.current[senderJid] || senderJid;
        
        // 2. Prioridade 1: Agenda (Nome salvo pelo usuário)
        const contact = contacts[realJid] || contacts[senderJid];
        if (contact?.name && !contact.name.includes('@')) return contact.name;
        
        // 3. Prioridade 2: Número Real Formatado (DDD+Número)
        const formattedNumber = formatWhatsAppNumber(realJid);
        if (formattedNumber) return formattedNumber;
        
        // 4. Prioridade 3: Nome de Perfil (Push Name / Notify)
        if (contact?.pushName) return `~ ${contact.pushName}`;
        if (contact?.name && !contact.name.includes('@')) return `~ ${contact.name}`;

        // 5. Último recurso: ID Limpo
        const cleanId = realJid.split('@')[0].split(':')[0];
        return `~ ${cleanId.substring(0, 11)}`;
    };

    // Função centralizada para processar histórico de mensagens/chats/contatos
    const processHistory = (payload: any, localLidMap: Record<string, string>) => {
        const { chats: rawChats, messages: rawMessages, contacts: rawContacts } = payload;
        
        const contactsMap: Record<string, ProxyContact> = {};
        const newLidMappings: Record<string, string> = {};
        
        if (rawContacts) {
            rawContacts.forEach((c: any) => {
                const id = c.id;
                const name = c.name || c.notify || c.verifiedName || id.split('@')[0];
                contactsMap[id] = { id, name, pushName: c.notify, imgUrl: c.imgUrl };
                if (c.lid) {
                    lidMapRef.current[c.lid] = id;
                    newLidMappings[c.lid] = id;
                    // Duplo índice para velocidade
                    contactsMap[c.lid] = { id, name, pushName: c.notify, imgUrl: c.imgUrl };
                }
            });
        }
        setLidMap(prev => ({ ...prev, ...newLidMappings }));
        setContacts(prev => ({ ...prev, ...contactsMap }));

        const messagesMap: Record<string, ProxyMessage[]> = {};
        if (rawMessages) {
            const allMessages = Array.isArray(rawMessages) 
                ? rawMessages 
                : Object.values(rawMessages).flat();

            // Pass 1: build normal messages
            allMessages.forEach((msg: any) => {
                if (!msg.key || !msg.key.remoteJid) return;
                // Skip reaction messages in this pass
                if (msg.message?.reactionMessage) return;
                let jid = msg.key.remoteJid;
                jid = localLidMap[jid] || jid;
                const isImage = !!msg.message?.imageMessage;
                const isAudio = !!msg.message?.audioMessage;
                const isSticker = !!msg.message?.stickerMessage;
                const isDocument = !!msg.message?.documentMessage;
                const isMedia = isImage || isAudio || isSticker || isDocument;
                const text = extractTextFromWhatsAppMessage(msg);
                // Skip messages with no content at all (not even media)
                if (!text && !isMedia) return;
                const audioDuration = msg.message?.audioMessage?.seconds;
                const proxyMsg: ProxyMessage = {
                    id: msg.key.id,
                    // For media without caption, use a type label as fallback text
                    text: text || (isImage ? 'Foto' : isAudio ? 'Áudio' : isSticker ? 'Figurinha' : isDocument ? 'Documento' : ''),
                    direction: msg.key.fromMe ? 'outbound' : 'inbound',
                    timestamp: msg.messageTimestamp ? (typeof msg.messageTimestamp === 'object' ? Number(msg.messageTimestamp.low || 0) * 1000 : Number(msg.messageTimestamp) * 1000) : Date.now(),
                    status: 'delivered',
                    sender: msg.key.participant || jid,
                    // Historical media: don't set mediaUrl to avoid 404 flood on groups
                    // mediaUrl will be set properly by fetchChatMessages on demand
                    mediaUrl: undefined,
                    type: isImage ? 'image' : isAudio ? 'audio' : isSticker ? 'sticker' : isDocument ? 'document' : 'text',
                    duration: audioDuration,
                    raw: msg,
                    reactions: {},
                    quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ? {
                        text: extractTextFromWhatsAppMessage({ message: msg.message.extendedTextMessage.contextInfo.quotedMessage }),
                        sender: msg.message.extendedTextMessage.contextInfo.participant
                    } : undefined
                };
                if (!messagesMap[jid]) messagesMap[jid] = [];
                messagesMap[jid].push(proxyMsg);
            });

            // Pass 2: apply reactions to their target messages
            allMessages.forEach((msg: any) => {
                const reaction = msg.message?.reactionMessage;
                if (!reaction) return;
                let jid = msg.key?.remoteJid;
                if (!jid) return;
                jid = localLidMap[jid] || jid;
                const targetMsgId = reaction.key?.id;
                const emoji = reaction.text || '';
                const reactorJid = msg.key.participant || (msg.key.fromMe ? 'me' : jid);
                if (!targetMsgId || !messagesMap[jid]) return;
                const targetIdx = messagesMap[jid].findIndex(m => m.id === targetMsgId);
                if (targetIdx === -1) return;
                const existing = messagesMap[jid][targetIdx];
                const updatedReactions = { ...(existing.reactions || {}) };
                if (emoji) {
                    updatedReactions[reactorJid] = emoji;
                } else {
                    delete updatedReactions[reactorJid];
                }
                messagesMap[jid][targetIdx] = { ...existing, reactions: updatedReactions };
            });
        }
        setMessagesByChat(prev => {
            const newState = { ...prev };
            Object.keys(messagesMap).forEach(jid => {
                newState[jid] = messagesMap[jid].sort((a, b) => a.timestamp - b.timestamp);
            });
            return newState;
        });

        const chatsMap: Record<string, ProxyChat> = {};
        const allChats = Array.isArray(rawChats) ? rawChats : (rawChats ? Object.values(rawChats).flat() : []);
        allChats.forEach((chat: any) => {
                let jid = chat.id || chat.key?.remoteJid;
                if (!jid) return;
                jid = localLidMap[jid] || jid;
                const type = jid.endsWith('@g.us') ? 'group' : jid.endsWith('@newsletter') ? 'community' : 'individual';
                const contactName = contactsMap[jid]?.name || chat.name || chat.verifiedName || jid.split('@')[0];
                const jidMsgs = messagesMap[jid];
                const lastMsgObj = jidMsgs && jidMsgs.length > 0 ? jidMsgs[jidMsgs.length - 1] : null;
                // chat.lastMessage from Baileys can be an object like {key, text, senderTimestampMs, unread}
                // We must always produce a plain string
                let rawChatLastMsg = chat.lastMessage;
                if (rawChatLastMsg && typeof rawChatLastMsg === 'object') {
                    rawChatLastMsg = (rawChatLastMsg as any).text || '';
                }
                const lastText = lastMsgObj ? String(lastMsgObj.text || '') : (String(rawChatLastMsg || ''));
                
                let lastMessageSender = '';
                if (type === 'group' && lastMsgObj && lastMsgObj.direction === 'inbound') {
                    const senderJid = lastMsgObj.sender || '';
                    const senderContact = contactsMap[senderJid];
                    lastMessageSender = senderContact?.pushName || senderContact?.name || senderJid.split('@')[0] || '';
                }

                const lastTime = chat.conversationTimestamp 
                    ? (typeof chat.conversationTimestamp === 'object' ? Number(chat.conversationTimestamp.low || 0) * 1000 : Number(chat.conversationTimestamp) * 1000)
                    : (lastMsgObj ? lastMsgObj.timestamp : 0);

                chatsMap[jid] = {
                    id: jid,
                    name: contactName,
                    phoneNumber: chat.phoneNumber || jid.split('@')[0],
                    avatar: chat.avatar || null,
                    lastMessage: lastText,
                    lastMessageSender: lastMessageSender,
                    lastMessageTime: lastTime,
                    pinned: chat.pinned ? Number(chat.pinned) : 0,
                    unreadCount: chat.unreadCount || 0,
                    type: type as any
                };
            });
        setChats(prev => ({ ...prev, ...chatsMap }));
    };

    const fetchHistory = async () => {
        try {
            const resHistory = await fetch(`${WA_API_URL}/api/chat/history`, {
                headers: chatHeaders
            });
            if (resHistory.ok) {
                const historicalData = await resHistory.json();
                if (historicalData && historicalData.chats) {
                    processHistory(historicalData, {}); // LID map gerenciado via state agora
                    setIsSyncing(false);
                    return true;
                }
            }
        } catch (e) {
            console.error("Erro ao buscar histórico:", e);
        }
        return false;
    };

    useEffect(() => {
        // Busca Status Inicial e Histórico do Cache
        const initializeChat = async () => {
            try {
                // 1. Status
                const resStatus = await fetch(`${WA_API_URL}/api/chat/status`, {
                    headers: chatHeaders
                });
                if (resStatus.ok) {
                    const data = await resStatus.json();
                    setWaStatus(data.state === 'open' ? 'open' : data.state === 'syncing' ? 'syncing' : (data.state === 'connecting' || data.state === 'disconnected') ? 'connecting' : 'close');
                    setWaQr(data.qrcode || null);
                    setIsPaired(data.state === 'open');
                    
                    if (data.state === 'open') {
                        setIsSyncing(false);
                        fetchHistory(); // Busca imediata se já estiver aberto
                    }
                }

                // 2. Histórico
                fetchHistory();
            } catch (e) {
                console.error("Erro na inicialização do chat:", e);
            }
        };
        initializeChat();
    }, []);

    useEffect(() => {
        if (waStatus === 'open') {
            setIsSyncing(false);
        } else if (waStatus === 'connecting' || waStatus === 'syncing') {
            setIsSyncing(true);
            if (waStatus === 'connecting') {
                setSyncPercentage(0);
                setSyncStage("Aguardando...");
            }
        }
    }, [waStatus]);

    // ─── Conexão Realtime (Bypass Vercel WebSocket Block) ──────────────────
    useEffect(() => {
        const channel = supabase.channel('whatsapp-events');
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'connection-update' }, ({ payload }) => {
                const { connection, qr, isPaired } = payload;
                setWaStatus(connection);
                setWaQr(qr);
                setIsPaired(!!isPaired);

                if (connection === 'open') {
                    setIsSyncing(false);
                    // Sincronização Proativa: Busca contatos e mensagens IMEDIATAMENTE
                    fetchHistory(); 
                    
                    // Notifica o usuário e fecha o modal automaticamente para melhor UX
                    toast.success("WhatsApp conectado!", {
                        description: "Carregando suas conversas..."
                    });
                    
                    setTimeout(() => {
                        setIsWaModalOpen(false);
                    }, 1500);
                }

                if (connection === 'close') {
                    setChats({});
                    setMessagesByChat({});
                    setContacts({});
                    setLidMap({});
                    setSelectedJid(null);
                    setIsSyncing(true);
                    setSyncPercentage(0);
                    setSyncStage("Conectando...");
                    setLeadInfo(null);
                    setGroupParticipants([]);
                }
            })
            .on('broadcast', { event: 'group-update' }, ({ payload }) => {
                if (payload.id === selectedJid) {
                    setGroupParticipants(payload.participants || []);
                }
            })
            .on('broadcast', { event: 'sync-progress' }, ({ payload }) => {
                const { percentage, stage } = payload;
                setSyncPercentage(percentage);
                setSyncStage(stage);
            })
            .on('broadcast', { event: 'sync-ready' }, () => {
                console.log("[WhatsApp] Sincronização Atômica concluída no backend. Buscando dados via HTTP...");
                setSyncPercentage(100);
                setSyncStage("Sincronizado!");
                fetchHistory(); // Gatilho final quando o backend termina a janela de acúmulo
                
                // Fecha o modal se ainda estiver aberto durante a sincronia final
                setTimeout(() => {
                    setIsWaModalOpen(false);
                }, 1000);
            })
            .on('broadcast', { event: 'history' }, ({ payload }) => {
                // Fallback para pacotes menores
                processHistory(payload, {});
                setIsSyncing(false);
            })
            .on('broadcast', { event: `whatsapp-message:${instanceName}` }, ({ payload: event }) => {
                // Evolution API encapsula no campo 'data'
                const msg = event.data;
                if (!msg || !msg.key || !msg.key.remoteJid) return;
                let jid = msg.key.remoteJid;
                jid = lidMapRef.current[jid] || jid;
                // Handle reaction messages: update the target message instead of creating a bubble
                if (msg.message?.reactionMessage) {
                    const reaction = msg.message.reactionMessage;
                    const targetMsgId = reaction.key?.id;
                    const emoji = reaction.text || '';
                    const reactorJid = msg.key.participant || (msg.key.fromMe ? 'me' : jid);
                    if (targetMsgId) {
                        setMessagesByChat(prev => {
                            const current = prev[jid];
                            if (!current) return prev;
                            const idx = current.findIndex(m => m.id === targetMsgId);
                            if (idx === -1) return prev;
                            const updatedReactions = { ...(current[idx].reactions || {}) };
                            if (emoji) {
                                updatedReactions[reactorJid] = emoji;
                            } else {
                                delete updatedReactions[reactorJid];
                            }
                            const updated = [...current];
                            updated[idx] = { ...updated[idx], reactions: updatedReactions };
                            return { ...prev, [jid]: updated };
                        });
                    }
                    return; // Never create a bubble for reactions
                }
                const text = extractTextFromWhatsAppMessage(msg);
                if (!text) return;
                const isOutbound = msg.key.fromMe;
                const timestamp = msg.messageTimestamp ? (typeof msg.messageTimestamp === 'object' ? Number(msg.messageTimestamp.low || 0) * 1000 : Number(msg.messageTimestamp) * 1000) : Date.now();
                const isImage = !!msg.message?.imageMessage;
                const isAudio = !!msg.message?.audioMessage;
                const isSticker = !!msg.message?.stickerMessage;
                const isDocument = !!msg.message?.documentMessage;
                const isVideo = !!msg.message?.videoMessage;
                const audioDuration = msg.message?.audioMessage?.seconds;
                
                // Atualiza contatos se houver pushName (Auto-descoberta)
                if (msg.key.participant && msg.pushName) {
                    const pid = msg.key.participant;
                    setContacts(prev => {
                        if (prev[pid]?.pushName === msg.pushName) return prev;
                        return {
                            ...prev,
                            [pid]: {
                                id: pid,
                                name: prev[pid]?.name || msg.pushName,
                                pushName: msg.pushName
                            }
                        };
                    });
                }
                
                // Extração aprimorada de metadados para tempo real
                const inner = msg.message?.ephemeralMessage?.message ||
                               msg.message?.viewOnceMessage?.message ||
                               msg.message?.viewOnceMessageV2?.message ||
                               msg.message?.documentWithCaptionMessage?.message ||
                               msg.message || {};

                const filename = inner.documentMessage?.fileName || inner.audioMessage?.fileName || inner.videoMessage?.fileName || inner.imageMessage?.fileName || '';
                const mimetype = inner.imageMessage?.mimetype || inner.videoMessage?.mimetype || inner.audioMessage?.mimetype || inner.stickerMessage?.mimetype || inner.documentMessage?.mimetype || '';
                const mType = isImage ? 'image' : isAudio ? 'audio' : isSticker ? 'sticker' : isDocument ? 'document' : isVideo ? 'video' : 'text';
                const isMedia = mType !== 'text';

                const proxyMsg: ProxyMessage = {
                    id: msg.key.id,
                    text: text,
                    direction: isOutbound ? 'outbound' : 'inbound',
                    timestamp: timestamp,
                    status: 'delivered',
                    sender: msg.key.participant || jid,
                    remoteJid: jid,
                    mediaUrl: isMedia 
                        ? `${WA_API_URL}/api/chat/media/${encodeURIComponent(jid)}/${msg.key.id}?type=${mType}&mime=${encodeURIComponent(mimetype)}&name=${encodeURIComponent(filename)}&fromMe=${isOutbound}&participant=${encodeURIComponent(msg.key.participant || '')}&instance=${instanceName}`
                        : undefined,
                    type: mType,
                    duration: audioDuration,
                    raw: msg,
                    reactions: msg.reactions,
                    quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ? {
                        text: extractTextFromWhatsAppMessage({ message: msg.message.extendedTextMessage.contextInfo.quotedMessage }),
                        sender: msg.message.extendedTextMessage.contextInfo.participant
                    } : undefined
                };
                setMessagesByChat(prev => {
                    const current = prev[jid] || [];
                    if (current.find(m => m.id === proxyMsg.id)) return prev;
                    return { ...prev, [jid]: [...current, proxyMsg] };
                });
                setChats(prev => {
                    const existing = prev[jid];
                    const type = jid.endsWith('@g.us') ? 'group' : 'individual';
                    
                    let senderName = '';
                    if (type === 'group' && !isOutbound) {
                        senderName = resolveSenderDisplay(msg.key.participant || '');
                    }

                    return {
                        ...prev,
                        [jid]: {
                            id: jid,
                            name: existing?.name || msg.pushName || jid.split('@')[0],
                            lastMessage: text,
                            lastMessageSender: senderName || existing?.lastMessageSender,
                            lastMessageTime: timestamp,
                            pinned: existing?.pinned || 0,
                            unreadCount: isOutbound ? 0 : ((existing?.unreadCount || 0) + 1),
                            type: existing?.type || type as any
                        }
                    };
                });
            })
            .on('broadcast', { event: 'reaction-update' }, ({ payload }) => {
                const { jid, messageId, reactions } = payload;
                setMessagesByChat(prev => {
                    const current = prev[jid] || [];
                    return {
                        ...prev,
                        [jid]: current.map(m => {
                            if (m.id === messageId) {
                                return { ...m, reactions };
                            }
                            return m;
                        })
                    };
                });
            })
            .on('broadcast', { event: 'contacts-upsert' }, ({ payload: newContacts }) => {
                const updates: Record<string, ProxyContact> = {};
                const newLidMappings: Record<string, string> = {};
                
                newContacts.forEach((c: any) => {
                    const id = c.id;
                    const name = c.name || c.notify;
                    updates[id] = { id, name, pushName: c.notify };
                    if (c.lid) {
                        lidMapRef.current[c.lid] = id;
                        newLidMappings[c.lid] = id;
                        updates[c.lid] = { id, name, pushName: c.notify };
                    }
                });
                setLidMap(prev => ({ ...prev, ...newLidMappings }));
                setContacts(prev => ({ ...prev, ...updates }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (!selectedJid) return;

        // ── Corrige race condition: ignora respostas de fetches de JIDs anteriores ──
        let cancelled = false;

        // Sempre limpa o loading ao trocar de conversa
        setIsMessagesLoading(true);

        const fetchChatMessages = async () => {
            try {
                const response = await fetch(`${WA_API_URL}/api/chat/messages/${encodeURIComponent(selectedJid)}`, {
                    headers: chatHeaders
                });

                // Se o usuário já trocou de conversa antes da resposta chegar, descarta
                if (cancelled) return;

                if (response.ok) {
                    const messages = await response.json();
                    
                    console.log(`[Chat] Recebidas ${messages.length} mensagens para ${selectedJid}`);

                    if (messages.length > 0) {
                        const firstMsg = messages[0];
                        console.log(`[Chat] Amostra JID da 1ª mensagem: ${firstMsg.remoteJid || firstMsg.sender}`);
                    }

                    // Mapear as mensagens para o formato ProxyMessage do Frontend
                    const proxyMsgs: ProxyMessage[] = messages
                        .filter((m: any) => {
                            // Filtro de segurança: garante que a mensagem pertence a ESTE chat
                            const msgJid = (m.remoteJid || m.sender || '').split(':')[0].toLowerCase();
                            const targetJid = selectedJid.split(':')[0].toLowerCase();
                            return msgJid === targetJid && (m.text || m.mediaUrl);
                        })
                        .map((m: any) => {
                            const isMedia = m.type !== 'text';
                            // Backend agora envia filename e mimetype diretamente
                            const filename = m.filename || m.raw?.message?.documentMessage?.fileName || "";
                            const mimetype = m.mimetype || 
                                           m.raw?.message?.imageMessage?.mimetype || 
                                           m.raw?.message?.videoMessage?.mimetype || 
                                           m.raw?.message?.audioMessage?.mimetype || 
                                           m.raw?.message?.documentMessage?.mimetype || "";

                            // Se for grupo, use o sender como participante. Se for DM, participant não é necessário.
                            const participant = selectedJid.endsWith('@g.us') ? (m.sender || '') : '';
                            const fromMe = m.direction === 'outbound';

                            return {
                                ...m,
                                // Constrói a URL de mídia somente se for realmente mídia
                                mediaUrl: isMedia 
                                    ? `${WA_API_URL}/api/chat/media/${encodeURIComponent(selectedJid)}/${m.id}?type=${m.type}&mime=${encodeURIComponent(mimetype)}&name=${encodeURIComponent(filename)}&fromMe=${fromMe}&participant=${encodeURIComponent(participant)}&instance=${instanceName}`
                                    : undefined,
                            };
                        });

                    console.log(`[Chat] Filtradas: ${proxyMsgs.length} mensagens válidas para este chat.`);

                    if (!cancelled) {
                        setMessagesByChat(prev => ({
                            ...prev,
                            [selectedJid]: proxyMsgs.sort((a, b) => a.timestamp - b.timestamp)
                        }));
                    }
                }
            } catch (e) {
                if (!cancelled) console.error("Erro ao carregar mensagens do chat:", e);
            } finally {
                if (!cancelled) setIsMessagesLoading(false);
            }
        };
        
        fetchChatMessages();

        // Cleanup: marca como cancelado quando selectedJid muda ou componente desmonta
        return () => { cancelled = true; };
    }, [selectedJid]);
    // para garantir o carregamento instantâneo no frontend



    // ─── Efeitos de UI ────────────────────────────────────────────────────────

    useEffect(() => {
        if (scrollRef.current && !isMessagesLoading) {
            const timer = setTimeout(() => {
                // Radix UI ScrollArea coloca o scroll no Viewport, não no Root
                const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                if (viewport) {
                    viewport.scrollTop = viewport.scrollHeight;
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [messagesByChat, selectedJid, isMessagesLoading]);

    // Efeito para sincronização proativa de grupos selecionados
    useEffect(() => {
        if (selectedJid && selectedJid.endsWith('@g.us') && waStatus === 'open') {
            console.log(`[Chat] Solicitando sincronização proativa para o grupo: ${selectedJid}`);
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'request-group-sync',
                    payload: { jid: selectedJid }
                });
            }
        }
    }, [selectedJid, waStatus]);

    useEffect(() => {
        const favsToSave: any = {};
        Object.keys(favoritedMessages).forEach(jid => {
            favsToSave[jid] = Array.from(favoritedMessages[jid]);
        });
        localStorage.setItem('chat_favorites', JSON.stringify(favsToSave));
    }, [favoritedMessages]);

    useEffect(() => {
        const pinsToSave: any = {};
        Object.keys(pinnedMessages).forEach(jid => {
            pinsToSave[jid] = Array.from(pinnedMessages[jid]);
        });
        localStorage.setItem('chat_pins', JSON.stringify(pinsToSave));
    }, [pinnedMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedJid || isSending || waStatus !== 'open') return;

        setIsSending(true);
        try {
            const response = await fetch(`${WA_API_URL}/api/chat/send`, {
                method: "POST",
                headers: chatHeaders,
                body: JSON.stringify({
                    leadId: "proxy", // Ignorado no backend proxy
                    phone: selectedJid,
                    message: newMessage.trim(),
                    quoted: replyingTo?.raw
                }),
            });

            if (!response.ok) throw new Error("Erro ao enviar mensagem");

            // A mensagem será recebida via socket localmente também (echo) se fromMe estiver habilitado no baileys
            setNewMessage("");
            
            // Adicionamos otimisticamente caso o echo falhe
            const proxyMsg: ProxyMessage = {
                id: `opt_${Date.now()}`,
                text: newMessage.trim(),
                direction: 'outbound',
                timestamp: Date.now(),
                status: 'sent',
                quoted: replyingTo ? {
                    text: replyingTo.text,
                    sender: replyingTo.sender
                } : undefined
            };
            
            setMessagesByChat(prev => ({
                ...prev,
                [selectedJid]: [...(prev[selectedJid] || []), proxyMsg]
            }));

            setReplyingTo(null);

        } catch (error: any) {
            toast.error("Erro ao enviar", { description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedJid || isSending || waStatus !== 'open') return;

        setIsSending(true);
        // Resetamos o input para permitir enviar o mesmo arquivo novamente se desejar
        event.target.value = ''; 

        const formData = new FormData();
        formData.append('file', file);
        formData.append('phone', selectedJid);
        formData.append('leadId', 'proxy-bypass');
        
        // Se quisermos passar caption, teríamos que abrir um modal antes do envio final.
        // Simulando envio direto vazio por enquanto, que é o que o UX default de web faz às vezes.
        // O ideal é ter um modal de preview, mas isso pode vir numa V2.
        
        try {
            const response = await fetch(`${WA_API_URL}/api/chat/send/media`, {
                method: "POST",
                headers: { 'x-instance-name': instanceName }, // REMOVED Content-Type, let browser set boundary
                body: formData,
            });

            if (!response.ok) throw new Error("Erro ao enviar arquivo");
            
            // Mensagem pendente
            const proxyMsg: ProxyMessage = {
                id: `opt_${Date.now()}`,
                text: '',
                direction: 'outbound',
                timestamp: Date.now(),
                status: 'sent',
                mediaUrl: URL.createObjectURL(file), // Preview local provisório
                type: file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 
                      file.type.startsWith('audio/') ? 'audio' : 'document'
            };
            
            setMessagesByChat(prev => ({
                ...prev,
                [selectedJid]: [...(prev[selectedJid] || []), proxyMsg]
            }));

            toast.success("Arquivo enviado!");
        } catch (error: any) {
            toast.error("Erro no envio", { description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleReact = async (msg: ProxyMessage, emoji: string) => {
        if (!selectedJid || waStatus !== 'open' || !msg.raw) return;
        try {
            const response = await fetch(`${WA_API_URL}/api/chat/react`, {
                method: "POST",
                headers: chatHeaders,
                body: JSON.stringify({
                    phone: selectedJid,
                    messageKey: msg.raw.key,
                    reaction: emoji
                }),
            });
            if (!response.ok) throw new Error("Erro ao reagir");
            
            // Atualização Otimista local
            setMessagesByChat(prev => {
                const current = prev[selectedJid] || [];
                return {
                    ...prev,
                    [selectedJid]: current.map(m => {
                        if (m.id === msg.id) {
                            const newReactions = { ...(m.reactions || {}) };
                            if (emoji) newReactions['me'] = emoji;
                            else delete newReactions['me'];
                            return { ...m, reactions: newReactions };
                        }
                        return m;
                    })
                };
            });

            toast.success(`Reação ${emoji} enviada!`);
        } catch (error: any) {
            toast.error("Erro ao reagir", { description: error.message });
        }
    };

    const handleDeleteMessage = async (msg: ProxyMessage) => {
        if (!selectedJid || waStatus !== 'open' || !msg.raw) {
            // Se for apenas local ou sem o raw, apenas remove da lista
            setMessagesByChat(prev => ({
                ...prev,
                [selectedJid!]: prev[selectedJid!]?.filter(m => m.id !== msg.id)
            }));
            toast.success("Mensagem removida visualmente");
            return;
        }

        try {
            const response = await fetch(`${WA_API_URL}/api/chat/delete-message`, {
                method: "POST",
                headers: chatHeaders,
                body: JSON.stringify({
                    phone: selectedJid,
                    messageKey: msg.raw.key
                }),
            });
            if (!response.ok) throw new Error("Erro ao apagar");
            
            setMessagesByChat(prev => ({
                ...prev,
                [selectedJid]: prev[selectedJid]?.filter(m => m.id !== msg.id)
            }));
            toast.success("Mensagem apagada para todos");
        } catch (error: any) {
            toast.error("Erro ao apagar", { description: error.message });
        }
    };

    const handlePin = (msg: ProxyMessage) => {
        if (!selectedJid) return;
        setPinnedMessages(prev => {
            const chatPins = new Set(prev[selectedJid] || []);
            if (chatPins.has(msg.id)) chatPins.delete(msg.id);
            else chatPins.add(msg.id);
            return { ...prev, [selectedJid]: chatPins };
        });
        toast.success(pinnedMessages[selectedJid]?.has(msg.id) ? "Desafixado" : "Mensagem fixada");
    };

    const handleFavorite = (msg: ProxyMessage) => {
        if (!selectedJid) return;
        setFavoritedMessages(prev => {
            const chatFavs = new Set(prev[selectedJid] || []);
            if (chatFavs.has(msg.id)) chatFavs.delete(msg.id);
            else chatFavs.add(msg.id);
            return { ...prev, [selectedJid]: chatFavs };
        });
        toast.success(favoritedMessages[selectedJid]?.has(msg.id) ? "Removida dos favoritos" : "Mensagem favoritada");
    };

    const handleForwardMessage = (msg: ProxyMessage) => {
        // Por agora, para "funcionar", vamos jogar o texto no input para o usuário decidir onde enviar
        // Ou simulamos o envio direto se houver um alvo. 
        // Como o usuário quer que "funcione", vamos carregar como se fosse um novo envio.
        setNewMessage(msg.text);
        toast.info("Texto carregado para encaminhar. Escolha a conversa e envie.");
    };

    const toggleMessageSelection = (msgId: string) => {
        setSelectedMessages(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) next.delete(msgId);
            else next.add(msgId);
            return next;
        });
    };

    const handleDeleteSelected = () => {
        if (selectedMessages.size === 0) return;
        setMessagesByChat(prev => {
            const current = prev[selectedJid!] || [];
            return {
                ...prev,
                [selectedJid!]: current.filter(m => !selectedMessages.has(m.id))
            };
        });
        toast.success(`${selectedMessages.size} mensagens apagadas visualmente`);
        setSelectedMessages(new Set());
        setIsSelecting(false);
    };

    const handleForwardSelected = () => {
        if (selectedMessages.size === 0) return;
        const selectedMsgs = currentMessages.filter(m => selectedMessages.has(m.id))
            .sort((a, b) => a.timestamp - b.timestamp);
        const combinedText = selectedMsgs.map(m => m.text).join('\n---\n');
        setNewMessage(combinedText);
        toast.info("Mensagens selecionadas carregadas para encaminhar");
        setSelectedMessages(new Set());
        setIsSelecting(false);
    };

    const handleWaLogout = async () => {
        if (!confirm("Deseja realmente desconectar este WhatsApp? Isso apagará a instância.")) return;
        setIsDisconnecting(true);
        try {
            const response = await fetch(`${WA_API_URL}/api/chat/disconnect`, {
                method: "POST",
                headers: chatHeaders
            });
            if (response.ok) {
                setWaStatus('close');
                setIsPaired(false);
                setWaQr(null);
                toast.success("WhatsApp desconectado!");
            }
        } catch (e) {
            toast.error("Erro ao desconectar");
        } finally {
            setIsDisconnecting(false);
        }
    };

    // ─── Renderização Baseada nos Estados Proxy ─────────────────────────────

    // Ordenar Chats do mais recente para o mais antigo, com fixados no topo e filtrar inválidos
    const sortedChats = useMemo(() => {
        return Object.values(chats)
            .filter(c => {
                // Filtro de Busca Local em RAM
                const contact = contacts[c.id];
                const displayName = contact?.name || contact?.pushName || c.name || c.id;
                return displayName.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.includes(searchQuery);
            })
            .sort((a, b) => {
                // Prioridade 1: Chats Fixados (Pinned)
                const pinnedA = a.pinned || 0;
                const pinnedB = b.pinned || 0;
                if (pinnedA !== pinnedB) return pinnedB - pinnedA;
                
                // Prioridade 2: Ordem Cronológica estrita (conforme celular)
                const timeA = a.lastMessageTime || 0;
                const timeB = b.lastMessageTime || 0;
                return timeB - timeA;
            });
    }, [chats, contacts, searchQuery]);

    const selectedChat = selectedJid ? chats[selectedJid] : null;
    const currentMessages = selectedJid ? (messagesByChat[selectedJid] || []) : [];

    const chatMedia = useMemo(() => currentMessages.filter(m => m.type === 'image' || m.type === 'video'), [currentMessages]);
    const chatDocs = useMemo(() => currentMessages.filter(m => m.type === 'document'), [currentMessages]);
    const chatLinks = useMemo(() => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return currentMessages.filter(m => m.text?.match(urlRegex));
    }, [currentMessages]);
    const chatFavorites = useMemo(() => {
        return currentMessages.filter(m => selectedJid && favoritedMessages[selectedJid]?.has(m.id));
    }, [currentMessages, selectedJid, favoritedMessages]);
    const currentContactInfo = selectedJid ? contacts[selectedJid] : null;
    
    // Nome do chat selecionado
    const displaySelectedName = currentContactInfo?.name || currentContactInfo?.pushName || selectedChat?.name || selectedJid?.split('@')[0] || 'Desconhecido';

    const commonEmojis = ["😊", "👍", "🤝", "🚀", "💡", "📅", "✅", "📍", "💰", "🙏", "📞", "👋"];

    return (
        <div className={cn("flex overflow-hidden bg-card transition-all w-full flex-1 h-full")}>
            
            {/* Sidebar Esquerda - Lista de Conversas (Em RAM) */}
            <div className={cn(
                "w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-border bg-muted/10 shrink-0",
                selectedJid ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 space-y-4 bg-background/50 backdrop-blur-sm border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-emerald-500" />
                            Conversas 
                        </h1>
                        <div className="flex items-center gap-1">
                            {/* Gatilho do QR Code */}
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn("rounded-full", waStatus !== 'open' ? "text-amber-500 bg-amber-500/10 animate-pulse" : "text-emerald-500 bg-emerald-500/10")}
                                onClick={() => setIsWaModalOpen(true)}
                            >
                                <QrCode className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar contatos ou números..."
                            className="pl-10 bg-background/50 border-border/50 focus:ring-emerald-500/20 rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="divide-y divide-border/30">
                        {waStatus === 'syncing' || (waStatus === 'open' && sortedChats.length === 0 && isSyncing) ? (
                            <div className="p-8 text-center space-y-4">
                                <Loader2 className="h-10 w-10 mx-auto animate-spin text-emerald-500/50" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-emerald-600/80">Sincronização Atômica...</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Otimizando mídias e contatos</p>
                                </div>
                            </div>
                        ) : waStatus !== 'open' ? (
                            <div className="p-8 text-center space-y-4">
                                <p className="text-sm text-muted-foreground">Conecte seu WhatsApp para carregar suas conversas do celular.</p>
                                <Button variant="outline" onClick={() => setIsWaModalOpen(true)}>Vincular Agora</Button>
                            </div>
                        ) : sortedChats.length === 0 && !isSyncing ? (
                            <div className="p-8 text-center space-y-2">
                                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground">Nenhuma conversa encontrada recentemente.</p>
                            </div>
                                                            ) : (
                            sortedChats.map((chat) => {
                                const contact = contacts[chat.id];
                                const displayName = contact?.name || contact?.pushName || chat.name || chat.id.split('@')[0];
                                
                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => setSelectedJid(chat.id)}
                                        className={cn(
                                            "p-4 flex gap-4 cursor-pointer transition-all hover:bg-emerald-500/5 relative group",
                                            selectedJid === chat.id ? "bg-emerald-500/10" : ""
                                        )}
                                    >
                                        {selectedJid === chat.id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                                        )}

                                        <div className="relative">
                                            <Avatar className="h-12 w-12 border border-border/50 shadow-sm">
                                                <AvatarImage src={chat.avatar || contact?.imgUrl} />
                                                <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold">
                                                    {chat.type === 'group' ? <Users className="h-5 w-5" /> : displayName.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {chat.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white border-2 border-background">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {chat.lastMessageTime ? safeFormatDate(chat.lastMessageTime, "HH:mm") : ""}
                                                </span>
                                            </div>

                                            <p className="text-xs text-muted-foreground truncate line-clamp-1">
                                                {chat.type === 'group' && chat.lastMessageSender && (
                                                    <span className="text-emerald-600/70 font-medium mr-1">~ {chat.lastMessageSender}:</span>
                                                )}
                                                {(() => { const lm = typeof chat.lastMessage === 'string' ? chat.lastMessage : (chat.lastMessage ? String((chat.lastMessage as any).text || (chat.lastMessage as any) || '') : ''); return lm ? (lm.length > 25 ? lm.substring(0, 25) + '...' : lm) : 'Toque para ver...'; })()}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Painel Central - Área de Chat */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 bg-background relative chat-pattern",
                !selectedJid ? "hidden md:flex" : "flex"
            )}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://whatsapp.com/favicon.ico')] bg-repeat opacity-5" />

                {selectedJid ? (
                    <>
                    <div className="flex-1 flex flex-row min-w-0 h-full">
                        {/* Chat Content Column */}
                        <div className="flex-1 flex flex-col min-w-0 relative">
                            {/* Chat Header */}
                        <header className={cn(
                            "px-4 md:px-6 py-3 flex items-center justify-between backdrop-blur-md border-b border-border/50 z-10 shrink-0 h-[64px] transition-all",
                            isSelecting ? "bg-[#202c33] text-white" : "bg-muted/30"
                        )}>
                            {isSelecting ? (
                                <div className="flex items-center gap-4 w-full animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={() => { setIsSelecting(false); setSelectedMessages(new Set()); }}>
                                        <X className="h-5 w-5 text-white" />
                                    </Button>
                                    <span className="text-white font-medium flex-1">{selectedMessages.size} selecionada{selectedMessages.size !== 1 ? 's' : ''}</span>
                                    <div className="flex items-center gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="rounded-full hover:bg-white/10 text-white"
                                            disabled={selectedMessages.size === 0}
                                            onClick={() => {
                                                const texts = Array.from(selectedMessages).map(id => currentMessages.find(m => m.id === id)?.text).filter(Boolean);
                                                setNewMessage(texts.join('\n\n'));
                                                setIsSelecting(false);
                                                setSelectedMessages(new Set());
                                                toast.info("Mensagens selecionadas carregadas para encaminhar");
                                            }}
                                        >
                                            <CornerUpRight className="h-5 w-5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="rounded-full hover:bg-white/10 text-white"
                                            disabled={selectedMessages.size === 0}
                                            onClick={async () => {
                                                for (const msgId of Array.from(selectedMessages)) {
                                                    const msg = currentMessages.find(m => m.id === msgId);
                                                    if (msg) await handleDeleteMessage(msg);
                                                }
                                                setIsSelecting(false);
                                                setSelectedMessages(new Set());
                                            }}
                                        >
                                            <Trash className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                                            ) : (
                                <>
                                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="md:hidden -ml-2 rounded-full h-8 w-8"
                                            onClick={() => setSelectedJid(null)}
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Avatar className="h-9 w-9 md:h-10 md:w-10 border border-border shrink-0">
                                            <AvatarImage src={selectedChat?.avatar || currentContactInfo?.imgUrl} />
                                            <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold">
                                                {selectedChat?.type === 'group' ? <Users className="h-4 w-4" /> : displaySelectedName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h2 className="font-bold text-sm leading-tight cursor-pointer hover:underline" onClick={() => setShowDetails(!showDetails)}>{displaySelectedName}</h2>
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium tracking-tight">
                                                    {selectedChat?.type === 'group' ? 'Conversa em grupo' : (selectedChat?.phoneNumber ? `+${selectedChat.phoneNumber}` : formatWhatsAppNumber(selectedJid || ''))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn("h-9 w-9 rounded-full", showDetails && "bg-primary/10 text-primary")}
                                            onClick={() => setShowDetails(!showDetails)}
                                        >
                                            <Info className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </header>

                        {/* Messages List em RAM */}
                        <div 
                            className="flex-1 overflow-hidden flex flex-col pt-4 relative"
                            onClick={() => {
                                setContextMenu(null);
                                setMsgContextMenu(null);
                            }}
                        >
                            <ScrollArea 
                                className="flex-1 px-4 md:px-6 pb-6 relative h-full w-full" 
                                ref={scrollRef}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
                                }}
                            >
                                <div className="flex flex-col gap-2 max-w-4xl mx-auto min-h-full">
                                    {isMessagesLoading ? (
                                        <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
                                            <p className="text-xs text-muted-foreground animate-pulse">Sincronizando histórico...</p>
                                        </div>
                                    ) : currentMessages.length === 0 ? (
                                        <div className="text-center p-12 space-y-4">
                                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                                <MessageSquare className="h-8 w-8 text-emerald-500/60" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="font-semibold">Chat Protegido (Proxy Mode)</h3>
                                                <p className="text-xs text-muted-foreground">O histórico detalhado deste contato está carregando em memória ou precisa de novas mensagens.</p>
                                            </div>
                                        </div>
                                                            ) : (
                                        currentMessages.map((msg, idx) => {
                                            const isOutbound = msg.direction === 'outbound';
                                            const showDate = idx === 0 || safeFormatDate(currentMessages[idx - 1].timestamp, 'yyyy-MM-dd') !== safeFormatDate(msg.timestamp, 'yyyy-MM-dd');

                                            return (
                                                <div key={msg.id} className="w-full flex flex-col">
                                                    {showDate && (
                                                        <div className="flex justify-center my-4">
                                                            <span className="px-3 py-1 rounded-full bg-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shadow-sm">
                                                                {safeFormatDate(msg.timestamp, "d 'de' MMMM", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className={cn("flex w-full items-center gap-2", isOutbound ? "flex-row-reverse" : "flex-row")}>
                                                         {isSelecting && (
                                                             <div 
                                                                 className={cn(
                                                                     "h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all shrink-0",
                                                                     selectedMessages.has(msg.id) ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30 hover:border-emerald-500/50"
                                                                 )}
                                                                 onClick={() => toggleMessageSelection(msg.id)}
                                                             >
                                                                 {selectedMessages.has(msg.id) && <Check className="h-3.5 w-3.5 text-white" />}
                                                             </div>
                                                         )}
                                                         <div 
                                                             className={cn(
                                                                 "relative max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-[14px] text-sm group cursor-pointer",
                                                                 isSelecting ? "hover:ring-2 hover:ring-emerald-500/20" : "",
                                                                 msg.type === 'sticker' 
                                                                     ? "bg-transparent p-0" 
                                                                     : (isOutbound
                                                                         ? "bg-[#005c4b] text-white rounded-tr-sm shadow-sm"
                                                                         : "bg-[#202c33] text-white rounded-tl-sm shadow-sm")
                                                             )}
                                                             onClick={() => {
                                                                 if (isSelecting) toggleMessageSelection(msg.id);
                                                             }}
                                                             onContextMenu={(e) => {
                                                                 e.preventDefault();
                                                                 e.stopPropagation();
                                                                 if (isSelecting) return;
                                                                 setContextMenu(null);
                                                                 setMsgContextMenu({
                                                                     visible: true,
                                                                     x: e.clientX,
                                                                     y: e.clientY,
                                                                     msg: msg,
                                                                     isGroup: selectedJid?.endsWith('@g.us') || false
                                                                 });
                                                             }}
                                                         >
                                                             {/* Pin/Favorite Indicators */}
                                                             <div className="absolute -top-1 -right-1 flex gap-1 z-10">
                                                                 {pinnedMessages[selectedJid!]?.has(msg.id) && (
                                                                     <div className="bg-emerald-500 text-white p-0.5 rounded-full shadow-lg border border-background">
                                                                         <Pin className="h-2 w-2" />
                                                                     </div>
                                                                 )}
                                                                 {favoritedMessages[selectedJid!]?.has(msg.id) && (
                                                                     <div className="bg-yellow-500 text-white p-0.5 rounded-full shadow-lg border border-background">
                                                                         <Star className="h-2 w-2 fill-current" />
                                                                     </div>
                                                                 )}
                                                             </div>
                                                            {/* Sender Name in Group (Resolved Reactively) */}
                                                            {selectedJid?.endsWith('@g.us') && !isOutbound && (
                                                                <div className={cn(
                                                                    "text-[11px] font-bold mb-1 truncate",
                                                                    getSenderColor(msg.sender || '')
                                                                )}>
                                                                    {resolveSenderDisplay(msg.sender || '')}
                                                                </div>
                                                            )}

                                                            {/* Quoted Message Reference */}
                                                            {msg.quoted && (
                                                                <div className="mb-2 bg-black/20 rounded-lg p-2 border-l-4 border-emerald-500/50 flex flex-col cursor-pointer hover:bg-black/30 transition-colors max-w-full overflow-hidden">
                                                                    <span className="text-[10px] font-bold text-emerald-400 mb-0.5">
                                                                        {resolveSenderDisplay(msg.quoted.sender || '')}
                                                                    </span>
                                                                    <p className="text-[11px] text-white/70 line-clamp-2 leading-tight truncate">
                                                                        {typeof msg.quoted.text === 'string' ? msg.quoted.text : String(msg.quoted.text || '')}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {msg.type === 'image' && !msg.mediaUrl ? (
                                                                // Historical image - no local cache, show placeholder
                                                                <div className="flex items-center gap-2 py-1 px-1 opacity-70">
                                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                                        <ImageIcon className="h-4 w-4 text-white/60" />
                                                                    </div>
                                                                    <span className="text-xs text-white/60 italic">
                                                                        {msg.text && msg.text !== 'Foto' ? msg.text : 'Foto'}
                                                                    </span>
                                                                </div>
                                                            ) : msg.mediaUrl && msg.type === 'image' ? (
                                                                <div className="flex flex-col gap-2">
                                                                    <div 
                                                                        className="relative rounded-[8px] overflow-hidden bg-black/5 min-h-[150px] max-w-[280px] flex items-center justify-center cursor-zoom-in"
                                                                        onClick={() => setPreviewImage(msg.mediaUrl || null)}
                                                                    >
                                                                        <img 
                                                                            src={msg.mediaUrl} 
                                                                            alt="Imagem do WhatsApp"
                                                                            className="w-full h-full object-cover max-h-[350px] transition-transform duration-300 hover:scale-105"
                                                                            loading="lazy"
                                                                            decoding="async"
                                                                            onLoad={(e) => {
                                                                                const target = e.target as HTMLImageElement;
                                                                                target.parentElement?.classList.remove('min-h-[150px]', 'bg-black/5');
                                                                            }}
                                                                            onError={(e) => {
                                                                                const target = e.target as HTMLImageElement;
                                                                                const parent = target.parentElement;
                                                                                if (parent) {
                                                                                    parent.classList.remove('min-h-[150px]', 'cursor-zoom-in');
                                                                                    parent.classList.add('min-h-[80px]', 'cursor-default');
                                                                                }
                                                                                target.style.display = 'none';
                                                                                // Insert fallback if not already present
                                                                                if (parent && !parent.querySelector('.img-fallback')) {
                                                                                    const fallback = document.createElement('div');
                                                                                    fallback.className = 'img-fallback flex flex-col items-center justify-center gap-1 text-white/40 py-3 px-4';
                                                                                    fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg><span style="font-size:10px">Imagem não disponível</span>';
                                                                                    parent.appendChild(fallback);
                                                                                }
                                                                            }}
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                                                                            <Maximize2 className="text-white h-6 w-6" />
                                                                        </div>
                                                                    </div>
                                                                    {msg.text && msg.text !== 'Foto' && (
                                                                        <p className="leading-relaxed whitespace-pre-wrap pr-12 pb-2 text-xs opacity-90">{msg.text}</p>
                                                                    )}
                                                                </div>
                                                            ) : msg.mediaUrl && msg.type === 'audio' ? (
                                                                <div className="flex items-center gap-3 py-1 min-w-[240px]">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 shrink-0"
                                                                        onClick={() => {
                                                                            if (currentlyPlayingAudio === msg.id) {
                                                                                audioRef.current?.pause();
                                                                                setCurrentlyPlayingAudio(null);
                                                                            } else {
                                                                                if (audioRef.current) {
                                                                                    audioRef.current.pause();
                                                                                }
                                                                                const audio = new Audio(msg.mediaUrl);
                                                                                
                                                                                audio.ontimeupdate = () => {
                                                                                    setAudioProgress((audio.duration ? (audio.currentTime / audio.duration) * 100 : 0));
                                                                                    setAudioCurrentTime(audio.currentTime);
                                                                                };

                                                                                audio.onended = () => {
                                                                                    setCurrentlyPlayingAudio(null);
                                                                                    setAudioProgress(0);
                                                                                    setAudioCurrentTime(0);
                                                                                };

                                                                                audio.play();
                                                                                audioRef.current = audio;
                                                                                setCurrentlyPlayingAudio(msg.id);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {currentlyPlayingAudio === msg.id ? (
                                                                            <Pause className="h-5 w-5 fill-current" />
                                                            ) : (
                                                                            <Play className="h-5 w-5 fill-current ml-1" />
                                                                        )}
                                                                    </Button>
                                                                    <div className="flex-1 space-y-1">
                                                                         <div className="flex justify-between items-center text-[10px] opacity-70">
                                                                             <span className="flex items-center gap-1">
                                                                                 <Mic className="h-3 w-3" />
                                                                                 {currentlyPlayingAudio === msg.id 
                                                                                     ? `${formatAudioTime(audioCurrentTime)} / ${formatAudioTime(audioRef.current?.duration || msg.duration || 0)}`
                                                                                     : msg.duration ? formatAudioTime(msg.duration) : "Mensagem de voz"
                                                                                 }
                                                                             </span>
                                                                         </div>
                                                                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden relative">
                                                                            <div 
                                                                                className="h-full bg-emerald-500 transition-all duration-100 absolute left-0 top-0"
                                                                                style={{ width: `${currentlyPlayingAudio === msg.id ? audioProgress : 0}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : msg.mediaUrl && msg.type === 'video' ? (
                                                                <div className="flex flex-col gap-2 max-w-[300px]">
                                                                    <div className="relative rounded-xl overflow-hidden bg-black/20 aspect-video flex items-center justify-center">
                                                                        <video 
                                                                            src={msg.mediaUrl} 
                                                                            controls 
                                                                            className="w-full h-full object-contain"
                                                                            poster={msg.mediaUrl + "&thumb=true"}
                                                                        />
                                                                    </div>
                                                                    {msg.text && msg.text !== 'Vídeo' && (
                                                                        <p className="text-[12px] opacity-90 px-1">{msg.text}</p>
                                                                    )}
                                                                </div>
                                                            ) : msg.mediaUrl && msg.type === 'sticker' ? (
                                                                <div className="max-w-[160px] md:max-w-[200px] p-2 hover:scale-105 transition-transform duration-300">
                                                                    <img 
                                                                        src={msg.mediaUrl} 
                                                                        alt="Figurinha" 
                                                                        className="w-full h-auto drop-shadow-lg" 
                                                                        loading="lazy" 
                                                                    /> 
                                                                </div>
                                                            ) : msg.type === 'document' ? (
                                                                // ─── Document Bubble ────────────────────────────────────────
                                                                (() => {
                                                                    const filename = msg.filename || 'Documento';
                                                                    const filesize = msg.raw?.message?.documentMessage?.fileLength || 
                                                                                     msg.raw?.message?.documentWithCaptionMessage?.message?.documentMessage?.fileLength;
                                                                    const displaySize = filesize 
                                                                        ? (Number(filesize) > 1048576 
                                                                            ? `${(Number(filesize) / 1048576).toFixed(1)} MB` 
                                                                            : `${Math.round(Number(filesize) / 1024)} KB`)
                                                                        : '';
                                                                    const ext = getDocExtension(filename);
                                                                    const color = getDocIconColor(ext);
                                                                    const mediaUrl = msg.mediaUrl;
                                                                    return (
                                                                        <div className="flex flex-col min-w-[220px] max-w-[280px]">
                                                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/15">
                                                                                {/* Icon */}
                                                                                <div 
                                                                                    className="w-10 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 relative"
                                                                                    style={{ backgroundColor: color }}
                                                                                >
                                                                                    <FileText className="h-5 w-5 text-white" />
                                                                                    <span className="text-white text-[8px] font-bold mt-0.5 tracking-wide">{ext}</span>
                                                                                </div>
                                                                                {/* Info */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-[12px] font-medium text-white leading-tight line-clamp-2 break-all">{filename}</p>
                                                                                    {displaySize && <p className="text-[10px] text-white/50 mt-0.5">{displaySize} · {ext}</p>}
                                                                                </div>
                                                                            </div>
                                                                            {/* Actions */}
                                                                            <div className="flex border-t border-white/10 mt-1">
                                                                                {ext === 'PDF' && mediaUrl && (
                                                                                    <button 
                                                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-emerald-400 hover:bg-white/5 transition-colors rounded-bl-xl"
                                                                                        onClick={() => setDocPreview({ url: mediaUrl, name: filename, ext })}
                                                                                    >
                                                                                        <Eye className="h-3.5 w-3.5" />
                                                                                        Visualizar
                                                                                    </button>
                                                                                )}
                                                                                <a 
                                                                                    href={mediaUrl}
                                                                                    download={filename}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-blue-400 hover:bg-white/5 transition-colors ${ext === 'PDF' ? 'border-l border-white/10 rounded-br-xl' : 'rounded-b-xl'}`}
                                                                                >
                                                                                    <Download className="h-3.5 w-3.5" />
                                                                                    Baixar
                                                                                </a>
                                                                            </div>
                                                                            {msg.text && msg.text !== filename && msg.text !== 'Documento' && msg.text !== '📄 Documento' && (
                                                                                <p className="text-[12px] px-1 pt-1 leading-relaxed">{msg.text}</p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()
                                                            ) : (
                                                                <>
                                                                    <p className="leading-relaxed whitespace-pre-wrap pr-12">{typeof msg.text === 'string' ? msg.text : String(msg.text || '')}</p>

                                                                </>
                                                            )}

                                                            {/* Reações (WhatsApp Style) */}
                                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                                <div className={cn(
                                                                    "absolute -bottom-3 flex items-center gap-1 bg-[#202c33] border border-white/10 rounded-full py-0.5 px-2 shadow-lg z-20 animate-in zoom-in-50 duration-200",
                                                                    isOutbound ? "right-2" : "left-2"
                                                                )}>
                                                                    {Object.entries(msg.reactions).map(([participant, emoji]) => (
                                                                        <span key={participant} className="text-[10px]">
                                                                            {typeof emoji === 'string' ? emoji : String(emoji || '')}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <div className={cn(
                                                                "absolute bottom-1 right-2 flex items-center gap-1 opacity-70",
                                                                msg.type === 'sticker' ? "bg-black/20 px-1 rounded-sm text-white" : (isOutbound ? "text-white" : "text-white/70")
                                                            )}>
                                                                <span className="text-[9px] font-medium leading-none mt-1">
                                                                    {safeFormatDate(msg.timestamp, "HH:mm")}
                                                                </span>
                                                                {isOutbound && (
                                                                    <CheckCheck className="h-[14px] w-[14px]" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Message Input Box */}
                        <footer className="bg-muted/40 backdrop-blur-md border-t border-border/50 z-10 shrink-0 flex flex-col">
                            {/* Reply Preview */}
                            {replyingTo && (
                                <div className="px-4 py-2 bg-background/80 flex items-center justify-between border-b border-border/30 animate-in slide-in-from-bottom-2">
                                    <div className="flex-1 bg-muted/50 rounded-lg p-2 border-l-4 border-emerald-500 flex flex-col">
                                        <span className="text-xs font-bold text-emerald-600 mb-0.5">
                                            {replyingTo.direction === 'outbound' ? 'Você' : resolveSenderDisplay(replyingTo.sender || '')}
                                        </span>
                                        <p className="text-xs text-muted-foreground truncate line-clamp-1">{replyingTo.text || 'Mídia'}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-2" onClick={() => setReplyingTo(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <div className="p-3 md:p-4 max-w-4xl mx-auto flex items-center gap-2 px-1 w-full">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-border/50">
                                            <Smile className="h-5 w-5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="start" className="w-auto p-0 border-none bg-transparent shadow-none mb-2 ml-4">
                                        <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 bubble-emoji-picker">
                                            <EmojiPicker
                                                theme={Theme.DARK}
                                                emojiStyle={EmojiStyle.APPLE}
                                                onEmojiClick={(emojiData) => {
                                                    setNewMessage(prev => prev + emojiData.emoji);
                                                }}
                                                lazyLoadEmojis={true}
                                                searchPlaceholder="Procurar emoji..."
                                                width={350}
                                                height={450}
                                                skinTonesDisabled
                                                previewConfig={{
                                                    showPreview: false
                                                }}
                                                categories={[
                                                    { category: Categories.SUGGESTED, name: 'Recentes' },
                                                    { category: Categories.SMILEYS_PEOPLE, name: 'Sorrisos e Pessoas' },
                                                    { category: Categories.ANIMALS_NATURE, name: 'Animais e Natureza' },
                                                    { category: Categories.FOOD_DRINK, name: 'Comida e Bebida' },
                                                    { category: Categories.TRAVEL_PLACES, name: 'Viagens e Lugares' },
                                                    { category: Categories.ACTIVITIES, name: 'Atividades' },
                                                    { category: Categories.OBJECTS, name: 'Objetos' },
                                                    { category: Categories.SYMBOLS, name: 'Símbolos' },
                                                    { category: Categories.FLAGS, name: 'Bandeiras' },
                                                ]}
                                            />
                                            <style>{`
                                                .bubble-emoji-picker .epr-main {
                                                    border: none !important;
                                                    background-color: #233138 !important;
                                                    font-family: inherit !important;
                                                }
                                                /* Input de busca compacto */
                                                .bubble-emoji-picker .epr-search-container {
                                                    padding: 8px 10px !important;
                                                }
                                                .bubble-emoji-picker .epr-search {
                                                    background-color: #111b21 !important;
                                                    border: 1px solid #2a3942 !important;
                                                    color: #d1d7db !important;
                                                    border-radius: 8px !important;
                                                    padding: 5px 10px !important;
                                                    font-size: 13px !important;
                                                    height: 32px !important;
                                                }
                                                .bubble-emoji-picker .epr-search::placeholder {
                                                    color: #8696a0 !important;
                                                    font-size: 13px !important;
                                                }
                                                .bubble-emoji-picker .epr-search:focus {
                                                    border-color: #00a884 !important;
                                                    box-shadow: none !important;
                                                    outline: none !important;
                                                }
                                                /* Ícones de categoria menores */
                                                .bubble-emoji-picker .epr-category-nav {
                                                    padding: 4px 6px !important;
                                                    background-color: #233138 !important;
                                                    gap: 2px !important;
                                                }
                                                .bubble-emoji-picker .epr-category-nav > button.epr-cat-btn {
                                                    width: 28px !important;
                                                    height: 28px !important;
                                                    padding: 4px !important;
                                                }
                                                .bubble-emoji-picker .epr-category-nav > button.epr-cat-btn svg,
                                                .bubble-emoji-picker .epr-category-nav > button.epr-cat-btn img {
                                                    width: 16px !important;
                                                    height: 16px !important;
                                                }
                                                .bubble-emoji-picker .epr-cat-indicator {
                                                    background-color: #00a884 !important;
                                                    height: 2px !important;
                                                }
                                                .bubble-emoji-picker .epr-header-is-sticky .epr-search-container {
                                                    background-color: #233138 !important;
                                                }
                                                .bubble-emoji-picker .epr-emoji-category-label {
                                                    background-color: #233138 !important;
                                                    color: #8696a0 !important;
                                                    font-size: 12px !important;
                                                    font-weight: 500 !important;
                                                    padding: 6px 12px !important;
                                                    height: auto !important;
                                                }
                                                .bubble-emoji-picker .epr-body::-webkit-scrollbar {
                                                    width: 4px;
                                                }
                                                .bubble-emoji-picker .epr-body::-webkit-scrollbar-thumb {
                                                    background-color: rgba(255, 255, 255, 0.1);
                                                    border-radius: 10px;
                                                }
                                                .bubble-emoji-picker .epr-emoji:hover {
                                                    background-color: #3b4a54 !important;
                                                    border-radius: 8px !important;
                                                }
                                                .bubble-emoji-picker .epr-search-container input::-webkit-search-cancel-button {
                                                    display: none;
                                                }
                                            `}</style>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-border/50">
                                            <Paperclip className="h-5 w-5" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="start" className="w-[180px] p-2 bg-[#233138] border-[#2a3942] rounded-2xl shadow-xl mb-4 ml-4">
                                        <div className="flex flex-col gap-1">
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-white hover:bg-[#182229] hover:text-white group"
                                                onClick={() => docInputRef.current?.click()}
                                            >
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-t from-[#5157AE] to-[#5F66CD] flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                                    <FileText className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-[15px]">Documento</span>
                                            </Button>
                                            
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-white hover:bg-[#182229] hover:text-white group"
                                                onClick={() => mediaInputRef.current?.click()}
                                            >
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-t from-[#007AFC] to-[#0188FF] flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                                    <ImageIcon className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-[15px]">Fotos</span>
                                            </Button>
                                            
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-white hover:bg-[#182229] hover:text-white group"
                                                onClick={() => cameraInputRef.current?.click()}
                                            >
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-t from-[#D3396D] to-[#E53975] flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                                    <Camera className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-[15px]">Câmera</span>
                                            </Button>
                                            
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-white hover:bg-[#182229] hover:text-white group"
                                                onClick={() => audioInputRef.current?.click()}
                                            >
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-t from-[#D76725] to-[#F17721] flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                                    <Music className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-[15px]">Áudio</span>
                                            </Button>
                                            
                                            <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#182229] hover:text-white group" onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-t from-[#01A2CC] to-[#01B3E6] flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                                    <UserPlus className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-[15px]">Contato</span>
                                            </Button>
                                            
                                            <Button variant="ghost" className="w-full justify-start text-white hover:bg-[#182229] hover:text-white group" onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-t from-[#CDB43F] to-[#E5C945] flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                                    <BarChart3 className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-[15px]">Enquete</span>
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                <div className="flex-1 relative">
                                    <textarea
                                        placeholder="Digite uma mensagem..."
                                        className="w-full bg-background border border-border/60 focus-visible:ring-1 focus-visible:ring-emerald-500/50 rounded-2xl px-4 py-[10px] text-sm min-h-[44px] max-h-32 resize-none transition-all flex items-center shadow-sm"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                                setReplyingTo(null);
                                            }
                                        }}
                                        rows={1}
                                    />
                                </div>

                                <Button
                                    className={cn(
                                        "rounded-full h-11 w-11 p-0 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shrink-0 flex items-center justify-center",
                                        !newMessage.trim() || isSending ? "opacity-50" : "hover:scale-105 active:scale-95"
                                    )}
                                    disabled={!newMessage.trim() || isSending || waStatus !== 'open'}
                                    onClick={() => {
                                        handleSendMessage();
                                        setReplyingTo(null);
                                    }}
                                >
                                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-[18px] w-[18px]" />}
                                </Button>
                            </div>

                            {/* Hidden Inputs for Attachments */}
                            <input 
                                type="file" 
                                ref={docInputRef} 
                                className="hidden" 
                                onChange={handleFileUpload} 
                            />
                            <input 
                                type="file" 
                                ref={mediaInputRef} 
                                accept="image/*,video/*" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                            />
                            <input 
                                type="file" 
                                ref={cameraInputRef} 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                            />
                            <input 
                                type="file" 
                                ref={audioInputRef} 
                                accept="audio/*" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                            />
                        </footer>

                        {/* Selection Toolbar (Overlay) */}
                        {isSelecting && (
                            <div className="absolute bottom-0 left-0 right-0 h-[68px] bg-[#202c33] border-t border-emerald-500/30 flex items-center justify-between px-6 z-50 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10" onClick={() => { setIsSelecting(false); setSelectedMessages(new Set()); }}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                    <span className="text-sm font-black text-white tracking-tight">{selectedMessages.size} selecionadas</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button 
                                        variant="ghost" 
                                        className="text-white hover:bg-white/10 gap-2 h-10 px-4 font-bold rounded-xl transition-all"
                                        onClick={handleForwardSelected}
                                        disabled={selectedMessages.size === 0}
                                    >
                                        <CornerUpRight className="h-4 w-4" />
                                        <span className="hidden sm:inline">Encaminhar</span>
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        className="text-white hover:bg-destructive/20 hover:text-destructive gap-2 h-10 px-4 font-bold rounded-xl transition-all"
                                        onClick={handleDeleteSelected}
                                        disabled={selectedMessages.size === 0}
                                    >
                                        <Trash className="h-4 w-4" />
                                        <span className="hidden sm:inline">Apagar</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Details Sidebar (Desktop) */}
                    {showDetails && (
                        <aside className="hidden lg:flex flex-col w-[420px] border-l border-border/50 bg-background/80 backdrop-blur-xl animate-in slide-in-from-right duration-300 relative z-20">
                            <header className="px-6 py-[22px] border-b border-border/50 flex items-center justify-between shrink-0 bg-muted/10">
                                <h3 className="font-bold text-sm tracking-tight text-foreground/80">Detalhes da Conversa</h3>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setShowDetails(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </header>

                            <ScrollArea className="flex-1">
                                <div className="p-8 space-y-10 pb-20">
                                    {/* Perfil e Info */}
                                    <div className="flex flex-col items-center text-center space-y-5">
                                        <div className="relative group/avatar">
                                            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-primary rounded-full blur opacity-20 group-hover/avatar:opacity-40 transition-opacity duration-500" />
                                            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl relative transition-transform duration-500 group-hover/avatar:scale-105">
                                                <AvatarImage src={currentContactInfo?.imgUrl} />
                                                <AvatarFallback className="text-4xl font-black bg-emerald-500/10 text-emerald-600">
                                                    {selectedChat?.type === 'group' ? <Users className="h-14 w-14" /> : displaySelectedName.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div 
                                                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]"
                                                onClick={() => setPreviewImage(currentContactInfo?.imgUrl || null)}
                                            >
                                                <Maximize2 className="text-white h-8 w-8" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <h2 className="text-2xl font-black capitalize tracking-tight text-foreground">{displaySelectedName}</h2>
                                                {leadInfo && <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold">LEAD</Badge>}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 opacity-70">
                                                {selectedChat?.type === 'group' ? `GRUPO · ${currentMessages.length} MSGS` : formatWhatsAppNumber(selectedJid || '')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Lead Intelligence Box (CAPTU Exclusive) */}
                                    {leadInfo && (
                                        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 space-y-4 shadow-sm animate-in zoom-in-95 duration-500">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-primary flex items-center gap-2">
                                                    <Star className="h-3.5 w-3.5 fill-current" /> Inteligência do Lead
                                                </h4>
                                                <ScoreBadge score={leadInfo.score || 0} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Cidade</p>
                                                    <p className="text-xs font-bold truncate">{leadInfo.city || 'N/A'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Status</p>
                                                    <StatusBadge status={leadInfo.status || 'new'} />
                                                </div>
                                                <div className="col-span-2 space-y-1 pt-2 border-t border-primary/10">
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Abordagem Sugerida</p>
                                                    <p className="text-[11px] font-medium leading-relaxed italic opacity-80">
                                                        "Lead {leadInfo.segment || 'qualificado'} com bom score comercial."
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <Separator className="bg-border/30" />

                                    {/* Participantes (SÓ PARA GRUPO) */}
                                    {selectedChat?.type === 'group' && (
                                        <div className="space-y-5">
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                    <Users className="h-3 w-3" /> Participantes
                                                </h4>
                                                <span className="text-[9px] font-bold bg-muted px-2 py-0.5 rounded-full opacity-70">{groupParticipants.length || '...'}</span>
                                            </div>
                                            
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-none">
                                                {groupParticipants.length > 0 ? (
                                                    groupParticipants.slice(0, 10).map(p => {
                                                        const pJid = typeof p === 'string' ? p : p.id;
                                                        const pName = resolveSenderDisplay(pJid);
                                                        return (
                                                            <div key={pJid} className="flex items-center gap-3 group/p">
                                                                <Avatar className="h-8 w-8 border border-border/50 shrink-0 transition-transform group-hover/p:scale-110">
                                                                    <AvatarFallback className="text-[10px] font-bold bg-muted">
                                                                        {pName.substring(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold truncate text-foreground/90">{pName}</p>
                                                                    <p className="text-[9px] text-muted-foreground font-medium truncate opacity-60">
                                                                        {p.admin ? 'Administrador' : formatWhatsAppNumber(pJid)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                            ) : (
                                                    <p className="text-[10px] text-muted-foreground italic text-center py-4 opacity-50">Sincronizando participantes...</p>
                                                )}
                                                {groupParticipants.length > 10 && (
                                                    <Button variant="ghost" className="w-full text-[9px] font-bold uppercase tracking-widest text-primary/60">
                                                        + {groupParticipants.length - 10} outros
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedChat?.type === 'group' && <Separator className="bg-border/30" />}

                                    {/* Galeria de Mídia */}
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <ImageIcon className="h-3 w-3" /> Mídia da conversa
                                            </h4>
                                            <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{chatMedia.length}</span>
                                        </div>
                                        
                                        {chatMedia.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-3">
                                                {chatMedia.slice(0, 9).map(m => (
                                                    <div 
                                                        key={m.id} 
                                                        className="aspect-square relative rounded-xl overflow-hidden bg-muted cursor-zoom-in group/media shadow-sm border border-border/10"
                                                        onClick={() => setPreviewImage(m.mediaUrl || null)}
                                                    >
                                                        <img 
                                                            src={m.mediaUrl} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-125" 
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3342/3342137.png";
                                                                (e.target as HTMLImageElement).classList.add('opacity-30', 'p-4');
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity flex items-end p-2">
                                                            <Maximize2 className="text-white h-3 w-3" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                                            ) : (
                                            <div className="py-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border/50 flex flex-col items-center gap-3">
                                                <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">Vazio</p>
                                            </div>
                                        )}
                                        
                                        {chatMedia.length > 9 && (
                                            <Button variant="outline" className="w-full h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest border-border/50 hover:bg-muted transition-all">
                                                Ver galeria completa
                                            </Button>
                                        )}
                                    </div>

                                    {/* Links */}
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <Globe className="h-3 w-3" /> Links rápidos
                                            </h4>
                                            <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full">{chatLinks.length}</span>
                                        </div>
                                        {chatLinks.length > 0 ? (
                                            <div className="space-y-3">
                                                {chatLinks.slice(0, 4).map(m => {
                                                    const url = m.text?.match(/(https?:\/\/[^\s]+)/)?.[0];
                                                    return (
                                                        <a 
                                                            key={m.id} 
                                                            href={url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-4 bg-muted/20 hover:bg-muted/40 rounded-2xl border border-border/50 transition-all group block shadow-sm hover:shadow-md"
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                                    <ExternalLink className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black truncate text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                        {getHostname(url)}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-widest opacity-60">
                                                                        {safeFormatDate(m.timestamp, 'dd MMM yyyy', { locale: ptBR })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </a>
                                                    )
                                                })}
                                            </div>
                                                            ) : (
                                            <div className="py-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/30">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-30 italic">Sem links</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mensagens Favoritas */}
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500/20" /> Mensagem Estrela
                                            </h4>
                                            <span className="text-[9px] font-bold bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">{chatFavorites.length}</span>
                                        </div>
                                        {chatFavorites.length > 0 ? (
                                            <div className="space-y-3">
                                                {chatFavorites.map(m => (
                                                    <div key={m.id} className="p-4 bg-yellow-500/5 hover:bg-yellow-500/10 rounded-2xl border border-yellow-500/20 transition-all group shadow-sm">
                                                        <div className="flex items-start gap-4">
                                                            <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 border border-yellow-500/20">
                                                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs italic leading-relaxed text-foreground/80 line-clamp-3">"{m.text}"</p>
                                                                <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase opacity-60">
                                                                    {resolveSenderDisplay(m.sender || '')} · {safeFormatDate(m.timestamp, 'dd MMM')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                                            ) : (
                                            <div className="py-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border/50 flex flex-col items-center gap-3">
                                                <Star className="h-8 w-8 text-muted-foreground/20" />
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">Nenhuma favorita</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Documentos */}
                                    <div className="space-y-5 pb-10">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <FileText className="h-3 w-3" /> Documentos & PDF
                                            </h4>
                                            <span className="text-[9px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">{chatDocs.length}</span>
                                        </div>
                                        {chatDocs.length > 0 ? (
                                            <div className="space-y-3">
                                                {chatDocs.slice(0, 4).map(m => (
                                                    <a 
                                                        key={m.id} 
                                                        href={m.mediaUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-4 bg-muted/20 hover:bg-muted/40 rounded-2xl border border-border/50 transition-all group flex items-center justify-between shadow-sm hover:ring-1 hover:ring-red-500/50"
                                                    >
                                                        <div className="flex items-center gap-4 truncate">
                                                            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all">
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-xs font-black truncate leading-tight group-hover:text-foreground transition-colors">{m.text || 'Documento PDF'}</p>
                                                                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter opacity-70">
                                                                    {safeFormatDate(m.timestamp, 'dd MMMM yyyy', { locale: ptBR })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                    </a>
                                                ))}
                                            </div>
                                                            ) : (
                                            <div className="py-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/30">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-30 italic">Sem arquivos</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </aside>
                    )}
                </div>

                {/* Mobile Sheet Support for Details */}
                <Sheet open={showDetails && window.innerWidth < 1024} onOpenChange={setShowDetails}>
                    <SheetContent side="right" className="w-full sm:w-[450px] p-0 border-l border-border/50 bg-background overflow-hidden">
                        {/* Simplesmente replica o header para o Sheet Content */}
                        <div className="flex flex-col h-full bg-background">
                            <SheetHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center justify-between shrink-0 bg-muted/10 space-y-0 text-left">
                                <SheetTitle className="text-sm font-bold">Dados da conversa</SheetTitle>
                                <Button variant="ghost" size="icon" className="h-9 w-9 p-0 rounded-full" onClick={() => setShowDetails(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </SheetHeader>
                            <ScrollArea className="flex-1">
                                {/* O conteúdo aqui pode ser um componente extraído, mas vou colocar o essencial */}
                                <div className="p-8 space-y-10">
                                     <div className="flex flex-col items-center text-center space-y-4">
                                        <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
                                            <AvatarImage src={currentContactInfo?.imgUrl} />
                                            <AvatarFallback className="text-3xl font-black bg-emerald-500/10 text-emerald-600">
                                                {selectedChat?.type === 'group' ? <Users className="h-12 w-12" /> : displaySelectedName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h2 className="text-2xl font-black">{displaySelectedName}</h2>
                                            <p className="text-xs text-muted-foreground font-bold uppercase mt-1 tracking-widest">
                                                {selectedChat?.type === 'individual' ? formatWhatsAppNumber(selectedJid || '') : 'Grupo de Clientes'}
                                            </p>
                                        </div>
                                     </div>
                                     <Separator className="bg-border/30" />
                                     {/* Lead Info Simple */}
                                     {leadInfo && (
                                         <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20">
                                             <div className="flex justify-between items-center mb-4">
                                                 <Badge className="bg-primary text-white">Lead Ativo</Badge>
                                                 <ScoreBadge score={leadInfo.score || 0} />
                                             </div>
                                             <div className="space-y-3">
                                                 <p className="text-sm font-bold">{leadInfo.segment || 'Nicho Comercial'}</p>
                                                 <p className="text-xs text-muted-foreground italic">"Lead sincronizado com o Pipeline de Vendas."</p>
                                             </div>
                                         </div>
                                     )}
                                     
                                     {/* Mídia Grid */}
                                     <div className="space-y-4">
                                         <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Galeria de Mídia</h4>
                                         <div className="grid grid-cols-3 gap-2">
                                             {chatMedia.slice(0, 6).map(m => (
                                                 <img 
                                                     key={m.id} 
                                                     src={m.mediaUrl} 
                                                     className="aspect-square rounded-xl object-cover bg-muted" 
                                                     onClick={() => setPreviewImage(m.mediaUrl || null)}
                                                     onError={(e) => (e.target as HTMLImageElement).classList.add('hidden')}
                                                 />
                                             ))}
                                         </div>
                                     </div>

                                     {/* Mensagens Favoritas */}
                                     <div className="space-y-4">
                                         <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                             <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500/20" /> Mensagens Estrela
                                         </h4>
                                         {chatFavorites.length > 0 ? (
                                             <div className="space-y-3">
                                                 {chatFavorites.map(m => (
                                                     <div key={m.id} className="p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/20 shadow-sm">
                                                         <p className="text-xs italic text-foreground/80 line-clamp-2">"{m.text}"</p>
                                                     </div>
                                                 ))}
                                             </div>
                                                            ) : (
                                             <p className="text-[10px] text-muted-foreground italic px-2">Nenhuma mensagem favoritada</p>
                                         )}
                                     </div>
                                </div>
                            </ScrollArea>
                        </div>
                    </SheetContent>
                </Sheet>
                </>
                                                            ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-fade-in bg-muted/10">
                        <div className="w-48 h-48 mx-auto flex flex-col items-center justify-center opacity-80 gap-6">
                            <img src="https://cdn-icons-png.flaticon.com/512/3670/3670051.png" alt="WhatsApp Web Logo" className="w-24 h-24 filter drop-shadow-lg opacity-70 saturate-0" />
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-light text-muted-foreground">WhatsApp Proxy</h2>
                                <p className="text-muted-foreground/60 text-xs px-8">Suas mensagens agora são renderizadas diretamente do aparelho, sem guardar no banco de dados.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu Personalizado */}
            {contextMenu?.visible && (
                <div 
                    className="fixed z-50 min-w-[200px] bg-background border border-border shadow-2xl rounded-xl py-1.5 animate-in fade-in zoom-in-95 duration-100 ease-out"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                        onClick={() => {
                            setIsSelecting(true);
                            setSelectedMessages(new Set());
                            setContextMenu(null);
                        }}
                    >
                        <CheckSquare className="h-4 w-4 text-emerald-500" />
                        Selecionar mensagens
                    </button>
                    <button 
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-destructive/10 hover:text-destructive flex items-center gap-3 transition-colors text-foreground/90 font-medium group"
                        onClick={() => {
                            setSelectedJid(null);
                            setContextMenu(null);
                        }}
                    >
                        <X className="h-4 w-4 text-destructive/70 group-hover:text-destructive" />
                        Fechar conversa
                    </button>
                </div>
            )}

            {/* Context Menu das Mensagens */}
            {msgContextMenu?.visible && msgContextMenu.msg && (
                <div 
                    className="fixed z-[60] w-[260px] bg-background border border-border shell-app-blur shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ease-out"
                    style={{ 
                        top: Math.min(msgContextMenu.y, window.innerHeight - 350), 
                        left: Math.min(msgContextMenu.x, window.innerWidth - 270) 
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Emojis Reações Rápidas */}
                    <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border/50">
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                            <button 
                                key={emoji} 
                                className="text-xl hover:scale-125 transition-transform origin-bottom"
                                onClick={() => {
                                    handleReact(msgContextMenu.msg!, emoji);
                                    setMsgContextMenu(null);
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                        <button className="text-xl hover:scale-125 transition-transform opacity-50 text-muted-foreground mr-1">
                            +
                        </button>
                    </div>

                    <div className="py-1">
                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                            onClick={() => {
                                setReplyingTo(msgContextMenu.msg);
                                setMsgContextMenu(null);
                            }}
                        >
                            <CornerUpLeft className="h-4 w-4 text-muted-foreground" />
                            Responder
                        </button>

                        {msgContextMenu.isGroup && msgContextMenu.msg.direction !== 'outbound' && (
                            <button 
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                                onClick={() => {
                                    toast.info("Abre chat particular com " + resolveSenderDisplay(msgContextMenu.msg?.sender || ''));
                                    setMsgContextMenu(null);
                                }}
                            >
                                <Lock className="h-4 w-4 text-muted-foreground" />
                                Responder em particular
                            </button>
                        )}

                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                            onClick={() => {
                                navigator.clipboard.writeText(msgContextMenu.msg?.text || '');
                                toast.success("Mensagem copiada");
                                setMsgContextMenu(null);
                            }}
                        >
                            <Copy className="h-4 w-4 text-muted-foreground" />
                            Copiar
                        </button>
                        
                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                            onClick={() => { handleForwardMessage(msgContextMenu.msg!); setMsgContextMenu(null); }}
                        >
                            <CornerUpRight className="h-4 w-4 text-muted-foreground" />
                            Encaminhar
                        </button>
                        
                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                            onClick={() => { handlePin(msgContextMenu.msg!); setMsgContextMenu(null); }}
                        >
                            <Pin className={cn("h-4 w-4", pinnedMessages[selectedJid!]?.has(msgContextMenu.msg!.id) ? "text-emerald-500 fill-emerald-500/20" : "text-muted-foreground")} />
                            {pinnedMessages[selectedJid!]?.has(msgContextMenu.msg!.id) ? "Desafixar" : "Fixar"}
                        </button>

                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                            onClick={() => { handleFavorite(msgContextMenu.msg!); setMsgContextMenu(null); }}
                        >
                            <Star className={cn("h-4 w-4", favoritedMessages[selectedJid!]?.has(msgContextMenu.msg!.id) ? "text-yellow-500 fill-yellow-500/20" : "text-muted-foreground")} />
                            {favoritedMessages[selectedJid!]?.has(msgContextMenu.msg!.id) ? "Desfavoritar" : "Favoritar"}
                        </button>

                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                            onClick={() => { 
                                setIsSelecting(true);
                                setSelectedMessages(new Set([msgContextMenu.msg!.id]));
                                setMsgContextMenu(null); 
                            }}
                        >
                            <CheckSquare className="h-4 w-4 text-emerald-500" />
                            Selecionar
                        </button>
                        <Separator className="my-1 bg-border/50" />

                        <button 
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-destructive/10 hover:text-destructive flex items-center gap-3 transition-colors text-foreground/90 font-medium"
                            onClick={() => {
                                handleDeleteMessage(msgContextMenu.msg!);
                                setMsgContextMenu(null);
                            }}
                        >
                            <Trash className="h-4 w-4 text-destructive/70" />
                            Apagar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Conexão (Inalterado/Minimalista) */}
            <Dialog open={isWaModalOpen} onOpenChange={setIsWaModalOpen}>
                <DialogContent className="sm:max-w-md border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-center font-black text-2xl tracking-tight">
                            {waStatus === 'open' ? 'Dispositivo Conectado' : 'Vincular dispositivo'}
                        </DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground">
                            {waStatus === 'open' 
                                ? 'Seu WhatsApp está pronto para uso. Você pode desconectar a qualquer momento.'
                                : 'Escaneie o QR Code abaixo para exibir suas conversas na memória. Nenhuma mensagem será salva.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-6 space-y-6">
                        {waStatus === 'open' ? (
                            <div className="w-full space-y-6 animate-in fade-in zoom-in duration-500">
                                <div className="w-40 h-40 mx-auto flex items-center justify-center bg-emerald-500/10 rounded-full border-4 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                    <CheckCheck className="w-16 h-16 text-emerald-500 animate-bounce" />
                                </div>
                                <div className="text-center">
                                    <Badge className="bg-emerald-500/10 text-emerald-600 mb-6 border-emerald-500/20 px-6 py-2 text-md font-bold">
                                        Instância Ativa e Pronta
                                    </Badge>
                                    <Button 
                                        variant="destructive" 
                                        className="w-full font-bold gap-2 h-12 shadow-lg"
                                        onClick={handleWaLogout}
                                        disabled={isDisconnecting}
                                    >
                                        {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                        Sair e Desconectar Dispositivo
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full space-y-6">
                                {waStatus === 'syncing' ? (
                                    <div className="text-center w-full space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="relative w-32 h-32 mx-auto">
                                            <div className="absolute inset-0 rounded-full border-8 border-primary/5" />
                                            <div 
                                                className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent animate-spin" 
                                                style={{ animationDuration: '2s' }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-3xl font-black text-primary leading-none">
                                                        {syncPercentage || 5}%
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Status</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4 px-8">
                                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/10">
                                                <div 
                                                    className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.6)]"
                                                    style={{ width: `${syncPercentage || 5}%` }}
                                                />
                                            </div>
                                            
                                            <div className="flex flex-col gap-2 items-center">
                                                <Badge variant="outline" className="px-5 py-2 border-primary/20 bg-primary/5 text-primary font-bold text-[11px] tracking-widest uppercase animate-pulse">
                                                    {syncPercentage >= 95 ? 'FINALIZANDO PROTOCOLO' : syncStage}
                                                </Badge>
                                                <p className="text-[11px] text-muted-foreground font-medium italic opacity-70">
                                                    {syncPercentage >= 95 
                                                        ? 'Aguardando sinal verde do seu celular...' 
                                                        : 'Sincronizando conversas do aparelho...'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        {waQr ? (
                                            <div className="p-5 bg-white rounded-3xl mx-auto w-fit shadow-xl border border-border/40">
                                                <img src={waQr} alt="QR Code" className="w-56 h-56" />
                                            </div>
                                        ) : (
                                            <div className="w-56 h-56 mx-auto flex items-center justify-center bg-muted/30 rounded-2xl border-2 border-dashed border-border/50">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                    <span className="text-[11px] font-bold text-muted-foreground">GERANDO QR CODE</span>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                                            {waStatus === 'connecting' ? 'Iniciando Conexão...' : 'Aguardando Leitura do WhatsApp'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {/* Modal de Preview de Imagem (Lightbox Profissional) */}
            <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                <DialogContent className="max-w-[95vw] md:max-w-[80vw] h-auto p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden">
                    <DialogTitle className="sr-only">Visualização de Imagem</DialogTitle>
                    {previewImage && (
                        <div className="relative group max-w-fit flex items-center justify-center">
                            <img 
                                src={previewImage} 
                                alt="Visualização Completa" 
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
                            />
                            <div className="absolute top-8 right-8 flex items-center gap-2 z-50">
                                <a 
                                    href={previewImage} 
                                    download="imagem.jpg"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-8 w-8 bg-black/40 hover:bg-emerald-500/60 text-white rounded-full transition-all border border-white/20 flex items-center justify-center"
                                    title="Baixar Imagem"
                                >
                                    <Download className="h-4 w-4" />
                                </a>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="bg-black/40 hover:bg-red-500/60 text-white rounded-full transition-all border border-white/20 h-8 w-8"
                                    onClick={() => setPreviewImage(null)}
                                    title="Fechar"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Document Viewer Modal */}
            <Dialog 
                open={!!docPreview} 
                onOpenChange={(open) => {
                    if (!open) setDocPreview(null);
                }}
            >
                <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-[#0b141a] border-[#202c33] flex flex-col overflow-hidden [&>button]:hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#202c33] border-b border-white/5 shrink-0 z-10">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-[10px]"
                                style={{ backgroundColor: docPreview ? getDocIconColor(docPreview.ext) : '#607d8b' }}
                            >
                                {docPreview?.ext}
                            </div>
                            <h2 className="text-white text-sm font-medium line-clamp-1">{docPreview?.name}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <a 
                                href={docPreview?.url} 
                                download={docPreview?.name}
                                target="_blank"
                                rel="noreferrer"
                                className="h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                title="Baixar"
                            >
                                <Download className="h-5 w-5" />
                            </a>
                            <button 
                                onClick={() => setDocPreview(null)}
                                className="h-9 w-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-2"
                                title="Fechar"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content (PDF vs Others) */}
                    <div className="flex-1 bg-[#0b141a] relative flex items-center justify-center overflow-hidden">
                        {docPreview?.ext === 'PDF' ? (
                            <iframe 
                                src={docPreview.url} 
                                className="w-full h-full border-none"
                                title={docPreview.name}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 max-w-sm text-center">
                                <div 
                                    className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center font-bold text-white text-xl mb-6 shadow-xl"
                                    style={{ backgroundColor: docPreview ? getDocIconColor(docPreview.ext) : '#607d8b' }}
                                >
                                    <FileText className="h-10 w-10 text-white/80 mb-1" />
                                    {docPreview?.ext}
                                </div>
                                <h3 className="text-white font-medium text-lg mb-2">{docPreview?.name}</h3>
                                <p className="text-white/50 text-sm mb-6">Nenhuma pré-visualização disponível para este formato de arquivo.</p>
                                <a 
                                    href={docPreview?.url} 
                                    download={docPreview?.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    Baixar Arquivo
                                </a>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
