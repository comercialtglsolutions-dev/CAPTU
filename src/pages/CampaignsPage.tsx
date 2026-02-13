import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CampaignsPage() {
  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="Campanhas" description="Gerencie suas campanhas de prospecção">
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </PageHeader>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
            <p className="text-muted-foreground">Carregando campanhas...</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-xl p-12 text-center text-destructive">
            Erro ao carregar campanhas.
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
            Nenhuma campanha criada ainda. Comece criando sua primeira campanha!
          </div>
        ) : (
          campaigns?.map((c) => (
            <div key={c.id} className="glass-card rounded-xl p-5 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <StatusBadge status={c.status as any} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.niche} · {c.city} · Limite: {c.daily_limit}/dia
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                  <p className="text-lg font-bold text-foreground">{c.sent_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Respostas</p>
                  <p className="text-lg font-bold text-foreground">{c.replies_count}</p>
                  {c.sent_count > 0 && (
                    <p className="text-xs text-success">
                      {((c.replies_count / c.sent_count) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reuniões</p>
                  <p className="text-lg font-bold text-foreground">{c.meetings_count}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
