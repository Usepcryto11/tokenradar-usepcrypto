// Token Radar — the dashboard. Renders window.RADAR (written by main.ts from
// the same board.json the gate checks): the ranked board, one detail view per
// protocol, filters, and the live-token table. No fetch, no network, no
// framework. State lives in the URL hash, so a view can be linked:
//   #/protocol/<slug>            one protocol's detail view
//   #/?view=watchlist&cat=Lending&chain=Ethereum&q=foo&sort=tvl
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) { document.getElementById('rows').innerHTML = '<tr><td colspan="8">No radar data found.</td></tr>'; return; }
  var rows = R.rows, live = R.live;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function usd(n) {
    if (n == null) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n == null) return '<span class="flat">n/a</span>';
    var c = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    return '<span class="' + c + '">' + (n > 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function age(n) {
    if (n == null) return '<span class="flat">unknown</span>';
    if (n < 365) return n + 'd';
    return (n / 365).toFixed(1).replace(/\.0$/, '') + 'y';
  }
  function mult(n) { return '×' + n.toFixed(2); }

  // ---- state from the hash -----------------------------------------------
  function state() {
    var h = location.hash || '';
    var s = { q: '', cat: '', chain: '', view: 'board', sort: 'value', detail: null };
    var m = h.match(/^#\/protocol\/([A-Za-z0-9._-]+)/);
    if (m) { s.detail = m[1]; return s; }
    var q = h.replace(/^#\/\?/, '');
    if (q) q.split('&').forEach(function (kv) {
      var p = kv.split('=');
      var k = decodeURIComponent(p[0] || ''), v = decodeURIComponent(p[1] || '');
      if (k === 'q') s.q = v; else if (k === 'cat') s.cat = v;
      else if (k === 'chain') s.chain = v; else if (k === 'view') s.view = v;
      else if (k === 'sort') s.sort = v;
    });
    return s;
  }
  function pushState(s) {
    var parts = [];
    if (s.detail) { location.hash = '#/protocol/' + s.detail; return; }
    if (s.q) parts.push('q=' + encodeURIComponent(s.q));
    if (s.cat) parts.push('cat=' + encodeURIComponent(s.cat));
    if (s.chain) parts.push('chain=' + encodeURIComponent(s.chain));
    if (s.view !== 'board') parts.push('view=' + s.view);
    if (s.sort !== 'value') parts.push('sort=' + s.sort);
    var h = parts.length ? '#/?' + parts.join('&') : '#/';
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  // ---- filter + sort ------------------------------------------------------
  function filtered(s) {
    var out = rows.filter(function (r) {
      if (s.view === 'watchlist' && !r.watchlist) return false;
      if (s.cat && r.category !== s.cat) return false;
      if (s.chain && r.chains.indexOf(s.chain) < 0) return false;
      if (s.q) {
        var q = s.q.toLowerCase();
        if (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
    var by = {
      value: function (a, b) { return a.rank - b.rank; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d); },
      age: function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days); },
      name: function (a, b) { return a.name.localeCompare(b.name); },
    }[s.sort] || function (a, b) { return a.rank - b.rank; };
    return out.slice().sort(by);
  }

  // ---- render -------------------------------------------------------------
  function renderStats() {
    var total = rows.reduce(function (n, r) { return n + r.implied_value_usd; }, 0);
    var watch = rows.filter(function (r) { return r.watchlist; }).length;
    $('stats').innerHTML =
      '<div class="stat"><b>' + rows.length + '</b><span>pre-token protocols ranked</span></div>' +
      '<div class="stat"><b>' + watch + '</b><span>on the watchlist (≥ $50M TVL)</span></div>' +
      '<div class="stat"><b>' + usd(total) + '</b><span>total implied value</span></div>' +
      '<div class="stat"><b>' + R.excluded_size + '</b><span>not ranked as launches</span></div>' +
      '<div class="stat"><b>' + live.length + '</b><span>already have a token</span></div>' +
      '<div class="stat"><b>' + esc(R.as_of) + '</b><span>snapshot date</span></div>';
  }

  function rowHtml(r) {
    return '<tr data-slug="' + esc(r.slug) + '"' + (state().detail === r.slug ? ' class="sel"' : '') + '>' +
      '<td class="num">' + r.rank + '</td>' +
      '<td class="name">' + esc(r.name) + (r.watchlist ? '<span class="badge">WATCHLIST</span>' : '') +
      '<small>' + esc(r.slug) + '</small></td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td>' + esc(r.chains.slice(0, 3).join(', ') || '—') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
      '<td class="num">' + usd(r.tvl_usd) + '</td>' +
      '<td class="num">' + pct(r.change_7d) + '</td>' +
      '<td class="num">' + age(r.age_days) + '</td>' +
      '<td class="num"><strong>' + usd(r.implied_value_usd) + '</strong></td></tr>';
  }

  function renderBoard(s) {
    var list = filtered(s);
    var liveView = s.view === 'live';
    $('board').style.display = liveView ? 'none' : '';
    $('count').style.display = liveView ? 'none' : '';
    $('livebox').style.display = liveView ? '' : '';
    if (liveView) { $('empty').hidden = true; return; }
    $('rows').innerHTML = list.map(rowHtml).join('');
    $('empty').hidden = list.length > 0;
    $('count').textContent = 'Showing ' + list.length + ' of ' + rows.length + ' ranked protocols' +
      (s.view === 'watchlist' ? ' on the watchlist' : '') +
      (s.cat ? ' · category ' + s.cat : '') + (s.chain ? ' · chain ' + s.chain : '') +
      (s.q ? ' · matching "' + s.q + '"' : '') + '. Click a row for its detail view and farm plan.';
  }

  function renderDetail(s) {
    var box = $('detail');
    if (!s.detail) { box.hidden = true; box.innerHTML = ''; return; }
    var r = rows.find(function (x) { return x.slug === s.detail; });
    if (!r) { box.hidden = true; box.innerHTML = ''; return; }
    var base = r.tvl_usd * R.model.base_multiple;
    box.hidden = false;
    box.innerHTML = '<div class="card"><button class="close" id="closeDetail">Close ×</button>' +
      '<h2>#' + r.rank + ' · ' + esc(r.name) + (r.watchlist ? '<span class="badge">WATCHLIST</span>' : '') + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'no category recorded') + ' · ' +
      esc(r.chains.join(', ') || 'no chain recorded') + ' · listed ' +
      (r.listed_at ? esc(r.listed_at) : 'date unknown') + ' · records no token</p>' +
      '<p class="big">' + usd(r.implied_value_usd) + '<small>implied value — the entry\u2019s own claim</small></p>' +
      '<div class="breakdown">' +
      '<div><b>' + usd(r.tvl_usd) + '</b><span>TVL &times; 0.35 = ' + usd(base) + ' base</span></div>' +
      '<div><b>' + mult(r.category_multiplier) + '</b><span>category multiplier</span></div>' +
      '<div><b>' + mult(r.growth_multiplier) + '</b><span>growth (7d ' + (r.change_7d == null ? 'n/a' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + ')</span></div>' +
      '<div><b>' + mult(r.maturity_multiplier) + '</b><span>maturity (' + (r.age_days == null ? 'age unknown, median ' + R.median_age_days + 'd' : r.age_days + ' days') + ')</span></div>' +
      '<div><b>' + mult(r.breadth_multiplier) + '</b><span>breadth (' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ')</span></div>' +
      '</div>' +
      '<h3>Farm plan — six steps, what each costs and how long it takes</h3>' +
      '<ol>' + (r.farm_steps || []).map(function (st) { return '<li>' + esc(st) + '</li>'; }).join('') + '</ol>' +
      '<p class="note">This plan tells you how to use the protocol genuinely and track the position. It promises no token and no airdrop.</p>' +
      '</div>';
    $('closeDetail').addEventListener('click', function () {
      var s2 = state(); s2.detail = null; pushState(s2); render();
    });
    box.scrollIntoView({ block: 'start' });
  }

  function renderLive() {
    $('liverows').innerHTML = live.map(function (p) {
      return '<tr><td class="name">' + esc(p.name) + '<small>' + esc(p.slug) + '</small></td>' +
        '<td>' + esc(p.category || '—') + '</td>' +
        '<td>' + esc(p.chains.slice(0, 3).join(', ') || '—') + '</td>' +
        '<td class="num">' + usd(p.tvl_usd) + '</td>' +
        '<td class="num"><strong>' + usd(p.mcap_usd) + '</strong></td>' +
        '<td class="num">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
    $('excludedrows').innerHTML = (R.excluded || []).map(function (p) {
      return '<tr><td class="name">' + esc(p.name) + '<small>' + esc(p.slug) + '</small></td>' +
        '<td>' + esc(p.category || '—') + '</td>' +
        '<td class="num">' + usd(p.tvl_usd) + '</td>' +
        '<td>' + esc(p.reason) + '</td></tr>';
    }).join('');
  }

  function render() {
    var s = state();
    $('q').value = s.q; $('cat').value = s.cat; $('chain').value = s.chain;
    $('view').value = s.view; $('sort').value = s.sort;
    renderBoard(s);
    renderDetail(s);
  }

  // ---- controls -----------------------------------------------------------
  function fillSelects() {
    var cats = {}, chains = {};
    rows.forEach(function (r) {
      if (r.category) cats[r.category] = 1;
      r.chains.forEach(function (c) { chains[c] = 1; });
    });
    Object.keys(cats).sort().forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; $('cat').appendChild(o);
    });
    Object.keys(chains).sort().forEach(function (c) {
      var o = document.createElement('option'); o.value = c; o.textContent = c; $('chain').appendChild(o);
    });
  }
  function readControls() {
    var s = state();
    s.q = $('q').value; s.cat = $('cat').value; s.chain = $('chain').value;
    s.view = $('view').value; s.sort = $('sort').value; s.detail = null;
    pushState(s); render();
  }
  ['q', 'cat', 'chain', 'view', 'sort'].forEach(function (id) {
    $(id).addEventListener(id === 'q' ? 'input' : 'change', readControls);
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    var s = state(); s.detail = tr.getAttribute('data-slug'); pushState(s); render();
  });
  window.addEventListener('hashchange', render);

  fillSelects();
  renderStats();
  renderLive();
  render();
})();
