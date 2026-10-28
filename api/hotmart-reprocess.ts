import { db } from '../src/server/db.ts';
import { processHotmartWebhook } from '../src/server/hotmart.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId } = req.body || {};
    if (!eventId) {
      return res.status(400).json({ success: false, error: 'eventId obrigatório' });
    }

    const event = await db.getWebhookEventById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }

    // Reprocess with existing payload
    const result = await processHotmartWebhook(event.payload, {
      'x-hotmart-hottok': event.hottok,
    });

    return res.status(200).json({
      success: true,
      message: 'Notificação reprocessada com sucesso.',
      result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
