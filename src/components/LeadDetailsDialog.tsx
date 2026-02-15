import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Info, MapPin, Phone, Mail, Globe, Star, Calendar, Send, Loader2 } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { LeadHistory } from "@/components/LeadHistory";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_URL } from "@/config";

interface Lead {
  id: string;
  name: string;
  segment?: string;
  city?: string;
  state?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  has_own_website?: boolean;
  score?: number;
  rating?: number;
  user_ratings_total?: number;
  created_at?: string;
  status?: string;
}

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsDialog({ lead, open, onOpenChange }: LeadDetailsDialogProps) {
  const queryClient = useQueryClient();

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

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{lead.name}</DialogTitle>
              <DialogDescription>{lead.segment || "Lead Coletado"}</DialogDescription>
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
                    <span>{lead.address || `${lead.city}, ${lead.state || 'Local não informado'}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.phone || "Não disponível"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.email || "E-mail não detectado"}</span>
                  </div>
                  {lead.website ? (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Globe className="h-4 w-4" />
                      <a href={lead.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {lead.website}
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
                    <ScoreBadge score={lead.score || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-foreground">
                      <span className="text-muted-foreground">Rating Google:</span>
                      <span className="font-medium">⭐ {lead.rating || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-foreground">
                      <span className="text-muted-foreground">Avaliações:</span>
                      <span className="font-medium">{lead.user_ratings_total || 0} total</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-foreground">
                      <span className="text-muted-foreground">Site Próprio:</span>
                      <Badge variant={lead.has_own_website ? "outline" : "destructive"} className="text-[10px] h-4">
                        {lead.has_own_website ? "Sim" : "Não"}
                      </Badge>
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

              <LeadHistory leadId={lead.id} />
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span>Coletado em: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                mutation.mutate(lead.id);
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
  );
}
