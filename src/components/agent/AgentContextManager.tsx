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
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { API_URL } from '@/config';

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
  const { toast } = useToast();

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
          
          {/* Add URL Section */}
          <div className="space-y-3">
            <label className="text-sm font-bold flex items-center gap-2 text-foreground/80">
              <Globe className="w-4 h-4 text-primary" />
              Sincronizar Website ou Artigo
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="https://exemplo.com.br/sobre-nos" 
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
                {isAddingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic px-1">
              * A IA lerá o conteúdo do site e o usará como base estratégica.
            </p>
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
