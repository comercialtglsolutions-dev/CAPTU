import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Building2, Phone, Mail, MapPin, Loader2, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ScoreBadge from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { LeadHistory } from "@/components/LeadHistory";

type FunnelStage = "contacted" | "responded" | "negotiating" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  segment: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website: string;
  score: number;
  status: string;
  address: string;
  rating: number;
  user_ratings_total: number;
}

const FUNNEL_STAGES: { id: FunnelStage; label: string; color: string; icon: string }[] = [
  { id: "contacted", label: "Contatado", color: "bg-blue-500/10 border-blue-500/20", icon: "📩" },
  { id: "responded", label: "Respondido", color: "bg-purple-500/10 border-purple-500/20", icon: "💬" },
  { id: "negotiating", label: "Em negociação", color: "bg-amber-500/10 border-amber-500/20", icon: "🤝" },
  { id: "won", label: "Fechado", color: "bg-emerald-500/10 border-emerald-500/20", icon: "⭐" },
  { id: "lost", label: "Perdido", color: "bg-red-500/10 border-red-500/20", icon: "❌" },
];

export default function ContactsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .neq("status", "new")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead excluído com sucesso!");
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir lead", {
        description: error.message,
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId as FunnelStage;

    updateStatusMutation.mutate({ leadId, newStatus });
  };

  const getLeadsByStage = (stage: FunnelStage) => {
    return leads?.filter((lead) => lead.status === stage) || [];
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
      <PageHeader
        title="Funil de Vendas"
        description="Gerencie o pipeline de prospecção e acompanhe cada etapa do processo"
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {FUNNEL_STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.id);
            return (
              <div key={stage.id} className="flex flex-col">
                <div className={`rounded-t-xl p-4 border-2 ${stage.color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <span className="text-lg">{stage.icon}</span>
                      {stage.label}
                    </h3>
                    <span className="text-xs font-bold bg-background/50 px-2 py-1 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-3 space-y-3 min-h-[500px] border-2 border-t-0 rounded-b-xl transition-colors ${snapshot.isDraggingOver
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/20 border-border/30"
                        }`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`relative group glass-card p-4 rounded-lg border border-border/50 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:border-primary/30 ${snapshot.isDragging ? "shadow-2xl rotate-2 scale-105" : ""
                                }`}
                            >
                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLeadToDelete(lead);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>

                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm text-foreground truncate pr-6">
                                    {lead.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {lead.segment}
                                  </p>
                                </div>
                              </div>

                              <div className="mb-3">
                                <ScoreBadge score={lead.score} />
                              </div>

                              <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{lead.city}, {lead.state}</span>
                                </div>
                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{lead.phone}</span>
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLead(lead);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Ver Detalhes
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {stageLeads.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                          Nenhum lead nesta etapa
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedLead?.name}</DialogTitle>
                <DialogDescription>{selectedLead?.segment || "Lead Coletado"}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Coluna Esquerda: Dados */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Informações Gerais</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{selectedLead?.address || `${selectedLead?.city}, ${selectedLead?.state}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead?.phone || "Não disponível"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead?.email || "E-mail não detectado"}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Score:</span>
                    <ScoreBadge score={selectedLead?.score || 0} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ⭐ {selectedLead?.rating || "N/A"} ({selectedLead?.user_ratings_total || 0} avaliações)
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Histórico */}
              <div className="space-y-4 border-l pl-6 border-border/50">
                <h4 className="text-sm font-semibold text-foreground mb-4">Histórico de Contatos</h4>
                <LeadHistory leadId={selectedLead?.id || ""} />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setSelectedLead(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{leadToDelete?.name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e removerá:
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>Dados do lead ({leadToDelete?.segment})</li>
                <li>Histórico de contatos</li>
                <li>Vínculos com campanhas</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leadToDelete && deleteMutation.mutate(leadToDelete.id)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
