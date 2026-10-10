/* SCIS Lab site. Reads content from data/*.json and renders each page in English or Korean. */
(function () {
  'use strict';
  var I = window.I18N, ILT = window.IL_TEXT, IL = window.ILLUSTRATIONS;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var params = new URLSearchParams(location.search);
  var LANG = (function () {
    var p = params.get('lang');
    if (p === 'en' || p === 'ko') { store.set('lang', p); return p; }
    var s = store.get('lang');
    if (s === 'en' || s === 'ko') return s;
    return 'en';
  })();
  document.documentElement.lang = LANG;
  var PAGE = document.body.getAttribute('data-page');

  /* ---------- helpers ---------- */
  function t(k, vars) {
    var s = (I[LANG] && I[LANG][k] != null) ? I[LANG][k] : (I.en[k] != null ? I.en[k] : k);
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function loc(o, k) {
    if (!o) return '';
    var other = LANG === 'ko' ? 'en' : 'ko';
    var a = o[k + '_' + LANG], b = o[k + '_' + other];
    return (a && String(a).trim()) ? a : (b || '');
  }
  function paras(text) {
    return String(text || '').split(/\n\s*\n/).filter(function (x) { return x.trim(); })
      .map(function (x) { return '<p>' + esc(x.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  // Long-form text: blank lines split blocks; a short line without a period becomes a subheading,
  // lines starting with "* " or "- " become a list, and "Label: text" items get a bold label.
  function richText(text) {
    return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean).map(function (b) {
      var lines = b.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.every(function (l) { return /^[*\-•]\s+/.test(l); })) {
        return '<ul class="rich-list">' + lines.map(function (l) {
          var x = l.replace(/^[*\-•]\s+/, ''), i = x.indexOf(': ');
          return '<li>' + (i > 0 && i < 120 ? '<b>' + esc(x.slice(0, i)) + '</b>: ' + esc(x.slice(i + 2)) : esc(x)) + '</li>';
        }).join('') + '</ul>';
      }
      if (lines.length === 1 && lines[0].length < 40 && !/[.。:]$/.test(lines[0])) return '<h4 class="rich-h">' + esc(lines[0]) + '</h4>';
      return '<p>' + lines.map(esc).join('<br>') + '</p>';
    }).join('');
  }
  function href(page, extra) {
    var q = new URLSearchParams(extra || {});
    if (LANG === 'ko') q.set('lang', 'ko');
    var s = q.toString();
    return page + (s ? '?' + s : '');
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(s, withDay) {
    var m = String(s || '').match(/^(\d{4})(?:[-.](\d{1,2}))?(?:[-.](\d{1,2}))?/);
    if (!m) return esc(s);
    var y = m[1], mo = m[2] ? +m[2] : 0, d = (withDay && m[3]) ? +m[3] : 0;
    if (LANG === 'ko') return y + '년' + (mo ? ' ' + mo + '월' : '') + (d ? ' ' + d + '일' : '');
    return (d ? d + ' ' : '') + (mo ? MONTHS[mo - 1] + ' ' : '') + y;
  }
  function dateKey(s) {
    var m = String(s || '').match(/^(\d{4})(?:[-.](\d{1,2}))?(?:[-.](\d{1,2}))?/);
    if (!m) return '0000-00-00';
    return m[1] + '-' + String(m[2] || '00').padStart(2, '0') + '-' + String(m[3] || '00').padStart(2, '0');
  }
  function initials(name) {
    return String(name || '').replace(/,.*$/, '').split(/[\s.-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join('');
  }
  function $(sel) { return document.querySelector(sel); }
  function fill(sel, html) { var el = $(sel); if (el) el.innerHTML = html; return el; }
  function toast(msg) {
    var el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove(); return Promise.resolve();
  }

  /* ---------- data ---------- */
  var loadFailed = false;
  function load(name) {
    return fetch('data/' + name + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { loadFailed = true; return null; });
  }
  function loadAll(names) {
    return Promise.all(names.map(load)).then(function (vals) {
      var out = {}; names.forEach(function (n, i) { out[n] = vals[i]; }); return out;
    });
  }

  /* ---------- theme ---------- */
  var THEMES = ['auto', 'light', 'dark'];
  function currentTheme() { var s = store.get('theme'); return THEMES.indexOf(s) > -1 ? s : 'auto'; }
  function applyTheme(th) {
    if (th === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', th);
    store.set('theme', th);
    var b = $('.theme-btn');
    if (b) { b.setAttribute('aria-label', t('theme_' + th)); b.title = t('theme_' + th); b.innerHTML = themeIcon(th); }
  }
  function themeIcon(th) {
    if (th === 'light') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    if (th === 'dark') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor"/></svg>';
  }

  /* ---------- shared chrome ---------- */
  function renderHeader(site) {
    if (site && site.logo) store.set('logo', site.logo);
    var logo = site && site.logo
      ? '<img class="logo" src="' + esc(site.logo) + '" alt="">'
      : '<span class="mark" aria-hidden="true"><svg viewBox="0 0 26 26"><path d="M3 19C7 19 8 7 13 7S19 19 23 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>';
    var name = (site && site.short_name) || 'SCIS Lab';
    var uni = (site && loc(site, 'university')) || 'Kyungpook National University';
    var links = [['research', 'research.html', 'nav_research'], ['professor', 'professor.html', 'nav_prof'], ['people', 'people.html', 'nav_people'], ['projects', 'projects.html', 'nav_projects'], ['publications', 'publications.html', 'nav_pubs'], ['patents', 'patents.html', 'nav_patents'], ['news', 'news.html', 'nav_news'], ['photos', 'photos.html', 'nav_photos']];
    var nav = links.map(function (l) {
      return '<a href="' + href(l[1]) + '"' + (PAGE === l[0] ? ' aria-current="page"' : '') + '>' + esc(t(l[2])) + '</a>';
    }).join('');
    var q = new URLSearchParams(location.search); q.set('lang', LANG === 'ko' ? 'en' : 'ko');
    var langHref = location.pathname.split('/').pop() + '?' + q.toString() + location.hash;
    nav += '<a href="' + href('index.html') + '#join">' + esc(t('nav_join')) + '</a>';
    nav += '<a class="lang" href="' + esc(langHref) + '" hreflang="' + (LANG === 'ko' ? 'en' : 'ko') + '" aria-label="' + esc(t('lang_label')) + '">' + esc(t('lang_switch')) + '</a>';
    fill('#site-header',
      '<div class="wrap bar">' +
      '<a class="brand' + (site && site.logo ? ' has-logo' : '') + '" href="' + href('index.html') + '">' + logo + (site && site.logo ? '<span class="sr-only">' + esc(name) + ', ' + esc(uni) + '</span><span class="knu" aria-hidden="true"><img class="knu-light" src="assets/img/knu-logo.png" alt=""><img class="knu-dark" src="assets/img/knu-logo-dark.png" alt=""></span>' : '<span><strong>' + esc(name) + '</strong><small>' + esc(uni) + '</small></span>') + '</a>' +
      '<nav class="nav" id="nav" aria-label="Main">' + nav + '</nav>' +
      '<button class="icon-btn theme-btn" type="button"></button>' +
      '<button class="icon-btn menu-btn" type="button" aria-controls="nav" aria-expanded="false" aria-label="' + esc(t('menu')) + '"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
      '</div>');
    applyTheme(currentTheme());
    $('.theme-btn').addEventListener('click', function () {
      applyTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]);
    });
    var mb = $('.menu-btn'), nv = $('#nav');
    mb.addEventListener('click', function () {
      var open = mb.getAttribute('aria-expanded') === 'true';
      mb.setAttribute('aria-expanded', String(!open)); nv.classList.toggle('open', !open);
    });
    nv.addEventListener('click', function (e) { if (e.target.closest('a')) { mb.setAttribute('aria-expanded', 'false'); nv.classList.remove('open'); } });
    var sk = $('.skip'); if (sk) sk.textContent = t('skip');
    [].forEach.call(document.querySelectorAll('.brand img'), function (im) { if (!im.complete) im.addEventListener('load', fitHeader); });
    fitHeader();
  }
  // Hide the KNU logo, then fold the links into the menu button, only when they would otherwise overlap.
  function fitHeader() {
    var bar = $('.bar'), nav = $('#nav'), brand = $('.brand');
    if (!bar || !nav || !brand) return;
    var tight = function () { return brand.getBoundingClientRect().right + 12 > nav.getBoundingClientRect().left || bar.scrollWidth > bar.clientWidth + 1; };
    bar.classList.remove('no-knu', 'collapsed');
    if (tight()) bar.classList.add('no-knu');
    if (tight()) bar.classList.add('collapsed');
  }
  var fitTimer;
  window.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitHeader, 80); });

  function renderFooter(site, meta) {
    site = site || {};
    var links = [];
    if (site.github_url) links.push('<a href="' + esc(site.github_url) + '">GitHub</a>');
    if (site.scholar_url) links.push('<a href="' + esc(site.scholar_url) + '">Google Scholar</a>');
    links.push('<a href="' + href('publications.html') + '">' + esc(t('nav_pubs')) + '</a>');
    var contact = [];
    if (site.email) contact.push('<a href="mailto:' + esc(site.email) + '">' + esc(site.email) + '</a>');
    if (site.phone) contact.push('Tel ' + esc(site.phone));
    if (site.fax) contact.push('Fax ' + esc(site.fax));
    var updated = meta && meta.updated ? '. ' + esc(t('updated', { d: fmtDate(meta.updated.slice(0, 10), true) })) : '';
    fill('#site-footer',
      '<div class="wrap"><div class="cols">' +
      '<div><strong>' + esc(loc(site, 'name') || 'Smart Control & Intelligent Systems Lab') + '</strong><p>' + esc(loc(site, 'address')) + '</p></div>' +
      '<div><strong>' + esc(t('contact')) + '</strong><p>' + contact.join('<br>') + '</p></div>' +
      '<div><strong>' + esc(t('elsewhere')) + '</strong><p>' + links.join('<br>') + '</p></div>' +
      '</div><p class="fine">© ' + new Date().getFullYear() + ' ' + esc(loc(site, 'name') || 'SCIS Lab') + ', ' + esc(loc(site, 'university')) + updated + '</p></div>');
  }

  function errorNote() {
    if (!loadFailed) return;
    var m = $('#main');
    if (m && !$('.load-error')) m.insertAdjacentHTML('afterbegin', '<div class="wrap"><p class="status load-error" role="alert" style="margin-top:24px">' + esc(t('load_error')) + '</p></div>');
  }

  /* ---------- illustrations ---------- */
  function illustration(kind) {
    var T = ILT[LANG] || ILT.en;
    return '<div class="il-scroll">' + IL[kind](T) + '</div><p class="swipe">' + esc(t('swipe_system')) + '</p>' + IL[kind + 'Legend'](T);
  }
  function glyph(pillar) {
    var inner = {
      energy: '<path d="M12 84H148" class="g-soft"/><path d="M30 84C52 84 56 20 80 16C104 20 108 84 130 84Z" class="g-tint"/><path d="M32 84C54 84 58 30 80 27C102 30 106 84 128 84" class="g-acc" stroke-dasharray="4 3"/><path d="M30 84C48 83 54 40 64 36C70 46 74 30 80 29C90 28 94 48 100 42C110 52 116 82 132 84" class="g-sun"/>',
      industrial: '<path d="M12 34H148" class="g-alert" stroke-dasharray="4 3"/><polyline points="12,64 22,60 30,66 40,58 50,62 58,56 66,61 72,22 78,60 88,57 98,63 106,59 114,62 120,28 126,58 136,62 148,59" class="g-ink"/><circle cx="72" cy="22" r="6" class="g-alert"/><circle cx="120" cy="28" r="6" class="g-alert"/>',
      climate: '<path d="M12 84H148" class="g-soft"/><path d="M14 70C40 66 60 62 80 52S120 34 146 24V40C120 48 100 60 80 66S40 78 14 80Z" class="g-tint"/><path d="M14 75C40 72 60 64 80 59S120 40 146 32" class="g-acc"/><path d="M14 60H146" class="g-sun" stroke-dasharray="3 4"/>',
      risk: '<path d="M12 84H148" class="g-soft"/><path d="M14 84C40 84 50 20 74 20C98 20 108 72 148 80" class="g-ink"/><path d="M118 84V56" class="g-alert" stroke-dasharray="3 3"/>',
      other: '<path d="M12 84H148" class="g-soft"/><polyline points="20,70 50,50 80,58 110,34 140,40" class="g-acc"/>'
    };
    return '<svg class="glyph" viewBox="0 0 160 100" aria-hidden="true">' + (inner[pillar] || inner.other) + '</svg>';
  }

  /* ---------- publications helpers ---------- */
  var PUB_TYPES = ['under_review', 'scie', 'esci', 'kci', 'other', 'intl_conf', 'domestic_conf'];
  var JOURNAL_TYPES = ['scie', 'esci', 'kci', 'other'];
  var PREFIX = { scie: 'J', esci: 'E', kci: 'K', other: 'O', intl_conf: 'C', domestic_conf: 'D' };
  var CORR_ROLES = ['corresponding', 'co_corresponding', 'first_corresponding'];
  function isJournal(p) { return JOURNAL_TYPES.indexOf(p.type) > -1; }
  function isCorr(p) { return CORR_ROLES.indexOf(p.author_role) > -1 || p.corresponding === true; }
  function authorsHTML(p) {
    return esc(p.authors || '').replace(/Suh,\s*D\.\*?/g, function () { return '<b>Suh, D.' + (isCorr(p) ? '*' : '') + '</b>'; });
  }
  function authorsText(p) {
    return String(p.authors || '').replace(/Suh,\s*D\.\*?/g, 'Suh, D.' + (isCorr(p) ? '*' : ''));
  }
  function citation(p) {
    var s = authorsText(p) + ' (' + p.year + '). ' + p.title + '. ' + p.venue + (p.details ? ', ' + p.details : '') + '.';
    if (p.doi) s += ' https://doi.org/' + p.doi;
    else if (p.link) s += ' ' + p.link;
    return s;
  }
  function paperLink(p) { return p.doi ? 'https://doi.org/' + p.doi : (p.link || ''); }
  function pubMetrics(p) {
    var parts = [];
    if (p.published) parts.push(esc(t('published', { d: LANG === 'ko' ? String(p.published).replace(/online/g, '온라인') : p.published })));
    var tags = [];
    if (p.type !== 'under_review') tags.push('<span class="mt idx t-' + esc(p.type) + '">' + esc(t('tag_' + p.type)) + '</span>');
    if (p.impact_factor) tags.push('<span class="mt">IF ' + esc(p.impact_factor) + '</span>');
    if (p.quartile) tags.push('<span class="mt' + (p.quartile === 'Q1' ? ' q1' : '') + '">' + esc(p.quartile) + '</span>');
    if (p.jcr_top) tags.push('<span class="mt">JCR ' + esc(t('jcr_top', { p: p.jcr_top })) + '</span>');
    if (p.jcr_category) parts.unshift(esc(p.jcr_category) + (p.jcr_rank ? ' ' + esc(p.jcr_rank) : '') + (p.jcr_year ? ' (JCR ' + esc(p.jcr_year) + ')' : ''));
    if (p.metrics) parts.push(esc(p.metrics));
    if (p.author_role && p.type !== 'under_review') tags.push('<span class="mt' + (isCorr(p) ? ' corr' : '') + '">' + esc(t('role_' + p.author_role)) + '</span>');
    if (!tags.length && !parts.length) return '';
    return '<p class="metrics">' + (tags.length ? '<span class="mts">' + tags.join('') + '</span>' : '') + parts.join('<span aria-hidden="true"> · </span>') + '</p>';
  }
  function pubItem(p, opts) {
    opts = opts || {};
    var thumb = p.thumbnail ? '<img class="thumb" src="' + esc(p.thumbnail) + '" alt="" loading="lazy">' : '';
    var foot = [];
    if (p.type === 'under_review') foot.push('<span class="badge warn">' + esc(t('under_review')) + (p.note ? ': ' + esc(p.note) : '') + '</span>');
    else {
      if (p.status) foot.push('<span class="badge warn">' + esc(p.status) + '</span>');
      if (p.note) foot.push('<span class="badge">' + esc(p.note) + '</span>');
    }
    if (p.doi) foot.push('<a href="https://doi.org/' + esc(p.doi) + '" target="_blank" rel="noopener">' + esc(t('doi')) + '</a>');
    else if (p.link) foot.push('<a href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(t('paper')) + '</a>');
    if (p.pdf) foot.push('<a href="' + esc(p.pdf) + '" target="_blank" rel="noopener">' + esc(t('pdf')) + '</a>');
    if (p.code) foot.push('<a href="' + esc(p.code) + '" target="_blank" rel="noopener">' + esc(t('code')) + '</a>');
    if (p.type !== 'under_review') foot.push('<button type="button" data-cite="' + esc(p._id) + '">' + esc(t('cite')) + '</button>');
    var venue = '<i>' + esc(p.venue) + '</i>' + (p.details ? ', ' + esc(p.details) : '') + (opts.showYear ? ', ' + esc(p.year) : '');
    var link = paperLink(p);
    var main = LANG === 'ko' && p.title_ko ? p.title_ko : p.title, alt = p.title_ko ? (main === p.title ? p.title_ko : p.title) : '';
    var title = link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="text-decoration:none">' + esc(main) + '</a>' : esc(main);
    return '<li class="pub' + (thumb ? ' has-thumb' : '') + '">' + thumb + '<div><h3>' + title + '</h3>' +
      (alt ? '<p class="alt-title">' + esc(alt) + '</p>' : '') +
      '<p class="authors">' + authorsHTML(p) + '</p><p class="venue">' + venue + '</p>' + pubMetrics(p) +
      '<div class="pub-foot">' + foot.join('') + '</div></div></li>';
  }
  function bindCite(root, pubs) {
    var byId = {}; (pubs || []).forEach(function (p) { byId[p._id] = p; });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cite]'); if (!b) return;
      var p = byId[b.getAttribute('data-cite')]; if (!p) return;
      copy(citation(p)).then(function () { toast(t('copied')); });
    });
  }
  function pubMonth(p) { var m = /^\d{4}-(\d{2})/.exec(p.date || ''); return m ? +m[1] : 13; }
  // Within a year, an optional "order" number wins (smaller first); entries without one come first as the newest.
  function pubOrder(p) { return p.order ? +p.order : 0; }
  function sortPubs(list) {
    return list.slice().sort(function (a, b) {
      return (b.year - a.year) || (pubOrder(a) - pubOrder(b)) || (pubMonth(b) - pubMonth(a)) || (PUB_TYPES.indexOf(a.type) - PUB_TYPES.indexOf(b.type)) || String(a.title).localeCompare(String(b.title));
    });
  }
  // Sorts publications and tags each with its position in its category (not shown on the site).
  function labelPubs(list) {
    var sorted = sortPubs(list), n = {};
    sorted.forEach(function (p) { if (PREFIX[p.type]) { n[p.type] = (n[p.type] || 0) + 1; p._label = PREFIX[p.type] + n[p.type]; } });
    return sorted;
  }
  function sortNews(list) {
    return (list || []).slice().sort(function (a, b) { return dateKey(b.date).localeCompare(dateKey(a.date)); });
  }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function catLabel(c) { return t('cat_' + c); }
  // A news entry shows its title and first line; clicking the title opens the full text and photos.
  function newsImages(n) { return (Array.isArray(n.image) ? n.image : [n.image]).filter(Boolean); }
  function newsItem(n) {
    var body = String(loc(n, 'body') || '').replace(/[ \t]+\n/g, '\n').trim(), imgs = newsImages(n);
    var first = body.split(/\n/)[0].trim(), more = body.length > first.length || imgs.length || n.link;
    var head = '<span class="badge' + (n.category === 'award' ? ' alt' : '') + '">' + esc(catLabel(n.category)) + '</span>' +
      '<h3>' + esc(loc(n, 'title')) + '</h3>' + (first ? '<p>' + esc(first.length > 180 ? first.slice(0, 180) + '…' : first) + '</p>' : '');
    var detail = more ? '<div class="news-detail">' + paras(body) +
      (imgs.length ? '<div class="news-imgs">' + imgs.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="" loading="lazy"></a>'; }).join('') + '</div>' : '') +
      (n.link ? '<a class="more" href="' + esc(n.link) + '" target="_blank" rel="noopener">' + esc(t('read_more')) + '</a>' : '') + '</div>' : '';
    return '<li><time datetime="' + esc(n.date) + '">' + fmtDate(n.date) + '</time>' +
      (more ? '<details class="news-more"><summary>' + head + '<span class="news-toggle">' + esc(t('details')) + '</span></summary>' + detail + '</details>' : '<div>' + head + '</div>') + '</li>';
  }
  function joinBlock(site) {
    var open = site && site.recruiting_open;
    var text = open ? loc(site, 'recruiting') : t('not_recruiting');
    var email = (site && site.email) || 'dongjunsuh@knu.ac.kr';
    return '<div class="join"><div><h2>' + esc(t('join_title')) + '</h2><p>' + esc(text) + '</p></div>' +
      '<div class="actions"><a class="btn primary" href="mailto:' + esc(email) + '">' + esc(t('email_prof')) + '</a></div></div>';
  }

  /* ---------- pages ---------- */
  var pages = {};

  pages.home = function (d) {
    var site = d.site || {};
    document.title = (site.short_name || 'SCIS Lab') + ' | ' + (loc(site, 'university') || 'Kyungpook National University');
    fill('#hero', '<div class="wrap"><h1>' + esc(loc(site, 'headline')) + '</h1><p class="lead">' + esc(loc(site, 'intro')) + '</p>' +
      '<div class="actions"><a class="btn primary" href="' + href('research.html') + '">' + esc(t('see_research')) + '</a>' +
      '<a class="btn ghost" href="#join">' + esc(t('join_lab')) + '</a></div></div>');
    fill('#stage', '<div class="wrap"><div class="stage-row"><div class="tabs" role="tablist" aria-label="' + esc(t('research')) + '">' +
      '<button role="tab" id="tab-e" aria-selected="true" aria-controls="pan-e">' + esc(t('tab_energy')) + '</button>' +
      '<button role="tab" id="tab-i" aria-selected="false" aria-controls="pan-i" tabindex="-1">' + esc(t('tab_industrial')) + '</button></div>' +
      '<p class="stage-note" data-for="tab-e">' + esc(t('stage_energy')) + '</p><p class="stage-note" data-for="tab-i" hidden>' + esc(t('stage_industrial')) + '</p></div>' +
      '<div id="pan-e" role="tabpanel" aria-labelledby="tab-e">' + illustration('energy') + '</div>' +
      '<div id="pan-i" role="tabpanel" aria-labelledby="tab-i" hidden>' + illustration('industrial') + '</div></div>');
    var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (x) {
        var on = x === tab; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
      document.querySelectorAll('.stage-note').forEach(function (n) { n.hidden = n.getAttribute('data-for') !== tab.id; });
    }
    tabs.forEach(function (x, i) {
      x.addEventListener('click', function () { select(x); });
      x.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; select(n); n.focus(); e.preventDefault();
      });
    });

    var topics = (d.research || []).slice().sort(byOrder);
    function pillarCol(key) {
      var list = topics.filter(function (x) { return x.pillar === key; }).slice(0, 5).map(function (x) {
        return '<li><b>' + esc(loc(x, 'title')) + '</b><span>' + esc(loc(x, 'summary')) + '</span></li>';
      }).join('');
      return '<div class="pillar"><h3>' + esc(t(key === 'energy' ? 'energy_ai' : 'industrial_ai')) + '</h3><p>' + esc(loc(site, key + '_summary')) + '</p><ul class="topic-list">' + list + '</ul></div>';
    }
    fill('#home-research', '<div class="wrap"><div class="sec-head"><h2>' + esc(t('research')) + '</h2><p>' + esc(t('research_lead')) + '</p></div>' +
      '<div class="pillars">' + pillarCol('energy') + pillarCol('industrial') + '</div>' +
      '<p style="margin-top:20px"><a class="more" href="' + href('research.html') + '">' + esc(t('all_research')) + '</a></p></div>');

    var pubs = labelPubs(d.publications || []);
    var journals = pubs.filter(isJournal);
    var feat = sortPubs(pubs.filter(function (p) { return p.featured && p.type !== 'under_review'; }));
    if (feat.length < 3) feat = feat.concat(sortPubs(journals).filter(function (p) { return feat.indexOf(p) < 0; })).slice(0, 3);
    feat = feat.slice(0, 3);
    fill('#home-pubs', '<div class="wrap"><div class="sec-head"><h2>' + esc(t('recent_pubs')) + '</h2><a class="more" href="' + href('publications.html') + '">' + esc(t('all_pubs_n', { n: journals.length })) + '</a></div>' +
      feat.map(function (p) {
        var visual = p.thumbnail ? '<img class="thumb" src="' + esc(p.thumbnail) + '" alt="" loading="lazy">' : glyph(p.pillar);
        return '<article class="fpub">' + visual + '<div><h3>' + esc(p.title) + '</h3><p class="muted" style="margin:0 0 2px">' + authorsHTML(p) + '</p>' +
          '<p style="margin:0 0 10px"><i>' + esc(p.venue) + '</i>, ' + esc(p.year) + '</p>' +
          '<div class="pub" style="padding:0;border:0">' + pubMetrics(p) + '</div><div class="pub-foot">' +
          (paperLink(p) ? '<a href="' + esc(paperLink(p)) + '" target="_blank" rel="noopener">' + esc(t('doi')) + '</a>' : '') +
          (p.code ? '<a href="' + esc(p.code) + '" target="_blank" rel="noopener">' + esc(t('code')) + '</a>' : '') + '</div></div></article>';
      }).join('') + '</div>');

    var news = sortNews(d.news);
    news = news.filter(function (n) { return n.pinned; }).concat(news.filter(function (n) { return !n.pinned; })).slice(0, 3);
    fill('#home-news', '<div class="wrap"><div class="sec-head"><h2>' + esc(t('news')) + '</h2><a class="more" href="' + href('news.html') + '">' + esc(t('all_news')) + '</a></div><ul class="news-list">' + news.map(newsItem).join('') + '</ul></div>');
    fill('#join', '<div class="wrap">' + joinBlock(site) + '</div>');
  };

  pages.research = function (d) {
    var site = d.site || {};
    document.title = t('research_title') + ' | ' + (site.short_name || 'SCIS Lab');
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('research_title')) + '</h1><p>' + esc(t('research_page_lead')) + '</p></div>');
    var topics = (d.research || []).slice().sort(byOrder);
    var pubs = labelPubs(d.publications || []).filter(function (p) { return p.type !== 'under_review'; });
    function topicCard(x) {
      return '<article class="topic-card">' + (x.image ? '<img src="' + esc(x.image) + '" alt="" loading="lazy">' : '') +
        '<h3>' + esc(loc(x, 'title')) + '</h3><p>' + esc(loc(x, 'summary')) + '</p>' + (x.keywords ? '<div class="kw">' + esc(x.keywords) + '</div>' : '') + '</article>';
    }
    function related(key, n) {
      var list = pubs.filter(function (p) { return p.pillar === key; }).sort(function (a, b) {
        return (b.year - a.year) || (PUB_TYPES.indexOf(a.type) - PUB_TYPES.indexOf(b.type)) || (pubOrder(a) - pubOrder(b));
      });
      if (!list.length) return '';
      return '<h3 class="sub-h">' + esc(t('related_pubs')) + '</h3><ul>' + list.slice(0, n).map(function (p) { return pubItem(p, { showYear: true }); }).join('') + '</ul>' +
        (list.length > n ? '<p style="margin-top:12px"><a class="more" href="' + href('publications.html', { pillar: key }) + '">' + esc(t('show_all_n', { n: list.length })) + '</a></p>' : '');
    }
    var html = '';
    [['energy', 'energy_ai'], ['industrial', 'industrial_ai']].forEach(function (pl) {
      html += '<section class="pillar-block" id="' + pl[0] + '"><div class="wrap"><h2>' + esc(t(pl[1])) + '</h2><p>' + esc(loc(site, pl[0] + '_summary')) + '</p>' +
        '<div class="fig-box">' + illustration(pl[0]) + '</div>' +
        '<div class="topic-grid">' + topics.filter(function (x) { return x.pillar === pl[0]; }).map(topicCard).join('') + '</div>' +
        related(pl[0], 3) + '</div></section>';
    });
    var other = topics.filter(function (x) { return x.pillar !== 'energy' && x.pillar !== 'industrial'; });
    if (other.length) {
      html += '<section class="sec" id="other"><div class="wrap"><div class="sec-head"><h2>' + esc(t('other_research')) + '</h2><p>' + esc(t('other_research_lead')) + '</p></div>' +
        other.map(function (x) {
          return '<div class="pillar-block" id="' + esc(x.pillar) + '" style="padding-top:28px"><h3 style="font-size:1.4rem;font-weight:600;margin-bottom:8px">' + esc(loc(x, 'title')) + '</h3>' +
            '<p class="muted" style="max-width:70ch">' + esc(loc(x, 'summary')) + '</p>' + (x.keywords ? '<p class="kw">' + esc(x.keywords) + '</p>' : '') + related(x.pillar, 5) + '</div>';
        }).join('') + '</div></section>';
    }
    fill('#content', html);
    bindCite($('#content'), d.publications);
    if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  };

  pages.professor = function (d) {
    var site = d.site || {}, pr = d.professor || {};
    document.title = t('prof_title') + ' | ' + (site.short_name || 'SCIS Lab');
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('prof_title')) + '</h1><p>' + esc(t('prof_lead')) + '</p></div>');
    var depts = (LANG === 'ko' && pr.departments_ko && pr.departments_ko.length ? pr.departments_ko : pr.departments_en) || [];
    var links = [];
    if (pr.scholar_url) links.push('<a class="btn ghost" href="' + esc(pr.scholar_url) + '" target="_blank" rel="noopener">' + esc(t('scholar')) + '</a>');
    if (pr.orcid_url) links.push('<a class="btn ghost" href="' + esc(pr.orcid_url) + '" target="_blank" rel="noopener">' + esc(t('orcid')) + '</a>');
    if (pr.cv) links.push('<a class="btn ghost" href="' + esc(pr.cv) + '" target="_blank" rel="noopener">' + esc(t('cv')) + '</a>');
    var talks = sortNews(d.talks), press = sortNews(d.press);
    var acts = (LANG === 'ko' && pr.activities_ko && pr.activities_ko.length ? pr.activities_ko : pr.activities) || [];
    var prof = '<section class="wrap prof" aria-labelledby="prof-name">' +
      '<div class="photo">' + (pr.photo ? '<img src="' + esc(pr.photo) + '" alt="' + esc(loc(pr, 'name')) + '">' : esc(initials(pr.name_en || 'Dongjun Suh'))) + '</div>' +
      '<div><p class="muted" style="margin:0 0 4px">' + esc(t('professor')) + '</p><h2 id="prof-name">' + esc(loc(pr, 'name')) + '</h2>' +
      '<p class="title">' + esc(loc(pr, 'title')) + '</p><p class="depts">' + depts.map(function (d, i) {
        var u = (pr.homepages || [])[i];  // homepages are listed in the same order as the departments
        return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(d) + '</a>' : esc(d);
      }).join('<br>') + '<br>' + esc(loc(site, 'university')) + '</p>' +
      '<dl class="contact-list">' +
      (pr.email ? '<div><dt>Email</dt><dd><a href="mailto:' + esc(pr.email) + '">' + esc(pr.email) + '</a></dd></div>' : '') +
      (pr.phone ? '<div><dt>Tel</dt><dd>' + esc(pr.phone) + '</dd></div>' : '') +
      (loc(pr, 'office') ? '<div class="wide"><dt>Office</dt><dd>' + esc(loc(pr, 'office')).replace(/\n/g, '<br>') + '</dd></div>' : '') +
      '</dl>' + (links.length ? '<div class="actions" style="margin-bottom:20px">' + links.join('') + '</div>' : '') +
      '<div class="bio"><h3 class="sub-h" style="margin-top:8px">' + esc(t('bio')) + '</h3>' + richText(loc(pr, 'bio')) + '</div>' +
      (pr.awards && pr.awards.length ? '<details class="more-box"><summary>' + esc(t('awards')) + ' (' + pr.awards.length + ')</summary><ul>' + sortNews(pr.awards).map(function (a) {
        return '<li>' + fmtDate(a.date) + '. ' + esc(loc(a, 'title')) + '</li>'; }).join('') + '</ul></details>' : '') +
      (acts.length ? '<details class="more-box"><summary>' + esc(t('activities')) + '</summary><ul>' + acts.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></details>' : '') +
      (talks.length ? '<details class="more-box"><summary>' + esc(t('talks')) + ' (' + talks.length + ')</summary><ul>' + talks.map(function (x) {
        return '<li>' + fmtDate(x.date) + '. ' + esc(x.title) + (x.venue ? ' <span>(' + esc(x.venue) + ')</span>' : '') + '</li>'; }).join('') + '</ul></details>' : '') +
      (press.length ? '<details class="more-box"><summary>' + esc(t('press')) + ' (' + press.length + ')</summary><ul>' + press.map(function (x) {
        var tt = x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a>' : esc(x.title);
        return '<li>' + fmtDate(x.date) + '. ' + tt + (x.source ? ' <span>(' + esc(x.source) + ')</span>' : '') + '</li>'; }).join('') + '</ul></details>' : '') +
      '</div></section>';
    fill('#content', prof);
  };

  pages.people = function (d) {
    var site = d.site || {};
    document.title = t('people_title') + ' | ' + (site.short_name || 'SCIS Lab');
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('people_title')) + '</h1><p>' + esc(t('people_lead')) + '</p></div>');
    var people = (d.people || []).slice().sort(function (a, b) { return (a.order || 50) - (b.order || 50) || String(a.name_en).localeCompare(String(b.name_en)); });
    function card(p) {
      var primary = loc(p, 'name'), secondary = LANG === 'ko' ? (p.name_ko ? p.name_en : '') : p.name_ko;
      var interests = loc(p, 'interests');
      return '<article class="person"><div class="avatar">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="" loading="lazy">' : esc(initials(p.name_en))) + '</div>' +
        '<h3>' + esc(primary) + (secondary ? ' <span class="ko">' + esc(secondary) + '</span>' : '') + '</h3>' +
        (p.note ? '<p>' + esc(p.note) + '</p>' : '') + (interests ? '<p>' + esc(interests) + '</p>' : '') +
        (p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '') +
        (p.homepage ? '<br><a href="' + esc(p.homepage) + '" target="_blank" rel="noopener">Web</a>' : '') + '</article>';
    }
    var groups = '';
    ['postdoc', 'researcher', 'phd', 'ms', 'intern'].forEach(function (r) {
      var list = people.filter(function (p) { return p.role === r; });
      if (list.length) groups += '<section class="sec"><div class="wrap"><div class="sec-head"><h2>' + esc(t('role_' + r)) + '</h2><p>' + list.length + '</p></div><div class="people-grid">' + list.map(card).join('') + '</div></div></section>';
    });
    var alumni = people.filter(function (p) { return p.role === 'alumni'; });
    if (alumni.length) groups += '<section class="sec"><div class="wrap"><div class="sec-head"><h2>' + esc(t('role_alumni')) + '</h2><p>' + alumni.length + '</p></div><ul class="alumni-grid">' +
      alumni.map(function (p) { return '<li><b>' + esc(loc(p, 'name')) + '</b><span>' + esc(p.note || '') + '</span></li>'; }).join('') + '</ul></div></section>';
    fill('#content', groups);
  };

  pages.publications = function (d) {
    var site = d.site || {};
    document.title = t('pubs_title') + ' | ' + (site.short_name || 'SCIS Lab');
    var pubs = labelPubs(d.publications || []);
    var count = function (f) { return pubs.filter(f).length; };
    var byType = function (x) { return count(function (p) { return p.type === x; }); };
    var stats = [['scie', 'stat_scie'], ['esci', 'stat_esci'], ['kci', 'stat_kci'], ['intl_conf', 'stat_intl'], ['domestic_conf', 'stat_domestic']]
      .filter(function (x) { return byType(x[0]); }).map(function (x) { return '<div><b>' + byType(x[0]) + '</b>' + esc(t(x[1])) + '</div>'; });
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('pubs_title')) + '</h1><p>' + esc(t('pubs_lead')) + '</p><div class="stats">' + stats.join('') + '</div></div>');
    var types = PUB_TYPES.filter(byType);
    var pillars = ['energy', 'industrial', 'climate', 'risk', 'other'].filter(function (x) { return count(function (p) { return p.pillar === x; }); });
    var years = pubs.map(function (p) { return p.year; }).filter(function (y, i, a) { return a.indexOf(y) === i; }).sort(function (a, b) { return b - a; });
    var st = { q: params.get('q') || '', type: params.get('type') || 'all', pillar: params.get('pillar') || 'all', year: params.get('year') || 'all' };
    fill('#filters', '<div class="wrap"><div class="filter-top">' +
      '<label class="sr-only" for="q">' + esc(t('search_pubs')) + '</label><input id="q" class="search" type="search" placeholder="' + esc(t('search_pubs')) + '" value="' + esc(st.q) + '">' +
      '<label class="sr-only" for="pillar">Area</label><select id="pillar" class="select"><option value="all">' + esc(t('pillar_all')) + '</option>' +
      pillars.map(function (x) { return '<option value="' + x + '"' + (st.pillar === x ? ' selected' : '') + '>' + esc(t('pillar_' + x)) + '</option>'; }).join('') + '</select>' +
      '<label class="sr-only" for="year">Year</label><select id="year" class="select"><option value="all">' + esc(t('year_all')) + '</option>' +
      years.map(function (y) { return '<option value="' + y + '"' + (String(st.year) === String(y) ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></div>' +
      '<div class="chip-row" role="group" aria-label="Type"><button class="chip" data-type="all">' + esc(t('all')) + '</button>' +
      types.map(function (x) { return '<button class="chip" data-type="' + x + '">' + esc(t('chip_' + x)) + '</button>'; }).join('') + '</div>' +
      '<div class="count" aria-live="polite"></div></div>');
    var listEl = $('#pub-list');
    function byYear(list, tag) {
      var html = '', lastY = null, buf = '';
      list.forEach(function (p) {
        if (p.year !== lastY) {
          if (buf) html += buf + '</ul>';
          var n = list.filter(function (x) { return x.year === p.year; }).length;
          buf = '<' + tag + ' class="year-h">' + esc(p.year) + ' <span class="yc">' + esc(t('papers_n', { n: n })) + '</span></' + tag + '><ul>'; lastY = p.year;
        }
        buf += pubItem(p);
      });
      return html + (buf ? buf + '</ul>' : '');
    }
    function render() {
      var q = st.q.trim().toLowerCase();
      var shown = pubs.filter(function (p) {
        if (st.type !== 'all' && p.type !== st.type) return false;
        if (st.pillar !== 'all' && p.pillar !== st.pillar) return false;
        if (st.year !== 'all' && String(p.year) !== String(st.year)) return false;
        if (q && (p.title + ' ' + (p.title_ko || '') + ' ' + p.authors + ' ' + p.venue + ' ' + (p.details || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      document.querySelectorAll('.chip[data-type]').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-type') === st.type)); });
      $('.count').textContent = t('showing', { n: shown.length, total: pubs.length });
      if (!shown.length) {
        listEl.innerHTML = '<p class="status" style="margin-top:24px">' + esc(t('no_results')) + ' <button class="btn ghost" type="button" data-clear>' + esc(t('clear_filters')) + '</button></p>';
      } else {
        var review = shown.filter(function (p) { return p.type === 'under_review'; });
        var rest = shown.filter(function (p) { return p.type !== 'under_review'; }).sort(function (a, b) {
          return (b.year - a.year) || (PUB_TYPES.indexOf(a.type) - PUB_TYPES.indexOf(b.type)) || (pubOrder(a) - pubOrder(b)) || (pubMonth(b) - pubMonth(a));
        });
        listEl.innerHTML = (review.length ? '<h2 class="year-h">' + esc(t('type_under_review')) + '</h2><ul>' + review.map(function (p) { return pubItem(p); }).join('') + '</ul>' : '') + byYear(rest, 'h2');
      }
      var q2 = new URLSearchParams();
      if (LANG === 'ko') q2.set('lang', 'ko');
      ['q', 'type', 'pillar', 'year'].forEach(function (k) { if (st[k] && st[k] !== 'all') q2.set(k, st[k]); });
      var s = q2.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
    }
    $('#q').addEventListener('input', function (e) { st.q = e.target.value; render(); });
    $('#pillar').addEventListener('change', function (e) { st.pillar = e.target.value; render(); });
    $('#year').addEventListener('change', function (e) { st.year = e.target.value; render(); });
    $('#filters').addEventListener('click', function (e) { var c = e.target.closest('[data-type]'); if (c) { st.type = c.getAttribute('data-type'); render(); } });
    listEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) { st = { q: '', type: 'all', pillar: 'all', year: 'all' }; $('#q').value = ''; $('#pillar').value = 'all'; $('#year').value = 'all'; render(); }
    });
    bindCite(listEl, pubs);
    render();
  };

  pages.patents = function (d) {
    var site = d.site || {};
    document.title = t('patents') + ' | ' + (site.short_name || 'SCIS Lab');
    var patents = (d.patents || []).slice().sort(function (a, b) { return ((a.order || 0) - (b.order || 0)) || dateKey(b.date || b.application_date).localeCompare(dateKey(a.date || a.application_date)); });
    var cnt = function (k) { return patents.filter(function (p) { return p.kind === k; }).length; };
    var stats = [['patent_kr', 'stat_pat_kr'], ['patent_us', 'stat_pat_us'], ['pending', 'stat_pending'], ['program', 'stat_programs']]
      .filter(function (x) { return cnt(x[0]); }).map(function (x) { return '<div><b>' + cnt(x[0]) + '</b>' + esc(t(x[1])) + '</div>'; });
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('patents')) + '</h1><p>' + esc(t('patents_lead')) + '</p><div class="stats">' + stats.join('') + '</div></div>');
    if (patents.length) {
      var groups = [['patent_kr', 'PK'], ['patent_us', 'PU'], ['pending', 'PA'], ['program', 'SW']];
      fill('#content', '<div class="wrap" style="padding-bottom:48px">' + groups.map(function (g) {
        var list = patents.filter(function (p) { return p.kind === g[0]; });
        if (!list.length) return '';
        return '<h3 class="sub-h">' + esc(t('pat_' + g[0])) + ' <span class="muted">' + list.length + '</span></h3>' + list.map(function (p, i) {
          var meta = [];
          if (p.number) meta.push((p.kind === 'patent_kr' ? 'KR ' : '') + esc(p.number) + (p.date ? ' (' + esc(t('registered_on', { d: p.date })) + ')' : ''));
          if (p.application) meta.push(esc(t('application')) + ' ' + (p.kind === 'pending' && p.country === 'KR' ? 'KR ' : '') + esc(p.application) + (p.application_date ? ' (' + esc(p.application_date) + ')' : ''));
          if (p.publication) meta.push(esc(t('publication_no')) + ' ' + esc(p.publication));
          var status = loc(p, 'status'), inv = loc(p, 'inventors');
          return '<div class="patent"><h3>' + esc(loc(p, 'title')) + '</h3><p>' + meta.join(' · ') + '</p>' +
            ((status || inv) ? '<p>' + [status ? '<span class="badge warn">' + esc(status) + '</span>' : '', inv ? esc(t('inventors')) + ': ' + esc(inv) : ''].filter(Boolean).join(' ') + '</p>' : '') + '</div>';
        }).join('');
      }).join('') + '</div>');
    }
  };

  pages.projects = function (d) {
    var site = d.site || {};
    document.title = t('projects_title') + ' | ' + (site.short_name || 'SCIS Lab');
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('projects_title')) + '</h1><p>' + esc(t('projects_lead')) + '</p></div>');
    var now = new Date().toISOString().slice(0, 7);
    var projects = (d.projects || []).slice().sort(function (a, b) { return dateKey(b.start).localeCompare(dateKey(a.start)); });
    function period(p) { return fmtDate(p.start) + ' – ' + (p.end ? fmtDate(p.end) : esc(t('present'))); }
    function projItem(p) {
      var on = !p.end || dateKey(p.end) >= dateKey(now);
      return '<li><time>' + period(p) + (on ? '<span class="badge">' + esc(t('ongoing')) + '</span>' : '') + '</time><div><span class="role">' + esc(loc(p, 'role')) + '</span><b>' + esc(loc(p, 'title')) + '</b><span>' +
        esc([loc(p, 'funder'), loc(p, 'amount')].filter(Boolean).join(' · ')) + '</span></div></li>';
    }
    var html = '';
    [['pi', 'proj_pi'], ['co', 'proj_co']].forEach(function (g) {
      var list = projects.filter(function (p) { return (p.group || 'pi') === g[0]; });
      if (list.length) html += '<section class="sec"><div class="wrap"><div class="sec-head"><h2>' + esc(t(g[1])) + '</h2><p>' + list.length + '</p></div><ul class="timeline">' + list.map(projItem).join('') + '</ul></div></section>';
    });
    var programs = (d.programs || []).slice().sort(function (a, b) { return dateKey(b.start).localeCompare(dateKey(a.start)); });
    if (programs.length) {
      html += '<section class="sec" id="programs"><div class="wrap"><div class="sec-head"><h2>' + esc(t('programs')) + '</h2></div><ul class="timeline">' +
        programs.map(function (p) {
          return '<li><time>' + period(p) + '</time><div><b>' + esc(loc(p, 'name')) + '</b><span>' + esc(loc(p, 'role')) + '</span></div></li>';
        }).join('') + '</ul></div></section>';
    }
    var col = d.collaborations || [];
    if (col.length) {
      var countries = [];
      col.forEach(function (c) { if (countries.indexOf(c.country_en) < 0) countries.push(c.country_en); });
      // Every country is listed; only countries with institutions marked "show" open into a list when clicked.
      html += '<section class="sec" id="collaboration"><div class="wrap"><div class="sec-head"><h2>' + esc(t('collab')) + '</h2></div><p class="muted" style="max-width:70ch">' +
        esc(t('collab_lead', { c: countries.length })) + '</p><ul class="country-list">' + countries.map(function (name, i) {
          var list = col.filter(function (c) { return c.country_en === name; }), open = list.filter(function (c) { return c.show; });
          var label = esc(loc(list[0], 'country'));
          return '<li>' + (open.length ? '<button type="button" class="country open-able" aria-expanded="false" aria-controls="cpanel" data-c="' + i + '">' + label + '</button>' : '<span class="country">' + label + '</span>') + '</li>';
        }).join('') + '</ul><div id="cpanel" class="country-panel" hidden></div></div></section>';
      var collabCountries = countries;
    }
    fill('#content', html);
    var panel = $('#cpanel');
    if (panel) $('#collaboration').addEventListener('click', function (e) {
      var b = e.target.closest('.open-able'); if (!b) return;
      var wasOpen = b.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.open-able').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
      if (wasOpen) { panel.hidden = true; return; }
      var name = collabCountries[+b.getAttribute('data-c')];
      var list = col.filter(function (c) { return c.country_en === name && c.show; });
      panel.innerHTML = '<h3>' + esc(loc(list[0], 'country')) + '</h3><ul>' + list.map(function (c) { return '<li>' + esc(c.name) + '</li>'; }).join('') + '</ul>';
      panel.hidden = false; b.setAttribute('aria-expanded', 'true');
    });
    if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  };

  pages.photos = function (d) {
    var site = d.site || {};
    document.title = t('photos_title') + ' | ' + (site.short_name || 'SCIS Lab');
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('photos_title')) + '</h1><p>' + esc(t('photos_lead')) + '</p></div>');
    var albums = sortNews(d.photos).filter(function (a) { return a.photos && a.photos.length; });
    var flat = [], html = '', lastY = null;
    albums.forEach(function (a) {
      var y = String(a.date).slice(0, 4);
      if (y !== lastY) { html += (lastY ? '</div>' : '') + '<h2 class="year-h">' + esc(y) + '</h2><div class="albums">'; lastY = y; }
      var title = loc(a, 'title');
      html += '<section class="album"><h3>' + esc(title) + '</h3><p class="muted">' + fmtDate(a.date) + ' · ' + esc(t('photos_n', { n: a.photos.length })) + '</p><div class="thumbs">' +
        a.photos.map(function (p) {
          flat.push({ src: p.image, caption: p.caption || title });
          return '<button type="button" data-i="' + (flat.length - 1) + '" aria-label="' + esc(p.caption || title) + '"><img src="' + esc(p.image) + '" alt="' + esc(p.caption || title) + '" loading="lazy"></button>';
        }).join('') + '</div></section>';
    });
    if (lastY) html += '</div>';
    fill('#content', '<div class="wrap">' + (html || '<p class="status" style="margin-top:24px">' + esc(t('no_photos')) + '</p>') + '</div>' +
      '<dialog class="lightbox" aria-label="' + esc(t('photos_title')) + '"><img alt=""><p></p>' +
      '<button type="button" class="lb-prev" aria-label="' + esc(t('prev')) + '">‹</button><button type="button" class="lb-next" aria-label="' + esc(t('next')) + '">›</button>' +
      '<button type="button" class="lb-close" aria-label="' + esc(t('close')) + '">×</button></dialog>');
    var dlg = $('.lightbox'), cur = 0;
    function show(i) {
      cur = (i + flat.length) % flat.length;
      dlg.querySelector('img').src = flat[cur].src; dlg.querySelector('img').alt = flat[cur].caption;
      dlg.querySelector('p').textContent = flat[cur].caption + ' (' + (cur + 1) + ' / ' + flat.length + ')';
      if (!dlg.open) dlg.showModal();
    }
    $('#content').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) show(+b.getAttribute('data-i')); });
    dlg.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
    dlg.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    var x0 = null;
    dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
  };

  pages.news = function (d) {
    var site = d.site || {};
    document.title = t('news_title') + ' | ' + (site.short_name || 'SCIS Lab');
    fill('#page-head', '<div class="wrap"><h1>' + esc(t('news_title')) + '</h1><p>' + esc(t('news_lead')) + '</p></div>');
    var news = sortNews(d.news);
    var cats = ['publication', 'award', 'talk', 'project', 'recruiting', 'event'].filter(function (c) { return news.some(function (n) { return n.category === c; }); });
    var cur = params.get('cat') || 'all';
    fill('#filters', '<div class="wrap"><div class="chip-row" role="group" aria-label="Category"><button class="chip" data-cat="all">' + esc(t('cat_all')) + '</button>' +
      cats.map(function (c) { return '<button class="chip" data-cat="' + c + '">' + esc(catLabel(c)) + '</button>'; }).join('') + '</div></div>');
    function render() {
      document.querySelectorAll('[data-cat]').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === cur)); });
      var list = news.filter(function (n) { return cur === 'all' || n.category === cur; });
      if (!list.length) { fill('#news-list', '<p class="status" style="margin-top:24px">' + esc(t('no_news')) + '</p>'); return; }
      var html = '', lastY = null, buf = '';
      list.forEach(function (n) {
        var y = String(n.date).slice(0, 4);
        if (y !== lastY) { if (buf) html += buf + '</ul>'; buf = '<h2 class="year-h">' + y + '</h2><ul class="news-list">'; lastY = y; }
        buf += newsItem(n);
      });
      html += buf + '</ul>';
      fill('#news-list', html);
    }
    $('#filters').addEventListener('click', function (e) { var c = e.target.closest('[data-cat]'); if (c) { cur = c.getAttribute('data-cat'); render(); } });
    render();
  };

  pages.notfound = function (d) {
    document.title = t('notfound_title');
    fill('#content', '<div class="wrap" style="padding:80px 24px"><h1 style="font-size:2rem;margin-bottom:12px">' + esc(t('notfound_title')) + '</h1><p class="muted">' + esc(t('notfound_body')) + '</p><a class="btn primary" href="' + href('index.html') + '">' + esc(t('go_home')) + '</a></div>');
  };

  /* ---------- boot ---------- */
  var NEEDS = {
    home: ['site', 'research', 'publications', 'news', 'meta'],
    research: ['site', 'research', 'publications', 'meta'],
    projects: ['site', 'projects', 'programs', 'collaborations', 'meta'],
    professor: ['site', 'professor', 'talks', 'press', 'meta'],
    photos: ['site', 'photos', 'meta'],
    people: ['site', 'people', 'meta'],
    publications: ['site', 'publications', 'meta'],
    patents: ['site', 'patents', 'meta'],
    news: ['site', 'news', 'meta'],
    notfound: ['site', 'meta']
  };
  renderHeader({ logo: store.get('logo') || 'assets/img/logo.png' });
  loadAll(NEEDS[PAGE] || ['site', 'meta']).then(function (d) {
    renderHeader(d.site);
    try { (pages[PAGE] || pages.notfound)(d); } catch (e) { loadFailed = true; console.error(e); }
    renderFooter(d.site, d.meta);
    errorNote();
  });
})();
