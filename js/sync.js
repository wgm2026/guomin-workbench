/* ===== 国民工作台 · 云端同步层（JSONBin 免费版） =====
 * 设计：本地优先（localStorage 即时响应）+ 写后异步上云 + 打开时拉取云端
 * 单人两设备同步：A 设备写入 → 上云；B 设备打开/刷新 → 拉取覆盖本地
 * 配置：在「全局辅助中心 → 云端留存」填入 JSONBin Bin ID + Access Key 即可启用
 */
window.App = window.App || {};
(function (App) {
  const SYNC = {};
  const LKEY = 'guomin_workbench_v1';          // 本地数据
  const CKEY = 'guomin_sync_config_v1';         // 云端配置（binId / masterKey / accessCode）

  SYNC.getConfig = function () {
    try { return JSON.parse(localStorage.getItem(CKEY)) || {}; } catch (e) { return {}; }
  };
  SYNC.setConfig = function (cfg) { localStorage.setItem(CKEY, JSON.stringify(cfg)); };
  SYNC.enabled = function () { const c = SYNC.getConfig(); return !!(c.binId && c.masterKey); };

  const BIN_URL = function (binId) { return 'https://api.jsonbin.io/v3/b/' + binId; };
  const HEADERS = function (cfg) {
    return { 'Content-Type': 'application/json', 'X-Master-Key': cfg.masterKey, 'X-Bin-Meta': 'false' };
  };

  // 拉取云端数据
  SYNC.pull = function () {
    const cfg = SYNC.getConfig(); if (!SYNC.enabled()) return Promise.resolve({ ok: false, reason: 'no-config' });
    return fetch(BIN_URL(cfg.binId) + '/latest', { method: 'GET', headers: HEADERS(cfg) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(j => { const data = j.record != null ? j.record : j; return { ok: true, data }; })
      .catch(e => ({ ok: false, reason: e.message }));
  };

  // 推送本地数据到云端
  SYNC.push = function (data) {
    const cfg = SYNC.getConfig(); if (!SYNC.enabled()) return Promise.resolve({ ok: false, reason: 'no-config' });
    return fetch(BIN_URL(cfg.binId), { method: 'PUT', headers: HEADERS(cfg), body: JSON.stringify(data) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(() => ({ ok: true }))
      .catch(e => ({ ok: false, reason: e.message }));
  };

  // 合并云端数据到本地（云端优先覆盖本地，但保留本地较新时间戳的记录）
  SYNC.mergeTo = function (cloud) {
    if (!cloud || typeof cloud !== 'object') return false;
    const local = App.store.exportAll();
    // 简化策略：以 _meta.syncedAt 比较，云端较新则整体覆盖本地
    const localT = (local._meta && local._meta.syncedAt) || 0;
    const cloudT = (cloud._meta && cloud._meta.syncedAt) || 0;
    if (cloudT > localT) {
      // 云端覆盖本地（保留本地配置）
      const savedCfg = SYNC.getConfig();
      localStorage.setItem(LKEY, JSON.stringify(cloud));
      SYNC.setConfig(savedCfg);
      return true;
    }
    return false;
  };

  // 一次完整同步：先拉取，若云端较新则覆盖本地；再把本地推上云（保证本地最新写法上云）
  SYNC.sync = function () {
    if (!SYNC.enabled()) return Promise.resolve({ ok: false, reason: 'no-config' });
    return SYNC.pull().then(res => {
      if (res.ok && res.data) { const changed = SYNC.mergeTo(res.data); if (changed) App.store.load(true); }
      // 标记同步时间并推送
      const data = App.store.exportAll();
      data._meta = data._meta || {};
      data._meta.syncedAt = Date.now();
      localStorage.setItem(LKEY, JSON.stringify(data));
      return SYNC.push(data);
    });
  };

  // 自动同步：每次本地写入后调用（节流 3 秒）
  let timer = null;
  SYNC.notifyWrite = function () {
    if (!SYNC.enabled()) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      SYNC.sync().then(r => {
        if (r.ok) App.ui.toast('☁ 已同步到云端', 'ok');
        else if (r.reason !== 'no-config') App.ui.toast('☁ 同步失败：' + r.reason, 'err');
      });
    }, 3000);
  };

  App.sync = SYNC;
})(window.App);
