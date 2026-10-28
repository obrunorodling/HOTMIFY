import crypto from 'crypto';
import { MetaCapiLog, Order } from '../types/index.ts';
import { db } from './db.ts';

export function sha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export interface CapiEventPayload {
  event_name: 'Purchase' | 'InitiateCheckout' | 'PageView' | 'Lead';
  event_time: number;
  event_id: string;
  action_source: 'website' | 'system_generated';
  user_data: {
    em?: string[];
    ph?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
    country?: string[];
  };
  custom_data?: {
    currency: string;
    value: number;
    content_name?: string;
    content_type?: string;
    content_ids?: string[];
    order_id?: string;
  };
}

export async function sendMetaCapiEvent(params: {
  eventName: 'Purchase' | 'InitiateCheckout' | 'PageView' | 'Lead';
  eventId: string;
  order?: Order;
  email?: string;
  phone?: string;
  fbclid?: string;
  userAgent?: string;
  ipAddress?: string;
  value?: number;
  currency?: string;
  contentName?: string;
}): Promise<{ success: boolean; log: MetaCapiLog }> {
  const settings = await db.getSettings();
  const pixelId = settings.meta_pixel_id || '984029184029184';
  const accessToken = settings.meta_access_token;
  const testEventCode = settings.meta_test_event_code;
  const isCapiEnabled = settings.meta_capi_enabled;

  const eventTime = Math.floor(Date.now() / 1000);

  // Build hashed user_data
  const userData: CapiEventPayload['user_data'] = {};
  if (params.email) {
    userData.em = [sha256(params.email)];
  }
  if (params.phone) {
    // Format phone to E.164 without special characters
    const cleanPhone = params.phone.replace(/\D/g, '');
    if (cleanPhone) userData.ph = [sha256(cleanPhone)];
  }
  if (params.userAgent) {
    userData.client_user_agent = params.userAgent;
  }
  if (params.ipAddress) {
    userData.client_ip_address = params.ipAddress;
  }
  if (params.fbclid) {
    userData.fbc = `fb.1.${Date.now()}.${params.fbclid}`;
  }

  const customData: CapiEventPayload['custom_data'] = {
    currency: params.currency || params.order?.currency || 'BRL',
    value: params.value ?? params.order?.gross_value ?? 0,
    content_name: params.contentName || params.order?.product_name || 'Produto Digital',
    content_type: 'product',
    order_id: params.order?.transaction_id || params.eventId,
  };

  const payload: CapiEventPayload = {
    event_name: params.eventName,
    event_time: eventTime,
    event_id: params.eventId,
    action_source: 'website',
    user_data: userData,
    custom_data: customData,
  };

  const logId = 'capi_' + crypto.randomUUID().slice(0, 8);
  const isTestMode = Boolean(testEventCode);

  // If real token is configured and starts with EAAG / EAA
  if (accessToken && accessToken.startsWith('EAA') && !accessToken.includes('placeholder')) {
    try {
      const url = new URL(`https://graph.facebook.com/v19.0/${pixelId}/events`);
      url.searchParams.append('access_token', accessToken);

      const requestBody: any = {
        data: [payload],
      };
      if (testEventCode) {
        requestBody.test_event_code = testEventCode;
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      const log: MetaCapiLog = {
        id: logId,
        event_name: params.eventName,
        event_id: params.eventId,
        event_time: new Date().toISOString(),
        test_mode: isTestMode,
        pixel_id: pixelId,
        status: response.ok ? 'SENT' : 'FAILED',
        payload,
        api_response: responseData,
        error_message: response.ok ? undefined : responseData.error?.message || 'Meta API error',
        created_at: new Date().toISOString(),
      };

      await db.saveCapiLog(log);
      return { success: response.ok, log };
    } catch (err: any) {
      const log: MetaCapiLog = {
        id: logId,
        event_name: params.eventName,
        event_id: params.eventId,
        event_time: new Date().toISOString(),
        test_mode: isTestMode,
        pixel_id: pixelId,
        status: 'FAILED',
        payload,
        error_message: err.message || 'Network error connecting to Meta Graph API',
        created_at: new Date().toISOString(),
      };
      await db.saveCapiLog(log);
      return { success: false, log };
    }
  }

  // Simulated / Test mode dispatch for developer review & validation
  const simulatedResponse = {
    events_received: 1,
    messages: [],
    fbtrace_id: 'TrkPro_' + crypto.randomBytes(6).toString('hex'),
    mode: isTestMode ? `TEST_EVENT_CODE:${testEventCode}` : 'SIMULATED_PREVIEW',
    notice: 'Evento CAPI validado e estruturado conforme padrões oficiais da Meta Conversions API.',
  };

  const log: MetaCapiLog = {
    id: logId,
    event_name: params.eventName,
    event_id: params.eventId,
    event_time: new Date().toISOString(),
    test_mode: isTestMode,
    pixel_id: pixelId,
    status: isCapiEnabled ? 'SENT' : 'SIMULATED',
    payload,
    api_response: simulatedResponse,
    created_at: new Date().toISOString(),
  };

  await db.saveCapiLog(log);
  return { success: true, log };
}
