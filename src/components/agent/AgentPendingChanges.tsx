import React, { useState, useEffect } from 'react';
import { Check, X, ChevronDown, ChevronUp, FileCode, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { API_URL } from '@/config';

interface Proposal {
  id: string;
  path: string;
  type: 'write' | 'patch';
  description: string;
  search?: string;
  replace?: string;
  created_at: string;
}

interface AgentPendingChangesProps {
  chatId: string;
  isTyping: boolean;
}

export function AgentPendingChanges({ chatId, isTyping }: AgentPendingChangesProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPending = async () => {
    if (!chatId) {
      setProposals([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/agent/proposals/pending?chatId=${chatId}`);
      const data = await res.json();
      setProposals(data);
    } catch (err) {
      console.error('Falha ao buscar propostas:', err);
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 4000);
    return () => clearInterval(interval);
  }, [chatId]);

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/api/agent/proposals/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, chatId })
      });
      await fetchPending();
    } catch (err) {
      console.error('Falha na ação em massa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLineStats = (p: Proposal) => {
    if (p.type === 'write') {
      // Para escrita completa, consideramos tudo como adição (simplificado)
      const added = p.replace?.split('\n').length || 0;
      return { added, removed: 0 };
    }
    
    // Para patch, contamos as linhas em search e replace
    const removed = p.search?.trim() ? p.search.split('\n').filter(l => l.trim().length > 0).length : 0;
    const added = p.replace?.trim() ? p.replace.split('\n').filter(l => l.trim().length > 0).length : 0;
    
    // Fallback para mudanças atômicas em uma mesma linha
    const finalRemoved = removed === 0 && p.search?.trim() ? 1 : removed;
    const finalAdded = added === 0 && p.replace?.trim() ? 1 : added;

    return { added: finalAdded, removed: finalRemoved };
  };

  if (proposals.length === 0 || isTyping) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 select-none">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
              <FileCode size={14} />
            </div>
            <span className="text-sm font-bold text-slate-200 tracking-tight">
              {proposals.length} {proposals.length === 1 ? 'Arquivo Alterado' : 'Arquivos Alterados'}
            </span>
            {isOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronUp size={14} className="text-slate-500" />}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={isLoading}
              className="text-xs font-bold text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              Reject all
            </button>
            <Button
              size="sm"
              onClick={() => handleBulkAction('approve')}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-8 px-4 rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : <Check className="w-3 h-3 mr-2" />}
              Accept all
            </Button>
          </div>
        </div>

        {/* File List Expansion */}
        {isOpen && (
          <div className="border-t border-slate-700/50 bg-slate-950/50 p-2 max-h-48 overflow-y-auto custom-scrollbar">
            {proposals.map((p) => {
              const stats = getLineStats(p);
              return (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-mono text-slate-300 truncate">{p.path}</span>
                      <span className="text-[10px] text-slate-500 truncate">{p.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className={cn(
                       "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                       stats.added > 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                     )}>
                       +{stats.added}
                     </div>
                     <div className={cn(
                       "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                       stats.removed > 0 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                     )}>
                       -{stats.removed}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
