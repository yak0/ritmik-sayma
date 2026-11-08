'use strict';
/* =========================================================
   Uygulama: ekranlar, menüler, ayarlar ve oyun yönetimi
   ========================================================= */

const Games = {}; // oyun dosyaları kendilerini buraya kaydeder

const GAME_LIST = [
  { id: 'learn',   icon: '🐸', name: 'Kurbağa Zıplıyor', desc: 'İzle, dinle, öğren', color: '#2fbf71' },
  { id: 'balloon', icon: '🎈', name: 'Balon Patlat',     desc: 'Sıradaki sayının balonunu patlat', color: '#ff5d8f' },
  { id: 'rhythm',  icon: '🥁', name: 'Davul Ritmi',      desc: 'Ritme uy, doğru sayıda davula vur', color: '#8a5cf6' },
  { id: 'train',   icon: '🚂', name: 'Sayı Treni',       desc: 'Eksik vagonları tamamla', color: '#ff9f1c' },
  { id: 'rocket',  icon: '🚀', name: 'Aya Yolculuk',     desc: 'Soruları bil, roketi aya ulaştır', color: '#3a8dff' }
];
const GAME_BY_ID = {};
GAME_LIST.forEach(g => { GAME_BY_ID[g.id] = g; });
const MIX_GAMES = ['balloon', 'train', 'rocket'];
const NUM_COLORS = { 2: '#ff4d6d', 3: '#ff8c1a', 4: '#e8b100', 5: '#2fbf71', 6: '#14b8a6', 7: '#3a8dff', 8: '#8a5cf6', 9: '#e04fb3' };
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const BAL_COLORS = [
  ['#ff4d6d', '#b5123f'], ['#ff9f1c', '#c96500'], ['#ffd23f', '#c79500'], ['#3ecf6e', '#178a3f'],
  ['#3fa7ff', '#1560bd'], ['#a66cff', '#6327c7'], ['#ff70cf', '#c01d93'], ['#26c6da', '#0e8796']
];

function buildSvgDefs() {
  let g = '';
  BAL_COLORS.forEach((c, i) => {
    g += `<radialGradient id="bal${i}" cx="36%" cy="28%" r="78%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".17" stop-color="${c[0]}"/><stop offset=".72" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient>`;
  });
  g += '<radialGradient id="balgold" cx="36%" cy="28%" r="78%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".2" stop-color="#ffd84d"/><stop offset=".8" stop-color="#f5b400"/><stop offset="1" stop-color="#c98a00"/></radialGradient>';
  g += '<linearGradient id="drumBody" x1="0" x2="1"><stop offset="0" stop-color="#a8102b"/><stop offset=".35" stop-color="#ff4d6d"/><stop offset="1" stop-color="#930d25"/></linearGradient>';
  const d = document.createElement('div');
  d.innerHTML = `<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>${g}</defs></svg>`;
  document.body.prepend(d.firstChild);
}

/* ---------------- Tam ekran ---------------- */
const FS = {
  el() { return document.documentElement; },
  supported() { const e = this.el(); return !!(e.requestFullscreen || e.webkitRequestFullscreen); },
  active() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  standalone() {
    const mm = q => window.matchMedia && window.matchMedia(q).matches;
    return mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || window.navigator.standalone === true;
  },
  enter() {
    const e = this.el();
    try {
      if (e.requestFullscreen) { const p = e.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); }
      else if (e.webkitRequestFullscreen) e.webkitRequestFullscreen();
    } catch (err) { /* desteklenmiyor */ }
  },
  exit() {
    try {
      if (document.exitFullscreen) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) { /* */ }
  },
  toggle() { if (this.active()) this.exit(); else this.enter(); }
};

/* ---------------- Açılır pencere ---------------- */
const Modal = {
  cur: null,
  open(content, o) {
    o = o || {};
    this.close(true);
    const ov = h('div', { class: 'modal-ov' });
    const card = h('div', { class: 'modal-card ' + (o.cls || '') }, content);
    ov.append(card);
    $('#modal-root').append(ov);
    if (o.dismiss !== false) ov.addEventListener('click', e => { if (e.target === ov) this.close(); });
    requestAnimationFrame(() => ov.classList.add('show'));
    this.cur = { ov, onClose: o.onClose };
    return card;
  },
  close(silent) {
    const c = this.cur; if (!c) return;
    this.cur = null;
    c.ov.classList.remove('show');
    setTimeout(() => c.ov.remove(), 260);
    if (!silent && c.onClose) c.onClose();
  }
};

/* ---------------- Oyun bağlamı: zamanlayıcılar ve temizlik ---------------- */
class GameCtx {
  constructor(o) {
    Object.assign(this, o);
    this.alive = true; this.paused = false;
    this.stage = $('#stage'); this.lv = lv();
    this.correct = 0; this.wrong = 0;
    this._t = new Set(); this._i = new Set(); this._loops = []; this._clean = [];
  }
  wait(ms) {
    return new Promise(res => {
      const arm = d => {
        const id = setTimeout(() => {
          this._t.delete(id);
          if (!this.alive) return;
          if (this.paused) { arm(150); return; }
          res();
        }, d);
        this._t.add(id);
      };
      arm(ms);
    });
  }
  later(fn, ms) { this.wait(ms).then(fn); }
  every(fn, ms) {
    const id = setInterval(() => { if (this.alive && !this.paused) fn(); }, ms);
    this._i.add(id); return id;
  }
  clearEvery(id) { clearInterval(id); this._i.delete(id); }
  loop(fn) {
    const L = { id: 0, last: performance.now() };
    const step = now => {
      if (!this.alive) return;
      const dt = Math.min(0.05, (now - L.last) / 1000); L.last = now;
      if (!this.paused) fn(dt, now);
      L.id = requestAnimationFrame(step);
    };
    L.id = requestAnimationFrame(step);
    this._loops.push(L);
  }
  on(t, ev, fn, opt) { t.addEventListener(ev, fn, opt); this._clean.push(() => t.removeEventListener(ev, fn, opt)); }
  onClean(fn) { this._clean.push(fn); }
  say(text, o) {
    return new Promise(res => {
      const go = () => {
        if (!this.alive) return;
        if (this.paused) { setTimeout(go, 150); return; }
        Voice.say(text, o).then(() => { if (this.alive) res(); });
      };
      go();
    });
  }
  /* Ekrana yaz + sesli oku; ses kapalıysa okumaya zaman tanı */
  talk(el, text, speak) {
    if (el) { el.innerHTML = text; restartAnim(el, 'msg-in'); }
    return Promise.all([this.say(speak || text), this.wait(Store.s.voice ? 250 : 1500)]);
  }
  progress(d, t) { App.setProgress(d, t); }
  finish(res) {
    if (!this.alive) return;
    if (res.correct == null) res.correct = this.correct;
    if (res.wrong == null) res.wrong = this.wrong;
    this.stop();
    App.onGameFinish(this, res);
  }
  stop() {
    if (!this.alive) return;
    this.alive = false;
    this._t.forEach(clearTimeout); this._i.forEach(clearInterval);
    this._loops.forEach(l => cancelAnimationFrame(l.id));
    this._clean.forEach(f => { try { f(); } catch (e) { /* */ } });
    this._clean = [];
    Voice.cancel();
  }
}

/* ---------------- Ortak arayüz parçaları ---------------- */
function seqChips(bar, count, color) {
  bar.innerHTML = '';
  if (color) bar.style.setProperty('--c', color);
  const chips = [];
  for (let i = 0; i < count; i++) { const c = h('span', { class: 'chip empty' }); bar.append(c); chips.push(c); }
  const fit = () => {
    const w = bar.clientWidth || window.innerWidth * 0.9;
    bar.style.setProperty('--chip', clamp((w - (count - 1) * 6) / count, 30, 66) + 'px');
  };
  fit(); requestAnimationFrame(fit);
  return chips;
}
function chipSet(c, text, cls) { c.className = 'chip ' + (cls || 'filled'); c.textContent = text; }

/* Sayıları sırayla parlatıp sesli okur */
async function recite(r, chips, nums) {
  const say = t => (r.say ? r.say(t, { rate: 1.05 }) : Voice.say(t, { rate: 1.05 }));
  const wait = ms => (r.wait ? r.wait(ms) : sleep(ms));
  for (let i = 0; i < nums.length; i++) {
    if (!r.alive) return;
    const c = chips[i];
    if (c) c.classList.add('lit');
    Sound.bell(72 + PENTA[i % PENTA.length], undefined, 0.06);
    await Promise.all([say(String(nums[i])), wait(430)]);
    if (c) c.classList.remove('lit');
  }
}

function buildHundred() {
  const g = h('div', { class: 'hundred' }), cells = [];
  for (let i = 1; i <= 100; i++) { const c = h('div', { class: 'hc' }, String(i)); g.append(c); cells.push(c); }
  return { grid: g, cells };
}

/* =========================================================
   Uygulama
   ========================================================= */
const App = {
  screen: 'splash', n: 2, ctx: null, launch: null, run: null,

  init() {
    Store.load();
    FX.init();
    buildSvgDefs();
    this.bind();
    this.renderHome();
    document.body.classList.toggle('standalone', FS.standalone());
    if (!FS.supported()) document.body.classList.add('no-fs');
  },

  bind() {
    $('#screen-splash').addEventListener('click', () => this.begin());
    document.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b && !b.closest('#stage')) { Sound.init(); Sound.sfx.click(); }
      const a = e.target.closest('[data-act]');
      if (a) this.action(a.dataset.act, a);
    });
    const unlock = () => { if (Sound.ctx() && !(this.ctx && this.ctx.paused)) Sound.resume(); };
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('pointerdown', unlock, { passive: true });

    // tarayıcının yakınlaştırma / kaydırma hareketlerini engelle
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Voice.cancel();
        if (this.ctx && this.ctx.alive && !this.ctx.paused) this.pauseGame(true);
        else Sound.suspend();
      } else if (!(this.ctx && this.ctx.paused)) Sound.resume();
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev =>
      document.addEventListener(ev, () => document.body.classList.toggle('is-fs', FS.active())));
  },

  begin() {
    if (this.screen !== 'splash') return;
    Sound.init(); Voice.warm();
    if (Store.s.autoFs && !FS.standalone()) FS.enter();
    this.goHome(true);
  },

  show(id) {
    this.screen = id;
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + id));
  },

  action(act, el) {
    switch (act) {
      case 'home': this.goHome(); break;
      case 'settings': this.openSettings(); break;
      case 'fullscreen': FS.toggle(); break;
      case 'mixed': this.openMixed(); break;
      case 'table': this.openTable(); break;
      case 'quit': this.pauseGame(false); break;
      case 'listen': this.listenSeq(); break;
      case 'number': this.openNumber(+el.dataset.n); break;
      case 'game': this.startGame(el.dataset.g); break;
    }
  },

  /* ---------- Ana menü ---------- */
  goHome(greet) {
    this.stopGame(); this.stopRun();
    this.renderHome(); this.show('home'); Music.play('menu');
    if (greet) {
      const nm = Store.data.name;
      setTimeout(() => Voice.say((nm ? 'Merhaba ' + nm + '!' : 'Merhaba!') + ' Hangi sayıyla saymak istersin?'), 450);
    }
  },
  renderHome() {
    const nm = Store.data.name;
    $('#home-hello').textContent = nm ? 'Merhaba ' + nm + '! Hangi sayıyla sayalım?' : 'Hangi sayıyla sayalım?';
    $('#total-stars').textContent = Store.total();
    const grid = $('#num-grid'); grid.innerHTML = '';
    const max = GAME_LIST.length * 3;
    for (let n = 2; n <= 9; n++) {
      const st = Store.numStars(n);
      const done = GAME_LIST.every(g => Store.stars(n, g.id) > 0);
      grid.append(h('button', { class: 'num-card', 'data-act': 'number', 'data-n': n, style: { '--c': NUM_COLORS[n] } },
        h('div', { class: 'num-big' }, String(n)),
        h('div', { class: 'num-label' }, TR.label(n)),
        h('div', { class: 'num-seq' }, n + ', ' + 2 * n + ', ' + 3 * n + '…'),
        h('div', { class: 'num-stars' }, '⭐ ' + st + ' / ' + max),
        done ? h('div', { class: 'num-medal' }, st === max ? '🏆' : '🏅') : null));
    }
  },

  /* ---------- Sayı ekranı (oyun yolu) ---------- */
  openNumber(n) {
    this.stopGame(); this.stopRun();
    this.n = n;
    const scr = $('#screen-number');
    scr.style.setProperty('--c', NUM_COLORS[n]);
    $('#nb-title').textContent = TR.label(n) + ' Sayalım';
    const seq = $('#nb-seq'); seq.innerHTML = '';
    for (let i = 0; i <= 10; i++) seq.append(h('span', { class: 'chip filled' }, String(i * n)));
    const path = $('#nb-path'); path.innerHTML = '';
    GAME_LIST.forEach((g, i) => {
      const s = Store.stars(n, g.id);
      path.append(h('button', { class: 'game-card' + (s ? ' done' : ''), 'data-act': 'game', 'data-g': g.id, style: { '--gc': g.color } },
        h('div', { class: 'gc-step' }, String(i + 1)),
        h('div', { class: 'gc-ico' }, g.icon),
        h('div', { class: 'gc-name' }, g.name),
        h('div', { class: 'gc-desc' }, g.desc),
        h('div', { class: 'gc-stars' }, [0, 1, 2].map(k => h('span', { class: k < s ? 'on' : '' }, '★')))));
    });
    this.show('number'); Music.play('menu');
    Voice.say(TR.speakLabel(n) + ' sayalım! Bir oyun seç.');
  },
  listenSeq() {
    this.stopRun();
    const run = this.run = { alive: true };
    const chips = $$('#nb-seq .chip');
    recite(run, chips, chips.map(c => +c.textContent));
  },
  stopRun() { if (this.run) { this.run.alive = false; this.run = null; Voice.cancel(); } },

  /* ---------- Sayı tablosu ---------- */
  openTable() {
    this.stopRun();
    const chipsEl = $('#tb-chips'); chipsEl.innerHTML = '';
    const wrap = $('#tb-grid'); wrap.innerHTML = '';
    const { grid, cells } = buildHundred();
    wrap.append(grid);
    cells.forEach((c, i) => onTap(c, () => { Sound.init(); Sound.sfx.click(); Voice.say(String(i + 1)); restartAnim(c, 'tap'); }));
    for (let n = 2; n <= 9; n++) {
      const b = h('button', { class: 'tb-chip', style: { '--c': NUM_COLORS[n] } }, TR.short(n));
      b.addEventListener('click', () => { $$('.tb-chip').forEach(x => x.classList.toggle('on', x === b)); this.tableShow(n, grid, cells); });
      chipsEl.append(b);
    }
    $('#tb-msg').textContent = 'Bir sayı seç, tablodaki desenini gör! Sayılara dokunursan okunur.';
    this.show('table'); Music.play('menu');
    Voice.say('Bir sayı seç, tablodaki desenini gör!');
  },
  async tableShow(n, grid, cells) {
    this.stopRun();
    const run = this.run = { alive: true };
    grid.style.setProperty('--c', NUM_COLORS[n]);
    cells.forEach(c => c.classList.remove('hl', 'hl2'));
    $('#tb-msg').textContent = TR.label(n) + ' sayınca tabloda nasıl bir desen oluşuyor?';
    await Voice.say(TR.speakLabel(n) + ' sayalım!');
    let i = 0;
    for (let m = n; m <= 100; m += n, i++) {
      if (!run.alive) return;
      cells[m - 1].classList.add(m <= 10 * n ? 'hl' : 'hl2');
      Sound.bell(72 + PENTA[i % PENTA.length], undefined, 0.05);
      if (m <= 10 * n) await Promise.all([Voice.say(String(m), { rate: 1.1 }), sleep(380)]);
      else await sleep(110);
    }
  },

  /* ---------- Karışık tekrar ---------- */
  openMixed() {
    const sel = new Set(Store.data.mixSel || [2, 3, 4, 5]);
    const chips = h('div', { class: 'mx-chips' });
    for (let n = 2; n <= 9; n++) {
      const b = h('button', { class: 'mx-chip' + (sel.has(n) ? ' on' : ''), style: { '--c': NUM_COLORS[n] } }, String(n));
      b.addEventListener('click', () => { if (sel.has(n)) sel.delete(n); else sel.add(n); b.classList.toggle('on', sel.has(n)); });
      chips.append(b);
    }
    const games = h('div', { class: 'mx-games' }, MIX_GAMES.map(id => {
      const g = GAME_BY_ID[id], s = Store.stars('mix', id);
      const b = h('button', { class: 'mx-game', style: { '--gc': g.color } },
        h('span', { class: 'mx-ico' }, g.icon), h('b', null, g.name),
        h('span', { class: 'gc-stars' }, [0, 1, 2].map(k => h('span', { class: k < s ? 'on' : '' }, '★'))));
      b.addEventListener('click', () => {
        if (!sel.size) { restartAnim(chips, 'shake'); return; }
        Store.data.mixSel = Array.from(sel).sort((a, c) => a - c); Store.save();
        Modal.close(true);
        this.startGame(id, { mixed: true, ns: Store.data.mixSel });
      });
      return b;
    }));
    Modal.open(h('div', { class: 'mixed' },
      h('h2', null, '🔀 Karışık Tekrar'),
      h('p', null, 'Hangi sayıları karıştıralım?'), chips,
      h('p', null, 'Bir oyun seç:'), games,
      h('button', { class: 'btn btn-soft btn-sm', onclick: () => Modal.close() }, 'Kapat')));
    Voice.say('Hangi sayıları karıştıralım? Sonra bir oyun seç.');
  },

  /* ---------- Oyun başlat / bitir ---------- */
  startGame(id, opts) {
    opts = opts || {};
    const g = Games[id], meta = GAME_BY_ID[id];
    if (!g) return;
    this.stopGame(); this.stopRun(); Modal.close(true); FX.clear();
    const ns = opts.ns || [this.n];
    this.launch = { id, opts };
    const ctx = this.ctx = new GameCtx({ gameId: id, n: opts.mixed ? ns[0] : this.n, ns, mixed: !!opts.mixed });
    $('#hud-ico').textContent = meta.icon;
    $('#hud-name').textContent = meta.name;
    const hn = $('#hud-n');
    hn.textContent = opts.mixed ? 'Karışık: ' + ns.join(', ') : TR.label(this.n);
    hn.style.background = opts.mixed ? '#ff8a3d' : NUM_COLORS[this.n];
    this.setProgress(0, 1);
    const st = $('#stage'); st.innerHTML = ''; st.className = 'stage'; st.removeAttribute('style');
    this.show('game');
    Sound.init();
    requestAnimationFrame(() => {
      if (this.ctx === ctx && ctx.alive) {
        try { g.start(ctx); } catch (e) { console.error(e); }
      }
    });
  },
  stopGame() { if (this.ctx) { this.ctx.stop(); this.ctx = null; } Music.stop(); },
  setProgress(d, t) { $('#hud-bar').style.width = (t ? clamp(d / t, 0, 1) * 100 : 0) + '%'; },
  afterGame() {
    const l = this.launch;
    if (l && l.opts.mixed) this.goHome(); else this.openNumber(this.n);
  },
  onGameFinish(ctx, res) {
    if (this.ctx === ctx) this.ctx = null;
    Store.setStars(ctx.mixed ? 'mix' : ctx.n, ctx.gameId, res.stars);
    Music.stop();
    this.setProgress(1, 1);
    this.showResult(ctx, res);
  },

  showResult(ctx, res) {
    const s = res.stars;
    const title = s >= 3 ? 'Muhteşem!' : s === 2 ? 'Harika!' : 'Aferin!';
    const nm = Store.data.name;
    const msg = s >= 3 ? (ctx.mixed ? 'Karışık sayılarda bile süpersin!' : TR.label(ctx.n) + ' saymada süpersin!')
      : s === 2 ? 'Çok iyi gidiyorsun! Bir daha oynarsan 3 yıldız senin!'
      : 'Güzel başlangıç! Hadi bir daha deneyelim.';
    const starEls = [0, 1, 2].map(() => h('div', { class: 'rs-star' }, '★'));
    const idx = GAME_LIST.findIndex(g => g.id === ctx.gameId);
    const nextG = ctx.mixed ? null : GAME_LIST[idx + 1];

    const btns = h('div', { class: 'rs-btns' });
    btns.append(h('button', { class: 'btn btn-soft', onclick: () => { Modal.close(true); this.startGame(ctx.gameId, this.launch.opts); } }, '🔁 Tekrar'));
    if (nextG) btns.append(h('button', { class: 'btn btn-go btn-lg', onclick: () => { Modal.close(true); this.startGame(nextG.id); } }, nextG.icon + ' Sonraki oyun'));
    else if (!ctx.mixed && ctx.n < 9) btns.append(h('button', { class: 'btn btn-go btn-lg', onclick: () => { Modal.close(true); this.openNumber(ctx.n + 1); } }, 'Sıradaki: ' + TR.label(ctx.n + 1)));
    btns.append(h('button', { class: 'btn btn-soft', onclick: () => { Modal.close(true); this.afterGame(); } }, '🏠 Menü'));

    Modal.open(h('div', { class: 'result' },
      h('div', { class: 'rs-mascot' }, s >= 3 ? '🦉🎉' : '🦉'),
      h('h2', null, title + (nm ? ' ' + nm : '')),
      h('div', { class: 'rs-stars' }, starEls),
      h('p', { class: 'rs-msg' }, msg),
      h('div', { class: 'rs-stats' },
        h('span', null, '✅ ' + (res.correct || 0) + ' doğru'),
        h('span', null, '🔁 ' + (res.wrong || 0) + ' tekrar deneme'),
        res.extra ? h('span', null, res.extra) : null),
      btns), { dismiss: false, cls: 'modal-result' });

    Sound.sfx.fanfare();
    starEls.forEach((el, i) => setTimeout(() => {
      if (i >= s) return;
      el.classList.add('on'); Sound.sfx.star();
      const r = el.getBoundingClientRect(); FX.stars(r.left + r.width / 2, r.top + r.height / 2, 10);
    }, 600 + i * 450));
    if (s >= 2) setTimeout(() => FX.confetti(s === 3 ? 160 : 90), 300);
    setTimeout(() => Voice.say(title + (nm ? ' ' + nm + '.' : '') + ' ' + TR.words(s) + ' yıldız kazandın!'), 500);
  },

  pauseGame(auto) {
    const ctx = this.ctx;
    if (!ctx || !ctx.alive || ctx.paused) return;
    ctx.paused = true; Voice.cancel(); Sound.suspend();
    const resume = () => { Modal.close(true); Sound.init(); Sound.resume(); ctx.paused = false; };
    Modal.open(h('div', { class: 'pause' },
      h('div', { class: 'big-emoji' }, '⏸️'),
      h('h2', null, auto ? 'Oyun durdu' : 'Mola!'),
      h('p', null, 'Devam etmek ister misin?'),
      h('div', { class: 'rs-btns' },
        h('button', { class: 'btn btn-go btn-lg', onclick: resume }, '▶ Devam et'),
        h('button', { class: 'btn btn-soft', onclick: () => { Modal.close(true); this.stopGame(); Sound.resume(); this.afterGame(); } }, '🚪 Oyundan çık'))),
      { dismiss: false });
  },

  /* ---------- Ayarlar ---------- */
  openSettings() {
    const s = Store.s, vi = Voice.info();
    const name = h('input', { class: 'st-input', type: 'text', maxlength: '20', placeholder: 'Örn. Elif', value: Store.data.name || '', autocomplete: 'off', autocapitalize: 'words' });
    name.addEventListener('input', () => { Store.data.name = name.value.trim(); Store.save(); });
    const tog = (key, label) => {
      const b = h('button', { class: 'tog' + (s[key] ? ' on' : '') }, h('span', null, label), h('i'));
      b.addEventListener('click', () => {
        s[key] = !s[key]; b.classList.toggle('on', s[key]); Store.save(); Sound.apply();
        if (key === 'voice' && s.voice) Voice.say('Sesli okuma açık.');
      });
      return b;
    };
    const seg = h('div', { class: 'seg' });
    Object.keys(LEVELS).forEach(k => {
      const b = h('button', { class: s.level === k ? 'on' : '' }, LEVELS[k].name);
      b.addEventListener('click', () => { s.level = k; Store.save(); $$('button', seg).forEach(x => x.classList.toggle('on', x === b)); });
      seg.append(b);
    });
    let armed = false;
    const reset = h('button', { class: 'btn btn-soft btn-sm' }, '🗑️ İlerlemeyi sıfırla');
    reset.addEventListener('click', () => {
      if (!armed) { armed = true; reset.textContent = '⚠️ Emin misin? Tekrar dokun'; reset.classList.add('armed'); return; }
      Store.reset(); reset.textContent = '✅ Sıfırlandı'; reset.classList.remove('armed'); this.renderHome();
    });
    const voiceMsg = vi.turkish ? '✅ Türkçe ses hazır: ' + vi.name
      : vi.supported ? '⚠️ Türkçe ses bulunamadı. Tablet ayarlarından Türkçe "metin okuma / konuşma" sesi indirilebilir.'
      : '⚠️ Bu tarayıcı sesli okumayı desteklemiyor.';
    Modal.open(h('div', { class: 'settings scroll' },
      h('h2', null, '⚙️ Ayarlar'),
      h('label', { class: 'st-row' }, h('span', { class: 'st-lab' }, '👧 Oyuncunun adı'), name),
      h('div', { class: 'st-grid' }, tog('music', '🎵 Müzik'), tog('sfx', '🔔 Ses efektleri'), tog('voice', '🗣️ Sesli okuma'), tog('autoFs', '📺 Açılışta tam ekran')),
      h('div', { class: 'st-row' }, h('span', { class: 'st-lab' }, '🎯 Zorluk'), seg),
      h('p', { class: 'st-note' }, 'Kolay: yavaş balonlar, davulda ipucu sesi, 3 seçenek. Normal: geri sayan tren ve roket soruları. Zor: hızlı tempo, geriye balon turu, ipucu noktaları yok.'),
      h('div', { class: 'st-voice ' + (vi.turkish ? 'ok' : 'warn') }, voiceMsg),
      h('div', { class: 'st-actions' },
        h('button', { class: 'btn btn-sm', onclick: () => Voice.say('Merhaba! Hadi birlikte sayalım. İki, dört, altı, sekiz, on!') }, '🔊 Sesi dene'),
        FS.supported() ? h('button', { class: 'btn btn-sm', onclick: () => FS.toggle() }, '📺 Tam ekran') : null,
        reset),
      h('p', { class: 'st-note' }, 'İpucu: iPad\'de Safari → Paylaş → "Ana Ekrana Ekle" ile oyun uygulama gibi tam ekran açılır. Android\'de Chrome menüsü → "Ana ekrana ekle".'),
      h('button', { class: 'btn btn-go', onclick: () => Modal.close() }, 'Tamam ✓')),
      { onClose: () => this.renderHome(), cls: 'modal-wide' });
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
