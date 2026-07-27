/* ===== 国民工作台 · 定时提醒引擎 ===== */
window.App = window.App || {};
(function (App) {
  const R = {};
  let perm = false;

  R.ensurePerm = function () {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') { try { Notification.requestPermission().then(p => perm = (p === 'granted')); } catch (e) { Notification.requestPermission(p => perm = (p === 'granted')); } }
    else perm = Notification.permission === 'granted';
  };

  function fire(title, body) {
    App.ui.toast('🔔 ' + title, 'warn');
    if (perm) { try { new Notification('国民工作台 · ' + title, { body: body || '' }); } catch (e) {} }
  }
  R.fire = fire;

  // 计算某事件的提醒触发时刻 ISO
  function remindAt(ev) {
    const base = App.ui.parseLocal(ev.datetime);
    const lead = Number(ev.lead) || 0;
    return new Date(base.getTime() - lead * 60000).toISOString();
  }

  // 今日/明日即将到来的提醒
  R.upcoming = function (days) {
    days = days || 2;
    const now = new Date();
    const list = App.store.get('events').map(ev => {
      const at = App.ui.parseLocal(ev.datetime);
      return { ev, at, remind: App.ui.parseLocal(remindAt(ev)), lead: Number(ev.lead) || 0 };
    }).filter(x => !x.ev.done && x.at >= App.ui.parseLocal(App.ui.todayStr()) )
      .sort((a, b) => a.at - b.at);
    return list;
  };

  // 检查并触发（当页面打开时运行）
  R.check = function () {
    const now = Date.now();
    const log = App.store.get('reminderLog');
    const today = App.ui.todayStr();
    App.store.get('events').forEach(ev => {
      if (ev.done || !ev.lead) return;
      const ra = remindAt(ev);
      const diff = now - new Date(ra).getTime();
      // 触发窗口：提醒时刻前0 ~ 后10分钟内
      if (diff >= -1000 && diff <= 10 * 60000) {
        const key = today + '|' + ev.id;
        if (!log.some(l => l.key === key)) {
          fire('⏰ ' + (ev.title || ev.category), (ev.client ? '当事人：' + ev.client + '\n' : '') + '时间：' + App.ui.fmtDateTime(ev.datetime) + '（' + App.ui.leadText(ev.lead) + '）');
          App.store.add('reminderLog', { key, refId: ev.id, fireAt: App.ui.nowISO() });
        }
      }
      // 诉讼时效/期限已过但未办：红色警告
      if (now > new Date(ev.datetime).getTime() && (ev.level === 'urgent')) {
        const key = 'over|' + today + '|' + ev.id;
        if (!log.some(l => l.key === key)) {
          fire('⚠ 期限已过：' + (ev.title || ev.category), '请立即处理，避免错过诉讼时效/举证期！');
          App.store.add('reminderLog', { key, refId: ev.id, fireAt: App.ui.nowISO() });
        }
      }
    });

    // 每日 9:00 自动推送同类型法律主播爆款（首页 + 弹窗）
    const d = new Date();
    if (d.getHours() === 9 && d.getMinutes() < 1) {
      const key = 'hotpush|' + today;
      if (!log.some(l => l.key === key)) {
        const dy = App.modules.douyin;
        if (dy && dy.ensureDailyHot) {
          const hot = dy.ensureDailyHot(today);
          const titles = hot.slice(0, 5).map((c, i) => (i + 1) + '. ' + (c.title || '') + '（' + (c.author || '') + '）').join('\n');
          fire('📌 今日爆款视频推送（9:00）', titles || '今日暂无');
          App.store.add('reminderLog', { key, fireAt: App.ui.nowISO() });
        }
      }
    }
  };

  R.start = function () {
    R.ensurePerm();
    R.check();
    setInterval(R.check, 30000);
  };

  App.reminders = R;
})(window.App);
