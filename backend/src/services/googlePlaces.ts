import puppeteer from 'puppeteer';
import { calculateScore, LeadData } from './leadScoring.js';

interface SearchFilters {
    radius?: number;
    minRating?: number;
    minReviews?: number;
    onlyWithoutWebsite?: boolean;
    onlyWithPhone?: boolean;
}

export const searchLeads = async (query: string, city: string, filters: SearchFilters = {}) => {
    console.log(`[Google Maps Scraper] Iniciando busca via Puppeteer: "${query} em ${city}"`);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        // Disfarça como usuário real
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        
        const searchQuery = encodeURIComponent(`${query} em ${city}`);
        const url = `https://www.google.com/maps/search/${searchQuery}`;
        
        console.log(`[Google Maps Scraper] Acessando URL: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Espera o container principal carregar
        await page.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => {
            console.log('[Google Maps Scraper] Feed role not found immediately, wait a bit longer...');
        });
        
        // Faz o scroll e extrai os links básicos (href) usando string literal para evitar conflito de compilação TSX (__name)
        const links = await page.evaluate(`(async () => {
            const delay = (ms) => new Promise(res => setTimeout(res, ms));
            const feed = document.querySelector('div[role="feed"]');
            
            if (feed) {
                for (let i = 0; i < 3; i++) {
                    feed.scrollTop = feed.scrollHeight;
                    await delay(1500); 
                }
            }

            const items = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
            const uniqueUrls = new Set();
            items.forEach(a => uniqueUrls.add(a.href));
            
            return Array.from(uniqueUrls).slice(0, 10); 
        })()`);

        console.log(`[Google Maps Scraper] Encontrados ${(links as any).length} perfis. Extraindo detalhes...`);

        const detailedLeads: any[] = [];

        // Visita cada perfil rapidamente para extrair os detalhes ricos
        for (const link of (links as any)) {
            try {
                await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 });
                await page.waitForSelector('h1', { timeout: 5000 }).catch(() => {});
                
                const details = await page.evaluate(`(() => {
                    const name = document.querySelector('h1')?.textContent?.trim() || 'Desconhecido';
                    
                    const ratingStr = document.querySelector('div.F7nice > span:first-child')?.textContent || '';
                    const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : 0;
                    
                    const reviewStr = document.querySelector('div.F7nice > span:nth-child(2)')?.textContent || '';
                    const reviewsMatch = reviewStr.match(/([\\d,.]+)/);
                    const reviews = reviewsMatch ? parseInt(reviewsMatch[1].replace(/[.,]/g, ''), 10) : 0;
                    
                    const buttons = Array.from(document.querySelectorAll('button'));
                    let phone = null;
                    let address = 'N/A';
                    
                    buttons.forEach(btn => {
                        const ariaLabel = btn.getAttribute('aria-label') || '';
                        const text = btn.textContent || '';
                        
                        if (ariaLabel.includes('Telefone') || ariaLabel.includes('Phone')) {
                            phone = text.trim();
                        }
                        if (ariaLabel.includes('Endereço') || ariaLabel.includes('Address')) {
                            address = text.trim();
                        }
                    });

                    const websiteLink = document.querySelector('a[data-item-id="authority"]');
                    const website = websiteLink ? websiteLink.href : null;
                    
                    return { name, rating, user_ratings_total: reviews, phone, address, website };
                })()`);

                if (details && details.name !== 'Desconhecido') {
                    // Mapeamento de social links
                    const socialMediaDomains = ['facebook.com', 'instagram.com', 'whatsapp.com', 'wa.me', 'api.whatsapp.com', 'youtube.com', 'linkedin.com', 'linktr.ee'];
                    const website = details.website;
                    const hasOwnWebsite = website && !socialMediaDomains.some(domain => website.toLowerCase().includes(domain));
                    
                    let linkedinUrl = null;
                    let instagramUrl = null;
                    let whatsappUrl = null;
                    let facebookUrl = null;

                    if (website) {
                        const ws = website.toLowerCase();
                        if (ws.includes('linkedin.com')) linkedinUrl = website;
                        if (ws.includes('instagram.com')) instagramUrl = website;
                        if (ws.includes('facebook.com')) facebookUrl = website;
                        if (ws.includes('wa.me') || ws.includes('whatsapp.com')) whatsappUrl = website;
                    }

                    const leadInfo: LeadData = {
                        name: details.name,
                        address: details.address,
                        website: hasOwnWebsite ? website : undefined,
                        rating: details.rating,
                        user_ratings_total: details.user_ratings_total,
                        phone: details.phone,
                        segment: query,
                        image_url: null
                    };

                    detailedLeads.push({
                        ...leadInfo,
                        city: city,
                        state: "N/A",
                        score: calculateScore(leadInfo),
                        status: 'new',
                        place_id: `scrap_${Math.random().toString(36).substr(2, 9)}`,
                        has_own_website: !!hasOwnWebsite,
                        origin: 'google_places_scraper',
                        linkedin_url: linkedinUrl,
                        instagram_url: instagramUrl,
                        facebook_url: facebookUrl,
                        whatsapp_url: whatsappUrl
                    });
                }
            } catch (innerError) {
                console.log('[Google Maps Scraper] Erro ao extrair detalhe de um lead', innerError);
            }
        }
        
        await browser.close();

        // Aplica filtros avançados
        let filteredLeads = detailedLeads;

        if (filters.minRating && filters.minRating > 0) {
            filteredLeads = filteredLeads.filter(lead => lead.rating && lead.rating >= filters.minRating!);
        }

        if (filters.minReviews && filters.minReviews > 0) {
            filteredLeads = filteredLeads.filter(lead => lead.user_ratings_total && lead.user_ratings_total >= filters.minReviews!);
        }

        if (filters.onlyWithoutWebsite) {
            filteredLeads = filteredLeads.filter(lead => !lead.has_own_website);
        }

        if (filters.onlyWithPhone) {
            filteredLeads = filteredLeads.filter(lead => lead.phone);
        }

        console.log(`[Google Maps Scraper] Finalizado! ${filteredLeads.length} leads aprovados.`);
        return filteredLeads;

    } catch (error) {
        console.error('[Google Maps Scraper] Erro Crítico:', error);
        if (browser) await browser.close();
        
        console.warn('[Google Maps Scraper] Retornando Mock Data como fallback');
        return getMockLeads(query, city);
    }
};

const getMockLeads = (query: string, city: string) => {
    return [
        {
            name: `${query} Mocked VER 2`,
            segment: query,
            city: city,
            state: "SP",
            phone: "(11) 99999-9999",
            website: null,
            score: 85,
            status: "new",
            place_id: "mock_1"
        }
    ];
};
