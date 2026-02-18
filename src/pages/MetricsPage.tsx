import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import { Target, MessageCircle, CalendarCheck, Users, Loader2, PieChart as PieChartIcon, BarChart3, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";

export default function MetricsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["leads-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: contactHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["contact-history-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_history")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const metrics = useMemo(() => {
    if (!leads) return null;

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(l => l.score >= 60).length;
    const contactedLeads = leads.filter(l => l.status !== 'new').length;
    const respondedLeads = leads.filter(l => l.status === 'responded' || l.status === 'negotiating' || l.status === 'won').length;
    const wonLeads = leads.filter(l => l.status === 'won').length;

    const responseRate = contactedLeads > 0
      ? ((respondedLeads / contactedLeads) * 100).toFixed(1)
      : "0.0";

    const conversionRate = contactedLeads > 0
      ? ((wonLeads / contactedLeads) * 100).toFixed(1)
      : "0.0";

    // 1. Niche Performance calculation (top 5)
    const nicheMap: Record<string, { niche: string, leads: number, contacted: number, won: number }> = {};
    leads.forEach(lead => {
      const segment = lead.segment || "Outros";
      if (!nicheMap[segment]) {
        nicheMap[segment] = { niche: segment, leads: 0, contacted: 0, won: 0 };
      }
      nicheMap[segment].leads++;
      if (lead.status !== 'new') nicheMap[segment].contacted++;
      if (lead.status === 'won') nicheMap[segment].won++;
    });

    const nichePerformance = Object.values(nicheMap)
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);

    // 2. Status Distribution calculation
    const statusData = [
      { name: "Novos", value: leads.filter(l => l.status === 'new').length, color: "hsl(var(--chart-1))" },
      { name: "Contatados", value: leads.filter(l => l.status === 'contacted').length, color: "hsl(var(--chart-2))" },
      { name: "Respondidos", value: leads.filter(l => l.status === 'responded').length, color: "hsl(var(--chart-3))" },
      { name: "Em Negociação", value: leads.filter(l => l.status === 'negotiating').length, color: "hsl(var(--chart-4))" },
      { name: "Fechados", value: leads.filter(l => l.status === 'won').length, color: "hsl(var(--muted-foreground))" },
    ].filter(item => item.value > 0);

    return {
      totalLeads,
      qualifiedLeads,
      contactedLeads,
      responseRate,
      conversionRate,
      nichePerformance,
      statusData,
      wonLeads
    };
  }, [leads]);

  if (leadsLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics || metrics.totalLeads === 0) {
    return (
      <>
        <PageHeader title="Métricas" description="Acompanhe o desempenho das suas campanhas" />
        <div className="glass-card rounded-xl p-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Sem dados para exibir</h3>
          <p className="text-muted-foreground">Comece a coletar e contatar leads para ver suas métricas aqui.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Métricas" description="Acompanhe o desempenho das suas campanhas em tempo real" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Users}
          title="Total de Leads"
          value={metrics.totalLeads.toString()}
          change={`${metrics.qualifiedLeads} qualificados`}
          changeType="positive"
        />
        <MetricCard
          icon={MessageCircle}
          title="Contatados"
          value={metrics.contactedLeads.toString()}
          change={`${((metrics.contactedLeads / metrics.totalLeads) * 100).toFixed(1)}% do total`}
          changeType="positive"
        />
        <MetricCard
          icon={Target}
          title="Taxa de Resposta"
          value={`${metrics.responseRate}%`}
          change="leads que interagiram"
          changeType="positive"
        />
        <MetricCard
          icon={CalendarCheck}
          title="Conversão"
          value={`${metrics.conversionRate}%`}
          change={`${metrics.wonLeads} fechamentos`}
          changeType="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Distribuição por Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={metrics.statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {metrics.statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "hsl(var(--card))" : "white",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))"
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Niche performance */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Desempenho por Nicho (Top 5)</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.nichePerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                dataKey="niche"
                type="category"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "hsl(var(--card))" : "white",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))"
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Bar dataKey="leads" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Total Leads" />
              <Bar dataKey="contacted" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Contatados" />
              <Bar dataKey="won" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} name="Fechados" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
