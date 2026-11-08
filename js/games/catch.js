'use strict';
/* =========================================================
   Yeni oyun — Sepete Yakala
   Gökyüzünden sayılı meyveler düşer. Parmağınla sepeti kaydır;
   sadece n'er n'er sayarken söylenen sayıları (n'in ailesini) yakala!
   Yanlış sayı yakalanırsa neden yanlış olduğu gösterilir.
   ========================================================= */
Games.catch = {
  start(ctx) {
    const n = ctx.n, L = ctx.lv, S = ctx.stage, K = kmax(n);
    const GOAL = L === LEVELS.kolay ? 8 : L === LEVELS.zor ? 15 : 12;
    const fallT = L === LEVELS.kolay ? 6.5 : L === LEVELS.zor ? 3.8 : 5;
    const spawnEvery = L === LEVELS.kolay ? 1.5 : L === LEVELS.zor ? 0.85 : 1.15;
    Music.play('play');
    S.className = 'stage st-orchard';
    S.innerHTML =
      '<div class="sky-sun"></div><div class="cloud c1"></div><div class="cloud c2"></div>' +
      '<div class="hills"><i></i><i></i><i></i></div>' +
      '<div class="ct-head"><div class="ct-label"></div><div class="seq-bar ct-bag"></div></div>' +
      '<div class="ct-layer"></div>' +
      '<div class="ct-basket"><span>🧺</span><b class="ct-count">0/' + GOAL + '</b></div>' +
      '<div class="msg ct-msg"></div>';
    const layer = $('.ct-layer', S), basket = $('.ct-basket', S), countEl = $('.ct-count', S);
    const label = $('.ct-label', S), msg = $('.ct-msg', S);
    const chips = seqChips($('.ct-bag', S), GOAL, NUM_COLORS[n]);
    label.textContent = '🧺 Sadece ' + TR.label(n) + ' sayılar!';
    label.style.background = NUM_COLORS[n];

    let W = 0, H = 0, it = 70, bk = 120, bx = 0, tx = 0, dragging = false;
    function measure() {
      W = S.clientWidth; H = S.clientHeight;
      it = clamp(Math.min(W, H) * 0.11, 58, 96); bk = clamp(Math.min(W, H) * 0.19, 100, 170);
      S.style.setProperty('--it', it + 'px'); S.style.setProperty('--bk', bk + 'px');
      if (!bx) bx = tx = W / 2;
    }
    measure(); ctx.on(window, 'resize', measure);

    const localX = e => e.clientX - S.getBoundingClientRect().left;
    ctx.on(S, 'pointerdown', e => { dragging = true; tx = localX(e); });
    ctx.on(S, 'pointermove', e => { if (dragging || e.pointerType === 'mouse') tx = localX(e); });
    ctx.on(window, 'pointerup', () => { dragging = false; });
    ctx.on(window, 'pointercancel', () => { dragging = false; });

    let items = [], acc = 0, caught = [], active = false, resolveGame = null, msgTimer = 0;
    ctx.onClean(() => clearTimeout(msgTimer));
    function flash(html, ms) {
      msg.innerHTML = html; restartAnim(msg, 'msg-in');
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => { if (ctx.alive) msg.innerHTML = ''; }, ms || 2500);
    }

    function spawn() {
      const live = items.map(o => o.v);
      let v = 0;
      for (let t = 0; t < 30; t++) {
        if (Math.random() < 0.5) v = rand(1, K) * n;
        else { v = rand(1, K) * n + pick([-2, -1, 1, 2, 3, -3]); if (v % n === 0) continue; }
        if (v > 0 && v <= LIMIT && !live.includes(v) && !caught.includes(v)) break;
      }
      if (!v || v > LIMIT) return;
      const el = h('div', { class: 'ct-item c' + rand(0, 5) }, String(v));
      layer.append(el);
      items.push({ el, v, x: rand(Math.ceil(it / 2) + 4, Math.max(Math.ceil(it / 2) + 5, Math.floor(W - it / 2 - 4))), y: -it, vy: H / fallT * (0.85 + Math.random() * 0.3), rot: Math.random() * 360, vr: (Math.random() - 0.5) * 90 });
    }

    function catchIt(o) {
      const r = basket.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.3;
      if (o.v % n === 0) {
        caught.push(o.v); ctx.correct++;
        chipSet(chips[caught.length - 1], String(o.v));
        countEl.textContent = caught.length + '/' + GOAL;
        restartAnim(basket, 'bounce'); Sound.sfx.correct();
        FX.burst(cx, cy, NUM_COLORS[n], 16); FX.floatText(cx, cy - 40, String(o.v), 'good');
        ctx.say(String(o.v));
        ctx.progress(caught.length, GOAL);
        if (caught.length >= GOAL) { active = false; if (resolveGame) resolveGame(); }
      } else {
        ctx.wrong++;
        restartAnim(basket, 'shake'); Sound.sfx.wrong();
        const lo = Math.floor(o.v / n) * n, hi = lo + n;
        flash('<b>' + o.v + '</b> yok! ' + TR.label(n) + ' sayarken ' + lo + ', ' + hi + ' var.', 3200);
        ctx.say(o.v + ' yok! ' + TR.speakLabel(n) + ' sayarken ' + lo + ', ' + hi + ' var.');
      }
    }

    ctx.loop(dt => {
      bx += (tx - bx) * Math.min(1, dt * 14);
      bx = clamp(bx, bk / 2, W - bk / 2);
      basket.style.transform = 'translateX(' + (bx - bk / 2) + 'px)';
      if (active) {
        acc += dt;
        if (acc >= spawnEvery) { acc = 0; spawn(); }
      }
      const top = H - bk * 0.95 - 12;
      for (const o of items) {
        if (o.dead) continue;
        o.y += o.vy * dt; o.rot += o.vr * dt;
        o.el.style.transform = 'translate3d(' + (o.x - it / 2) + 'px,' + o.y + 'px,0) rotate(' + o.rot + 'deg)';
        if (active && o.y + it * 0.6 >= top && o.y < top + bk * 0.3 && Math.abs(o.x - bx) < bk * 0.48) {
          o.dead = true; o.el.remove(); catchIt(o);
        } else if (o.y > H + 10) { o.dead = true; o.el.remove(); }
      }
      if (items.length > 20) items = items.filter(o => !o.dead);
    });

    (async () => {
      ctx.progress(0, GOAL);
      await ctx.talk(msg, '🧺 Parmağınla sepeti kaydır. Sadece <b>' + TR.label(n) + '</b> sayarken söylenen sayıları yakala! (' + n + ', ' + 2 * n + ', ' + 3 * n + ' … ' + K * n + ')',
        'Parmağınla sepeti kaydır. Sadece ' + TR.speakLabel(n) + ' sayarken söylenen sayıları yakala!');
      await ctx.wait(800);
      msg.innerHTML = '';
      active = true; acc = spawnEvery;
      await new Promise(res => { resolveGame = res; });
      items.forEach(o => { if (!o.dead) { o.dead = true; o.el.remove(); } });
      clearTimeout(msgTimer);
      Sound.sfx.fanfare(); FX.confetti(90);
      const sorted = caught.slice().sort((a, b) => a - b);
      chips.forEach((c, i) => chipSet(c, String(sorted[i])));
      const p = praise();
      await ctx.talk(msg, p + ' 🎉 Sepetteki sayıları küçükten büyüğe sayalım!', p + ' Sepetteki sayıları küçükten büyüğe sayalım!');
      await recite(ctx, chips, sorted);
      ctx.finish({ stars: starsBy(ctx.wrong, GOAL) });
    })();
  }
};
