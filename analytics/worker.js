// SCIS Lab visit statistics (Cloudflare Worker + D1).
//   POST /collect  – called by assets/js/track.js on every page view and when the page is left
//   GET  /stats    – aggregated numbers for stats.html (needs the ANALYTICS_KEY secret)
// Privacy: the visitor's IP is used only during the request (location, network owner,
// reverse DNS) and is never stored. "visitor" is a hash that changes every day.

const DAY_MS = 86400000;
const KST_MS = 9 * 3600000;

const ISP_WORDS = /telecom|telekom|broadband|mobile|wireless|cable|comcast|verizon|at&t|charter|spectrum|cox |t-mobile|vodafone|orange|telefonica|kornet|korea telecom|\bkt\b|sk broadband|sk telecom|lg (dacom|u\+|uplus)|lg powercomm|dreamline|hellovision|cj hello|tbroad|chinanet|china unicom|china mobile|softbank|kddi|ntt|bigpond|rogers|bell canada|shaw|virgin|british telecommunications|\bbt\b|deutsche|free sas|bouygues|sfr|swisscom|viettel|vnpt|pldt|globe telecom|true internet|jio|airtel|bharti|hinet|chunghwa|starhub|singtel|m1 limited|telstra|optus|internet service|isp\b/i;
const HOSTING_WORDS = /amazon|aws|google llc|google cloud|microsoft|azure|digitalocean|linode|akamai|ovh|hetzner|vultr|oracle|alibaba|tencent|cloudflare|fastly|scaleway|contabo|leaseweb|choopa|m247|datacamp|hosting|datacenter|data center|server|colo|naver cloud|kakao enterprise/i;
const BOT_UA = /bot|crawl|spider|slurp|bingpreview|headless|phantom|puppeteer|playwright|lighthouse|pagespeed|gtmetrix|monitor|curl|wget|python|java\/|go-http|axios|node-fetch/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/collect' && request.method === 'POST') {
        if (!allowed.includes(origin)) return new Response('origin not allowed', { status: 403, headers: cors });
        await collect(request, env);
        return new Response(null, { status: 204, headers: cors });
      }
      if (url.pathname === '/stats' && request.method === 'GET') {
        const key = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
        if (!env.ANALYTICS_KEY || !(await sameText(key, env.ANALYTICS_KEY))) {
          return json({ error: 'unauthorized' }, 401, cors);
        }
        return json(await stats(url.searchParams, env), 200, cors);
      }
      if (url.pathname === '/') return new Response('SCIS Lab analytics', { headers: cors });
      return new Response('not found', { status: 404, headers: cors });
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500, cors);
    }
  },
};

/* ---------------- collect ---------------- */

async function collect(request, env) {
  const ua = request.headers.get('User-Agent') || '';
  if (BOT_UA.test(ua)) return;
  let b;
  try { b = JSON.parse(await request.text()); } catch { return; }
  if (!b || typeof b.id !== 'string' || b.id.length > 40) return;

  if (b.t === 'leave') {
    const sec = Math.max(0, Math.min(Math.round(Number(b.dur) || 0), 6 * 3600));
    await env.DB.prepare('UPDATE views SET duration = MAX(duration, ?) WHERE id = ? AND sid = ?')
      .bind(sec, b.id, String(b.sid || '')).run();
    return;
  }
  if (b.t !== 'view') return;

  const cf = request.cf || {};
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const now = Date.now();
  const day = new Date(now + KST_MS).toISOString().slice(0, 10);
  const org = cf.asOrganization || '';
  const domain = await reverseDomain(ip);
  const net = HOSTING_WORDS.test(org) ? 'hosting' : ISP_WORDS.test(org) ? 'isp' : 'org';
  const visitor = (await sha256(`${env.ANALYTICS_SALT || ''}|${day}|${ip}|${ua}`)).slice(0, 16);
  const ref = clip(b.ref, 300);
  let refHost = '';
  try { refHost = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch {}
  if (refHost === 'knuscislab.github.io') refHost = '';
  const agent = parseUA(ua);

  await env.DB.prepare(`INSERT OR IGNORE INTO views
    (id, ts, day, sid, visitor, path, title, ref_host, ref, utm, country, region, city, org, asn, domain, net, device, browser, os, lang, screen)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(b.id, now, day, clip(b.sid, 40), visitor, normPath(b.path), clip(b.title, 200), refHost, ref,
      clip(b.utm, 100), cf.country || '', cf.region || '', cf.city || '', org, cf.asn || null, domain, net,
      agent.device, agent.browser, agent.os, clip(b.lang, 20), Math.round(Number(b.w) || 0) || null)
    .run();
}

// Reverse DNS through Cloudflare's resolver; keeps only the organization's domain
// (e.g. "155-230.knu.ac.kr" -> "knu.ac.kr"), never the full host name.
async function reverseDomain(ip) {
  let name;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) name = ip.split('.').reverse().join('.') + '.in-addr.arpa';
  else return '';
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}&type=PTR`, {
      headers: { accept: 'application/dns-json' }, cf: { cacheTtl: 86400 },
    });
    const d = await r.json();
    const host = ((d.Answer || []).find(a => a.type === 12) || {}).data;
    return host ? registrable(host.replace(/\.$/, '').toLowerCase()) : '';
  } catch { return ''; }
}

function registrable(host) {
  const p = host.split('.');
  if (p.length < 2) return '';
  const second = /^(ac|co|go|or|re|ne|pe|ed|edu|com|gov|net|org|mil|res|sch|nic)$/;
  const n = p.length >= 3 && p[p.length - 1].length === 2 && second.test(p[p.length - 2]) ? 3 : 2;
  return p.slice(-n).join('.');
}

function parseUA(ua) {
  const device = /iPad|Tablet|Tab\b/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Whale\//.test(ua) ? 'Whale' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /NAVER/.test(ua) ? 'Naver app' : /KAKAOTALK/i.test(ua) ? 'KakaoTalk' : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  return { device, browser, os };
}

function normPath(p) {
  p = clip(p, 200) || '/';
  p = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return p || '/';
}

/* ---------------- stats ---------------- */

async function stats(q, env) {
  const days = Math.max(1, Math.min(Number(q.get('days')) || 30, 730));
  const today = new Date(Date.now() + KST_MS);
  const from = new Date(today.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  const prevFrom = new Date(today.getTime() - (2 * days - 1) * DAY_MS).toISOString().slice(0, 10);

  // Optional filters: ?org=...&country=...&path=...&domain=...
  const where = ['day >= ?1 AND day <= ?2'];
  const args = [from, to];
  for (const f of ['org', 'country', 'path', 'domain', 'ref_host']) {
    const v = q.get(f);
    if (v !== null && v !== '') { args.push(v); where.push(`${f} = ?${args.length}`); }
  }
  const W = where.join(' AND ');
  const run = (sql, a = args) => env.DB.prepare(sql).bind(...a).all().then(r => r.results);
  const prevArgs = [prevFrom, from, ...args.slice(2)];
  const prevW = W.replace('day >= ?1 AND day <= ?2', 'day >= ?1 AND day < ?2');

  const totalsSql = (w) => `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor || day) AS visitors, COUNT(DISTINCT sid) AS sessions,
      ROUND(AVG(CASE WHEN duration > 0 THEN duration END)) AS avg_time FROM views WHERE ${w}`;
  const top = (col, n = 15, extra = '') => run(`SELECT ${col} AS key, COUNT(*) AS views, COUNT(DISTINCT visitor || day) AS visitors,
      ROUND(AVG(CASE WHEN duration > 0 THEN duration END)) AS avg_time ${extra}
      FROM views WHERE ${W} AND ${col} IS NOT NULL AND ${col} != '' GROUP BY ${col} ORDER BY views DESC LIMIT ${n}`);

  const [totals, prev, bounce, daily, pages, countries, cities, orgs, domains, referrers, devices, browsers, oses, langs, hours, sessions] = await Promise.all([
    run(totalsSql(W)).then(r => r[0]),
    run(totalsSql(prevW), prevArgs).then(r => r[0]),
    run(`SELECT ROUND(100.0 * SUM(CASE WHEN n = 1 THEN 1 ELSE 0 END) / COUNT(*)) AS bounce FROM
      (SELECT sid, COUNT(*) AS n FROM views WHERE ${W} GROUP BY sid)`).then(r => r[0] && r[0].bounce),
    run(`SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM views WHERE ${W} GROUP BY day ORDER BY day`),
    top('path', 20, ', MAX(title) AS title'),
    top('country', 20),
    run(`SELECT city || '|' || country AS key, COUNT(*) AS views, COUNT(DISTINCT visitor || day) AS visitors FROM views
      WHERE ${W} AND city != '' GROUP BY city, country ORDER BY views DESC LIMIT 20`),
    run(`SELECT org AS key, MAX(country) AS country, MAX(domain) AS domain, MAX(net) AS net, COUNT(*) AS views,
      COUNT(DISTINCT visitor || day) AS visitors, ROUND(AVG(CASE WHEN duration > 0 THEN duration END)) AS avg_time,
      MAX(ts) AS last_seen FROM views WHERE ${W} AND org != '' GROUP BY org ORDER BY views DESC LIMIT 60`),
    top('domain', 30, ', MAX(org) AS org, MAX(net) AS net'),
    top('ref_host', 20),
    top('device', 5),
    top('browser', 10),
    top('os', 10),
    top('lang', 10),
    run(`SELECT CAST(strftime('%H', (ts + ${KST_MS}) / 1000, 'unixepoch') AS INTEGER) AS hour, COUNT(*) AS views
      FROM views WHERE ${W} GROUP BY hour ORDER BY hour`),
    run(`SELECT sid, MIN(ts) AS start, MAX(ts) AS last, COUNT(*) AS pages, SUM(duration) AS time,
      MAX(org) AS org, MAX(domain) AS domain, MAX(net) AS net, MAX(city) AS city, MAX(country) AS country,
      MAX(device) AS device, MAX(browser) AS browser, MAX(ref_host) AS ref_host,
      GROUP_CONCAT(path, ' → ') AS path_list FROM (SELECT * FROM views WHERE ${W} ORDER BY ts)
      GROUP BY sid ORDER BY start DESC LIMIT 100`),
  ]);

  return {
    range: { from, to, days }, generated: Date.now(),
    totals: { ...totals, bounce }, previous: prev,
    daily, pages, countries, cities, orgs, domains, referrers, devices, browsers, oses, langs, hours, sessions,
  };
}

/* ---------------- helpers ---------------- */

function clip(v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; }

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sameText(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
