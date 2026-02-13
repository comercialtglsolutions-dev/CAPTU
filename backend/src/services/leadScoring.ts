export interface LeadData {
    name: string;
    address?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    phone?: string;
    segment?: string;
}

export const calculateScore = (lead: LeadData): number => {
    let score = 0;

    const socialMediaDomains = [
        'facebook.com',
        'instagram.com',
        'whatsapp.com',
        'wa.me',
        'youtube.com',
        'linkedin.com',
        'linktr.ee',
        'twitter.com',
        'tiktok.com'
    ];

    const isSocialMedia = lead.website && socialMediaDomains.some(domain => lead.website!.toLowerCase().includes(domain));
    const hasOwnWebsite = lead.website && !isSocialMedia;

    // +40 sem website próprio (ou apenas redes sociais)
    if (!hasOwnWebsite) {
        score += 40;
    }

    // +20 rating acima de 4.5
    if (lead.rating && lead.rating > 4.5) {
        score += 20;
    }

    // +15 mais de 50 avaliações
    if (lead.user_ratings_total && lead.user_ratings_total > 50) {
        score += 15;
    }

    // +10 telefone disponível
    if (lead.phone) {
        score += 10;
    }

    return Math.min(score, 100); // Score final: 0 a 100
};
