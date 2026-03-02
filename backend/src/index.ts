/**
 * CAPTU Backend - Entry Point
 */

import './env.js'; // MUST be first to load environment variables
import express from 'express';
import cors from 'cors';
import leadRoutes from './routes/leads.js';
import campaignRoutes from './routes/campaigns.js';
import chatRoutes from './routes/chat.js';
import { WhatsAppService } from './services/whatsapp.js';

const app = express();
const port = process.env.PORT || 3000;

const whatsapp = WhatsAppService.getInstance();

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsOptions: cors.CorsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'apikey'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use('/api/leads', leadRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'CAPTU Backend API is operational',
        engine: 'Express',
        environment: process.env.VERCEL ? 'vercel-serverless' : 'persistent-active',
        whatsapp_supported: !process.env.VERCEL,
        timestamp: new Date().toISOString(),
    });
});

// ─── Inicialização ────────────────────────────────────────────────────────────
if (process.env.VERCEL) {
    console.log('[Vercel] ☁️ Rodando em ambiente Serverless (Somente API REST)');
} else {
    app.listen(port, () => {
        console.log(`\n🚀 Backend CAPTU rodando → http://localhost:${port}`);
        console.log('─'.repeat(50));
        whatsapp.initialize().catch(err => {
            console.error('[WhatsApp] Falha ao inicializar motor:', err);
        });
    });
}

export default app;
