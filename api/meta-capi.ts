import crypto from 'crypto';
import { sendMetaCapiEvent } from '../src/server/capi.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const eventName = body.eventName || 'Purchase';
    const eventId = body.eventId || 'test_evt_' + crypto.randomUUID().slice(0, 8);

    const result = await sendMetaCapiEvent({
      eventName,
      eventId,
      email: body.email || 'teste@marketingpro.com',
      phone: body.phone || '+5511999998888',
      value: Number(body.value || 497.00),
      currency: body.currency || 'BRL',
      contentName: body.contentName || 'Produto Teste CAPI',
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
