import PageHeader from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import { Target, Mail, MessageCircle, CalendarCheck, TrendingUp, DollarSign, Users, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const channelData = [
  { name: "Email", value: 65, color: "hsl(var(--chart-2))" },
  { name: "WhatsApp", value: 35, color: "hsl(var(--chart-1))" },
];

const nichePerformance = [
  { niche: "Mecânicas", leads: 320, replies: 58, meetings: 22 },
  { niche: "Pet Shops", leads: 180, replies: 32, meetings: 12 },
  { niche: "Clínicas", leads: 210, replies: 41, meetings: 15 },
  { niche: "Restaurantes", leads: 150, replies: 22, meetings: 8 },
  { niche: "Academias", leads: 120, replies: 18, meetings: 6 },
];

export default function MetricsPage() {
  return (
    <>
      <PageHeader title="Métricas" description="Acompanhe o desempenho das suas campanhas" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Users} title="Total de Leads" value="1.284" change="+210 este mês" changeType="positive" />
        <MetricCard icon={Mail} title="Taxa de Entrega" value="94.2%" change="-0.3% vs anterior" changeType="negative" />
        <MetricCard icon={Target} title="Taxa de Resposta" value="18.4%" change="+2.1% vs anterior" changeType="positive" />
        <MetricCard icon={DollarSign} title="Custo por Lead" value="R$ 2.80" change="-R$ 0.40" changeType="positive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel distribution */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Canal</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {channelData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Niche performance */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Desempenho por Nicho</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={nichePerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="niche" type="category" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={90} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="leads" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Leads" />
              <Bar dataKey="meetings" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} name="Reuniões" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
