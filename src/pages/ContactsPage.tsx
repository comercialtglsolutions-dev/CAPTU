import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Building2, Phone, Mail, MapPin, Loader2, Eye, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import ScoreBadge from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { LeadHistory } from "@/components/LeadHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  updated_at: string;
}

const FUNNEL_STAGES: { id: FunnelStage; label: string; color: string; headerColor: string; icon: string }[] = [
  {
    id: "contacted",
    label: "Contatado",
    color: "bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10",
    headerColor: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20",
    icon: "📩"
  },
  {
    id: "responded",
    label: "Respondido",
    color: "bg-purple-50/50 dark:bg-purple-500/5 border-purple-100 dark:border-purple-500/10",
    headerColor: "text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20",
    icon: "💬"
  },
  {
    id: "negotiating",
    label: "Em negociação",
    color: "bg-orange-50/50 dark:bg-orange-500/5 border-orange-100 dark:border-orange-500/10",
    headerColor: "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20",
    icon: "🤝"
  },
  {
    id: "won",
    label: "Fechado",
    color: "bg-green-50/50 dark:bg-green-500/5 border-green-100 dark:border-green-500/10",
    headerColor: "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/20",
    icon: "⭐"
  },
  {
    id: "lost",
    label: "Perdido",
    color: "bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10",
    headerColor: "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20",
    icon: "❌"
  },
];

export default function ContactsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
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

    if (newStatus === leads?.find(l => l.id === leadId)?.status) return;

    updateStatusMutation.mutate({ leadId, newStatus });
  };

  const getLeadsByStage = (stage: FunnelStage) => {
    return leads?.filter((lead) => lead.status === stage) || [];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader
        title="Pipeline de Vendas"
        description="Gerencie suas oportunidades e acompanhe o progresso de cada negociação."
      />

      <div className="flex-1 pb-4 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full overflow-x-auto pb-4 px-1 snap-x snap-mandatory md:snap-none md:overflow-x-auto custom-scrollbar">
            {FUNNEL_STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <div key={stage.id} className="flex flex-col flex-none w-[85vw] md:w-auto md:flex-1 md:min-w-[260px] snap-center md:snap-align-none first:ml-4 last:mr-4 md:ml-0 md:mr-0">
                  {/* Column Header */}
                  <div className={`p-4 rounded-t-xl border-b flex items-center justify-between mb-2 bg-card shadow-sm border-border/50`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm ${stage.headerColor}`}>
                        {stage.icon}
                      </div>
                      <h3 className="font-bold text-foreground text-sm uppercase tracking-tight">
                        {stage.label}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ring-1 ring-inset ${stage.headerColor} min-w-[24px] text-center`}>
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 rounded-xl transition-all duration-300 relative ${snapshot.isDraggingOver
                          ? "bg-primary/5 ring-2 ring-primary/20 ring-inset"
                          : "bg-muted/30"
                          }`}
                      >
                        <div className="space-y-3 h-full overflow-y-auto max-h-[calc(100vh-250px)] pr-1 custom-scrollbar">
                          {stageLeads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`group relative bg-card p-4 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-xl rotate-1 scale-105 z-50 ring-2 ring-primary" : ""
                                    }`}
                                  onMouseEnter={() => setHoveredCard(lead.id)}
                                  onMouseLeave={() => setHoveredCard(null)}
                                >
                                  {/* Header do Card */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <Avatar className="h-8 w-8 bg-muted border border-border shrink-0">
                                        <AvatarFallback className="text-xs font-bold text-muted-foreground bg-muted/50">
                                          {getInitials(lead.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <h4 className="font-semibold text-sm text-foreground truncate" title={lead.name}>
                                          {lead.name}
                                        </h4>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {lead.segment}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Actions Menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                                          <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                          Ver detalhes
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                          onClick={() => {
                                            setLeadToDelete(lead);
                                            setDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {/* Info Chips */}
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    <ScoreBadge score={lead.score} />
                                  </div>

                                  {/* Footer Info */}
                                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{lead.city}, {lead.state}</span>
                                      </div>
                                      {lead.rating && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                          ⭐ {lead.rating}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                                      <span className="text-[10px]">Atualizado em {
                                        lead.updated_at
                                          ? format(new Date(lead.updated_at), "dd MMM", { locale: ptBR })
                                          : "-"
                                      }</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {stageLeads.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                              <span className="text-2xl opacity-20 mb-2">{stage.icon}</span>
                              <span className="text-sm font-medium">Vazio</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <LeadDetailsDialog
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente <strong>{leadToDelete?.name}</strong> e todo o seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leadToDelete && deleteMutation.mutate(leadToDelete.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
