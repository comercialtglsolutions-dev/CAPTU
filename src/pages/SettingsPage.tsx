import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail, MessageCircle, Key, Loader2, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface AppSetting {
  id: string;
  key_name: string;
  value: string;
  category: string;
  is_secret: boolean;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // 1. Fetch settings from Supabase
  const { data: settings, isLoading } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");
      if (error) throw error;
      return data as AppSetting[];
    },
  });

  // 2. Initialize local state when data is loaded
  useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key_name] = curr.value || "";
        return acc;
      }, {} as Record<string, string>);
      setLocalSettings(settingsMap);
    }
  }, [settings]);

  // 3. Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: Record<string, string>) => {
      const updatePromises = Object.entries(updatedSettings).map(([key, value]) => {
        return supabase
          .from("app_settings")
          .update({ value: value.toString() })
          .eq("key_name", key);
      });
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar configurações", {
        description: error.message,
      });
    },
  });

  const handleInputChange = (key: string, value: string | boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value.toString(),
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(localSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Configurações" description="Gerencie as configurações e credenciais da plataforma" />

      <div className="max-w-2xl space-y-8 pb-10">
        {/* API Keys */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">APIs</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Google Places API Key</Label>
              <div className="relative mt-1">
                <Input
                  type={showSecrets['google_places_api_key'] ? "text" : "password"}
                  placeholder="Insira sua Google Places API Key"
                  className="pr-10"
                  value={localSettings['google_places_api_key'] || ""}
                  onChange={(e) => handleInputChange('google_places_api_key', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowSecrets(prev => ({ ...prev, google_places_api_key: !prev.google_places_api_key }))}
                >
                  {showSecrets['google_places_api_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Webhook URL (n8n)</Label>
              <Input
                placeholder="https://n8n.seudominio.com/webhook/..."
                className="mt-1"
                value={localSettings['n8n_webhook_url'] || ""}
                onChange={(e) => handleInputChange('n8n_webhook_url', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Email Config */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">Configuração de Email</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">SMTP Host</Label>
                <Input
                  placeholder="smtp.seudominio.com"
                  className="mt-1"
                  value={localSettings['smtp_host'] || ""}
                  onChange={(e) => handleInputChange('smtp_host', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Porta</Label>
                <Input
                  placeholder="587"
                  className="mt-1"
                  value={localSettings['smtp_port'] || ""}
                  onChange={(e) => handleInputChange('smtp_port', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email Remetente</Label>
              <Input
                placeholder="contato@seudominio.com"
                className="mt-1"
                value={localSettings['sender_email'] || ""}
                onChange={(e) => handleInputChange('sender_email', e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Modo de aquecimento</p>
                <p className="text-xs text-muted-foreground">Limita envios progressivamente nos primeiros 21 dias</p>
              </div>
              <Switch
                checked={localSettings['email_warmup_enabled'] === "true"}
                onCheckedChange={(checked) => handleInputChange('email_warmup_enabled', checked)}
              />
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-foreground">WhatsApp API</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">WABA Token (Evolution API Key)</Label>
              <div className="relative mt-1">
                <Input
                  type={showSecrets['waba_token'] ? "text" : "password"}
                  placeholder="Insira o Token de sua API de WhatsApp"
                  className="pr-10"
                  value={localSettings['waba_token'] || ""}
                  onChange={(e) => handleInputChange('waba_token', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowSecrets(prev => ({ ...prev, waba_token: !prev.waba_token }))}
                >
                  {showSecrets['waba_token'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number ID (Instance Name)</Label>
              <Input
                placeholder="Ex: CaptuPrincipal"
                className="mt-1"
                value={localSettings['phone_number_id'] || ""}
                onChange={(e) => handleInputChange('phone_number_id', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* LGPD */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-foreground">Conformidade LGPD</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Contato exclusivamente B2B</p>
                <p className="text-xs text-muted-foreground">Nunca disparar para consumidores finais</p>
              </div>
              <Switch
                checked={localSettings['b2b_only_enabled'] === "true"}
                onCheckedChange={(checked) => handleInputChange('b2b_only_enabled', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Opção de descadastro</p>
                <p className="text-xs text-muted-foreground">Incluir link de remoção em todas as mensagens</p>
              </div>
              <Switch
                checked={localSettings['unsubscribe_option_enabled'] === "true"}
                onCheckedChange={(checked) => handleInputChange('unsubscribe_option_enabled', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Validação de leads antes do envio</p>
                <p className="text-xs text-muted-foreground">Verificar email/telefone antes de disparar</p>
              </div>
              <Switch
                checked={localSettings['lead_validation_enabled'] === "true"}
                onCheckedChange={(checked) => handleInputChange('lead_validation_enabled', checked)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full sm:w-auto px-8">
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </>
  );
}
