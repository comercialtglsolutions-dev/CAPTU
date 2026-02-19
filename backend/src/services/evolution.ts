import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = 'CaptuComercial';

export class EvolutionService {
    static async sendMessage(remoteJid: string, text: string) {
        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
            throw new Error('Evolution API not configured');
        }

        try {
            const response = await axios.post(
                `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
                {
                    number: remoteJid,
                    text: text,
                    linkPreview: false
                },
                {
                    headers: {
                        'apikey': EVOLUTION_API_KEY
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error sending message via Evolution:', error.response?.data || error.message);
            throw error;
        }
    }

    static async checkInstanceStatus() {
        try {
            const response = await axios.get(
                `${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`,
                {
                    headers: {
                        'apikey': EVOLUTION_API_KEY
                    }
                }
            );
            return response.data;
        } catch (error) {
            return { instance: { state: 'disconnected' } };
        }
    }
}
