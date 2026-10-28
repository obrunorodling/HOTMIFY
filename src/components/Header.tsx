import React from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { Currency } from '../types/index.ts';

interface HeaderProps {
  activeTab: string;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  onSyncMeta: () => void;
  onClearData: () => void;
  onLoadDemo: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  currency,
  onCurrencyChange,
  onSyncMeta,
  onClearData,
  onLoadDemo,
  isSyncing,
}) => {
  const tabTitles: Record<string, string> = {
    financial: 'Painel Financeiro & ROAS',
    attribution: 'Atribuição de Vendas a Cliques',
    hotmart: 'Integração Webhook Hotmart',
    meta: 'Meta Marketing API & CAPI',
    script: 'Script de Tracking & URLs',
    database: 'Banco de Dados & Vercel',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-800 bg-slate-950/90 px-6 py-3.5 backdrop-blur-md">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
          Tracking Pro
        </a>
        <span className="text-slate-700" aria-hidden="true">/</span>
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
          {tabTitles[activeTab] || 'Dashboard'}
        </span>
      </div>

      {/* Zone 2: Informational / Contextual Breadcrumbs */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Hotmart:</span>
          <span className="text-slate-200 font-medium">Webhooks 2.0</span>
        </div>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <div className="flex items-center gap-2">
          <span>Meta Ads:</span>
          <span className="text-slate-200 font-medium">Marketing API + CAPI</span>
        </div>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <div className="flex items-center gap-2">
          <span>Persistência:</span>
          <span className="text-slate-200 font-medium">PostgreSQL / Supabase</span>
        </div>
      </div>

      {/* Zone 3: Actions (Currency Selector & Controls) */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Currency Selector (No mixing without explicit selection) */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
          {(['BRL', 'USD', 'EUR'] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => onCurrencyChange(c)}
              className={`px-2 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
                currency === c
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Sync Meta Ads Button */}
        <button
          onClick={onSyncMeta}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Meta'}</span>
        </button>

        {/* Clear Data Button (Zerar Dados) */}
        <button
          onClick={onClearData}
          title="Zerar todos os dados (Pronto para Produção)"
          className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
        >
          Zerar Dados
        </button>

        {/* Load Demo Button */}
        <button
          onClick={onLoadDemo}
          title="Carregar dados de exemplo para demonstração"
          className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
        >
          Dados Demo
        </button>
      </div>
    </header>
  );
};
