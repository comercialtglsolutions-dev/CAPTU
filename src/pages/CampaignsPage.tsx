import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreHorizontal,
  Loader2,
  Play,
  Pause,
  Eye,
  Copy,
  Trash2,
  Users,
  MessageSquare,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { CampaignDetailsDialog } from "@/components/CampaignDetailsDialog";

type CampaignStatus = "draft" | "active" | "paused" | "completed";
type CampaignFilter = "all" | CampaignStatus;

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  message_template: string;
  daily_limit: number;
  sent_count: number;
  replies_count: number;
  meetings_count: number;
  created_at: string;
  updated_at: string;
  filters: any;
}

export default function CampaignsPage() {
  const [statusFilter, setStatusFilter] = useState<CampaignFilter>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { error } = await supabase
        .from("campaigns")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Status da campanha atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir campanha");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const { error } = await supabase.from("campaigns").insert({
        name: `${campaign.name} (Cópia)`,
        description: campaign.description,
        status: "draft",
        message_template: campaign.message_template,
        daily_limit: campaign.daily_limit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha duplicada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao duplicar campanha");
    },
  });

  const filteredCampaigns = campaigns?.filter((c) =>
    statusFilter === "all" ? true : c.status === statusFilter
  );

  const stats = {
    all: campaigns?.length || 0,
    active: campaigns?.filter((c) => c.status === "active").length || 0,
    paused: campaigns?.filter((c) => c.status === "paused").length || 0,
    draft: campaigns?.filter((c) => c.status === "draft").length || 0,
    completed: campaigns?.filter((c) => c.status === "completed").length || 0,
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "paused":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "draft":
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  const getStatusLabel = (status: CampaignStatus) => {
    switch (status) {
      case "active":
        return "Ativa";
      case "paused":
        return "Pausada";
      case "draft":
        return "Rascunho";
      case "completed":
        return "Concluída";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Campanhas" description="Gerencie suas campanhas de prospecção automatizada">
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </PageHeader>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          Todas
          <Badge variant="secondary" className="ml-2 text-xs">
            {stats.all}
          </Badge>
        </Button>
        <Button
          variant={statusFilter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("active")}
        >
          Ativas
          <Badge variant="secondary" className="ml-2 text-xs bg-emerald-500/10 text-emerald-600">
            {stats.active}
          </Badge>
        </Button>
        <Button
          variant={statusFilter === "paused" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("paused")}
        >
          Pausadas
          <Badge variant="secondary" className="ml-2 text-xs bg-amber-500/10 text-amber-600">
            {stats.paused}
          </Badge>
        </Button>
        <Button
          variant={statusFilter === "draft" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("draft")}
        >
          Rascunhos
          <Badge variant="secondary" className="ml-2 text-xs">
            {stats.draft}
          </Badge>
        </Button>
        <Button
          variant={statusFilter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("completed")}
        >
          Concluídas
          <Badge variant="secondary" className="ml-2 text-xs">
            {stats.completed}
          </Badge>
        </Button>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns?.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {statusFilter === "all" ? "Nenhuma campanha criada" : `Nenhuma campanha ${statusFilter === "active" ? "ativa" : statusFilter === "paused" ? "pausada" : statusFilter === "draft" ? "em rascunho" : "concluída"}`}
          </h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira campanha de prospecção automatizada!
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns?.map((campaign) => (
            <div key={campaign.id} className="glass-card rounded-xl p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1 truncate">{campaign.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {campaign.description || "Sem descrição"}
                  </p>
                  <Badge className={`text-xs ${getStatusColor(campaign.status)}`}>
                    {getStatusLabel(campaign.status)}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedCampaign(campaign)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    {campaign.status === "active" ? (
                      <DropdownMenuItem
                        onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "paused" })}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar
                      </DropdownMenuItem>
                    ) : campaign.status === "paused" || campaign.status === "draft" ? (
                      <DropdownMenuItem
                        onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: "active" })}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Ativar
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => duplicateMutation.mutate(campaign)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(campaign.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Enviados</p>
                  <p className="text-lg font-bold text-foreground">{campaign.sent_count}</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Respostas</p>
                  <p className="text-lg font-bold text-foreground">{campaign.replies_count}</p>
                  {campaign.sent_count > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {((campaign.replies_count / campaign.sent_count) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Reuniões</p>
                  <p className="text-lg font-bold text-foreground">{campaign.meetings_count}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(campaign.created_at).toLocaleDateString()}
                </span>
                <span>Limite: {campaign.daily_limit}/dia</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Campaign Details Dialog */}
      {selectedCampaign && (
        <CampaignDetailsDialog
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onOpenChange={(open) => !open && setSelectedCampaign(null)}
        />
      )}
    </>
  );
}
