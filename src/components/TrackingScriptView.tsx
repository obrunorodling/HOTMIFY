import React, { useState } from 'react';
import {
  Activity,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  Link2,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { TrackingEvent, TrackingSession } from '../types/index.ts';
import { formatDate } from '../utils/formatters.ts';

interface TrackingScriptViewProps {
  sessions: TrackingSession[];
  events: TrackingEvent[];
  onRefreshData: () => void;
}

export const TrackingScriptView: React.FC<TrackingScriptViewProps> = ({
  sessions,
  events,
  onRefreshData,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Link Builder state
  const [baseUrl, setBaseUrl] = useState('https://meusite.com/vsl');
  const [utmSource, setUtmSource] = useState('facebook');
  const [utmMedium, setUtmMedium] = useState('cpc');
  const [utmCampaign, setUtmCampaign] = useState('cmp_escala_lal');
  const [utmContent, setUtmContent] = useState('ad_video_vsl_01');
  const [utmTerm, setUtmTerm] = useState('lal_compradores_1%');
  const [customHotmartUrl, setCustomHotmartUrl] = useState('https://pay.hotmart.com/c19a842b-58d3-49fa-9871-38294821');

  // Test event simulator
  const [isFiringEvent, setIsFiringEvent] = useState(false);
  const [fireFeedback, setFireFeedback] = useState<string | null>(null);

  const scriptTagCode = `<script src="${window.location.origin}/tracking-pro.js" data-api="${window.location.origin}" async></script>`;

  // Build generated URL
  const queryParams = new URLSearchParams();
  if (utmSource) queryParams.set('utm_source', utmSource);
  if (utmMedium) queryParams.set('utm_medium', utmMedium);
  if (utmCampaign) queryParams.set('utm_campaign', utmCampaign);
  if (utmContent) queryParams.set('utm_content', utmContent);
  if (utmTerm) queryParams.set('utm_term', utmTerm);
  queryParams.set('fbclid', 'IwAR' + Math.random().toString(36).substring(2, 12));

  const generatedTrackingUrl = `${baseUrl.replace(/\/$/, '')}?${queryParams.toString()}`;

  // How the script decorates checkout link
  const sampleSessionId = sessions[0]?.id || 'tpro_sid_8291f0a1';
  const decoratedCheckoutUrl = `${customHotmartUrl}?sck=${sampleSessionId}|${utmCampaign || 'campanha'}|${utmContent || 'anuncio'}&src=${utmSource || 'meta_ads'}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptTagCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(generatedTrackingUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSimulatePageView = async () => {
    setIsFiringEvent(true);
    setFireFeedback(null);
    try {
      const simSession = 'tpro_sid_' + Math.random().toString(36).substring(2, 8);
      const simVisitor = 'tpro_vid_' + Math.random().toString(36).substring(2, 8);

      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'page_view',
          eventId: 'sim_pv_' + Date.now(),
          sessionId: simSession,
          visitorId: simVisitor,
          url: generatedTrackingUrl,
          utms: {
            source: utmSource,
            medium: utmMedium,
            campaign: utmCampaign,
            content: utmContent,
            term: utmTerm,
          },
          fbclid: queryParams.get('fbclid'),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFireFeedback(`PageView recebido e sessão ${simSession} registrada com sucesso.`);
        onRefreshData();
      }
    } catch (err: any) {
      setFireFeedback(`Erro: ${err.message}`);
    } finally {
      setIsFiringEvent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Code Snippet Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-emerald-400" />
              Script de Rastreamento (Instalar no &lt;head&gt; da Página de Vendas)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cole esta tag no cabeçalho das suas páginas de vendas, VSLs e presells. O script é assíncrono, não pesa no carregamento e decora automaticamente todos os botões de checkout Hotmart.
            </p>
          </div>
          <button
            onClick={handleCopyScript}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shrink-0"
          >
            {copiedScript ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedScript ? 'Copiado!' : 'Copiar Código'}</span>
          </button>
        </div>

        <div className="font-code rounded-lg bg-slate-950 p-4 text-xs text-slate-300 border border-slate-800/80 overflow-x-auto">
          <code>{scriptTagCode}</code>
        </div>

        {/* Feature List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>Preservação de First-Touch e Last-Touch</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Injeção de sck={'{session}|{campaign}'} no Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>Sem fingerprinting invasivo ou violação de LGPD</span>
          </div>
        </div>
      </div>

      {/* Campaign URL Builder */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-400" />
            Construtor de Links de Campanha (Meta Ads)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gere URLs com parâmetros UTM padronizados para colar no campo "URL do site" do gerenciador de anúncios do Facebook.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-slate-300 block mb-1">
              URL da Página de Vendas (Landing Page)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://cursomestre.com/vsl-oficial"
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">utm_source (Origem)</label>
            <input
              type="text"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">utm_medium (Mídia)</label>
            <input
              type="text"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">utm_campaign (Campanha)</label>
            <input
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">utm_content (Criativo / Anúncio)</label>
            <input
              type="text"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">utm_term (Público / Segmentação)</label>
            <input
              type="text"
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Link de Checkout Hotmart</label>
            <input
              type="text"
              value={customHotmartUrl}
              onChange={(e) => setCustomHotmartUrl(e.target.value)}
              placeholder="https://pay.hotmart.com/..."
              className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200"
            />
          </div>
        </div>

        {/* Generated URL Box */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              URL Completa Gerada para Anúncio
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulatePageView}
                disabled={isFiringEvent}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 text-blue-400" />
                <span>Simular Clique do Anúncio</span>
              </button>
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedUrl ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
          </div>
          <div className="font-mono text-xs text-blue-300 break-all bg-slate-900/60 p-2.5 rounded border border-slate-800">
            {generatedTrackingUrl}
          </div>

          {/* Decoration Demonstration */}
          <div className="pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400 block mb-1">
              Como o script transforma o botão de checkout da página automaticamente:
            </span>
            <div className="font-mono text-xs text-emerald-400 break-all bg-slate-900/60 p-2 rounded border border-slate-800">
              {decoratedCheckoutUrl}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Quando o lead clica e compra, a Hotmart envia de volta exatamente este <code className="text-slate-300">sck</code> no webhook!
            </span>
          </div>

          {fireFeedback && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>{fireFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Tracking Events Stream */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Fluxo em Tempo Real de Eventos Coletados (PageViews &amp; Checkouts)
            </h4>
            <span className="text-xs text-slate-400">
              Registrados via script cliente nas suas páginas
            </span>
          </div>
          <span className="font-mono text-xs text-slate-400">
            {events.length} eventos no buffer
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-medium">Data / Horário</th>
                <th className="py-3 px-3 font-medium">Tipo Evento</th>
                <th className="py-3 px-3 font-medium">Session ID (tpro_sid)</th>
                <th className="py-3 px-3 font-medium">URL Acessada</th>
                <th className="py-3 px-4 font-medium text-right">Event ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {events.slice(0, 10).map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400">{formatDate(evt.created_at)}</td>
                  <td className="py-3 px-3 font-mono font-medium">
                    {evt.event_name === 'page_view' ? (
                      <span className="text-blue-400">page_view</span>
                    ) : evt.event_name === 'initiate_checkout' ? (
                      <span className="text-amber-400">initiate_checkout</span>
                    ) : (
                      <span className="text-slate-300">{evt.event_name}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{evt.session_id}</td>
                  <td className="py-3 px-3 font-mono text-slate-400 truncate max-w-sm">
                    {evt.url}
                  </td>
                  <td className="py-3 px-4 font-mono text-right text-slate-500">
                    {evt.event_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
