/* ===== 国民工作台 · UI 工具 ===== */
window.App = window.App || {};
(function (App) {
  const ui = {};

  /* ---------- 基础 DOM ---------- */
  ui.q = (sel, root) => (root || document).querySelector(sel);
  ui.qa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  ui.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  ui.esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Toast ---------- */
  ui.toast = function (msg, type) {
    const wrap = ui.q('#toastWrap');
    const t = ui.el(`<div class="toast ${type || ''}">${ui.esc(msg)}</div>`);
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 250); }, 2800);
  };

  /* ---------- Modal ---------- */
  ui.modal = function (opts) {
    const mask = ui.q('#modalMask'), title = ui.q('#modalTitle'), body = ui.q('#modalBody');
    title.textContent = opts.title || '提示';
    body.innerHTML = '';
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    mask.hidden = false;
    const close = () => { mask.hidden = true; if (opts.onClose) opts.onClose(); };
    ui.q('#modalClose').onclick = close;
    mask.onclick = (e) => { if (e.target === mask) close(); };
    return { close, body };
  };
  ui.confirm = function (message, okText) {
    return new Promise(res => {
      const m = ui.modal({
        title: '请确认',
        body: ui.el(`<div><p style="margin-bottom:16px">${ui.esc(message)}</p>
          <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="cNo">取消</button>
          <button class="btn" id="cYes">${ui.esc(okText || '确定')}</button></div></div>`)
      });
      ui.q('#cNo').onclick = () => { m.close(); res(false); };
      ui.q('#cYes').onclick = () => { m.close(); res(true); };
    });
  };

  /* ---------- 日期工具 ---------- */
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  ui.todayStr = function (d) { d = d || new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  ui.nowISO = function () { return new Date().toISOString(); };
  ui.parseLocal = function (s) { // 'YYYY-MM-DD' 或 'YYYY-MM-DDTHH:mm'
    if (!s) return new Date();
    if (s.length === 10) s += 'T09:00';
    return new Date(s.replace(' ', 'T'));
  };
  ui.fmtDate = function (s) { if (!s) return ''; const d = ui.parseLocal(s); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; };
  ui.fmtDateTime = function (iso) {
    const d = new Date(iso); if (isNaN(d)) return iso || '';
    return ui.todayStr(d) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  };
  ui.fmtTime = function (iso) { const d = new Date(iso); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  ui.addDays = function (date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
  ui.diffDays = function (a, b) { return Math.round((ui.parseLocal(ui.todayStr(a)) - ui.parseLocal(ui.todayStr(b))) / 86400000); };
  ui.weekRange = function (ref) { // 返回本周一~周日（含 ref）
    ref = ref || new Date();
    const d = new Date(ref); const day = (d.getDay() + 6) % 7; // 周一=0
    const mon = ui.addDays(d, -day); const sun = ui.addDays(mon, 6);
    return { start: ui.todayStr(mon), end: ui.todayStr(sun), mon, sun };
  };
  ui.monthMatrix = function (year, month) { // month 0-based
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7; // 周一为首列
    const gridStart = ui.addDays(first, -startDow);
    const cells = [];
    for (let i = 0; i < 42; i++) cells.push(ui.addDays(gridStart, i));
    return cells;
  };

  /* ---------- 等级/徽章 ---------- */
  ui.levelBadge = function (lv) {
    return lv === 'urgent' ? '<span class="badge urgent">紧急</span>'
      : lv === 'warn' ? '<span class="badge warn">重要</span>'
        : '<span class="badge gray">普通</span>';
  };
  ui.leadText = function (m) { return m == 1440 ? '提前1天' : m == 60 ? '提前1小时' : m == 30 ? '提前30分钟' : m ? '提前' + m + '分钟' : '不提醒'; };

  /* ---------- 表单解析 ---------- */
  ui.parseForm = function (root) {
    const out = {};
    ui.qa('[data-field]', root).forEach(inp => {
      const k = inp.getAttribute('data-field');
      const v = inp.type === 'checkbox' ? inp.checked : inp.value;
      out[k] = v;
    });
    return out;
  };
  ui.formFields = function (fields) { // [{field,label,type,value,opts,ph,required}]
    return fields.map(f => {
      const id = 'f_' + f.field;
      let ctrl;
      if (f.type === 'select') {
        const os = (f.options || []).map(o => `<option value="${ui.esc(o.v != null ? o.v : o)}" ${o.v == f.value || o == f.value ? 'selected' : ''}>${ui.esc(o.t != null ? o.t : o)}</option>`).join('');
        ctrl = `<select class="input" id="${id}" data-field="${f.field}">${os}</select>`;
      } else if (f.type === 'textarea') {
        ctrl = `<textarea class="input" id="${id}" data-field="${f.field}" placeholder="${ui.esc(f.ph || '')}">${ui.esc(f.value || '')}</textarea>`;
      } else {
        ctrl = `<input class="input" id="${id}" data-field="${f.field}" type="${f.type || 'text'}" value="${ui.esc(f.value || '')}" placeholder="${ui.esc(f.ph || '')}" ${f.step ? 'step="' + f.step + '"' : ''}>`;
      }
      return `<div class="field"><label>${ui.esc(f.label)}${f.required ? ' <span style="color:var(--urgent)">*</span>' : ''}</label>${ctrl}</div>`;
    }).join('');
  };

  /* ---------- SVG 图表 ---------- */
  function svgNS(tag, attrs) { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  ui.lineChart = function (container, cfg) {
    // cfg: {labels:[], series:[{name,color,data:[]}], height, yfmt}
    container.innerHTML = '';
    const W = container.clientWidth || 560, H = cfg.height || 220, padL = 42, padR = 14, padT = 14, padB = 28;
    const labels = cfg.labels, n = labels.length;
    if (!n) { container.innerHTML = '<div class="empty">暂无数据</div>'; return; }
    let max = -Infinity, min = Infinity;
    cfg.series.forEach(s => s.data.forEach(v => { if (v != null) { max = Math.max(max, v); min = Math.min(min, v); } }));
    if (!isFinite(max)) { max = 1; min = 0; }
    if (max === min) { max += 1; min = Math.max(0, min - 1); }
    const range = max - min;
    const x = i => padL + (n === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (n - 1));
    const y = v => padT + (H - padT - padB) * (1 - (v - min) / range);
    const svg = svgNS('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
    // 网格
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (H - padT - padB) * g / 4;
      const val = max - range * g / 4;
      svg.appendChild(svgNS('line', { x1: padL, y1: gy, x2: W - padR, y2: gy, stroke: '#eef1f5' }));
      const t = svgNS('text', { x: 4, y: gy + 3, fill: '#9aa7b6', 'font-size': 10 }); t.textContent = (cfg.yfmt ? cfg.yfmt(val) : Math.round(val)); svg.appendChild(t);
    }
    // x 标签（稀疏）
    const step = Math.ceil(n / 7);
    labels.forEach((lb, i) => { if (i % step === 0 || i === n - 1) { const t = svgNS('text', { x: x(i), y: H - 8, fill: '#9aa7b6', 'font-size': 10, 'text-anchor': 'middle' }); t.textContent = lb; svg.appendChild(t); } });
    // 折线
    cfg.series.forEach(s => {
      let d = '', pts = [];
      s.data.forEach((v, i) => { if (v == null) return; const px = x(i), py = y(v); pts.push([px, py]); d += (d ? ' L' : 'M') + px + ' ' + py; });
      if (d) svg.appendChild(svgNS('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
      pts.forEach(p => svg.appendChild(svgNS('circle', { cx: p[0], cy: p[1], r: 3, fill: '#fff', stroke: s.color, 'stroke-width': 2 })));
    });
    container.appendChild(svg);
    if (cfg.series.length > 1) {
      const lg = document.createElement('div'); lg.className = 'wrap'; lg.style.marginTop = '6px';
      cfg.series.forEach(s => lg.innerHTML += `<span class="flex" style="font-size:12px;color:var(--sub)"><span class="dot" style="background:${s.color}"></span>${ui.esc(s.name)}</span>`);
      container.appendChild(lg);
    }
  };
  ui.barChart = function (container, cfg) {
    // cfg:{labels:[],data:[],color,height}
    container.innerHTML = '';
    const W = container.clientWidth || 560, H = cfg.height || 200, padL = 38, padR = 10, padT = 12, padB = 26;
    const labels = cfg.labels, n = labels.length;
    if (!n) { container.innerHTML = '<div class="empty">暂无数据</div>'; return; }
    const max = Math.max(1, ...cfg.data);
    const bw = (W - padL - padR) / n * 0.6, gap = (W - padL - padR) / n;
    const svg = svgNS('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
    for (let g = 0; g <= 4; g++) { const gy = padT + (H - padT - padB) * g / 4; const val = max - max * g / 4; svg.appendChild(svgNS('line', { x1: padL, y1: gy, x2: W - padR, y2: gy, stroke: '#eef1f5' })); const t = svgNS('text', { x: 4, y: gy + 3, fill: '#9aa7b6', 'font-size': 10 }); t.textContent = Math.round(val); svg.appendChild(t); }
    labels.forEach((lb, i) => {
      const v = cfg.data[i] || 0; const bx = padL + gap * i + (gap - bw) / 2; const bh = (H - padT - padB) * v / max; const by = H - padB - bh;
      svg.appendChild(svgNS('rect', { x: bx, y: by, width: bw, height: bh, rx: 4, fill: cfg.color || '#2f6fb0' }));
      const vt = svgNS('text', { x: bx + bw / 2, y: by - 4, fill: '#6b7785', 'font-size': 10, 'text-anchor': 'middle' }); vt.textContent = (cfg.vfmt ? cfg.vfmt(v) : v); svg.appendChild(vt);
      const t = svgNS('text', { x: padL + gap * i + gap / 2, y: H - 8, fill: '#9aa7b6', 'font-size': 10, 'text-anchor': 'middle' }); t.textContent = lb; svg.appendChild(t);
    });
    container.appendChild(svg);
  };

  /* ---------- 通用导入向导（CSV/JSON 解析 + 自动映射 + 预览） ---------- */
  ui.normDate = function (v) {
    if (v == null || v === '') return '';
    let s = String(v).trim().replace(/\//g, '-');
    if (/^\d{10,13}$/.test(s)) { const n = Number(s); const d = new Date(n > 1e12 ? n : n * 1000); return isNaN(d) ? '' : ui.todayStr(d); }
    if (s.indexOf(' ') >= 0 || s.indexOf('T') >= 0) s = s.split(/[ T]/)[0];
    const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) { const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return isNaN(d) ? '' : ui.todayStr(d); }
    const d = new Date(s); return isNaN(d) ? '' : ui.todayStr(d);
  };
  ui.importWizard = function (opts) {
    const fields = opts.fields; // [{key,label,kws:[]}]
    const keys = fields.map(f => f.key);
    const normHeader = h => String(h).toLowerCase().replace(/\s+/g, '');
    function autoMap(headers) {
      const assigned = {}, map = {};
      keys.forEach(k => {
        const kws = (fields.find(f => f.key === k).kws) || [];
        const hit = headers.find(h => !assigned[h] && kws.some(kw => { const n = normHeader(kw), m = normHeader(h); return m.indexOf(n) >= 0 || n.indexOf(m) >= 0; }));
        if (hit) { map[k] = hit; assigned[hit] = true; }
      });
      return map;
    }
    function parseCSV(text) {
      const rows = []; let i = 0, field = '', row = [], inQ = false;
      while (i < text.length) {
        const c = text[i];
        if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
        else { if (c === '"') inQ = true; else if (c === ',') { row.push(field); field = ''; } else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; } else if (c !== '\r') field += c; }
        i++;
      }
      if (field.length || row.length) { row.push(field); rows.push(row); }
      const ne = rows.filter(r => r.some(c => c.trim() !== ''));
      if (!ne.length) return { headers: [], rows: [] };
      const headers = ne[0].map(h => h.trim());
      const data = ne.slice(1).map(r => { const o = {}; headers.forEach((h, idx) => o[h] = (r[idx] != null ? r[idx] : '').trim()); return o; });
      return { headers, rows: data };
    }
    function parseFile(content, name) {
      const t = (content || '').trim();
      if ((name && /\.json$/i.test(name)) || t[0] === '[' || t[0] === '{') {
        try {
          const j = JSON.parse(t);
          let arr = Array.isArray(j) ? j : (j.data && Array.isArray(j.data) ? j.data : null);
          if (!arr) { const maybe = Object.values(j).find(v => Array.isArray(v)); arr = maybe || [j]; }
          const headers = []; arr.slice(0, 300).forEach(o => Object.keys(o).forEach(k => { if (!headers.includes(k)) headers.push(k); }));
          const rows = arr.map(o => { const r = {}; headers.forEach(h => r[h] = o[h] != null ? String(o[h]) : ''); return r; });
          return { headers, rows };
        } catch (e) { /* 退化为 CSV */ }
      }
      return parseCSV(t);
    }
    const { headers, rows } = parseFile(opts.content, opts.name);
    if (!rows.length) { ui.toast('未解析到数据行', 'err'); return; }
    const map = autoMap(headers);
    const optsHTML = sel => `<option value="">— 忽略 —</option>` + headers.map(h => `<option value="${ui.esc(h)}" ${map[sel] === h ? 'selected' : ''}>${ui.esc(h)}</option>`).join('');
    const body = ui.el(`<div>
      <p class="muted" style="margin-bottom:10px">共解析 ${rows.length} 行、${headers.length} 列。请映射字段（已自动识别，可手动调整）：</p>
      <div class="grid grid-2">${fields.map(f => `<div class="field"><label>${ui.esc(f.label)} ${opts.requireDate && f.key === 'date' ? '<span style="color:var(--urgent)">*</span>' : ''}</label><select class="input" data-map="${f.key}">${optsHTML(f.key)}</select></div>`).join('')}</div>
      <h4 style="margin:14px 0 6px">预览（前 3 行）</h4>
      <div id="prevBox" style="max-height:210px;overflow:auto"></div>
      <div class="row mt" style="justify-content:flex-end"><button class="btn" id="doImp">确认导入 ${rows.length} 行</button></div>
    </div>`);
    const mod = ui.modal({ title: '导入数据 · 字段映射', body });
    const prev = () => {
      const m = {}; fields.forEach(f => m[f.key] = ui.q(`[data-map="${f.key}"]`, body).value);
      const lines = rows.slice(0, 3).map(r => { const o = {}; fields.forEach(f => { if (m[f.key]) o[f.key] = r[m[f.key]]; }); return o; });
      ui.q('#prevBox', body).innerHTML = '<table class="table"><thead><tr>' + fields.map(f => `<th>${ui.esc(f.label)}</th>`).join('') + '</tr></thead><tbody>' + lines.map(o => `<tr>${fields.map(f => `<td>${ui.esc(o[f.key] || '')}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
    };
    fields.forEach(f => ui.q(`[data-map="${f.key}"]`, body).onchange = prev);
    prev();
    ui.q('#doImp', body).onclick = () => {
      const m = {}; fields.forEach(f => m[f.key] = ui.q(`[data-map="${f.key}"]`, body).value);
      if (opts.requireDate && !m.date) { ui.toast('请先映射「日期」列', 'err'); return; }
      rows.forEach(r => { const rec = {}; fields.forEach(f => rec[f.key] = m[f.key] ? r[m[f.key]] : ''); opts.onRow(rec); });
      mod.close(); ui.toast(`导入完成：${rows.length} 行`, 'ok'); if (opts.after) opts.after();
    };
  };
  ui.downloadCsvTemplate = function (headers, sample, filename) {
    const csv = '﻿' + headers.join(',') + '\n' + (sample ? sample.join(',') + '\n' : '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename || '导入模板.csv'; a.click();
    ui.toast('模板已下载', 'ok');
  };

  App.ui = ui;
})(window.App);
