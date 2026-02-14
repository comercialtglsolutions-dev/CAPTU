-- Create app_settings table for dynamic credentials
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name TEXT UNIQUE NOT NULL,
    value TEXT,
    category TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all for now (adjust in production)
CREATE POLICY "Allow all for authenticated users" ON app_settings 
    FOR ALL USING (true) WITH CHECK (true);

-- Insert initial empty settings
INSERT INTO app_settings (key_name, category, is_secret) VALUES
-- APIs
('google_places_api_key', 'api', true),
('n8n_webhook_url', 'api', false),
-- Email
('smtp_host', 'email', false),
('smtp_port', 'email', false),
('sender_email', 'email', false),
('email_warmup_enabled', 'email', false),
-- WhatsApp
('waba_token', 'whatsapp', true),
('phone_number_id', 'whatsapp', false),
-- LGPD
('b2b_only_enabled', 'lgpd', false),
('unsubscribe_option_enabled', 'lgpd', false),
('lead_validation_enabled', 'lgpd', false)
ON CONFLICT (key_name) DO NOTHING;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
