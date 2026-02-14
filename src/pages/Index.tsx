import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/MetricCard";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { Users, Target, MessageSquare, TrendingUp, Handshake, Trophy, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  segment: string;
  city: string;
  state: string;
  score: number;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  // Fetch all leads
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
  });

  // Fetch contact history
  const { data: contactHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["dashboard-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_history")
        .select("*")
        .order("data_envio", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalLeads = leads?.length || 0;
  const qualifiedLeads = leads?.filter((l) => l.score >= 60).length || 0;
  const contactedLeads = leads?.filter((l) => l.status !== "new").length || 0;
  const respondedLeads = leads?.filter((l) => l.status === "responded").length || 0;
  const negotiatingLeads = leads?.filter((l) => l.status === "negotiating").length || 0;
  const wonLeads = leads?.filter((l) => l.status === "won").length || 0;
  const totalMessages = contactHistory?.length || 0;
  const responseRate = contactedLeads > 0 ? ((respondedLeads / contactedLeads) * 100).toFixed(1) : "0.0";

  // Calculate weekly funnel data (last 4 weeks, Sem 1 = current week)
  const funnelData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { locale: ptBR });
    const weekEnd = endOfWeek(subWeeks(new Date(), i), { locale: ptBR });

    const weekLeads = leads?.filter((l) => {
      const createdAt = new Date(l.created_at);
      return createdAt >= weekStart && createdAt <= weekEnd;
    }) || [];

    return {
      name: `Sem ${i + 1}`, // Sem 1 = current, Sem 2 = -1 week, etc
      leads: weekLeads.length,
      qualificados: weekLeads.filter((l) => l.score >= 60).length,
      contatados: weekLeads.filter((l) => l.status !== "new").length,
      fechados: weekLeads.filter((l) => l.status === "won").length,
    };
  });

  // Calculate monthly trend data (last 6 months)
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(new Date(), 5 - i));
    const monthEnd = endOfMonth(subMonths(new Date(), 5 - i));

    const monthContacted = leads?.filter((l) => {
      const createdAt = new Date(l.created_at);
      return createdAt >= monthStart && createdAt <= monthEnd && l.status !== "new";
    }).length || 0;

    return {
      name: format(monthStart, "MMM", { locale: ptBR }),
      valor: monthContacted,
    };
  });

  // Get recent leads (top 5)
  const recentLeads = leads?.slice(0, 5) || [];

  const isLoading = leadsLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da sua prospecção B2B em tempo real" />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard
          icon={Target}
          title="Leads coletados"
          value={totalLeads.toString()}
          change={totalLeads > 0 ? "Total no sistema" : "Nenhum lead ainda"}
          changeType={totalLeads > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          icon={TrendingUp}
          title="Qualificados"
          value={qualifiedLeads.toString()}
          change={`${totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(0) : 0}% do total`}
          changeType={qualifiedLeads > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          icon={MessageSquare}
          title="Mensagens enviadas"
          value={totalMessages.toString()}
          change={totalMessages > 0 ? "Via WhatsApp" : "Nenhuma ainda"}
          changeType={totalMessages > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          icon={Users}
          title="Taxa de Resposta"
          value={`${responseRate}%`}
          change={contactedLeads > 0 ? `${respondedLeads} de ${contactedLeads}` : "Sem dados"}
          changeType={parseFloat(responseRate) > 15 ? "positive" : "neutral"}
        />
        <MetricCard
          icon={Handshake}
          title="Em negociação"
          value={negotiatingLeads.toString()}
          change={negotiatingLeads > 0 ? "Ativos agora" : "Nenhum ainda"}
          changeType={negotiatingLeads > 0 ? "positive" : "neutral"}
        />
        <MetricCard
          icon={Trophy}
          title="Fechados"
          value={wonLeads.toString()}
          change={wonLeads > 0 ? "Vendas realizadas" : "Nenhum ainda"}
          changeType={wonLeads > 0 ? "positive" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Funnel Chart */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Funil de Conversão (Últimas 4 Semanas)</h3>
          {totalLeads > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="leads" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Leads" />
                <Bar dataKey="qualificados" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Qualificados" />
                <Bar dataKey="contatados" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Contatados" />
                <Bar dataKey="fechados" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Fechados" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              Colete leads para visualizar o funil
            </div>
          )}
        </div>

        {/* Trend */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads Contatados (Últimos 6 Meses)</h3>
          {contactedLeads > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="url(#colorVal)" strokeWidth={2} name="Contatados" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              Inicie contatos para visualizar a tendência
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Leads Recentes</h3>
        {recentLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cidade</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segmento</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 font-medium text-foreground">{lead.name}</td>
                    <td className="py-3 px-2 text-muted-foreground">{lead.city}, {lead.state}</td>
                    <td className="py-3 px-2 text-muted-foreground">{lead.segment || "N/A"}</td>
                    <td className="py-3 px-2"><ScoreBadge score={lead.score} /></td>
                    <td className="py-3 px-2"><StatusBadge status={lead.status as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Nenhum lead coletado ainda. Vá para a página de Leads para começar!
          </div>
        )}
      </div>
    </>
  );
}
