import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Zap, Loader2, Activity, Users, Send, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function AutomationsPage() {
  // 1. Fetch active campaigns
  const { data: activeCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["active-automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refresh every 10s for "live" feel
  });

  // 2. Fetch recent activity (sent leads)
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["recent-automation-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_leads")
        .select("*, leads(name, segment), campaigns(name)")
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // More frequent for activity
  });

  if (campaignsLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Monitor de Automações"
        description="Acompanhamento em tempo real dos fluxos inteligentes enviando mensagens"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
              Executando no Momento
            </h2>
            <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
              Live
            </Badge>
          </div>

          {(!activeCampaigns || activeCampaigns.length === 0) ? (
            <div className="glass-card rounded-xl p-12 text-center border-dashed">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-muted-foreground opacity-30" />
              </div>
              <h3 className="font-semibold text-foreground">Sistema em Standby</h3>
              <p className="text-sm text-muted-foreground">Não há automações ativas enviando mensagens agora.</p>
            </div>
          ) : (
            activeCampaigns.map((camp) => (
              <div key={camp.id} className="glass-card rounded-xl p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{camp.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {camp.sent_count} disparados
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          Limite: {camp.daily_limit}/dia
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                    Ativa
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-muted-foreground">Progresso do Dia</span>
                    <span className="text-foreground">{Math.min(Math.round((camp.sent_count / camp.daily_limit) * 100), 100)}%</span>
                  </div>
                  <Progress value={(camp.sent_count / camp.daily_limit) * 100} className="h-2" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Real-time Activity Log */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider h-7 flex items-center">
            Log de Atividades
          </h2>

          <div className="glass-card rounded-xl p-4 divide-y">
            {(!recentActivity || recentActivity.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente.</p>
            ) : (
              recentActivity.map((log: any) => (
                <div key={log.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Mensagem enviada
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                        Para: <span className="text-foreground">{log.leads?.name}</span>
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[120px]">
                          {log.campaigns?.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <h4 className="text-xs font-bold text-primary mb-1 uppercase tracking-tight">Status do Robô</h4>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Motor de Automação n8n Conectado</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
