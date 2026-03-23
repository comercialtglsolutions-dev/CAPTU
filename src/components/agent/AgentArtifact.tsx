import React, { useState } from 'react';
import { Copy, Check, FileText, Sparkles, Users, BarChart3, Search, Code, ShieldCheck, Terminal, Eye, ExternalLink, RefreshCw, CheckCircle2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ArtifactType = 'script' | 'leads' | 'report' | 'analysis' | 'code' | 'terminal' | 'preview' | 'proposal';

interface AgentArtifactProps {
  type: ArtifactType;
  title: string;
  content: string;
  id?: string;
}

export function AgentArtifact({ type, title, content, id }: AgentArtifactProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Remove as tags de controle se estiverem presentes no conteúdo
    const cleanContent = content.replace(/\[ARTIFACT.*?\]|\[\/ARTIFACT\]/g, '').trim();
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = () => {
    switch (type) {
      case 'script': return <FileText size={16} />;
      case 'leads': return <Users size={16} />;
      case 'report': return <BarChart3 size={16} />;
      case 'analysis': return <Search size={16} />;
      case 'code': return <Code size={16} />;
      case 'terminal': return <Terminal size={16} />;
      case 'preview': return <Eye size={16} />;
      case 'proposal': return <Sparkles size={16} />;
      default: return <ShieldCheck size={16} />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'script': return 'Script de Prospecção';
      case 'leads': return 'Lista de Oportunidades';
      case 'report': return 'Resumo Estatístico';
      case 'analysis': return 'Dossiê de Mercado';
      case 'code': return 'Configuração Técnica';
      case 'terminal': return 'Log de Execução';
      case 'preview': return 'Visualização ao Vivo';
      case 'proposal': return 'Proposta de Alteração';
      default: return 'Resultado Estruturado';
    }
  };

  return (
    <div className="my-6 group/artifact relative animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Glow Effect Background baseada no tipo */}
      <div className={cn(
        "absolute -inset-0.5 rounded-2xl blur opacity-20 group-hover/artifact:opacity-40 transition duration-500",
        type === 'leads' ? "bg-emerald-500/30" : 
        type === 'report' ? "bg-blue-500/30" : 
        type === 'analysis' ? "bg-amber-500/30" : 
        type === 'terminal' ? "bg-slate-900/50" :
        type === 'preview' ? "bg-purple-500/30" :
        type === 'proposal' ? "bg-blue-500/30" :
        "bg-primary/30"
      )} />
      
      <div className={cn(
        "relative backdrop-blur-md border border-border/60 rounded-2xl overflow-hidden shadow-2xl transition-all",
        type === 'terminal' ? "bg-[#0F1419] border-slate-700" : "bg-card/60"
      )}>
        {/* Header bar */}
        <div className={cn(
          "flex items-center justify-between px-5 py-3.5 border-b border-border/30",
          type === 'terminal' ? "bg-slate-900/50 border-slate-800" : "bg-muted/20"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              type === 'leads' ? "bg-emerald-500/10 text-emerald-500" : 
              type === 'report' ? "bg-blue-500/10 text-blue-500" : 
              type === 'analysis' ? "bg-amber-500/10 text-amber-500" : 
              type === 'terminal' ? "bg-slate-800 text-slate-300" :
              type === 'preview' ? "bg-purple-500/10 text-purple-500" :
              type === 'proposal' ? "bg-blue-600/10 text-blue-500" :
              "bg-primary/10 text-primary"
            )}>
              {getIcon()}
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest leading-none mb-1",
                type === 'terminal' ? "text-slate-500" : "text-muted-foreground/50"
              )}>
                {getTypeLabel()}
              </span>
              <h4 className={cn(
                "text-sm font-bold",
                type === 'terminal' ? "text-slate-200" : "text-foreground/90"
              )}>{title}</h4>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {type === 'preview' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(content, '_blank')}
                className="h-8 gap-2 rounded-lg hover:bg-purple-500/10 text-purple-500"
              >
                <ExternalLink size={14} />
                <span className="text-[10px] font-bold">Abrir</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={cn(
                "h-8 gap-2 rounded-lg transition-all",
                copied ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : 
                type === 'terminal' ? "hover:bg-slate-800 text-slate-400" : "hover:bg-primary/10 text-primary"
              )}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="text-[10px] font-bold">{copied ? 'Copiado' : 'Copiar'}</span>
            </Button>
          </div>
        </div>

        {/* Content area - Adaptável ao tipo */}
        <div className={cn(
          "max-w-none transition-all",
          type === 'terminal' ? "p-0" : "p-6 prose prose-sm prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/30 prose-h1:text-xl prose-h2:text-lg prose-h3:text-md",
          type === 'leads' ? "prose-table:border-collapse prose-th:bg-muted/40 prose-td:border-b prose-td:border-border/20" : ""
        )}>
          {type === 'terminal' ? (
            <div className="bg-[#0F1419] p-5 font-mono text-[13px] leading-relaxed overflow-x-auto custom-scrollbar shell-shadow">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight ml-2">captu-shell v1.0</span>
              </div>
              <pre className="text-slate-300">
                <code className="whitespace-pre-wrap">
                  {content.split('\n').map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-slate-600 select-none w-4 text-right">{i+1}</span>
                      <span className={cn(
                        line.startsWith('$') ? "text-emerald-400 font-bold" : 
                        line.toLowerCase().includes('error') || line.toLowerCase().includes('failed') ? "text-red-400" : 
                        line.toLowerCase().includes('warning') ? "text-amber-400" :
                        "text-slate-300"
                      )}>
                        {line}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          ) : type === 'preview' ? (
            <div className="flex flex-col gap-4">
               <div className="rounded-xl border border-border/40 overflow-hidden bg-white h-[450px] shadow-inner relative group/preview">
                  <iframe 
                    src={content} 
                    className="w-full h-full border-none"
                    title="Interface Preview"
                  />
                  {/* Overlay discreto de carregamento ou zoom */}
                  <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/5 pointer-events-none transition-colors" />
               </div>
               <p className="text-[10px] text-muted-foreground italic text-center">
                 Pré-visualização gerada para <b>{content}</b>. As alterações podem levar alguns segundos para refletir.
               </p>
            </div>
          ) : type === 'proposal' ? (
            <div className="flex flex-col gap-3">
              <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre">{content}</div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center">
                Aguardando aprovação global acima...
              </div>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}
              components={{
                table({node, ...props}) {
                  return <div className="rounded-xl border border-border/40 overflow-hidden my-4"><table className="w-full text-left table-auto m-0" {...props} /></div>
                },
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
           "px-5 py-2.5 border-t flex items-center justify-between",
           type === 'terminal' ? "bg-slate-900/80 border-slate-800" : "border-border/10 bg-black/10"
        )}>
          <div className="flex items-center gap-1.5 opacity-30">
            <Sparkles size={10} className={type === 'terminal' ? "text-slate-400" : "text-primary"} />
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-tight",
              type === 'terminal' ? "text-slate-400" : "text-foreground"
            )}>Processado com IA CAPTU Smart</span>
          </div>
          <div className="flex items-center gap-3">
             <span className={cn(
               "text-[9px] font-mono italic",
               type === 'terminal' ? "text-slate-600" : "text-muted-foreground/30"
             )}>
               ID: {type}-{Math.random().toString(36).substr(2, 6).toUpperCase()}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}
