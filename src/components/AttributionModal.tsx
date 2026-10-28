import React from 'react';
import { ArrowRight, CheckCircle2, Clock, ExternalLink, Globe, ShieldCheck, X } from 'lucide-react';
import { Order, TrackingSession } from '../types/index.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';

interface AttributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  session?: TrackingSession | null;
}

export const AttributionModal: React.FC<AttributionModalProps> = ({
  isOpen,
  onClose,
  order,
  session,
}) => {
  if (!isOpen || !order) return null;

  const isExactSck = order.attribution_method === 'SCK_EXACT';
  const confidencePercent = Math.round(order.attribution_confidence * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">
                Auditoria de Atribuição: Venda #{order.transaction_id}
              </h3>
              <span className="font-mono text-xs text-slate-400">({order.product_name})</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span>Método: {order.attribution_method}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">Confiança {confidencePercent}%</span>
              <span aria-hidden="true">·</span>
              <span>Comprador: {order.buyer_name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Journey Timeline */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Key Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
              <span className="text-xs text-slate-400">Valor Bruto Confirmado</span>
              <div className="mt-1 font-mono text-base font-semibold text-slate-100 tabular-nums">
                {formatCurrency(order.gross_value, order.currency)}
              </div>
              <span className="text-xs text-slate-400">Líquido: {formatCurrency(order.net_value, order.currency)}</span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
              <span className="text-xs text-slate-400">Origem da Campanha</span>
              <div className="mt-1 truncate text-sm font-semibold text-slate-100">
                {order.utm_campaign || 'Orgânico / Direto'}
              </div>
              <span className="text-xs text-slate-400">Anúncio: {order.utm_content || '-'}</span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
              <span className="text-xs text-slate-400">Identificador SCK Hotmart</span>
              <div className="mt-1 font-mono text-xs text-slate-200 truncate">
                {order.sck || 'Nenhum sck registrado'}
              </div>
              <span className="text-xs text-slate-400">Fonte: {order.src || 'meta_ads'}</span>
            </div>
          </div>

          {/* Stepped Attribution Flow */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Linha do Tempo de Rastreamento (Click to Cash)
            </h4>

            {/* Step 1: First Touch */}
            <div className="relative pl-6 pb-4 border-l border-slate-800">
              <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-blue-500" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-400">1º Toque (Descoberta Inicial)</span>
                <span className="font-mono text-xs text-slate-400">{formatDate(order.first_seen_at || order.purchase_date)}</span>
              </div>
              <div className="mt-2 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Canal / Fonte:</span>
                  <span className="font-medium text-slate-200">{session?.first_utm_source || order.utm_source || 'Desconhecido'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Campanha Inicial:</span>
                  <span className="font-medium text-slate-200">{session?.first_utm_campaign || order.utm_campaign || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Landing Page de Entrada:</span>
                  <span className="font-mono text-slate-300 truncate max-w-xs">{order.landing_page || 'https://cursomestre.com/vsl-oficial'}</span>
                </div>
                {order.fbclid && (
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Meta Click ID (fbclid):</span>
                    <span className="font-mono text-slate-400 truncate max-w-xs">{order.fbclid}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Last Touch / Checkout Initiated */}
            <div className="relative pl-6 pb-4 border-l border-slate-800">
              <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-amber-500" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400">Último Toque &amp; Início de Checkout</span>
                <span className="font-mono text-xs text-slate-400">{formatDate(order.purchase_date)}</span>
              </div>
              <div className="mt-2 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Campanha de Conversão:</span>
                  <span className="font-medium text-slate-200">{order.utm_campaign || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Anúncio / Criativo:</span>
                  <span className="font-medium text-slate-200">{order.utm_content || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SCK Injetado no Checkout:</span>
                  <span className="font-mono text-slate-300 truncate max-w-xs">{order.sck || '-'}</span>
                </div>
              </div>
            </div>

            {/* Step 3: Hotmart Webhook Approved & Confirmed */}
            <div className="relative pl-6">
              <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">Venda Aprovada (Hotmart Webhook 2.0)</span>
                <span className="font-mono text-xs text-slate-400">{formatDate(order.approved_date || order.purchase_date)}</span>
              </div>
              <div className="mt-2 rounded-lg border border-emerald-950/50 bg-emerald-950/20 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transação Hotmart:</span>
                  <span className="font-mono font-medium text-emerald-300">{order.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Meio de Pagamento:</span>
                  <span className="font-medium text-slate-200">{order.payment_type} ({order.installments_number}x)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Receita Líquida Produtor:</span>
                  <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                    {formatCurrency(order.net_value, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxa Hotmart:</span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {formatCurrency(order.hotmart_fee, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Verification Note */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-200 font-medium mb-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Garantia Anti-Duplicação e Idempotência</span>
            </div>
            Esta transação foi confirmada via webhook oficial com chave <code className="font-mono text-slate-300">{order.transaction_id}</code>. Caso o webhook seja reenviado pela Hotmart, o sistema preserva o saldo financeiro intacto.
          </div>
        </div>
      </div>
    </div>
  );
};
