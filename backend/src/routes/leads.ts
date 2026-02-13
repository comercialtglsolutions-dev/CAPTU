import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { searchLeads } from '../services/googlePlaces';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: Supabase environment variables are missing in backend/.env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/leads - Busca leads do banco
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/leads/collect - Coleta novos leads via Google Places
router.post('/collect', async (req, res) => {
    const { query, city } = req.body;

    if (!query || !city) {
        return res.status(400).json({ error: 'Query and city are required' });
    }

    try {
        const leads = await searchLeads(query, city);

        // Formata os dados para o banco conforme a estratégia
        const formattedLeads = leads.map((l: any) => ({
            ...l,
            has_own_website: !!l.website,
            origin: 'google_places'
        }));

        const { data, error } = await supabase
            .from('leads')
            .upsert(formattedLeads, { onConflict: 'name, city' })
            .select();

        if (error) {
            const { data: insertData, error: insertError } = await supabase
                .from('leads')
                .insert(formattedLeads)
                .select();

            if (insertError) throw insertError;
            return res.json({ message: 'Leads collected', count: leads.length, data: insertData });
        }

        res.json({ message: 'Leads collected and synced', count: leads.length, data });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/leads/:id/send-to-n8n - Dispara automação no n8n para um lead específico
router.post('/:id/send-to-n8n', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Busca dados completos do lead
        const { data: lead, error: fetchError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // 2. Dispara webhook para o n8n
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

        if (!n8nWebhookUrl || n8nWebhookUrl.includes('...')) {
            return res.status(400).json({ error: 'n8n Webhook URL not configured' });
        }

        const response = await axios.post(n8nWebhookUrl, {
            lead: lead,
            action: 'start_outreach',
            timestamp: new Date().toISOString()
        });

        // 3. Atualiza status para 'contacted'
        await supabase
            .from('leads')
            .update({ status: 'contacted' })
            .eq('id', id);

        res.json({ message: 'Lead sent to n8n successfully', n8n_response: response.data });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
