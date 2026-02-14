import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface CreateCampaignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3;

export function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
    const [step, setStep] = useState<Step>(1);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        message_template: "",
        daily_limit: 50,
        score_min: 60,
        segments: [] as string[],
    });

    const queryClient = useQueryClient();

    // Fetch leads for preview
    const { data: leads } = useQuery({
        queryKey: ["leads-preview", formData.score_min, formData.segments],
        queryFn: async () => {
            let query = supabase.from("leads").select("*", { count: "exact" });

            if (formData.score_min > 0) {
                query = query.gte("score", formData.score_min);
            }

            if (formData.segments.length > 0) {
                query = query.in("segment", formData.segments);
            }

            const { data, count, error } = await query;
            if (error) throw error;
            return { data, count };
        },
        enabled: step === 2,
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from("campaigns").insert({
                name: formData.name,
                description: formData.description,
                message_template: formData.message_template,
                daily_limit: formData.daily_limit,
                status: "draft",
                filters: {
                    score_min: formData.score_min,
                    segments: formData.segments,
                },
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            toast.success("Campanha criada com sucesso!");
            onOpenChange(false);
            resetForm();
        },
        onError: () => {
            toast.error("Erro ao criar campanha");
        },
    });

    const resetForm = () => {
        setStep(1);
        setFormData({
            name: "",
            description: "",
            message_template: "",
            daily_limit: 50,
            score_min: 60,
            segments: [],
        });
    };

    const handleNext = () => {
        if (step < 3) setStep((step + 1) as Step);
    };

    const handleBack = () => {
        if (step > 1) setStep((step - 1) as Step);
    };

    const canProceed = () => {
        if (step === 1) return formData.name.trim() !== "";
        if (step === 2) return true;
        if (step === 3) return formData.message_template.trim() !== "";
        return false;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Nova Campanha de Prospecção</DialogTitle>
                    <DialogDescription>
                        Etapa {step} de 3: {step === 1 ? "Configuração Básica" : step === 2 ? "Segmentação de Leads" : "Mensagem e Automação"}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Indicator */}
                <div className="flex items-center gap-2 mb-6">
                    {[1, 2, 3].map((s) => (
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
                            <Label htmlFor="name">Nome da Campanha *</Label>
                            <Input
                                id="name"
                                placeholder="Ex: Prospecção Oficinas SP"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                placeholder="Descreva o objetivo desta campanha..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Lead Segmentation */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="score_min">Score Mínimo</Label>
                            <Select
                                value={formData.score_min.toString()}
                                onValueChange={(value) => setFormData({ ...formData, score_min: parseInt(value) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Todos (sem filtro)</SelectItem>
                                    <SelectItem value="40">40+ (Baixo)</SelectItem>
                                    <SelectItem value="60">60+ (Qualificados)</SelectItem>
                                    <SelectItem value="80">80+ (Alta qualidade)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        <div className="glass-card p-4 rounded-lg bg-muted/30">
                            <h4 className="text-sm font-semibold mb-2">Preview de Leads</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-sm">
                                    Leads que atendem aos critérios:
                                </span>
                                <Badge variant="secondary" className="text-lg">
                                    {leads?.count || 0}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Message Template */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="message">Template de Mensagem *</Label>
                            <Textarea
                                id="message"
                                placeholder="Olá {{name}}, percebi que sua empresa atua no segmento {{segment}} em {{city}}..."
                                value={formData.message_template}
                                onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                                rows={6}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Variáveis disponíveis: <code>{"{{name}}"}</code>, <code>{"{{segment}}"}</code>, <code>{"{{city}}"}</code>
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="daily_limit">Limite Diário de Envios</Label>
                            <Input
                                id="daily_limit"
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
                        {step < 3 ? (
                            <Button onClick={handleNext} disabled={!canProceed()}>
                                Próximo
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={() => createMutation.mutate()} disabled={!canProceed() || createMutation.isPending}>
                                {createMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Criar Campanha
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
