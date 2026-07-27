/* ===== 模块二：固定时段直播自动数据分析（每日 5:50–8:30） ===== */
window.App = window.App || {};
(function (App) {
  const store = App.store, ui = App.ui;
  const FIELDS = [
    { f: 'enter', t: '进入人数', def: 1200 }, { f: 'avgWatch', t: '平均观看时长(分)', def: 3.5 },
    { f: 'peak', t: '最高在线人数', def: 180 }, { f: 'likes', t: '点赞', def: 8000 },
    { f: 'comments', t: '评论条数', def: 320 }, { f: 'fansNew', t: '新增粉丝', def: 65 },
    { f: 'lights', t: '粉丝灯牌', def: 22 }, { f: 'gift', t: '礼物收益(元)', def: 320 },
    { f: 'dm', t: '私信咨询量', def: 40 }, { f: 'legalDm', t: '法律咨询私信', def: 18 },
  ];
  const m = { tab: 'entry', compareDate: '', root: null };

  function getLive(date) { return store.get('live').find(x => x.date === date); }
  function prev7Avg(date) {
    const d0 = ui.parseLocal(date);
    const vals = {}; FIELDS.forEach(x => vals[x.f] = []);
    for (let i = 1; i <= 7; i++) {
      const dd = ui.todayStr(ui.addDays(d0, -i));
      const rec = getLive(dd); if (!rec) continue;
      FIELDS.forEach(x => { const v = Number(rec[x.f]); if (v) vals[x.f].push(v); });
    }
    const avg = {}; FIELDS.forEach(x => { const a = vals[x.f]; avg[x.f] = a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; });
    return avg;
  }

  /* ===== 第三方采集文件导入 ===== */
  const FIELD_KEYS = FIELDS.map(f => f.f).concat(['date']);
  const FIELD_LABEL = { date: '日期', enter: '进入人数', avgWatch: '平均观看时长(分)', peak: '最高在线人数', likes: '点赞', comments: '评论条数', fansNew: '新增粉丝', lights: '粉丝灯牌', gift: '礼物收益(元)', dm: '私信咨询量', legalDm: '法律咨询私信' };
  const COLMAP = {
    date: ['日期', '直播日期', '时间', 'date', 'datetime', '直播时间'],
    enter: ['进入人数', '场观', '观看人数', '观看人次', '累计观看', 'enter', 'uv', 'room_enter'],
    avgWatch: ['平均观看时长', '平均停留', '平均观看', '平均在线时长', 'avg_watch', 'avg_view'],
    peak: ['最高在线', '峰值在线', '同时在线峰值', 'peak', 'max_online'],
    likes: ['点赞', '点赞数', 'like'],
    comments: ['评论', '评论数', 'comment', '互动数'],
    fansNew: ['新增粉丝', '涨粉', '新增关注', 'fans_add', 'new_fans', 'follow'],
    lights: ['灯牌', '粉丝团', '粉丝灯牌', 'fans_club', 'medal', 'light'],
    gift: ['礼物', '礼物收益', '音浪', '抖币', 'gift', 'income', 'reward'],
    dm: ['私信', '私信量', '私信数', 'message', 'dm', 'inbox'],
    legalDm: ['法律咨询私信', '咨询私信', '法律私信', 'legal_dm']
  };
  function normHeader(h) { return String(h).toLowerCase().replace(/\s+/g, ''); }
  function autoMap(headers) {
    const assigned = {}, map = {};
    FIELD_KEYS.forEach(key => {
      const kws = COLMAP[key] || [];
      const hit = headers.find(h => !assigned[h] && kws.some(k => { const n = normHeader(k), m = normHeader(h); return m.indexOf(n) >= 0 || n.indexOf(m) >= 0; }));
      if (hit) { map[key] = hit; assigned[hit] = true; }
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
    const nonEmpty = rows.filter(r => r.some(c => c.trim() !== ''));
    if (!nonEmpty.length) return { headers: [], rows: [] };
    const headers = nonEmpty[0].map(h => h.trim());
    const data = nonEmpty.slice(1).map(r => { const o = {}; headers.forEach((h, idx) => o[h] = (r[idx] != null ? r[idx] : '').trim()); return o; });
    return { headers, rows: data };
  }
  function parseFile(content, name) {
    const t = content.trim();
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
  function normDate(v) {
    if (v == null || v === '') return '';
    let s = String(v).trim().replace(/\//g, '-');
    if (/^\d{10,13}$/.test(s)) { const n = Number(s); const d = new Date(n > 1e12 ? n : n * 1000); return isNaN(d) ? '' : ui.todayStr(d); }
    if (s.indexOf(' ') >= 0 || s.indexOf('T') >= 0) s = s.split(/[ T]/)[0];
    const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) { const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return isNaN(d) ? '' : ui.todayStr(d); }
    const d = new Date(s); return isNaN(d) ? '' : ui.todayStr(d);
  }
  function openImportModal(content, name) {
    const { headers, rows } = parseFile(content, name);
    if (!rows.length) { ui.toast('未解析到数据行', 'err'); return; }
    const map = autoMap(headers);
    const opts = (sel) => `<option value="">— 忽略 —</option>` + headers.map(h => `<option value="${ui.esc(h)}" ${map[sel] === h ? 'selected' : ''}>${ui.esc(h)}</option>`).join('');
    const body = ui.el(`<div>
      <p class="muted" style="margin-bottom:10px">共解析 ${rows.length} 行、${headers.length} 列。请把字段映射到你的导出列（已自动识别，可手动调整）：</p>
      <div class="grid grid-2" id="mapGrid">
        ${FIELD_KEYS.map(k => `<div class="field"><label>${FIELD_LABEL[k]} <span style="color:var(--urgent)">${k === 'date' ? '*' : ''}</span></label><select class="input" data-map="${k}">${opts(k)}</select></div>`).join('')}
      </div>
      <h4 style="margin:14px 0 6px">预览（前 3 行映射结果）</h4>
      <div id="prevBox" style="max-height:210px;overflow:auto"></div>
      <div class="row mt" style="justify-content:flex-end"><button class="btn" id="doImp">确认导入 ${rows.length} 行</button></div>
    </div>`);
    const mod = ui.modal({ title: '导入直播采集数据 · 字段映射', body });
    const prev = () => {
      const m = {}; FIELD_KEYS.forEach(k => m[k] = ui.q(`[data-map="${k}"]`, body).value);
      const lines = rows.slice(0, 3).map(r => { const o = {}; FIELD_KEYS.forEach(k => { if (m[k]) o[k] = r[m[k]]; }); return o; });
      ui.q('#prevBox', body).innerHTML = '<table class="table"><thead><tr>' + FIELD_KEYS.map(k => `<th>${FIELD_LABEL[k]}</th>`).join('') + '</tr></thead><tbody>' + lines.map(o => `<tr>${FIELD_LABELS(o)}</tr>`).join('') + '</tbody></table>';
    };
    const FIELD_LABELS = (o) => FIELD_KEYS.map(k => `<td>${ui.esc(o[k] || '')}</td>`).join('');
    FIELD_KEYS.forEach(k => ui.q(`[data-map="${k}"]`, body).onchange = prev);
    prev();
    ui.q('#doImp', body).onclick = () => {
      const m = {}; FIELD_KEYS.forEach(k => m[k] = ui.q(`[data-map="${k}"]`, body).value);
      if (!m.date) { ui.toast('请先把「日期」列映射出来', 'err'); return; }
      let added = 0, updated = 0;
      rows.forEach(r => {
        const date = normDate(r[m.date]); if (!date) return;
        const rec = { date, keywords: '', outline: '' };
        FIELDS.forEach(f => { const v = m[f.f] ? r[m[f.f]] : ''; rec[f.f] = Number(String(v).replace(/[, ]/g, '')) || 0; });
        const ex = getLive(date);
        if (ex) { const patch = {}; FIELDS.forEach(f => { if (rec[f.f]) patch[f.f] = rec[f.f]; }); store.update('live', ex.id, patch); updated++; }
        else { store.add('live', rec); added++; }
      });
      mod.close(); ui.toast(`导入完成：新增 ${added} 场，更新 ${updated} 场`, 'ok'); paint();
    };
  }
  function downloadTemplate() {
    const headers = FIELD_KEYS.map(k => FIELD_LABEL[k]);
    const sample = ['2026-07-27', '1200', '3.5', '180', '8000', '320', '65', '22', '320', '40', '18'];
    const csv = '﻿' + headers.join(',') + '\n' + sample.join(',') + '\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = '直播数据导入模板.csv'; a.click();
    ui.toast('模板已下载，按列填好后导入', 'ok');
  }

  function paint() {
    const r = m.root;
    r.innerHTML = `<div class="section-title">📺 直播数据分析</div>
      <div class="section-sub">每日 5:50–8:30 抖音直播全维度复盘：横向对比、下滑诊断、评论问答库、话术优化与开播提醒。</div>
      <div class="tabs">
        <button class="tab ${m.tab === 'entry' ? 'active' : ''}" data-t="entry">＋ 录入数据</button>
        <button class="tab ${m.tab === 'cmp' ? 'active' : ''}" data-t="cmp">📊 数据对比</button>
        <button class="tab ${m.tab === 'qa' ? 'active' : ''}" data-t="qa">💬 评论问答库</button>
        <button class="tab ${m.tab === 'report' ? 'active' : ''}" data-t="report">📝 复盘报告</button>
        <button class="tab ${m.tab === 'memo' ? 'active' : ''}" data-t="memo">📋 直播备忘</button>
      </div><div id="liveTab"></div>`;
    ui.qa('.tab', r).forEach(b => b.onclick = () => { m.tab = b.dataset.t; paint(); });
    const tab = ui.q('#liveTab', r);
    if (m.tab === 'entry') tabEntry(tab); else if (m.tab === 'cmp') tabCmp(tab);
    else if (m.tab === 'qa') tabQA(tab); else if (m.tab === 'report') tabReport(tab); else if (m.tab === 'memo') tabMemo(tab);
  }

  /* 录入 */
  function tabEntry(tab) {
    const date = m.compareDate || ui.todayStr();
    const rec = getLive(date) || {};
    tab.innerHTML = `<div class="grid grid-2">
      <div class="card"><h3>直播数据录入 <span class="tag">${date}</span></h3>
        <form id="lf">
          <div class="form-2">
            <div class="field"><label>直播日期</label><input class="input" type="date" data-field="date" value="${date}"/></div>
            <div class="field"><label>&nbsp;</label><button type="button" class="btn ghost" id="demo" style="width:100%">示例填充(演示)</button></div>
          </div>
          <div class="form-2">${FIELDS.map(x => `<div class="field"><label>${x.t}</label><input class="input" type="number" step="0.01" data-field="${x.f}" value="${rec[x.f] != null ? rec[x.f] : ''}"/></div>`).join('')}</div>
          <div class="field"><label>评论高频关键词（每行一个）</label><textarea class="input" data-field="keywords" placeholder="如：\n离婚财产\n工伤赔偿\n借据效力">${ui.esc(rec.keywords || '')}</textarea></div>
          <div class="row" style="justify-content:flex-end"><button type="submit" class="btn">保存数据</button></div>
        </form>
        <div class="tip mt">自动采集说明：抖音直播数据需平台开放接口/授权后自动抓取。当前提供手动录入 + 示例填充；接入开放接口后可改为「结束自动写入」。</div>
      </div>
      <div class="card"><h3>历史记录 <span class="tag">${store.get('live').length} 场</span></h3><div id="liveHist"></div></div>
    </div>`;
    const form = ui.q('#lf', tab);
    ui.q('#demo', tab).onclick = () => { FIELDS.forEach(x => { const inp = ui.q(`[data-field="${x.f}"]`, form); if (!inp.value) inp.value = Math.round(x.def * (0.7 + Math.random() * 0.6)); }); };
    form.onsubmit = (e) => {
      e.preventDefault(); const d = ui.parseForm(form);
      if (!d.date) return ui.toast('请选择日期', 'err');
      const obj = { date: d.date, keywords: d.keywords || '' };
      FIELDS.forEach(x => obj[x.f] = Number(d[x.f]) || 0);
      const ex = getLive(d.date);
      if (ex) store.update('live', ex.id, obj); else store.add('live', obj);
      // 关键词同步进问答库待整理
      syncKeywords(d.date, d.keywords || '');
      ui.toast('已保存 ' + d.date + ' 直播数据', 'ok'); paint();
    };
    renderHist(ui.q('#liveHist', tab));
    // —— 从第三方采集文件导入 ——
    tab.insertAdjacentHTML('beforeend', `<div class="card mt">
      <h3>📥 从第三方采集文件导入 <span class="tag">蝉妈妈 / 飞瓜 / 新抖 等</span></h3>
      <div class="row mb">
        <input type="file" id="liveImport" accept=".csv,.json" class="input" style="max-width:340px"/>
        <button class="btn ghost sm" id="dlTpl">下载导入模板</button>
      </div>
      <div class="tip">支持 CSV / JSON。上传后弹窗里把导出列映射到本工作台字段；按「日期」自动合并（同日覆盖更新），可与手动录入互补。</div>
    </div>`);
    ui.q('#liveImport', tab).onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { try { openImportModal(rd.result, f.name); } catch (err) { ui.toast('解析失败：' + err.message, 'err'); } };
      rd.readAsText(f); e.target.value = '';
    };
    ui.q('#dlTpl', tab).onclick = () => downloadTemplate();
  }
  function renderHist(box) {
    const list = store.get('live').slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    box.innerHTML = list.length ? '<div class="list">' + list.map(r => `<div class="list-item"><div class="li-main"><div class="li-title">${r.date} <span class="badge info">进入 ${r.enter || 0}</span> <span class="badge gray">粉丝+${r.fansNew || 0}</span> <span class="badge ok">礼物¥${r.gift || 0}</span></div><div class="li-meta">法律私信 ${r.legalDm || 0} · 平均观看 ${r.avgWatch || 0}分</div></div><button class="btn ghost sm" data-d="${r.date}">分析</button></div>`).join('') + '</div>' : '<div class="empty">暂无记录</div>';
    ui.qa('[data-d]', box).forEach(b => b.onclick = () => { m.compareDate = b.dataset.d; m.tab = 'cmp'; paint(); });
  }
  function syncKeywords(date, text) {
    const lines = (text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const ex = store.get('liveQA').map(q => q.keyword);
    lines.forEach(kw => { if (!ex.includes(kw)) store.add('liveQA', { keyword: kw, q: kw + '相关法律规定是什么？', a: '', fromDate: date, used: false }); });
  }

  /* 对比 */
  function tabCmp(tab) {
    const date = m.compareDate || ui.todayStr();
    const rec = getLive(date);
    const avg = prev7Avg(date);
    const hasPrev = FIELDS.some(x => avg[x.f] != null);
    tab.innerHTML = `<div class="card">
      <div class="row mb"><label class="muted">选择日期</label><input type="date" class="input" id="cd" value="${date}" style="max-width:180px"/>
        <span class="spacer"></span><span class="muted">对比对象：前 7 天同时间段均值</span></div>
      ${rec ? '' : '<div class="empty">该日暂无数据，请先录入</div>'}
      <div id="cmpBody"></div></div>`;
    ui.q('#cd', tab).onchange = (e) => { m.compareDate = e.target.value; paint(); };
    if (!rec) return;
    // 诊断
    const diag = [];
    FIELDS.forEach(x => {
      const a = avg[x.f]; if (a == null) return; const cur = Number(rec[x.f]) || 0; const ch = (cur - a) / a * 100;
      if (ch < -10) {
        const map = {
          enter: '进入人数下滑：封面/标题/开播推流需优化，提升初始曝光转化',
          avgWatch: '平均观看时长下滑（开场留客差）：前 30 秒未建立价值锚点，建议先用「一个真实案例+一句结论」抓人',
          peak: '最高在线下滑：峰值时段缺乏爆点，可安排在 7:00 前后上强话题',
          likes: '点赞下滑：互动指令弱，口播增加「觉得有用的扣 1」',
          comments: '评论下滑（话题吸引力不足）：选题与观众关联度低，改用「你遇到过吗」式提问',
          fansNew: '新增粉丝下滑：关注转化钩子弱，结尾缺「点关注领模板」引导',
          lights: '灯牌下滑：缺乏专属粉丝福利与点名感谢',
          gift: '礼物收益下滑：打赏意愿低，设置连麦/抽奖等感谢环节',
          dm: '私信下滑：未埋咨询钩子，口播增加「有类似问题私信我」',
          legalDm: '法律咨询私信下滑：专业引导话术可强化，口播点名高频法律问题',
        };
        diag.push({ f: x.f, ch, msg: map[x.f] });
      }
    });
    const rows = FIELDS.map(x => {
      const a = avg[x.f]; const cur = Number(rec[x.f]) || 0;
      const ch = a == null ? null : (cur - a) / a * 100;
      const cls = ch == null ? 'flat' : ch < -10 ? 'down' : ch > 5 ? 'up' : 'flat';
      return `<tr><td>${x.t}</td><td><b>${cur}</b></td><td>${a == null ? '—' : a.toFixed(1)}</td><td class="delta ${cls}">${ch == null ? '—' : (ch >= 0 ? '+' : '') + ch.toFixed(0) + '%'}</td></tr>`;
    }).join('');
    ui.q('#cmpBody', tab).innerHTML = `
      <table class="table"><thead><tr><th>指标</th><th>当日</th><th>前7日均值</th><th>环比</th></tr></thead><tbody>${rows}</tbody></table>
      <div id="cmpChart" style="margin-top:14px"></div>
      <h4 style="margin-top:16px">自动下滑诊断</h4>
      ${diag.length ? diag.map(d => `<div class="callout warn">📉 ${ui.esc(d.msg)}（${d.ch.toFixed(0)}%）</div>`).join('') : '<div class="callout">✅ 各项指标稳定或提升，保持当前节奏。</div>'}
      ${!hasPrev ? '<div class="tip">前 7 天数据不足，无法对比；持续录入后将自动生成对比。</div>' : ''}`;
    ui.barChart(ui.q('#cmpChart', tab), {
      labels: ['进入', '粉丝+', '礼物¥', '评论', '法律私信'],
      data: [rec.enter || 0, rec.fansNew || 0, rec.gift || 0, rec.comments || 0, rec.legalDm || 0],
      color: '#2f6fb0'
    });
  }

  /* 评论问答库 */
  function tabQA(tab) {
    const list = store.get('liveQA').slice().sort((a, b) => (b.fromDate || '').localeCompare(a.fromDate || ''));
    tab.innerHTML = `<div class="card">
      <div class="row mb"><h3 style="margin:0">评论高频问答库 <span class="tag">${list.length} 条</span></h3>
      <span class="spacer"></span><button class="btn sec sm" id="addQA">＋ 新增问答</button></div>
      <div class="tip mb">直播关键词自动沉淀为待整理问答，可整理成短视频选题（见抖音运营·选题库）。</div>
      <div id="qaList"></div></div>`;
    const render = () => {
      ui.q('#qaList', tab).innerHTML = list.length ? '<div class="list">' + list.map(q => `<div class="list-item">
        <div class="li-main"><div class="li-title">${ui.esc(q.keyword)} ${q.used ? '<span class="badge ok">已选题</span>' : '<span class="badge gray">待整理</span>'} <span class="muted">${q.fromDate || ''}</span></div>
        <div class="li-meta">Q：${ui.esc(q.q || '')}</div>${q.a ? `<div class="li-meta">A：${ui.esc(q.a)}</div>` : ''}</div>
        <div class="row"><button class="btn ghost sm" data-act="edit" data-id="${q.id}">完善</button><button class="btn ghost sm" data-act="use" data-id="${q.id}">转选题</button><button class="btn danger sm" data-act="del" data-id="${q.id}">删</button></div>
      </div>`).join('') + '</div>' : '<div class="empty">暂无问答，录入直播关键词后自动生成</div>';
      ui.qa('[data-act]', ui.q('#qaList', tab)).forEach(b => b.onclick = () => {
        const q = store.find('liveQA', b.dataset.id); if (!q) return;
        if (b.dataset.act === 'del') store.remove('liveQA', q.id), render();
        else if (b.dataset.act === 'use') { store.update('liveQA', q.id, { used: true }); store.add('topics', { date: ui.todayStr(), title: q.keyword + '：3分钟讲清法律要点', draft: '开头：' + q.keyword + '，很多人第一步就错了。\n正文：' + (q.a || q.q) + '\n结尾：关注王国民律师，遇到类似问题私信咨询。', hot: '直播高频', used: false }); ui.toast('已转入选题库', 'ok'); render(); }
        else editQA(q, render);
      });
    };
    ui.q('#addQA', tab).onclick = () => editQA(null, render);
    render();
  }
  function editQA(q, after) {
    const f = ui.el(`<div><form id="qf">${ui.formFields([
      { field: 'keyword', label: '关键词', type: 'text', value: q ? q.keyword : '' },
      { field: 'q', label: '常见问题', type: 'text', value: q ? q.q : '' },
    ])}<div class="field"><label>标准解答</label><textarea class="input" data-field="a" placeholder="可直接用于短视频口播/评论回复">${ui.esc(q ? q.a || '' : '')}</textarea></div>
    <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">保存</button></div></form></div>`);
    const mod = ui.modal({ title: q ? '完善问答' : '新增问答', body: f });
    ui.q('#qf', f).onsubmit = (e) => { e.preventDefault(); const d = ui.parseForm(f); if (q) store.update('liveQA', q.id, d); else store.add('liveQA', Object.assign({ fromDate: ui.todayStr(), used: false }, d)); mod.close(); ui.toast('已保存'); after(); };
  }

  /* 复盘报告 */
  function tabReport(tab) {
    const date = m.compareDate || ui.todayStr();
    const rec = getLive(date);
    tab.innerHTML = `<div class="card">
      <div class="row mb"><h3 style="margin:0">直播复盘报告 <span class="tag">${date}</span></h3>
      <span class="spacer"></span><button class="btn sec sm" id="cp">复制报告</button></div>
      <div id="rpBox"></div></div>`;
    const box = ui.q('#rpBox', tab);
    if (!rec) { box.innerHTML = '<div class="empty">该日暂无数据</div>'; return; }
    const avg = prev7Avg(date);
    const better = FIELDS.filter(x => avg[x.f] != null && (Number(rec[x.f]) || 0) >= avg[x.f] * 1.05).map(x => x.t);
    const worse = FIELDS.filter(x => avg[x.f] != null && (Number(rec[x.f]) || 0) < avg[x.f] * 0.9).map(x => x.t);
    const legalRate = rec.dm ? (rec.legalDm / rec.dm * 100).toFixed(0) : 0;
    box.innerHTML = `<div class="report">
      <h2>📺 ${date} 直播复盘报告（5:50–8:30）</h2>
      <div class="kpi-row">
        <div class="kpi"><span class="muted">进入人数</span><b>${rec.enter || 0}</b></div>
        <div class="kpi"><span class="muted">平均观看</span><b>${rec.avgWatch || 0}分</b></div>
        <div class="kpi"><span class="muted">新增粉丝</span><b>${rec.fansNew || 0}</b></div>
        <div class="kpi"><span class="muted">礼物收益</span><b>¥${rec.gift || 0}</b></div>
        <div class="kpi"><span class="muted">法律私信占比</span><b>${legalRate}%</b></div>
      </div>
      <h4>一、数据总览</h4>
      <p>本场进入 <b>${rec.enter || 0}</b> 人，平均观看 <b>${rec.avgWatch || 0}</b> 分钟，最高在线 <b>${rec.peak || 0}</b>；新增粉丝 <b>${rec.fansNew || 0}</b>、灯牌 <b>${rec.lights || 0}</b>、礼物 <b>¥${rec.gift || 0}</b>；私信 <b>${rec.dm || 0}</b> 条（其中法律咨询 <b>${rec.legalDm || 0}</b> 条，占 ${legalRate}%）。</p>
      <h4>二、亮眼与不足</h4>
      <ul>${better.length ? better.map(t => `<li class="callout" style="list-style:none">👍 ${t} 优于近 7 日均值</li>`).join('') : ''}${worse.length ? worse.map(t => `<li class="callout warn" style="list-style:none">⚠ ${t} 低于近 7 日均值，需优化</li>`).join('') : '<li>各项指标与近期持平。</li>'}</ul>
      <h4>三、话术优化建议</h4>
      <ul>
        <li>开场 30 秒固定「结论前置 + 真实案例」结构，降低跳出、提升平均观看时长。</li>
        <li>每 20 分钟设置一次互动指令（扣 1 / 投票），提升评论与停留。</li>
        <li>结尾固定引导：「点关注领离婚协议/借条模板，类似问题私信我」提升关注与法律私信转化。</li>
        <li>法律咨询私信占比 ${legalRate}%${legalRate < 30 ? '，偏低：可在口播中更明确点名高频法律问题以强化专业钩子。' : '，转化良好，保持。'}</li>
      </ul>
      <h4>四、话题排布与节奏</h4>
      <ul>
        <li>5:50–6:30 流量爬坡：安排「昨日热点法律事件」轻话题暖场。</li>
        <li>6:30–7:30 黄金段：上强干货（如工伤/婚姻财产），承接最高在线。</li>
        <li>7:30–8:30 转化段：案例复盘 + 模板福利 + 连麦答疑。</li>
      </ul>
      <h4>五、待办</h4>
      <ul><li>将本场高频关键词整理进「评论问答库 / 选题库」。</li><li>法律私信当日归类回复，沉淀标准话术。</li></ul>
    </div>`;
    ui.q('#cp', tab).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(box.innerText); ui.toast('报告已复制', 'ok'); };
  }

  /* 直播备忘 + 开播提醒 */
  function tabMemo(tab) {
    const date = m.compareDate || ui.todayStr();
    const rec = getLive(date) || {};
    const settings = store.settings();
    tab.innerHTML = `<div class="card">
      <h3>直播提纲 / 备忘 <span class="tag">${date}</span></h3>
      <div class="form-2">
        <div class="field"><label>日期</label><input class="input" type="date" id="md" value="${date}"/></div>
        <div class="field"><label>开播提醒</label><span class="badge ok">开播前 30 分钟弹窗+系统通知（${settings.liveStart}）</span></div>
      </div>
      <div class="field"><label>当日直播提纲（段落/话题顺序）</label><textarea class="input" id="outline" style="min-height:140px" placeholder="1. 开场案例\n2. 工伤赔偿三步走\n3. 连麦答疑\n4. 结尾引导关注领模板">${ui.esc(rec.outline || rec.keywords || '')}</textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" id="saveMemo">保存提纲并设提醒</button></div>
      <div class="tip mt">系统会在开播前 30 分钟（约 ${shiftMin(settings.liveStart, 30)}）自动弹窗提醒，并在工作台首页「今日提醒」置顶显示。</div>
    </div>`;
    ui.q('#md', tab).onchange = (e) => { m.compareDate = e.target.value; paint(); };
    ui.q('#saveMemo', tab).onclick = () => {
      const d = ui.q('#md', tab).value; const outline = ui.q('#outline', tab).value;
      const ex = getLive(d); if (ex) store.update('live', ex.id, { outline }); else store.add('live', { date: d, outline, keywords: '' });
      // 建立开播提醒事件
      const dt = d + 'T' + settings.liveStart;
      const have = store.get('events').find(e => e.category === '直播备忘' && e.datetime === dt);
      if (!have) store.add('events', { category: '直播备忘', client: '直播', title: '📺 开播提醒：' + (firstLine(outline) || '抖音直播'), datetime: dt, level: 'warn', lead: 30, note: outline, done: false });
      ui.toast('提纲已保存，开播提醒已设置', 'ok'); paint();
    };
  }
  function firstLine(s) { return (s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean)[0] || ''; }
  function shiftMin(hhmm, minus) { const [h, m] = hhmm.split(':').map(Number); const t = h * 60 + m - minus; const hh = ((Math.floor(t / 60)) % 24 + 24) % 24; return (hh < 10 ? '0' : '') + hh + ':' + (t % 60 < 10 ? '0' : '') + (t % 60); }

  App.modules = App.modules || {};
  App.modules.live = { title: '直播数据分析', render(root) { m.root = root; paint(); } };
})(window.App);
