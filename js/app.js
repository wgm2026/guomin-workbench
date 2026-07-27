/* ===== 国民工作台 · 主控制器 ===== */
(function (App) {
  const ui = App.ui;
  const app = {};
  let current = 'home';

  app.go = function (mod) {
    const def = App.modules[mod]; if (!def) return;
    current = mod;
    ui.qa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.module === mod));
    ui.q('#topbarTitle').textContent = def.title;
    const content = ui.q('#content');
    content.scrollTop = 0;
    def.render(content);
  };

  app.exportData = function () {
    const data = App.store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '国民工作台备份_' + ui.todayStr() + '.json';
    a.click();
    ui.toast('已导出备份文件', 'ok');
  };
  app.importData = function () {
    const inp = ui.q('#importFile');
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { App.store.importAll(JSON.parse(reader.result)); ui.toast('备份已恢复', 'ok'); app.go(current); }
        catch (e) { ui.toast('导入失败：' + e.message, 'err'); }
      };
      reader.readAsText(file);
      inp.value = '';
    };
    inp.click();
  };

  function startClock() {
    const el = ui.q('#clock');
    const tick = () => { const d = new Date(); el.textContent = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); };
    tick(); setInterval(tick, 1000);
  }

  function updateSyncInd() {
    const ind = ui.q('#syncInd'); if (!ind) return;
    const on = App.sync.enabled();
    ind.textContent = on ? '☁ 已同步' : '☁ 本地';
    ind.classList.toggle('on', on);
  }
  app.updateSyncInd = updateSyncInd;

  function init() {
    App.store.load();
    ui.q('#brandAccount').textContent = App.store.settings().lawyer + ' · ' + App.store.settings().douyin;
    ui.qa('.nav-item').forEach(b => b.onclick = () => app.go(b.dataset.module));
    ui.q('#toggleSidebar').onclick = () => ui.q('#sidebar').classList.toggle('collapsed');
    ui.q('#btnQuickMemo').onclick = () => App.global.quickMemo();
    ui.q('#btnExport').onclick = () => app.exportData();
    ui.q('#btnImport').onclick = () => app.importData();
    ui.q('#syncInd').onclick = () => app.go('global');
    startClock();
    updateSyncInd();
    // 启动时拉取云端（若已配置）
    if (App.sync.enabled()) {
      App.sync.pull().then(res => {
        if (res.ok && res.data) {
          const changed = App.sync.mergeTo(res.data);
          if (changed) { App.store.load(true); ui.toast('☁ 已从云端同步最新数据', 'ok'); if (current) app.go(current); }
        }
        updateSyncInd();
      });
    }
    app.go('home');
    App.reminders.start();
  }

  App.app = app;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.App);
