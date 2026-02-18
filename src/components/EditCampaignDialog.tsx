import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface EditCampaignDialogProps {
    campaign: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2;

export function EditCampaignDialog({ campaign, open, onOpenChange }: EditCampaignDialogProps) {
    const [step, setStep] = useState<Step>(1);
    const [formData, setFormData] = useState({
        name: "",
        niche: "",
        daily_limit: 50,
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        if (campaign && open) {
            setFormData({
                name: campaign.name || "",
                niche: campaign.niche || "",
                daily_limit: campaign.daily_limit || 50,
            });
            setStep(1);
        }
    }, [campaign, open]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("campaigns")
                .update({
                    name: formData.name,
                    niche: formData.niche,
                    daily_limit: formData.daily_limit,
                })
                .eq("id", campaign.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            toast.success("Campanha atualizada com sucesso!");
            onOpenChange(false);
        },
        onError: () => {
            toast.error("Erro ao atualizar campanha");
        },
    });

    const handleNext = () => {
        if (step < 2) setStep((step + 1) as Step);
    };

    const handleBack = () => {
        if (step > 1) setStep((step - 1) as Step);
    };

    const canProceed = () => {
        if (step === 1) return formData.name.trim() !== "";
        if (step === 2) return formData.niche.trim() !== "";
        return false;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Editar Campanha</DialogTitle>
                    <DialogDescription>
                        Etapa {step} de 2: {step === 1 ? "Configuração Básica" : "Mensagem e Automação"}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Indicator */}
                <div className="flex items-center gap-2 mb-6">
                    {[1, 2].map((s) => (
                        <div key={s} className="flex items-center flex-1">
                            <div
                                className={`h-2 rounded-full flex-1 transition-colors ${s <= step ? "bg-primary" : "bg-muted"
                                    }`}
                            />
                        </div>
                    ))}
                </div>

                {/* Step 1: Basic Configuration */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Nome da Campanha *</Label>
                            <Input
                                id="edit-name"
                                placeholder="Ex: Prospecção Oficinas SP"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-xs text-muted-foreground">
                                Nota: A edição do nome não afeta os envios já realizados.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 2: Message Template & Limit */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-message">Template de Mensagem *</Label>
                            <Textarea
                                id="edit-message"
                                placeholder="Olá {{name}}, percebi que sua empresa atua no segmento {{segment}} em {{city}}..."
                                value={formData.niche}
                                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                                rows={6}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Variáveis disponíveis: <code>{"{{name}}"}</code>, <code>{"{{segment}}"}</code>, <code>{"{{city}}"}</code>
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="edit-daily_limit">Limite Diário de Envios</Label>
                            <Input
                                id="edit-daily_limit"
                                type="number"
                                min="1"
                                max="500"
                                value={formData.daily_limit}
                                onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                )}

                <Separator />

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={handleBack} disabled={step === 1}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        {step < 2 ? (
                            <Button onClick={handleNext} disabled={!canProceed()}>
                                Próximo
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={() => updateMutation.mutate()} disabled={!canProceed() || updateMutation.isPending}>
                                {updateMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Salvar Alterações
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
