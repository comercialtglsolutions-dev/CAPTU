import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Terminal, Globe, Code2, GitBranch, Database, Brain, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TraceStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  duration?: string;
  subSteps?: TraceSubStep[];
}

export interface TraceSubStep {
  type: 'TERMINAL' | 'WEB' | 'CODE' | 'GIT' | 'SUPABASE' | 'PENSANDO' | 'BUSCANDO' | 'ANALISANDO' | 'RESEARCH' | 'PRISMA';
  content: string;
  timestamp: string;
}

interface AgentTraceTimelineProps {
  content: string;
}

export function AgentTraceTimeline({ content }: AgentTraceTimelineProps) {
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [totalSeconds, setTotalSeconds] = useState(0);
  const startTime = React.useRef(Date.now());

  useEffect(() => {
    const lines = content.split('\n');
    let currentPlan: TraceStep[] = [];
    let currentSubSteps: Record<string, TraceSubStep[]> = {};
    
    lines.forEach(line => {
      // Parse [PLAN] ["Step 1", "Step 2"]
      const planMatch = line.match(/^\s*\[PLAN\]\s*(.*)/i);
      if (planMatch) {
        try {
          const planArray = JSON.parse(planMatch[1]);
          currentPlan = planArray.map((label: string, index: number) => ({
            id: String(index + 1),
            label,
            status: 'pending'
          }));
        } catch (e) {
          console.error("Erro ao parsear PLAN:", e);
        }
      }

      // Parse [STEP_START] id
      const startMatch = line.match(/^\s*\[STEP_START\]\s*(\d+)/i);
      if (startMatch) {
        const id = startMatch[1];
        currentPlan = currentPlan.map(s => s.id === id ? { ...s, status: 'running' } : s);
      }

      // Parse [STEP_DONE] id
      const doneMatch = line.match(/^\s*\[STEP_DONE\]\s*(\d+)/i);
      if (doneMatch) {
        const id = doneMatch[1];
        currentPlan = currentPlan.map(s => s.id === id ? { ...s, status: 'done' } : s);
      }

      // Parse [TIPO] Conteúdo (Sub-steps)
      const subMatch = line.match(/^\s*\[(PENSANDO|TERMINAL|WEB|SUPABASE|CODE|GIT|BUSCANDO|ANALISANDO|RESEARCH|PRISMA)\]\s*(.*)/i);
      if (subMatch) {
        const type = subMatch[1] as any;
        const text = subMatch[2];
        const activeStep = currentPlan.find(s => s.status === 'running')?.id || "loading";
        
        if (!currentSubSteps[activeStep]) currentSubSteps[activeStep] = [];
        currentSubSteps[activeStep].push({
          type,
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    if (currentPlan.length === 0) {
      currentPlan = [{ id: 'loading', label: 'Analisar pedido...', status: 'running' }];
    }

    // Detect if we are in the final output phase (text without tags)
    const nonTagText = lines
      .filter(line => !line.match(/^\s*\[(PLAN|STEP_START|STEP_DONE|PENSANDO|TERMINAL|WEB|SUPABASE|CODE|GIT|PRISMA|BUSCANDO|ANALISANDO|RESEARCH)\]/i) && !line.match(/\[ARTIFACT|SCRIPT_CARD/i))
      .join('')
      .trim();

    // Se houver [PLAN], só marcamos como 'output' se o último step estiver concluído ou se houver muito texto final
    const hasPlan = currentPlan.length > 0 && currentPlan[0].id !== 'loading';
    const hasDoneAll = hasPlan && currentPlan.every(s => s.status === 'done');
    
    // Consideramos fase de output apenas se tivermos texto substancial E o plano estiver finalizado (se existir)
    const isOutputPhase = nonTagText.length > 30 && (!hasPlan || hasDoneAll);

    setSteps(currentPlan.map(s => ({ 
      ...s, 
      status: (isOutputPhase && s.status !== 'pending') ? 'done' : s.status,
      subSteps: currentSubSteps[s.id] || [] 
    })));
    
    // Auto-expand if only loading step exists
    if (currentPlan.length === 1 && currentPlan[0].id === 'loading') {
      setExpanded(prev => ({ ...prev, loading: true }));
    }
  }, [content]);

  // Timer effect for 'running' step and global time
  useEffect(() => {
    // Check if any step is running AND we are NOT in output phase
    const hasRunningStep = steps.some(s => s.status === 'running');
    const allDone = steps.every(s => s.status === 'done');
    
    if (allDone) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      setTotalSeconds(elapsed);

      // Atualiza o cronômetro do passo ativo
      const activeStep = steps.find(s => s.status === 'running');
      if (activeStep) {
        setTimers(prev => ({
          ...prev,
          [activeStep.id]: (prev[activeStep.id] || 0) + 1
        }));
      } else if (steps.find(s => s.id === 'loading' && s.status === 'running')) {
        setTimers(prev => ({
          ...prev,
          loading: (prev.loading || 0) + 1
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [steps]);

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const allDone = steps.every(s => s.status === 'done');

  return (
    <div className="w-full mb-6 ml-0 px-1 mt-[-8px] animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="bg-muted/30 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2 border-b border-border/30 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              allDone ? "bg-green-500" : "bg-primary animate-pulse"
            )} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {allDone ? 'Processamento Concluído' : 'Agente em Execução'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/40">
            Total: {formatTime(totalSeconds)}
          </span>
        </div>
        
        <div className="p-1.5 space-y-0.5">
          {steps.map((step) => (
            <div key={step.id} className="group">
              <div 
                className={cn(
                  "flex items-center gap-2.5 p-2 px-3 rounded-lg transition-all cursor-pointer",
                  step.status === 'running' ? "bg-primary/10 shadow-sm" : "hover:bg-muted/40",
                  step.status === 'pending' && "opacity-40"
                )}
                onClick={() => setExpanded(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                  {step.status === 'done' ? (
                    <div className="bg-primary/20 p-0.5 rounded-full">
                      <CheckCircle2 size={12} className="text-primary" />
                    </div>
                  ) : step.status === 'running' ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Circle size={12} className="text-muted-foreground/30" />
                  )}
                </div>
                
                <div className="flex-grow flex items-center justify-between min-w-0">
                  <span className={cn(
                    "text-[11px] font-semibold truncate transition-colors",
                    step.status === 'running' ? "text-primary" : "text-foreground/70"
                  )}>
                    {step.label}
                  </span>
                  
                  <div className="flex items-center gap-2.5 ml-3 flex-shrink-0">
                    <span className="text-[9px] font-mono text-muted-foreground/40 bg-muted/50 px-1.5 py-0.5 rounded">
                      {formatTime(timers[step.id] || (step.status === 'done' ? 0 : 0))}
                    </span>
                    {step.subSteps && step.subSteps.length > 0 && (
                      <div className={cn(
                        "p-0.5 rounded-md transition-all",
                        expanded[step.id] ? "bg-primary/10 text-primary" : "text-muted-foreground/30"
                      )}>
                        <ChevronDown size={12} className={cn("transition-transform duration-300", expanded[step.id] && "rotate-180")} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-steps */}
              {expanded[step.id] && step.subSteps && step.subSteps.length > 0 && (
                <div className="mx-3 my-1 pl-4 border-l-2 border-primary/20 space-y-2 py-2 animate-in slide-in-from-left-2 duration-300">
                  {step.subSteps.map((sub, sIdx) => {
                    const Icon = {
                      TERMINAL: Terminal,
                      WEB: Globe,
                      CODE: Code2,
                      GIT: GitBranch,
                      SUPABASE: Database,
                      PENSANDO: Brain,
                      BUSCANDO: Globe,
                      ANALISANDO: Brain,
                      RESEARCH: Globe,
                      PRISMA: Database
                    }[sub.type] || Brain;
                    
                    return (
                      <div key={sIdx} className="flex items-start gap-3 text-[10px] text-muted-foreground/80 group/sub">
                        <div className="mt-0.5 p-1 rounded-md bg-muted/50 text-primary/60 group-hover/sub:bg-primary/10 group-hover/sub:text-primary transition-colors">
                          <Icon size={10} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-[8px] uppercase tracking-widest text-primary/50">{sub.type}</span>
                             <span className="text-[8px] opacity-30 font-mono">{sub.timestamp}</span>
                          </div>
                          <span className="truncate opacity-90 leading-relaxed">{sub.content}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
