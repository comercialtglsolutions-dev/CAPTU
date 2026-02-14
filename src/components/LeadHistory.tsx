import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, CheckCircle2, Clock } from "lucide-react";

interface HistoryItem {
    id: string;
    type: string;
    message: string;
    status: string;
    data_envio: string;
}

export function LeadHistory({ leadId }: { leadId: string }) {
    const { data: history, isLoading } = useQuery({
        queryKey: ["history", leadId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("contact_history")
                .select("*")
                .eq("company_id", leadId)
                .order("data_envio", { ascending: false });

            if (error) throw error;
            return data as HistoryItem[];
        },
        enabled: !!leadId,
    });

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
    }

    if (!history || history.length === 0) {
        return (
            <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-border">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Inicie uma automação para ver o histórico.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {history.map((item) => (
                <div key={item.id} className="relative pl-4 border-l-2 border-primary/20 pb-4 last:pb-0">
                    <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />

                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                                <MessageSquare className="h-3 w-3" />
                                {item.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(item.data_envio).toLocaleString()}
                            </span>
                        </div>

                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed select-text">
                            {item.message}
                        </p>

                        <div className="mt-3 flex items-center justify-end">
                            {item.status === 'sent' && (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-3 w-3" /> Enviado
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
