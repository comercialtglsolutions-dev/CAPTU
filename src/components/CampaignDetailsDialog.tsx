import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Users, MessageSquare, TrendingUp, Calendar } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";

interface Campaign {
    id: string;
    name: string;
    description: string;
    status: string;
    message_template: string;
    daily_limit: number;
    sent_count: number;
    replies_count: number;
    meetings_count: number;
    created_at: string;
    filters: any;
}

interface CampaignDetailsDialogProps {
    campaign: Campaign;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CampaignDetailsDialog({ campaign, open, onOpenChange }: CampaignDetailsDialogProps) {
    const { data: campaignLeads, isLoading } = useQuery({
        queryKey: ["campaign-leads", campaign.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("campaign_leads")
                .select("*, leads(*)")
                .eq("campaign_id", campaign.id)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
        },
        enabled: open,
    });

    const responseRate = campaign.sent_count > 0
        ? ((campaign.replies_count / campaign.sent_count) * 100).toFixed(1)
        : "0.0";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{campaign.description || "Sem descrição"}</p>
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
                            <p className="text-sm text-foreground whitespace-pre-wrap">{campaign.message_template}</p>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Campaign Leads */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Leads na Campanha (Últimos 10)</h4>
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
                                    <div key={cl.id} className="glass-card p-3 rounded-lg flex items-center justify-between">
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
