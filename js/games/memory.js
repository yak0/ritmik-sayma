'use strict';
/* =========================================================
   Yeni oyun — Hafıza Kartları
   Kartlar kapalı. Bir soru kartını ("24, 27, ?" veya "🐸 4 zıplama")
   cevabıyla ("30" / "12") eşleştir. Başta kartlar birkaç saniye açık
   gösterilir: ezberle, sonra bul!
   Tur 1: Sıradaki sayı  ·  Tur 2: Kurbağa zıplamaları (k × n)
   ========================================================= */
Games.memory = {
  start(ctx) {
    const L = ctx.lv, S = ctx.stage, easy = L === LEVELS.kolay;
    Music.play('learn');
    S.className = 'stage st-memory';
    S.innerHTML =
      '<div class="mm-head"><div class="mm-label"></div></div>' +
      '<div class="mm-grid"></div>' +
      '<div class="msg mm-msg"></div>';
    const grid = $('.mm-grid', S), label = $('.mm-label', S), msg = $('.mm-msg', S);
    const PAIRS = easy ? 4 : 6;
    const peek = easy ? 4000 : L === LEVELS.zor ? 1600 : 2600;
    let cardsAll = [], first = null, lock = true, matched = 0, totalPairs = 0, donePairs = 0, resolveRound = null;

    function layout(count) {
      const portrait = S.clientHeight > S.clientWidth;
      const cols = count === 8 ? (portrait ? 2 : 4) : (portrait ? 3 : 4);
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      grid.style.gridTemplateRows = 'repeat(' + Math.ceil(count / cols) + ', 1fr)';
    }

    function genPairs(type) {
      const used = new Set(), out = [];
      let guard = 0;
      while (out.length < PAIRS && guard++ < 300) {
        const n = ctx.mixed ? pick(ctx.ns) : ctx.n, K = kmax(n);
        const k = type === 'next' ? rand(2, K) : rand(2, Math.min(K, 10));
        const ans = k * n;
        if (used.has(ans)) continue;
        used.add(ans);
        out.push({ id: out.length, n, k, ans, type });
      }
      return out;
    }
    function qHtml(p) {
      const tag = '<div class="mm-tag">' + TR.short(p.n) + '</div>';
      if (p.type === 'next') return '<div class="mm-seq">' + (p.k - 2) * p.n + ', ' + (p.k - 1) * p.n + ', <b>?</b></div>' + tag;
      return '<div class="mm-ico">🐸</div><div class="mm-txt">' + p.k + ' zıplama</div>' + tag;
    }
    function qSpeak(p) {
      return p.type === 'next' ? (p.k - 2) * p.n + ', ' + (p.k - 1) * p.n + ', sıradaki?' : TR.label(p.n) + ' ' + p.k + ' zıplama';
    }
    function pairSpeak(p) {
      return p.type === 'next' ? (p.k - 2) * p.n + ', ' + (p.k - 1) * p.n + ', ' + p.ans + '!' : TR.label(p.n) + ' ' + p.k + ' zıplama: ' + p.ans + '!';
    }

    function deal(pairs) {
      grid.innerHTML = ''; cardsAll = []; first = null; matched = 0;
      const list = [];
      pairs.forEach(p => { list.push({ p, kind: 'q' }); list.push({ p, kind: 'a' }); });
      shuffle(list).forEach(o => {
        const front = o.kind === 'q' ? qHtml(o.p) : '<div class="mm-num">' + o.p.ans + '</div>';
        const el = h('div', { class: 'mm-card', style: { '--c': NUM_COLORS[o.p.n] } },
          h('div', { class: 'mm-inner' },
            h('div', { class: 'mm-face mm-back' }, '?'),
            h('div', { class: 'mm-face mm-front ' + (o.kind === 'q' ? 'q' : 'a'), html: front })));
        const card = { el, p: o.p, kind: o.kind, open: false, done: false };
        onTap(el, () => flip(card));
        grid.append(el); cardsAll.push(card);
      });
      layout(list.length);
    }

    function flip(card) {
      if (lock || card.open || card.done || ctx.paused) return;
      card.open = true; card.el.classList.add('flipped');
      Sound.tone({ f: 660, to: 990, type: 'sine', dur: 0.12, vol: 0.1 });
      ctx.say(card.kind === 'q' ? qSpeak(card.p) : String(card.p.ans));
      if (!first) { first = card; return; }
      const a = first, b = card;
      first = null; lock = true;
      if (a.p === b.p) {
        ctx.later(() => {
          a.done = b.done = true;
          a.el.classList.add('matched'); b.el.classList.add('matched');
          Sound.sfx.correct(); ctx.correct++; matched++; donePairs++;
          ctx.progress(donePairs, totalPairs);
          [a, b].forEach(x => { const r = x.el.getBoundingClientRect(); FX.stars(r.left + r.width / 2, r.top + r.height / 2, 8); });
          msg.innerHTML = praise() + ' ✨';
          ctx.say(pairSpeak(a.p));
          lock = false;
          if (matched === cardsAll.length / 2 && resolveRound) resolveRound();
        }, 500);
      } else {
        ctx.wrong++;
        ctx.later(() => {
          Sound.sfx.wrong(); restartAnim(a.el, 'shake'); restartAnim(b.el, 'shake');
          msg.innerHTML = 'Eşleşmedi, yerlerini aklında tut! 🧠'; restartAnim(msg, 'msg-in');
        }, 650);
        ctx.later(() => {
          a.open = b.open = false;
          a.el.classList.remove('flipped'); b.el.classList.remove('flipped');
          lock = false;
        }, 1500);
      }
    }

    async function playRound(type, idx, count) {
      label.textContent = '🃏 ' + (type === 'next' ? 'Sıradaki sayı' : 'Kurbağa zıplamaları') + ' · Tur ' + idx + '/' + count;
      label.style.background = ctx.mixed ? '#ff8a3d' : NUM_COLORS[ctx.n];
      lock = true;
      deal(genPairs(type));
      const ex = ctx.mixed ? 3 : ctx.n;
      await ctx.talk(msg, type === 'next'
        ? 'Her soru kartının cevabını bul! Örneğin <b>' + 2 * ex + ', ' + 3 * ex + ', ?</b> → <b>' + 4 * ex + '</b>. Önce kartları ezberle 👀'
        : 'Kurbağa ' + (ctx.mixed ? 'her kartta yazan sayı kadar' : '<b>' + TR.label(ctx.n) + '</b>') + ' zıplıyor. <b>4 zıplama</b> kaça varır? Kartları ezberle 👀',
        type === 'next'
          ? 'Her soru kartının cevabını bul! Önce kartları ezberle.'
          : 'Kurbağa kaç kez zıplarsa nereye varır? Önce kartları ezberle.');
      cardsAll.forEach((c, i) => setTimeout(() => c.el.classList.add('flipped'), i * 60));
      await ctx.wait(peek + cardsAll.length * 60);
      cardsAll.forEach(c => c.el.classList.remove('flipped'));
      await ctx.wait(500);
      msg.innerHTML = 'Şimdi eşleştir! 👆 Önce bir kart, sonra eşini aç.';
      lock = false;
      await new Promise(res => { resolveRound = res; });
      FX.confetti(70); Sound.sfx.fanfare();
      const p = praise();
      await ctx.talk(msg, p + ' 🎉 Bütün kartları eşleştirdin!', p + ' Bütün kartları eşleştirdin!');
      await ctx.wait(500);
    }

    (async () => {
      totalPairs = PAIRS * 2;
      ctx.progress(0, totalPairs);
      await playRound('next', 1, 2);
      await playRound('jump', 2, 2);
      const s = ctx.wrong <= totalPairs * 0.8 ? 3 : ctx.wrong <= totalPairs * 1.6 ? 2 : 1;
      ctx.finish({ stars: s, correct: ctx.correct, wrong: ctx.wrong });
    })();
  }
};
