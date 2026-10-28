import crypto from 'crypto';
import { MetaAdAccount, MetaCampaignInsight } from '../types/index.ts';
import { db } from './db.ts';

export interface MetaSyncResult {
  success: boolean;
  message: string;
  syncedInsightsCount: number;
  totalSpendSynced: number;
  currency: string;
  account?: MetaAdAccount;
  error?: string;
}

/**
 * Syncs Meta Ads insights for the configured Ad Account
 */
export async function syncMetaAdsInsights(params?: {
  datePreset?: string;
  startDate?: string;
  endDate?: string;
}): Promise<MetaSyncResult> {
  const settings = await db.getSettings();
  const token = settings.meta_access_token;
  const accountId = settings.meta_ad_account_id || 'act_482910482019481';

  // If live token is set (starts with EAA and is not default placeholder)
  if (token && token.startsWith('EAA') && !token.includes('CONFIGURADO')) {
    try {
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
      const url = new URL(`https://graph.facebook.com/v19.0/${formattedAccountId}/insights`);
      
      url.searchParams.append('access_token', token);
      url.searchParams.append(
        'fields',
        'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,cpm,cpc,ctr,actions,account_currency'
      );
      url.searchParams.append('level', 'ad');
      url.searchParams.append('time_increment', '1');

      if (params?.startDate && params?.endDate) {
        url.searchParams.append(
          'time_range',
          JSON.stringify({ since: params.startDate, until: params.endDate })
        );
      } else {
        url.searchParams.append('date_preset', params?.datePreset || 'last_14d');
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `Meta API error HTTP ${response.status}`);
      }

      const rawItems = data.data || [];
      const newInsights: MetaCampaignInsight[] = [];
      let totalSpend = 0;

      for (const item of rawItems) {
        const spend = Number(item.spend || 0);
        totalSpend += spend;
        const impressions = Number(item.impressions || 0);
        const clicks = Number(item.clicks || 0);
        const cpm = Number(item.cpm || 0);
        const cpc = Number(item.cpc || 0);
        const ctr = Number(item.ctr || 0);

        // Find purchase actions in actions array
        let conversionsReported = 0;
        if (Array.isArray(item.actions)) {
          const purchaseAction = item.actions.find(
            (a: any) =>
              a.action_type === 'purchase' ||
              a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
              a.action_type === 'omni_purchase'
          );
          if (purchaseAction) conversionsReported = Number(purchaseAction.value || 0);
        }

        const dateStr = item.date_start || new Date().toISOString().split('T')[0];
        const hashId = crypto
          .createHash('md5')
          .update(`${accountId}_${item.ad_id || item.campaign_id}_${dateStr}`)
          .digest('hex');

        newInsights.push({
          id: hashId,
          account_id: formattedAccountId,
          campaign_id: item.campaign_id || 'cmp_unknown',
          campaign_name: item.campaign_name || 'Campanha Meta',
          adset_id: item.adset_id || '',
          adset_name: item.adset_name || '',
          ad_id: item.ad_id || '',
          ad_name: item.ad_name || '',
          date: dateStr,
          spend,
          impressions,
          clicks,
          cpm,
          cpc,
          ctr,
          conversions_reported: conversionsReported,
          currency: (item.account_currency || settings.currency || 'BRL') as any,
          synced_at: new Date().toISOString(),
        });
      }

      await db.saveMetaInsights(newInsights);

      return {
        success: true,
        message: `Sincronização Meta Ads realizada com sucesso via Marketing API oficial. ${newInsights.length} registros atualizados.`,
        syncedInsightsCount: newInsights.length,
        totalSpendSynced: totalSpend,
        currency: settings.currency,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na sincronização com Meta Marketing API: ${err.message}`,
        syncedInsightsCount: 0,
        totalSpendSynced: 0,
        currency: settings.currency,
        error: err.message,
      };
    }
    return {
      success: false,
      message: 'Token de Acesso da Meta ou ID da Conta não configurado. Insira seu Token Permanente ou de Usuário do Sistema na aba Meta Ads & CAPI para sincronizar as campanhas reais.',
      syncedInsightsCount: 0,
      totalSpendSynced: 0,
      currency: settings.currency || 'BRL',
    };
  }

  return {
    success: false,
    message: 'Token de Acesso da Meta ausente. Configure seu Token nas Configurações da Meta Ads para consultar métricas reais.',
    syncedInsightsCount: 0,
    totalSpendSynced: 0,
    currency: settings.currency || 'BRL',
  };
}
