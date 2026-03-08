import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Search,
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
    Pin
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { WA_API_URL } from "@/config";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
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
}

interface ProxyChat {
    id: string; // JID
    name?: string; // Nome derivado (contato > pushName > JID)
    lastMessage?: string;
    lastMessageSender?: string; // PushName de quem mandou a última msgs no grupo
    lastMessageTime?: number;
    pinned?: number; // Timestamp se for fixado
    unreadCount: number;
    type: 'individual' | 'group' | 'community';
}

// ─── Funções Auxiliares ─────────────────────────────────────────────────────

function extractTextFromWhatsAppMessage(msg: any): string {
    if (!msg.message) return "";
    
    const messageContent = msg.message;
    let text = messageContent?.conversation ||
           messageContent?.extendedTextMessage?.text ||
           messageContent?.imageMessage?.caption ||
           messageContent?.videoMessage?.caption ||
           messageContent?.templateButtonReplyMessage?.selectedId ||
           messageContent?.buttonsResponseMessage?.selectedDisplayText ||
           messageContent?.listResponseMessage?.title || "";

    if (messageContent?.imageMessage) return `📷 ${text || 'Foto'}`;
    if (messageContent?.videoMessage) return `🎥 ${text || 'Vídeo'}`;
    if (messageContent?.audioMessage) return `🎤 Áudio`;
    if (messageContent?.documentMessage) return `📄 Documento`;
    if (messageContent?.stickerMessage) return `🏷️ Figurinha`;
    if (messageContent?.locationMessage) return `📍 Localização`;
    if (messageContent?.contactMessage || messageContent?.contactsArrayMessage) return `👤 Contato`;
    if (messageContent?.pollCreationMessage) return `📊 Enquete`;
    if (messageContent?.reactionMessage) return `❤️ Reação`;
    
    return text || (messageContent?.protocolMessage ? 'Mensagem de Sistema' : '');
}

export default function ChatPage() {
    const [searchParams] = useSearchParams();
    const [selectedJid, setSelectedJid] = useState<string | null>(searchParams.get("leadId"));
    
    // Estados do Proxy (In-Memory Database)
    const [chats, setChats] = useState<Record<string, ProxyChat>>({});
    const [messagesByChat, setMessagesByChat] = useState<Record<string, ProxyMessage[]>>({});
    const [contacts, setContacts] = useState<Record<string, ProxyContact>>({});

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

    // Estados para Progresso Atômico 6.0
    const [syncPercentage, setSyncPercentage] = useState(0);
    const [syncStage, setSyncStage] = useState<string>("Iniciando...");

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Função centralizada para processar histórico de mensagens/chats/contatos
    const processHistory = (payload: any, localLidMap: Record<string, string>) => {
        const { chats: rawChats, messages: rawMessages, contacts: rawContacts } = payload;
        
        const contactsMap: Record<string, ProxyContact> = {};
        if (rawContacts) {
            rawContacts.forEach((c: any) => {
                const id = c.id;
                const name = c.name || c.notify || c.verifiedName || id.split('@')[0];
                contactsMap[id] = { id, name, pushName: c.notify, imgUrl: c.imgUrl };
                if (c.lid) {
                    localLidMap[c.lid] = id;
                    contactsMap[c.lid] = { id, name, pushName: c.notify, imgUrl: c.imgUrl };
                }
            });
        }
        setContacts(prev => ({ ...prev, ...contactsMap }));

        const messagesMap: Record<string, ProxyMessage[]> = {};
        if (rawMessages) {
            rawMessages.forEach((msg: any) => {
                if (!msg.key || !msg.key.remoteJid) return;
                let jid = msg.key.remoteJid;
                jid = localLidMap[jid] || jid;
                const text = extractTextFromWhatsAppMessage(msg);
                if (!text) return;
                const proxyMsg: ProxyMessage = {
                    id: msg.key.id,
                    text: text,
                    direction: msg.key.fromMe ? 'outbound' : 'inbound',
                    timestamp: msg.messageTimestamp ? (typeof msg.messageTimestamp === 'object' ? Number(msg.messageTimestamp.low || 0) * 1000 : Number(msg.messageTimestamp) * 1000) : Date.now(),
                    status: 'delivered',
                    sender: msg.key.participant || jid
                };
                if (!messagesMap[jid]) messagesMap[jid] = [];
                messagesMap[jid].push(proxyMsg);
            });
        }
        setMessagesByChat(prev => ({ ...prev, ...messagesMap }));

        const chatsMap: Record<string, ProxyChat> = {};
        if (rawChats) {
            rawChats.forEach((chat: any) => {
                let jid = chat.id;
                jid = localLidMap[jid] || jid;
                const type = jid.endsWith('@g.us') ? 'group' : jid.endsWith('@newsletter') ? 'community' : 'individual';
                const contactName = contactsMap[jid]?.name || chat.name || chat.verifiedName || jid.split('@')[0];
                const jidMsgs = messagesMap[jid];
                const lastMsgObj = jidMsgs && jidMsgs.length > 0 ? jidMsgs[jidMsgs.length - 1] : null;
                const lastText = lastMsgObj ? lastMsgObj.text : '';
                
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
                    lastMessage: lastText,
                    lastMessageSender: lastMessageSender,
                    lastMessageTime: lastTime,
                    pinned: chat.pinned ? Number(chat.pinned) : 0,
                    unreadCount: chat.unreadCount || 0,
                    type: type as any
                };
            });
        }
        setChats(prev => ({ ...prev, ...chatsMap }));
    };

    const lidMapRef = useRef<Record<string, string>>({});

    const fetchHistory = async () => {
        try {
            const resHistory = await fetch(`${WA_API_URL}/api/chat/history`);
            if (resHistory.ok) {
                const historicalData = await resHistory.json();
                if (historicalData && historicalData.chats) {
                    processHistory(historicalData, lidMapRef.current);
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
                const resStatus = await fetch(`${WA_API_URL}/api/chat/status`);
                if (resStatus.ok) {
                    const data = await resStatus.json();
                    if (data.connection) setWaStatus(data.connection);
                    if (data.qr) setWaQr(data.qr);
                    if (data.isPaired !== undefined) setIsPaired(!!data.isPaired);
                    if (data.syncPercentage !== undefined) setSyncPercentage(data.syncPercentage);
                    if (data.connection === 'open') {
                        setIsSyncing(false);
                        if (data.syncPercentage === 100) setSyncPercentage(100);
                        fetchHistory(); // Busca imediata se já estiver aberto
                    }
                }

                // 2. Histórico (Carregamento do cache persistente se houver)
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
        const localLidMap: Record<string, string> = {};

        channel
            .on('broadcast', { event: 'connection-update' }, ({ payload }) => {
                const { connection, qr, isPaired } = payload;
                setWaStatus(connection);
                setWaQr(qr);
                setIsPaired(!!isPaired);

                if (connection === 'open') {
                    setIsSyncing(false);
                    fetchHistory(); // Busca via HTTP (Confiável para pacotes grandes)
                }

                if (connection === 'close') {
                    setChats({});
                    setMessagesByChat({});
                    setContacts({});
                    setSelectedJid(null);
                    setIsSyncing(true);
                    setSyncPercentage(0);
                    setSyncStage("Conectando...");
                    for (const key in localLidMap) delete localLidMap[key];
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
            })
            .on('broadcast', { event: 'history' }, ({ payload }) => {
                // Fallback para pacotes menores
                processHistory(payload, lidMapRef.current);
                setIsSyncing(false);
            })
            .on('broadcast', { event: 'new-message' }, ({ payload: msg }) => {
                if (!msg.key || !msg.key.remoteJid) return;
                let jid = msg.key.remoteJid;
                jid = localLidMap[jid] || jid;
                const text = extractTextFromWhatsAppMessage(msg);
                if (!text) return;
                const isOutbound = msg.key.fromMe;
                const timestamp = msg.messageTimestamp ? (typeof msg.messageTimestamp === 'object' ? Number(msg.messageTimestamp.low || 0) * 1000 : Number(msg.messageTimestamp) * 1000) : Date.now();
                const proxyMsg: ProxyMessage = {
                    id: msg.key.id,
                    text: text,
                    direction: isOutbound ? 'outbound' : 'inbound',
                    timestamp: timestamp,
                    status: 'delivered',
                    sender: msg.key.participant || jid
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
                        const senderJid = msg.key.participant || '';
                        const senderContact = contacts[senderJid];
                        senderName = msg.pushName || senderContact?.pushName || senderContact?.name || senderJid.split('@')[0] || '';
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
            .on('broadcast', { event: 'contacts-upsert' }, ({ payload: newContacts }) => {
                const updates: Record<string, ProxyContact> = {};
                newContacts.forEach((c: any) => {
                    const id = c.id;
                    const name = c.name || c.notify;
                    updates[id] = { id, name, pushName: c.notify };
                    if (c.lid) {
                        localLidMap[c.lid] = id;
                        updates[c.lid] = { id, name, pushName: c.notify };
                    }
                });
                setContacts(prev => ({ ...prev, ...updates }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // A busca de fotos agora é feita de forma atômica no BACKEND durante o sync inicial
    // para garantir o carregamento instantâneo no frontend



    // ─── Efeitos de UI ────────────────────────────────────────────────────────

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messagesByChat, selectedJid]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedJid || isSending || waStatus !== 'open') return;

        setIsSending(true);
        try {
            const response = await fetch(`${WA_API_URL}/api/chat/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    leadId: "proxy-bypass", // Ignorado no backend proxy
                    phone: selectedJid,
                    message: newMessage.trim()
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
                status: 'sent'
            };
            
            setMessagesByChat(prev => ({
                ...prev,
                [selectedJid]: [...(prev[selectedJid] || []), proxyMsg]
            }));

        } catch (error: any) {
            toast.error("Erro ao enviar", { description: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            const response = await fetch(`${WA_API_URL}/api/chat/disconnect`, { method: "POST" });
            if (!response.ok) throw new Error("Erro ao desconectar");
            toast.success("Sessão do WhatsApp encerrada e tela limpa!");
        } catch (error: any) {
            toast.error("Erro ao desconectar", { description: error.message });
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
                                                <AvatarImage src={contact?.imgUrl} />
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
                                                    {chat.lastMessageTime ? format(new Date(chat.lastMessageTime), "HH:mm") : ""}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className={cn("text-[8px] px-1 py-0 h-4 uppercase tracking-widest", 
                                                    chat.type === 'group' ? "border-indigo-500/30 text-indigo-500" :
                                                    chat.type === 'community' ? "border-amber-500/30 text-amber-500" :
                                                    "border-muted")}>
                                                    {chat.type === 'group' ? 'Grupo' : chat.type === 'community' ? 'Comunidade' : 'Contato'}
                                                </Badge>
                                            </div>

                                            <p className="text-xs text-muted-foreground truncate line-clamp-1">
                                                {chat.type === 'group' && chat.lastMessageSender && (
                                                    <span className="text-emerald-600/70 font-medium mr-1">~ {chat.lastMessageSender}:</span>
                                                )}
                                                {chat.lastMessage || "Toque para ver..."}
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
                        {/* Chat Header */}
                        <header className="px-4 md:px-6 py-3 flex items-center justify-between bg-muted/30 backdrop-blur-md border-b border-border/50 z-10 shrink-0">
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
                                    <AvatarImage src={currentContactInfo?.imgUrl} />
                                    <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold">
                                        {selectedChat?.type === 'group' ? <Users className="h-4 w-4" /> : displaySelectedName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="font-bold text-sm leading-tight">{displaySelectedName}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                                            {selectedJid.split('@')[0]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Messages List em RAM */}
                        <div className="flex-1 overflow-hidden flex flex-col pt-4">
                            <ScrollArea className="flex-1 px-4 md:px-6 pb-6" ref={scrollRef}>
                                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                                    {currentMessages.length === 0 ? (
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
                                            const showDate = idx === 0 || format(new Date(currentMessages[idx - 1].timestamp), 'yyyy-MM-dd') !== format(new Date(msg.timestamp), 'yyyy-MM-dd');

                                            return (
                                                <div key={msg.id} className="w-full flex flex-col">
                                                    {showDate && (
                                                        <div className="flex justify-center my-4">
                                                            <span className="px-3 py-1 rounded-full bg-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shadow-sm">
                                                                {format(new Date(msg.timestamp), "d 'de' MMMM", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className={cn("flex w-full", isOutbound ? "justify-end" : "justify-start")}>
                                                        <div className={cn(
                                                            "relative max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-[14px] text-sm group",
                                                            isOutbound
                                                                ? "bg-[#005c4b] text-white rounded-tr-sm shadow-sm"
                                                                : "bg-[#202c33] text-white rounded-tl-sm shadow-sm"
                                                        )}>
                                                            <p className="leading-relaxed whitespace-pre-wrap pr-12">{msg.text}</p>

                                                            <div className={cn(
                                                                "absolute bottom-1 right-2 flex items-center gap-1 opacity-70",
                                                                isOutbound ? "text-white" : "text-white/70"
                                                            )}>
                                                                <span className="text-[9px] font-medium leading-none mt-1">
                                                                    {format(new Date(msg.timestamp), "HH:mm")}
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
                        <footer className="p-3 md:p-4 bg-muted/40 backdrop-blur-md border-t border-border/50 z-10 shrink-0">
                            <div className="max-w-4xl mx-auto flex items-center gap-2 px-1">
                                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-border/50">
                                    <Smile className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-border/50">
                                    <Paperclip className="h-5 w-5" />
                                </Button>

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
                                    onClick={handleSendMessage}
                                >
                                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-[18px] w-[18px] ml-1" />}
                                </Button>
                            </div>
                        </footer>
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

            {/* Modal de Conexão (Inalterado/Minimalista) */}
            <Dialog open={isWaModalOpen} onOpenChange={setIsWaModalOpen}>
                <DialogContent className="sm:max-w-md border-border/50 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-center font-black text-2xl tracking-tight">Vincular dispositivo</DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground">
                            Escaneie o QR Code abaixo para exibir suas conversas na memória. Nenhuma mensagem será salva.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-6 space-y-6">
                        {waStatus === 'open' && syncPercentage === 100 ? (
                            <div className="w-full space-y-6 animate-in fade-in zoom-in duration-500">
                                <div className="w-40 h-40 mx-auto flex items-center justify-center bg-emerald-500/10 rounded-full border-4 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                    <CheckCheck className="w-16 h-16 text-emerald-500 animate-bounce" />
                                </div>
                                <div className="text-center">
                                    <Badge className="bg-emerald-500/10 text-emerald-600 mb-6 border-emerald-500/20 px-6 py-2 text-md font-bold">
                                        Sincronizado com sucesso!
                                    </Badge>
                                    <Button 
                                        variant="destructive" 
                                        className="w-full font-bold gap-2 h-12 shadow-lg"
                                        onClick={handleDisconnect}
                                        disabled={isDisconnecting}
                                    >
                                        {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                        Sair e Desconectar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full space-y-6">
                                {(waStatus === 'syncing' || (waStatus === 'open' && syncPercentage < 100)) ? (
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
                                                        {(syncPercentage === 100 && waStatus !== 'open') ? 99 : (syncPercentage || 5)}%
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
                                            <div className="w-56 h-56 mx-auto flex items-center justify-center bg-muted rounded-2xl">
                                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                                            {waStatus === 'connecting' ? 'Iniciando Bridge' : 'Aguardando Leitura'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
