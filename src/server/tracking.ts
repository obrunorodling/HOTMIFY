import crypto from 'crypto';
import { TrackingEvent, TrackingSession } from '../types/index.ts';
import { sendMetaCapiEvent } from './capi.ts';
import { db } from './db.ts';

export interface TrackPayload {
  eventName: 'page_view' | 'initiate_checkout' | 'click';
  eventId: string;
  sessionId: string;
  visitorId: string;
  url: string;
  referrer?: string;
  targetUrl?: string;
  utms?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  fbclid?: string;
  metadata?: Record<string, any>;
  consent?: boolean;
}

export async function recordTrackingEvent(
  payload: TrackPayload,
  headers: Record<string, string | string[] | undefined> = {}
): Promise<{ success: boolean; session: TrackingSession; event: TrackingEvent }> {
  const userAgent = (headers['user-agent'] as string) || 'Unknown User Agent';
  const ip =
    (headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (headers['x-real-ip'] as string) ||
    '127.0.0.1';

  // Pseudonymized IP hash
  const ipHash = crypto.createHash('sha256').update(ip + '_salt_trackpro').digest('hex');

  // Detect device
  let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  const lowerUA = userAgent.toLowerCase();
  if (lowerUA.includes('tablet') || lowerUA.includes('ipad')) {
    device = 'tablet';
  } else if (lowerUA.includes('mobile') || lowerUA.includes('iphone') || lowerUA.includes('android')) {
    device = 'mobile';
  }

  // Lookup or create session
  let session = await db.getTrackingSession(payload.sessionId);
  const now = new Date().toISOString();

  if (!session) {
    session = {
      id: payload.sessionId,
      visitor_id: payload.visitorId,
      first_utm_source: payload.utms?.source,
      first_utm_medium: payload.utms?.medium,
      first_utm_campaign: payload.utms?.campaign,
      first_utm_content: payload.utms?.content,
      first_utm_term: payload.utms?.term,
      first_fbclid: payload.fbclid,
      first_landing_page: payload.url,
      last_utm_source: payload.utms?.source,
      last_utm_medium: payload.utms?.medium,
      last_utm_campaign: payload.utms?.campaign,
      last_utm_content: payload.utms?.content,
      last_utm_term: payload.utms?.term,
      last_fbclid: payload.fbclid,
      last_landing_page: payload.url,
      ip_hash: ipHash,
      user_agent: userAgent,
      country: 'BR',
      device,
      pageviews_count: 1,
      first_seen_at: now,
      last_seen_at: now,
    };
  } else {
    // Update last touch while strictly preserving first touch
    session.last_seen_at = now;
    session.pageviews_count += 1;
    if (payload.utms?.source) session.last_utm_source = payload.utms.source;
    if (payload.utms?.medium) session.last_utm_medium = payload.utms.medium;
    if (payload.utms?.campaign) session.last_utm_campaign = payload.utms.campaign;
    if (payload.utms?.content) session.last_utm_content = payload.utms.content;
    if (payload.utms?.term) session.last_utm_term = payload.utms.term;
    if (payload.fbclid) session.last_fbclid = payload.fbclid;
    session.last_landing_page = payload.url;
  }

  await db.saveTrackingSession(session);

  // Save Event
  const event: TrackingEvent = {
    id: 'trk_' + crypto.randomUUID().slice(0, 8),
    session_id: payload.sessionId,
    visitor_id: payload.visitorId,
    event_name: payload.eventName,
    event_id: payload.eventId || 'evt_' + crypto.randomUUID().slice(0, 8),
    url: payload.url,
    referrer: payload.referrer || '',
    target_url: payload.targetUrl,
    metadata: payload.metadata || {},
    created_at: now,
  };

  await db.saveTrackingEvent(event);

  // If initiate_checkout event, optionally dispatch Meta CAPI InitiateCheckout
  if (payload.eventName === 'initiate_checkout') {
    const settings = await db.getSettings();
    if (settings.meta_capi_enabled) {
      try {
        await sendMetaCapiEvent({
          eventName: 'InitiateCheckout',
          eventId: payload.eventId,
          fbclid: payload.fbclid || session.last_fbclid,
          userAgent,
          ipAddress: ip,
          value: payload.metadata?.price,
          currency: payload.metadata?.currency || 'BRL',
          contentName: payload.metadata?.product_name || 'Checkout Hotmart',
        });
      } catch (e) {
        console.warn('InitiateCheckout CAPI warning:', e);
      }
    }
  }

  return { success: true, session, event };
}
