'use strict';
/* =========================================================
   Oyun 2 — Balon Patlat
   Üstte sayı dizisi var, sıradaki sayı "?" ile yanıp söner.
   Yükselen balonlardan doğru sayıyı taşıyanı patlat!
   Altın ⭐ balonlar sürpriz bonus verir.
   ========================================================= */
function balloonEl(label, ci, gold) {
  const e = h('div', { class: 'balloon' + (gold ? ' gold' : '') });
  const inner = h('div', { class: 'b-in' });
  inner.innerHTML = '<svg viewBox="0 0 100 150" aria-hidden="true">' +
    '<path class="b-str" d="M50 113 C 43 122, 57 129, 50 138 S 45 146, 50 150"/>' +
    '<path d="M50 3 C22 3 5 26 5 52 C5 80 30 101 46 107 L43 114 L57 114 L54 107 C70 101 95 80 95 52 C95 26 78 3 50 3Z" fill="url(#' + (gold ? 'balgold' : 'bal' + ci) + ')"/>' +
    '<ellipse cx="31" cy="31" rx="8" ry="15" fill="#fff" opacity=".45" transform="rotate(-24 31 31)"/>' +
    '</svg>';
  inner.append(h('span', { class: 'b-num' }, String(label)));
  e.append(inner);
  return e;
}

Games.balloon = {
  start(ctx) {
    const L = ctx.lv, S = ctx.stage;
    Music.play('play');
    S.className = 'stage st-sky';
    S.innerHTML =
      '<div class="sky-sun"></div><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div>' +
      '<div class="hills"><i></i><i></i><i></i></div>' +
      '<div class="bl-layer"></div>' +
      '<div class="bl-top"><div class="bl-label"></div><div class="seq-bar bl-seq"></div></div>' +
      '<div class="bl-bonus">⭐ <span>0</span></div>' +
      '<div class="msg bl-msg"></div>';
    const layer = $('.bl-layer', S), bar = $('.bl-seq', S), labelEl = $('.bl-label', S);
    const msg = $('.bl-msg', S), bonusEl = $('.bl-bonus', S);

    let W = 0, H = 0, bw = 0, bh = 0, lanes = 3;
    function measure() {
      W = layer.clientWidth; H = layer.clientHeight;
      bw = clamp(Math.min(W, H) * 0.155, 78, 138); bh = bw * 1.5;
      lanes = Math.max(3, Math.floor((W - 16) / (bw * 1.08)));
      S.style.setProperty('--bw', bw + 'px');
    }
    measure(); ctx.on(window, 'resize', measure);
    const laneX = i => 8 + i * ((W - 16 - bw) / Math.max(1, lanes - 1));

    let balloons = [], round = null, chips = [], ti = 0, target = null, time = 0, spawnAcc = 0;
    let lastTargetT = -10, nextGold = rand(10, 16), wrongHere = 0, hintOn = false, bonus = 0;
    let done = 0, total = 1, active = false, resolveRound = null, msgTimer = 0;

    function flash(text, ms) {
      msg.innerHTML = text; restartAnim(msg, 'msg-in');
      clearTimeout(msgTimer);
      if (ms) msgTimer = setTimeout(() => { if (ctx.alive) msg.innerHTML = ''; }, ms);
    }
    ctx.onClean(() => clearTimeout(msgTimer));

    function freeLanes() {
      const out = [];
      for (let i = 0; i < lanes; i++) {
        const lx = laneX(i);
        if (!balloons.some(b => !b.dead && Math.abs(b.x - lx) < bw * 0.95 && b.y > H - bh * 1.2)) out.push(i);
      }
      return out;
    }
    function spawn(num, gold) {
      const fl = freeLanes(); if (!fl.length) return false;
      const ci = rand(0, BAL_COLORS.length - 1);
      const el = balloonEl(gold ? '⭐' : num, ci, gold);
      layer.append(el);
      const b = {
        el, num, gold, ci, nope: false, dead: false,
        x: laneX(pick(fl)), y: H + 8,
        vy: H / (L.balloonRise * (0.85 + Math.random() * 0.3)) * (gold ? 1.35 : 1),
        ph: Math.random() * 6.28, amp: 5 + Math.random() * 10
      };
      if (hintOn && !gold && num === target) el.classList.add('hint');
      onTap(el, () => tapB(b));
      balloons.push(b);
      if (!gold && num === target) lastTargetT = time;
      return true;
    }
    function chooseNum() {
      const live = balloons.filter(b => !b.dead && !b.gold).map(b => b.num);
      if (!live.includes(target) && (time - lastTargetT > 1.2 || Math.random() < 0.55)) return target;
      const n = round.n;
      for (let t = 0; t < 40; t++) {
        const c = Math.random() < L.near
          ? target + pick([-2, -1, 1, 2, n, -n, n + 1, n - 1, 2 * n, -1, 1])
          : rand(Math.max(1, target - 3 * n), target + 3 * n);
        if (c >= 0 && c !== target && c <= 120 && !live.includes(c)) return c;
      }
      return null;
    }

    ctx.loop(dt => {
      time += dt;
      if (active) {
        spawnAcc += dt;
        const live = balloons.filter(b => !b.dead && !b.gold).length;
        if (spawnAcc >= L.spawn && live < L.balloonMax) {
          const num = chooseNum();
          if (num != null && spawn(num, false)) spawnAcc = 0;
        }
        if (time > nextGold && !balloons.some(b => b.gold && !b.dead)) {
          if (spawn('⭐', true)) nextGold = time + rand(14, 22);
        }
      }
      for (const b of balloons) {
        if (b.dead) continue;
        b.y -= b.vy * dt;
        const sx = b.x + Math.sin(time * 1.1 + b.ph) * b.amp, rot = Math.sin(time * 1.3 + b.ph) * 5;
        b.el.style.transform = 'translate3d(' + sx + 'px,' + b.y + 'px,0) rotate(' + rot + 'deg)';
        if (b.y < -bh - 20) { b.dead = true; b.el.remove(); }
      }
      if (balloons.length > 24) balloons = balloons.filter(b => !b.dead);
    });

    function center(b) { const r = b.el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.36]; }
    function popB(b) {
      if (b.dead) return null;
      b.dead = true;
      const c = center(b);
      b.el.classList.add('popped');
      FX.burst(c[0], c[1], b.gold ? '#ffd23f' : BAL_COLORS[b.ci][0], 24);
      Sound.sfx.pop();
      setTimeout(() => b.el.remove(), 280);
      return c;
    }
    function tapB(b) {
      if (b.dead || b.nope || !active || ctx.paused) return;
      if (b.gold) {
        const c = popB(b);
        bonus++; bonusEl.querySelector('span').textContent = bonus;
        bonusEl.classList.add('show'); restartAnim(bonusEl, 'bump');
        FX.stars(c[0], c[1], 16); FX.floatText(c[0], c[1], '⭐ Bonus!', 'gold'); Sound.sfx.star();
        return;
      }
      if (b.num === target) {
        const c = popB(b);
        Sound.sfx.correct(); ctx.correct++; done++; ctx.progress(done, total);
        FX.floatText(c[0], c[1], String(b.num), 'good');
        ctx.say(String(b.num));
        chipSet(chips[ti], String(b.num));
        wrongHere = 0; ti++;
        if (ti >= round.seq.length) { active = false; if (resolveRound) resolveRound(); }
        else setTarget();
      } else {
        ctx.wrong++; wrongHere++; b.nope = true;
        restartAnim(b.el, 'wobble'); b.el.classList.add('nope');
        b.vy = Math.max(b.vy * 1.8, H / 3);
        Sound.sfx.wrong();
        flash(pick(TRY_AGAIN) + ' Sıradaki sayı ' + round.seq[ti - 1] + '\'' + TR.abl(round.seq[ti - 1]) + ' sonra gelir.', 2600);
        if (wrongHere >= L.hintAfter && !hintOn) showHint();
      }
    }
    function setTarget() {
      target = round.seq[ti]; hintOn = false;
      balloons.forEach(b => b.el.classList.remove('hint'));
      chips[ti].className = 'chip cur'; chips[ti].textContent = '?';
      if (!balloons.some(b => !b.dead && !b.gold && b.num === target)) spawnAcc = Math.max(spawnAcc, L.spawn * 0.6);
    }
    function showHint() {
      hintOn = true;
      const prev = round.seq[ti - 1], op = round.dir > 0 ? '+' : '−';
      chips[ti].innerHTML = '<small>' + prev + op + round.n + '</small>';
      balloons.forEach(b => { if (!b.dead && !b.gold && b.num === target) b.el.classList.add('hint'); });
      flash('💡 İpucu: ' + prev + ' ' + op + ' ' + round.n + ' = ?', 4000);
      ctx.say('İpucu: ' + prev + ' ' + op + ' ' + round.n);
      lastTargetT = -10;
    }

    function buildRounds() {
      if (ctx.mixed) {
        return [0, 1, 2].map(r => {
          const n = pick(ctx.ns), back = L.balloonBack && r === 2;
          const k0 = back ? rand(6, 10) : rand(0, 4), seq = [];
          for (let i = 0; i < 6; i++) seq.push((back ? k0 - i : k0 + i) * n);
          return { n, seq, dir: back ? -1 : 1 };
        });
      }
      const n = ctx.n, fw = [];
      for (let i = 0; i <= 10; i++) fw.push(i * n);
      const R = [{ n, seq: fw, dir: 1 }];
      if (L.balloonBack) R.push({ n, seq: fw.slice().reverse(), dir: -1 });
      return R;
    }

    async function celebrate() {
      const live = balloons.filter(b => !b.dead);
      for (const b of live) { popB(b); await ctx.wait(80); }
      Sound.sfx.fanfare(); FX.confetti(90);
      const p = praise();
      clearTimeout(msgTimer);
      await ctx.talk(msg, p + ' 🎉 Hep birlikte sayalım!', p + ' Hep birlikte sayalım!');
      await recite(ctx, chips, round.seq);
      await ctx.wait(400);
    }

    (async () => {
      const rounds = buildRounds();
      total = rounds.reduce((a, r) => a + r.seq.length - 1, 0);
      ctx.progress(0, total);
      for (let r = 0; r < rounds.length; r++) {
        round = rounds[r];
        chips = seqChips(bar, round.seq.length, NUM_COLORS[round.n]);
        chipSet(chips[0], String(round.seq[0]));
        labelEl.textContent = (round.dir < 0 ? '⬅️ Geriye ' : '🎈 ') + TR.label(round.n);
        labelEl.style.background = NUM_COLORS[round.n];
        const s0 = round.seq[0];
        await ctx.talk(msg, TR.ablText(s0) + ' başla, ' + (round.dir < 0 ? 'geriye doğru ' : '') + '<b>' + TR.label(round.n) + '</b> say! Sıradaki sayının balonunu patlat 🎈');
        ti = 1; setTarget(); active = true; spawnAcc = L.spawn;
        flash('', 0); msg.innerHTML = '';
        await new Promise(res => { resolveRound = res; });
        await celebrate();
      }
      ctx.finish({ stars: starsFrom(ctx.wrong, 2, 5), extra: bonus ? '⭐ ' + bonus + ' bonus balon' : null });
    })();
  }
};
