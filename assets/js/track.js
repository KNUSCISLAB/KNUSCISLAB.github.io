/* Anonymous visit statistics for the lab (see analytics/worker.js and stats.html).
   No cookies; the session id lives only in this tab (sessionStorage).
   To stop counting your own visits on a device, open any page with ?notrack (undo with ?track). */
(function () {
  var ENDPOINT = 'https://scislab-analytics.WORKERS_SUBDOMAIN.workers.dev';
  if (ENDPOINT.indexOf('WORKERS_SUBDOMAIN') !== -1) return;
  if (!/^(knuscislab\.github\.io|localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  if (/^\/(admin|stats)/.test(location.pathname)) return;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  var q = new URLSearchParams(location.search);
  if (q.has('notrack')) store('notrack', '1');
  if (q.has('track')) store('notrack', null);
  if (store('notrack') === '1') return;

  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  var sid;
  try { sid = sessionStorage.getItem('sid'); if (!sid) { sid = rid(); sessionStorage.setItem('sid', sid); } } catch (e) { sid = rid(); }
  var id = rid();

  function send(data) {
    var body = JSON.stringify(data);
    // text/plain keeps this a "simple" request (no CORS preflight)
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT + '/collect', new Blob([body], { type: 'text/plain' }))) return;
    try { fetch(ENDPOINT + '/collect', { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }

  var utm = q.get('utm_source') || '';
  send({
    t: 'view', id: id, sid: sid, path: location.pathname, title: document.title,
    ref: document.referrer, utm: utm, lang: navigator.language, w: screen.width
  });

  // Count only the time the page is actually visible.
  var shown = document.visibilityState === 'visible' ? Date.now() : 0, total = 0;
  function leave() {
    if (shown) { total += Date.now() - shown; shown = 0; }
    if (total > 0) send({ t: 'leave', id: id, sid: sid, dur: total / 1000 });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') leave();
    else if (!shown) shown = Date.now();
  });
  window.addEventListener('pagehide', leave);
})();
