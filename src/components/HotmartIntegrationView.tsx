import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Webhook,
  XCircle,
} from 'lucide-react';
import { AppSettings, HotmartWebhookEvent } from '../types/index.ts';
import { formatDate } from '../utils/formatters.ts';
import { PayloadModal } from './PayloadModal.tsx';

interface HotmartIntegrationViewProps {
  settings: AppSettings;
  webhookEvents: HotmartWebhookEvent[];
  onUpdateSettings: (s: Partial<AppSettings>) => Promise<void>;
  onRefreshData: () => void;
}

export const HotmartIntegrationView: React.FC<HotmartIntegrationViewProps> = ({
  settings,
  webhookEvents,
  onUpdateSettings,
  onRefreshData,
}) => {
  // Webhook settings state
  const [hottokInput, setHottokInput] = useState(settings.hotmart_hottok);
  const [verifyToken, setVerifyToken] = useState(settings.hotmart_verify_token);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Webhook Simulator state
  const [simEvent, setSimEvent] = useState('PURCHASE_APPROVED');
  const [simTransaction, setSimTransaction] = useState('HP' + Math.floor(1000000000 + Math.random() * 9000000000));
  const [simProductName, setSimProductName] = useState('Método Tracking Pro & Escala 10X');
  const [simBuyerName, setSimBuyerName] = useState('Carlos Eduardo Rocha');
  const [simBuyerEmail, setSimBuyerEmail] = useState('carlos.rocha@empresa.com.br');
  const [simValue, setSimValue] = useState('497.00');
  const [simPaymentType, setSimPaymentType] = useState('PIX');
  const [simSck, setSimSck] = useState('tpro_sid_8291f0a1|cmp_escala_lal|ad_video_vsl_01');
  const [simUseInvalidToken, setSimUseInvalidToken] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatorFeedback, setSimulatorFeedback] = useState<{
    type: 'success' | 'duplicate' | 'error' | 'invalid_token';
    message: string;
  } | null>(null);

  // Reprocess state
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  // Payload modal state
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);
  const [payloadModalTitle, setPayloadModalTitle] = useState('');

  // Webhook endpoint URL
  const webhookUrl = `${window.location.origin}/api/webhook-hotmart`;

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await onUpdateSettings({
        hotmart_hottok: hottokInput,
        hotmart_verify_token: verifyToken,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRunSimulator = async () => {
    setIsSimulating(true);
    setSimulatorFeedback(null);

    const tokenToSend = simUseInvalidToken ? 'TOKEN_INVALIDO_TESTE' : hottokInput;
    const grossVal = parseFloat(simValue) || 497.00;
    const hotmartFee = parseFloat((grossVal * 0.099 + 1.0).toFixed(2));
    const netVal = parseFloat((grossVal - hotmartFee).toFixed(2));

    const payload = {
      id: 'hotevt_' + Math.random().toString(36).substring(2, 10),
      creation_date: Date.now(),
      event: simEvent,
      version: '2.0.0',
      hottok: tokenToSend,
      data: {
        product: {
          id: 192831,
          ucode: 'c19a842b-58d3-49fa-9871-38294821',
          name: simProductName,
        },
        buyer: {
          email: simBuyerEmail,
          name: simBuyerName,
          checkout_phone: '+55 11 98888-7777',
          address: { country: 'Brasil', country_iso: 'BR' },
        },
        purchase: {
          transaction: simTransaction,
          order_date: Date.now(),
          approved_date: simEvent === 'PURCHASE_APPROVED' ? Date.now() : undefined,
          status: simEvent === 'PURCHASE_APPROVED' ? 'APPROVED' : simEvent === 'PURCHASE_REFUNDED' ? 'REFUNDED' : simEvent === 'PURCHASE_CHARGEBACK' ? 'CHARGEBACK' : 'WAITING_PAYMENT',
          price: { value: grossVal, currency_value: 'BRL' },
          payment: { type: simPaymentType, installments_number: 1 },
          tracking: { source_sck: simSck, source: 'meta_ads' },
          sck: simSck,
        },
        commissions: [
          { source: 'PRODUCER', value: netVal, currency_value: 'BRL' },
          { source: 'MARKETPLACE', value: hotmartFee, currency_value: 'BRL' },
        ],
      },
    };

    try {
      const res = await fetch('/api/webhook-hotmart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HOTMART-HOTTOK': tokenToSend,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 401 || data.status === 'INVALID_TOKEN') {
        setSimulatorFeedback({
          type: 'invalid_token',
          message: 'Segurança confirmada: A requisição foi rejeitada (HTTP 401) por token de verificação inválido.',
        });
      } else if (data.status === 'DUPLICATE') {
        setSimulatorFeedback({
          type: 'duplicate',
          message: `Idempotência comprovada: Notificação duplicada detectada para transação ${simTransaction}. Nenhuma receita duplicada.`,
        });
      } else if (data.success) {
        setSimulatorFeedback({
          type: 'success',
          message: `Notificação processada com sucesso: Venda registrada e faturamento atualizado no banco.`,
        });
      } else {
        setSimulatorFeedback({
          type: 'error',
          message: data.message || 'Erro ao processar webhook.',
        });
      }

      onRefreshData();
    } catch (err: any) {
      setSimulatorFeedback({
        type: 'error',
        message: err.message || 'Falha na conexão com o endpoint.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReprocess = async (eventId: string) => {
    setReprocessingId(eventId);
    try {
      const res = await fetch('/api/hotmart-reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Webhook className="h-4 w-4 text-emerald-400" />
            Configuração do Webhook Oficial Hotmart (Webhooks 2.0)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre esta URL na aba <strong>Ferramentas &gt; Webhook (API e Notificações)</strong> da sua conta Hotmart para receber eventos em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Endpoint URL */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              URL do Endpoint Receptor (POST)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 select-all"
              />
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                title="Copiar URL"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors shrink-0"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Compatível com Vercel Serverless Functions e HTTPS.
            </span>
          </div>

          {/* Hottok Secret */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Token de Verificação Hotmart (Hottok)
            </label>
            <input
              type="text"
              value={hottokInput}
              onChange={(e) => setHottokInput(e.target.value)}
              placeholder="Ex: hottok_sec_..."
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-slate-700 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Encontrado na Hotmart no menu Webhooks sob "Token de Autenticação".
            </span>
          </div>
        </div>

        {/* Security Toggle & Save Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={verifyToken}
              onChange={(e) => setVerifyToken(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0"
            />
            <span>Exigir validação obrigatória do Hottok (Rejeita com HTTP 401 se ausente ou divergente)</span>
          </label>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Salvo com sucesso!
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Sandbox / Simulator */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Play className="h-4 w-4 text-amber-400" />
            Simulador Interativo de Notificações Hotmart
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Teste compras aprovadas, reembolsos, recusas por token falso e regras de idempotência diretamente no backend em tempo real.
          </p>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Evento</label>
            <select
              value={simEvent}
              onChange={(e) => setSimEvent(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value="PURCHASE_APPROVED">PURCHASE_APPROVED (Compra Aprovada)</option>
              <option value="PURCHASE_REFUNDED">PURCHASE_REFUNDED (Reembolso)</option>
              <option value="PURCHASE_CHARGEBACK">PURCHASE_CHARGEBACK (Chargeback)</option>
              <option value="PURCHASE_BILLET_PRINTED">PURCHASE_BILLET_PRINTED (Boleto Emitido)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Código de Transação</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={simTransaction}
                onChange={(e) => setSimTransaction(e.target.value)}
                className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
              />
              <button
                onClick={() => setSimTransaction('HP' + Math.floor(1000000000 + Math.random() * 9000000000))}
                title="Gerar nova transação"
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Valor Bruto (R$)</label>
            <input
              type="text"
              value={simValue}
              onChange={(e) => setSimValue(e.target.value)}
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Nome do Comprador</label>
            <input
              type="text"
              value={simBuyerName}
              onChange={(e) => setSimBuyerName(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email do Comprador</label>
            <input
              type="email"
              value={simBuyerEmail}
              onChange={(e) => setSimBuyerEmail(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Parâmetro SCK de Atribuição</label>
            <input
              type="text"
              value={simSck}
              onChange={(e) => setSimSck(e.target.value)}
              className="w-full font-mono text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>
        </div>

        {/* Security Test Option & Send Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
          <label className="flex items-center gap-2.5 text-xs text-rose-400 cursor-pointer">
            <input
              type="checkbox"
              checked={simUseInvalidToken}
              onChange={(e) => setSimUseInvalidToken(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-0"
            />
            <span>Simular Token Inválido (Testar bloqueio de autenticidade)</span>
          </label>

          <button
            onClick={handleRunSimulator}
            disabled={isSimulating}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSimulating ? 'Disparando...' : 'Enviar Webhook de Teste'}</span>
          </button>
        </div>

        {/* Simulator Feedback Alert */}
        {simulatorFeedback && (
          <div
            className={`rounded-lg border p-3.5 text-xs flex items-start gap-3 ${
              simulatorFeedback.type === 'success'
                ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300'
                : simulatorFeedback.type === 'duplicate'
                ? 'border-blue-900 bg-blue-950/40 text-blue-300'
                : simulatorFeedback.type === 'invalid_token'
                ? 'border-amber-900 bg-amber-950/40 text-amber-300'
                : 'border-rose-900 bg-rose-950/40 text-rose-300'
            }`}
          >
            {simulatorFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : simulatorFeedback.type === 'duplicate' ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            )}
            <div>
              <div className="font-semibold">{simulatorFeedback.message}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Verifique o log detalhado na tabela de auditoria abaixo.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Webhook Events Audit Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Tabela de Auditoria de Notificações Recebidas</h4>
            <span className="text-xs text-slate-400">
              Histórico imutável de todas as chamadas recebidas para conciliação fiscal e reprocessamento
            </span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {webhookEvents.length} eventos registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Data Recebimento</th>
                <th className="py-3 px-3 font-medium">Evento Hotmart</th>
                <th className="py-3 px-3 font-medium">Transação</th>
                <th className="py-3 px-3 font-medium">Hottok Recebido</th>
                <th className="py-3 px-3 font-medium">Estado</th>
                <th className="py-3 px-3 font-medium">Mensagem de Auditoria</th>
                <th className="py-3 px-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {webhookEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhuma notificação registrada ainda.
                  </td>
                </tr>
              ) : (
                webhookEvents.map((evt) => {
                  return (
                    <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {formatDate(evt.received_at)}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-200">
                        {evt.event_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {evt.transaction_id}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {evt.hottok ? evt.hottok.substring(0, 12) + '...' : '-'}
                      </td>
                      <td className="py-3 px-3">
                        {evt.status === 'PROCESSED' && (
                          <span className="text-emerald-400 font-medium">Processado</span>
                        )}
                        {evt.status === 'DUPLICATE' && (
                          <span className="text-blue-400 font-medium">Duplicado (Idempotente)</span>
                        )}
                        {evt.status === 'INVALID_TOKEN' && (
                          <span className="text-amber-400 font-medium">Token Inválido</span>
                        )}
                        {evt.status === 'ERROR' && (
                          <span className="text-rose-400 font-medium">Erro</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-xs">
                        {evt.error_message || 'Transação conciliada com sucesso.'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPayload(evt.payload);
                              setPayloadModalTitle(`Payload: ${evt.event_name} (${evt.transaction_id})`);
                            }}
                            className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                          >
                            Ver JSON
                          </button>
                          <button
                            onClick={() => handleReprocess(evt.id)}
                            disabled={reprocessingId === evt.id}
                            title="Reprocessar evento com idempotência segura"
                            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-slate-100 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3 w-3 ${reprocessingId === evt.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      {selectedPayload && (
        <PayloadModal
          isOpen={Boolean(selectedPayload)}
          onClose={() => setSelectedPayload(null)}
          title={payloadModalTitle}
          data={selectedPayload}
        />
      )}
    </div>
  );
};
