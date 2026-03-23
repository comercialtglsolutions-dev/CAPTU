import React, { useEffect, useState } from 'react';
import { Check, X, Code2, ArrowRight, Layers, FileCode2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

interface Proposal {
  id: string;
  path: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export function AgentPendingChanges({ userId, chatId }: { userId?: string; chatId?: string }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const fetchPending = async () => {
    try {
      // Usar axios ou fetch para a nossa rota de propostas
      const res = await fetch(`http://localhost:3000/api/agent/proposals/pending`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 3000); // Poll a cada 3s
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const res = await axios.post(`http://localhost:3000/api/agent/proposals/bulk-action`, { action });
      if (res.status === 200) {
        toast({
          title: action === 'approve' ? "Alterações Aplicadas!" : "Alterações Rejeitadas",
          description: action === 'approve' 
            ? "O código foi sincronizado com sucesso." 
            : "Voltamos os arquivos para o estado anterior.",
        });
        setProposals([]);
      }
    } catch (e: any) {
      toast({
        title: "Erro no processamento",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (proposals.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-500 fill-mode-both">
      <div className="bg-background/80 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-2xl p-2.5 flex items-center gap-4 min-w-[380px] ring-1 ring-white/10">
        <div className="flex items-center gap-3 pl-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <FileCode2 className="w-5 h-5 text-primary relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground tracking-tight flex items-center gap-1.5">
              Refactoring Ativo <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">
              {proposals.length} ARQUIVOS AGUARDANDO
            </span>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-border/50 mx-1" />

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleAction('reject')}
            disabled={isProcessing}
            className="h-9 px-3 text-xs font-bold hover:bg-destructive/10 hover:text-destructive transition-all rounded-xl"
          >
            <X className="w-3.5 h-3.5 mr-1.5" /> Descartar
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => handleAction('approve')}
            disabled={isProcessing}
            className="h-9 px-5 text-xs font-black shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
          >
            Aprovar Tudo <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
