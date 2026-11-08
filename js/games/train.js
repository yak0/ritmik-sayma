'use strict';
/* =========================================================
   Oyun 4 — Sayı Treni
   Vagonlarda ritmik sayılar yazılı; bazı vagonlar boş.
   Doğru altın parayı seçip eksik vagonu doldur!
   Normal/Zor seviyede son tren geriye doğru sayar.
   ========================================================= */
const WHEEL = (cx, cy, r) =>
  '<g class="wheel"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#2b2d42"/>' +
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.55) + '" fill="#ffd23f"/>' +
  '<path d="M' + cx + ' ' + (cy - r * 0.8) + ' V' + (cy + r * 0.8) + ' M' + (cx - r * 0.8) + ' ' + cy + ' H' + (cx + r * 0.8) + '" stroke="#2b2d42" stroke-width="3"/></g>';

const LOCO_SVG = '<svg viewBox="0 0 170 120" aria-hidden="true">' +
  '<rect x="38" y="16" width="20" height="34" rx="3" fill="#3b3b4f"/>' +
  '<rect x="32" y="10" width="32" height="10" rx="4" fill="#55556b"/>' +
  '<rect x="14" y="44" width="96" height="42" rx="20" fill="#e63946"/>' +
  '<rect x="26" y="49" width="74" height="8" rx="4" fill="#ff8a8f" opacity=".7"/>' +
  '<circle cx="18" cy="65" r="16" fill="#c1121f"/>' +
  '<circle cx="15" cy="65" r="7" fill="#ffd23f"/>' +
  '<rect x="66" y="34" width="14" height="12" rx="4" fill="#ffd23f"/>' +
  '<rect x="100" y="20" width="60" height="66" rx="6" fill="#1d3557"/>' +
  '<rect x="94" y="12" width="72" height="12" rx="5" fill="#e63946"/>' +
  '<rect x="112" y="32" width="36" height="26" rx="5" fill="#a8dadc"/>' +
  '<rect x="6" y="84" width="160" height="10" rx="3" fill="#2b2d42"/>' +
  '<path d="M8 86 L0 106 L28 106 Z" fill="#6c757d"/>' +
  WHEEL(46, 102, 13) + WHEEL(80, 102, 13) + WHEEL(134, 98, 18) +
  '</svg>';

Games.train = {
  start(ctx) {
    const L = ctx.lv, S = ctx.stage;
    Music.play('play');
    S.className = 'stage st-train';
    S.innerHTML =
      '<div class="sky-sun"></div><div class="cloud c1"></div><div class="cloud c2"></div>' +
      '<div class="tr-hills"><i></i><i></i><i></i></div><div class="tr-ground"></div>' +
      '<div class="tr-head"><div class="tr-badge"></div><div class="msg static tr-msg"></div></div>' +
      '<div class="tr-zone"><div class="tr-train"></div><div class="tr-rails"></div></div>' +
      '<div class="tr-choices"></div>';
    const zone = $('.tr-zone', S), trainEl = $('.tr-train', S), choicesEl = $('.tr-choices', S);
    const msg = $('.tr-msg', S), badge = $('.tr-badge', S);
    function measure() {
      const W = zone.clientWidth, Hs = S.clientHeight;
      S.style.setProperty('--ww', clamp(Math.min((W - 90) / 7.4, Hs * 0.2), 58, 128) + 'px');
    }
    measure(); ctx.on(window, 'resize', measure);

    const WC = ['#ff5d8f', '#ffb703', '#3ecf6e', '#3fa7ff', '#a66cff', '#ff8a3d'];
    let done = 0, total = 0, loco = null;

    function mk(n, seq, back, missCount) {
      const idx = shuffle([1, 2, 3, 4, 5]).slice(0, missCount).sort((a, b) => a - b);
      return { n, seq, back, missing: idx };
    }
    function buildRounds() {
      const R = [];
      if (ctx.mixed) {
        for (let r = 0; r < 4; r++) {
          const n = pick(ctx.ns), K = kmax(n), back = L.backward && r === 3;
          const k0 = back ? rand(5, K) : rand(0, K - 5), seq = [];
          for (let i = 0; i < 6; i++) seq.push((back ? k0 - i : k0 + i) * n);
          R.push(mk(n, seq, back, r === 0 || L.trainChoices === 3 ? 2 : 3));
        }
        return R;
      }
      // Trenler 0'dan 100'e kadar olan aralığa yayılır (2'şer: 0-10, 30-40, 60-70, 90-100 …)
      const n = ctx.n, K = kmax(n);
      const seg = (a, b) => { const s = []; if (a <= b) for (let k = a; k <= b; k++) s.push(k * n); else for (let k = a; k >= b; k--) s.push(k * n); return s; };
      const T = K >= 20 ? 5 : 4, fwd = L.backward ? T - 1 : T;
      for (let i = 0; i < fwd; i++) {
        const s0 = Math.round(i * (K - 5) / Math.max(1, fwd - 1));
        R.push(mk(n, seg(s0, s0 + 5), false, i < 2 || L.trainChoices === 3 ? 2 : 3));
      }
      if (L.backward) R.push(mk(n, seg(K, K - 5), true, 3));
      return R;
    }

    function buildTrain(r) {
      trainEl.innerHTML = '';
      loco = h('div', { class: 'tr-loco', html: LOCO_SVG });
      trainEl.append(loco);
      r.wagons = r.seq.map((num, i) => {
        const miss = r.missing.includes(i);
        const sign = h('div', { class: 'tr-sign' + (miss ? ' empty' : '') }, miss ? '?' : String(num));
        const hint = h('div', { class: 'tr-hint' });
        const w = h('div', { class: 'tr-wagon', style: { '--wc': WC[i % WC.length] } },
          h('div', { class: 'tr-link' }),
          h('div', { class: 'tr-body' }, sign, hint),
          h('div', { class: 'tr-wheels', html: '<svg viewBox="0 0 100 30" aria-hidden="true">' + WHEEL(24, 15, 13) + WHEEL(76, 15, 13) + '</svg>' }));
        trainEl.append(w);
        return { w, sign, hint, num, miss };
      });
    }
    ctx.every(() => {
      if (!loco || !loco.isConnected) return;
      const p = h('i', { class: 'puff' }); loco.append(p); setTimeout(() => p.remove(), 1700);
    }, 520);

    async function arrive() {
      const W = zone.clientWidth;
      trainEl.style.transition = 'none';
      trainEl.style.transform = 'translateX(' + (W + 60) + 'px)';
      void trainEl.offsetWidth;
      trainEl.classList.add('moving');
      trainEl.style.transition = 'transform 2.4s cubic-bezier(.15,.6,.25,1)';
      trainEl.style.transform = 'translateX(0)';
      const chug = ctx.every(() => Sound.sfx.chug(), 230);
      await ctx.wait(2300);
      ctx.clearEvery(chug); trainEl.classList.remove('moving');
    }
    async function depart() {
      Sound.sfx.whistle();
      await ctx.wait(450);
      trainEl.classList.add('moving');
      trainEl.style.transition = 'transform 2.2s cubic-bezier(.5,0,.8,.4)';
      trainEl.style.transform = 'translateX(' + (-(trainEl.offsetWidth + zone.clientWidth)) + 'px)';
      const chug = ctx.every(() => Sound.sfx.chug(), 200);
      await ctx.wait(2100);
      ctx.clearEvery(chug); trainEl.classList.remove('moving');
    }

    function flyTo(src, dst) {
      return new Promise(res => {
        const a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
        const f = src.cloneNode(true);
        f.classList.add('coin-fly');
        Object.assign(f.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
        $('#app').append(f);
        src.style.visibility = 'hidden';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const sc = Math.min(1, b.height / a.height);
          f.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(' + sc + ')';
        }));
        setTimeout(() => { f.remove(); res(); }, 540);
      });
    }

    function ask(r, i) {
      return new Promise(resolve => {
        const wg = r.wagons[i], ans = wg.num, prev = r.wagons[i - 1].num;
        r.wagons.forEach(x => x.w.classList.remove('active'));
        wg.w.classList.add('active');
        const opts = numChoices(ans, r.n, L.trainChoices, L.trainChoices === 3);
        choicesEl.innerHTML = '';
        let wrongHere = 0, locked = false;
        opts.forEach((c, k) => {
          const b = h('button', { class: 'coin', style: { '--d': (k * 70) + 'ms' } }, String(c));
          onTap(b, () => {
            if (locked || b.classList.contains('wrong') || ctx.paused) return;
            if (c === ans) {
              locked = true; ctx.correct++; done++; ctx.progress(done, total);
              Sound.sfx.click();
              flyTo(b, wg.sign).then(() => {
                if (!ctx.alive) return;
                wg.sign.textContent = String(ans); wg.sign.className = 'tr-sign filled'; wg.hint.textContent = '';
                wg.w.classList.remove('active'); restartAnim(wg.w, 'bounce');
                Sound.sfx.correct(); ctx.say(String(ans));
                const rr = wg.sign.getBoundingClientRect();
                FX.stars(rr.left + rr.width / 2, rr.top + rr.height / 2, 10);
                msg.innerHTML = praise() + ' ✨';
                ctx.later(resolve, 700);
              });
            } else {
              ctx.wrong++; wrongHere++;
              b.classList.add('wrong'); Sound.sfx.wrong();
              msg.innerHTML = pick(TRY_AGAIN); restartAnim(msg, 'msg-in');
              if (wrongHere >= L.hintAfter) {
                const op = r.back ? '−' : '+';
                wg.hint.textContent = prev + ' ' + op + ' ' + r.n;
                msg.innerHTML = '💡 İpucu: ' + prev + ' ' + op + ' ' + r.n + ' = ?';
                ctx.say('İpucu: ' + prev + ' ' + op + ' ' + r.n);
              }
            }
          });
          choicesEl.append(b);
        });
      });
    }

    async function celebrate(r) {
      const p = praise();
      await ctx.talk(msg, p + ' 🎉 Vagonları birlikte sayalım!', p + ' Vagonları birlikte sayalım!');
      for (let i = 0; i < r.wagons.length; i++) {
        const w = r.wagons[i];
        restartAnim(w.w, 'bounce'); w.sign.classList.add('lit');
        Sound.bell(72 + PENTA[i], undefined, 0.06);
        await Promise.all([ctx.say(String(w.num), { rate: 1.05 }), ctx.wait(430)]);
        w.sign.classList.remove('lit');
      }
    }

    (async () => {
      const rounds = buildRounds();
      total = rounds.reduce((a, r) => a + r.missing.length, 0);
      ctx.progress(0, total);
      for (let ri = 0; ri < rounds.length; ri++) {
        const r = rounds[ri];
        badge.textContent = '🚂 Tren ' + (ri + 1) + '/' + rounds.length + ' · ' + (r.back ? '⬅️ Geri sayan · ' : '') + TR.label(r.n);
        badge.style.background = NUM_COLORS[r.n];
        msg.innerHTML = r.back ? 'Geri sayan tren geliyor! 🚂' : 'Tren geliyor! 🚂';
        choicesEl.innerHTML = '';
        buildTrain(r);
        await arrive();
        Sound.sfx.whistle();
        await ctx.talk(msg, 'Bu trende sayılar <b>' + TR.label(r.n) + '</b> ' + (r.back ? 'azalıyor' : 'artıyor') + '. Eksik vagonları bul!');
        for (const i of r.missing) await ask(r, i);
        choicesEl.innerHTML = '';
        await celebrate(r);
        await depart();
      }
      ctx.finish({ stars: starsBy(ctx.wrong, total) });
    })();
  }
};
