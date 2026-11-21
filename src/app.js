(function () {
  'use strict';

  var root = document.getElementById('app');
  var TEAL = '#1B7F79';
  var CORAL = '#D95F43';
  var INCOME_ORDER = ['High income', 'Upper Middle', 'Lower Middle', 'Low income'];

  var state = { income: null, region: null };
  var rows = [];

  function col(row, titleCase, upperSnake) {
    if (row[titleCase] !== undefined) { return row[titleCase]; }
    if (row[upperSnake] !== undefined) { return row[upperSnake]; }
    return row[upperSnake.toLowerCase()];
  }

  function num(v) {
    if (v === null || v === undefined || v === 'NA' || v === '') { return null; }
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function median(a) {
    if (!a.length) { return null; }
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmtPct(n) { return n === null ? 'n/a' : n.toFixed(1) + '%'; }

  // ---------- DOM helpers ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) { e.textContent = text; }
    return e;
  }

  function showError(msg) {
    root.textContent = '';
    root.appendChild(el('p', 'error', 'Unable to load data: ' + msg));
  }

  // ---------- derived data ----------
  function prepare(data) {
    return data.map(function (x) {
      return {
        city: col(x, 'Gc Ucn Mai 2025', 'GC_UCN_MAI_2025'),
        country: col(x, 'Gc Cnt Gad 2025', 'GC_CNT_GAD_2025'),
        income: col(x, 'Gc Dev Wig 2025', 'GC_DEV_WIG_2025'),
        region: col(x, 'Gc Dev Usr 2025', 'GC_DEV_USR_2025'),
        pop: num(col(x, 'Gc Pop Tot 2025', 'GC_POP_TOT_2025')),
        km2: num(col(x, 'Gc Uca Km2 2025', 'GC_UCA_KM2_2025')),
        hos: num(col(x, 'Hl Fcl Hos 2024', 'HL_FCL_HOS_2024')),
        pha: num(col(x, 'Hl Fcl Pha 2024', 'HL_FCL_PHA_2024')),
        shpHos: num(col(x, 'Hl Shp Hos 2025', 'HL_SHP_HOS_2025')),
        shpPha: num(col(x, 'Hl Shp Pha 2025', 'HL_SHP_PHA_2025'))
      };
    });
  }

  function filtered() {
    return rows.filter(function (r) {
      if (state.income && r.income !== state.income) { return false; }
      if (state.region && r.region !== state.region) { return false; }
      return true;
    });
  }

  function hosPer100k(r) {
    return (r.hos !== null && r.pop) ? r.hos / r.pop * 100000 : null;
  }

  function nonNull(arr) { return arr.filter(function (v) { return v !== null; }); }

  // ---------- panels ----------
  function card(title, desc, extraCls) {
    var c = el('div', 'card ' + (extraCls || ''));
    if (title) { c.appendChild(el('h2', null, title)); }
    if (desc) { c.appendChild(el('p', 'desc', desc)); }
    return c;
  }

  function kpi(value, label) {
    var c = el('div', 'card kpi');
    var v = el('div', 'kpi-val');
    if (Array.isArray(value)) {
      value.forEach(function (part) {
        var sp = el('span', part.cls || null, part.text);
        v.appendChild(sp);
      });
    } else {
      v.textContent = value;
    }
    c.appendChild(v);
    var l = el('div', 'kpi-lbl');
    if (Array.isArray(label)) {
      label.forEach(function (part) {
        l.appendChild(el('span', part.cls || null, part.text));
      });
    } else {
      l.textContent = label;
    }
    c.appendChild(l);
    return c;
  }

  function buildKpis(data) {
    var strip = el('div', 'kpis');
    var shp = nonNull(data.map(function (r) { return r.shpHos; }));
    strip.appendChild(kpi(fmtInt(data.length), 'Urban Centres'));
    strip.appendChild(kpi(shp.length ? fmtPct(median(shp)) : 'n/a', 'Median Within 1 km'));

    var hi = nonNull(rows.filter(function (r) { return r.income === 'High income'; }).map(function (r) { return r.shpHos; }));
    var lo = nonNull(rows.filter(function (r) { return r.income === 'Low income'; }).map(function (r) { return r.shpHos; }));
    strip.appendChild(kpi([
      { text: fmtPct(median(hi)), cls: 'hi' },
      { text: ' vs. ', cls: 'vs' },
      { text: fmtPct(median(lo)), cls: 'lo' }
    ], [
      { text: 'High', cls: 'hi' },
      { text: ' vs. ' },
      { text: 'Low', cls: 'lo' },
      { text: ' Income' }
    ]));

    var unm = data.length ? 100 * (data.length - shp.length) / data.length : 0;
    strip.appendChild(kpi(fmtPct(unm), 'Cities Unmapped'));
    return strip;
  }

  // Panel 1: butterfly of hospitals per 100k (left) and % within 1 km (right)
  function buildButterfly() {
    var c = card('1. Wealth vs. Walkability', 'Richer cities have more hospitals per person, yet fewer residents live within 1 km of one. Median by income group.');
    var items = INCOME_ORDER.map(function (g) {
      var sub = rows.filter(function (r) { return r.income === g; });
      return {
        name: g,
        supply: median(nonNull(sub.map(hosPer100k))),
        walk: median(nonNull(sub.map(function (r) { return r.shpHos; })))
      };
    });
    var maxS = Math.max.apply(null, items.map(function (i) { return i.supply || 0; })) || 1;
    var maxW = Math.max.apply(null, items.map(function (i) { return i.walk || 0; })) || 1;

    var W = 520, H = 170, lab = 100, mid = lab + 190, rowH = 38, top = 28;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
    s.appendChild(svg('text', { x: mid - 8, y: 14, 'text-anchor': 'end', 'class': 'axis' }, 'Hospitals per 100k'));
    s.appendChild(svg('text', { x: mid + 8, y: 14, 'class': 'axis' }, '% Within 1 km'));

    items.forEach(function (it, i) {
      var y = top + i * rowH;
      var selected = state.income === it.name;
      var dim = state.income && !selected;
      var g = svg('g', { 'class': 'click' + (dim ? ' dim' : ''), 'data-income': it.name });
      g.appendChild(svg('text', { x: lab - 8, y: y + 16, 'text-anchor': 'end', 'class': 'lbl' + (selected ? ' sel' : '') }, it.name));
      var sw = (it.supply || 0) / maxS * 150;
      var ww = (it.walk || 0) / maxW * 190;
      g.appendChild(svg('rect', { x: mid - 2 - sw, y: y, width: sw, height: 22, fill: TEAL, rx: 2 }));
      g.appendChild(svg('text', { x: mid - 6 - sw, y: y + 16, 'text-anchor': 'end', 'class': 'val' }, it.supply === null ? 'n/a' : it.supply.toFixed(1)));
      g.appendChild(svg('rect', { x: mid + 2, y: y, width: ww, height: 22, fill: CORAL, rx: 2 }));
      g.appendChild(svg('text', { x: mid + 6 + ww, y: y + 16, 'class': 'val' }, fmtPct(it.walk)));
      g.appendChild(svg('rect', { x: 0, y: y - 4, width: W, height: rowH - 4, fill: 'transparent' }));
      g.addEventListener('click', function () {
        state.income = state.income === it.name ? null : it.name;
        render();
      });
      s.appendChild(g);
    });
    s.appendChild(svg('line', { x1: mid, y1: 22, x2: mid, y2: top + 4 * rowH - 6, stroke: '#cfc9bf' }));
    c.appendChild(s);
    return c;
  }

  // Panel 2: ranked dot plot of median % within 1 km by sub-region
  function buildDotPlot() {
    var c = card('2. Sprawl Splits the Map', 'Median % of residents within 1 km of a hospital, by world region. Car-centric Northern America and Australia & NZ rank lowest.');
    var by = {};
    rows.forEach(function (r) {
      if (r.shpHos === null || !r.region) { return; }
      (by[r.region] = by[r.region] || []).push(r.shpHos);
    });
    var items = Object.keys(by).map(function (k) { return { name: k, med: median(by[k]), n: by[k].length }; })
      .filter(function (i) { return i.n >= 10; })
      .sort(function (a, b) { return b.med - a.med; });
    var maxV = Math.max.apply(null, items.map(function (i) { return i.med; })) || 1;
    var W = 560, rowH = 22, H = 20 + items.length * rowH, lab = 230, plotW = 230;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
    items.forEach(function (it, i) {
      var y = 10 + i * rowH;
      var sprawl = it.name === 'Northern America' || it.name === 'Australia and New Zealand';
      var selected = state.region === it.name;
      var dim = state.region && !selected;
      var g = svg('g', { 'class': 'click' + (dim ? ' dim' : '') });
      g.appendChild(svg('text', { x: lab - 10, y: y + 11, 'text-anchor': 'end', 'class': 'lbl' + (selected ? ' sel' : '') }, it.name + ' (' + it.med.toFixed(1) + '%)'));
      g.appendChild(svg('line', { x1: lab, y1: y + 7, x2: lab + plotW, y2: y + 7, stroke: '#ece8e0' }));
      var cx = lab + it.med / (maxV * 1.1) * plotW;
      g.appendChild(svg('line', { x1: lab, y1: y + 7, x2: cx, y2: y + 7, stroke: sprawl ? CORAL : TEAL, 'stroke-width': 2 }));
      g.appendChild(svg('circle', { cx: cx, cy: y + 7, r: 6, fill: sprawl ? CORAL : TEAL }));
      g.appendChild(svg('rect', { x: 0, y: y - 2, width: W, height: rowH, fill: 'transparent' }));
      g.addEventListener('click', function () {
        state.region = state.region === it.name ? null : it.name;
        render();
      });
      s.appendChild(g);
      if (sprawl && it.name === 'Northern America') {
        s.appendChild(svg('text', { x: lab + plotW + 12, y: y - 2, 'class': 'note' }, '} Car-centric sprawl'));
      }
    });
    c.appendChild(s);
    return c;
  }

  // Panel 3: log-density vs % within 1 km scatter
  function buildScatter(data) {
    var c = card('3. Density Drives Proximity', 'Each dot is a city. The denser the city (log scale), the more of its residents live within 1 km of a hospital.');
    var pts = data.filter(function (r) { return r.shpHos !== null && r.km2 && r.pop; })
      .map(function (r) { return { r: r, d: r.pop / r.km2, y: r.shpHos }; });
    var W = 720, H = 190, L = 44, B = 28, T = 8, R = 16;
    var minX = 1, maxX = 100000;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
    function sx(v) { return L + (Math.log10(Math.max(v, 1)) - Math.log10(minX)) / (Math.log10(maxX) - Math.log10(minX)) * (W - L - R); }
    function sy(v) { return T + (1 - v / 100) * (H - T - B); }
    [0, 25, 50, 75, 100].forEach(function (v) {
      s.appendChild(svg('line', { x1: L, y1: sy(v), x2: W - R, y2: sy(v), stroke: '#ece8e0' }));
      s.appendChild(svg('text', { x: L - 6, y: sy(v) + 3, 'text-anchor': 'end', 'class': 'axis' }, String(v)));
    });
    [1, 10, 100, 1000, 10000, 100000].forEach(function (v) {
      s.appendChild(svg('text', { x: sx(v), y: H - 12, 'text-anchor': 'middle', 'class': 'axis' }, v.toLocaleString('en-US')));
    });
    s.appendChild(svg('text', { x: (L + W - R) / 2, y: H - 1, 'text-anchor': 'middle', 'class': 'axis' }, 'Population Density (per km², log scale)'));
    var yMid = T + (H - T - B) / 2;
    s.appendChild(svg('text', { x: 10, y: yMid, 'text-anchor': 'middle', 'class': 'axis', transform: 'rotate(-90 10 ' + yMid + ')' }, '% Within 1 km'));
    pts.forEach(function (p) {
      var hl = state.income ? p.r.income === state.income : true;
      var hr = state.region ? p.r.region === state.region : true;
      var on = hl && hr;
      var sprawl = p.r.region === 'Northern America' || p.r.region === 'Australia and New Zealand';
      var dot = svg('circle', { cx: sx(p.d), cy: sy(p.y), r: on ? 2.4 : 1.6, fill: sprawl ? CORAL : TEAL, opacity: on ? 0.55 : 0.08 });
      var t = svg('title', {}, p.r.city + ', ' + p.r.country + ' - ' + p.y.toFixed(1) + '% within 1 km, ' + fmtInt(p.d) + ' people/km²');
      dot.appendChild(t);
      s.appendChild(dot);
    });
    var named = { 'Paris': 1, 'Mumbai': 1, 'New York City': 1, 'Kinshasa': 1, 'Los Angeles': 1, 'Houston': 1 };
    // Hand-placed label offsets keep the callouts from colliding in the dense cluster.
    var offsets = {
      'Paris': { dx: -8, dy: -12, anchor: 'end' },
      'Mumbai': { dx: -8, dy: -12, anchor: 'end' },
      'Kinshasa': { dx: 8, dy: -8, anchor: 'start' },
      'New York City': { dx: -8, dy: -10, anchor: 'end' },
      'Los Angeles': { dx: -8, dy: 4, anchor: 'end' },
      'Houston': { dx: -8, dy: 14, anchor: 'end' }
    };
    pts.forEach(function (p) {
      if (named[p.r.city] && p.r.pop > 3e6) {
        var o = offsets[p.r.city];
        var cx = sx(p.d), cy = sy(p.y);
        s.appendChild(svg('circle', { cx: cx, cy: cy, r: 4, fill: 'none', stroke: '#1a1a1a', 'stroke-width': 1.2 }));
        s.appendChild(svg('line', { x1: cx, y1: cy, x2: cx + o.dx, y2: cy + o.dy - 3, stroke: '#1a1a1a', 'stroke-width': 0.6 }));
        s.appendChild(svg('text', { x: cx + o.dx, y: cy + o.dy, 'text-anchor': o.anchor, 'class': 'lbl bold' }, p.r.city + ' (' + p.y.toFixed(1) + '%)'));
      }
    });
    c.appendChild(s);
    return c;
  }

  // Panel 4: open-data coverage rate
  function buildCoverage() {
    var c = card('4. The Open-Data Blindspot', 'Share of cities with mapped facility data. Low-income cities are far less likely to appear in open data.');
    var defs = [
      { title: 'Hospitals', key: 'shpHos' },
      { title: 'Pharmacies', key: 'shpPha' }
    ];
    var groups = ['High income', 'Low income'];
    var W = 340, H = 180;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' });
    var y = 2;
    defs.forEach(function (d) {
      s.appendChild(svg('text', { x: 0, y: y + 12, 'class': 'lbl bold' }, d.title));
      y += 18;
      groups.forEach(function (g) {
        var sub = rows.filter(function (r) { return r.income === g; });
        var cov = sub.length ? 100 * sub.filter(function (r) { return r[d.key] !== null; }).length / sub.length : 0;
        var selected = state.income === g;
        var dim = state.income && !selected;
        var grp = svg('g', { 'class': 'click' + (dim ? ' dim' : '') });
        grp.appendChild(svg('text', { x: 84, y: y + 13, 'text-anchor': 'end', 'class': 'lbl' + (selected ? ' sel' : '') }, g.replace(' income', ' Income')));
        var w = cov / 100 * 190;
        grp.appendChild(svg('rect', { x: 90, y: y, width: 190, height: 18, fill: '#efebe3', rx: 2 }));
        grp.appendChild(svg('rect', { x: 90, y: y, width: w, height: 18, fill: TEAL, rx: 2 }));
        grp.appendChild(svg('text', { x: 90 + w + 5 > 250 ? 90 + w - 5 : 90 + w + 5, y: y + 13, 'text-anchor': 90 + w + 5 > 250 ? 'end' : 'start', 'class': 'val' + (90 + w + 5 > 250 ? ' inbar' : '') }, fmtPct(cov)));
        grp.appendChild(svg('rect', { x: 0, y: y - 2, width: W, height: 22, fill: 'transparent' }));
        grp.addEventListener('click', function () {
          state.income = state.income === g ? null : g;
          render();
        });
        s.appendChild(grp);
        y += 26;
      });
      y += 6;
    });
    s.appendChild(svg('text', { x: 0, y: H - 2, 'class': 'axis' }, 'Mapped Coverage Rate (%)'));
    c.appendChild(s);
    return c;
  }

  // ---------- page ----------
  function render() {
    var data = filtered();
    root.textContent = '';
    var page = el('div', 'page');

    var head = el('div', 'head');
    head.appendChild(el('h1', null, 'THE URBAN CARE PARADOX'));
    head.appendChild(el('p', null, 'Wealth builds more hospitals, but urban density puts them within walking distance (1 km)'));
    page.appendChild(head);

    if (state.income || state.region) {
      var bar = el('div', 'filterbar');
      var parts = [];
      if (state.income) { parts.push(state.income); }
      if (state.region) { parts.push(state.region); }
      bar.appendChild(el('span', null, 'Filtered: ' + parts.join(' • ')));
      var btn = el('button', null, 'Clear');
      btn.addEventListener('click', function () { state.income = null; state.region = null; render(); });
      bar.appendChild(btn);
      page.appendChild(bar);
    }

    page.appendChild(buildKpis(data));

    var mid = el('div', 'row mid');
    mid.appendChild(buildButterfly());
    mid.appendChild(buildDotPlot());
    page.appendChild(mid);

    var bot = el('div', 'row bot');
    bot.appendChild(buildScatter(data));
    bot.appendChild(buildCoverage());
    page.appendChild(bot);

    page.appendChild(el('div', 'foot', 'Source: GHSL Urban Centre Database (Copernicus / Joint Research Centre) • TidyTuesday 2026-09-29'));
    root.appendChild(page);
  }

  function boot() {
    if (!root) { return; }
    fetch('./data.json')
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status + ' loading data.json'); }
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) { throw new Error('data.json must contain a JSON array'); }
        rows = prepare(data);
        if (!rows.length) { showError('data.json contains no rows.'); return; }
        render();
      })
      .catch(function (err) {
        showError((err && err.message) || String(err));
      });
  }

  boot();
})();
