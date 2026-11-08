'use strict';
/* =========================================================
   Ritmik Sayma Macerası — yardımcılar, Türkçe dil, kayıt
   ========================================================= */

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* Küçük DOM üretici: h('div', {class:'a'}, 'metin', başkaEleman) */
function h(tag, attrs) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style') {
        for (const sk in v) {
          if (sk.startsWith('--')) e.style.setProperty(sk, v[sk]);
          else e.style[sk] = v[sk];
        }
      } else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  for (let i = 2; i < arguments.length; i++) hAdd(e, arguments[i]);
  return e;
}
function hAdd(e, c) {
  if (c == null || c === false) return;
  if (Array.isArray(c)) { c.forEach(x => hAdd(e, x)); return; }
  e.append(c.nodeType ? c : document.createTextNode(String(c)));
}

/* Dokunma: parmak değdiği anda tepki (tablette gecikmesiz) */
function onTap(el, fn) {
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    fn(e);
  });
}

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const restartAnim = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

/* ---------------- Türkçe yardımcılar ---------------- */
const TR = {
  ones: ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'],
  tens: ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'],
  ablMap: {
    'sıfır': 'dan', 'bir': 'den', 'iki': 'den', 'üç': 'ten', 'dört': 'ten', 'beş': 'ten',
    'altı': 'dan', 'yedi': 'den', 'sekiz': 'den', 'dokuz': 'dan', 'on': 'dan', 'yirmi': 'den',
    'otuz': 'dan', 'kırk': 'tan', 'elli': 'den', 'altmış': 'tan', 'yetmiş': 'ten',
    'seksen': 'den', 'doksan': 'dan', 'yüz': 'den'
  },
  dist: { 2: 'ikişer', 3: 'üçer', 4: 'dörder', 5: 'beşer', 6: 'altışar', 7: 'yedişer', 8: 'sekizer', 9: 'dokuzar' },
  distSuf: { 2: 'şer', 3: 'er', 4: 'er', 5: 'er', 6: 'şar', 7: 'şer', 8: 'er', 9: 'ar' },

  words(n) {
    if (n === 0) return 'sıfır';
    if (n === 100) return 'yüz';
    const t = Math.floor(n / 10), o = n % 10;
    return [this.tens[t], this.ones[o]].filter(Boolean).join(' ');
  },
  abl(n) { const w = this.words(n).split(' '); return this.ablMap[w[w.length - 1]] || 'den'; },
  ablText(n) { return n + "'" + this.abl(n); },               // 9'dan
  ablSpeak(n) { return this.words(n) + this.abl(n); },         // dokuzdan
  datMap: {
    'sıfır': 'a', 'bir': 'e', 'iki': 'ye', 'üç': 'e', 'dört': 'e', 'beş': 'e', 'altı': 'ya',
    'yedi': 'ye', 'sekiz': 'e', 'dokuz': 'a', 'on': 'a', 'yirmi': 'ye', 'otuz': 'a', 'kırk': 'a',
    'elli': 'ye', 'altmış': 'a', 'yetmiş': 'e', 'seksen': 'e', 'doksan': 'a', 'yüz': 'e'
  },
  dat(n) { const w = this.words(n).split(' '); return this.datMap[w[w.length - 1]] || 'e'; },
  datText(n) { return n + "'" + this.dat(n); },                // 3'e, 6'ya
  datSpeak(n) { return this.words(n).replace(/dört$/, 'dörd') + this.dat(n); }, // dörde
  short(n) { return n + "'" + this.distSuf[n]; },              // 3'er
  label(n) { return this.short(n) + ' ' + this.short(n); },    // 3'er 3'er
  speakLabel(n) { return this.dist[n] + ' ' + this.dist[n]; }  // üçer üçer
};

const PRAISE = ['Aferin', 'Harika', 'Süper', 'Bravo', 'Çok güzel', 'Muhteşem', 'Tebrikler', 'Mükemmel'];
const TRY_AGAIN = ['Tekrar dene!', 'Az kaldı!', 'Bir daha bak!', 'Hadi bir daha!', 'Olmadı, tekrar dene!'];
function praise() {
  const p = pick(PRAISE), nm = Store.data && Store.data.name;
  return nm ? p + ' ' + nm + '!' : p + '!';
}
function starsFrom(mistakes, a, b) { return mistakes <= a ? 3 : mistakes <= b ? 2 : 1; }
/* Yanlış sayısını soru sayısına göre değerlendir (uzun oyunlarda biraz daha hoşgörülü) */
function starsBy(wrong, total) {
  return wrong <= Math.max(1, Math.round(total * 0.1)) ? 3 : wrong <= Math.max(4, Math.round(total * 0.3)) ? 2 : 1;
}
/* 100'e kadar kaç adım: 2 → 50 (100), 3 → 33 (99), 6 → 16 (96) ... */
const LIMIT = 100;
const kmax = n => Math.floor(LIMIT / n);

/* Doğru cevap + şaşırtıcı seçenekler (yakın sayılar, bir önceki/sonraki ritmik sayı) */
function numChoices(ans, n, count, easy) {
  const set = new Set([ans]);
  const near = easy
    ? [ans + n, ans - n, ans + 5, ans - 5, ans + 10, ans + 3, ans - 3]
    : [ans + 1, ans - 1, ans + 2, ans - 2, ans + n, ans - n, ans + 10, ans - 10, ans + n + 1, ans + n - 1];
  shuffle(near).filter(x => x >= 0 && x <= 100 && x !== ans).forEach(c => { if (set.size < count) set.add(c); });
  let guard = 0;
  while (set.size < count && guard++ < 60) set.add(rand(1, Math.min(100, Math.max(20, ans + 12))));
  return shuffle(Array.from(set));
}

/* Zorluk seviyeleri */
const LEVELS = {
  kolay: {
    name: 'Kolay', balloonMax: 4, balloonRise: 10, spawn: 1.35, near: 0.25, balloonBack: false,
    rhythmBpm: 68, rhythmStep: 5, rhythmWin: 0.46, dots: true, cue: true,
    trainChoices: 3, backward: false, hintAfter: 1,
    rocketTypes: ['next', 'groups', 'missing', 'next', 'groups']
  },
  normal: {
    name: 'Normal', balloonMax: 5, balloonRise: 8, spawn: 1.1, near: 0.55, balloonBack: false,
    rhythmBpm: 78, rhythmStep: 6, rhythmWin: 0.4, dots: true, cue: false,
    trainChoices: 4, backward: true, hintAfter: 2,
    rocketTypes: ['next', 'missing', 'groups', 'after', 'which', 'back']
  },
  zor: {
    name: 'Zor', balloonMax: 6, balloonRise: 6.2, spawn: 0.9, near: 0.85, balloonBack: true,
    rhythmBpm: 90, rhythmStep: 7, rhythmWin: 0.32, dots: false, cue: false,
    trainChoices: 4, backward: true, hintAfter: 3,
    rocketTypes: ['next', 'missing', 'after', 'which', 'back', 'before', 'groups']
  }
};
const lv = () => LEVELS[Store.s.level] || LEVELS.normal;

/* ---------------- Kayıt (tablette yerel olarak saklanır) ---------------- */
const Store = {
  key: 'ritmik-sayma-v1',
  data: null,
  defaults() {
    return {
      name: '',
      settings: { music: true, sfx: true, voice: true, level: 'normal', autoFs: true },
      stars: {},
      mixSel: [2, 3, 4, 5]
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { d = null; }
    const def = this.defaults();
    this.data = Object.assign(def, d || {});
    this.data.settings = Object.assign(this.defaults().settings, (d && d.settings) || {});
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* gizli mod */ } },
  get s() { return this.data.settings; },
  stars(key, g) { return (this.data.stars[key] || {})[g] || 0; },
  setStars(key, g, s) {
    const m = this.data.stars[key] || (this.data.stars[key] = {});
    if (s > (m[g] || 0)) m[g] = s;
    this.save();
  },
  numStars(key) { const m = this.data.stars[key] || {}; return Object.keys(m).reduce((a, k) => a + m[k], 0); },
  total() { return Object.keys(this.data.stars).reduce((a, k) => a + this.numStars(k), 0); },
  reset() { const nm = this.data.name, st = this.data.settings; this.data = this.defaults(); this.data.name = nm; this.data.settings = st; this.save(); }
};
