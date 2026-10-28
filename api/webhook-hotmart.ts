import { processHotmartWebhook } from '../src/server/hotmart.ts';

export default async function handler(req: any, res: any) {
  // Support both GET for health check / endpoint test and POST for webhooks
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'Tracking Pro - Hotmart Webhook Receiver',
      documentation: 'Envie requisições POST com payload JSON e header X-HOTMART-HOTTOK.',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const result = await processHotmartWebhook(payload, req.headers);

    if (result.status === 'INVALID_TOKEN') {
      return res.status(401).json(result);
    }

    // Hotmart requires HTTP 200 to acknowledge receipt and avoid automatic webhook retries
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Hotmart Webhook Processing Error:', error);
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      message: error.message || 'Erro interno ao processar webhook.',
    });
  }
}
