/* ===== 国民工作台 · 云端同步层（GitHub 仓库版） =====
 * 设计：本地优先（localStorage 即时响应）+ 写后异步上云 + 打开时拉取云端
 * 单人两设备同步：A 设备写入 → 上云；B 设备打开/刷新 → 拉取覆盖本地
 * 配置：在「全局辅助中心 → 云端留存」填入 GitHub Token + 用户名 + 仓库名即可启用
 * 原理：用 GitHub 仓库里的 cloud-data.json 当云端数据库，一个 Token 全搞定
 */
window.App = window.App || {};
(function (App) {
  const SYNC = {};
  const LKEY = 'guomin_workbench_v1';          // 本地数据
  const CKEY = 'guomin_sync_config_v1';         // 云端配置
  const FILE = 'cloud-data.json';               // 云端数据文件名

  SYNC.getConfig = function () {
    try { return JSON.parse(localStorage.getItem(CKEY)) || {}; } catch (e) { return {}; }
  };
  SYNC.setConfig = function (cfg) { localStorage.setItem(CKEY, JSON.stringify(cfg)); };
  SYNC.enabled = function () { const c = SYNC.getConfig(); return !!(c.token && c.owner && c.repo); };

  function apiBase(cfg) { return 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + FILE; }
  function headers(cfg) { return { 'Authorization': 'token ' + cfg.token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }; }

  // 拉取云端数据
  SYNC.pull = function () {
    const cfg = SYNC.getConfig(); if (!SYNC.enabled()) return Promise.resolve({ ok: false, reason: 'no-config' });
    return fetch(apiBase(cfg) + '?ref=main', { method: 'GET', headers: headers(cfg) })
      .then(r => {
        if (r.status === 404) return { ok: true, data: null, sha: null };  // 云端还没数据
        if (!r.ok) return Promise.reject(new Error('HTTP ' + r.status));
        return r.json();
      })
      .then(j => {
        if (!j) return { ok: true, data: null, sha: null };
        const sha = j.sha || null;
        if (!j.content) return { ok: true, data: null, sha };
        const raw = j.content.replace(/\n/g, '');
        try { const data = JSON.parse(atob(raw)); return { ok: true, data, sha }; }
        catch (e) { return { ok: false, reason: 'parse error' }; }
      })
      .catch(e => ({ ok: false, reason: e.message }));
  };

  // 推送本地数据到云端
  SYNC.push = function (data, sha) {
    const cfg = SYNC.getConfig(); if (!SYNC.enabled()) return Promise.resolve({ ok: false, reason: 'no-config' });
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const body = { message: 'sync ' + new Date().toISOString(), content };
    if (sha) body.sha = sha;
    return fetch(apiBase(cfg), { method: 'PUT', headers: headers(cfg), body: JSON.stringify(body) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(j => ({ ok: true, sha: j.content ? j.content.sha : sha }))
      .catch(e => ({ ok: false, reason: e.message }));
  };

  // 合并云端数据到本地
  SYNC.mergeTo = function (cloud) {
    if (!cloud || typeof cloud !== 'object') return false;
    const local = App.store.exportAll();
    const localT = (local._meta && local._meta.syncedAt) || 0;
    const cloudT = (cloud._meta && cloud._meta.syncedAt) || 0;
    if (cloudT > localT) {
      const savedCfg = SYNC.getConfig();
      localStorage.setItem(LKEY, JSON.stringify(cloud));
      SYNC.setConfig(savedCfg);
      return true;
    }
    return false;
  };

  // 完整同步
  let lastSha = null;
  SYNC.sync = function () {
    if (!SYNC.enabled()) return Promise.resolve({ ok: false, reason: 'no-config' });
    return SYNC.pull().then(res => {
      if (res.ok && res.data) { const changed = SYNC.mergeTo(res.data); if (changed) App.store.load(true); }
      if (res.sha) lastSha = res.sha;
      const data = App.store.exportAll();
      data._meta = data._meta || {};
      data._meta.syncedAt = Date.now();
      localStorage.setItem(LKEY, JSON.stringify(data));
      return SYNC.push(data, lastSha);
    }).then(r => { if (r.ok && r.sha) lastSha = r.sha; return r; });
  };

  // 自动同步（节流 3 秒）
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
