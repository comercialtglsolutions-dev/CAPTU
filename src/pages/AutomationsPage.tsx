import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Zap, ArrowRight } from "lucide-react";

const automations = [
  {
    name: "Cold Email - Oficinas SP",
    status: "active" as const,
    steps: ["Webhook trigger", "Buscar dados", "Gerar mensagem IA", "Delay 3-5min", "Enviar email", "Registrar status"],
    lastRun: "2026-02-13 14:22",
    runs: 156,
  },
  {
    name: "WhatsApp - Pet Shops",
    status: "active" as const,
    steps: ["Webhook trigger", "Buscar dados", "Personalizar mensagem", "Delay 2-5min", "Enviar WhatsApp", "Aguardar resposta"],
    lastRun: "2026-02-13 11:45",
    runs: 89,
  },
  {
    name: "Follow-up Email - Sem resposta",
    status: "paused" as const,
    steps: ["Verificar status", "Filtrar sem resposta", "Gerar follow-up IA", "Delay 48h", "Enviar follow-up"],
    lastRun: "2026-02-12 09:00",
    runs: 45,
  },
];

export default function AutomationsPage() {
  return (
    <>
      <PageHeader title="Automações" description="Fluxos de automação via n8n" />

      <div className="space-y-4">
        {automations.map((a, i) => (
          <div key={i} className="glass-card rounded-xl p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Zap className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{a.name}</h3>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">Última execução: {a.lastRun} · {a.runs} execuções</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {a.steps.map((step, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">{step}</span>
                  {si < a.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
