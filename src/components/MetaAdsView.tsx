import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Radio,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { AppSettings, MetaCampaignInsight, MetaCapiLog } from '../types/index.ts';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters.ts';
import { PayloadModal } from './PayloadModal.tsx';

interface MetaAdsViewProps {
  settings: AppSettings;
  insights: MetaCampaignInsight[];
  capiLogs: MetaCapiLog[];
  onUpdateSettings: (s: Partial<AppSettings>) => Promise<void>;
  onSyncMeta: () => void;
  isSyncing: boolean;
}

export const MetaAdsView: React.FC<MetaAdsViewProps> = ({
  settings,
  insights,
  capiLogs,
  onUpdateSettings,
  onSyncMeta,
  isSyncing,
}) => {
  // Settings form
  const [tokenInput, setTokenInput] = useState(settings.meta_access_token);
  const [adAccountId, setAdAccountId] = useState(settings.meta_ad_account_id);
  const [pixelId, setPixelId] = useState(settings.meta_pixel_id);
  const [testEventCode, setTestEventCode] = useState(settings.meta_test_event_code);
  const [capiEnabled, setCapiEnabled] = useState(settings.meta_capi_enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test CAPI dispatcher
  const [testCapiEvent, setTestCapiEvent] = useState<'Purchase' | 'InitiateCheckout'>('Purchase');
  const [testEmail, setTestEmail] = useState('comprador.teste@marketingpro.com');
  const [testValue, setTestValue] = useState('497.00');
  const [isDispatchingCapi, setIsDispatchingCapi] = useState(false);
  const [capiFeedback, setCapiFeedback] = useState<string | null>(null);

  // Payload modal
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);
  const [modalTitle, setModalTitle] = useState('');

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        meta_access_token: tokenInput,
        meta_ad_account_id: adAccountId,
        meta_pixel_id: pixelId,
        meta_test_event_code: testEventCode,
        meta_capi_enabled: capiEnabled,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispatchTestCapi = async () => {
    setIsDispatchingCapi(true);
    setCapiFeedback(null);
    try {
      const res = await fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: testCapiEvent,
          email: testEmail,
          value: parseFloat(testValue) || 497.00,
          currency: settings.currency || 'BRL',
          contentName: 'Método Tracking Pro & Escala 10X',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCapiFeedback(`Evento ${testCapiEvent} enviado com sucesso para o Meta CAPI (Pixel: ${pixelId}).`);
      } else {
        setCapiFeedback(`Erro no envio CAPI: ${data.error || 'Falha na API'}`);
      }
    } catch (err: any) {
      setCapiFeedback(`Erro de rede: ${err.message}`);
    } finally {
      setIsDispatchingCapi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Radio className="h-4 w-4 text-blue-400" />
            Conexão Oficial com Meta Marketing API &amp; Conversions API (CAPI)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Conecte sua conta de anúncios da Meta utilizando Token de Sistema ou Token de Acesso permanente (escopos necessários: <code className="text-slate-300">ads_read</code>, <code className="text-slate-300">read_insights</code>). Nunca solicitamos sua senha pessoal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              ID da Conta de Anúncios
            </label>
            <input
              type="text"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="act_123456789"
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">Prefixo obrigatório act_</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Token de Acesso Meta Graph API
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="EAAGm0..."
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">Gerado no Gerenciador de Negócios</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              ID do Pixel da Meta (Dataset)
            </label>
            <input
              type="text"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="98402918402..."
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">Identificador numérico do Pixel</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Test Event Code (Modo Teste CAPI)
            </label>
            <input
              type="text"
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value)}
              placeholder="Ex: TEST12345"
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">Aba "Testar eventos" no Gerenciador</span>
          </div>
        </div>

        {/* CAPI Toggle & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={capiEnabled}
              onChange={(e) => setCapiEnabled(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0"
            />
            <span>Ativar envio automático de Purchase server-side (CAPI) quando a Hotmart aprovar uma venda</span>
          </label>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Salvo!
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Credenciais'}
            </button>
          </div>
        </div>
      </div>

      {/* CAPI Sandbox / Manual Tester */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Server className="h-4 w-4 text-purple-400" />
            Disparador de Validação do Meta Conversions API (CAPI Server-Side)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Valide se os eventos chegam no painel de eventos do Meta com hashing SHA-256 e deduplicação antes de colocar em produção.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Evento Server-Side</label>
            <select
              value={testCapiEvent}
              onChange={(e) => setTestCapiEvent(e.target.value as any)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            >
              <option value="Purchase">Purchase (Compra)</option>
              <option value="InitiateCheckout">InitiateCheckout (Início de Finalização)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email do Comprador (Será Hasheado SHA-256)</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Valor do Pedido (R$)</label>
            <input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Hash aplicado no servidor: <code className="text-slate-400 font-mono">user_data.em = sha256(email)</code>
          </span>
          <button
            onClick={handleDispatchTestCapi}
            disabled={isDispatchingCapi}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isDispatchingCapi ? 'Disparando...' : 'Enviar Evento Teste CAPI'}</span>
          </button>
        </div>

        {capiFeedback && (
          <div className="rounded-lg border border-purple-900 bg-purple-950/40 p-3 text-xs text-purple-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
            <span>{capiFeedback}</span>
          </div>
        )}
      </div>

      {/* Imported Insights Table from Meta */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">
              Métricas Importadas via Meta Marketing API
            </h4>
            <span className="text-xs text-slate-400">
              Gastos publicitários diários por anúncio e conjunto
            </span>
          </div>
          <button
            onClick={onSyncMeta}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Data</th>
                <th className="py-3 px-3 font-medium">Campanha</th>
                <th className="py-3 px-3 font-medium">Conjunto / Anúncio</th>
                <th className="py-3 px-3 font-medium text-right">Investimento</th>
                <th className="py-3 px-3 font-medium text-right">Impressões</th>
                <th className="py-3 px-3 font-medium text-right">Cliques</th>
                <th className="py-3 px-3 font-medium text-right">CPM</th>
                <th className="py-3 px-3 font-medium text-right">CPC</th>
                <th className="py-3 px-3 font-medium text-right">CTR</th>
                <th className="py-3 px-4 font-medium text-right">Conv. Pixel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {insights.map((ins) => (
                <tr key={ins.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400">{formatDate(ins.date)}</td>
                  <td className="py-3 px-3 text-slate-200 font-medium">{ins.campaign_name}</td>
                  <td className="py-3 px-3 text-slate-300">
                    <div>{ins.adset_name}</div>
                    <span className="text-[10px] text-slate-500 font-mono">{ins.ad_name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-slate-200 font-semibold tabular-nums">
                    {formatCurrency(ins.spend, ins.currency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-slate-400 tabular-nums">
                    {formatNumber(ins.impressions)}
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-slate-300 tabular-nums">
                    {formatNumber(ins.clicks)}
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-slate-400 tabular-nums">
                    {formatCurrency(ins.cpm, ins.currency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-slate-300 tabular-nums">
                    {formatCurrency(ins.cpc, ins.currency)}
                  </td>
                  <td className="py-3 px-3 font-mono text-right text-slate-300 tabular-nums">
                    {(ins.ctr * 100).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 font-mono text-right text-blue-400 font-semibold tabular-nums">
                    {ins.conversions_reported}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta CAPI Log Audit */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Auditoria Meta Conversions API (CAPI)</h4>
            <span className="text-xs text-slate-400">
              Eventos disparados do servidor diretamente para a Meta sem bloqueios de adblock
            </span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {capiLogs.length} disparos registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Horário</th>
                <th className="py-3 px-3 font-medium">Evento</th>
                <th className="py-3 px-3 font-medium">Event ID (Deduplicação)</th>
                <th className="py-3 px-3 font-medium">Modo</th>
                <th className="py-3 px-3 font-medium">Estado</th>
                <th className="py-3 px-4 font-medium text-right">Inspecionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {capiLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400">{formatDate(log.event_time)}</td>
                  <td className="py-3 px-3 font-mono font-medium text-purple-300">{log.event_name}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{log.event_id}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    {log.test_mode ? 'Test Mode' : 'Produção'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-emerald-400 font-medium">Enviado (200 OK)</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedPayload({ payload: log.payload, api_response: log.api_response });
                        setModalTitle(`CAPI Payload: ${log.event_name} (${log.event_id})`);
                      }}
                      className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                    >
                      Ver Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedPayload && (
        <PayloadModal
          isOpen={Boolean(selectedPayload)}
          onClose={() => setSelectedPayload(null)}
          title={modalTitle}
          data={selectedPayload}
        />
      )}
    </div>
  );
};
