import { db } from '../src/server/db.ts';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const settings = await db.getSettings();
    return res.status(200).json({ success: true, settings });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const updates = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const updated = await db.updateSettings(updates);
      return res.status(200).json({ success: true, settings: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
