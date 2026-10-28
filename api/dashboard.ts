import { db } from '../src/server/db.ts';

export default async function handler(req: any, res: any) {
  try {
    const currency = req.query.currency || 'BRL';
    const financials = await db.getDashboardFinancials({ currency });
    const orders = await db.getOrders();
    const webhookEvents = await db.getWebhookEvents();
    const capiLogs = await db.getCapiLogs();
    const trackingSessions = await db.getTrackingSessions();
    const trackingEvents = await db.getTrackingEvents();
    const settings = await db.getSettings();

    return res.status(200).json({
      success: true,
      financials,
      orders,
      webhookEvents,
      capiLogs,
      trackingSessions,
      trackingEvents,
      settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
