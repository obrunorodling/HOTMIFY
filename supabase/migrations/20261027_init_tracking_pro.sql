-- ==============================================================================
-- TRACKING PRO — SUPABASE POSTGRESQL INITIAL SCHEMA & MIGRATION
-- Plataforma de Rastreamento & Atribuição de Marketing Digital (Hotmart + Meta)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE AUDITORIA DE WEBHOOKS HOTMART
CREATE TABLE IF NOT EXISTS hotmart_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT,
    hottok TEXT,
    event_name TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PROCESSED', 'DUPLICATE', 'INVALID_TOKEN', 'ERROR')),
    error_message TEXT,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hotmart_webhook_transaction ON hotmart_webhook_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_hotmart_webhook_event_name ON hotmart_webhook_events(event_name);
CREATE INDEX IF NOT EXISTS idx_hotmart_webhook_status ON hotmart_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_hotmart_webhook_received_at ON hotmart_webhook_events(received_at DESC);

-- 3. TABELA DE PEDIDOS NORMALIZADOS DA HOTMART
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_ucode TEXT,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    gross_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hotmart_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL CHECK (status IN ('APPROVED', 'COMPLETE', 'WAITING_PAYMENT', 'REFUNDED', 'CHARGEBACK', 'CANCELED', 'DISPUTE', 'BLOCKED', 'EXPIRED')),
    payment_type TEXT NOT NULL,
    installments_number INTEGER DEFAULT 1,
    sck TEXT,
    src TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    tracking_session_id TEXT,
    attribution_method TEXT NOT NULL DEFAULT 'UNKNOWN',
    attribution_confidence NUMERIC(3, 2) DEFAULT 0.00,
    first_seen_at TIMESTAMPTZ,
    purchase_date TIMESTAMPTZ NOT NULL,
    approved_date TIMESTAMPTZ,
    landing_page TEXT,
    fbclid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_sck ON orders(sck);
CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign ON orders(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_orders_purchase_date ON orders(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_currency ON orders(currency);

-- 4. TABELA DE SESSÕES DE RASTREAMENTO (FIRST-TOUCH & LAST-TOUCH)
CREATE TABLE IF NOT EXISTS tracking_sessions (
    id TEXT PRIMARY KEY, -- e.g. tpro_sid_...
    visitor_id TEXT NOT NULL, -- e.g. tpro_vid_...
    first_utm_source TEXT,
    first_utm_medium TEXT,
    first_utm_campaign TEXT,
    first_utm_content TEXT,
    first_utm_term TEXT,
    first_fbclid TEXT,
    first_landing_page TEXT,
    last_utm_source TEXT,
    last_utm_medium TEXT,
    last_utm_campaign TEXT,
    last_utm_content TEXT,
    last_utm_term TEXT,
    last_fbclid TEXT,
    last_landing_page TEXT,
    ip_hash TEXT NOT NULL,
    user_agent TEXT,
    country VARCHAR(2) DEFAULT 'BR',
    device VARCHAR(16) DEFAULT 'desktop',
    pageviews_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_visitor ON tracking_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_first_campaign ON tracking_sessions(first_utm_campaign);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_last_campaign ON tracking_sessions(last_utm_campaign);

-- 5. TABELA DE EVENTOS DE CLIQUE E PAGEVIEW
CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    event_name VARCHAR(32) NOT NULL,
    event_id TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    referrer TEXT,
    target_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_session ON tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_event_name ON tracking_events(event_name);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created ON tracking_events(created_at DESC);

-- 6. TABELA DE CONTAS DE ANÚNCIOS META ADS
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
    id TEXT PRIMARY KEY, -- act_123456789
    name TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    account_status INTEGER DEFAULT 1,
    last_synced_at TIMESTAMPTZ
);

-- 7. TABELA DE MÉTRICAS E GASTOS DO META MARKETING API
CREATE TABLE IF NOT EXISTS meta_insights (
    id TEXT PRIMARY KEY, -- account_id + campaign_id + date hash
    account_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    adset_id TEXT,
    adset_name TEXT,
    ad_id TEXT,
    ad_name TEXT,
    date DATE NOT NULL,
    spend NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    cpm NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cpc NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ctr NUMERIC(6, 4) NOT NULL DEFAULT 0.00,
    conversions_reported INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meta_insights_campaign ON meta_insights(campaign_name);
CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_insights(date DESC);

-- 8. TABELA DE AUDITORIA DO META CONVERSIONS API (CAPI)
CREATE TABLE IF NOT EXISTS meta_capi_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    test_mode BOOLEAN DEFAULT FALSE,
    pixel_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'SIMULATED')),
    payload JSONB NOT NULL,
    api_response JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meta_capi_event_id ON meta_capi_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_meta_capi_status ON meta_capi_logs(status);

-- 9. TABELA DE CONFIGURAÇÕES DA APLICAÇÃO (SINGLETON / MULTI-TENANT)
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    hotmart_hottok TEXT DEFAULT '',
    hotmart_verify_token BOOLEAN DEFAULT TRUE,
    meta_access_token TEXT DEFAULT '',
    meta_ad_account_id TEXT DEFAULT '',
    meta_pixel_id TEXT DEFAULT '',
    meta_test_event_code TEXT DEFAULT '',
    meta_capi_enabled BOOLEAN DEFAULT FALSE,
    base_url TEXT DEFAULT '',
    attribution_window_days INTEGER DEFAULT 30,
    currency VARCHAR(3) DEFAULT 'BRL',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Inserir registro padrão se não existir
INSERT INTO app_settings (id, hotmart_hottok, hotmart_verify_token, meta_capi_enabled, currency)
VALUES (1, 'HOTMART_VERIFICATION_TOKEN_DEFAULT', true, false, 'BRL')
ON CONFLICT (id) DO NOTHING;

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE hotmart_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_capi_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: RLS permite leitura/escrita pelo backend/service_role
CREATE POLICY "Allow service_role full access" ON hotmart_webhook_events FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON orders FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON tracking_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON tracking_events FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON meta_insights FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON meta_capi_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON app_settings FOR ALL TO service_role USING (true);
