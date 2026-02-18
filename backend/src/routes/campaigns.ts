import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/campaigns/active-tasks
 * Rota principal para o n8n buscar o que precisa ser enviado agora.
 * Esta rota atua como o "Cérebro" do sistema.
 */
router.get('/active-tasks', async (req, res) => {
    try {
        // 1. Buscar todas as campanhas ativas
        const { data: activeCampaigns, error: campError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('status', 'active');

        if (campError) throw campError;

        const tasks: any[] = [];
        const today = new Date().toISOString().split('T')[0];

        for (const campaign of activeCampaigns) {
            // 2. Verificar quantos leads ainda podemos enviar hoje (respeitando daily_limit)
            // Aqui buscamos quantos foram enviados HOJE para esta campanha específica
            const { count: sentToday, error: countError } = await supabase
                .from('campaign_leads')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', campaign.id)
                .gte('sent_at', `${today}T00:00:00Z`);

            if (countError) throw countError;

            const remainingQuota = campaign.daily_limit - (sentToday || 0);

            if (remainingQuota > 0) {
                // 3a. PRIORIDADE: Buscar leads que foram adicionados MANUALMENTE (status 'pending' na campaign_leads)
                const { data: manualLeads, error: manualError } = await supabase
                    .from('campaign_leads')
                    .select('lead_id, leads(*)')
                    .eq('campaign_id', campaign.id)
                    .eq('status', 'pending')
                    .limit(remainingQuota);

                if (manualError) throw manualError;

                let processedManualCount = 0;
                if (manualLeads && manualLeads.length > 0) {
                    for (const row of manualLeads) {
                        const lead = row.leads as any;
                        if (!lead) continue;

                        const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
                        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;

                        tasks.push({
                            campaign_id: campaign.id,
                            campaign_name: campaign.name,
                            lead_id: lead.id,
                            lead_name: lead.name,
                            phone: formattedPhone,
                            email: lead.email,
                            city: lead.city,
                            segment: lead.segment,
                            message_template: campaign.niche,
                            channel: 'whatsapp',
                            step: 1
                        });
                        processedManualCount++;
                    }
                }

                const quotaForAuto = remainingQuota - processedManualCount;

                if (quotaForAuto > 0) {
                    // 3b. AUTOMÁTICO: Buscar leads que batem com o filtro da campanha
                    const { data: alreadyContactedOrPending } = await supabase
                        .from('campaign_leads')
                        .select('lead_id')
                        .eq('campaign_id', campaign.id);

                    const excludedIds = alreadyContactedOrPending?.map(c => c.lead_id) || [];

                    let query = supabase.from('leads').select('*').eq('status', 'new').not('phone', 'is', null);

                    if (campaign.filters?.score_min) {
                        query = query.gte('score', campaign.filters.score_min);
                    }
                    if (campaign.filters?.segments && campaign.filters.segments.length > 0) {
                        query = query.in('segment', campaign.filters.segments);
                    }

                    if (excludedIds.length > 0) {
                        query = query.not('id', 'in', `(${excludedIds.join(',')})`);
                    }

                    const { data: leadPool, error: leadError } = await query.limit(quotaForAuto * 2);

                    if (leadError) throw leadError;

                    if (leadPool && leadPool.length > 0) {
                        let taskCount = 0;
                        for (const lead of leadPool) {
                            if (taskCount >= quotaForAuto) break;

                            const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
                            if (cleanPhone.length >= 10) {
                                const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;

                                tasks.push({
                                    campaign_id: campaign.id,
                                    campaign_name: campaign.name,
                                    lead_id: lead.id,
                                    lead_name: lead.name,
                                    phone: formattedPhone,
                                    email: lead.email,
                                    city: lead.city,
                                    segment: lead.segment,
                                    message_template: campaign.niche,
                                    channel: 'whatsapp',
                                    step: 1
                                });
                                taskCount++;
                            }
                        }
                    }
                }
            }
        }

        // Retorna o array diretamente para o n8n não dar erro de undefined
        res.json(tasks);

    } catch (error: any) {
        console.error('Error fetching active tasks:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/campaigns/:id/track-send
 * Registra o sucesso de um envio e atualiza as métricas da campanha.
 */
router.post('/:id/track-send', async (req, res) => {
    const { id: campaignId } = req.params;
    const { lead_id, status = 'sent', message } = req.body;

    try {
        // 1. Registrar na tabela campaign_leads (Upsert para suportar leads manuais que estavam 'pending')
        const { error: trackError } = await supabase
            .from('campaign_leads')
            .upsert({
                campaign_id: campaignId,
                lead_id: lead_id,
                status: status,
                sent_at: new Date().toISOString()
            }, { onConflict: 'campaign_id, lead_id' });

        if (trackError) throw trackError;

        // 2. Atualizar contador global da campanha
        const { data: campaign } = await supabase
            .from('campaigns')
            .select('sent_count')
            .eq('id', campaignId)
            .single();

        await supabase
            .from('campaigns')
            .update({ sent_count: (campaign?.sent_count || 0) + 1 })
            .eq('id', campaignId);

        // 3. Registrar no histórico geral de contatos (para o Dashboard)
        await supabase
            .from('contact_history')
            .insert({
                company_id: lead_id,
                type: 'whatsapp',
                message: message,
                status: 'sent',
                data_envio: new Date().toISOString()
            });

        // 4. Atualizar o status do lead para 'contacted'
        await supabase
            .from('leads')
            .update({ status: 'contacted' })
            .eq('id', lead_id);

        res.json({ success: true, message: 'Send tracked successfully' });

    } catch (error: any) {
        console.error('Error tracking campaign send:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/campaigns/:id/add-leads
 * Adiciona leads manualmente à fila de uma campanha.
 */
router.post('/:id/add-leads', async (req, res) => {
    const { id: campaignId } = req.params;
    const { leadIds } = req.body; // Array de IDs de leads

    if (!leadIds || !Array.isArray(leadIds)) {
        return res.status(400).json({ error: 'leadIds must be an array' });
    }

    try {
        const records = leadIds.map(leadId => ({
            campaign_id: campaignId,
            lead_id: leadId,
            status: 'pending'
        }));

        const { error } = await supabase
            .from('campaign_leads')
            .upsert(records, { onConflict: 'campaign_id, lead_id' });

        if (error) throw error;

        res.json({ success: true, message: `${leadIds.length} leads added to campaign queue` });
    } catch (error: any) {
        console.error('Error adding leads to campaign:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/campaigns/:id/leads
 * Remove um ou mais leads de uma campanha específica.
 */
router.delete('/:id/leads', async (req, res) => {
    const { id: campaignId } = req.params;
    const { leadIds } = req.body; // Array de IDs de leads

    if (!leadIds || !Array.isArray(leadIds)) {
        return res.status(400).json({ error: 'leadIds must be an array' });
    }

    try {
        const { error } = await supabase
            .from('campaign_leads')
            .delete()
            .eq('campaign_id', campaignId)
            .in('lead_id', leadIds);

        if (error) throw error;

        res.json({ success: true, message: `${leadIds.length} leads removed from campaign` });
    } catch (error: any) {
        console.error('Error removing leads from campaign:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
