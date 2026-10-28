import crypto from 'crypto';
import {
  AttributionMethod,
  HotmartPurchaseStatus,
  HotmartWebhookEvent,
  Order,
  PaymentMethod,
} from '../types/index.ts';
import { sendMetaCapiEvent } from './capi.ts';
import { db } from './db.ts';

export interface HotmartProcessResult {
  success: boolean;
  status: 'PROCESSED' | 'DUPLICATE' | 'INVALID_TOKEN' | 'ERROR';
  message: string;
  transactionId?: string;
  order?: Order;
  eventId: string;
}

/**
 * Normalizes Hotmart status string into our strict enum
 */
export function normalizeHotmartStatus(event: string, status?: string): HotmartPurchaseStatus {
  const normEvent = (event || '').toUpperCase();
  const normStatus = (status || '').toUpperCase();

  if (normEvent.includes('APPROVED')) return 'APPROVED';
  if (normEvent.includes('COMPLETE')) return 'COMPLETE';
  if (normEvent.includes('REFUNDED')) return 'REFUNDED';
  if (normEvent.includes('CHARGEBACK')) return 'CHARGEBACK';
  if (normEvent.includes('CANCELED')) return 'CANCELED';
  if (normEvent.includes('DISPUTE')) return 'DISPUTE';
  if (normEvent.includes('EXPIRED')) return 'EXPIRED';
  if (
    normEvent.includes('BILLET_PRINTED') ||
    normEvent.includes('OUT_OF_SHOPPING_CART') ||
    normEvent.includes('DELAYED') ||
    normEvent.includes('WAITING')
  ) {
    return 'WAITING_PAYMENT';
  }

  if (normStatus === 'APPROVED') return 'APPROVED';
  if (normStatus === 'COMPLETE') return 'COMPLETE';
  if (normStatus === 'REFUNDED') return 'REFUNDED';
  if (normStatus === 'CHARGEBACK') return 'CHARGEBACK';
  if (normStatus === 'CANCELED') return 'CANCELED';
  if (normStatus === 'WAITING_PAYMENT') return 'WAITING_PAYMENT';

  return 'WAITING_PAYMENT';
}

/**
 * Normalizes payment method string
 */
export function normalizePaymentMethod(type?: string): PaymentMethod {
  const norm = (type || '').toUpperCase();
  if (norm.includes('PIX')) return 'PIX';
  if (norm.includes('CREDIT') || norm.includes('CARD') || norm.includes('CARTAO')) return 'CREDIT_CARD';
  if (norm.includes('BILLET') || norm.includes('BOLETO')) return 'BILLET';
  if (norm.includes('PAYPAL')) return 'PAYPAL';
  if (norm.includes('HYBRID')) return 'HYBRID';
  return 'OTHER';
}

/**
 * Parses SCK tracking token: formats can be "tpro_sid_123|campaign|content" or plain campaign
 */
export function parseSck(sckString?: string): {
  sessionId?: string;
  campaign?: string;
  content?: string;
} {
  if (!sckString) return {};
  const parts = sckString.split('|');
  const result: { sessionId?: string; campaign?: string; content?: string } = {};

  for (const part of parts) {
    if (part.startsWith('tpro_sid_')) {
      result.sessionId = part;
    } else if (part.startsWith('cmp_') || !result.campaign) {
      result.campaign = part;
    } else if (part.startsWith('ad_') || !result.content) {
      result.content = part;
    }
  }

  return result;
}

/**
 * Main Webhook Processing Pipeline
 */
export async function processHotmartWebhook(
  payload: any,
  headers: Record<string, string | string[] | undefined> = {}
): Promise<HotmartProcessResult> {
  const settings = await db.getSettings();
  const eventId = payload.id || 'wh_' + crypto.randomUUID();
  const receivedAt = new Date().toISOString();

  // 1. Authenticate using Hotmart's official verification
  // Hotmart sends either header `X-HOTMART-HOTTOK`, header `hottok`, query param `hottok`, or inside body `hottok`
  const incomingToken =
    (headers['x-hotmart-hottok'] as string) ||
    (headers['hottok'] as string) ||
    payload.hottok ||
    '';

  const isTokenConfigured = Boolean(settings.hotmart_hottok);
  const isVerifyEnabled = settings.hotmart_verify_token;

  if (isVerifyEnabled && isTokenConfigured) {
    if (incomingToken !== settings.hotmart_hottok) {
      const webhookLog: HotmartWebhookEvent = {
        id: 'wh_' + crypto.randomUUID().slice(0, 8),
        event_id: eventId,
        hottok: incomingToken || '[NENHUM]',
        event_name: payload.event || 'UNKNOWN',
        transaction_id: payload.data?.purchase?.transaction || 'NO_TRANSACTION',
        status: 'INVALID_TOKEN',
        error_message: 'Token de autenticação (hottok) inválido ou ausente.',
        payload,
        received_at: receivedAt,
        processed_at: new Date().toISOString(),
      };
      await db.saveWebhookEvent(webhookLog);

      return {
        success: false,
        status: 'INVALID_TOKEN',
        message: 'Falha de autenticação: Hottok não corresponde ao token configurado.',
        eventId,
      };
    }
  }

  // 2. Validate data structure
  const purchaseData = payload.data?.purchase;
  const productData = payload.data?.product;
  const buyerData = payload.data?.buyer;
  const eventName = (payload.event || 'PURCHASE_APPROVED').toUpperCase();

  const transactionId = purchaseData?.transaction || payload.transaction;

  if (!transactionId) {
    const webhookLog: HotmartWebhookEvent = {
      id: 'wh_' + crypto.randomUUID().slice(0, 8),
      event_id: eventId,
      hottok: incomingToken,
      event_name: eventName,
      transaction_id: 'MISSING_TRANSACTION',
      status: 'ERROR',
      error_message: 'Notificação rejeitada: Campo de transação ausente.',
      payload,
      received_at: receivedAt,
      processed_at: new Date().toISOString(),
    };
    await db.saveWebhookEvent(webhookLog);

    return {
      success: false,
      status: 'ERROR',
      message: 'Payload inválido: transaction id ausente.',
      eventId,
    };
  }

  // 3. Idempotency Check
  // Check if this exact webhook event has already been received and processed
  const existingEvents = await db.getWebhookEvents();
  const duplicateEvent = existingEvents.find(
    (e) => e.event_id === eventId && e.status === 'PROCESSED'
  );

  const existingOrder = await db.getOrderByTransaction(transactionId);
  const normalizedStatus = normalizeHotmartStatus(eventName, purchaseData?.status);

  // If this exact event and status was already applied, prevent duplicate accounting
  if (duplicateEvent || (existingOrder && existingOrder.status === normalizedStatus && eventName === 'PURCHASE_APPROVED')) {
    const webhookLog: HotmartWebhookEvent = {
      id: 'wh_' + crypto.randomUUID().slice(0, 8),
      event_id: eventId,
      hottok: incomingToken,
      event_name: eventName,
      transaction_id: transactionId,
      status: 'DUPLICATE',
      error_message: 'Notificação duplicada ignorada com sucesso (idempotência preservada).',
      payload,
      received_at: receivedAt,
      processed_at: new Date().toISOString(),
    };
    await db.saveWebhookEvent(webhookLog);

    return {
      success: true,
      status: 'DUPLICATE',
      message: `Transação ${transactionId} já processada com estado ${normalizedStatus}. Duplicidade evitada.`,
      transactionId,
      order: existingOrder,
      eventId,
    };
  }

  // 4. Financial Calculations
  const grossValue = Number(purchaseData?.price?.value ?? purchaseData?.original_offer_price?.value ?? 0);
  const currency = (purchaseData?.price?.currency_value || 'BRL') as any;

  // Extract Hotmart commissions
  let netValue = grossValue;
  let hotmartFee = 0;

  if (Array.isArray(payload.data?.commissions)) {
    const producerComm = payload.data.commissions.find((c: any) => c.source === 'PRODUCER');
    const marketplaceComm = payload.data.commissions.find((c: any) => c.source === 'MARKETPLACE');
    if (producerComm) netValue = Number(producerComm.value);
    if (marketplaceComm) hotmartFee = Number(marketplaceComm.value);
  } else {
    // Standard Hotmart fallback (~9.9% + R$ 1.00)
    hotmartFee = Number((grossValue * 0.099 + 1.0).toFixed(2));
    netValue = Number((grossValue - hotmartFee).toFixed(2));
  }

  // If status is refunded or chargeback, net revenue is zeroed
  if (normalizedStatus === 'REFUNDED' || normalizedStatus === 'CHARGEBACK' || normalizedStatus === 'CANCELED') {
    netValue = 0;
    hotmartFee = 0;
  }

  // 5. Relate Sale to Tracking Data (Attribution Engine)
  const rawSck = purchaseData?.sck || purchaseData?.tracking?.source_sck || '';
  const rawSrc = purchaseData?.src || purchaseData?.tracking?.source || '';
  const parsed = parseSck(rawSck);

  let trackingSessionId = parsed.sessionId;
  let utmSource = rawSrc || 'direct';
  let utmMedium = 'none';
  let utmCampaign = parsed.campaign || '';
  let utmContent = parsed.content || '';
  let utmTerm = '';
  let fbclid = '';
  let landingPage = '';
  let attributionMethod: AttributionMethod = 'UNKNOWN';
  let attributionConfidence = 0.2;
  let firstSeenAt = new Date().toISOString();

  // If session ID is present in SCK, fetch full session tracking journey
  if (trackingSessionId) {
    const session = await db.getTrackingSession(trackingSessionId);
    if (session) {
      attributionMethod = 'SCK_EXACT';
      attributionConfidence = 1.0;
      utmSource = session.last_utm_source || session.first_utm_source || utmSource;
      utmMedium = session.last_utm_medium || session.first_utm_medium || utmMedium;
      utmCampaign = session.last_utm_campaign || session.first_utm_campaign || utmCampaign;
      utmContent = session.last_utm_content || session.first_utm_content || utmContent;
      utmTerm = session.last_utm_term || session.first_utm_term || '';
      fbclid = session.last_fbclid || session.first_fbclid || '';
      landingPage = session.last_landing_page || session.first_landing_page || '';
      firstSeenAt = session.first_seen_at;
    } else {
      attributionMethod = 'SCK_EXACT';
      attributionConfidence = 0.9;
    }
  } else if (utmCampaign) {
    attributionMethod = 'UTM_CAMPAIGN';
    attributionConfidence = 0.75;
  }

  const purchaseDate = purchaseData?.order_date
    ? new Date(typeof purchaseData.order_date === 'number' ? purchaseData.order_date : purchaseData.order_date).toISOString()
    : new Date().toISOString();

  const approvedDate =
    normalizedStatus === 'APPROVED' || normalizedStatus === 'COMPLETE'
      ? purchaseData?.approved_date
        ? new Date(typeof purchaseData.approved_date === 'number' ? purchaseData.approved_date : purchaseData.approved_date).toISOString()
        : new Date().toISOString()
      : undefined;

  // 6. Build and Save Normalized Order
  const order: Order = {
    id: existingOrder ? existingOrder.id : 'ord_' + crypto.randomUUID().slice(0, 8),
    transaction_id: transactionId,
    product_id: String(productData?.id || 'prod_default'),
    product_name: productData?.name || 'Produto Hotmart',
    product_ucode: productData?.ucode,
    buyer_name: buyerData?.name || 'Comprador Hotmart',
    buyer_email: buyerData?.email || 'cliente@email.com',
    buyer_phone: buyerData?.checkout_phone,
    gross_value: grossValue,
    net_value: netValue,
    hotmart_fee: hotmartFee,
    currency: currency,
    status: normalizedStatus,
    payment_type: normalizePaymentMethod(purchaseData?.payment?.type),
    installments_number: Number(purchaseData?.payment?.installments_number || 1),
    sck: rawSck,
    src: rawSrc,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    tracking_session_id: trackingSessionId,
    attribution_method: attributionMethod,
    attribution_confidence: attributionConfidence,
    first_seen_at: firstSeenAt,
    purchase_date: purchaseDate,
    approved_date: approvedDate,
    landing_page: landingPage,
    fbclid: fbclid,
    created_at: existingOrder?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.saveOrder(order);

  // 7. Audit Log of Webhook Event
  const webhookLog: HotmartWebhookEvent = {
    id: 'wh_' + crypto.randomUUID().slice(0, 8),
    event_id: eventId,
    hottok: incomingToken,
    event_name: eventName,
    transaction_id: transactionId,
    status: 'PROCESSED',
    payload,
    received_at: receivedAt,
    processed_at: new Date().toISOString(),
  };
  await db.saveWebhookEvent(webhookLog);

  // 8. Server-Side Meta CAPI Dispatch
  // Trigger server-side conversion when purchase is approved
  if (normalizedStatus === 'APPROVED' || normalizedStatus === 'COMPLETE') {
    try {
      await sendMetaCapiEvent({
        eventName: 'Purchase',
        eventId: transactionId, // Deduplication key
        order,
        email: buyerData?.email,
        phone: buyerData?.checkout_phone,
        fbclid,
        currency,
        value: grossValue,
        contentName: order.product_name,
      });
    } catch (capiErr) {
      console.warn('Failed to send Meta CAPI event:', capiErr);
    }
  }

  return {
    success: true,
    status: 'PROCESSED',
    message: `Venda ${transactionId} processada com sucesso: Status ${normalizedStatus}, Valor R$ ${grossValue.toFixed(2)}.`,
    transactionId,
    order,
    eventId,
  };
}
