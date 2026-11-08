'use strict';
/* =========================================================
   Oyun 1 — Kurbağa Zıplıyor
   Sayı doğrusunda kurbağa n adım n adım zıplar.
   1) İzle-dinle  2) Sıra sende (doğru taşa dokun)  3) Yüzlük tabloda desen
   ========================================================= */
Games.learn = {
  start(ctx) {
    const n = ctx.n, S = ctx.stage, END = 10 * n, MAXK = END + n + 2;
    Music.play('learn');
    S.className = 'stage st-pond';
    S.innerHTML =
      '<div class="pond-deco"><i></i><i></i><i></i><i></i></div>' +
      '<div class="lr-head"><div class="seq-bar lr-seq"></div></div>' +
      '<div class="nl-vp"><div class="nl-strip"></div></div>' +
      '<div class="msg lr-msg"></div>';
    const vp = $('.nl-vp', S), strip = $('.nl-strip', S), msg = $('.lr-msg', S);
    const chips = seqChips($('.lr-seq', S), 11, NUM_COLORS[n]);

    let W = vp.clientWidth, H = vp.clientHeight;
    const sp = clamp(W / (2.4 * n + 1.5), 50, 112);
    const X = k => sp * (k + 1);
    strip.style.width = X(MAXK + 1) + 'px';
    S.style.setProperty('--sp', sp + 'px');

    const cols = [];
    for (let k = 0; k <= MAXK; k++) {
      const c = h('div', { class: 'nl-col', style: { left: (X(k) - sp / 2) + 'px', width: sp + 'px' } },
        h('div', { class: 'nl-stone' }, h('b', null, String(k))),
        h('i', { class: 'nl-badge' }));
      c.dataset.k = k;
      strip.append(c); cols.push(c);
    }
    const frog = h('div', { class: 'frog' }, '🐸');
    strip.append(frog);
    let fw = frog.offsetWidth, fh = frog.offsetHeight;
    let fx = X(0), fyOff = 0, cam = 0, arcs = [];

    ctx.on(window, 'resize', () => { W = vp.clientWidth; H = vp.clientHeight; fw = frog.offsetWidth; fh = frog.offsetHeight; });
    ctx.loop(dt => {
      const baseY = H * 0.6 - Math.min(sp * 0.4, 38) - fh * 0.78;
      frog.style.transform = 'translate(' + (fx - fw / 2) + 'px,' + (baseY + fyOff) + 'px)';
      const target = clamp(fx - W * 0.32, 0, Math.max(0, X(MAXK + 1) - W));
      cam += (target - cam) * Math.min(1, dt * 4.5);
      strip.style.transform = 'translateX(' + (-cam) + 'px)';
    });

    function badge(k, i) {
      const c = cols[k]; if (!c) return;
      c.querySelector('.nl-badge').textContent = i;
      restartAnim(c, 'passed');
      Sound.sfx.step(i - 1);
    }
    function land(k) {
      const c = cols[k]; c.classList.add('lily');
      const r = h('i', { class: 'ripple' }); c.append(r); setTimeout(() => r.remove(), 900);
      Sound.sfx.splash();
    }
    function arc(k0, k1) {
      const a = h('div', { class: 'nl-arc', style: { left: Math.min(X(k0), X(k1)) + 'px', width: Math.abs(X(k1) - X(k0)) + 'px' } },
        h('span', null, '+' + Math.abs(k1 - k0)));
      strip.insertBefore(a, frog); arcs.push(a);
    }
    function hop(k0, k1, dur, count) {
      return new Promise(res => {
        const x0 = X(k0), x1 = X(k1), dir = Math.sign(k1 - k0), dist = Math.abs(k1 - k0);
        const hgt = Math.min(H * 0.34, 34 + dist * sp * 0.2);
        const t0 = performance.now(); let passed = 0;
        Sound.sfx.jump(); frog.classList.add('jump');
        const step = now => {
          if (!ctx.alive) return;
          const t = Math.min(1, (now - t0) / dur);
          fx = x0 + (x1 - x0) * t; fyOff = -hgt * Math.sin(Math.PI * t);
          if (count) {
            const cov = Math.floor(t * dist + 1e-6);
            while (passed < cov && passed < dist - 1) { passed++; badge(k0 + dir * passed, passed); }
          }
          if (t < 1) requestAnimationFrame(step);
          else { fx = x1; fyOff = 0; frog.classList.remove('jump'); res(); }
        };
        requestAnimationFrame(step);
      });
    }

    /* 1) İzle ve dinle */
    async function watch() {
      await ctx.talk(msg, '👀 İzle ve dinle! Kurbağa her seferinde <b>' + n + ' adım</b> zıplayacak.',
        'Hadi ' + TR.speakLabel(n) + ' saymayı öğrenelim! Kurbağa her seferinde ' + TR.words(n) + ' adım zıplayacak. İzle ve dinle!');
      land(0); chipSet(chips[0], '0');
      await ctx.talk(msg, 'Sıfırdan başlıyoruz…');
      const dur = clamp(n * 200, 650, 1600);
      for (let i = 1; i <= 10; i++) {
        const k0 = (i - 1) * n, k1 = i * n;
        await hop(k0, k1, dur, true);
        land(k1); arc(k0, k1); chipSet(chips[i], String(k1));
        msg.innerHTML = k0 + ' + ' + n + ' = <b>' + k1 + '</b>';
        ctx.progress(i, 20);
        await Promise.all([ctx.say(String(k1)), ctx.wait(450)]);
      }
      await ctx.wait(300);
      await ctx.talk(msg, 'Süper! Şimdi hep birlikte sayalım 🎶', 'Süper! Şimdi hep birlikte sayalım.');
      await recite(ctx, chips, chips.map((c, i) => i * n));
    }

    /* 2) Sıra sende */
    async function practice() {
      await ctx.talk(msg, 'Sıra sende! 👆 Kurbağa nereye zıplayacak? <b>Doğru taşa dokun.</b>',
        'Şimdi sıra sende! Kurbağa nereye zıplayacak? Doğru taşa dokun.');
      arcs.forEach(a => a.remove()); arcs = [];
      cols.forEach((c, k) => { if (k) c.classList.remove('lily'); });
      chips.forEach((c, i) => { if (i) { c.className = 'chip empty'; c.textContent = ''; } });
      Sound.sfx.whoosh();
      await hop(END, 0, 1100, false);
      strip.classList.add('tapmode');

      let cur = 0, wrongHere = 0, busy = false;
      await new Promise(resolve => {
        const onCol = async c => {
          if (busy || ctx.paused || !ctx.alive) return;
          const k = +c.dataset.k, target = cur + n;
          if (k <= cur) return;
          if (k === target) {
            busy = true; clearHint();
            await hop(cur, target, clamp(n * 160, 550, 1300), true);
            land(target); arc(cur, target); cur = target;
            const i = cur / n;
            chipSet(chips[i], String(cur)); ctx.correct++;
            ctx.progress(10 + i, 20); Sound.sfx.correct();
            msg.innerHTML = (cur - n) + ' + ' + n + ' = <b>' + cur + '</b>';
            await Promise.all([ctx.say(String(cur)), ctx.wait(350)]);
            wrongHere = 0; busy = false;
            if (cur >= END) resolve();
          } else {
            ctx.wrong++; wrongHere++;
            restartAnim(c, 'shake'); Sound.sfx.wrong();
            const t = k < target ? 'Biraz daha ileri! 👉' : 'Çok uzağa! Biraz geri 👈';
            msg.innerHTML = t; restartAnim(msg, 'msg-in'); ctx.say(t);
            if (wrongHere >= ctx.lv.hintAfter) {
              busy = true; await ctx.wait(900); await countHint(cur, target); busy = false;
            }
          }
        };
        cols.forEach(c => onTap(c, () => onCol(c)));
      });
    }
    async function countHint(from, to) {
      msg.innerHTML = 'Birlikte adım adım sayalım 🐾';
      await ctx.say('Birlikte adım adım sayalım.');
      for (let i = 1; i <= n; i++) {
        badge(from + i, i);
        await Promise.all([ctx.say(TR.words(i), { rate: 1.1 }), ctx.wait(380)]);
      }
      cols[to].classList.add('hint');
      msg.innerHTML = n + ' adım! Parlayan taşa dokun 👆';
    }
    function clearHint() { cols.forEach(c => c.classList.remove('hint')); }

    /* 3) Yüzlük tabloda desen */
    async function finale() {
      strip.classList.remove('tapmode');
      await ctx.wait(400);
      const hb = buildHundred();
      hb.grid.style.setProperty('--c', NUM_COLORS[n]);
      const btn = h('button', { class: 'btn btn-go btn-lg' }, 'Bitir ✓');
      S.append(h('div', { class: 'lr-final' }, h('div', { class: 'lr-final-card' },
        h('div', { class: 'lr-final-title' }, '🔢 ' + TR.label(n) + ' sayılar yüzlük tabloda'),
        hb.grid, btn)));
      await ctx.say('Bak! ' + TR.speakLabel(n) + ' sayınca tabloda güzel bir desen oluşuyor.');
      let i = 0;
      for (let m = n; m <= 100; m += n, i++) {
        hb.cells[m - 1].classList.add(m <= END ? 'hl' : 'hl2');
        Sound.bell(72 + PENTA[i % PENTA.length], undefined, 0.05);
        await ctx.wait(m <= END ? 200 : 90);
      }
      await new Promise(res => onTap(btn, () => { Sound.sfx.click(); res(); }));
    }

    (async () => {
      ctx.progress(0, 20);
      await watch();
      await practice();
      Sound.sfx.fanfare(); FX.confetti(80);
      const p = praise();
      await ctx.talk(msg, p + ' 🎉 Kurbağa hedefe ulaştı: <b>' + END + '</b>', p + ' Kurbağa hedefe ulaştı!');
      await finale();
      ctx.finish({ stars: starsFrom(ctx.wrong, 1, 4) });
    })();
  }
};
