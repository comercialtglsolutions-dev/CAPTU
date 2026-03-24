import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  X, 
  Plus, 
  Link as LinkIcon, 
  FileText, 
  Trash2, 
  Loader2, 
  Globe,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/config';
import { cn } from '@/lib/utils';

interface ContextItem {
  id: string;
  type: 'file' | 'url' | 'text' | 'persona';
  name: string;
  content: string;
  source_url?: string;
  created_at: string;
}

interface AgentContextManagerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentContextManager({ userId, isOpen, onClose }: AgentContextManagerProps) {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDistilling, setIsDistilling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDistill = async () => {
    if (!userId) return;
    setIsDistilling(true);
    try {
      const res = await fetch(`${API_URL}/api/experience/distill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ 
          title: "Novo Padrão Aprendido!", 
          description: "A IA identificou novos gatilhos de sucesso baseados nos seus feedbacks.",
        });
        fetchContext();
      } else if (data.skip) {
        toast({ title: "Dados Insuficientes", description: data.message });
      } else {
        throw new Error(data.error || 'Falha na destilação');
      }
    } catch (error: any) {
      toast({ title: "Erro na Inteligência", description: error.message, variant: "destructive" });
    } finally {
      setIsDistilling(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file || !userId) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    try {
      const res = await fetch(`${API_URL}/api/context/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Sucesso", description: `Arquivo "${file.name}" processado e adicionado à memória.` });
        fetchContext();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Falha no upload');
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const fetchContext = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/context/list/${userId}`);
      if (!res.ok) throw new Error('Falha ao obter memória da IA');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar contexto:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchContext();
  }, [isOpen]);

  const handleAddUrl = async () => {
    if (!newUrl) return;
    setIsAddingUrl(true);
    try {
      const res = await fetch(`${API_URL}/api/context/add-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, url: newUrl })
      });
      
      if (res.ok) {
        toast({ title: "Sucesso", description: "URL processada e adicionada à memória da IA." });
        setNewUrl('');
        fetchContext();
      } else {
        throw new Error('Falha ao processar URL');
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/context/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
        toast({ title: "Removido", description: "Conhecimento removido da memória." });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível remover o item.", variant: "destructive" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border/60 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border/40 flex items-center justify-between bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Base de Conhecimento</h2>
              <p className="text-xs text-muted-foreground">Personalize a IA com seus documentos e sites</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
          
          {/* Add URL and File Section - Stacked Layout */}
          <div className="flex flex-col gap-8">
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                <Globe className="w-4 h-4 text-primary" />
                Sincronizar Website ou Artigo
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="https://exemplo.com.br" 
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="pl-9 bg-secondary/30 border-border/40 h-11 rounded-xl focus:ring-primary/20"
                  />
                </div>
                <Button 
                  onClick={handleAddUrl} 
                  disabled={isAddingUrl || !newUrl}
                  className="rounded-xl h-11 px-6 shadow-md"
                >
                  {isAddingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar Link"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
                <FileText className="w-4 h-4 text-primary" />
                Treinar com Documento Estratégico
              </label>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".pdf,.txt,.docx" 
                className="hidden" 
              />
              <Button 
                variant="outline"
                className={cn(
                  "w-full h-32 rounded-3xl border-dashed border-2 flex flex-col items-center justify-center gap-3 transition-all group",
                  isDragging 
                    ? "border-primary/60 bg-primary/5 ring-4 ring-primary/10 scale-[1.02]" 
                    : "border-border/60 bg-secondary/5 hover:bg-secondary/10 hover:border-primary/40"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-medium animate-pulse">Processando documento...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-bold text-sm text-foreground/80">
                        Clique ou Arraste PDF / DOCX / TXT
                      </div>
                      <span className="text-[10px] text-muted-foreground font-normal italic">Formato Máximo: 10MB</span>
                    </div>
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic text-center px-4">
            * A IA analisará o conteúdo (site ou documento) e o usará como base estratégica para todas as interações neste projeto.
          </p>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border/40"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-bold tracking-widest flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Inteligência Evolutiva
              </span>
            </div>
          </div>

          {/* Evolution / Distillation Section */}
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 text-center space-y-4 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
            
            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-center gap-2 text-primary font-bold">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>Auto-Aprendizado</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                A IA analisa seus feedbacks positivos e negativos para identificar padrões de sucesso exclusivos do seu negócio.
              </p>
            </div>

            <Button 
              onClick={handleDistill}
              disabled={isDistilling}
              className="w-full max-w-xs h-12 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-xl shadow-primary/20 border-0 transition-all active:scale-95"
            >
              {isDistilling ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Destilando Inteligência...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span>Sincronizar Aprendizados</span>
                </div>
              )}
            </Button>
          </div>

          {/* Current Memory List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Conhecimento Ativo
              </label>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                {items.length} itens
              </span>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs">Acessando memória...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 border border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center gap-3 bg-secondary/5 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 opacity-20" />
                  <p className="text-sm">A IA ainda não possui contexto personalizado.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div 
                    key={item.id} 
                    className="group flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/40 border border-border/30 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border/40 flex items-center justify-center shrink-0">
                        {item.type === 'url' ? <Globe className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-orange-500" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate text-foreground">{item.name}</h4>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Contexto ativo para prospecção
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/40 bg-secondary/5 text-center">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            As informações acima serão injetadas em <strong>todas as novas interações</strong> do Agente, 
            garantindo que ele entenda seu nicho, dores dos clientes e visão de negócio.
          </p>
        </div>
      </div>
    </div>
  );
}
