import axios from 'axios';

const OSINT_SERVICE_URL = process.env.OSINT_SERVICE_URL || 'http://localhost:8001';

export type OsintSearchType = 'username' | 'domain' | 'phone';

export interface OsintResult {
    platform?: string;
    url?: string;
    found?: boolean;
    username?: string;
    profile_data?: Record<string, any>;
    // domain fields
    domain?: string;
    reachable?: boolean;
    http_status?: number;
    https_available?: boolean;
    // phone fields
    phone?: string;
    formatted?: string;
    country?: string;
    carrier?: string;
    is_valid?: boolean;
    type?: string;
}

export interface OsintSearchResponse {
    target: string;
    search_type: OsintSearchType;
    results: OsintResult[];
    count: number;
    total_checked: number;
}

/**
 * Executa busca OSINT via microserviço Python.
 * Suporta: username (30+ plataformas), domain (análise web), phone (validação).
 */
export const searchOsint = async (
    target: string,
    searchType: OsintSearchType,
    platforms?: string[]
): Promise<OsintSearchResponse> => {
    try {
        const response = await axios.post<OsintSearchResponse>(
            `${OSINT_SERVICE_URL}/search`,
            {
                target,
                search_type: searchType,
                platforms: platforms || null,
            },
            { timeout: 60000 } // 60s para dar tempo nas verificações paralelas
        );

        return response.data;
    } catch (error: any) {
        // Se o microserviço Python não estiver rodando, retorna mock para dev
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
            console.warn('[OSINT] Microserviço Python offline. Retornando mock data.');
            return getMockOsintData(target, searchType);
        }
        throw new Error(`Erro no serviço OSINT: ${error.message}`);
    }
};

/**
 * Normaliza resultados OSINT para o schema de leads do Supabase.
 */
export const normalizeOsintToLead = (
    osintResponse: OsintSearchResponse,
    segment?: string
) => {
    const { target, search_type, results, count } = osintResponse;

    if (search_type === 'username') {
        // Cada perfil encontrado vira um "ponto de presença" do alvo
        const foundPlatforms = results
            .filter((r) => r.found)
            .map((r) => r.platform)
            .join(', ');

        const profileUrls = results
            .filter((r) => r.found)
            .map((r) => r.url)
            .filter(Boolean);

        return {
            name: target,
            segment: segment || 'OSINT - Username',
            city: 'Online',
            state: 'N/A',
            website: profileUrls[0] || null,
            score: Math.min(count * 5, 100), // 5 pts por plataforma encontrada
            status: 'new',
            origin: 'mr_holmes',
            osint_data: JSON.stringify({
                search_type,
                platforms_found: foundPlatforms,
                profile_urls: profileUrls,
                total_platforms: osintResponse.total_checked,
                profiles_found: count,
            }),
            has_own_website: profileUrls.some(
                (u) =>
                    !u.includes('instagram.com') &&
                    !u.includes('twitter.com') &&
                    !u.includes('github.com') &&
                    !u.includes('tiktok.com')
            ),
        };
    }

    if (search_type === 'domain') {
        const domainInfo = results[0] || {};
        return {
            name: target,
            segment: segment || 'OSINT - Domínio',
            city: 'Online',
            state: 'N/A',
            website: `https://${target}`,
            score: domainInfo.https_available ? 60 : domainInfo.reachable ? 40 : 20,
            status: 'new',
            origin: 'mr_holmes',
            osint_data: JSON.stringify({
                search_type,
                ...domainInfo,
            }),
            has_own_website: domainInfo.reachable || false,
        };
    }

    if (search_type === 'phone') {
        const phoneInfo = results[0] || {};
        return {
            name: target,
            segment: segment || 'OSINT - Telefone',
            city: 'Online',
            state: 'N/A',
            phone: phoneInfo.formatted || target,
            website: null,
            score: phoneInfo.is_valid ? 55 : 10,
            status: 'new',
            origin: 'mr_holmes',
            osint_data: JSON.stringify({
                search_type,
                ...phoneInfo,
            }),
            has_own_website: false,
        };
    }

    return null;
};

// ─── Mock para desenvolvimento offline ───────────────────────────────────────

const getMockOsintData = (
    target: string,
    searchType: OsintSearchType
): OsintSearchResponse => {
    if (searchType === 'username') {
        return {
            target,
            search_type: searchType,
            count: 4,
            total_checked: 30,
            results: [
                { platform: 'GitHub', url: `https://github.com/${target}`, found: true, username: target },
                { platform: 'Instagram', url: `https://www.instagram.com/${target}/`, found: true, username: target },
                { platform: 'Twitter', url: `https://twitter.com/${target}`, found: true, username: target },
                { platform: 'Reddit', url: `https://www.reddit.com/user/${target}`, found: true, username: target },
            ],
        };
    }

    if (searchType === 'domain') {
        return {
            target,
            search_type: searchType,
            count: 1,
            total_checked: 1,
            results: [
                {
                    domain: target,
                    reachable: true,
                    http_status: 200,
                    https_available: true,
                    www_redirect: false,
                },
            ],
        };
    }

    return {
        target,
        search_type: searchType,
        count: 1,
        total_checked: 1,
        results: [
            {
                phone: target,
                formatted: target,
                country: 'Brasil 🇧🇷',
                carrier: 'Claro',
                is_valid: true,
                type: 'Celular',
            },
        ],
    };
};
