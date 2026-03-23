import React from 'react';
import { 
  CheckCircle2, Circle, Clock, Loader2, 
  Terminal, Globe, Database, Code2, GitBranch, Search, Brain, LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TraceStep {
  id: string;
  type: 'process' | 'terminal' | 'web' | 'supabase' | 'code' | 'git' | 'analysis' | 'thinking';
  title: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp?: string;
  duration?: string;
  details?: string;
}

const STEP_ICONS: Record<TraceStep['type'], LucideIcon> = {
  process: Brain,
  terminal: Terminal,
  web: Globe,
  supabase: Database,
  code: Code2,
  git: GitBranch,
  analysis: Search,
  thinking: Loader2
};

const STEP_COLORS: Record<TraceStep['type'], string> = {
  process: 'text-purple-500',
  terminal: 'text-amber-500',
  web: 'text-blue-500',
  supabase: 'text-emerald-500',
  code: 'text-cyan-500',
  git: 'text-orange-500',
  analysis: 'text-pink-500',
  thinking: 'text-zinc-500'
};

export function AgentTraceTimeline({ steps, isLoading }: { steps: TraceStep[]; isLoading?: boolean }) {
  if (steps.length === 0 && !isLoading) return null;

  return (
    <div className="mt-4 mb-4 border border-border/40 rounded-xl bg-secondary/20 p-4 transition-all animate-in fade-in duration-500 overflow-hidden relative">
      <div className="absolute top-2 right-4 flex items-center gap-2">
         <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Agente em Execução</span>
         {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary/40" />}
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = STEP_ICONS[step.type] || Brain;
          const color = STEP_COLORS[step.type];
          const isLast = idx === steps.length - 1;
          
          return (
            <div key={step.id} className="relative group/step">
               {!isLast && (
                 <div className="absolute left-3 top-7 bottom-[-16px] w-[1px] bg-border/30 group-hover/step:bg-primary/20 transition-colors" />
               )}
               
               <div className="flex items-start gap-4">
                  <div className={cn(
                    "relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    step.status === 'running' ? "bg-primary/20 ring-4 ring-primary/10" : "bg-secondary"
                  )}>
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : step.status === 'running' ? (
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    ) : (
                      <Icon className={cn("w-3.5 h-3.5", color, "opacity-60")} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className={cn(
                        "text-[13px] font-semibold transition-colors",
                        step.status === 'running' ? "text-primary" : "text-foreground/80"
                      )}>
                        {step.title}
                      </h4>
                      {step.duration && <span className="text-[10px] text-muted-foreground/40 font-mono italic">{step.duration}</span>}
                    </div>
                    
                    {step.details && (
                      <p className="text-[11px] text-muted-foreground/60 mt-1 line-clamp-2 italic font-medium leading-relaxed">
                        {step.details}
                      </p>
                    )}
                  </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
