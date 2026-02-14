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
  Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

type QualificationFilter = "all" | "qualified" | "unqualified";

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [qualificationFilter, setQualificationFilter] = useState<QualificationFilter>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
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
      const response = await fetch(`http://localhost:3000/api/leads/${leadId}/send-to-n8n`, {
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
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, segmento ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="default">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Qualification Filter Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-muted-foreground font-medium mr-2">Qualificação:</span>
            <Button
              variant={qualificationFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setQualificationFilter("all")}
              className="gap-2"
            >
              Todos
              <Badge variant="secondary" className="ml-1 text-xs">
                {leads?.length || 0}
              </Badge>
            </Button>
            <Button
              variant={qualificationFilter === "qualified" ? "default" : "outline"}
              size="sm"
              onClick={() => setQualificationFilter("qualified")}
              className="gap-2"
            >
              Qualificados
              <Badge variant="secondary" className="ml-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {leads?.filter((l) => l.score >= 60).length || 0}
              </Badge>
            </Button>
            <Button
              variant={qualificationFilter === "unqualified" ? "default" : "outline"}
              size="sm"
              onClick={() => setQualificationFilter("unqualified")}
              className="gap-2"
            >
              Desqualificados
              <Badge variant="secondary" className="ml-1 text-xs bg-red-500/10 text-red-600 dark:text-red-400">
                {leads?.filter((l) => l.score < 60).length || 0}
              </Badge>
            </Button>
          </div>

          {/* Segment Filter Select */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground font-medium whitespace-nowrap">Nicho:</Label>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
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
      {/* Table State */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cidade</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-muted-foreground">Carregando leads...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-destructive">
                    Erro ao carregar leads do Supabase.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    {search ? "Nenhum lead encontrado." : "Nenhum lead cadastrado ainda."}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{lead.name}</div>
                      <div className="text-[10px] text-muted-foreground">{lead.segment || "Sem segmento"}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{lead.city}, {lead.state}</td>
                    <td className="py-3 px-4"><ScoreBadge score={lead.score} /></td>
                    <td className="py-3 px-4"><StatusBadge status={lead.status as any} /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
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
      </div>

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
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    Informações Gerais
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{selectedLead?.address || `${selectedLead?.city}, ${selectedLead?.state || 'Local não informado'}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead?.phone || "Não disponível"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead?.email || "E-mail não detectado"}</span>
                    </div>
                    {selectedLead?.website ? (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Globe className="h-4 w-4" />
                        <a href={selectedLead.website} target="_blank" rel="noreferrer" className="hover:underline">
                          {selectedLead.website}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                        <Globe className="h-4 w-4" />
                        <span>Sem presença digital (site)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Star className="h-4 w-4 text-primary" />
                    Qualificação (Score)
                  </h4>
                  <div className="glass-card p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-foreground">Pontuação Total:</span>
                      <ScoreBadge score={selectedLead?.score || 0} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-foreground">
                        <span className="text-muted-foreground">Rating Google:</span>
                        <span className="font-medium">⭐ {selectedLead?.rating || "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-foreground">
                        <span className="text-muted-foreground">Avaliações:</span>
                        <span className="font-medium">{selectedLead?.user_ratings_total || 0} total</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Histórico */}
              <div className="space-y-4 border-l pl-6 border-border/50">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground mb-4">
                  <Calendar className="h-4 w-4 text-primary" />
                  Histórico de Contatos
                </h4>

                <LeadHistory leadId={selectedLead?.id} />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span>Coletado em: {selectedLead?.created_at ? new Date(selectedLead.created_at).toLocaleDateString() : '-'}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLead(null)}>Fechar</Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  mutation.mutate(selectedLead.id);
                  // Não fecha o modal para ver o toast
                }}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Iniciar Prospecção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
