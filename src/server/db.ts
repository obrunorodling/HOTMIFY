import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
} from '../types/index.ts';
import {
  initialAdAccount,
  initialCapiLogs,
  initialMetaInsights,
  initialOrders,
  initialSettings,
  initialTrackingEvents,
  initialTrackingSessions,
  initialWebhookEvents,
} from './mockData.ts';

// In-memory persistent state (starts completely zeroed out, ready for live production use)
let inMemorySettings: AppSettings = { ...initialSettings };
let inMemoryOrders: Order[] = [];
let inMemoryWebhookEvents: HotmartWebhookEvent[] = [];
let inMemoryTrackingSessions: TrackingSession[] = [];
let inMemoryTrackingEvents: TrackingEvent[] = [];
let inMemoryMetaInsights: MetaCampaignInsight[] = [];
let inMemoryCapiLogs: MetaCapiLog[] = [];

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || inMemorySettings.supabase_url;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    inMemorySettings.supabase_service_role_key ||
    inMemorySettings.supabase_anon_key;

  if (url && key && url.startsWith('http') && !url.includes('placeholder')) {
    if (!supabaseInstance) {
      try {
        supabaseInstance = createClient(url, key, {
          auth: { persistSession: false },
        });
      } catch (err) {
        console.warn('Failed to init Supabase client:', err);
      }
    }
    return supabaseInstance;
  }
  return null;
}

export const db = {
  // SETTINGS
  async getSettings(): Promise<AppSettings> {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from('app_settings').select('*').limit(1).single();
      if (!error && data) {
        inMemorySettings = { ...inMemorySettings, ...data };
      }
    }
    return inMemorySettings;
  },

  async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    inMemorySettings = { ...inMemorySettings, ...newSettings };
    const sb = getSupabase();
    if (sb) {
      await sb.from('app_settings').upsert({ id: 1, ...inMemorySettings, updated_at: new Date().toISOString() });
    }
    return inMemorySettings;
  },

  // ORDERS
  async getOrders(): Promise<Order[]> {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from('orders').select('*').order('purchase_date', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as Order[];
      }
    }
    return inMemoryOrders.sort(
      (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    );
  },

  async getOrderByTransaction(transactionId: string): Promise<Order | undefined> {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.from('orders').select('*').eq('transaction_id', transactionId).maybeSingle();
      if (data) return data as Order;
    }
    return inMemoryOrders.find((o) => o.transaction_id === transactionId);
  },

  async saveOrder(order: Order): Promise<Order> {
    const existingIndex = inMemoryOrders.findIndex((o) => o.transaction_id === order.transaction_id);
    if (existingIndex >= 0) {
      inMemoryOrders[existingIndex] = { ...inMemoryOrders[existingIndex], ...order, updated_at: new Date().toISOString() };
    } else {
      inMemoryOrders.unshift(order);
    }

    const sb = getSupabase();
    if (sb) {
      await sb.from('orders').upsert(order, { onConflict: 'transaction_id' });
    }
    return order;
  },

  // WEBHOOK EVENTS
  async getWebhookEvents(): Promise<HotmartWebhookEvent[]> {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from('hotmart_webhook_events').select('*').order('received_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as HotmartWebhookEvent[];
      }
    }
    return inMemoryWebhookEvents.sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    );
  },

  async getWebhookEventById(id: string): Promise<HotmartWebhookEvent | undefined> {
    return inMemoryWebhookEvents.find((e) => e.id === id || e.event_id === id);
  },

  async saveWebhookEvent(event: HotmartWebhookEvent): Promise<HotmartWebhookEvent> {
    const existingIndex = inMemoryWebhookEvents.findIndex((e) => e.id === event.id);
    if (existingIndex >= 0) {
      inMemoryWebhookEvents[existingIndex] = event;
    } else {
      inMemoryWebhookEvents.unshift(event);
    }

    const sb = getSupabase();
    if (sb) {
      await sb.from('hotmart_webhook_events').upsert(event);
    }
    return event;
  },

  // TRACKING SESSIONS & EVENTS
  async getTrackingSessions(): Promise<TrackingSession[]> {
    return inMemoryTrackingSessions;
  },

  async getTrackingSession(sessionId: string): Promise<TrackingSession | undefined> {
    return inMemoryTrackingSessions.find((s) => s.id === sessionId);
  },

  async saveTrackingSession(session: TrackingSession): Promise<TrackingSession> {
    const idx = inMemoryTrackingSessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      inMemoryTrackingSessions[idx] = session;
    } else {
      inMemoryTrackingSessions.unshift(session);
    }
    return session;
  },

  async getTrackingEvents(): Promise<TrackingEvent[]> {
    return inMemoryTrackingEvents.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async saveTrackingEvent(event: TrackingEvent): Promise<TrackingEvent> {
    inMemoryTrackingEvents.unshift(event);
    return event;
  },

  // META INSIGHTS
  async getMetaInsights(): Promise<MetaCampaignInsight[]> {
    return inMemoryMetaInsights;
  },

  async saveMetaInsights(insights: MetaCampaignInsight[]): Promise<void> {
    for (const insight of insights) {
      const idx = inMemoryMetaInsights.findIndex((i) => i.id === insight.id);
      if (idx >= 0) {
        inMemoryMetaInsights[idx] = insight;
      } else {
        inMemoryMetaInsights.push(insight);
      }
    }
  },

  // META CAPI LOGS
  async getCapiLogs(): Promise<MetaCapiLog[]> {
    return inMemoryCapiLogs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async saveCapiLog(log: MetaCapiLog): Promise<MetaCapiLog> {
    inMemoryCapiLogs.unshift(log);
    return log;
  },

  // DASHBOARD METRICS CALCULATION
  async getDashboardFinancials(filters?: {
    startDate?: string;
    endDate?: string;
    campaign?: string;
    currency?: Currency;
  }): Promise<{
    metrics: DashboardFinancialMetrics;
    campaigns: CampaignPerformanceRow[];
    chartData: { date: string; spend: number; gross: number; net: number; sales: number }[];
  }> {
    const orders = await this.getOrders();
    const insights = await this.getMetaInsights();
    const targetCurrency = filters?.currency || inMemorySettings.currency || 'BRL';

    // Filter by currency first (no un-converted cross-currency mixing as requested)
    const currencyOrders = orders.filter((o) => o.currency === targetCurrency);
    const currencyInsights = insights.filter((i) => i.currency === targetCurrency);

    // Compute Meta Insights totals
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let metaReportedConversions = 0;

    for (const item of currencyInsights) {
      totalSpend += item.spend;
      totalClicks += item.clicks;
      totalImpressions += item.impressions;
      metaReportedConversions += item.conversions_reported;
    }

    // Compute Hotmart Orders totals
    let totalApprovedSalesCount = 0;
    let totalGrossRevenue = 0;
    let totalNetRevenue = 0;
    let totalRefundsCount = 0;
    let totalRefundsAmount = 0;
    let totalChargebacksCount = 0;
    let totalChargebacksAmount = 0;

    for (const order of currencyOrders) {
      if (order.status === 'APPROVED' || order.status === 'COMPLETE') {
        totalApprovedSalesCount += 1;
        totalGrossRevenue += order.gross_value;
        totalNetRevenue += order.net_value;
      } else if (order.status === 'REFUNDED') {
        totalRefundsCount += 1;
        totalRefundsAmount += order.gross_value;
      } else if (order.status === 'CHARGEBACK') {
        totalChargebacksCount += 1;
        totalChargebacksAmount += order.gross_value;
      }
    }

    const cpa = totalApprovedSalesCount > 0 ? totalSpend / totalApprovedSalesCount : 0;
    const roas = totalSpend > 0 ? totalGrossRevenue / totalSpend : 0;
    const netProfit = totalNetRevenue - totalSpend;
    const roi = totalSpend > 0 ? (netProfit / totalSpend) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalApprovedSalesCount / totalClicks) * 100 : 0;
    const metaReportedCpa = metaReportedConversions > 0 ? totalSpend / metaReportedConversions : 0;

    const metrics: DashboardFinancialMetrics = {
      total_spend: Number(totalSpend.toFixed(2)),
      total_approved_sales_count: totalApprovedSalesCount,
      total_gross_revenue: Number(totalGrossRevenue.toFixed(2)),
      total_net_revenue: Number(totalNetRevenue.toFixed(2)),
      total_refunds_count: totalRefundsCount,
      total_refunds_amount: Number(totalRefundsAmount.toFixed(2)),
      total_chargebacks_count: totalChargebacksCount,
      total_chargebacks_amount: Number(totalChargebacksAmount.toFixed(2)),
      cpa: Number(cpa.toFixed(2)),
      roas: Number(roas.toFixed(2)),
      roi: Number(roi.toFixed(1)),
      net_profit: Number(netProfit.toFixed(2)),
      conversion_rate: Number(conversionRate.toFixed(2)),
      meta_reported_conversions: metaReportedConversions,
      meta_reported_cpa: Number(metaReportedCpa.toFixed(2)),
      currency: targetCurrency,
    };

    // Campaign Performance Breakdown
    const campaignMap: Record<string, CampaignPerformanceRow> = {};

    // Group Meta spend by campaign
    for (const ins of currencyInsights) {
      const key = ins.campaign_id || ins.campaign_name;
      if (!campaignMap[key]) {
        campaignMap[key] = {
          campaign_id: ins.campaign_id,
          campaign_name: ins.campaign_name,
          spend: 0,
          impressions: 0,
          clicks: 0,
          cpc: 0,
          meta_conversions: 0,
          hotmart_approved_sales: 0,
          hotmart_gross_revenue: 0,
          hotmart_net_revenue: 0,
          real_cpa: 0,
          real_roas: 0,
          estimated_profit: 0,
          status: 'ACTIVE',
        };
      }
      campaignMap[key].spend += ins.spend;
      campaignMap[key].impressions += ins.impressions;
      campaignMap[key].clicks += ins.clicks;
      campaignMap[key].meta_conversions += ins.conversions_reported;
    }

    // Relate Hotmart confirmed sales to campaign
    for (const order of currencyOrders) {
      if (order.status !== 'APPROVED' && order.status !== 'COMPLETE') continue;
      const campaignKey = order.utm_campaign || 'Desconhecida / Orgânica';
      if (!campaignMap[campaignKey]) {
        campaignMap[campaignKey] = {
          campaign_id: campaignKey,
          campaign_name: order.utm_campaign || 'Tráfego Direto / Não Rastreado',
          spend: 0,
          impressions: 0,
          clicks: 0,
          cpc: 0,
          meta_conversions: 0,
          hotmart_approved_sales: 0,
          hotmart_gross_revenue: 0,
          hotmart_net_revenue: 0,
          real_cpa: 0,
          real_roas: 0,
          estimated_profit: 0,
          status: 'ACTIVE',
        };
      }
      campaignMap[campaignKey].hotmart_approved_sales += 1;
      campaignMap[campaignKey].hotmart_gross_revenue += order.gross_value;
      campaignMap[campaignKey].hotmart_net_revenue += order.net_value;
    }

    // Calculate CPA, ROAS, Profit for each campaign
    const campaigns: CampaignPerformanceRow[] = Object.values(campaignMap).map((row) => {
      const cpaRow = row.hotmart_approved_sales > 0 ? row.spend / row.hotmart_approved_sales : row.spend;
      const roasRow = row.spend > 0 ? row.hotmart_gross_revenue / row.spend : row.hotmart_gross_revenue > 0 ? 99 : 0;
      const profitRow = row.hotmart_net_revenue - row.spend;
      const cpcRow = row.clicks > 0 ? row.spend / row.clicks : 0;
      return {
        ...row,
        spend: Number(row.spend.toFixed(2)),
        hotmart_gross_revenue: Number(row.hotmart_gross_revenue.toFixed(2)),
        hotmart_net_revenue: Number(row.hotmart_net_revenue.toFixed(2)),
        cpc: Number(cpcRow.toFixed(2)),
        real_cpa: Number(cpaRow.toFixed(2)),
        real_roas: Number(roasRow.toFixed(2)),
        estimated_profit: Number(profitRow.toFixed(2)),
      };
    });

    // Daily Timeline Data for charts
    const dateMap: Record<string, { spend: number; gross: number; net: number; sales: number }> = {};

    for (const ins of currencyInsights) {
      if (!dateMap[ins.date]) {
        dateMap[ins.date] = { spend: 0, gross: 0, net: 0, sales: 0 };
      }
      dateMap[ins.date].spend += ins.spend;
    }

    for (const ord of currencyOrders) {
      if (ord.status === 'APPROVED' || ord.status === 'COMPLETE') {
        const d = ord.purchase_date.split('T')[0];
        if (!dateMap[d]) {
          dateMap[d] = { spend: 0, gross: 0, net: 0, sales: 0 };
        }
        dateMap[d].gross += ord.gross_value;
        dateMap[d].net += ord.net_value;
        dateMap[d].sales += 1;
      }
    }

    const chartData = Object.entries(dateMap)
      .map(([date, vals]) => ({
        date,
        spend: Number(vals.spend.toFixed(2)),
        gross: Number(vals.gross.toFixed(2)),
        net: Number(vals.net.toFixed(2)),
        sales: vals.sales,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { metrics, campaigns, chartData };
  },

  // CLEAR ALL DATA (Zero out all tables)
  async clearAllData(): Promise<void> {
    inMemoryOrders = [];
    inMemoryWebhookEvents = [];
    inMemoryTrackingSessions = [];
    inMemoryTrackingEvents = [];
    inMemoryMetaInsights = [];
    inMemoryCapiLogs = [];
  },

  // LOAD SAMPLE DEMO DATA
  async loadDemoData(): Promise<void> {
    inMemoryOrders = [...initialOrders];
    inMemoryWebhookEvents = [...initialWebhookEvents];
    inMemoryTrackingSessions = [...initialTrackingSessions];
    inMemoryTrackingEvents = [...initialTrackingEvents];
    inMemoryMetaInsights = [...initialMetaInsights];
    inMemoryCapiLogs = [...initialCapiLogs];
  },
};
