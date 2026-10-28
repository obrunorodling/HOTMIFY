import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { db } from './src/server/db.ts';
import { sendMetaCapiEvent } from './src/server/capi.ts';
import { processHotmartWebhook } from './src/server/hotmart.ts';
import { syncMetaAdsInsights } from './src/server/meta.ts';
import { recordTrackingEvent } from './src/server/tracking.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for Tracking Pro pixel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-HOTMART-HOTTOK, hottok');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Serve public static folder (tracking-pro.js)
app.use(express.static(path.join(__dirname, 'public')));

// 1. HOTMART WEBHOOK ENDPOINT
app.all('/api/webhook-hotmart', async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'Tracking Pro - Hotmart Webhook Receiver',
      documentation: 'Envie requisições POST com payload JSON e header X-HOTMART-HOTTOK.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await processHotmartWebhook(req.body, req.headers as any);
    if (result.status === 'INVALID_TOKEN') {
      return res.status(401).json(result);
    }
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error processing Hotmart webhook:', error);
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      message: error.message || 'Erro interno no processamento do webhook.',
    });
  }
});

// 2. TRACKING SCRIPT ENDPOINT
app.post('/api/track', async (req, res) => {
  try {
    const result = await recordTrackingEvent(req.body, req.headers as any);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Tracking Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. META ADS INSIGHTS SYNC
app.all('/api/meta-sync', async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const result = await syncMetaAdsInsights(params);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. META CAPI MANUAL / TEST DISPATCH
app.post('/api/meta-capi', async (req, res) => {
  try {
    const { eventName = 'Purchase', eventId = 'test_evt_' + Date.now(), email, phone, value, currency, contentName } = req.body;
    const result = await sendMetaCapiEvent({
      eventName,
      eventId,
      email: email || 'teste@marketingpro.com',
      phone: phone || '+5511999998888',
      value: Number(value || 497.00),
      currency: currency || 'BRL',
      contentName: contentName || 'Produto Teste CAPI',
    });
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. DASHBOARD AGGREGATED METRICS
app.get('/api/dashboard', async (req, res) => {
  try {
    const currency = (req.query.currency as any) || 'BRL';
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
});

// 6. HOTMART EVENT REPROCESS
app.post('/api/hotmart-reprocess', async (req, res) => {
  try {
    const { eventId } = req.body;
    const event = await db.getWebhookEventById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado' });
    }
    const result = await processHotmartWebhook(event.payload, {
      'x-hotmart-hottok': event.hottok,
    });
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 7. SETTINGS MANAGEMENT
app.all('/api/settings', async (req, res) => {
  try {
    if (req.method === 'GET') {
      const settings = await db.getSettings();
      return res.status(200).json({ success: true, settings });
    }
    const settings = await db.updateSettings(req.body);
    return res.status(200).json({ success: true, settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 8. CLEAR ALL DATA (Zero out state)
app.post('/api/clear-data', async (_req, res) => {
  try {
    await db.clearAllData();
    return res.status(200).json({ success: true, message: 'Todos os dados foram zerados com sucesso. Sistema pronto para produção.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 9. LOAD DEMO DATA
app.post('/api/load-demo', async (_req, res) => {
  try {
    await db.loadDemoData();
    return res.status(200).json({ success: true, message: 'Dados de demonstração carregados com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reset-demo', async (_req, res) => {
  try {
    await db.loadDemoData();
    return res.status(200).json({ success: true, message: 'Dados de demonstração restaurados com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Mount Vite in dev mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Tracking Pro] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
