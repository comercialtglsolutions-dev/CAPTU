import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Building2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const navigate = useNavigate();
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleSearch = async () => {
    if (!niche || !city) return;
    setSearching(true);

    try {
      const response = await fetch("http://localhost:3000/api/leads/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: niche, city: city }),
      });

      if (!response.ok) throw new Error("Erro na coleta de leads");

      const data = await response.json();
      setResults(data.data || []);

      toast.success(`${data.count || 0} leads coletados e qualificados com sucesso!`, {
        description: "Os leads foram salvos no seu banco de dados.",
        action: {
          label: "Ver Leads",
          onClick: () => navigate("/leads"),
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com o backend", {
        description: "Verifique se o seu servidor backend está rodando em http://localhost:3000",
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <PageHeader title="Buscar Empresas" description="Encontre empresas por nicho e região usando Google Places" />

      <div className="glass-card rounded-xl p-6 mb-8 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Nicho / Segmento</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Ex: Oficina Mecânica" className="pl-10" value={niche} onChange={(e) => setNiche(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Cidade</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Ex: São Paulo, SP" className="pl-10" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
        </div>
        <Button onClick={handleSearch} disabled={!niche || !city || searching}>
          {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          {searching ? "Coletando e Qualificando..." : "Buscar e Salvar Leads"}
        </Button>
      </div>

      {results && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              {results.length} empresas processadas para <span className="font-medium text-foreground">"{niche}"</span> em <span className="font-medium text-foreground">"{city}"</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/leads")}>
              Ver todos na lista de Leads
            </Button>
          </div>
          {results.slice(0, 10).map((r, i) => (
            <div key={i} className="glass-card rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Score: <span className="text-primary font-bold">{r.score}</span> · {r.phone || "Sem telefone"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!r.website ? (
                  <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">Oportunidade: Sem site</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Qualificado</span>
                )}
              </div>
            </div>
          ))}
          {results.length > 10 && (
            <p className="text-center text-xs text-muted-foreground pt-4">...e mais {results.length - 10} leads processados.</p>
          )}
        </div>
      )}
    </>
  );
}
