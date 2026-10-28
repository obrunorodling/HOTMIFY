import { syncMetaAdsInsights } from '../src/server/meta.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const params = req.body || req.query || {};
    const result = await syncMetaAdsInsights(params);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
