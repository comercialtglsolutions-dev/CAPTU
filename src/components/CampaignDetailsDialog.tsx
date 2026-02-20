import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, MessageSquare, TrendingUp, Calendar, Trash2 } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_URL } from "@/config";

type CampaignStatus = "draft" | "active" | "paused" | "completed";

interface Campaign {
    id: string;
    name: string;
    status: CampaignStatus;
    niche: string;
    daily_limit: number;
    sent_count: number;
    replies_count: number;
    meetings_count: number;
    created_at: string;
    updated_at: string;
}

interface CampaignDetailsDialogProps {
    campaign: Campaign;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CampaignDetailsDialog({ campaign, open, onOpenChange }: CampaignDetailsDialogProps) {
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const queryClient = useQueryClient();

    const { data: campaignLeads, isLoading } = useQuery({
        queryKey: ["campaign-leads", campaign.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("campaign_leads")
                .select("*, leads(*)")
                .eq("campaign_id", campaign.id)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            return data;
        },
        enabled: open,
    });

    const removeLeadsMutation = useMutation({
        mutationFn: async (leadIds: string[]) => {
            const response = await fetch(`${API_URL}/api/campaigns/${campaign.id}/leads`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadIds }),
            });
            if (!response.ok) throw new Error("Erro ao remover leads");
            return response.json();
        },
        onSuccess: () => {
            toast.success("Leads removidos", {
                description: `${selectedLeadIds.length} leads foram removidos desta campanha.`
            });
            setSelectedLeadIds([]);
            queryClient.invalidateQueries({ queryKey: ["campaign-leads", campaign.id] });
        },
        onError: (error: any) => {
            toast.error("Erro", { description: error.message });
        }
    });

    const toggleAll = () => {
        if (selectedLeadIds.length === campaignLeads?.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(campaignLeads?.map((cl: any) => cl.lead_id) || []);
        }
    };

    const toggleLead = (leadId: string) => {
        setSelectedLeadIds(prev =>
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        );
    };

    const responseRate = campaign.sent_count > 0
        ? ((campaign.replies_count / campaign.sent_count) * 100).toFixed(1)
        : "0.0";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-[calc(100%-2rem)] h-[85vh] flex flex-col rounded-2xl md:rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1">
                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="glass-card p-4 rounded-lg text-center">
                            <Users className="h-5 w-5 mx-auto text-primary mb-2" />
                            <p className="text-2xl font-bold text-foreground">{campaign.sent_count}</p>
                            <p className="text-xs text-muted-foreground">Enviados</p>
                        </div>
                        <div className="glass-card p-4 rounded-lg text-center">
                            <MessageSquare className="h-5 w-5 mx-auto text-primary mb-2" />
                            <p className="text-2xl font-bold text-foreground">{campaign.replies_count}</p>
                            <p className="text-xs text-muted-foreground">Respostas</p>
                        </div>
                        <div className="glass-card p-4 rounded-lg text-center">
                            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-2" />
                            <p className="text-2xl font-bold text-foreground">{responseRate}%</p>
                            <p className="text-xs text-muted-foreground">Taxa de Resposta</p>
                        </div>
                        <div className="glass-card p-4 rounded-lg text-center">
                            <Calendar className="h-5 w-5 mx-auto text-primary mb-2" />
                            <p className="text-2xl font-bold text-foreground">{campaign.meetings_count}</p>
                            <p className="text-xs text-muted-foreground">Reuniões</p>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Message Template */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold mb-2">Template de Mensagem</h4>
                        <div className="glass-card p-4 rounded-lg bg-muted/30">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{campaign.niche}</p>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Campaign Leads */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <h4 className="text-sm font-semibold">Leads na Campanha</h4>
                                {campaignLeads && campaignLeads.length > 0 && (
                                    <div className="flex items-center gap-2 ml-2">
                                        <Checkbox
                                            checked={selectedLeadIds.length > 0 && selectedLeadIds.length === campaignLeads.length}
                                            onCheckedChange={toggleAll}
                                        />
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Selecionar todos</span>
                                    </div>
                                )}
                            </div>

                            {selectedLeadIds.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                    onClick={() => removeLeadsMutation.mutate(selectedLeadIds)}
                                    disabled={removeLeadsMutation.isPending}
                                >
                                    {removeLeadsMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                        <Trash2 className="h-3 w-3 mr-1" />
                                    )}
                                    Remover ({selectedLeadIds.length})
                                </Button>
                            )}
                        </div>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : campaignLeads?.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground text-sm">
                                Nenhum lead adicionado ainda
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {campaignLeads?.map((cl: any) => (
                                    <div
                                        key={cl.id}
                                        className={`glass-card p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedLeadIds.includes(cl.lead_id) ? 'bg-primary/5 border-primary/20' : ''}`}
                                    >
                                        <Checkbox
                                            checked={selectedLeadIds.includes(cl.lead_id)}
                                            onCheckedChange={() => toggleLead(cl.lead_id)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-foreground truncate">{cl.leads.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {cl.leads.city}, {cl.leads.state} · {cl.leads.segment}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ScoreBadge score={cl.leads.score} />
                                            <Badge variant={cl.status === "sent" ? "default" : "secondary"} className="text-xs">
                                                {cl.status === "sent" ? "Enviado" : cl.status === "pending" ? "Pendente" : "Falhou"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Criada em: {new Date(campaign.created_at).toLocaleDateString()}</span>
                    <span>Limite diário: {campaign.daily_limit} envios</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
