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
    color: "bg-blue-50/50 border-blue-100",
    headerColor: "text-blue-700 bg-blue-100",
    icon: "📩"
  },
  {
    id: "responded",
    label: "Respondido",
    color: "bg-purple-50/50 border-purple-100",
    headerColor: "text-purple-700 bg-purple-100",
    icon: "💬"
  },
  {
    id: "negotiating",
    label: "Em negociação",
    color: "bg-orange-50/50 border-orange-100",
    headerColor: "text-orange-700 bg-orange-100",
    icon: "🤝"
  },
  {
    id: "won",
    label: "Fechado",
    color: "bg-green-50/50 border-green-100",
    headerColor: "text-green-700 bg-green-100",
    icon: "⭐"
  },
  {
    id: "lost",
    label: "Perdido",
    color: "bg-red-50/50 border-red-100",
    headerColor: "text-red-700 bg-red-100",
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

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-[1200px] h-full">
            {FUNNEL_STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <div key={stage.id} className="flex flex-col w-80 shrink-0">
                  {/* Column Header */}
                  <div className={`p-3 rounded-t-xl border-b flex items-center justify-between mb-2 bg-white shadow-sm border-gray-100`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${stage.headerColor}`}>
                        {stage.icon}
                      </div>
                      <h3 className="font-semibold text-gray-700 text-sm">
                        {stage.label}
                      </h3>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${stage.headerColor}`}>
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
                            : "bg-gray-50/50"
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
                                  className={`group relative bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-xl rotate-1 scale-105 z-50 ring-2 ring-primary" : ""
                                    }`}
                                  onMouseEnter={() => setHoveredCard(lead.id)}
                                  onMouseLeave={() => setHoveredCard(null)}
                                >
                                  {/* Header do Card */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <Avatar className="h-8 w-8 bg-gray-100 border border-gray-200 shrink-0">
                                        <AvatarFallback className="text-xs font-bold text-gray-500 bg-gray-50">
                                          {getInitials(lead.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <h4 className="font-semibold text-sm text-gray-900 truncate" title={lead.name}>
                                          {lead.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 truncate">
                                          {lead.segment}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Actions Menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
                                    {lead.rating && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                                        ⭐ {lead.rating}
                                      </span>
                                    )}
                                  </div>

                                  {/* Footer Info */}
                                  <div className="space-y-1.5 pt-2 border-t border-gray-50">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{lead.city}, {lead.state}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
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
                            <div className="flex flex-col items-center justify-center h-32 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
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

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
          {/* Header Dialog w/ Gradient */}
          <div className="bg-gradient-to-r from-gray-50 to-white border-b px-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {selectedLead ? getInitials(selectedLead.name) : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl text-gray-900">{selectedLead?.name}</DialogTitle>
                <p className="text-muted-foreground">{selectedLead?.segment}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 h-full">
              {/* Sidebar Info */}
              <div className="md:col-span-1 bg-gray-50/50 p-6 space-y-6 border-r h-full">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Detalhes do Lead</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Localização</p>
                        <p className="text-sm text-gray-600">{selectedLead?.address || `${selectedLead?.city}, ${selectedLead?.state}`}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Telefone</p>
                        <p className="text-sm text-gray-600">{selectedLead?.phone || "Não informado"}</p>
                      </div>
                    </div>
                    {selectedLead?.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email</p>
                          <p className="text-sm text-gray-600 break-all">{selectedLead.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Métricas</h4>
                  <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Score</span>
                      <ScoreBadge score={selectedLead?.score || 0} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avaliação</span>
                      <span className="text-sm font-medium flex items-center gap-1">
                        ⭐ {selectedLead?.rating || "-"}
                        <span className="text-xs text-gray-400 font-normal">({selectedLead?.user_ratings_total || 0})</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content History */}
              <div className="md:col-span-2 p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-semibold text-gray-900">Histórico de Atividades</h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    Última atualização: {selectedLead?.updated_at ? format(new Date(selectedLead.updated_at), "dd/MM/yyyy HH:mm") : "-"}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200 h-[400px] overflow-y-auto">
                  <LeadHistory leadId={selectedLead?.id || ""} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedLead(null)}>
              Fechar
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Phone className="h-4 w-4 mr-2" />
              Entrar em Contato
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
