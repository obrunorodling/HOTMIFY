import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Layers,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { AppSettings } from '../types/index.ts';

interface DatabaseDeployViewProps {
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => Promise<void>;
}

export const DatabaseDeployView: React.FC<DatabaseDeployViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabase_url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabase_anon_key);
  const [supabaseServiceKey, setSupabaseServiceKey] = useState(settings.supabase_service_role_key);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const sqlMigrationCode = `-- ==============================================================================
-- TRACKING PRO — SUPABASE POSTGRESQL INITIAL SCHEMA & MIGRATION
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT,
    gross_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hotmart_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    installments_number INTEGER DEFAULT 1,
    sck TEXT,
    src TEXT,
    utm_source TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    tracking_session_id TEXT,
    attribution_method TEXT NOT NULL DEFAULT 'UNKNOWN',
    attribution_confidence NUMERIC(3, 2) DEFAULT 0.00,
    purchase_date TIMESTAMPTZ NOT NULL,
    approved_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_orders_sck ON orders(sck);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS tracking_sessions (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    first_utm_campaign TEXT,
    last_utm_campaign TEXT,
    first_utm_content TEXT,
    last_utm_content TEXT,
    ip_hash TEXT NOT NULL,
    user_agent TEXT,
    device VARCHAR(16) DEFAULT 'desktop',
    pageviews_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS meta_insights (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    adset_name TEXT,
    ad_name TEXT,
    date DATE NOT NULL,
    spend NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    conversions_reported INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS meta_capi_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    test_mode BOOLEAN DEFAULT FALSE,
    pixel_id TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB NOT NULL,
    api_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE hotmart_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_capi_logs ENABLE ROW LEVEL SECURITY;`;

  const envExampleCode = `# SUPABASE
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# HOTMART
HOTMART_HOTTOK="seu_hottok_configurado_no_webhook_hotmart"
HOTMART_VERIFY_TOKEN="true"

# META ADS
META_ACCESS_TOKEN="EAAGm0PXq1ZB0BA..."
META_AD_ACCOUNT_ID="act_123456789"
META_PIXEL_ID="984029184029184"
META_TEST_EVENT_CODE="TEST12345"
META_CAPI_ENABLED="true"`;

  const handleSaveSupabase = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseAnonKey,
        supabase_service_role_key: supabaseServiceKey,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envExampleCode);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Supabase Connection Settings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            Configuração do Supabase (PostgreSQL &amp; Row Level Security)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Conecte seu banco de dados PostgreSQL no Supabase. Enquanto você não configurar as chaves de produção, o sistema opera automaticamente com o banco de persistência embutido sem quebrar a interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Project URL do Supabase
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Anon Public Key
            </label>
            <input
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Service Role Secret Key (Opcional - Backend)
            </label>
            <input
              type="password"
              value={supabaseServiceKey}
              onChange={(e) => setSupabaseServiceKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Status: <span className="text-emerald-400 font-medium">Pronto para PostgreSQL</span>
          </span>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Salvo com sucesso!
              </span>
            )}
            <button
              onClick={handleSaveSupabase}
              disabled={isSaving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Conexão'}
            </button>
          </div>
        </div>
      </div>

      {/* SQL Migration Script Viewer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-400" />
              Script de Migração SQL (Copiar e Colar no SQL Editor do Supabase)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cria todas as tabelas relacionais, índices de alta performance e políticas de Row Level Security (RLS).
            </p>
          </div>
          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors shrink-0"
          >
            {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSql ? 'Copiado!' : 'Copiar Migration SQL'}</span>
          </button>
        </div>

        <pre className="font-code rounded-lg bg-slate-950 p-4 text-xs text-slate-300 border border-slate-800/80 max-h-64 overflow-y-auto leading-relaxed">
          {sqlMigrationCode}
        </pre>
      </div>

      {/* Vercel Deployment Guide */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Server className="h-4 w-4 text-purple-400" />
            Guia de Implantação na Vercel (Serverless Functions)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Como publicar este projeto na Vercel em 3 passos sem precisar de servidor Node.js permanente ativo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-950 border border-purple-800 text-[11px]">
                1
              </span>
              <span>Subir no GitHub</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crie um repositório privado no GitHub e faça o push de todos os arquivos deste projeto.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-950 border border-purple-800 text-[11px]">
                2
              </span>
              <span>Importar na Vercel</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conecte o repositório na Vercel. A pasta <code className="text-slate-300 font-mono">/api</code> será compilada automaticamente como Serverless Functions.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-950 border border-purple-800 text-[11px]">
                3
              </span>
              <span>Configurar .env</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cole as variáveis de ambiente na Vercel em <strong>Settings &gt; Environment Variables</strong>.
            </p>
          </div>
        </div>

        {/* Environment Variables Reference */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Variáveis de Ambiente Recomendadas (.env)
            </span>
            <button
              onClick={handleCopyEnv}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              {copiedEnv ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedEnv ? 'Copiado!' : 'Copiar .env'}</span>
            </button>
          </div>
          <pre className="font-code text-xs text-slate-300 overflow-x-auto leading-relaxed">
            {envExampleCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
