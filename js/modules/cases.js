/* ===== 模块一：律师案件智能台账 ===== */
window.App = window.App || {};
(function (App) {
  const store = App.store, ui = App.ui;
  const CATS = ['开庭安排', '当事人咨询约谈', '文书起草', '立案进度', '法院送达日期', '上诉期限', '执行节点', '律所行政事务'];
  const m = { tab: 'entry', calYear: 0, calMonth: 0, selDay: '', caseSearch: '', knowSearch: '', root: null };

  function ensureCase(client) {
    if (!client) return null;
    let c = store.get('cases').find(x => x.client === client);
    if (!c) c = store.add('cases', { client, type: '民事', status: '进行中', feeTotal: 0, feePaid: 0, openedAt: ui.todayStr() });
    return c;
  }
  function defaultDT() { return ui.todayStr() + 'T09:00'; }

  function paint() {
    const r = m.root;
    r.innerHTML = `
      <div class="section-title">⚖️ 案件智能台账</div>
      <div class="section-sub">立案、开庭、上诉期限、执行节点全程可视，诉讼时效与举证期主动提醒，每案独立卷宗。</div>
      <div class="tabs">
        <button class="tab ${m.tab === 'entry' ? 'active' : ''}" data-t="entry">＋ 事项录入</button>
        <button class="tab ${m.tab === 'cal' ? 'active' : ''}" data-t="cal">📅 可视化日历</button>
        <button class="tab ${m.tab === 'cases' ? 'active' : ''}" data-t="cases">📁 案件卷宗</button>
        <button class="tab ${m.tab === 'review' ? 'active' : ''}" data-t="review">📝 每周复盘</button>
        <button class="tab ${m.tab === 'know' ? 'active' : ''}" data-t="know">📚 法务知识库</button>
      </div>
      <div id="caseTab"></div>`;
    ui.qa('.tab', r).forEach(b => b.onclick = () => { m.tab = b.dataset.t; paint(); });
    const tab = ui.q('#caseTab', r);
    if (m.tab === 'entry') tabEntry(tab);
    else if (m.tab === 'cal') tabCalendar(tab);
    else if (m.tab === 'cases') tabCases(tab);
    else if (m.tab === 'review') tabReview(tab);
    else if (m.tab === 'know') tabKnow(tab);
  }

  /* ---- 录入 ---- */
  function tabEntry(tab) {
    tab.innerHTML = `<div class="grid grid-2">
      <div class="card">
        <h3>新增案件事项</h3>
        <form id="evForm">
          ${ui.formFields([
            { field: 'category', label: '事项类目', type: 'select', required: true, options: CATS.map(c => ({ v: c, t: c })) },
            { field: 'client', label: '关联当事人', type: 'text', ph: '首次录入将自动建立案件档案', required: true },
            { field: 'title', label: '事项标题', type: 'text', ph: '如：离婚纠纷一审开庭', required: true },
            { field: 'datetime', label: '时间', type: 'datetime-local', value: defaultDT(), required: true },
            { field: 'level', label: '紧急/重要等级', type: 'select', options: [{ v: 'urgent', t: '紧急（涉期限/诉权）' }, { v: 'warn', t: '重要' }, { v: 'normal', t: '普通' }] },
            { field: 'lead', label: '提前提醒', type: 'select', options: [{ v: 1440, t: '提前1天' }, { v: 60, t: '提前1小时' }, { v: 30, t: '提前30分钟' }, { v: 0, t: '不提醒' }] },
          ])}
          <div class="field"><label>备注 / 要点</label><textarea class="input" data-field="note" placeholder="开庭地点、案号、举证要求等"></textarea></div>
          <div class="row" style="justify-content:flex-end">
            <button type="button" class="btn sec" id="evReset">清空</button>
            <button type="submit" class="btn">保存事项</button>
          </div>
        </form>
        <div class="tip mt">提示：涉及诉讼时效、上诉期限、举证期的，请把等级设成「紧急」并开启提前提醒，系统会在到期前主动弹窗+系统通知，避免错过。</div>
      </div>
      <div class="card">
        <h3>近期待办 <span class="tag">${store.get('events').filter(e => !e.done).length} 项</span></h3>
        <div id="evRecent"></div>
      </div>
    </div>`;
    const form = ui.q('#evForm', tab);
    form.onsubmit = (e) => {
      e.preventDefault();
      const d = ui.parseForm(form);
      if (!d.client || !d.title || !d.datetime) return ui.toast('请填写当事人、标题与时间', 'err');
      ensureCase(d.client);
      store.add('events', { category: d.category, client: d.client, title: d.title, datetime: d.datetime, level: d.level || 'normal', lead: Number(d.lead) || 0, note: d.note || '', done: false });
      ui.toast('已保存：' + d.title, 'ok');
      form.reset(); ui.q('[data-field="datetime"]', form).value = defaultDT();
      renderRecent(ui.q('#evRecent', tab));
    };
    ui.q('#evReset', tab).onclick = () => { form.reset(); ui.q('[data-field="datetime"]', form).value = defaultDT(); };
    renderRecent(ui.q('#evRecent', tab));
  }
  function renderRecent(box) {
    const evs = store.get('events').filter(e => !e.done).sort((a, b) => new Date(a.datetime) - new Date(b.datetime)).slice(0, 12);
    if (!evs.length) { box.innerHTML = '<div class="empty">暂无待办，去左侧录入吧</div>'; return; }
    box.innerHTML = '<div class="list">' + evs.map(e => `<div class="list-item">
      <span class="dot ${e.level === 'urgent' ? 'urgent' : e.level === 'warn' ? 'warn' : 'gray'}"></span>
      <div class="li-main"><div class="li-title">${ui.esc(e.title)}</div>
      <div class="li-meta">${ui.esc(e.category)} · ${ui.esc(e.client)} · ${ui.fmtDateTime(e.datetime)} ${e.lead ? '· ' + ui.leadText(e.lead) : ''}</div></div>
    </div>`).join('') + '</div>';
  }

  /* ---- 日历 ---- */
  function tabCalendar(tab) {
    const now = new Date();
    if (!m.calYear) { m.calYear = now.getFullYear(); m.calMonth = now.getMonth(); }
    if (!m.selDay) m.selDay = ui.todayStr();
    const cells = ui.monthMatrix(m.calYear, m.calMonth);
    const evs = store.get('events');
    const byDay = {};
    evs.forEach(e => { const k = ui.todayStr(ui.parseLocal(e.datetime)); (byDay[k] = byDay[k] || []).push(e); });
    const dows = ['一', '二', '三', '四', '五', '六', '日'];
    const calHtml = cells.map(d => {
      const k = ui.todayStr(d); const inM = d.getMonth() === m.calMonth;
      const dayEvs = (byDay[k] || []).slice(0, 3);
      return `<div class="cal-cell ${inM ? '' : 'out'} ${k === ui.todayStr() ? 'today' : ''}" data-day="${k}">
        <div class="cal-num">${d.getDate()}</div>
        ${dayEvs.map(e => `<div class="cal-ev ${e.level === 'urgent' ? 'urgent' : e.level === 'warn' ? 'warn' : e.level === 'normal' ? 'gray' : 'info'} ${e.done ? '' : ''}" style="${e.done ? 'opacity:.45;text-decoration:line-through' : ''}">${ui.esc(e.title.slice(0, 8))}</div>`).join('')}
        ${(byDay[k] || []).length > 3 ? `<div class="cal-num" style="font-weight:400;color:var(--sub)">+${byDay[k].length - 3}</div>` : ''}
      </div>`;
    }).join('');
    tab.innerHTML = `<div class="card">
      <div class="cal-nav"><button class="btn ghost sm" id="prevM">‹</button>
        <span class="m">${m.calYear}年 ${m.calMonth + 1}月</span>
        <button class="btn ghost sm" id="nextM">›</button>
        <span class="spacer"></span>
        <span class="wrap"><span class="flex"><span class="dot urgent"></span>紧急</span><span class="flex"><span class="dot warn"></span>重要</span><span class="flex"><span class="dot gray"></span>普通</span></span>
      </div>
      <div class="cal">${dows.map(d => `<div class="cal-dow">${d}</div>`).join('')}${calHtml}</div>
      <hr class="hr"/>
      <div id="dayPanel"></div>
    </div>`;
    ui.q('#prevM', tab).onclick = () => { m.calMonth--; if (m.calMonth < 0) { m.calMonth = 11; m.calYear--; } paint(); };
    ui.q('#nextM', tab).onclick = () => { m.calMonth++; if (m.calMonth > 11) { m.calMonth = 0; m.calYear++; } paint(); };
    ui.qa('.cal-cell', tab).forEach(c => c.onclick = () => { m.selDay = c.dataset.day; renderDay(ui.q('#dayPanel', tab)); });
    renderDay(ui.q('#dayPanel', tab));
  }
  function renderDay(panel) {
    const evs = store.get('events').filter(e => ui.todayStr(ui.parseLocal(e.datetime)) === m.selDay).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    panel.innerHTML = `<h3 style="margin:6px 0 10px">${m.selDay.replace(/-/g, ' / ')} 当日事项 <span class="tag">${evs.length} 项</span></h3>` +
      (evs.length ? '<div class="list">' + evs.map(e => `<div class="list-item">
        <span class="dot ${e.level === 'urgent' ? 'urgent' : e.level === 'warn' ? 'warn' : 'gray'}"></span>
        <div class="li-main"><div class="li-title" style="${e.done ? 'text-decoration:line-through;color:var(--sub)' : ''}">${ui.esc(e.title)} ${ui.levelBadge(e.level)}</div>
        <div class="li-meta">${ui.esc(e.category)} · ${ui.esc(e.client)} · ${ui.fmtTime(e.datetime)} ${e.lead ? '· ' + ui.leadText(e.lead) : ''}</div>
        ${e.note ? `<div class="li-meta">📝 ${ui.esc(e.note)}</div>` : ''}</div>
        <div class="row"><button class="btn ghost sm" data-act="done" data-id="${e.id}">${e.done ? '↺ 恢复' : '✓ 办结'}</button>
        <button class="btn ghost sm" data-act="edit" data-id="${e.id}">编辑</button>
        <button class="btn danger sm" data-act="del" data-id="${e.id}">删除</button></div>
      </div>`).join('') + '</div>'
        : '<div class="empty">当日暂无事项</div>');
    ui.qa('[data-act]', panel).forEach(b => b.onclick = () => {
      const ev = store.find('events', b.dataset.id); if (!ev) return;
      const act = b.dataset.act;
      if (act === 'done') { store.update('events', ev.id, { done: !ev.done }); ui.toast(ev.done ? '已恢复为待办' : '已办结 ✓'); tabCalendar(m.root); }
      else if (act === 'del') { store.remove('events', ev.id); ui.toast('已删除'); tabCalendar(m.root); }
      else if (act === 'edit') editEvent(ev);
    });
  }
  function editEvent(ev) {
    const f = ui.el(`<div><form id="ef">
      ${ui.formFields([
        { field: 'title', label: '标题', type: 'text', value: ev.title },
        { field: 'datetime', label: '时间', type: 'datetime-local', value: ev.datetime },
        { field: 'level', label: '等级', type: 'select', value: ev.level, options: [{ v: 'urgent', t: '紧急' }, { v: 'warn', t: '重要' }, { v: 'normal', t: '普通' }] },
        { field: 'lead', label: '提前提醒', type: 'select', value: ev.lead, options: [{ v: 1440, t: '提前1天' }, { v: 60, t: '提前1小时' }, { v: 30, t: '提前30分钟' }, { v: 0, t: '不提醒' }] },
      ])}
      <div class="field"><label>备注</label><textarea class="input" data-field="note">${ui.esc(ev.note || '')}</textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">保存</button></div>
    </form></div>`);
    const mod = ui.modal({ title: '编辑事项', body: f });
    ui.q('#ef', f).onsubmit = (e) => { e.preventDefault(); store.update('events', ev.id, ui.parseForm(f)); mod.close(); ui.toast('已更新'); tabCalendar(m.root); };
  }

  /* ---- 案件卷宗 ---- */
  function tabCases(tab) {
    const all = store.get('cases');
    tab.innerHTML = `<div class="card">
      <div class="row mb"><input class="input" id="cs" placeholder="检索当事人 / 案由" value="${ui.esc(m.caseSearch)}" style="max-width:320px"/>
        <span class="spacer"></span><span class="muted">共 ${all.length} 个案件档案</span></div>
      <div id="caseList"></div></div>`;
    const render = () => {
      const kw = m.caseSearch.trim();
      const list = all.filter(c => !kw || c.client.includes(kw) || (c.type || '').includes(kw));
      if (!list.length) { ui.q('#caseList', tab).innerHTML = '<div class="empty">暂无案件，录入事项时自动建档</div>'; return; }
      ui.q('#caseList', tab).innerHTML = '<div class="list">' + list.map(c => {
        const comms = store.get('comms').filter(x => x.caseId === c.id);
        return `<div class="list-item">
          <div class="li-main"><div class="li-title">${ui.esc(c.client)} <span class="badge primary">${ui.esc(c.type || '民事')}</span> <span class="badge ${c.status === '已结案' ? 'ok' : 'info'}">${ui.esc(c.status || '进行中')}</span></div>
          <div class="li-meta">建档：${c.openedAt || '-'} · 收费 ${c.feePaid || 0}/${c.feeTotal || 0} 元 · 沟通记录 ${comms.length} 条</div></div>
          <div class="row">
            <button class="btn ghost sm" data-act="add" data-id="${c.id}">+沟通/收费</button>
            <button class="btn ghost sm" data-act="view" data-id="${c.id}">查看卷宗</button>
            <button class="btn danger sm" data-act="del" data-id="${c.id}">删除</button>
          </div></div>`;
      }).join('') + '</div>';
      ui.qa('[data-act]', ui.q('#caseList', tab)).forEach(b => b.onclick = () => {
        const c = store.find('cases', b.dataset.id); if (!c) return;
        const act = b.dataset.act;
        if (act === 'del') store.remove('cases', c.id), ui.toast('已删除案件'), render();
        else if (act === 'add') addComm(c, render);
        else if (act === 'view') viewCase(c);
      });
    };
    ui.q('#cs', tab).oninput = (e) => { m.caseSearch = e.target.value; render(); };
    render();
  }
  function addComm(c, after) {
    const f = ui.el(`<div><form id="cf">
      ${ui.formFields([
        { field: 'ctype', label: '记录类型', type: 'select', options: [{ v: '沟通话术', t: '沟通话术' }, { v: '案件进展', t: '案件进展' }, { v: '收费记录', t: '收费记录' }] },
        { field: 'amount', label: '金额（收费记录填，元）', type: 'number', step: '0.01', value: 0 },
        { field: 'date', label: '日期', type: 'date', value: ui.todayStr() },
      ])}
      <div class="field"><label>内容</label><textarea class="input" data-field="content" placeholder="沟通要点 / 进展说明 / 收费说明"></textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">保存</button></div>
    </form></div>`);
    const mod = ui.modal({ title: '卷宗记录 · ' + c.client, body: f });
    ui.q('#cf', f).onsubmit = (e) => {
      e.preventDefault(); const d = ui.parseForm(f);
      store.add('comms', { caseId: c.id, type: d.ctype, content: d.content || '', amount: Number(d.amount) || 0, date: d.date });
      if (d.ctype === '收费记录') { const paid = (Number(c.feePaid) || 0) + (Number(d.amount) || 0); store.update('cases', c.id, { feePaid: paid }); }
      mod.close(); ui.toast('已记入卷宗'); after && after();
    };
  }
  function viewCase(c) {
    const comms = store.get('comms').filter(x => x.caseId === c.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const evs = store.get('events').filter(x => x.client === c.client);
    const body = ui.el(`<div>
      <div class="kpi-row">
        <div class="kpi"><span class="muted">案件类型</span><b>${ui.esc(c.type || '民事')}</b></div>
        <div class="kpi"><span class="muted">状态</span><b>${ui.esc(c.status || '进行中')}</b></div>
        <div class="kpi"><span class="muted">已收/总收费</span><b>${c.feePaid || 0}/${c.feeTotal || 0}</b></div>
        <div class="kpi"><span class="muted">待办事项</span><b>${evs.filter(e => !e.done).length}</b></div>
      </div>
      <div class="field"><label>收费标准 / 备注</label><input class="input" id="cfee" value="${ui.esc(c.feeNote || '')}" placeholder="如：一审代理费2万，二审另计"/></div>
      <h4>关联事项（${evs.length}）</h4>
      ${evs.length ? '<div class="list">' + evs.map(e => `<div class="list-item"><span class="dot ${e.level === 'urgent' ? 'urgent' : 'gray'}"></span><div class="li-main"><div class="li-title">${ui.esc(e.title)} ${ui.levelBadge(e.level)}</div><div class="li-meta">${ui.esc(e.category)} · ${ui.fmtDateTime(e.datetime)} · ${e.done ? '已办结' : '待办'}</div></div></div>`).join('') + '</div>' : '<div class="empty">暂无关联事项</div>'}
      <h4>卷宗记录（${comms.length}）</h4>
      ${comms.length ? '<div class="list">' + comms.map(x => `<div class="list-item"><div class="li-main"><div class="li-title">${ui.esc(x.type)} ${x.amount ? '<span class="badge ok">+' + x.amount + '元</span>' : ''} <span class="muted">${x.date || ''}</span></div><div class="li-meta">${ui.esc(x.content || '')}</div></div></div>`).join('') + '</div>' : '<div class="empty">暂无记录</div>'}
    </div>`);
    const mod = ui.modal({ title: '📁 案件卷宗 · ' + c.client, body });
    ui.q('#cfee', body).onchange = (e) => store.update('cases', c.id, { feeNote: e.target.value });
  }

  /* ---- 每周复盘 ---- */
  function tabReview(tab) {
    const wr = ui.weekRange();
    const evs = store.get('events');
    const inWeek = evs.filter(e => { const k = ui.todayStr(ui.parseLocal(e.datetime)); return k >= wr.start && k <= wr.end; });
    const done = inWeek.filter(e => e.done);
    const pending = inWeek.filter(e => !e.done).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    const next = ui.weekRange(ui.addDays(wr.sun, 1));
    const nextWeek = evs.filter(e => { const k = ui.todayStr(ui.parseLocal(e.datetime)); return k > wr.end && k <= next.end && !e.done; });
    // 疏漏点
    const noReminder = evs.filter(e => !e.done && e.level === 'urgent' && !e.lead);
    const overdue = evs.filter(e => !e.done && new Date(e.datetime) < new Date() && e.level === 'urgent');
    const stale = store.get('cases').filter(c => { const c2 = store.get('comms').filter(x => x.caseId === c.id); return c.status !== '已结案' && (!c2.length || c2.every(x => x.date < wr.start)); });

    tab.innerHTML = `<div class="card">
      <div class="row mb"><h3 style="margin:0">本周工作复盘 <span class="tag">${wr.start} ~ ${wr.end}</span></h3>
      <span class="spacer"></span><button class="btn sec sm" id="cpReview">复制复盘全文</button></div>
      <div class="report" id="reviewBox">
        <h2>📝 本周办案复盘（${wr.start} ~ ${wr.end}）</h2>
        <h4>一、本周办结（${done.length}）</h4>
        ${done.length ? '<ul>' + done.map(e => `<li>${ui.esc(e.title)}（${ui.esc(e.category)}·${ui.esc(e.client)}）</li>`).join('') + '</ul>' : '<p class="muted">本周暂无办结事项。</p>'}
        <h4>二、待推进事项（${pending.length}）</h4>
        ${pending.length ? '<ul>' + pending.map(e => `<li>${ui.esc(e.title)} — 计划 ${ui.fmtDateTime(e.datetime)} ${ui.levelBadge(e.level)}</li>`).join('') + '</ul>' : '<p class="muted">无积压，状态良好。</p>'}
        <h4>三、下周工作计划（${nextWeek.length}）</h4>
        ${nextWeek.length ? '<ul>' + nextWeek.map(e => `<li>${ui.fmtDate(e.datetime)} ${ui.esc(e.title)}（${ui.esc(e.category)}·${ui.esc(e.client)}）</li>`).join('') + '</ul>' : '<p class="muted">下周暂无排期，建议提前规划开庭/约谈。</p>'}
        <h4>四、办案疏漏点提示</h4>
        ${noReminder.length || overdue.length || stale.length ? '<ul>' : '<p class="muted">未检测到明显疏漏。</p>'}
        ${overdue.map(e => `<li class="callout urgent" style="list-style:none">⚠ 期限已过未处理：${ui.esc(e.title)}（${ui.esc(e.client)}）</li>`).join('')}
        ${noReminder.map(e => `<li class="callout warn" style="list-style:none">⚠ 紧急事项未设提醒：${ui.esc(e.title)}，建议立即补设提前提醒</li>`).join('')}
        ${stale.map(c => `<li class="callout" style="list-style:none">📌 案件「${ui.esc(c.client)}」本周无进展更新，建议主动跟进</li>`).join('')}
        <h4>五、办案优化建议</h4>
        <ul>
          <li>对开庭、上诉期限、举证期类事项统一设置「提前1天+提前1小时」双提醒，形成防漏闭环。</li>
          <li>每周日固定 20 分钟复盘，将待推进事项转化为下周具体日程，避免事项悬空。</li>
          <li>高频咨询问题沉淀为知识库标准话术，减少重复沟通成本。</li>
          <li>重要客户进展每日更新卷宗，便于复盘与交接。</li>
        </ul>
      </div>
    </div>`;
    ui.q('#cpReview', tab).onclick = () => {
      const txt = ui.q('#reviewBox', tab).innerText;
      navigator.clipboard && navigator.clipboard.writeText(txt);
      ui.toast('复盘全文已复制', 'ok');
    };
  }

  /* ---- 知识库 ---- */
  function tabKnow(tab) {
    tab.innerHTML = `<div class="card">
      <div class="row mb"><input class="input" id="ks" placeholder="检索法条 / 模板关键词" value="${ui.esc(m.knowSearch)}" style="max-width:320px"/>
        <span class="spacer"></span><button class="btn sec sm" id="addK">＋ 新增法条/模板</button></div>
      <div id="klist"></div></div>`;
    const render = () => {
      const kw = m.knowSearch.trim();
      const list = store.get('knowledge').filter(k => !kw || k.title.includes(kw) || (k.tags || '').includes(kw) || (k.body || '').includes(kw));
      ui.q('#klist', tab).innerHTML = list.length ? '<div class="list">' + list.map(k => `<div class="list-item">
        <div class="li-main"><div class="li-title">${ui.esc(k.title)} <span class="badge ${k.kind === '法条' ? 'info' : 'primary'}">${ui.esc(k.kind)}</span> ${k.tags ? '<span class="muted">#' + ui.esc(k.tags) + '</span>' : ''}</div>
        <div class="li-meta" style="white-space:pre-wrap">${ui.esc((k.body || '').slice(0, 120))}${(k.body || '').length > 120 ? '…' : ''}</div></div>
        <div class="row"><button class="btn ghost sm" data-act="copy" data-id="${k.id}">调取/复制</button><button class="btn danger sm" data-act="del" data-id="${k.id}">删</button></div>
      </div>`).join('') + '</div>' : '<div class="empty">未找到相关内容</div>';
      ui.qa('[data-act]', ui.q('#klist', tab)).forEach(b => b.onclick = () => {
        const k = store.find('knowledge', b.dataset.id); if (!k) return;
        if (b.dataset.act === 'del') store.remove('knowledge', k.id), render();
        else { navigator.clipboard && navigator.clipboard.writeText(k.body || ''); ui.toast('已复制：「' + k.title + '」可粘贴到文书', 'ok'); }
      });
    };
    ui.q('#ks', tab).oninput = (e) => { m.knowSearch = e.target.value; render(); };
    ui.q('#addK', tab).onclick = () => {
      const f = ui.el(`<div><form id="kf">${ui.formFields([
        { field: 'kind', label: '类型', type: 'select', options: [{ v: '法条', t: '法条' }, { v: '模板', t: '文书模板' }] },
        { field: 'title', label: '标题', type: 'text' }, { field: 'tags', label: '标签', type: 'text', ph: '如：诉讼时效' },
      ])}<div class="field"><label>内容</label><textarea class="input" data-field="body"></textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">保存</button></div></form></div>`);
      const mod = ui.modal({ title: '新增法条/模板', body: f });
      ui.q('#kf', f).onsubmit = (e) => { e.preventDefault(); const d = ui.parseForm(f); store.add('knowledge', d); mod.close(); ui.toast('已加入知识库'); render(); };
    };
    render();
  }

  App.modules = App.modules || {};
  App.modules.cases = { title: '案件智能台账', render(root) { m.root = root; paint(); } };
})(window.App);
