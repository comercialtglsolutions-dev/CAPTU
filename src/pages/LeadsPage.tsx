import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  Eye,
  Loader2,
  Send,
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Info,
  Check,
  CheckCircle2,
  ChevronRight,
  Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LeadDetailsDialog } from "@/components/LeadDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LeadHistory } from "@/components/LeadHistory";
import { API_URL } from "@/config";

type QualificationFilter = "all" | "qualified" | "unqualified";

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [qualificationFilter, setQualificationFilter] = useState<QualificationFilter>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: leads, isLoading, error } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Query for unique segments with counts (normalized by lowercase)
  const { data: segments } = useQuery({
    queryKey: ["segments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("segment")
        .not("segment", "is", null);

      if (error) throw error;

      // Group and count segments (case-insensitive)
      const segmentCounts = data.reduce((acc: Record<string, number>, lead: any) => {
        const segment = lead.segment;
        if (segment) {
          // Normalize to lowercase for grouping
          const normalizedSegment = segment.toLowerCase();
          acc[normalizedSegment] = (acc[normalizedSegment] || 0) + 1;
        }
        return acc;
      }, {});

      // Helper function to capitalize first letter
      const capitalize = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };

      // Convert to array, capitalize, and sort by count
      return Object.entries(segmentCounts)
        .map(([segment, count]) => ({
          segment: capitalize(segment),
          normalizedSegment: segment, // Keep lowercase for filtering
          count
        }))
        .sort((a, b) => (b.count as number) - (a.count as number));
    },
  });

  const mutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`${API_URL}/api/leads/${leadId}/send-to-n8n`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Falha ao disparar n8n");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Automação disparada!", {
        description: "O lead foi enviado para o fluxo do n8n.",
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      toast.error("Erro na automação", {
        description: "Verifique se o backend e o n8n estão configurados corretamente.",
      });
    },
  });

  // Query for active campaigns
  const { data: activeCampaigns } = useQuery({
    queryKey: ["active-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Mutation to add leads to campaign
  const addToCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, leadIds }: { campaignId: string; leadIds: string[] }) => {
      const response = await fetch(`${API_URL}/api/campaigns/${campaignId}/add-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      if (!response.ok) throw new Error("Erro ao adicionar leads à campanha");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Leads adicionados!", {
        description: `${selectedLeadIds.length} leads foram enfileirados na campanha escolhida.`,
      });
      setSelectedLeadIds([]);
      setIsCampaignDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: any) => {
      toast.error("Erro", { description: error.message });
    },
  });

  // Mutation to delete leads
  const deleteMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const response = await fetch(`${API_URL}/api/leads/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      if (!response.ok) throw new Error("Erro ao excluir leads");
      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Leads excluídos!", {
        description: `${data.count} leads foram removidos da base de dados.`,
      });
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["segments"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir", { description: error.message });
    },
  });

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedLeadIds.length === filtered.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filtered.map(l => l.id));
    }
  };

  // Combined filter logic with useMemo for performance
  const filtered = useMemo(() => {
    let result = leads;

    // 1. Apply qualification filter
    if (qualificationFilter === "qualified") {
      result = result?.filter((l) => l.score >= 60);
    } else if (qualificationFilter === "unqualified") {
      result = result?.filter((l) => l.score < 60);
    }

    // 2. Apply segment filter (case-insensitive comparison)
    if (segmentFilter !== "all") {
      result = result?.filter((l) => l.segment?.toLowerCase() === segmentFilter.toLowerCase());
    }

    // 3. Apply search filter
    result = result?.filter(
      (l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.segment && l.segment.toLowerCase().includes(search.toLowerCase())) ||
        (l.city && l.city.toLowerCase().includes(search.toLowerCase()))
    );

    return result || [];
  }, [leads, qualificationFilter, segmentFilter, search]);

  return (
    <>
      <PageHeader title="Leads" description="Gerencie e qualifique seus leads B2B" />

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, segmento ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 md:h-10" // Slightly taller on mobile for easier touch
            />
          </div>
          <Button variant="outline" size="default" className="w-full md:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {/* Qualification Filter Buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qualificação</span>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
              <Button
                variant={qualificationFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setQualificationFilter("all")}
                className="gap-2 h-9"
              >
                Todos
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4 min-w-[20px] justify-center">
                  {leads?.length || 0}
                </Badge>
              </Button>
              <Button
                variant={qualificationFilter === "qualified" ? "default" : "outline"}
                size="sm"
                onClick={() => setQualificationFilter("qualified")}
                className="gap-2 h-9"
              >
                Qualificados
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4 min-w-[20px] justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {leads?.filter((l) => l.score >= 60).length || 0}
                </Badge>
              </Button>
              <Button
                variant={qualificationFilter === "unqualified" ? "default" : "outline"}
                size="sm"
                onClick={() => setQualificationFilter("unqualified")}
                className="gap-2 h-9"
              >
                Desqualificados
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4 min-w-[20px] justify-center bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                  {leads?.filter((l) => l.score < 60).length || 0}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Segment Filter Select */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nicho / Segmento</Label>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Todos os nichos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos os nichos ({leads?.length || 0})
                </SelectItem>
                {segments?.map((s: any) => (
                  <SelectItem key={s.segment} value={s.segment}>
                    {s.segment} ({s.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Leads List */}
      <div className="glass-card rounded-xl overflow-hidden border border-border/50">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-4 px-4 w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedLeadIds.length === filtered.length}
                    onCheckedChange={toggleAllSelection}
                  />
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cidade</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Score</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-muted-foreground">Carregando leads...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {search ? "Nenhum lead encontrado." : "Nenhum lead cadastrado ainda."}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer ${selectedLeadIds.includes(lead.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleLeadSelection(lead.id)}
                  >
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeadIds.includes(lead.id)}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-foreground">{lead.name}</div>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-primary/20 bg-primary/5 text-primary mt-1">
                          {lead.segment || "Sem segmento"}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {lead.city}, {lead.state}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center"><ScoreBadge score={lead.score} /></td>
                    <td className="py-4 px-4 text-center"><StatusBadge status={lead.status as any} /></td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => mutation.mutate(lead.id)}
                          disabled={mutation.isPending && mutation.variables === lead.id}
                        >
                          {mutation.isPending && mutation.variables === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Cards with Border and Shadow */}
        <div className="md:hidden flex flex-col p-4 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
              Buscando leads...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {search ? "Nenhum lead encontrado." : "Nenhum lead cadastrado ainda."}
            </div>
          ) : (
            filtered.map((lead) => (
              <div
                key={lead.id}
                className={`flex flex-col py-4 px-4 gap-2 rounded-xl border border-border/50 shadow-sm transition-all active:scale-[0.98] active:bg-muted/50 ${selectedLeadIds.includes(lead.id) ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 items-start">
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedLeadIds.includes(lead.id)}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                        className="h-4 w-4 opacity-70"
                      />
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground leading-tight truncate">{lead.name}</h4>
                        <StatusBadge status={lead.status as any} />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-none mt-1">{lead.segment || "Sem segmento"}</p>
                    </div>
                  </div>
                  <ScoreBadge score={lead.score} />
                </div>

                <div className="flex items-center justify-between mt-[-4px]">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground opacity-80">
                    <MapPin className="h-3 w-3" />
                    {lead.city}, {lead.state}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 gap-1.5 border-primary/20 text-primary hover:bg-primary/5 text-[10px] font-bold"
                      onClick={() => mutation.mutate(lead.id)}
                      disabled={mutation.isPending && mutation.variables === lead.id}
                    >
                      {mutation.isPending && mutation.variables === lead.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      <span>Enviado</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lead Details Dialog */}
      <LeadDetailsDialog
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      />

      {/* Campaign Selection Dialog */}
      <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar à Campanha</DialogTitle>
            <DialogDescription>
              Selecione em qual campanha deseja enfileirar os {selectedLeadIds.length} leads selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Escolha a Campanha Ativa:</Label>
              <Select onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma campanha..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns?.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={!selectedCampaignId || addToCampaignMutation.isPending}
              onClick={() => selectedCampaignId && addToCampaignMutation.mutate({
                campaignId: selectedCampaignId,
                leadIds: selectedLeadIds
              })}
            >
              {addToCampaignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar Enfileiramento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 w-[calc(100%-2rem)] md:w-auto">
          <div className="bg-foreground text-background md:px-6 py-4 md:py-3 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6 border border-white/10 backdrop-blur-md bg-opacity-90 px-4">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {selectedLeadIds.length}
                </div>
                <span className="text-sm font-medium">Selecionados</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-background hover:text-background hover:bg-white/10 md:hidden"
                onClick={() => setSelectedLeadIds([])}
              >
                Limpar
              </Button>
            </div>

            <Separator orientation="vertical" className="hidden md:block h-4 bg-white/20" />

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                size="sm"
                variant="ghost"
                className="hidden md:flex text-background hover:text-background hover:bg-white/10"
                onClick={() => setSelectedLeadIds([])}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 md:h-9"
                onClick={() => setIsCampaignDialogOpen(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Adicionar à Campanha</span>
                <span className="sm:hidden">Campanha</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 md:flex-none font-semibold h-11 md:h-9"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir ${selectedLeadIds.length} leads permanentemente?`)) {
                    deleteMutation.mutate(selectedLeadIds);
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
