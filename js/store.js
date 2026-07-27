/* ===== 国民工作台 · 数据层 ===== */
window.App = window.App || {};
(function (App) {
  const KEY = 'guomin_workbench_v1';
  const COLLECTIONS = [
    'settings', 'cases', 'events', 'comms', 'knowledge',
    'live', 'liveQA', 'videos', 'competitors', 'topics', 'dms',
    'health', 'memos', 'reminderLog'
  ];

  let db = null;

  function blank() {
    const o = { _meta: { createdAt: Date.now() } };
    COLLECTIONS.forEach(c => o[c] = []);
    o.settings = [{
      account: '王国民律师', lawyer: '王国民律师',
      liveStart: '05:50', liveEnd: '08:30', morningBrief: '05:40',
      douyin: '@王国民律师', city: '同城'
    }];
    return o;
  }

  function load(force) {
    if (db && !force) return db;
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : blank();
    } catch (e) { db = blank(); }
    COLLECTIONS.forEach(c => { if (!db[c]) db[c] = []; });
    if (!db.settings || !db.settings.length) db.settings = blank().settings;
    seedIfEmpty();
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); if (window.App && App.sync) App.sync.notifyWrite(); } catch (e) { console.error(e); } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function get(col) { load(); return db[col] || []; }
  function settings() { return get('settings')[0]; }
  function add(col, obj) {
    load();
    obj.id = obj.id || uid();
    obj.createdAt = obj.createdAt || Date.now();
    db[col].push(obj);
    save(); return obj;
  }
  function update(col, id, patch) {
    load();
    const i = db[col].findIndex(x => x.id === id);
    if (i >= 0) { db[col][i] = Object.assign({}, db[col][i], patch); save(); return db[col][i]; }
    return null;
  }
  function remove(col, id) {
    load();
    db[col] = db[col].filter(x => x.id !== id);
    save();
  }
  function find(col, id) { return get(col).find(x => x.id === id); }

  function exportAll() { load(); return JSON.parse(JSON.stringify(db)); }
  function importAll(obj) {
    load();
    if (!obj || typeof obj !== 'object') throw new Error('文件格式不正确');
    COLLECTIONS.forEach(c => { if (obj[c]) db[c] = obj[c]; });
    if (obj.settings) db.settings = obj.settings;
    save();
  }

  /* 种子：法务知识库（民法典常用法条 + 文书模板） */
  function seedIfEmpty() {
    if (db.knowledge && db.knowledge.length) return;
    const seed = [
      { kind: '法条', title: '民法典·诉讼时效（第188条）', tags: '诉讼时效', body: '向人民法院请求保护民事权利的诉讼时效期间为三年。法律另有规定的，依照其规定。诉讼时效期间自权利人知道或者应当知道权利受到损害以及义务人之日起计算。' },
      { kind: '法条', title: '民法典·违约责任（第577条）', tags: '合同', body: '当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。' },
      { kind: '法条', title: '民法典·离婚冷静期（第1077条）', tags: '婚姻', body: '自婚姻登记机关收到离婚登记申请之日起三十日内，任何一方不愿意离婚的，可以向婚姻登记机关撤回离婚登记申请。' },
      { kind: '法条', title: '民法典·侵权责任（第1165条）', tags: '侵权', body: '行为人因过错侵害他人民事权益造成损害的，应当承担侵权责任。依照法律规定推定行为人有过错，其不能证明自己没有过错的，应当承担侵权责任。' },
      { kind: '法条', title: '民法典·继承（第1127条）', tags: '继承', body: '遗产按照下列顺序继承：第一顺序：配偶、子女、父母。第二顺序：兄弟姐妹、祖父母、外祖父母。' },
      { kind: '法条', title: '民法典·赠与撤销（第663条）', tags: '赠与', body: '受赠人有下列情形之一的，赠与人可以撤销赠与：（一）严重侵害赠与人或者赠与人近亲属的合法权益；（二）对赠与人有扶养义务而不履行；（三）不履行赠与合同约定的义务。' },
      { kind: '模板', title: '民事起诉状（框架）', tags: '起诉状', body: '原告：姓名、性别、出生、民族、住址、联系方式。\n被告：……\n诉讼请求：\n1. ……；2. ……；3. 本案诉讼费由被告承担。\n事实与理由：\n……（写明法律关系、争议焦点、依据）。\n此致\n××人民法院\n具状人：\n年 月 日' },
      { kind: '模板', title: '代理词（框架）', tags: '代理词', body: '尊敬的审判长、审判员：\n受××委托，本人发表如下代理意见：\n一、关于事实认定：……\n二、关于法律适用：……\n三、关于责任承担：……\n综上，请支持原告（被告）诉讼请求。\n代理人：\n年 月 日' },
      { kind: '模板', title: '证据清单（框架）', tags: '证据', body: '编号｜证据名称｜来源｜证明目的\n1 ｜……｜……｜证明……\n2 ｜……｜……｜证明……' },
      { kind: '模板', title: '法律咨询记录（话术）', tags: '咨询', body: '1. 您好，我是王国民律师，请先简要说明您遇到的情况。\n2. 关键事实确认：时间、地点、人物、金额、书面凭证。\n3. 初步法律分析 + 证据建议 + 下一步行动。\n4. 收费方式与代理方案说明。' }
    ];
    seed.forEach(s => { s.id = uid(); s.createdAt = Date.now(); db.knowledge.push(s); });
    save();
  }

  App.store = { load, save, get, settings, add, update, remove, find, uid, exportAll, importAll, COLLECTIONS };
})(window.App);
