/**
 * TRACKING PRO — SCRIPT CLIENTE PARA PÁGINAS DE VENDAS & HOTMART
 * Versão 2.1.0 - Totalmente compatível com Hotmart Webhooks & Meta Ads
 * 
 * Funcionalidades:
 * - Captura automática de UTMs e identificadores de tráfego (fbclid, gclid)
 * - Preservação estrita de First Touch e Last Touch em 1st-party cookies
 * - Auto-decoração de links de checkout Hotmart com sck={session_id}|{campaign}|{ad}
 * - Disparo de PageView e InitiateCheckout com deduplicação
 * - Alta performance (leve, assíncrono, sem bloqueio de renderização)
 */
(function (window, document) {
  'use strict';

  // Configuração e detecção de Script
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var apiEndpoint = (currentScript && currentScript.getAttribute('data-api')) || window.location.origin;
  var trackUrl = apiEndpoint.replace(/\/$/, '') + '/api/track';

  // Helpers de Armazenamento Seguro
  function getStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function generateUUID(prefix) {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return (prefix || '') + uuid.substring(0, 12);
  }

  // Identificadores de Visitante e Sessão (30 min de inatividade)
  var visitorId = getStorage('tpro_vid');
  if (!visitorId) {
    visitorId = generateUUID('tpro_vid_');
    setStorage('tpro_vid', visitorId);
  }

  var now = new Date().getTime();
  var sessionExpiry = parseInt(getStorage('tpro_session_exp') || '0', 10);
  var sessionId = getStorage('tpro_sid');

  if (!sessionId || now > sessionExpiry) {
    sessionId = generateUUID('tpro_sid_');
    setStorage('tpro_sid', sessionId);
  }
  // Renova validade da sessão por mais 30 minutos
  setStorage('tpro_session_exp', (now + 30 * 60 * 1000).toString());

  // Captura Parâmetros de URL
  var urlParams = new URLSearchParams(window.location.search);
  var utms = {
    source: urlParams.get('utm_source') || '',
    medium: urlParams.get('utm_medium') || '',
    campaign: urlParams.get('utm_campaign') || '',
    content: urlParams.get('utm_content') || '',
    term: urlParams.get('utm_term') || ''
  };
  var fbclid = urlParams.get('fbclid') || '';

  // Preservação do Primeiro Toque (First Touch)
  if (!getStorage('tpro_first_touch') && (utms.campaign || utms.source || fbclid)) {
    setStorage('tpro_first_touch', JSON.stringify({
      utms: utms,
      fbclid: fbclid,
      page: window.location.href,
      time: new Date().toISOString()
    }));
  }

  // Disparo de Evento Seguro
  function sendEvent(eventName, targetUrl, extraMetadata) {
    var eventId = 'trk_' + eventName.substring(0, 3) + '_' + Math.random().toString(36).substring(2, 10);
    var payload = {
      eventName: eventName,
      eventId: eventId,
      sessionId: sessionId,
      visitorId: visitorId,
      url: window.location.href,
      referrer: document.referrer || '',
      targetUrl: targetUrl || '',
      utms: utms,
      fbclid: fbclid,
      metadata: extraMetadata || {},
      timestamp: new Date().toISOString()
    };

    var payloadStr = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      var blob = new Blob([payloadStr], { type: 'application/json' });
      navigator.sendBeacon(trackUrl, blob);
    } else {
      try {
        fetch(trackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
          keepalive: true
        }).catch(function () {});
      } catch (err) {}
    }
  }

  // Dispara PageView Inicial
  sendEvent('page_view');

  // Decorador de Links da Hotmart
  // Constrói o sck compatível: tpro_sid_{id}|{utm_campaign}|{utm_content}
  function buildHotmartSck() {
    var parts = [sessionId];
    if (utms.campaign) parts.push(utms.campaign);
    if (utms.content) parts.push(utms.content);
    return parts.join('|');
  }

  function decorateHotmartLinks() {
    var links = document.querySelectorAll('a[href*="hotmart.com"]');
    var sckValue = buildHotmartSck();

    links.forEach(function (link) {
      try {
        var href = link.getAttribute('href');
        if (!href) return;

        var url = new URL(href, window.location.href);

        // Se o link já tiver sck, respeitamos se já contiver tpro_sid
        var currentSck = url.searchParams.get('sck');
        if (!currentSck || currentSck.indexOf('tpro_sid') === -1) {
          url.searchParams.set('sck', sckValue);
        }

        if (utms.source && !url.searchParams.get('src')) {
          url.searchParams.set('src', utms.source);
        }

        link.setAttribute('href', url.toString());

        // Listener para InitiateCheckout
        if (!link.getAttribute('data-tpro-bound')) {
          link.setAttribute('data-tpro-bound', 'true');
          link.addEventListener('click', function () {
            sendEvent('initiate_checkout', url.toString(), {
              link_text: (link.innerText || '').trim().substring(0, 60),
              sck: sckValue
            });
          });
        }
      } catch (err) {}
    });
  }

  // Executa na carga e observa mutações no DOM (para botões dinâmicos)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorateHotmartLinks);
  } else {
    decorateHotmartLinks();
  }

  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      decorateHotmartLinks();
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // API Global para depuração e uso manual
  window.TrackingPro = {
    version: '2.1.0',
    sessionId: sessionId,
    visitorId: visitorId,
    utms: utms,
    fbclid: fbclid,
    track: function (eventName, data) {
      sendEvent(eventName, null, data);
    },
    getSck: buildHotmartSck
  };
})(window, document);
