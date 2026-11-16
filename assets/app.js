/* Social Media Overview — interactive dashboard + flip-book report */
(async function () {
  const $ = s => document.querySelector(s);
  const C = { navy: '#1E1B4B', violet: '#5B4FD6', v2: '#7A70E0', lav: '#A79FEC', lav2: '#CFCAF6', lav3: '#ECEAFC', muted: '#6B6890', line: '#E6E4F5' };
  const PLAT_COL = { Facebook: '#6B66A8', Instagram: '#A79FEC', LinkedIn: '#2FB5A0', TikTok: '#E0457B', 'X.com': '#1E1B4B', YouTube: '#F2A443' };
  const TYPE_COL = { Article: '#1E1B4B', Carousel: '#5B4FD6', Image: '#A79FEC', 'Live Stream': '#E0457B', PDF: '#F2A443', Text: '#2FB5A0', Video: '#6B66A8' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const ICON = {
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    pct: '<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    play: '<path d="M6 4l14 8-14 8z"/>'
  };

  // ---------- data ----------
  const D = await fetch('assets/data.json').then(r => r.json());
  const N = D.eng.length, dims = D.dims;
  const PL = dims.platform, TY = dims.post_type, CAT = dims.content_category, REG = dims.region, LV = dims.engagement_level, TAG = dims.main_hashtag, CT = dims.content_type;
  const YEAR = new Int16Array(N), MON = new Int8Array(N), WD = new Int8Array(N), MI = new Int16Array(N);
  for (let i = 0; i < N; i++) {
    const v = D.date[i], y = Math.floor(v / 10000), m = Math.floor(v / 100) % 100, d = v % 100;
    YEAR[i] = y; MON[i] = m; WD[i] = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; MI[i] = (y - 2024) * 12 + (m - 1);
  }
  // timeline months with real data (the export ends on 1 May 2025, so that single day is left out of monthly trends)
  const lastFull = (() => { let mx = 0; for (let i = 0; i < N; i++) mx = Math.max(mx, D.date[i]); const y = Math.floor(mx / 10000), m = Math.floor(mx / 100) % 100, d = mx % 100; return (y - 2024) * 12 + (m - 1) - (d < 15 ? 1 : 0); })();
  const curY = 2025, maxMonCur = (() => { let m = 0; for (let i = 0; i < N; i++) if (YEAR[i] === curY) m = Math.max(m, MON[i]); return m; })();

  const state = { year: 'all', plat: -1, page: 'exec' };
  const sel = (o = {}) => {
    const year = o.year ?? state.year, plat = o.plat ?? state.plat, out = [];
    for (let i = 0; i < N; i++) {
      if (year !== 'all' && YEAR[i] !== +year) continue;
      if (plat >= 0 && D.platform[i] !== plat) continue;
      if (o.f && !o.f(i)) continue;
      out.push(i);
    }
    return out;
  };
  const sum = (ix, k) => { let s = 0; const a = D[k]; for (const i of ix) s += a[i]; return s; };
  const er = ix => { const im = sum(ix, 'impr'); return im ? sum(ix, 'eng') / im : 0; };
  const groupBy = (ix, key) => { const g = {}; for (const i of ix) { const k = typeof key === 'function' ? key(i) : D[key][i]; (g[k] = g[k] || []).push(i); } return g; };

  // year-over-year: latest year vs the same months of the year before
  function yoyPair() {
    if (state.year === '2024') return null;
    const cur = sel({ year: String(curY), f: i => MI[i] <= lastFull }), prev = sel({ year: String(curY - 1), f: i => MON[i] <= lastFull - 11 });
    return { cur, prev };
  }
  const fmt = (n, dp) => {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(dp ?? 2) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(dp ?? (a >= 1e8 ? 1 : 2)) + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(dp ?? 1) + 'K';
    return Math.round(n).toLocaleString('en-US');
  };
  const pct = (x, dp = 1) => (x * 100).toFixed(dp) + '%';
  const delta = (c, p, pts) => {
    if (p == null) return '<span class="d na">no prior year</span>';
    const v = pts ? (c - p) * 100 : (c / p - 1) * 100, up = v >= 0;
    return `<span class="d ${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}${pts ? ' pts' : '%'} vs LY</span>`;
  };
  function kpis(el, defs) {
    const pair = yoyPair(), all = sel();
    $(el).innerHTML = defs.map(d => {
      const val = d.f(all), c = pair ? d.f(pair.cur) : null, p = pair ? d.f(pair.prev) : null;
      return `<div class="kpi"><div class="top"><span class="ic"><svg viewBox="0 0 24 24">${ICON[d.icon]}</svg></span><span class="lb">${d.label}</span></div>
        <div class="row"><span class="v">${d.fmt(val)}</span>${delta(c, pair ? p : null, d.pts)}</div></div>`;
    }).join('');
  }
  const M = { posts: ix => ix.length, reach: ix => sum(ix, 'views'), impr: ix => sum(ix, 'impr'), eng: ix => sum(ix, 'eng'), er,
    likes: ix => sum(ix, 'likes'), shares: ix => sum(ix, 'shares'), comments: ix => sum(ix, 'comments'),
    avv: ix => { let s = 0, n = 0; for (const i of ix) if (D.vviews[i] > 0) { s += D.vviews[i]; n++; } return n ? s / n : 0; } };

  // ---------- charts ----------
  const charts = {};
  function ch(id) { if (!charts[id]) charts[id] = echarts.init(document.getElementById(id), null, { renderer: 'svg' }); return charts[id]; }
  const base = { textStyle: { fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', color: C.muted },
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: C.line, textStyle: { color: '#24204F' }, extraCssText: 'box-shadow:0 6px 20px rgba(40,30,120,.12);border-radius:10px' } };
  const axis = { axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false }, axisLabel: { color: C.muted, fontSize: 11 }, splitLine: { lineStyle: { color: '#F0EEFA' } } };
  function set(id, opt) { ch(id).setOption(Object.assign({}, base, opt), true); }
  const platClick = id => { ch(id).off('click'); ch(id).on('click', p => { const k = PL.indexOf(p.name ?? p.seriesName); if (k >= 0) setPlat(state.plat === k ? -1 : k); }); };
  const small = () => window.innerWidth < 600;
  const dim = (name) => state.plat >= 0 && PL[state.plat] !== name;

  function renderExec() {
    kpis('#kExec', [
      { label: 'Total Reach', icon: 'eye', f: M.reach, fmt: v => fmt(v) },
      { label: 'Impressions', icon: 'spark', f: M.impr, fmt: v => fmt(v) },
      { label: 'Engagements', icon: 'heart', f: M.eng, fmt: v => fmt(v) },
      { label: 'Posts Published', icon: 'grid', f: M.posts, fmt: v => v.toLocaleString('en-US') },
      { label: 'Engagement Rate', icon: 'pct', f: M.er, fmt: v => pct(v), pts: true }]);
    // trend: 2025 vs 2024 by month
    const ix = sel({ year: 'all' }), byM = groupBy(ix, i => MI[i]);
    const s24 = MONTHS.map((_, m) => +(sum(byM[m] || [], 'eng') / 1e6).toFixed(1));
    const s25 = MONTHS.map((_, m) => (12 + m <= lastFull ? +(sum(byM[12 + m] || [], 'eng') / 1e6).toFixed(1) : null));
    set('cTrend', { tooltip: { ...base.tooltip, trigger: 'axis', valueFormatter: v => v == null ? '–' : v + 'M' },
      legend: { right: 0, top: 0, icon: 'circle', textStyle: { color: C.muted } }, grid: { left: 40, right: 16, top: 34, bottom: 26 },
      xAxis: { type: 'category', data: MONTHS, ...axis, boundaryGap: false }, yAxis: { type: 'value', scale: true, ...axis, axisLabel: { ...axis.axisLabel, formatter: '{value}M' } },
      series: [
        { name: '2024', type: 'line', data: s24, smooth: true, symbolSize: 6, lineStyle: { type: 'dashed', color: C.lav, width: 2 }, itemStyle: { color: C.lav }, label: { show: true, position: 'bottom', fontSize: 10, color: C.muted } },
        { name: '2025', type: 'line', data: s25, smooth: true, symbolSize: 8, lineStyle: { color: C.violet, width: 3 }, itemStyle: { color: C.violet }, areaStyle: { color: 'rgba(91,79,214,.15)' }, label: { show: true, position: 'top', fontSize: 10, fontWeight: 700, color: C.navy } }] });
    // platform share (all platforms, year filter only)
    const yIx = sel({ plat: -1 }), byP = groupBy(yIx, 'platform');
    const share = PL.map((p, k) => ({ name: p, value: sum(byP[k] || [], 'views'), itemStyle: { color: PLAT_COL[p], opacity: dim(p) ? .25 : 1 } })).sort((a, b) => b.value - a.value);
    set('cShare', { tooltip: { ...base.tooltip, formatter: p => `${p.name}<br><b>${fmt(p.value)}</b> reach · ${p.percent}%` },
      series: [{ type: 'pie', radius: small() ? ['34%', '54%'] : ['48%', '72%'], center: ['50%', '54%'], data: share, label: { formatter: small() ? '{b}\n{d}%' : '{b} {d}%', fontSize: small() ? 10 : 11, color: '#3b3766' }, labelLine: { length: 8, length2: 8 } }] });
    platClick('cShare');
    // content mix
    const byT = groupBy(sel(), 'ctype');
    const mix = CT.map((t, k) => ({ name: t, value: sum(byT[k] || [], 'eng') }));
    set('cMix', { tooltip: { ...base.tooltip, formatter: p => `${p.name}<br><b>${fmt(p.value)}</b> engagements · ${p.percent}%` },
      color: [C.navy, C.v2], series: [{ type: 'pie', radius: small() ? ['36%', '56%'] : ['50%', '74%'], center: ['50%', '52%'], data: mix, label: { formatter: '{b}\n{d}%', fontSize: 12, color: '#3b3766' } }] });
    // country table
    const pair = yoyPair(), all = sel(), tot = sum(all, 'eng'), byR = groupBy(all, 'region');
    const pc = pair ? groupBy(pair.cur, 'region') : null, pp = pair ? groupBy(pair.prev, 'region') : null;
    const rows = REG.map((r, k) => { const e = sum(byR[k] || [], 'eng'); return { r, e, yoy: pair ? sum(pc[k] || [], 'eng') / sum(pp[k] || [], 'eng') - 1 : null, sh: e / tot, k }; }).sort((a, b) => b.e - a.e);
    const mx = rows[0].e;
    const months = []; for (let m = 0; m <= lastFull; m++) months.push(m);
    const sparkFor = k => { const g = groupBy(sel({ year: 'all', f: i => D.region[i] === k }), i => MI[i]); const v = months.map(m => sum(g[m] || [], 'eng')); const lo = Math.min(...v), hi = Math.max(...v);
      const pts = v.map((x, j) => `${(j / (v.length - 1) * 118 + 1).toFixed(1)},${(22 - (x - lo) / (hi - lo || 1) * 20).toFixed(1)}`).join(' ');
      return `<svg class="spark" width="120" height="24" viewBox="0 0 120 24"><polyline points="${pts}" fill="none" stroke="${C.violet}" stroke-width="1.6"/></svg>`; };
    $('#tCountry').innerHTML = `<thead><tr><th>Country</th><th>Engagements</th><th>Δ YoY</th><th>% Total</th><th>Monthly trend</th></tr></thead><tbody>` +
      rows.map(x => `<tr><td class="c">${x.r}</td><td class="bar"><i style="width:${(x.e / mx * 100).toFixed(1)}%"></i><span>${fmt(x.e)}</span></td>
        <td>${x.yoy == null ? '<span class="d na">–</span>' : `<span class="d ${x.yoy >= 0 ? 'up' : 'dn'}">${x.yoy >= 0 ? '▲' : '▼'} ${Math.abs(x.yoy * 100).toFixed(1)}%</span>`}</td>
        <td>${pct(x.sh)}</td><td>${sparkFor(x.k)}</td></tr>`).join('') + '</tbody>';
  }

  function renderContent() {
    kpis('#kContent', [
      { label: 'Likes', icon: 'heart', f: M.likes, fmt: v => fmt(v) },
      { label: 'Shares', icon: 'share', f: M.shares, fmt: v => fmt(v) },
      { label: 'Comments', icon: 'chat', f: M.comments, fmt: v => fmt(v) },
      { label: 'Avg. Video Views', icon: 'play', f: M.avv, fmt: v => fmt(v) }]);
    const ix = sel(), avg = er(ix);
    const byC = groupBy(ix, 'cat');
    const cats = CAT.map((c, k) => ({ c, v: er(byC[k] || []) })).sort((a, b) => a.v - b.v);
    set('cCat', { tooltip: { ...base.tooltip, formatter: p => `${p.name}<br><b>${pct(p.value / 100)}</b> engagement rate` },
      grid: { left: 120, right: 50, top: 26, bottom: 24 }, xAxis: { type: 'value', ...axis, axisLabel: { ...axis.axisLabel, formatter: '{value}%' } },
      yAxis: { type: 'category', data: cats.map(x => x.c), ...axis, axisLabel: { color: '#3b3766', fontWeight: 600 } },
      series: [{ type: 'bar', barWidth: 16, data: cats.map(x => ({ value: +(x.v * 100).toFixed(1), itemStyle: { color: x.v >= avg ? C.navy : C.lav, borderRadius: [0, 6, 6, 0] } })),
        label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11, color: C.muted },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: C.violet, type: 'dashed' }, label: { formatter: 'Avg ' + pct(avg), color: C.violet, fontSize: 11 }, data: [{ xAxis: +(avg * 100).toFixed(1) }] } }] });
    const byL = groupBy(ix, 'level'), order = ['High', 'Medium', 'Low'], lcol = { High: C.navy, Medium: C.violet, Low: C.lav2 };
    set('cLevel', { tooltip: { ...base.tooltip, formatter: p => `${p.name}<br><b>${p.value.toLocaleString('en-US')}</b> posts · ${p.percent}%` },
      title: { text: ix.length.toLocaleString('en-US'), subtext: 'posts', left: 'center', top: '42%', textStyle: { fontSize: 26, fontWeight: 800, color: C.navy }, subtextStyle: { color: C.muted }, itemGap: 2 },
      series: [{ type: 'pie', radius: small() ? ['42%', '60%'] : ['55%', '75%'], data: order.map(l => ({ name: l, value: (byL[LV.indexOf(l)] || []).length, itemStyle: { color: lcol[l] } })), label: { formatter: '{b} {d}%', fontSize: 11 } }] });
    const byH = groupBy(ix, 'tag');
    const tags = TAG.map((t, k) => ({ t, v: er(byH[k] || []), n: (byH[k] || []).length })).filter(x => x.n).sort((a, b) => b.v - a.v).slice(0, 8).reverse();
    set('cTags', { tooltip: { ...base.tooltip, formatter: p => `${p.name}<br><b>${p.value}%</b> engagement rate` },
      grid: { left: 118, right: 46, top: 6, bottom: 24 }, xAxis: { type: 'value', ...axis, axisLabel: { ...axis.axisLabel, formatter: '{value}%' } },
      yAxis: { type: 'category', data: tags.map(x => x.t), ...axis, axisLabel: { color: '#3b3766', fontSize: 11 } },
      series: [{ type: 'bar', barWidth: 13, data: tags.map(x => +(x.v * 100).toFixed(1)), itemStyle: { color: C.violet, borderRadius: [0, 5, 5, 0] }, label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10, color: C.muted } }] });
    const byF = groupBy(ix, 'ptype');
    const fm = TY.map((t, k) => ({ t, v: er(byF[k] || []), n: (byF[k] || []).length })).filter(x => x.n).sort((a, b) => b.v - a.v);
    const shades = ['#1E1B4B', '#3A3480', '#5B4FD6', '#7A70E0', '#A79FEC', '#BDB6F2', '#CFCAF6'];
    set('cFormat', { tooltip: { ...base.tooltip, formatter: p => `${p.name}<br><b>${p.value}%</b> engagement rate` },
      grid: { left: 40, right: 8, top: 24, bottom: 40 }, xAxis: { type: 'category', data: fm.map(x => x.t), ...axis, axisLabel: { ...axis.axisLabel, interval: 0, rotate: 30 } },
      yAxis: { type: 'value', ...axis, axisLabel: { ...axis.axisLabel, formatter: '{value}%' } },
      series: [{ type: 'bar', barWidth: '58%', data: fm.map((x, j) => ({ value: +(x.v * 100).toFixed(1), itemStyle: { color: shades[j], borderRadius: [6, 6, 0, 0] } })), label: { show: true, position: 'top', formatter: '{c}%', fontSize: 10, fontWeight: 700, color: C.navy } }] });
    const hours = []; for (let h = 8; h <= 19; h++) hours.push(h);
    const byWH = groupBy(ix.filter(i => D.hour[i] >= 8 && D.hour[i] <= 19), i => WD[i] * 100 + D.hour[i]);
    const heat = [];
    DAYS.forEach((_, w) => hours.forEach((h, j) => { const g = byWH[w * 100 + h]; if (!g) return; const v = +(er(g) * 100).toFixed(1); heat.push([j, w, v]); }));
    const vals = heat.map(x => x[2]);
    set('cHeat', { tooltip: { ...base.tooltip, formatter: p => `${DAYS[p.value[1]]} ${hours[p.value[0]]}:00<br><b>${p.value[2]}%</b> engagement rate` },
      grid: { left: 36, right: 6, top: 6, bottom: 60 }, xAxis: { type: 'category', data: hours.map(h => h + ':00'), ...axis, splitArea: { show: false }, axisLabel: { ...axis.axisLabel, fontSize: 9, rotate: 45 } },
      yAxis: { type: 'category', data: DAYS, inverse: true, ...axis },
      visualMap: { min: Math.min(...vals), max: Math.max(...vals), orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, itemWidth: 10, text: ['High', 'Low'], textStyle: { color: C.muted, fontSize: 10 }, inRange: { color: ['#F1EFFC', '#A79FEC', '#3A3480'] } },
      series: [{ type: 'heatmap', data: heat, itemStyle: { borderColor: '#fff', borderWidth: 1 }, emphasis: { itemStyle: { borderColor: C.navy, borderWidth: 2 } } }] });
  }

  function renderPlatform() {
    kpis('#kPlat', [
      { label: 'Posts Published', icon: 'grid', f: M.posts, fmt: v => v.toLocaleString('en-US') },
      { label: 'Impressions', icon: 'eye', f: M.impr, fmt: v => fmt(v) },
      { label: 'Engagements', icon: 'heart', f: M.eng, fmt: v => fmt(v) },
      { label: 'Engagement Rate', icon: 'pct', f: M.er, fmt: v => pct(v), pts: true }]);
    // ranking over time (all platforms)
    const yIx = sel({ plat: -1 }), mList = [...new Set(yIx.map(i => MI[i]))].filter(m => m <= lastFull).sort((a, b) => a - b);
    const byPM = groupBy(yIx, i => D.platform[i] * 100 + MI[i]);
    const ranks = {}; PL.forEach(p => ranks[p] = []);
    mList.forEach(m => { const v = PL.map((p, k) => ({ p, e: sum(byPM[k * 100 + m] || [], 'eng') })).sort((a, b) => b.e - a.e); v.forEach((x, r) => ranks[x.p].push({ value: r + 1, e: x.e })); });
    const mLab = mList.map(m => MONTHS[m % 12] + (mList.length > 12 ? " '" + String(24 + Math.floor(m / 12)) : ''));
    set('cRank', { tooltip: { ...base.tooltip, trigger: 'item', formatter: p => `${p.seriesName} · ${p.name}<br>Rank <b>#${p.value}</b> · ${fmt(p.data.e)} engagements` },
      legend: { top: 0, icon: 'circle', textStyle: { color: C.muted, fontSize: 11 } }, grid: { left: 30, right: 16, top: 40, bottom: 26 },
      xAxis: { type: 'category', data: mLab, ...axis, boundaryGap: false }, yAxis: { type: 'value', inverse: true, min: 1, max: 6, interval: 1, ...axis, axisLabel: { ...axis.axisLabel, formatter: '#{value}' } },
      series: PL.map(p => ({ name: p, type: 'line', data: ranks[p], smooth: .3, symbolSize: 9, lineStyle: { width: dim(p) ? 1.5 : 4, color: PLAT_COL[p], opacity: dim(p) ? .25 : 1 }, itemStyle: { color: PLAT_COL[p], opacity: dim(p) ? .25 : 1 } })) });
    platClick('cRank');
    // bubble
    const byP = groupBy(yIx, 'platform'), pts = PL.map((p, k) => { const g = byP[k] || []; return { name: p, value: [sum(g, 'impr') / 1e9, +(er(g) * 100).toFixed(2), g.length] }; });
    const avgX = pts.reduce((s, x) => s + x.value[0], 0) / pts.length, avgY = er(yIx) * 100, maxN = Math.max(...pts.map(x => x.value[2]));
    set('cBubble', { tooltip: { ...base.tooltip, formatter: p => `<b>${p.name}</b><br>Impressions ${p.value[0].toFixed(2)}B<br>Engagement rate ${p.value[1]}%<br>${p.value[2].toLocaleString('en-US')} posts` },
      grid: { left: 52, right: 24, top: 20, bottom: 40 },
      xAxis: { type: 'value', name: 'Total impressions', nameLocation: 'middle', nameGap: 26, ...axis, axisLabel: { ...axis.axisLabel, formatter: v => v.toFixed(1) + 'B' } },
      yAxis: { type: 'value', name: 'Engagement rate', nameLocation: 'middle', nameGap: 40, scale: true, min: v => +(v.min - .1).toFixed(1), max: v => +(v.max + .1).toFixed(1), ...axis, axisLabel: { ...axis.axisLabel, formatter: v => v.toFixed(1) + '%' } },
      series: [{ type: 'scatter', data: pts.map(x => ({ ...x, itemStyle: { color: PLAT_COL[x.name], opacity: dim(x.name) ? .2 : .85 } })), symbolSize: d => 14 + 40 * Math.sqrt(d[2] / maxN),
        label: { show: true, formatter: '{b}', position: 'left', distance: 6, fontSize: 10, color: '#3b3766' },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: C.lav, type: 'dashed' }, label: { fontSize: 10, color: C.muted }, data: [{ xAxis: +avgX.toFixed(2), label: { formatter: 'Avg reach' } }, { yAxis: +avgY.toFixed(2), label: { formatter: 'Avg ER' } }] } }] });
    platClick('cBubble');
    // format mix (100% stacked)
    const byPT = groupBy(yIx, i => D.platform[i] * 10 + D.ptype[i]);
    const order = PL.slice().sort((a, b) => (byP[PL.indexOf(b)] || []).length - (byP[PL.indexOf(a)] || []).length);
    set('cFmtMix', { tooltip: { ...base.tooltip, formatter: p => `${p.name} · ${p.seriesName}<br><b>${p.value}%</b> of posts` },
      legend: { top: 0, icon: 'circle', textStyle: { color: C.muted, fontSize: 11 } }, grid: { left: 76, right: 14, top: 46, bottom: 24 },
      xAxis: { type: 'value', max: 100, ...axis, axisLabel: { ...axis.axisLabel, formatter: '{value}%' } }, yAxis: { type: 'category', data: order, inverse: true, ...axis, axisLabel: { color: '#3b3766', fontWeight: 600 } },
      series: TY.map((t, ti) => ({ name: t, type: 'bar', stack: 's', barWidth: 18, itemStyle: { color: TYPE_COL[t] },
        data: order.map(p => { const k = PL.indexOf(p), n = (byP[k] || []).length; return n ? +(((byPT[k * 10 + ti] || []).length / n) * 100).toFixed(2) : 0; }),
        label: { show: true, formatter: p => p.value >= 8 ? p.value.toFixed(1) + '%' : '', fontSize: 10, color: '#fff' } })) });
    // clicks & CTR
    const withC = PL.map((p, k) => ({ p, g: (byP[k] || []).filter(i => D.clicks[i] >= 0) })).filter(x => x.g.length);
    withC.forEach(x => { x.c = sum(x.g, 'clicks'); x.ctr = x.c / sum(x.g, 'impr'); }); withC.sort((a, b) => b.c - a.c);
    set('cClicks', { tooltip: { ...base.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, right: 0, icon: 'circle', textStyle: { color: C.muted, fontSize: 11 } }, grid: { left: 48, right: 52, top: 40, bottom: 26 },
      xAxis: { type: 'category', data: withC.map(x => x.p), ...axis, axisLabel: { color: '#3b3766', fontWeight: 700 } },
      yAxis: [{ type: 'value', ...axis, axisLabel: { ...axis.axisLabel, formatter: v => fmt(v, 0) } }, { type: 'value', min: v => Math.max(0, +(v.min - .4).toFixed(1)), max: v => +(v.max + .1).toFixed(1), ...axis, splitLine: { show: false }, axisLabel: { ...axis.axisLabel, formatter: v => v.toFixed(1) + '%' } }],
      series: [
        { name: 'Total Clicks', type: 'bar', barWidth: '42%', data: withC.map(x => ({ value: x.c, itemStyle: { color: PLAT_COL[x.p], borderRadius: [6, 6, 0, 0], opacity: dim(x.p) ? .25 : 1 } })), label: { show: true, position: 'top', formatter: p => fmt(p.value), fontSize: 11, fontWeight: 700, color: C.navy }, tooltip: { valueFormatter: v => fmt(v) } },
        { name: 'Click-Through Rate', type: 'line', yAxisIndex: 1, data: withC.map(x => +(x.ctr * 100).toFixed(2)), smooth: true, symbolSize: 9, lineStyle: { color: C.violet, width: 3 }, itemStyle: { color: C.violet }, label: { show: true, formatter: '{c}%', fontSize: 11, color: C.violet }, tooltip: { valueFormatter: v => v + '%' } }] });
    platClick('cClicks');
  }

  // ---------- dashboard wiring ----------
  const PAGES = { exec: ['Executive Overview', 'Social media performance at a glance', renderExec],
    content: ['Content Insights', 'Which topics, formats, hashtags and hours drive engagement', renderContent],
    platform: ['Platform Performance', 'Volume, reach and efficiency across 6 platforms', renderPlatform] };
  PL.forEach((p, k) => $('#fPlat').insertAdjacentHTML('beforeend', `<option value="${k}">${p}</option>`));
  function render() {
    const P = PAGES[state.page]; $('#pageTitle').textContent = P[0]; $('#pageSub').textContent = P[1];
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.page === state.page));
    document.querySelectorAll('.page').forEach(p => p.hidden = p.dataset.page !== state.page);
    P[2](); requestAnimationFrame(() => Object.values(charts).forEach(c => c.resize()));
  }
  function setPlat(k) { state.plat = k; $('#fPlat').value = String(k); render(); }
  $('#fYear').addEventListener('change', e => { state.year = e.target.value; render(); });
  $('#fPlat').addEventListener('change', e => setPlat(+e.target.value));
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { state.page = b.dataset.page; location.hash = 'dashboard/' + state.page; }));
  window.addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));
  $('#dataNote').textContent = `Data: ${N.toLocaleString('en-US')} posts published between 1 Jan 2024 and 1 May 2025. “vs LY” compares Jan–${MONTHS[lastFull - 12]} ${curY} with the same months of ${curY - 1}. Engagement rate = engagements ÷ impressions.`;

  // home stats
  const allIx = sel({ year: 'all', plat: -1 });
  $('#homeStats').innerHTML = [[fmt(M.reach(allIx)), 'total reach'], [fmt(M.impr(allIx)), 'impressions'], [fmt(M.eng(allIx)), 'engagements'], [N.toLocaleString('en-US'), 'posts analysed'], [pct(er(allIx)), 'engagement rate']]
    .map(x => `<div class="hs"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');

  // ---------- report flip-book ----------
  let book = null;
  const PAGES_IMG = Array.from({ length: 12 }, (_, i) => `report/p${String(i + 1).padStart(2, '0')}.jpg`);
  function initBook() {
    if (book) return;
    const host = $('#book');
    host.innerHTML = PAGES_IMG.map((src, i) => `<div class="pg" data-density="${i === 0 || i === PAGES_IMG.length - 1 ? 'hard' : 'soft'}"><img src="${src}" alt="Report page ${i + 1}" loading="eager" decoding="async"></div>`).join('');
    const mh = Math.max(362, Math.min(792, window.innerHeight - 230)), mw = Math.round(mh * 612 / 792);
    host.style.maxWidth = (mw * 2) + 'px';
    book = new St.PageFlip(host, { width: 612, height: 792, size: 'stretch', minWidth: 280, maxWidth: mw, minHeight: 362, maxHeight: mh,
      showCover: true, maxShadowOpacity: .45, mobileScrollSupport: true, usePortrait: true, flippingTime: 800 });
    book.loadFromHTML(host.querySelectorAll('.pg'));
    const info = () => { const i = book.getCurrentPageIndex(), n = book.getPageCount();
      $('#bInfo').textContent = i === 0 ? 'Cover' : i >= n - 1 ? 'Back cover' : book.getOrientation() === 'portrait' ? `Page ${i + 1} of ${n - 1}` : `Pages ${i + 1}–${Math.min(i + 2, n - 1)}`; };
    book.on('flip', info); book.on('changeOrientation', info); info();
    $('#bPrev').onclick = () => book.flipPrev(); $('#bNext').onclick = () => book.flipNext();
    document.addEventListener('keydown', e => { if ($('#sec-report').hidden) return; if (e.key === 'ArrowLeft') book.flipPrev(); if (e.key === 'ArrowRight') book.flipNext(); });
  }

  // ---------- routing ----------
  function route() {
    const h = (location.hash || '#home').slice(1).split('/'), sec = ['home', 'dashboard', 'report'].includes(h[0]) ? h[0] : 'home';
    ['home', 'dashboard', 'report'].forEach(s => $('#sec-' + s).hidden = s !== sec);
    document.querySelectorAll('.mainnav a').forEach(a => a.classList.toggle('on', a.dataset.sec === sec));
    if (sec === 'dashboard') { if (PAGES[h[1]]) state.page = h[1]; render(); }
    if (sec === 'report') initBook();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route); route();
})();
