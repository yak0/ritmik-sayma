'use strict';
/* =========================================================
   Oyun 3 — Davul Ritmi
   Her vuruşta bir sayı akar: 1, 2, 3, 4 ...
   n'in katlarına (ritmik sayılara) gelince davula vurulur.
   Okullardaki "1, 2, ÜÇ, 4, 5, ALTI" ritmik sayma çalışmasının oyunu.
   ========================================================= */
const DRUM_SVG = '<svg viewBox="0 0 200 170" aria-hidden="true">' +
  '<ellipse cx="100" cy="148" rx="86" ry="18" fill="rgba(0,0,0,.25)"/>' +
  '<path d="M18 52 V128 A82 24 0 0 0 182 128 V52 Z" fill="url(#drumBody)"/>' +
  '<path d="M24 66 L46 124 L70 68 L94 128 L118 68 L142 128 L166 68 L178 98" stroke="#ffe08a" stroke-width="5" fill="none" stroke-linejoin="round"/>' +
  '<path d="M18 122 A82 24 0 0 0 182 122 V134 A82 24 0 0 1 18 134 Z" fill="#ffd23f"/>' +
  '<ellipse cx="100" cy="52" rx="84" ry="25" fill="#ffd23f"/>' +
  '<ellipse class="skin" cx="100" cy="50" rx="76" ry="21" fill="#fff8e6"/>' +
  '<ellipse cx="80" cy="45" rx="30" ry="7" fill="#fff" opacity=".7"/>' +
  '</svg>';

Games.rhythm = {
  start(ctx) {
    const n = ctx.n, L = ctx.lv, S = ctx.stage, K = kmax(n), END = K * n; // 100'e kadar
    Music.stop();
    const bpm = L.rhythmBpm + (n - 2) * L.rhythmStep, beat = 60 / bpm, win = beat * L.rhythmWin;
    S.className = 'stage st-rhythm';
    S.innerHTML =
      '<div class="rh-lights"><i></i><i></i><i></i></div>' +
      '<div class="rh-top"><div class="seq-bar rh-seq"></div></div>' +
      '<div class="rh-lane"><div class="rh-track"></div><div class="rh-ring"></div><div class="rh-bubbles"></div><div class="rh-fb"></div></div>' +
      '<div class="rh-dots"></div>' +
      '<div class="rh-drumwrap"><div class="rh-drum"><div class="rh-big"></div>' + DRUM_SVG + '</div><div class="rh-tap">👆 Ekrana dokun = davula vur</div></div>' +
      '<div class="rh-count"></div>' +
      '<div class="msg rh-msg"></div>';
    const lane = $('.rh-lane', S), ring = $('.rh-ring', S), bubWrap = $('.rh-bubbles', S), fb = $('.rh-fb', S);
    const dotsEl = $('.rh-dots', S), big = $('.rh-big', S), drum = $('.rh-drum', S), countEl = $('.rh-count', S), msg = $('.rh-msg', S);
    const chips = seqChips($('.rh-seq', S), K, NUM_COLORS[n]);

    // grup noktaları: 1 2 ... 🥁
    const dots = [];
    for (let i = 1; i <= n; i++) {
      const d = h('i', { class: i === n ? 'drum' : '' }, i === n ? '🥁' : String(i));
      dotsEl.append(d); dots.push(d);
    }
    if (!L.dots) dotsEl.classList.add('hidden');

    // akan sayı baloncukları
    const bubs = [null];
    for (let i = 1; i <= END; i++) {
      const m = i % n === 0;
      const b = h('div', { class: 'rh-b' + (m ? ' mult' : '') + (m && L.cue ? ' cue' : '') }, String(i));
      b.style.display = 'none';
      bubWrap.append(b); bubs.push(b);
    }
    let laneW = 0, hitX = 0, ppb = 0;
    function measure() {
      laneW = lane.clientWidth; hitX = laneW * 0.2; ppb = clamp(laneW * 0.15, 80, 170);
      ring.style.left = hitX + 'px'; fb.style.left = hitX + 'px';
    }
    measure(); ctx.on(window, 'resize', measure);

    const AC = () => Sound.ctx();
    const now = () => { const a = AC(); return a ? a.currentTime - (a.outputLatency || 0) : 0; };
    let tStart = 0, running = false, ended = false, nextSched = -3, missIdx = 1, lastCb = -99, lo = 1;
    let hits = 0, extras = 0, misses = 0;
    const hitSet = new Set();
    const bt = i => tStart + i * beat;

    /* --- başlangıç kartı --- */
    const demo = h('div', { class: 'rh-demo' });
    for (let i = 1; i <= Math.min(2 * n, 12); i++) demo.append(h('span', { class: i % n === 0 ? 'm' : '' }, String(i)));
    const startBtn = h('button', { class: 'btn btn-go btn-lg' }, 'Hazırım! ▶');
    const intro = h('div', { class: 'rh-start' }, h('div', { class: 'rh-start-card' },
      h('h2', null, '🥁 Davul Ritmi'),
      h('p', null, 'Sayılar ritimle akacak. Sarı halkaya gelen sayı ', h('b', null, TR.label(n)), ' sayarken söylediğimiz bir sayıysa ', h('b', null, 'davula vur!')),
      demo,
      h('p', { class: 'rh-small' }, L.dots ? 'Ortadaki noktalar 1\'den ' + TR.datText(n) + ' kadar sayar; davul 🥁 yanınca vur!' : 'Zor seviye: içinden sayarak ritmi takip et!'),
      startBtn));
    S.append(intro);
    ctx.say('Sayılar ritimle akacak. ' + TR.speakLabel(n) + ' sayarken söylediğimiz sayılara gelince davula vur! Hazır olunca düğmeye bas.');
    onTap(startBtn, () => begin());

    function begin() {
      if (running || ended) return;
      intro.remove(); Sound.init(); Voice.cancel();
      const a = AC();
      if (!a) { ctx.finish({ stars: 1, correct: 0, wrong: 0 }); return; }
      tStart = a.currentTime + 0.5 + 3 * beat; // -3..0 hazırlık vuruşları
      nextSched = -3; running = true;
      S.classList.add('counting');
    }

    /* --- ses zamanlayıcı (ileriye dönük planlama) --- */
    const PADS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    function padChord(at, idx) {
      const B = Sound.musicBus(), ch = PADS[idx % 4];
      ch.forEach(m => Sound.tone({ f: Sound.mtof(m), type: 'triangle', at, dur: beat * 8, vol: 0.05, a: 0.1, bus: B }));
      Sound.tone({ f: Sound.mtof(ch[0] - 12), type: 'sine', at, dur: beat * 8, vol: 0.12, a: 0.05, bus: B });
    }
    ctx.every(() => {
      if (!running) return;
      const a = AC(); if (!a || a.state !== 'running') return;
      while (nextSched <= END && bt(nextSched) < a.currentTime + 0.15) {
        const i = nextSched, at = bt(i);
        if (i <= 0) Sound.cowbell(at, i === 0 ? 0.3 : 0.2);
        else {
          Sound.block(at, 0.2);
          if (L.cue && i % n === 0) Sound.bell(84, at, 0.07);
          Sound.hat(at + beat / 2, 0.04);
          if ((i - 1) % 8 === 0) padChord(at, Math.floor((i - 1) / 8));
        }
        nextSched++;
      }
    }, 25);

    /* --- görüntü döngüsü --- */
    ctx.loop(() => {
      if (!running) return;
      const t = now();
      const cf = Math.floor((t - tStart) / beat + 0.02);
      if (cf !== lastCb) {
        lastCb = cf;
        if (cf >= -3 && cf <= 0) {
          countEl.innerHTML = '<b>' + '●'.repeat(cf + 4) + '○'.repeat(-cf) + '</b><span>' + (cf === 0 ? 'Hazır ol!' : 'Dinle…') + '</span>';
          countEl.classList.add('show'); restartAnim(countEl, 'pulse');
        } else if (cf >= 1 && cf <= END) {
          countEl.classList.remove('show'); S.classList.remove('counting');
          const pos = ((cf - 1) % n) + 1;
          dots.forEach((d, j) => d.classList.toggle('on', j < pos));
          restartAnim(dots[pos - 1], 'beat');
          restartAnim(ring, 'beat');
        }
      }
      // baloncuklar
      const span0 = (t - tStart) / beat;
      while (lo <= END && hitX + (lo - span0) * ppb < -90) { bubs[lo].style.display = 'none'; lo++; }
      for (let i = lo; i <= END; i++) {
        const x = hitX + (i - span0) * ppb;
        if (x > laneW + 90) break;
        const b = bubs[i];
        if (b.style.display === 'none') b.style.display = '';
        b.style.transform = 'translate3d(' + x + 'px,-50%,0)';
      }
      // kaçırılanlar
      while (missIdx <= END && t > bt(missIdx) + win) {
        const i = missIdx;
        if (i % n === 0) { if (!hitSet.has(i)) markMiss(i); }
        else bubs[i].classList.add('past');
        missIdx++;
      }
      if (!ended && t > bt(END) + beat * 1.2) { ended = true; running = false; finishUp(); }
    });

    /* --- dokunma = davul --- */
    ctx.on(S, 'pointerdown', e => {
      if (e.target.closest('.rh-start')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      Sound.init();
      Sound.drum(); restartAnim(drum, 'hit');
      if (!running || ctx.paused) return;
      const t = now(), i = Math.round((t - tStart) / beat);
      if (i < 1 || i > END) return;
      const err = t - bt(i);
      if (i % n === 0) {
        if (hitSet.has(i)) return;
        if (Math.abs(err) <= win) { doHit(i, err); return; }
        fbShow(err < 0 ? 'Biraz erken!' : 'Biraz geç!', 'meh');
        return;
      }
      extras++;
      fbShow('Hop! Bu değil 🙊', 'bad');
      restartAnim(bubs[i], 'shake');
    });

    function fbShow(text, cls) { fb.textContent = text; fb.className = 'rh-fb ' + cls; restartAnim(fb, 'show'); }
    function doHit(i, err) {
      hitSet.add(i); hits++;
      bubs[i].classList.add('hit');
      chipSet(chips[i / n - 1], String(i));
      big.textContent = i; big.className = 'rh-big'; restartAnim(big, 'show');
      fbShow(Math.abs(err) < 0.1 ? 'Harika! ⭐' : 'Güzel!', 'good');
      const r = ring.getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd23f', 18);
      ctx.say(String(i), { rate: 1.15 });
      ctx.progress(hits + misses, K);
    }
    function markMiss(i) {
      misses++;
      bubs[i].classList.add('missed');
      chipSet(chips[i / n - 1], String(i), 'miss');
      big.textContent = i; big.className = 'rh-big dim'; restartAnim(big, 'show');
      ctx.progress(hits + misses, K);
    }

    async function finishUp() {
      countEl.classList.remove('show');
      await ctx.wait(500);
      const ratio = hits / K, p = ratio >= 0.9 ? praise() : ratio >= 0.5 ? 'Güzel ritim!' : 'İyi deneme!';
      Sound.sfx.fanfare(); if (ratio >= 0.6) FX.confetti(80);
      await ctx.talk(msg, p + ' 🥁 ' + hits + ' / ' + K + ' doğru vuruş. Hep birlikte sayalım!', p + ' Hep birlikte sayalım!');
      await recite(ctx, chips, chips.map((c, k) => (k + 1) * n));
      let stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
      if (extras >= Math.max(6, Math.round(K * 0.5)) && stars > 1) stars--;
      ctx.finish({ stars, correct: hits, wrong: misses + extras, extra: '🥁 ' + hits + '/' + K + ' vuruş' });
    }
  }
};
