import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { Loader2, ExternalLink, TrendingUp, MapPin, Star, Target, Phone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

interface Lead {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    score: number;
    status: string;
    city: string;
    segment?: string;
    state?: string;
    phone?: string;
    email?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    address?: string;
    has_own_website?: boolean;
}

interface LeadMapProps {
    leads: Lead[];
    apiKey: string;
    onViewDetails?: (lead: Lead) => void;
}

const containerStyle = {
    width: '100%',
    height: '550px',
    borderRadius: '16px'
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false, // Desabilitar controle nativo para usar o customizado
    styles: [
        {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [{ "visibility": "off" }]
        },
        {
            "featureType": "poi",
            "stylers": [{ "visibility": "off" }]
        },
        {
            "featureType": "road",
            "elementType": "labels.icon",
            "stylers": [{ "visibility": "off" }]
        },
        {
            "featureType": "transit",
            "stylers": [{ "visibility": "off" }]
        }
    ]
};

export default function LeadMap({ leads, apiKey, onViewDetails }: LeadMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback() {
        setMap(null);
    }, []);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    // Esc para sair do fullscreen
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isFullscreen]);

    const validLeads = useMemo(() =>
        leads.filter(l => l.latitude && l.longitude),
        [leads]
    );

    const center = useMemo(() => {
        if (validLeads.length > 0) {
            return { lat: Number(validLeads[0].latitude), lng: Number(validLeads[0].longitude) };
        }
        return { lat: -23.5505, lng: -46.6333 }; // São Paulo
    }, [validLeads]);

    const handleMarkerClick = (lead: Lead) => {
        setSelectedLead(lead);
        if (map) {
            map.panTo({ lat: Number(lead.latitude), lng: Number(lead.longitude) });
        }
    };

    if (!isLoaded) return (
        <div className="flex items-center justify-center h-[550px] bg-muted/20 rounded-2xl border border-dashed border-border/60">
            <div className="flex flex-col items-center gap-3">
                <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <Target className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                    <p className="text-base font-semibold text-foreground">Sincronizando Localizações</p>
                    <p className="text-xs text-muted-foreground">Mapeando inteligência geográfica...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div
            className={`
                transition-all duration-300 ease-in-out bg-white
                ${isFullscreen
                    ? 'fixed inset-0 z-50 rounded-none h-screen w-screen'
                    : 'relative rounded-2xl h-[550px] overflow-hidden border border-border shadow-2xl group'
                }
            `}
        >
            <GoogleMap
                mapContainerStyle={{
                    width: '100%',
                    height: '100%',
                    borderRadius: isFullscreen ? '0' : '16px'
                }}
                center={center}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
                onClick={() => setSelectedLead(null)}
            >
                {validLeads.map((lead) => (
                    <Marker
                        key={lead.id}
                        position={{ lat: Number(lead.latitude), lng: Number(lead.longitude) }}
                        onClick={() => handleMarkerClick(lead)}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: lead.score >= 60 ? '#10b981' : '#f59e0b',
                            fillOpacity: 0.9,
                            strokeWeight: 2,
                            strokeColor: '#ffffff',
                            scale: selectedLead?.id === lead.id ? 14 : 10,
                        }}
                    >
                        {/* Renderizar InfoWindow diretamente dentro do Marker pode causar problemas de re-renderização, mantendo separado */}
                    </Marker>
                ))}

                {selectedLead && (
                    <InfoWindow
                        position={{ lat: Number(selectedLead.latitude), lng: Number(selectedLead.longitude) }}
                        onCloseClick={() => setSelectedLead(null)}
                    >
                        <div className="p-0 min-w-[300px] max-w-[320px] font-sans relative group/card">
                            <div className="p-5 mt-[-16px] space-y-4 bg-white">
                                {/* Cabeçalho: Categoria e Titulo */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none px-0 py-0 text-[10px] uppercase font-bold tracking-wider">
                                            {selectedLead.segment || "Lead Potencial"}
                                        </Badge>
                                    </div>

                                    <h4 className="font-extrabold text-slate-900 text-base tracking-tight leading-tight pr-6">
                                        {selectedLead.name}
                                    </h4>

                                    <div className="flex items-start gap-2 text-[11px] text-slate-500 font-medium leading-relaxed">
                                        <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                        <span>{selectedLead.address || `${selectedLead.city}, ${selectedLead.state || "SP"}`}</span>
                                    </div>
                                </div>

                                {/* Seção de Métricas Principais */}
                                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Potencial</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-lg font-black ${selectedLead.score >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {selectedLead.score}%
                                            </span>
                                            <TrendingUp className={`h-3 w-3 ${selectedLead.score >= 60 ? 'text-emerald-500' : 'text-amber-500'}`} />
                                        </div>
                                    </div>
                                    <div className="space-y-1 border-l border-slate-200 pl-3">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Avaliação</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-0.5">
                                                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                                <span className="text-sm font-black text-slate-700">{selectedLead.rating || "N/A"}</span>
                                            </div>
                                            {selectedLead.user_ratings_total && (
                                                <span className="text-[10px] text-slate-400">({selectedLead.user_ratings_total})</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ações Rápidas e Status */}
                                <div className="flex items-center justify-between pt-1 gap-4">
                                    <div className="flex items-center gap-2">
                                        {selectedLead.phone && (
                                            <a href={`tel:${selectedLead.phone}`} className="p-2 rounded-full bg-slate-100 hover:bg-primary/10 hover:text-primary transition-all active:scale-90" title="Ligar">
                                                <Phone className="h-4 w-4" />
                                            </a>
                                        )}
                                        {selectedLead.website && (
                                            <a href={selectedLead.website} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-primary/10 hover:text-primary transition-all active:scale-90" title="Ver Site">
                                                <Globe className="h-4 w-4" />
                                            </a>
                                        )}
                                        <StatusBadge status={selectedLead.status as any} />
                                    </div>

                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="h-9 px-4 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95 rounded-lg"
                                        onClick={() => onViewDetails?.(selectedLead)}
                                    >
                                        Detalhes
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Custom Fullscreen Toggle */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 z-10 shadow-lg bg-white hover:bg-gray-100 text-gray-700 h-10 w-10 rounded-xl"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
                {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                )}
            </Button>

            {/* Overlay Legend */}
            <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-white/90 backdrop-blur-md p-2 px-3 rounded-full border border-white/20 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Alta Qualificação</span>
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Média Qualificação</span>
                </div>
            </div>
        </div>
    );
}
