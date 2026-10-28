import React from 'react';
import {
  BarChart3,
  Code2,
  Database,
  GitFork,
  Radio,
  Send,
  ShieldCheck,
  Webhook,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingWebhooksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingWebhooksCount,
}) => {
  const menuItems = [
    {
      id: 'financial',
      label: 'Painel Financeiro',
      description: 'Gastos Meta vs Vendas Hotmart',
      icon: BarChart3,
    },
    {
      id: 'attribution',
      label: 'Atribuição & Vendas',
      description: 'Jornada do clique à compra',
      icon: GitFork,
    },
    {
      id: 'hotmart',
      label: 'Integração Hotmart',
      description: 'Webhooks, auditoria e simulador',
      icon: Webhook,
      badge: pendingWebhooksCount > 0 ? String(pendingWebhooksCount) : undefined,
    },
    {
      id: 'meta',
      label: 'Meta Ads & CAPI',
      description: 'Marketing API e Conversions API',
      icon: Radio,
    },
    {
      id: 'script',
      label: 'Script & URLs',
      description: 'Pixel para página e gerador de UTM',
      icon: Code2,
    },
    {
      id: 'database',
      label: 'Banco & Vercel',
      description: 'Schema Supabase e Guia Deploy',
      icon: Database,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col justify-between h-[calc(100vh-57px)] sticky top-[57px]">
      <div className="p-4 space-y-6">
        {/* Navigation Category */}
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
            Módulos de Rastreamento
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="leading-tight">
            <div className="font-medium text-slate-200">Ambiente Seguro</div>
            <div className="text-[11px] text-slate-500">Serverless &amp; Idempotente</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
