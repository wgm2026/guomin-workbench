/* ===== 模块五：全局辅助中心 + 首页联动 ===== */
window.App = window.App || {};
(function (App) {
  const store = App.store, ui = App.ui;
  const G = {};

  /* 自动归类 */
  G.classify = function (text) {
    const t = text || '';
    if (/(开庭|立案|上诉|当事人|法院|送达|举证|代理|律所|咨询|案件|合同|判决)/.test(t)) return 'cases';
    if (/(直播|复盘|短视频|抖音|发布|选题|竞品|私信|涨粉|脚本)/.test(t)) return 'douyin';
    if (/(体重|减脂|运动|睡眠|喝水|饮水|健身|跑步|力量|吃|早餐|夜宵)/.test(t)) return 'health';
    if (/(直播提纲|开播|5:50|08:30|时段)/.test(t)) return 'live';
    return 'memo';
  };
  const MOD_NAME = { cases: '案件台账', douyin: '抖音运营', health: '健康减脂', live: '直播分析', memo: '通用备忘' };

  G.quickMemo = function () {
    const f = ui.el(`<div><form id="qm"><div class="field"><label>一句话快速记录（自动归类到对应板块）</label><textarea class="input" data-field="text" placeholder="如：明天下午3点去朝阳区法院立案，记得带授权委托书"></textarea></div>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">保存</button></div></form></div>`);
    const mod = ui.modal({ title: '✍ 快捷记录', body: f });
    ui.q('#qm', f).onsubmit = (e) => {
      e.preventDefault(); const txt = ui.q('[data-field="text"]', f).value.trim(); if (!txt) return ui.toast('请输入内容', 'err');
      const mod2 = G.classify(txt);
      store.add('memos', { text: txt, module: mod2, createdAt: ui.nowISO() });
      ui.toast('已存入「' + MOD_NAME[mod2] + '」', 'ok'); mod.close();
    };
  };

  /* 早安播报 (5:40) */
  G.brief = function () {
    const today = ui.todayStr();
    const evs = store.get('events').filter(e => !e.done && ui.todayStr(ui.parseLocal(e.datetime)) === today).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    const live = store.get('live').find(x => x.date === today);
    const outline = live && (live.outline || live.keywords) ? (live.outline || live.keywords).split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] : '';
    const h = store.get('health').find(x => x.date === today);
    const settings = store.settings();
    const caseItems = evs.filter(e => e.category !== '发布' && e.category !== '健康打卡' && e.category !== '直播备忘');
    const html = `<div class="report">
      <h2>🌅 早安播报 · ${today}（${settings.lawyer}）</h2>
      <h4>一、今日待办案件（${caseItems.length}）</h4>
      ${caseItems.length ? '<ul>' + caseItems.map(e => `<li>${ui.fmtTime(e.datetime)} ${ui.esc(e.title)} ${ui.levelBadge(e.level)} ${e.lead ? '· ' + ui.leadText(e.lead) : ''}</li>`).join('') + '</ul>' : '<p class="muted">今日暂无案件安排，可专注直播与内容。</p>'}
      <h4>二、直播主题提醒（${settings.liveStart}–${settings.liveEnd}）</h4>
      ${outline ? `<div class="callout">📺 今日提纲：${ui.esc(outline)}</div>` : '<div class="callout warn">⚠ 尚未设置今日直播提纲，开播前请补充（直播分析·直播备忘）。</div>'}
      <h4>三、今日减脂注意</h4>
      <div class="callout">🌅 早起直播护体：开播前 ${settings.liveStart} 前请温水+少量碳水；下播后补正餐蛋白。${h ? '今日已打卡体重 ' + h.weight + 'kg。' : '记得晨起空腹称重并打卡。'}</div>
      <h4>四、综合提示</h4>
      <ul><li>紧急/重要事项共 <b>${evs.filter(e => e.level === 'urgent' || e.level === 'warn').length}</b> 项，留意提前提醒。</li><li>有法律咨询私信及时归类，沉淀标准话术。</li></ul>
    </div>`;
    return html;
  };

  /* 月度总报告 */
  G.monthly = function (month) {
    // month: 'YYYY-MM'
    const prefix = month;
    const evs = store.get('events').filter(e => (e.datetime || '').slice(0, 7) === prefix);
    const cases = store.get('cases').filter(c => (c.openedAt || '').slice(0, 7) === prefix);
    const comms = store.get('comms').filter(c => (c.date || '').slice(0, 7) === prefix);
    const lives = store.get('live').filter(l => (l.date || '').slice(0, 7) === prefix);
    const videos = store.get('videos').filter(v => (v.date || '').slice(0, 7) === prefix);
    const topics = store.get('topics').filter(t => (t.date || '').slice(0, 7) === prefix);
    const health = store.get('health').filter(h => (h.date || '').slice(0, 7) === prefix).sort((a, b) => a.date.localeCompare(b.date));
    const fans = lives.reduce((s, l) => s + (Number(l.fansNew) || 0), 0);
    const gift = lives.reduce((s, l) => s + (Number(l.gift) || 0), 0);
    const fee = comms.filter(c => c.type === '收费记录').reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const wS = health.length ? health[0].weight : null, wE = health.length ? health[health.length - 1].weight : null;
    const wCh = (wS != null && wE != null) ? (Number(wE) - Number(wS)).toFixed(1) : '—';
    return `<div class="report">
      <h2>📊 ${prefix} 月度整体总报告</h2>
      <h4>一、办案工作量</h4>
      <ul>
        <li>本月新增案件档案：<b>${cases.length}</b> 个</li>
        <li>案件事项/日程：<b>${evs.length}</b> 项（办结 ${evs.filter(e => e.done).length}）</li>
        <li>卷宗沟通/进展记录：<b>${comms.length}</b> 条</li>
        <li>本月收费记录合计：<b>¥${fee}</b></li>
      </ul>
      <h4>二、自媒体涨粉与运营</h4>
      <ul>
        <li>直播 <b>${lives.length}</b> 场，新增粉丝 <b>${fans}</b>，礼物收益 <b>¥${gift}</b></li>
        <li>发布短视频 <b>${videos.length}</b> 条，生成选题 <b>${topics.length}</b> 条</li>
        <li>爆款作品 <b>${videos.filter(v => (Number(v.finishRate) >= 45 && Number(v.retain5s) >= 55)).length}</b> 条</li>
      </ul>
      <h4>三、体重与健康</h4>
      <ul>
        <li>打卡 <b>${health.length}</b> 天</li>
        <li>体重：${wS != null ? wS + 'kg' : '—'} → ${wE != null ? wE + 'kg' : '—'}（${wCh >= 0 ? '+' : ''}${wCh}kg）</li>
        <li>平均睡眠 ${health.length ? (health.reduce((s, h) => s + (Number(h.sleep) || 0), 0) / health.length).toFixed(1) : '—'}h</li>
      </ul>
      <h4>四、综合建议</h4>
      <ul>
        <li>办案：对高频事项固化标准流程，减少重复沟通。</li>
        <li>运营：复用爆款结构，保持每日选题产出与固定发布节奏。</li>
        <li>健康：维持早起护体方案，保证睡眠与运动，稳定减脂。</li>
      </ul>
    </div>`;
  };

  /* 全局检索 */
  G.search = function (kw) {
    kw = (kw || '').trim(); if (!kw) return [];
    const res = [];
    const push = (mod, title, sub) => res.push({ mod, title, sub });
    store.get('events').forEach(e => { if ((e.title + e.client + e.category + e.note).includes(kw)) push('cases', e.title, e.category + ' · ' + (e.client || '')); });
    store.get('cases').forEach(c => { if (c.client.includes(kw)) push('cases', '案件：' + c.client, c.type + ' · ' + c.status); });
    store.get('comms').forEach(c => { if ((c.content || '').includes(kw)) { const cs = store.find('cases', c.caseId); push('cases', '卷宗记录', (cs ? cs.client : '') + '：' + (c.content || '').slice(0, 30)); } });
    store.get('knowledge').forEach(k => { if ((k.title + k.body + k.tags).includes(kw)) push('cases', '知识库：' + k.title, (k.body || '').slice(0, 30)); });
    store.get('live').forEach(l => { if ((l.date + l.keywords).includes(kw)) push('live', '直播 ' + l.date, '进入' + l.enter + ' 粉丝+' + l.fansNew); });
    store.get('liveQA').forEach(q => { if ((q.keyword + q.q + q.a).includes(kw)) push('live', '问答：' + q.keyword, (q.a || '').slice(0, 30)); });
    store.get('videos').forEach(v => { if ((v.title || '').includes(kw)) push('douyin', '视频：' + v.title, v.date + ' 完播' + v.finishRate + '%'); });
    store.get('competitors').forEach(c => { if ((c.title + c.author + c.hook).includes(kw)) push('douyin', '竞品：' + c.title, c.author); });
    store.get('topics').forEach(t => { if ((t.title + t.draft).includes(kw)) push('douyin', '选题：' + t.title, (t.draft || '').slice(0, 30)); });
    store.get('dms').forEach(d => { if ((d.question + d.template).includes(kw)) push('douyin', '私信：' + d.question, (d.template || '').slice(0, 30)); });
    store.get('health').forEach(h => { if ((h.date + h.meal + h.stressNote).includes(kw)) push('health', '健康 ' + h.date, '体重' + h.weight + 'kg'); });
    store.get('memos').forEach(m2 => { if (m2.text.includes(kw)) push(MOD_NAME[m2.module] || 'memo', '备忘', m2.text.slice(0, 40)); });
    return res;
  };

  /* ===== 首页 ===== */
  App.modules = App.modules || {};
  App.modules.home = {
    title: '工作台首页',
    render(root) {
      const today = ui.todayStr();
      const evs = store.get('events').filter(e => !e.done).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      const wr = ui.weekRange();
      const lives = store.get('live').filter(l => l.date >= wr.start && l.date <= wr.end);
      const fans = lives.reduce((s, l) => s + (Number(l.fansNew) || 0), 0);
      const hw = sorted()[sorted().length - 1];
      const monthEvs = store.get('events').filter(e => (e.datetime || '').slice(0, 7) === today.slice(0, 7));
      function sorted() { return store.get('health').filter(h => h.weight).sort((a, b) => a.date.localeCompare(b.date)); }
      const hr = new Date().getHours();
      const greet = hr < 6 ? '凌晨好，辛苦了' : hr < 11 ? '早上好' : hr < 14 ? '中午好' : hr < 18 ? '下午好' : '晚上好';
      root.innerHTML = `
        <div class="section-title">${greet}，${store.settings().lawyer} 👋</div>
        <div class="section-sub">国民工作台 · 案件 / 直播 / 运营 / 健康 一体化联动。数据本地长期存档，随时检索复盘。</div>
        <div class="grid grid-4 mb">
          <div class="stat"><div class="label">待办事项</div><div class="value">${evs.length}<small> 项</small></div></div>
          <div class="stat"><div class="label">本周直播 / 涨粉</div><div class="value">${lives.length}<small> 场</small> · +${fans}</div></div>
          <div class="stat"><div class="label">最新体重</div><div class="value">${hw ? hw.weight : '—'}<small> kg</small></div></div>
          <div class="stat"><div class="label">本月办案量</div><div class="value">${monthEvs.length}<small> 项</small></div></div>
        </div>
        <div class="grid grid-2">
          <div class="card"><h3>🌅 今日早安播报 <span class="tag">5:40 自动推送</span></h3><div id="briefBox"></div></div>
          <div class="card"><h3>⏰ 今日提醒 <span class="tag">${evs.filter(e => ui.todayStr(ui.parseLocal(e.datetime)) === today).length} 项</span></h3><div id="remindBox"></div></div>
        </div>
        <div class="card mt"><h3>📌 今日爆款视频推送 <span class="tag">每日 9:00 自动 · 同类型法律主播</span></h3><div id="hotBox"></div></div>
        <div class="card mt"><h3>⚡ 快捷操作</h3>
          <div class="wrap">
            <button class="btn" data-go="cases">＋ 记案件事项</button>
            <button class="btn sec" data-go="live">📺 录直播数据</button>
            <button class="btn sec" data-go="douyin">💡 生成选题</button>
            <button class="btn sec" data-go="health">🏃 健康打卡</button>
            <button class="btn ghost" id="qmHome">✍ 一句话备忘</button>
          </div>
        </div>`;
      ui.q('#briefBox', root).innerHTML = G.brief();
      const rb = ui.q('#remindBox', root);
      const todayEvs = evs.filter(e => ui.todayStr(ui.parseLocal(e.datetime)) === today);
      rb.innerHTML = todayEvs.length ? todayEvs.slice(0, 8).map(e => `<div class="remind-item ${e.level === 'urgent' ? 'urgent' : e.level === 'warn' ? 'warn' : ''}"><span class="rm-time">${ui.fmtTime(e.datetime)}</span><div><div style="font-weight:600">${ui.esc(e.title)}</div><div class="muted" style="font-size:12px">${ui.esc(e.category)} · ${ui.esc(e.client || '')} ${e.lead ? '· ' + ui.leadText(e.lead) : ''}</div></div></div>`).join('') : '<div class="empty">今日暂无提醒，状态清爽 🎉</div>';
      ui.qa('[data-go]', root).forEach(b => b.onclick = () => App.app.go(b.dataset.go));
      ui.q('#qmHome', root).onclick = () => G.quickMemo();
      // 今日爆款推送卡片
      const hb = ui.q('#hotBox', root);
      const dy = App.modules.douyin;
      const hot = dy.ensureDailyHot ? dy.ensureDailyHot(today) : [];
      hb.innerHTML = `<div class="tip" style="margin-bottom:10px">每天 9:00 自动推送 5 条同类型（法律/律师）主播爆款，点击「↗ 跳转」一键打开抖音观看。</div>` +
        (hot.length ? '<div class="list">' + hot.map(c => `<div class="list-item"><div class="li-main"><div class="li-title">${ui.esc(c.title)} <span class="badge primary">${ui.esc(c.author || '')}</span></div><div class="li-meta">🪝 ${ui.esc(c.hook || '')}</div></div><a class="btn ghost sm" href="${dy.jumpUrl(c)}" target="_blank" rel="noopener">↗ 跳转</a></div>`).join('') + '</div>' : '<div class="empty">暂无</div>');
    }
  };

  /* ===== 全局辅助中心 ===== */
  App.modules.global = {
    title: '全局辅助中心',
    render(root) {
      const m = { tab: 'brief', month: ui.todayStr().slice(0, 7), kw: '', root: null };
      m.root = root;
      function paint() {
        root.innerHTML = `<div class="section-title">🧭 全局辅助中心</div>
          <div class="section-sub">早安播报、月度总报告、快捷备忘、全局检索与云端留存，打通四大板块。</div>
          <div class="tabs">
            <button class="tab ${m.tab === 'brief' ? 'active' : ''}" data-t="brief">🌅 早安播报</button>
            <button class="tab ${m.tab === 'month' ? 'active' : ''}" data-t="month">📊 月度总报告</button>
            <button class="tab ${m.tab === 'memo' ? 'active' : ''}" data-t="memo">✍ 快捷备忘</button>
            <button class="tab ${m.tab === 'search' ? 'active' : ''}" data-t="search">🔍 全局检索</button>
            <button class="tab ${m.tab === 'cloud' ? 'active' : ''}" data-t="cloud">☁ 云端留存</button>
          </div><div id="gTab"></div>`;
        ui.qa('.tab', root).forEach(b => b.onclick = () => { m.tab = b.dataset.t; paint(); });
        const tab = ui.q('#gTab', root);
        if (m.tab === 'brief') tabBrief(tab); else if (m.tab === 'month') tabMonth(tab); else if (m.tab === 'memo') tabMemo(tab); else if (m.tab === 'search') tabSearch(tab); else if (m.tab === 'cloud') tabCloud(tab);
      }
      function tabBrief(tab) {
        tab.innerHTML = `<div class="card"><div class="row mb"><h3 style="margin:0">早安播报</h3><span class="spacer"></span><button class="btn sec sm" id="cpb">复制</button></div><div id="bb"></div>
          <div class="tip mt">系统于每日 5:40 自动生成并推送：今日待办案件 + 直播主题提醒 + 减脂注意。保持页面打开即可接收弹窗与系统通知。</div></div>`;
        ui.q('#bb', tab).innerHTML = G.brief();
        ui.q('#cpb', tab).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(ui.q('#bb', tab).innerText); ui.toast('已复制', 'ok'); };
      }
      function tabMonth(tab) {
        tab.innerHTML = `<div class="card"><div class="row mb"><label class="muted">选择月份</label><input type="month" class="input" id="mm" value="${m.month}" style="max-width:180px"/>
          <span class="spacer"></span><button class="btn sec sm" id="cpm">复制报告</button></div><div id="mb"></div></div>`;
        ui.q('#mm', tab).onchange = (e) => { m.month = e.target.value; ui.q('#mb', tab).innerHTML = G.monthly(m.month); };
        ui.q('#mb', tab).innerHTML = G.monthly(m.month);
        ui.q('#cpm', tab).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(ui.q('#mb', tab).innerText); ui.toast('已复制', 'ok'); };
      }
      function tabMemo(tab) {
        const list = store.get('memos').slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        tab.innerHTML = `<div class="card">
          <div class="row mb"><h3 style="margin:0">快捷备忘录 <span class="tag">${list.length} 条</span></h3><span class="spacer"></span><button class="btn sec sm" id="addM">＋ 一句话记录</button></div>
          <div id="ml"></div></div>`;
        const render = () => {
          const kw = m.kw;
          const fl = kw ? list.filter(x => x.text.includes(kw)) : list;
          ui.q('#ml', tab).innerHTML = fl.length ? '<div class="list">' + fl.map(x => `<div class="list-item"><div class="li-main"><div class="li-title">${ui.esc(x.text)}</div><div class="li-meta"><span class="badge primary">${MOD_NAME[x.module] || '备忘'}</span> ${ui.fmtDateTime(x.createdAt)}</div></div><button class="btn danger sm" data-id="${x.id}">删</button></div>`).join('') + '</div>' : '<div class="empty">暂无备忘</div>';
          ui.qa('[data-id]', ui.q('#ml', tab)).forEach(b => b.onclick = () => { store.remove('memos', b.dataset.id); render(); });
        };
        ui.q('#addM', tab).onclick = () => G.quickMemo();
        render();
      }
      function tabSearch(tab) {
        tab.innerHTML = `<div class="card"><div class="field"><label>跨全部板块检索（案件/直播/运营/健康/备忘）</label>
          <input class="input" id="sk" placeholder="输入关键词，如：工伤、离婚、直播、体重" value="${m.kw}"/></div>
          <div id="sr"></div></div>`;
        const run = () => { const r = G.search(ui.q('#sk', tab).value); ui.q('#sr', tab).innerHTML = r.length ? '<div class="list">' + r.map(x => `<div class="list-item"><div class="li-main"><div class="li-title">${ui.esc(x.title)}</div><div class="li-meta"><span class="badge primary">${ui.esc(MOD_NAME[x.mod] || x.mod)}</span> ${ui.esc(x.sub)}</div></div></div>`).join('') + '</div>' : '<div class="empty">无匹配结果</div>'; };
        ui.q('#sk', tab).oninput = (e) => { m.kw = e.target.value; run(); };
        run();
      }
      function tabCloud(tab) {
        const cfg = App.sync.getConfig();
        const enabled = App.sync.enabled();
        tab.innerHTML = `<div class="card">
          <h3>☁ 两台设备数据同步 <span class="tag ${enabled ? 'ok' : 'gray'}">${enabled ? '已启用' : '未启用'}</span></h3>
          <div class="tip mb">用 GitHub 仓库当云端数据库，两台设备填同一组配置即可同步。A 设备录入后自动上云，B 设备打开/刷新自动拉取。数据仅你可见。</div>
          <form id="syncForm">
            <div class="form-2">
              <div class="field"><label>GitHub 用户名</label><input class="input" data-field="owner" type="text" value="${ui.esc(cfg.owner || '')}" placeholder="如：wgm2026"/></div>
              <div class="field"><label>仓库名</label><input class="input" data-field="repo" type="text" value="${ui.esc(cfg.repo || 'guomin-workbench')}" placeholder="guomin-workbench"/></div>
            </div>
            <div class="field"><label>GitHub Token（访问密钥）</label><input class="input" data-field="token" type="password" value="${ui.esc(cfg.token || '')}" placeholder="ghp_... 开头的一串"/></div>
            <div class="row mt"><button type="submit" class="btn">保存同步配置</button>
              <button type="button" class="btn sec" id="syncNow">立即同步</button>
            </div>
          </form>
          <div id="syncResult" class="mt"></div>
          <hr class="hr"/>
          <h3>💾 本地备份与恢复</h3>
          <ul>
            <li>顶栏「导出备份」可下载完整 JSON；「导入恢复」可换设备/换浏览器回填。</li>
            <li>建议每周导出一次备份，重要节点（月度报告后）再导一份。</li>
            <li>启用云同步后，本地仍保留一份，云端额外一份，双保险。</li>
          </ul>
          <div class="row"><button class="btn" id="exp">⬇ 立即导出备份</button><button class="btn ghost" id="imp">⬆ 导入恢复</button></div>
          <hr class="hr"/>
          <h3>📱 添加到手机桌面（鸿蒙 / iOS）</h3>
          <ul>
            <li><b>鸿蒙</b>：浏览器打开工作台地址 → 右下角⋯ →「添加到主屏幕」→ 桌面出现国民工作台图标。</li>
            <li><b>苹果 iOS</b>：Safari 打开地址 → 底部「分享」→「添加到主屏幕」→ 桌面出现图标。</li>
            <li>点图标直接进入工作台，像 App 一样全屏使用，无需每次输地址。</li>
          </ul>
        </div>`;
        ui.q('#syncForm', tab).onsubmit = (e) => {
          e.preventDefault(); const d = ui.parseForm(ui.q('#syncForm', tab));
          if (!d.owner || !d.repo || !d.token) return ui.toast('请填写完整', 'err');
          App.sync.setConfig(d); ui.toast('同步配置已保存', 'ok'); if (App.app.updateSyncInd) App.app.updateSyncInd(); paint();
        };
        ui.q('#syncNow', tab).onclick = async () => {
          ui.q('#syncResult', tab).innerHTML = '<div class="tip">同步中…</div>';
          const r = await App.sync.sync();
          ui.q('#syncResult', tab).innerHTML = r.ok ? '<div class="callout">✅ 同步成功：本地与云端已一致</div>' : '<div class="callout urgent">❌ 同步失败：' + ui.esc(r.reason) + '</div>';
          if (r.ok) { App.app.go('home'); }
        };
        ui.q('#exp', tab).onclick = () => App.app.exportData();
        ui.q('#imp', tab).onclick = () => App.app.importData();
      }
      paint();
    }
  };

  App.global = G;
})(window.App);
