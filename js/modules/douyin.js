/* ===== 模块三：律师抖音账号智能运营分析系统 ===== */
window.App = window.App || {};
(function (App) {
  const store = App.store, ui = App.ui;
  const m = { tab: 'video', root: null };
  // 爆款/低迷判定
  function grade(v) {
    const f = Number(v.finishRate), r = Number(v.retain5s);
    if (f >= 45 && r >= 55) return '爆款';
    if (f < 22 || r < 35) return '低迷';
    return '普通';
  }
  function paint() {
    const r = m.root;
    r.innerHTML = `<div class="section-title">📱 抖音账号智能运营分析</div>
      <div class="section-sub">本人视频监测、同城竞品拆解、每日选题生成、私信标准话术与发布规划，全链路提升普法转化。</div>
      <div class="tabs">
        <button class="tab ${m.tab === 'video' ? 'active' : ''}" data-t="video">📊 本人账号监测</button>
        <button class="tab ${m.tab === 'comp' ? 'active' : ''}" data-t="comp">🔍 竞品拆解</button>
        <button class="tab ${m.tab === 'topic' ? 'active' : ''}" data-t="topic">💡 选题库</button>
        <button class="tab ${m.tab === 'dm' ? 'active' : ''}" data-t="dm">💬 私信管理</button>
        <button class="tab ${m.tab === 'plan' ? 'active' : ''}" data-t="plan">🗓 发布规划</button>
      </div><div id="dyTab"></div>`;
    ui.qa('.tab', r).forEach(b => b.onclick = () => { m.tab = b.dataset.t; paint(); });
    const tab = ui.q('#dyTab', r);
    if (m.tab === 'video') tabVideo(tab); else if (m.tab === 'comp') tabComp(tab);
    else if (m.tab === 'topic') tabTopic(tab); else if (m.tab === 'dm') tabDM(tab); else if (m.tab === 'plan') tabPlan(tab);
  }

  /* 本人账号 */
  function tabVideo(tab) {
    const list = store.get('videos').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const hot = list.filter(v => grade(v) === '爆款'), low = list.filter(v => grade(v) === '低迷');
    tab.innerHTML = `<div class="grid grid-2">
      <div class="card"><h3>新增 / 编辑短视频数据</h3>
        <form id="vf">${ui.formFields([
          { field: 'date', label: '发布日期', type: 'date', value: ui.todayStr() },
          { field: 'title', label: '标题', type: 'text', ph: '视频标题' },
          { field: 'playCount', label: '播放量', type: 'number', value: 0 },
          { field: 'finishRate', label: '完播率(%)', type: 'number', step: '0.1', value: 0 },
          { field: 'retain5s', label: '5秒留存率(%)', type: 'number', step: '0.1', value: 0 },
          { field: 'shareRate', label: '转发率(%)', type: 'number', step: '0.1', value: 0 },
          { field: 'convRate', label: '咨询转化率(%)', type: 'number', step: '0.1', value: 0 },
        ])}<div class="row" style="justify-content:flex-end"><button type="submit" class="btn">保存</button></div></form>
      </div>
      <div class="card"><h3>数据概览</h3>
        <div class="kpi-row">
          <div class="kpi"><span class="muted">作品数</span><b>${list.length}</b></div>
          <div class="kpi"><span class="muted">爆款</span><b style="color:var(--ok)">${hot.length}</b></div>
          <div class="kpi"><span class="muted">低迷</span><b style="color:var(--urgent)">${low.length}</b></div>
        </div>
        <div id="vChart"></div>
        <div class="tip mt">判定：完播率≥45% 且 5秒留存≥55% → 爆款；完播率&lt;22% 或 5秒留存&lt;35% → 低迷。</div>
      </div></div>
      <div class="card mt"><h3>📥 从第三方采集文件导入 <span class="tag">蝉妈妈 / 飞瓜 / 新抖 等</span></h3>
        <div class="row mb"><input type="file" id="videoImport" accept=".csv,.json" class="input" style="max-width:340px"/>
          <button class="btn ghost sm" id="dlVTpl">下载导入模板</button></div>
        <div class="tip">支持 CSV / JSON。自动映射（日期/标题/播放量/完播率/5秒留存/转发率/咨询转化率），按「日期 + 标题」合并。</div>
      </div>
      <div class="card mt"><h3>作品明细</h3><div id="vList"></div></div>`;
    ui.q('#videoImport', tab).onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          ui.importWizard({
            content: rd.result, name: f.name, requireDate: true, after: () => paint(),
            fields: [
              { key: 'date', label: '发布日期', kws: ['日期', '发布日期', '时间', 'date', 'datetime'] },
              { key: 'title', label: '标题', kws: ['标题', '视频标题', 'title', 'name'] },
              { key: 'playCount', label: '播放量', kws: ['播放量', '播放', 'play', 'play_count'] },
              { key: 'finishRate', label: '完播率(%)', kws: ['完播率', '完播', 'finish', 'finish_rate'] },
              { key: 'retain5s', label: '5秒留存率(%)', kws: ['5秒留存', '5秒', '留存', 'retain', 'retain5s'] },
              { key: 'shareRate', label: '转发率(%)', kws: ['转发率', '转发', 'share', 'share_rate'] },
              { key: 'convRate', label: '咨询转化率(%)', kws: ['咨询转化率', '转化率', '转化', 'conv', 'conv_rate'] },
            ],
            onRow: (rec) => {
              const date = ui.normDate(rec.date); if (!date) return;
              const obj = { date, title: rec.title || '', playCount: Number(String(rec.playCount).replace(/[, ]/g, '')) || 0, finishRate: Number(rec.finishRate) || 0, retain5s: Number(rec.retain5s) || 0, shareRate: Number(rec.shareRate) || 0, convRate: Number(rec.convRate) || 0 };
              const ex = store.get('videos').find(v => v.date === date && (v.title || '') === (obj.title || ''));
              if (ex) store.update('videos', ex.id, obj); else store.add('videos', obj);
            }
          });
        } catch (err) { ui.toast('解析失败：' + err.message, 'err'); }
      };
      rd.readAsText(f); e.target.value = '';
    };
    ui.q('#dlVTpl', tab).onclick = () => ui.downloadCsvTemplate(
      ['发布日期', '标题', '播放量', '完播率(%)', '5秒留存率(%)', '转发率(%)', '咨询转化率(%)'],
      ['2026-07-27', '工伤赔偿3步走', '5000', '50', '60', '5', '3'], '短视频数据导入模板.csv');
    ui.q('#vf', tab).onsubmit = (e) => {
      e.preventDefault(); const d = ui.parseForm(ui.q('#vf', tab));
      const obj = { date: d.date, title: d.title, playCount: Number(d.playCount) || 0, finishRate: Number(d.finishRate) || 0, retain5s: Number(d.retain5s) || 0, shareRate: Number(d.shareRate) || 0, convRate: Number(d.convRate) || 0 };
      const exId = ui.q('#vf', tab).dataset.edit;
      if (exId) { store.update('videos', exId, obj); ui.q('#vf', tab).dataset.edit = ''; } else store.add('videos', obj);
      ui.toast('已保存', 'ok'); paint();
    };
    // chart
    const top = list.slice(0, 8).reverse();
    ui.barChart(ui.q('#vChart', tab), { labels: top.map(v => (v.title || '').slice(0, 4)), data: top.map(v => Number(v.finishRate) || 0), color: '#3a7bd5', vfmt: v => v + '%' });
    ui.q('#vList', tab).innerHTML = list.length ? '<table class="table"><thead><tr><th>日期</th><th>标题</th><th>完播</th><th>5秒留存</th><th>转发</th><th>转化</th><th>评级</th><th></th></tr></thead><tbody>' + list.map(v => {
      const g = grade(v); const gc = g === '爆款' ? 'ok' : g === '低迷' ? 'urgent' : 'gray';
      return `<tr><td>${v.date || ''}</td><td>${ui.esc((v.title || '').slice(0, 14))}</td><td>${v.finishRate || 0}%</td><td>${v.retain5s || 0}%</td><td>${v.shareRate || 0}%</td><td>${v.convRate || 0}%</td><td><span class="badge ${gc}">${g}</span></td><td><button class="btn ghost sm" data-e="${v.id}">编辑</button> <button class="btn danger sm" data-d="${v.id}">删</button></td></tr>`;
    }).join('') + '</tbody></table>' : '<div class="empty">暂无作品</div>';
    ui.qa('[data-d]', ui.q('#vList', tab)).forEach(b => b.onclick = () => { store.remove('videos', b.dataset.d); paint(); });
    ui.qa('[data-e]', ui.q('#vList', tab)).forEach(b => b.onclick = () => {
      const v = store.find('videos', b.dataset.e); const f = ui.q('#vf', tab);
      f.dataset.edit = v.id;
      ['date', 'title', 'playCount', 'finishRate', 'retain5s', 'shareRate', 'convRate'].forEach(k => { const inp = ui.q(`[data-field="${k}"]`, f); if (inp) inp.value = v[k] != null ? v[k] : ''; });
      ui.toast('已载入，修改后保存'); window.scrollTo(0, 0);
    });
    if (hot.length && low.length) {
      const bh = hot.reduce((s, v) => s + Number(v.finishRate), 0) / hot.length;
      const lh = low.reduce((s, v) => s + Number(v.finishRate), 0) / low.length;
      tab.insertAdjacentHTML('beforeend', `<div class="card mt"><h3>爆款 vs 低迷 差异分析</h3>
        <div class="callout">🔥 爆款平均完播率 <b>${bh.toFixed(1)}%</b>，低迷平均 <b>${lh.toFixed(1)}%</b>，差距 <b>${(bh - lh).toFixed(1)}%</b>。</div>
        <ul><li>爆款共性：开头 3 秒抛结论/冲突，5秒留存高；话题与观众强相关。</li><li>低迷共性：铺垫过长、信息密度低、缺少明确钩子。建议复盘爆款结构并复用。</li></ul></div>`);
    }
  }

  /* 竞品拆解 */
  const COMP_POOL = [
    { author: '法律博主·李律说', title: '离婚过错方少分财产？一个案例讲透', hook: '“对方出轨还能平分？”——用反问制造悬念', framework: '误区-正解-法条-操作', angle: '婚姻财产分割实务', shot: '近景口播+字幕高亮', commentOp: '评论区置顶「需要协议模板扣1」' },
    { author: '法律博主·王律普法', title: '工伤认定的3个关键时间点', hook: '“超过这个时间公司就不认了”', framework: '时间线-后果-提醒', angle: '工伤维权痛点', shot: '桌面讲稿+案例图', commentOp: '引导私信发材料' },
    { author: '普法博主·张法官', title: '借条这样写才有效', hook: '“你写的借条可能废纸一张”', framework: '常见错误-正确模板-提示', angle: '民间借贷高频', shot: '手写示范+红笔标注', commentOp: '置顶模板领取' },
    { author: '法律博主·陈律师', title: '被辞退怎么拿赔偿', hook: '“公司这3句话是在坑你”', framework: '话术拆解-法律依据-应对', angle: '劳动纠纷共鸣', shot: '双人情景演绎', commentOp: '评论区答疑' },
    { author: '普法博主·法务君', title: '二手房这些坑别踩', hook: '“签合同前看这一条”', framework: '风险点-案例-避坑', angle: '房产交易', shot: '实景+重点圈注', commentOp: '引导收藏' },
  ];
  function douyinSearchUrl(q) { return 'https://www.douyin.com/search/' + encodeURIComponent(q || ''); }
  // 确保某日有 5 条同类型（法律/律师）主播爆款，并返回
  function ensureDailyHot(date) {
    date = date || ui.todayStr();
    let list = store.get('competitors').filter(c => c.date === date);
    if (list.length < 5) {
      COMP_POOL.slice(0, 5).forEach(p => { if (list.length < 5) { const obj = Object.assign({ date, url: douyinSearchUrl(p.title) }, p); store.add('competitors', obj); list.push(obj); } });
    }
    return store.get('competitors').filter(c => c.date === date).slice(0, 5);
  }
  function jumpUrl(c) { return c.url || douyinSearchUrl(c.title || c.author || ''); }
  function tabComp(tab) {
    const list = store.get('competitors').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const todayHot = ensureDailyHot(ui.todayStr());
    tab.innerHTML = `<div class="card mb">
      <div class="row" style="align-items:center"><h3 style="margin:0">📌 今日爆款视频推送 <span class="tag">每日 9:00 自动 · 同类型法律主播</span></h3>
        <span class="spacer"></span><button class="btn sec sm" id="regen">重新生成今日 5 条</button></div>
      <div class="wrap mt">
        ${todayHot.map(c => `<span class="pill" style="padding:7px 10px">${ui.esc(c.title)}<a class="btn ghost sm" style="margin-left:8px;padding:2px 8px" href="${jumpUrl(c)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ 跳转</a></span>`).join('')}
      </div>
      <div class="tip mt">点击「↗ 跳转」一键打开抖音对应话题/作者页观看。系统每天 9:00 自动推送 5 条同类型（法律/律师）主播爆款，并弹窗提醒。</div>
    </div>
    <div class="card">
      <div class="row mb"><h3 style="margin:0">竞品 / 同类型爆款拆解 <span class="tag">${list.length} 条</span></h3>
      <span class="spacer"></span><button class="btn ghost sm" id="addC">＋ 手动添加</button></div>
      <div class="tip mb">每条爆款拆解：开头钩子、文案框架、普法切入点、镜头表达、评论区运营；可一键跳转观看。</div>
      <div id="cList"></div></div>`;
    const render = () => {
      ui.q('#cList', tab).innerHTML = list.length ? '<div class="list">' + list.map(c => `<div class="list-item">
        <div class="li-main"><div class="li-title">${ui.esc(c.title)} <span class="badge primary">${ui.esc(c.author || '')}</span> <span class="muted">${c.date || ''}</span></div>
        <div class="li-meta">🪝 钩子：${ui.esc(c.hook || '')}</div>
        <div class="li-meta">📐 框架：${ui.esc(c.framework || '')} ｜ 切入点：${ui.esc(c.angle || '')}</div>
        <div class="li-meta">🎥 镜头：${ui.esc(c.shot || '')} ｜ 💬 评论区：${ui.esc(c.commentOp || '')}</div></div>
        <div class="row"><button class="btn ghost sm" data-act="edit" data-id="${c.id}">拆解</button><a class="btn ghost sm" href="${jumpUrl(c)}" target="_blank" rel="noopener">↗ 跳转</a><button class="btn danger sm" data-act="del" data-id="${c.id}">删</button></div>
      </div>`).join('') + '</div>' : '<div class="empty">暂无，9:00 会自动推送今日 5 条</div>';
      ui.qa('[data-act]', ui.q('#cList', tab)).forEach(b => b.onclick = () => { const c = store.find('competitors', b.dataset.id); if (b.dataset.act === 'del') store.remove('competitors', c.id), render(); else editC(c, render); });
    };
    ui.q('#regen', tab).onclick = () => {
      store.get('competitors').filter(c => c.date === ui.todayStr()).forEach(c => store.remove('competitors', c.id));
      ensureDailyHot(ui.todayStr()); ui.toast('已重新生成今日 5 条', 'ok'); paint();
    };
    ui.q('#addC', tab).onclick = () => editC(null, render);
    render();
  }
  function editC(c, after) {
    const f = ui.el(`<div><form id="cf">${ui.formFields([
      { field: 'author', label: '作者/账号', type: 'text', value: c ? c.author : '' },
      { field: 'title', label: '作品标题', type: 'text', value: c ? c.title : '' },
      { field: 'hook', label: '开头钩子句式', type: 'text', value: c ? c.hook : '' },
      { field: 'framework', label: '文案框架', type: 'text', value: c ? c.framework : '' },
      { field: 'angle', label: '普法切入点', type: 'text', value: c ? c.angle : '' },
      { field: 'shot', label: '镜头表达方式', type: 'text', value: c ? c.shot : '' },
      { field: 'commentOp', label: '评论区运营方式', type: 'text', value: c ? c.commentOp : '' },
    ])}<div class="row" style="justify-content:flex-end"><button class="btn" type="submit">保存</button></div></form></div>`);
    const mod = ui.modal({ title: c ? '编辑拆解' : '添加竞品', body: f });
    ui.q('#cf', f).onsubmit = (e) => { e.preventDefault(); const d = ui.parseForm(f); if (c) store.update('competitors', c.id, d); else store.add('competitors', Object.assign({ date: ui.todayStr() }, d)); mod.close(); ui.toast('已保存'); after(); };
  }

  /* 选题库 */
  const SUBJECTS = ['离婚财产分割', '工伤认定与赔偿', '借条与民间借贷', '劳动合同解除补偿', '二手房买卖纠纷', '彩礼返还', '交通事故责任认定', '遗产继承顺序', '购房定金退否', '名誉权侵权', '霸王条款维权', '加班费追讨', '试用期权益', '物业费纠纷'];
  const HOOKS = ['很多人第一步就错了', '一个真实案例讲透', '法院这样判', '别再被忽悠了', '3分钟说清关键点', '这条一定收藏'];
  function tabTopic(tab) {
    const list = store.get('topics').slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const todayCnt = list.filter(t => t.date === ui.todayStr()).length;
    tab.innerHTML = `<div class="card">
      <div class="row mb"><h3 style="margin:0">每日原创普法选题 <span class="tag">今日 ${todayCnt} 条</span></h3>
      <span class="spacer"></span><button class="btn sec sm" id="gen8">生成今日 8 条</button></div>
      <div class="tip mb">结合社会热点法律事件，每日生成原创标题 + 文案初稿，可直接用于拍摄。</div>
      <div id="tList"></div></div>`;
    const render = () => {
      ui.q('#tList', tab).innerHTML = list.length ? '<div class="list">' + list.map(t => `<div class="list-item">
        <div class="li-main"><div class="li-title">${ui.esc(t.title)} ${t.used ? '<span class="badge ok">已用</span>' : '<span class="badge gray">未拍</span>'} ${t.hot ? '<span class="badge info">' + ui.esc(t.hot) + '</span>' : ''} <span class="muted">${t.date || ''}</span></div>
        <div class="li-meta" style="white-space:pre-wrap">${ui.esc((t.draft || '').slice(0, 160))}</div></div>
        <div class="row"><button class="btn ghost sm" data-act="cp" data-id="${t.id}">复制</button><button class="btn ghost sm" data-act="use" data-id="${t.id}">标记已拍</button><button class="btn danger sm" data-act="del" data-id="${t.id}">删</button></div>
      </div>`).join('') + '</div>' : '<div class="empty">暂无选题，点击「生成今日 8 条」</div>';
      ui.qa('[data-act]', ui.q('#tList', tab)).forEach(b => b.onclick = () => {
        const t = store.find('topics', b.dataset.id); if (!t) return;
        if (b.dataset.act === 'del') store.remove('topics', t.id), render();
        else if (b.dataset.act === 'use') store.update('topics', t.id, { used: true }), render();
        else { navigator.clipboard && navigator.clipboard.writeText(t.title + '\n\n' + (t.draft || '')); ui.toast('已复制标题与文案', 'ok'); }
      });
    };
    ui.q('#gen8', tab).onclick = () => {
      if (list.filter(t => t.date === ui.todayStr()).length >= 8) { ui.toast('今日 8 条已生成', 'warn'); return; }
      const used = new Set();
      for (let i = 0; i < 8; i++) {
        let s, h, key; let guard = 0;
        do { s = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)]; h = HOOKS[Math.floor(Math.random() * HOOKS.length)]; key = s + h; guard++; } while (used.has(key) && guard < 20);
        used.add(key);
        const title = s + '：' + h;
        const draft = `【开头】${h}——关于${s}。\n【痛点】不少人在${s}上吃闷亏，是因为忽略了关键证据与时限。\n【法律点】根据《民法典》相关规定，${s}的核心在于……（结合本案要点说明）。\n【操作】第一步收集证据；第二步把握时限；第三步依法主张。\n【结尾】关注@王国民律师，遇到类似问题私信咨询，领取对应文书模板。`;
        store.add('topics', { date: ui.todayStr(), title, draft, hot: '每日生成', used: false });
      }
      ui.toast('已生成今日 8 条选题', 'ok'); render();
    };
    render();
  }

  /* 私信管理 */
  function tabDM(tab) {
    const list = store.get('dms').slice().sort((a, b) => (b.count || 0) - (a.count || 0));
    tab.innerHTML = `<div class="card">
      <div class="row mb"><h3 style="margin:0">私信高频问题 / 标准回复 <span class="tag">${list.length} 类</span></h3>
      <span class="spacer"></span><button class="btn sec sm" id="addD">＋ 新增</button><button class="btn ghost sm" id="fromQA">从直播问答导入</button></div>
      <div id="dList"></div></div>`;
    const render = () => {
      ui.q('#dList', tab).innerHTML = list.length ? '<div class="list">' + list.map(d => `<div class="list-item">
        <div class="li-main"><div class="li-title">${ui.esc(d.question)} <span class="badge primary">${ui.esc(d.category || '未分类')}</span> <span class="badge info">${d.count || 0} 次</span></div>
        <div class="li-meta">📩 模板：${ui.esc(d.template || '（待完善）')}</div></div>
        <div class="row"><button class="btn ghost sm" data-act="edit" data-id="${d.id}">完善</button><button class="btn danger sm" data-act="del" data-id="${d.id}">删</button></div>
      </div>`).join('') + '</div>' : '<div class="empty">暂无，从直播高频问题导入或手动新增</div>';
      ui.qa('[data-act]', ui.q('#dList', tab)).forEach(b => b.onclick = () => { const d = store.find('dms', b.dataset.id); if (b.dataset.act === 'del') store.remove('dms', d.id), render(); else editD(d, render); });
    };
    ui.q('#addD', tab).onclick = () => editD(null, render);
    ui.q('#fromQA', tab).onclick = () => {
      const qa = store.get('liveQA'); let n = 0;
      qa.forEach(q => { if (!store.get('dms').some(d => d.question === q.keyword)) { store.add('dms', { question: q.keyword, category: '直播高频', template: q.a || ('您好，关于「' + q.keyword + '」可先准备相关证据材料，具体可私信沟通。'), count: 1 }); n++; } });
      ui.toast(n ? ('已导入 ' + n + ' 条') : '无新增', n ? 'ok' : 'warn'); render();
    };
    render();
  }
  function editD(d, after) {
    const f = ui.el(`<div><form id="df">${ui.formFields([
      { field: 'question', label: '高频问题', type: 'text', value: d ? d.question : '' },
      { field: 'category', label: '分类', type: 'text', value: d ? d.category : '' },
      { field: 'count', label: '出现次数', type: 'number', value: d ? d.count : 1 },
    ])}<div class="field"><label>标准回复模板</label><textarea class="input" data-field="template" placeholder="可复制粘贴的私信回复">${ui.esc(d ? d.template || '' : '')}</textarea></div>
    <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">保存</button></div></form></div>`);
    const mod = ui.modal({ title: d ? '完善回复模板' : '新增私信模板', body: f });
    ui.q('#df', f).onsubmit = (e) => { e.preventDefault(); const dd = ui.parseForm(f); dd.count = Number(dd.count) || 1; if (d) store.update('dms', d.id, dd); else store.add('dms', dd); mod.close(); ui.toast('已保存'); after(); };
  }

  /* 发布规划 */
  function tabPlan(tab) {
    const plans = store.get('events').filter(e => e.category === '发布').sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    tab.innerHTML = `<div class="card">
      <h3>每周发布时间表与提醒</h3>
      <div class="form-2">
        <div class="field"><label>星期</label><select class="input" id="pw"><option value="1">周一</option><option value="2">周二</option><option value="3">周三</option><option value="4">周四</option><option value="5">周五</option><option value="6">周六</option><option value="7">周日</option></select></div>
        <div class="field"><label>时间</label><input class="input" type="time" id="pt" value="12:00"/></div>
      </div>
      <div class="field"><label>发布内容 / 标题</label><input class="input" id="ptitle" placeholder="如：工伤赔偿3步走"/></div>
      <div class="row mb" style="justify-content:flex-end"><button class="btn" id="addP">加入本周计划并设提醒</button></div>
      <div class="tip mb">系统会在每次发布前 1 小时弹窗+系统通知提醒。</div>
      <div id="pList"></div></div>`;
    const render = () => {
      ui.q('#pList', tab).innerHTML = plans.length ? '<div class="list">' + plans.map(p => {
        const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(p.datetime).getDay()];
        return `<div class="list-item"><div class="li-main"><div class="li-title">${wd} ${ui.fmtTime(p.datetime)} · ${ui.esc(p.title)}</div><div class="li-meta">${ui.fmtDate(p.datetime)} 发布 · 提前1小时提醒</div></div><button class="btn danger sm" data-id="${p.id}">移除</button></div>`;
      }).join('') + '</div>' : '<div class="empty">暂无发布计划</div>';
      ui.qa('[data-id]', ui.q('#pList', tab)).forEach(b => b.onclick = () => { store.remove('events', b.dataset.id); render(); });
    };
    ui.q('#addP', tab).onclick = () => {
      const wd = Number(ui.q('#pw', tab).value); const tm = ui.q('#pt', tab).value; const title = ui.q('#ptitle', tab).value.trim();
      if (!title) return ui.toast('请填写发布内容', 'err');
      const now = new Date(); const curWd = (now.getDay() === 0 ? 7 : now.getDay());
      let diff = wd - curWd; if (diff <= 0) diff += 7;
      const dt = ui.todayStr(ui.addDays(now, diff)) + 'T' + tm;
      store.add('events', { category: '发布', client: '抖音', title: '📱 发布：' + title, datetime: dt, level: 'normal', lead: 60, note: '', done: false });
      ui.toast('已加入计划：' + dt.slice(5), 'ok'); render();
    };
    render();
  }

  App.modules = App.modules || {};
  App.modules.douyin = { title: '抖音运营分析', render(root) { m.root = root; paint(); }, ensureDailyHot, jumpUrl, douyinSearchUrl };
})(window.App);
