export type Currency = 'BRL' | 'USD' | 'EUR';

export type HotmartPurchaseStatus =
  | 'APPROVED'
  | 'COMPLETE'
  | 'WAITING_PAYMENT'
  | 'REFUNDED'
  | 'CHARGEBACK'
  | 'CANCELED'
  | 'DISPUTE'
  | 'BLOCKED'
  | 'EXPIRED';

export type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'BILLET' | 'PAYPAL' | 'HYBRID' | 'OTHER';

export type AttributionMethod =
  | 'SCK_EXACT'
  | 'UTM_CAMPAIGN'
  | 'LAST_TOUCH'
  | 'FIRST_TOUCH'
  | 'UNKNOWN';

export interface HotmartWebhookEvent {
  id: string;
  event_id: string;
  hottok: string;
  event_name: string;
  transaction_id: string;
  status: 'PROCESSED' | 'DUPLICATE' | 'INVALID_TOKEN' | 'ERROR';
  error_message?: string;
  payload: any;
  received_at: string;
  processed_at?: string;
}

export interface Order {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  product_ucode?: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  gross_value: number;
  net_value: number;
  hotmart_fee: number;
  currency: Currency;
  status: HotmartPurchaseStatus;
  payment_type: PaymentMethod;
  installments_number: number;
  sck?: string;
  src?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  tracking_session_id?: string;
  attribution_method: AttributionMethod;
  attribution_confidence: number; // 0.0 - 1.0
  first_seen_at?: string;
  purchase_date: string;
  approved_date?: string;
  landing_page?: string;
  fbclid?: string;
  created_at: string;
  updated_at: string;
}

export interface TrackingSession {
  id: string; // tpro_sid_...
  visitor_id: string; // tpro_vid_...
  first_utm_source?: string;
  first_utm_medium?: string;
  first_utm_campaign?: string;
  first_utm_content?: string;
  first_utm_term?: string;
  first_fbclid?: string;
  first_landing_page?: string;
  last_utm_source?: string;
  last_utm_medium?: string;
  last_utm_campaign?: string;
  last_utm_content?: string;
  last_utm_term?: string;
  last_fbclid?: string;
  last_landing_page?: string;
  ip_hash: string;
  user_agent: string;
  country: string;
  device: 'mobile' | 'desktop' | 'tablet';
  first_seen_at: string;
  last_seen_at: string;
  pageviews_count: number;
}

export interface TrackingEvent {
  id: string;
  session_id: string;
  visitor_id: string;
  event_name: 'page_view' | 'initiate_checkout' | 'click';
  event_id: string;
  url: string;
  referrer: string;
  target_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  currency: Currency;
  timezone: string;
  account_status: number;
  last_synced_at?: string;
}

export interface MetaCampaignInsight {
  id: string;
  account_id: string;
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  conversions_reported: number; // Meta attributed pixel purchases
  currency: Currency;
  synced_at: string;
}

export interface MetaCapiLog {
  id: string;
  event_name: string;
  event_id: string;
  event_time: string;
  test_mode: boolean;
  pixel_id: string;
  status: 'SENT' | 'FAILED' | 'SIMULATED';
  payload: Record<string, any>;
  api_response?: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export interface AppSettings {
  hotmart_hottok: string;
  hotmart_verify_token: boolean;
  meta_access_token: string;
  meta_ad_account_id: string;
  meta_pixel_id: string;
  meta_test_event_code: string;
  meta_capi_enabled: boolean;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  base_url: string;
  attribution_window_days: number;
  currency: Currency;
}

export interface DashboardFinancialMetrics {
  total_spend: number;
  total_approved_sales_count: number;
  total_gross_revenue: number;
  total_net_revenue: number;
  total_refunds_count: number;
  total_refunds_amount: number;
  total_chargebacks_count: number;
  total_chargebacks_amount: number;
  cpa: number; // Spend / Approved Sales
  roas: number; // Gross Revenue / Spend
  roi: number; // (Net Revenue - Spend) / Spend
  net_profit: number; // Net Revenue - Spend
  conversion_rate: number; // Sales / Clicks %
  meta_reported_conversions: number; // Divergence comparison
  meta_reported_cpa: number;
  currency: Currency;
}

export interface CampaignPerformanceRow {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  meta_conversions: number;
  hotmart_approved_sales: number;
  hotmart_gross_revenue: number;
  hotmart_net_revenue: number;
  real_cpa: number;
  real_roas: number;
  estimated_profit: number;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}
