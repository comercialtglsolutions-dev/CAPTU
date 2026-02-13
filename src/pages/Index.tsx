import MetricCard from "@/components/MetricCard";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { Users, Target, Mail, CalendarCheck, TrendingUp, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const funnelData = [
  { name: "Semana 1", leads: 120, qualificados: 45, contatados: 28, reunioes: 8 },
  { name: "Semana 2", leads: 180, qualificados: 72, contatados: 41, reunioes: 12 },
  { name: "Semana 3", leads: 150, qualificados: 60, contatados: 35, reunioes: 15 },
  { name: "Semana 4", leads: 210, qualificados: 95, contatados: 52, reunioes: 18 },
];

const trendData = [
  { name: "Jan", valor: 32 },
  { name: "Fev", valor: 48 },
  { name: "Mar", valor: 65 },
  { name: "Abr", valor: 52 },
  { name: "Mai", valor: 88 },
  { name: "Jun", valor: 102 },
];

const recentLeads = [
  { name: "Auto Mecânica Silva", city: "São Paulo, SP", niche: "Oficina Mecânica", score: 85, status: "new" as const },
  { name: "Padaria Bom Pão", city: "Curitiba, PR", niche: "Padaria", score: 72, status: "qualified" as const },
  { name: "Clínica Sorriso", city: "Belo Horizonte, MG", niche: "Odontologia", score: 91, status: "contacted" as const },
  { name: "Pet Shop Amigo", city: "Rio de Janeiro, RJ", niche: "Pet Shop", score: 58, status: "new" as const },
  { name: "Estúdio Fitness", city: "Florianópolis, SC", niche: "Academia", score: 67, status: "qualified" as const },
];

export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da sua prospecção B2B" />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard icon={Building2} title="Empresas Coletadas" value="1.284" change="+12% esta semana" changeType="positive" />
        <MetricCard icon={Target} title="Leads Qualificados" value="472" change="+8% esta semana" changeType="positive" />
        <MetricCard icon={Mail} title="Emails Enviados" value="856" change="94% entregues" changeType="neutral" />
        <MetricCard icon={Users} title="Taxa de Resposta" value="18.4%" change="+2.1% vs anterior" changeType="positive" />
        <MetricCard icon={CalendarCheck} title="Reuniões Agendadas" value="53" change="+5 esta semana" changeType="positive" />
        <MetricCard icon={TrendingUp} title="ROI Médio" value="340%" change="R$ 2.80/lead" changeType="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Funnel Chart */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Funil de Conversão</h3>
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
              <Bar dataKey="reunioes" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Reuniões" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Reuniões Agendadas</h3>
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
              <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="url(#colorVal)" strokeWidth={2} name="Reuniões" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Leads Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cidade</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nicho</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2 font-medium text-foreground">{lead.name}</td>
                  <td className="py-3 px-2 text-muted-foreground">{lead.city}</td>
                  <td className="py-3 px-2 text-muted-foreground">{lead.niche}</td>
                  <td className="py-3 px-2"><ScoreBadge score={lead.score} /></td>
                  <td className="py-3 px-2"><StatusBadge status={lead.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
