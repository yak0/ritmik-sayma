'use strict';
/* =========================================================
   Yeni oyun — Tavşanın Yolu
   Sayı tablosunda tavşan havuca gitmek istiyor. Sadece ritmik
   sayıları sırayla takip ederek yan yana karelere basılır.
   3 yol: başlangıç, orta ve 100'e yakın bölüm (Normal/Zor'da son yol geriye).
   ========================================================= */
Games.path = {
  start(ctx) {
    const L = ctx.lv, S = ctx.stage, easy = L === LEVELS.kolay;
    Music.play('play');
    S.className = 'stage st-garden';
    S.innerHTML =
      '<div class="pt-head"><div class="pt-label"></div></div>' +
      '<div class="pt-wrap"><div class="pt-grid"></div></div>' +
      '<div class="msg pt-msg"></div>';
    const grid = $('.pt-grid', S), wrap = $('.pt-wrap', S), label = $('.pt-label', S), msg = $('.pt-msg', S);
    const portrait = S.clientHeight > S.clientWidth;
    const R = portrait ? 7 : 5, C = portrait ? 5 : 7;

    let round = null, cells = [], bunny = null, curIdx = 0, wrongHere = 0, active = false, resolveRound = null, done = 0, total = 1;

    function measure() {
      const w = wrap.clientWidth, hh = wrap.clientHeight;
      const cell = Math.floor(Math.min((w - 8 * (C - 1)) / C, (hh - 8 * (R - 1)) / R, 124));
      grid.style.setProperty('--cell', cell + 'px');
      grid.style.gridTemplateColumns = 'repeat(' + C + ', var(--cell))';
      if (bunny && round) placeBunny(curIdx, true);
    }
    measure(); ctx.on(window, 'resize', measure);

    /* rastgele, kendini kesmeyen bir yol (soldan sağa / yukarıdan aşağıya yayılır) */
    function makePath(len) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const start = portrait ? [0, rand(0, C - 1)] : [rand(0, R - 1), 0];
        const path = [start], seen = new Set([start[0] * C + start[1]]);
        const dfs = () => {
          if (path.length === len) return true;
          const [r, c] = path[path.length - 1];
          const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
            .filter(([a, b]) => a >= 0 && a < R && b >= 0 && b < C && !seen.has(a * C + b))
            .map(p => ({ p, s: (portrait ? p[0] : p[1]) * 0.7 + Math.random() * 1.6 }))
            .sort((x, y) => y.s - x.s).map(o => o.p);
          for (const p of nb) {
            path.push(p); seen.add(p[0] * C + p[1]);
            if (dfs()) return true;
            path.pop(); seen.delete(p[0] * C + p[1]);
          }
          return false;
        };
        if (dfs()) return path;
      }
      return null;
    }
    function distract(seq, n) {
      const set = new Set(seq), lo = Math.max(1, Math.min.apply(null, seq) - n), hi = Math.min(LIMIT, Math.max.apply(null, seq) + n);
      for (let t = 0; t < 60; t++) {
        const v = Math.random() < 0.6 ? pick(seq) + pick([-2, -1, 1, 2, 3, -3]) : rand(lo, hi);
        if (v >= 0 && v <= LIMIT && !set.has(v)) return v;
      }
      return hi + 1 <= LIMIT ? hi + 1 : 1;
    }

    function buildRounds() {
      const out = [], NR = 3;
      for (let i = 0; i < NR; i++) {
        const n = ctx.mixed ? pick(ctx.ns) : ctx.n, K = kmax(n);
        const len = Math.min(K + 1, easy ? 8 : (i === NR - 1 ? 12 : 10));
        const back = L.backward && i === NR - 1;
        let k0;
        if (ctx.mixed) k0 = back ? rand(len - 1, K) : rand(0, K - len + 1);
        else k0 = back ? K : Math.round(i * (K - len + 1) / (NR - 1));
        const seq = [];
        for (let j = 0; j < len; j++) seq.push((back ? k0 - j : k0 + j) * n);
        out.push({ n, seq, back });
      }
      return out;
    }

    function render(r) {
      grid.innerHTML = '';
      grid.style.setProperty('--c', NUM_COLORS[r.n]);
      const path = makePath(r.seq.length);
      const at = {};
      path.forEach((p, i) => { at[p[0] * C + p[1]] = i; });
      cells = [];
      for (let rr = 0; rr < R; rr++) {
        for (let cc = 0; cc < C; cc++) {
          const pi = at[rr * C + cc];
          const val = pi != null ? r.seq[pi] : distract(r.seq, r.n);
          const el = h('div', { class: 'pt-cell' }, h('b', null, String(val)));
          el._pi = pi == null ? -1 : pi;
          onTap(el, () => tapCell(el));
          grid.append(el); cells.push(el);
        }
      }
      r.els = path.map(p => cells[p[0] * C + p[1]]);
      r.els[0].classList.add('visited', 'start');
      r.els[r.els.length - 1].append(h('i', { class: 'pt-carrot' }, '🥕'));
      bunny = h('div', { class: 'pt-bunny' }, h('span', null, '🐰'));
      grid.append(bunny);
      curIdx = 0; placeBunny(0, true);
    }
    function placeBunny(i, instant) {
      const el = round.els[i];
      if (instant) bunny.style.transition = 'none';
      bunny.style.transform = 'translate(' + el.offsetLeft + 'px,' + el.offsetTop + 'px)';
      if (instant) { void bunny.offsetWidth; bunny.style.transition = ''; }
      else restartAnim(bunny, 'hop');
    }

    function tapCell(el) {
      if (!active || ctx.paused) return;
      if (el._pi === curIdx + 1) {
        curIdx++;
        el.classList.add('visited'); restartAnim(el, 'pop');
        round.els.forEach(x => x.classList.remove('hint'));
        placeBunny(curIdx); Sound.sfx.jump();
        ctx.correct++; done++; ctx.progress(done, total);
        ctx.say(String(round.seq[curIdx]));
        msg.innerHTML = round.seq[curIdx - 1] + (round.back ? ' − ' : ' + ') + round.n + ' = <b>' + round.seq[curIdx] + '</b>';
        wrongHere = 0;
        if (curIdx === round.seq.length - 1) { active = false; if (resolveRound) resolveRound(); }
      } else if (!el.classList.contains('visited')) {
        ctx.wrong++; wrongHere++;
        restartAnim(el, 'shake'); Sound.sfx.wrong();
        msg.innerHTML = pick(TRY_AGAIN) + ' Tavşanın yanındaki karelere bak 👀'; restartAnim(msg, 'msg-in');
        if (wrongHere >= L.hintAfter) {
          const cur = round.seq[curIdx], op = round.back ? '−' : '+';
          round.els[curIdx + 1].classList.add('hint');
          msg.innerHTML = '💡 İpucu: ' + cur + ' ' + op + ' ' + round.n + ' = ?';
          ctx.say('İpucu: ' + cur + ' ' + op + ' ' + round.n);
        }
      }
    }

    async function celebrate() {
      const carrot = $('.pt-carrot', grid);
      if (carrot) carrot.classList.add('eaten');
      Sound.sfx.star(); FX.confetti(70);
      const r = round.els[round.els.length - 1].getBoundingClientRect();
      FX.stars(r.left + r.width / 2, r.top + r.height / 2, 16);
      const p = praise();
      await ctx.talk(msg, p + ' 🥕 Tavşan havuca ulaştı! Yolu birlikte sayalım.', p + ' Tavşan havuca ulaştı! Yolu birlikte sayalım.');
      await recite(ctx, round.els, round.seq);
      await ctx.wait(400);
    }

    (async () => {
      const rounds = buildRounds();
      total = rounds.reduce((a, r) => a + r.seq.length - 1, 0);
      ctx.progress(0, total);
      for (let i = 0; i < rounds.length; i++) {
        round = rounds[i];
        label.textContent = '🐰 ' + TR.label(round.n) + ' · Yol ' + (i + 1) + '/' + rounds.length + (round.back ? ' · ⬅️ Geriye' : '');
        label.style.background = NUM_COLORS[round.n];
        render(round);
        const s0 = round.seq[0];
        const intro = i === 0
          ? 'Tavşan havuca gitmek istiyor! 🥕 <b>' + TR.ablText(s0) + '</b> başla, <b>' + TR.label(round.n) + '</b> sayarak yandaki karelere bas.'
          : round.back
            ? 'Bu sefer geriye! <b>' + TR.ablText(s0) + '</b> başla, ' + TR.label(round.n) + ' azalarak havuca git.'
            : 'Yeni yol! <b>' + TR.ablText(s0) + '</b> başla, ' + TR.label(round.n) + ' say.';
        await ctx.talk(msg, intro);
        wrongHere = 0; active = true;
        await new Promise(res => { resolveRound = res; });
        await celebrate();
      }
      ctx.finish({ stars: starsBy(ctx.wrong, total) });
    })();
  }
};
