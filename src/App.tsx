import React, { useEffect, useState } from 'react';
import {
  AppSettings,
  CampaignPerformanceRow,
  Currency,
  DashboardFinancialMetrics,
  HotmartWebhookEvent,
  MetaCampaignInsight,
  MetaCapiLog,
  Order,
  TrackingEvent,
  TrackingSession,
} from './types/index.ts';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { FinancialDashboard } from './components/FinancialDashboard.tsx';
import { AttributionView } from './components/AttributionView.tsx';
import { HotmartIntegrationView } from './components/HotmartIntegrationView.tsx';
import { MetaAdsView } from './components/MetaAdsView.tsx';
import { TrackingScriptView } from './components/TrackingScriptView.tsx';
import { DatabaseDeployView } from './components/DatabaseDeployView.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('financial');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Core Data
  const [metrics, setMetrics] = useState<DashboardFinancialMetrics>({
    total_spend: 0,
    total_approved_sales_count: 0,
    total_gross_revenue: 0,
    total_net_revenue: 0,
    total_refunds_count: 0,
    total_refunds_amount: 0,
    total_chargebacks_count: 0,
    total_chargebacks_amount: 0,
    cpa: 0,
    roas: 0,
    roi: 0,
    net_profit: 0,
    conversion_rate: 0,
    meta_reported_conversions: 0,
    meta_reported_cpa: 0,
    currency: 'BRL',
  });
  const [campaigns, setCampaigns] = useState<CampaignPerformanceRow[]>([]);
  const [chartData, setChartData] = useState<{ date: string; spend: number; gross: number; net: number; sales: number }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<HotmartWebhookEvent[]>([]);
  const [capiLogs, setCapiLogs] = useState<MetaCapiLog[]>([]);
  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const fetchDashboardData = async (cur: Currency = currency) => {
    try {
      const res = await fetch(`/api/dashboard?currency=${cur}`);
      if (res.ok) {
        const data = await res.json();
        if (data.financials) {
          setMetrics(data.financials.metrics);
          setCampaigns(data.financials.campaigns || []);
          setChartData(data.financials.chartData || []);
        }
        if (data.orders) setOrders(data.orders);
        if (data.webhookEvents) setWebhookEvents(data.webhookEvents);
        if (data.capiLogs) setCapiLogs(data.capiLogs);
        if (data.trackingSessions) setTrackingSessions(data.trackingSessions);
        if (data.trackingEvents) setTrackingEvents(data.trackingEvents);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(currency);
  }, [currency]);

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    fetchDashboardData(newCurrency);
  };

  const handleSyncMeta = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/meta-sync', { method: 'POST' });
      await res.json();
      await fetchDashboardData(currency);
    } catch (err) {
      console.error('Error syncing Meta Ads:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('Tem certeza de que deseja zerar todos os dados? As transações, eventos e métricas serão apagados e o sistema ficará pronto para novos dados de produção.')) {
      try {
        await fetch('/api/clear-data', { method: 'POST' });
        await fetchDashboardData(currency);
      } catch (err) {
        console.error('Error clearing data:', err);
      }
    }
  };

  const handleLoadDemo = async () => {
    try {
      await fetch('/api/load-demo', { method: 'POST' });
      await fetchDashboardData(currency);
    } catch (err) {
      console.error('Error loading demo:', err);
    }
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  // Convert raw insights for Meta Ads view
  const metaInsights: MetaCampaignInsight[] = campaigns.map((c, i) => ({
    id: `meta_ins_${c.campaign_id}`,
    account_id: settings?.meta_ad_account_id || '',
    campaign_id: c.campaign_id,
    campaign_name: c.campaign_name,
    adset_id: `adset_${i + 1}`,
    adset_name: 'Público Aberto',
    ad_id: `ad_${i + 1}`,
    ad_name: 'Anúncio Criativo Oficial',
    date: new Date().toISOString().split('T')[0],
    spend: c.spend,
    impressions: c.impressions,
    clicks: c.clicks,
    cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
    cpc: c.cpc,
    ctr: c.impressions > 0 ? c.clicks / c.impressions : 0,
    conversions_reported: c.meta_conversions,
    currency,
    synced_at: new Date().toISOString(),
  }));

  const pendingWebhooksCount = webhookEvents.filter((e) => e.status !== 'PROCESSED').length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        onSyncMeta={handleSyncMeta}
        onClearData={handleClearData}
        onLoadDemo={handleLoadDemo}
        isSyncing={isSyncing}
      />

      {/* Main Workspace with Sidebar & Viewport */}
      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingWebhooksCount={pendingWebhooksCount}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] mx-auto w-full overflow-x-hidden">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-20 bg-slate-900 rounded-xl border border-slate-800" />
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-900 rounded-xl border border-slate-800" />
                ))}
              </div>
              <div className="h-64 bg-slate-900 rounded-xl border border-slate-800" />
            </div>
          ) : (
            <>
              {activeTab === 'financial' && (
                <FinancialDashboard
                  metrics={metrics}
                  campaigns={campaigns}
                  chartData={chartData}
                  currency={currency}
                  onRefresh={() => fetchDashboardData(currency)}
                  onNavigateTab={setActiveTab}
                  onLoadDemo={handleLoadDemo}
                />
              )}

              {activeTab === 'attribution' && (
                <AttributionView
                  orders={orders}
                  sessions={trackingSessions}
                  currency={currency}
                />
              )}

              {activeTab === 'hotmart' && settings && (
                <HotmartIntegrationView
                  settings={settings}
                  webhookEvents={webhookEvents}
                  onUpdateSettings={handleUpdateSettings}
                  onRefreshData={() => fetchDashboardData(currency)}
                />
              )}

              {activeTab === 'meta' && settings && (
                <MetaAdsView
                  settings={settings}
                  insights={metaInsights}
                  capiLogs={capiLogs}
                  onUpdateSettings={handleUpdateSettings}
                  onSyncMeta={handleSyncMeta}
                  isSyncing={isSyncing}
                />
              )}

              {activeTab === 'script' && (
                <TrackingScriptView
                  sessions={trackingSessions}
                  events={trackingEvents}
                  onRefreshData={() => fetchDashboardData(currency)}
                />
              )}

              {activeTab === 'database' && settings && (
                <DatabaseDeployView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
