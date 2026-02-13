import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail, MessageCircle, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Gerencie as configurações da plataforma" />

      <div className="max-w-2xl space-y-8">
        {/* API Keys */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">APIs</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Google Places API Key</Label>
              <Input type="password" placeholder="••••••••••••••••••••" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Webhook URL (n8n)</Label>
              <Input placeholder="https://n8n.seudominio.com/webhook/..." className="mt-1" />
            </div>
          </div>
        </div>

        {/* Email Config */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-info" />
            <h3 className="font-semibold text-foreground">Configuração de Email</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">SMTP Host</Label>
                <Input placeholder="smtp.seudominio.com" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Porta</Label>
                <Input placeholder="587" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email Remetente</Label>
              <Input placeholder="contato@seudominio.com" className="mt-1" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Modo de aquecimento</p>
                <p className="text-xs text-muted-foreground">Limita envios progressivamente nos primeiros 21 dias</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-foreground">WhatsApp API</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">WABA Token</Label>
              <Input type="password" placeholder="••••••••••••••••••••" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number ID</Label>
              <Input placeholder="1234567890" className="mt-1" />
            </div>
          </div>
        </div>

        {/* LGPD */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-foreground">Conformidade LGPD</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Contato exclusivamente B2B</p>
                <p className="text-xs text-muted-foreground">Nunca disparar para consumidores finais</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Opção de descadastro</p>
                <p className="text-xs text-muted-foreground">Incluir link de remoção em todas as mensagens</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Validação de leads antes do envio</p>
                <p className="text-xs text-muted-foreground">Verificar email/telefone antes de disparar</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        <Button>Salvar Configurações</Button>
      </div>
    </>
  );
}
