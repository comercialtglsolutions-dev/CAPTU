import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Mail, MessageCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ContactsPage() {
  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ["contacts_history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts_history")
        .select(`
          *,
          leads (
            name
          )
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="Histórico de Contatos" description="Acompanhe todos os envios e respostas" />

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Canal</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensagem</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-muted-foreground">Carregando histórico...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-destructive">
                    Erro ao carregar histórico.
                  </td>
                </tr>
              ) : contacts?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhum contato realizado ainda.
                  </td>
                </tr>
              ) : (
                contacts?.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      {c.type === "email" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/15">
                          <Mail className="h-4 w-4 text-info" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15">
                          <MessageCircle className="h-4 w-4 text-success" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {(c.leads as any)?.name || "Lead desconhecido"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">{c.message}</td>
                    <td className="py-3 px-4"><StatusBadge status={c.status as any} /></td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {new Date(c.date).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
