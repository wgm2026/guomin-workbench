/* ===== 模块四：健康减脂管理中心（早起 5:50 直播专属） ===== */
window.App = window.App || {};
(function (App) {
  const store = App.store, ui = App.ui;
  const EX = ['跑步', '力量训练', '跳绳', '骑行', '瑜伽', '无'];
  const m = { tab: 'entry', root: null };
  function getH(date) { return store.get('health').find(x => x.date === date); }
  function sorted() { return store.get('health').filter(h => h.weight).sort((a, b) => a.date.localeCompare(b.date)); }

  function paint() {
    const r = m.root;
    r.innerHTML = `<div class="section-title">🏃 健康减脂管理中心</div>
      <div class="section-sub">每日体重/饮食/运动/睡眠/压力记录，动态曲线与减重速率，早起直播人群专属护体方案。</div>
      <div class="tabs">
        <button class="tab ${m.tab === 'entry' ? 'active' : ''}" data-t="entry">＋ 每日录入</button>
        <button class="tab ${m.tab === 'curve' ? 'active' : ''}" data-t="curve">📈 体重曲线</button>
        <button class="tab ${m.tab === 'week' ? 'active' : ''}" data-t="week">📝 每周总结</button>
        <button class="tab ${m.tab === 'stress' ? 'active' : ''}" data-t="stress">🧘 压力记录</button>
      </div><div id="hTab"></div>`;
    ui.qa('.tab', r).forEach(b => b.onclick = () => { m.tab = b.dataset.t; paint(); });
    const tab = ui.q('#hTab', r);
    if (m.tab === 'entry') tabEntry(tab); else if (m.tab === 'curve') tabCurve(tab); else if (m.tab === 'week') tabWeek(tab); else if (m.tab === 'stress') tabStress(tab);
  }

  /* 录入 */
  function tabEntry(tab) {
    const date = ui.todayStr();
    const rec = getH(date) || {};
    tab.innerHTML = `<div class="grid grid-2">
      <div class="card"><h3>每日健康打卡 <span class="tag">${date}</span></h3>
        <form id="hf">${ui.formFields([
          { field: 'date', label: '日期', type: 'date', value: date },
          { field: 'weight', label: '晨起空腹体重(kg)', type: 'number', step: '0.1', value: rec.weight || '' },
          { field: 'water', label: '饮水量(ml)', type: 'number', value: rec.water || 2000 },
          { field: 'exercise', label: '运动类型', type: 'select', value: rec.exercise || '跑步', options: EX.map(e => ({ v: e, t: e })) },
          { field: 'exMin', label: '运动时长(分)', type: 'number', value: rec.exMin || 30 },
          { field: 'sleep', label: '睡眠时长(小时)', type: 'number', step: '0.1', value: rec.sleep || 7 },
          { field: 'stress', label: '今日压力(1-5)', type: 'select', value: rec.stress || 2, options: [{ v: 1, t: '1 轻松' }, { v: 2, t: '2 平稳' }, { v: 3, t: '3 略紧' }, { v: 4, t: '4 紧张' }, { v: 5, t: '5 高压' }] },
        ])}
        <div class="field"><label>三餐饮食详情</label><textarea class="input" data-field="meal" placeholder="早：鸡蛋+燕麦\n午：鸡胸+杂粮饭+蔬菜\n晚：清汤面（直播后补）">${ui.esc(rec.meal || '')}</textarea></div>
        <div class="field"><label>压力备注 / 心情</label><textarea class="input" data-field="stressNote" placeholder="今日办案强度、情绪">${ui.esc(rec.stressNote || '')}</textarea></div>
        <div class="row" style="justify-content:flex-end"><button type="submit" class="btn">保存打卡</button></div></form>
      </div>
      <div class="card"><h3>🌅 早起直播人群减脂专属方案</h3>
        <div class="callout">每日 5:50 开播，切忌空腹硬扛。空腹直播易低血糖、伤嗓、掉代谢。</div>
        <ul>
          <li><b>开播前(5:30)</b>：温水 200ml + 半根香蕉/一小块全麦面包，护胃提神不撑腹。</li>
          <li><b>直播中(6:30)</b>：小口补水，准备保温杯蜂蜜水。</li>
          <li><b>下播后(8:40)</b>：正经早餐——优质蛋白(蛋/奶)+碳水+蔬菜，补足直播消耗。</li>
          <li><b>作息</b>：建议 22:30 前睡，保证 7h，避免靠咖啡硬撑。</li>
          <li><b>训练</b>：高强度训练放下午/晚，早晨以拉伸+快走为宜。</li>
        </ul>
        <button class="btn sec sm mt" id="setRemind">设置今晚打卡提醒(22:00)</button>
        <div class="tip mt">系统会按你设定的提醒弹出，长期打卡形成稳定节律。</div>
      </div></div>`;
    ui.q('#hf', tab).onsubmit = (e) => {
      e.preventDefault(); const d = ui.parseForm(ui.q('#hf', tab));
      if (!d.weight) return ui.toast('请填写体重', 'err');
      const obj = { date: d.date, weight: Number(d.weight), water: Number(d.water) || 0, exercise: d.exercise, exMin: Number(d.exMin) || 0, sleep: Number(d.sleep) || 0, stress: Number(d.stress) || 2, meal: d.meal || '', stressNote: d.stressNote || '' };
      const ex = getH(d.date); if (ex) store.update('health', ex.id, obj); else store.add('health', obj);
      ui.toast('已打卡 ' + d.date, 'ok'); paint();
    };
    ui.q('#setRemind', tab).onclick = () => {
      const dt = date + 'T22:00';
      if (store.get('events').some(e => e.category === '健康打卡' && e.datetime === dt)) return ui.toast('今晚提醒已设', 'warn');
      store.add('events', { category: '健康打卡', client: '健康', title: '🌙 健康打卡：记录今日体重/饮食/睡眠', datetime: dt, level: 'normal', lead: 60, note: '', done: false });
      ui.toast('已设置今晚 22:00 打卡提醒', 'ok');
    };
  }

  /* 体重曲线 */
  function tabCurve(tab) {
    const all = sorted();
    tab.innerHTML = `<div class="card">
      <div id="cBox"></div>
      <div id="rateBox" class="mt"></div>
      <div class="tip mt">说明：曲线为每日晨起空腹体重；减重速率按首末记录区间折算为「公斤/周」。</div>
    </div>`;
    if (!all.length) { ui.q('#cBox', tab).innerHTML = '<div class="empty">暂无体重数据，先去打卡</div>'; return; }
    const labels = all.map(h => h.date.slice(5));
    const data = all.map(h => Number(h.weight));
    ui.lineChart(ui.q('#cBox', tab), { labels, series: [{ name: '体重(kg)', color: '#2f6fb0', data }], yfmt: v => v.toFixed(1) });
    const first = all[0], last = all[all.length - 1];
    const weeks = Math.max(0.0001, ui.diffDays(last.date, first.date) / 7);
    const rate = (Number(first.weight) - Number(last.weight)) / weeks;
    const total = (Number(first.weight) - Number(last.weight));
    let advice;
    if (rate <= 0) advice = `<div class="callout urgent">⚠ 体重未下降（${total >= 0 ? '+' : ''}${total.toFixed(1)}kg）。建议：控制晚餐碳水、保证蛋白质、增加下午力量训练，并检查是否饮水/盐分导致波动。</div>`;
    else if (rate < 0.3) advice = `<div class="callout warn">🐢 减重偏慢（${rate.toFixed(2)} kg/周）。建议微调：制造约 300–500 kcal 缺口，增加膳食纤维与饮水，保持每周 3–4 次运动。</div>`;
    else if (rate > 1.2) advice = `<div class="callout warn">⚡ 减重过快（${rate.toFixed(2)} kg/周），注意是否肌肉流失。建议适度增加蛋白与力量训练，避免反弹。</div>`;
    else advice = `<div class="callout">✅ 减重节奏健康（${rate.toFixed(2)} kg/周），保持当前方案。</div>`;
    ui.q('#rateBox', tab).innerHTML = `<div class="kpi-row">
      <div class="kpi"><span class="muted">起始</span><b>${first.weight}kg</b></div>
      <div class="kpi"><span class="muted">最新</span><b>${last.weight}kg</b></div>
      <div class="kpi"><span class="muted">累计变化</span><b style="color:${total > 0 ? 'var(--urgent)' : 'var(--ok)'}">${total >= 0 ? '+' : ''}${total.toFixed(1)}kg</b></div>
      <div class="kpi"><span class="muted">减重速率</span><b>${rate.toFixed(2)} kg/周</b></div>
    </div>${advice}`;
  }

  /* 每周总结 */
  function tabWeek(tab) {
    const wr = ui.weekRange();
    const recs = store.get('health').filter(h => h.date >= wr.start && h.date <= wr.end);
    tab.innerHTML = `<div class="card">
      <div class="row mb"><h3 style="margin:0">每周健康总结 <span class="tag">${wr.start} ~ ${wr.end}</span></h3>
      <span class="spacer"></span><button class="btn sec sm" id="cp">复制总结</button></div>
      <div id="wBox"></div></div>`;
    if (!recs.length) { ui.q('#wBox', tab).innerHTML = '<div class="empty">本周暂无打卡记录</div>'; return; }
    const avg = k => recs.reduce((s, h) => s + (Number(h[k]) || 0), 0) / recs.length;
    const wAvg = avg('weight'), sleepAvg = avg('sleep'), waterAvg = avg('water'), stressAvg = avg('stress');
    const exDays = recs.filter(h => h.exercise && h.exercise !== '无' && Number(h.exMin) > 0).length;
    const stressNote = stressAvg >= 3.5 ? '本周压力偏高，建议增加放松与睡眠。' : '压力水平可控。';
    ui.q('#wBox', tab).innerHTML = `<div class="report">
      <h2>📝 每周健康总结（${wr.start} ~ ${wr.end}）</h2>
      <div class="kpi-row">
        <div class="kpi"><span class="muted">打卡天数</span><b>${recs.length}</b></div>
        <div class="kpi"><span class="muted">平均体重</span><b>${wAvg.toFixed(1)}kg</b></div>
        <div class="kpi"><span class="muted">平均睡眠</span><b>${sleepAvg.toFixed(1)}h</b></div>
        <div class="kpi"><span class="muted">平均饮水</span><b>${Math.round(waterAvg)}ml</b></div>
        <div class="kpi"><span class="muted">运动天数</span><b>${exDays}</b></div>
      </div>
      <h4>评估与建议</h4>
      <ul>
        <li>睡眠均值 ${sleepAvg.toFixed(1)}h${sleepAvg < 7 ? '，低于 7h，早起直播人群建议 22:30 前入睡。' : '，节律良好。'}</li>
        <li>运动 ${exDays} 天${exDays < 3 ? '，偏少，建议每周至少 3–4 次、以下午为宜。' : '，保持。'}</li>
        <li>饮水量 ${Math.round(waterAvg)}ml${waterAvg < 1500 ? '，不足，直播日需额外补水。' : '，充足。'}</li>
        <li>${stressNote}</li>
        <li>早起直播护体：开播前少量碳水+温水，下播后补足正餐蛋白，避免空腹硬扛。</li>
      </ul>
    </div>`;
    ui.q('#cp', tab).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(ui.q('#wBox', tab).innerText); ui.toast('已复制', 'ok'); };
  }

  /* 压力记录 */
  function stressAdv(v) {
    return v >= 5 ? '高压：立即暂停，做 5 分钟腹式呼吸；今晚早睡，明早不空腹直播。'
      : v == 4 ? '紧张：工作间隙拉伸+喝水，把大任务拆小，避免情绪性进食。'
        : v == 3 ? '略紧：午间散步 10 分钟，记录一件已完成的事，降低焦虑。'
          : '平稳/轻松：保持节律，适度运动巩固状态。';
  }
  function tabStress(tab) {
    const recs = store.get('health').filter(h => h.stress && h.stressNote).slice().sort((a, b) => b.date.localeCompare(a.date));
    tab.innerHTML = `<div class="card">
      <h3>办案压力记录与舒缓建议 <span class="tag">${recs.length} 条</span></h3>
      <div class="tip mb">把办案压力情绪记录下来，系统按等级给出舒缓建议，避免长期高压影响状态与直播表现。</div>
      <div id="sList"></div></div>`;
    ui.q('#sList', tab).innerHTML = recs.length ? '<div class="list">' + recs.map(h => `<div class="list-item">
      <div class="li-main"><div class="li-title">${h.date} <span class="badge ${h.stress >= 4 ? 'urgent' : h.stress == 3 ? 'warn' : 'ok'}">压力 ${h.stress}/5</span></div>
      <div class="li-meta">${ui.esc(h.stressNote)}</div>
      <div class="callout" style="margin-top:6px">💡 ${ui.esc(stressAdv(Number(h.stress)))}</div></div>
    </div>`).join('') : '<div class="empty">暂无压力记录，在每日录入中填写「压力备注」即可</div>';
  }

  App.modules = App.modules || {};
  App.modules.health = { title: '健康减脂中心', render(root) { m.root = root; paint(); } };
})(window.App);
