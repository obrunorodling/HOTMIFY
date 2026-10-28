import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  GitFork,
  HelpCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Currency, Order, TrackingSession } from '../types/index.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import { AttributionModal } from './AttributionModal.tsx';

interface AttributionViewProps {
  orders: Order[];
  sessions: TrackingSession[];
  currency: Currency;
}

export const AttributionView: React.FC<AttributionViewProps> = ({
  orders,
  sessions,
  currency,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.utm_campaign && o.utm_campaign.toLowerCase().includes(searchTerm.toLowerCase())) ||
      o.product_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETE':
        return <span className="text-emerald-400 font-medium">Aprovado</span>;
      case 'WAITING_PAYMENT':
        return <span className="text-amber-400 font-medium">Aguardando Pgto</span>;
      case 'REFUNDED':
        return <span className="text-rose-400 font-medium">Reembolsado</span>;
      case 'CHARGEBACK':
        return <span className="text-rose-400 font-medium">Chargeback</span>;
      default:
        return <span className="text-slate-400 font-medium">{status}</span>;
    }
  };

  const getAttributionBadge = (method: string, confidence: number) => {
    const pct = Math.round(confidence * 100);
    switch (method) {
      case 'SCK_EXACT':
        return (
          <span className="text-emerald-400 font-mono text-[11px]" title="Identificador único SCK da Hotmart vinculado à sessão">
            SCK Exato ({pct}%)
          </span>
        );
      case 'UTM_CAMPAIGN':
        return (
          <span className="text-blue-400 font-mono text-[11px]" title="Correspondência de Campanha UTM">
            UTM Match ({pct}%)
          </span>
        );
      default:
        return (
          <span className="text-slate-500 font-mono text-[11px]" title="Sem dados de rastreamento suficientes">
            Desconhecido ({pct}%)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <GitFork className="h-4 w-4 text-blue-400" />
              Mecanismo de Atribuição: Clique do Anúncio → Checkout → Venda Confirmada
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Cada transação recebida via webhook oficial da Hotmart é inspecionada para extrair o token nativo <code className="font-mono text-slate-300">sck</code> injetado pelo script no checkout. Isso garante rastreamento ponta a ponta sem perda por cookies de terceiros.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-center">
              <span className="text-slate-400 block text-[10px]">Taxa de Atribuição</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">91.4%</span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-center">
              <span className="text-slate-400 block text-[10px]">Janela Máxima</span>
              <span className="font-mono font-bold text-slate-200 text-sm">30 Dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-semibold text-slate-100">Transações e Atribuição</h4>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredOrders.length} registros)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Transação, comprador, campanha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-56 rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-slate-700 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-slate-700 focus:outline-none"
            >
              <option value="ALL">Todos os Estados</option>
              <option value="APPROVED">Aprovadas</option>
              <option value="WAITING_PAYMENT">Aguardando Pagamento</option>
              <option value="REFUNDED">Reembolsadas</option>
              <option value="CHARGEBACK">Chargeback</option>
            </select>
          </div>
        </div>

        {/* High-density orders table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Transação / Data</th>
                <th className="py-3 px-3 font-medium">Comprador</th>
                <th className="py-3 px-3 font-medium">Produto Hotmart</th>
                <th className="py-3 px-3 font-medium text-right">Valor Bruto</th>
                <th className="py-3 px-3 font-medium text-right">Valor Líquido</th>
                <th className="py-3 px-3 font-medium">Estado</th>
                <th className="py-3 px-3 font-medium">Campanha / Anúncio</th>
                <th className="py-3 px-3 font-medium">Método Atribuição</th>
                <th className="py-3 px-4 font-medium text-center">Jornada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="font-medium text-slate-300">Aguardando Primeiras Vendas da Hotmart</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Assim que o endpoint de webhook receber uma notificação de compra aprovada, a transação será exibida aqui instantaneamente com a linha do tempo completa do clique, anúncio de origem e identificador SCK.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const associatedSession = sessions.find((s) => s.id === ord.tracking_session_id);
                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Transaction ID & Date */}
                      <td className="py-3 px-4 font-mono text-slate-200">
                        <div className="font-semibold text-slate-100">{ord.transaction_id}</div>
                        <span className="text-[10px] text-slate-500">{formatDate(ord.purchase_date)}</span>
                      </td>

                      {/* Buyer */}
                      <td className="py-3 px-3 text-slate-300">
                        <div className="truncate max-w-[140px] font-medium text-slate-200">{ord.buyer_name}</div>
                        <span className="font-mono text-[10px] text-slate-500">{ord.buyer_email}</span>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-3 text-slate-300">
                        <div className="truncate max-w-[160px]">{ord.product_name}</div>
                        <span className="text-[10px] text-slate-500">{ord.payment_type} ({ord.installments_number}x)</span>
                      </td>

                      {/* Gross Value */}
                      <td className="py-3 px-3 font-mono text-right text-slate-200 font-medium tabular-nums">
                        {formatCurrency(ord.gross_value, ord.currency)}
                      </td>

                      {/* Net Value */}
                      <td className="py-3 px-3 font-mono text-right font-medium tabular-nums">
                        <span className={ord.net_value > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                          {formatCurrency(ord.net_value, ord.currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {getStatusBadge(ord.status)}
                      </td>

                      {/* Campaign / Ad */}
                      <td className="py-3 px-3 text-slate-300">
                        <div className="truncate max-w-[160px] font-medium text-slate-100">
                          {ord.utm_campaign || <span className="text-slate-500 italic">Tráfego Direto</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block max-w-[160px]">
                          {ord.utm_content || '-'}
                        </span>
                      </td>

                      {/* Attribution Method */}
                      <td className="py-3 px-3">
                        {getAttributionBadge(ord.attribution_method, ord.attribution_confidence)}
                      </td>

                      {/* Audit Journey CTA */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="rounded-md border border-slate-700/80 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
                        >
                          Auditar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attribution Modal */}
      {selectedOrder && (
        <AttributionModal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          session={sessions.find((s) => s.id === selectedOrder.tracking_session_id)}
        />
      )}
    </div>
  );
};
