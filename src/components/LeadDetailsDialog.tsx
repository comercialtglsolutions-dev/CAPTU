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
  updated_at?: string;
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
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden border-border bg-background">
        {/* Header Dialog w/ Gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-inner">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">{lead.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <DialogDescription className="text-sm text-muted-foreground">{lead.segment || "Lead Coletado"}</DialogDescription>
                <Separator orientation="vertical" className="h-3" />
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {lead.city}, {lead.state}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Sidebar Info */}
            <div className="md:col-span-1 bg-muted/30 p-6 space-y-6 border-r border-border/50">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  Detalhes do Lead
                </h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-background p-1 rounded-md border border-border shadow-sm">
                      <MapPin className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Localização</p>
                      <p className="text-xs font-medium text-foreground leading-snug">{lead.address || `${lead.city}, ${lead.state}`}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-background p-1 rounded-md border border-border shadow-sm">
                      <Phone className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Telefone</p>
                      <p className="text-xs font-medium text-foreground">{lead.phone || "Não informado"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-background p-1 rounded-md border border-border shadow-sm">
                      <Globe className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Website</p>
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline break-all">
                          {lead.website}
                        </a>
                      ) : (
                        <p className="text-xs font-medium text-muted-foreground italic">Não disponível</p>
                      )}
                    </div>
                  </div>

                  {lead.email && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-background p-1 rounded-md border border-border shadow-sm">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Email</p>
                        <p className="text-xs font-medium text-foreground break-all">{lead.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-3 w-3" />
                  Qualificação
                </h4>
                <div className="glass-card p-4 rounded-xl space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium text-foreground">Score</span>
                      <ScoreBadge score={lead.score || 0} />
                    </div>
                  </div>

                  <div className="pt-2 space-y-2 border-t border-border/50">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Rating Google:</span>
                      <span className="font-medium text-foreground">⭐ {lead.rating || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-foreground">
                      <span className="text-muted-foreground">Avaliações:</span>
                      <span className="font-medium">{lead.user_ratings_total || 0} total</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-foreground">
                      <span className="text-muted-foreground">Site Próprio:</span>
                      <Badge variant={lead.has_own_website ? "outline" : "destructive"} className="text-[9px] h-3.5 px-1">
                        {lead.has_own_website ? "Sim" : "Não"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Histórico */}
            <div className="md:col-span-2 p-6 space-y-5">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Histórico de Contatos
                </h4>
                <span className="text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded-sm tracking-widest">
                  Atividade: {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : "-"}
                </span>
              </div>

              <LeadHistory leadId={lead.id} />
            </div>
          </div>
        </div>

        <Separator className="my-0 bg-border/50" />

        <div className="px-6 py-4 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
            <Calendar className="h-3 w-3" />
            <span>Coletado em: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="font-semibold text-xs" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 px-4 text-xs"
              onClick={() => {
                mutation.mutate(lead.id);
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />}
              Iniciar Prospecção
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
