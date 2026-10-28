import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Download,
  Filter,
  Layers,
  Percent,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CampaignPerformanceRow, Currency, DashboardFinancialMetrics } from '../types/index.ts';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters.ts';

interface FinancialDashboardProps {
  metrics: DashboardFinancialMetrics;
  campaigns: CampaignPerformanceRow[];
  chartData: { date: string; spend: number; gross: number; net: number; sales: number }[];
  currency: Currency;
  onRefresh: () => void;
  onNavigateTab?: (tab: string) => void;
  onLoadDemo?: () => void;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  metrics,
  campaigns,
  chartData,
  currency,
  onRefresh,
  onNavigateTab,
  onLoadDemo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.campaign_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'PROFIT') return c.estimated_profit > 0;
    if (statusFilter === 'LOSS') return c.estimated_profit < 0;
    return true;
  });

  const isProfitable = metrics.net_profit >= 0;
  const isZeroState = metrics.total_spend === 0 && metrics.total_approved_sales_count === 0 && campaigns.length === 0;

  return (
    <div className="space-y-6">
      {/* Zero State Alert Banner */}
      {isZeroState && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Sistema 100% Zerado e Pronto para Receber Dados em Produção
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                O banco de dados está pronto para receber webhooks oficiais da Hotmart, coletar cliques de anúncios via script de tracking e registrar gastos do Meta Ads.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onNavigateTab && (
                <>
                  <button
                    onClick={() => onNavigateTab('hotmart')}
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                  >
                    Configurar Webhook Hotmart
                  </button>
                  <button
                    onClick={() => onNavigateTab('script')}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Pegar Script de Tracking
                  </button>
                </>
              )}
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  className="rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                >
                  Carregar Exemplo Demo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Banner: Divergence & Attribution Notice */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-950/60 p-2 text-blue-400 border border-blue-900/40">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">
                Auditoria de Divergência: Vendas Reais Hotmart vs Conversões Meta Pixel
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                A Hotmart registrou <strong className="text-slate-200">{metrics.total_approved_sales_count} vendas aprovadas</strong> em conta bancária, enquanto o Meta Pixel reportou <strong className="text-slate-200">{metrics.meta_reported_conversions} conversões</strong> estimadas via janela de atribuição 7D clique / 1D visualização. Estes números nunca são somados.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 text-xs">
            <span className="text-slate-400">Moeda Selecionada:</span>
            <span className="font-mono font-semibold text-slate-200 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              {currency}
            </span>
          </div>
        </div>
      </div>

      {/* Main KPI Grid (Zero-Pill, Dense, Tabular Figures) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Investimento Meta */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <span className="text-xs font-medium text-slate-400">Investimento Meta Ads</span>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-100 tabular-nums">
            {formatCurrency(metrics.total_spend, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Marketing API Oficial</span>
          </div>
        </div>

        {/* Faturamento Bruto */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <span className="text-xs font-medium text-slate-400">Faturamento Bruto Hotmart</span>
          <div className="mt-1.5 font-mono text-xl font-bold text-emerald-400 tabular-nums">
            {formatCurrency(metrics.total_gross_revenue, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>{metrics.total_approved_sales_count} pedidos aprovados</span>
          </div>
        </div>

        {/* Receita Líquida Produtor */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <span className="text-xs font-medium text-slate-400">Receita Líquida Produtor</span>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-100 tabular-nums">
            {formatCurrency(metrics.total_net_revenue, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Descontadas taxas Hotmart</span>
          </div>
        </div>

        {/* Lucro Real Estimado */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <span className="text-xs font-medium text-slate-400">Lucro Real Estimado</span>
          <div
            className={`mt-1.5 font-mono text-xl font-bold tabular-nums ${
              isProfitable ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(metrics.net_profit, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px]">
            {isProfitable ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> ROI {metrics.roi}%
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5">
                <ArrowDownRight className="h-3 w-3" /> ROI {metrics.roi}%
              </span>
            )}
          </div>
        </div>

        {/* ROAS Real */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <span className="text-xs font-medium text-slate-400">ROAS Real (Hotmart/Meta)</span>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-100 tabular-nums">
            {metrics.roas}x
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Bruto / Investimento</span>
          </div>
        </div>

        {/* CPA Real */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <span className="text-xs font-medium text-slate-400">CPA Real por Compra</span>
          <div className="mt-1.5 font-mono text-xl font-bold text-slate-100 tabular-nums">
            {formatCurrency(metrics.cpa, currency)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Custo por venda aprovada</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar: Refunds, Chargebacks, Conversion Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Reembolsos Confirmados</span>
            <div className="mt-1 font-mono text-sm font-semibold text-rose-400 tabular-nums">
              {formatCurrency(metrics.total_refunds_amount, currency)} ({metrics.total_refunds_count} pedidos)
            </div>
          </div>
          <span className="text-xs text-slate-500">Subtraídos da receita</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Chargebacks (Contestações)</span>
            <div className="mt-1 font-mono text-sm font-semibold text-amber-400 tabular-nums">
              {formatCurrency(metrics.total_chargebacks_amount, currency)} ({metrics.total_chargebacks_count} pedidos)
            </div>
          </div>
          <span className="text-xs text-slate-500">Notificado via webhook</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Taxa de Conversão Real (Cliques → Vendas)</span>
            <div className="mt-1 font-mono text-sm font-semibold text-blue-400 tabular-nums">
              {metrics.conversion_rate}%
            </div>
          </div>
          <span className="text-xs text-slate-500">Base: Cliques Meta</span>
        </div>
      </div>

      {/* Visual Timeline Chart: Daily Spend vs Revenue */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Evolução Diária de Lucro &amp; Receita</h3>
            <span className="text-xs text-slate-400">Comparação diária entre investimento e faturamento aprovado</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-300">Investimento Meta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Receita Bruta Hotmart</span>
            </div>
          </div>
        </div>

        {/* Minimalist SVG Bar Chart */}
        <div className="h-44 w-full flex items-end gap-6 pt-6 pb-2 px-2 border-b border-slate-800">
          {chartData.map((d) => {
            const maxVal = Math.max(...chartData.map((x) => Math.max(x.spend, x.gross, 100)));
            const spendHeight = Math.max(12, Math.round((d.spend / maxVal) * 120));
            const grossHeight = Math.max(12, Math.round((d.gross / maxVal) * 120));
            const isDayProfitable = d.net >= d.spend;

            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1.5 h-32">
                  {/* Spend Bar */}
                  <div
                    style={{ height: `${spendHeight}px` }}
                    className="w-1/2 max-w-[28px] rounded-t bg-blue-600/80 transition-all group-hover:bg-blue-500"
                    title={`Investimento: ${formatCurrency(d.spend, currency)}`}
                  />
                  {/* Gross Bar */}
                  <div
                    style={{ height: `${grossHeight}px` }}
                    className="w-1/2 max-w-[28px] rounded-t bg-emerald-500/80 transition-all group-hover:bg-emerald-400"
                    title={`Faturamento: ${formatCurrency(d.gross, currency)}`}
                  />
                </div>
                {/* Date Label */}
                <span className="font-mono text-[11px] text-slate-400 truncate">
                  {d.date.split('-').slice(1).join('/')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-100">Desempenho por Campanha</h3>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredCampaigns.length} campanhas ativas)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-slate-700 focus:outline-none"
              />
            </div>

            {/* Segmented Filter */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setStatusFilter('PROFIT')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'PROFIT' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lucrativas
              </button>
              <button
                onClick={() => setStatusFilter('LOSS')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'LOSS' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Prejuízo
              </button>
            </div>
          </div>
        </div>

        {/* High Density Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Nome da Campanha</th>
                <th className="py-3 px-3 font-medium text-right">Investimento</th>
                <th className="py-3 px-3 font-medium text-right">Cliques</th>
                <th className="py-3 px-3 font-medium text-right">CPC Médio</th>
                <th className="py-3 px-3 font-medium text-right">Vendas Hotmart</th>
                <th className="py-3 px-3 font-medium text-right">Faturamento Bruto</th>
                <th className="py-3 px-3 font-medium text-right">CPA Real</th>
                <th className="py-3 px-3 font-medium text-right">ROAS Real</th>
                <th className="py-3 px-4 font-medium text-right">Lucro Estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Nenhuma campanha encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((row) => {
                  const isRowProfitable = row.estimated_profit >= 0;
                  return (
                    <tr key={row.campaign_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-200">
                        <div className="truncate max-w-xs">{row.campaign_name}</div>
                        <span className="font-mono text-[10px] text-slate-500">{row.campaign_id}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-slate-200 tabular-nums">
                        {formatCurrency(row.spend, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-slate-300 tabular-nums">
                        {formatNumber(row.clicks)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-slate-400 tabular-nums">
                        {formatCurrency(row.cpc, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-emerald-400 font-semibold tabular-nums">
                        {row.hotmart_approved_sales}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-slate-200 font-medium tabular-nums">
                        {formatCurrency(row.hotmart_gross_revenue, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-slate-300 tabular-nums">
                        {row.hotmart_approved_sales > 0 ? formatCurrency(row.real_cpa, currency) : '-'}
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-semibold tabular-nums">
                        <span className={row.real_roas >= 2 ? 'text-emerald-400' : row.real_roas >= 1 ? 'text-slate-200' : 'text-rose-400'}>
                          {row.real_roas.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-semibold tabular-nums">
                        <span className={isRowProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatCurrency(row.estimated_profit, currency)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
