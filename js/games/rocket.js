'use strict';
/* =========================================================
   Oyun 5 — Aya Yolculuk
   10 soru: sıradaki sayı, eksik sayı, geriye sayma, sepetleri
   sayma (gruplar), "hangisi söylenir?" ... Her doğru cevapta
   roket bir basamak yükselir; 10. soruda Ay'a iner.
   ========================================================= */
Games.rocket = {
  start(ctx) {
    const L = ctx.lv, S = ctx.stage, easy = L === LEVELS.kolay;
    Music.play('space');
    S.className = 'stage st-space';
    let starsHtml = '';
    for (let i = 0; i < 70; i++) {
      starsHtml += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) +
        '%;animation-delay:' + (Math.random() * 3).toFixed(2) + 's;--s:' + (1 + Math.random() * 2.5).toFixed(1) + 'px"></i>';
    }
    S.innerHTML =
      '<div class="rk-stars">' + starsHtml + '</div><div class="rk-planet"></div>' +
      '<div class="rk-track"><div class="rk-line"></div><div class="rk-moon">🌕</div><div class="rk-earth">🌍</div>' +
      '<div class="rk-rocket"><i class="rk-flame"></i><span>🚀</span></div></div>' +
      '<div class="rk-main"><div class="rk-card"><div class="rk-tag"></div><div class="rk-q"></div><div class="rk-vis"></div><div class="rk-ans"></div></div>' +
      '<div class="msg static rk-msg"></div></div>';
    const rocket = $('.rk-rocket', S), line = $('.rk-line', S), card = $('.rk-card', S);
    const tag = $('.rk-tag', S), qEl = $('.rk-q', S), vis = $('.rk-vis', S), ansEl = $('.rk-ans', S), msg = $('.rk-msg', S);
    for (let i = 1; i <= 9; i++) line.append(h('i', { style: { bottom: (i * 10) + '%' } }));
    const setLevel = v => rocket.style.setProperty('--lv', v);

    const ITEMS = [['🍎', 'elma'], ['🌸', 'çiçek'], ['🐞', 'uğur böceği'], ['⭐', 'yıldız'], ['🍓', 'çilek'], ['🐟', 'balık'], ['🍪', 'kurabiye'], ['🦋', 'kelebek']];

    function gen(type, n) {
      if (type === 'next') {
        const k = rand(0, 7), seq = [k * n, (k + 1) * n, (k + 2) * n];
        return { n, text: 'Sıradaki sayı hangisi?', speak: seq.join(', ') + '. Sıradaki sayı hangisi?', seq: seq.concat([null]), answer: (k + 3) * n, hint: seq[2] + ' + ' + n + ' = ?' };
      }
      if (type === 'missing') {
        const k = rand(0, 6), arr = [k, k + 1, k + 2, k + 3].map(i => i * n), mi = rand(1, 2), a = arr[mi];
        const before = arr[mi - 1]; arr[mi] = null;
        return { n, text: 'Eksik sayı hangisi?', seq: arr, answer: a, hint: before + ' + ' + n + ' = ?' };
      }
      if (type === 'back') {
        const k = rand(4, 10), seq = [k * n, (k - 1) * n, (k - 2) * n];
        return { n, text: 'Geriye sayıyoruz. Sıradaki sayı hangisi?', speak: 'Geriye sayıyoruz. ' + seq.join(', ') + '. Sıradaki?', seq: seq.concat([null]), answer: (k - 3) * n, hint: seq[2] + ' − ' + n + ' = ?' };
      }
      if (type === 'after') {
        const x = rand(1, 9) * n;
        return { n, text: TR.label(n) + ' sayarken ' + TR.ablText(x) + ' sonra hangi sayı gelir?', answer: x + n, hint: x + ' + ' + n + ' = ?' };
      }
      if (type === 'before') {
        const x = rand(2, 10) * n;
        return { n, text: TR.label(n) + ' sayarken ' + TR.ablText(x) + ' önce hangi sayı gelir?', answer: x - n, hint: x + ' − ' + n + ' = ?' };
      }
      if (type === 'which') {
        const a = rand(2, 10) * n;
        const pool = shuffle([a + 1, a - 1, a + 2, a - 2, a + 3, a - 3].filter(x => x > 0 && x % n !== 0));
        return { n, text: 'Hangisi ' + TR.label(n) + ' sayarken söylenir?', answer: a, choices: shuffle([a].concat(pool.slice(0, 3))), hint: '0, ' + n + ', ' + 2 * n + ', ' + 3 * n + '… diye say!' };
      }
      // groups: sepetlerde n'er tane nesne
      const k = rand(2, n <= 4 ? 5 : n <= 6 ? 4 : 3), it = pick(ITEMS);
      return {
        n, groups: k, item: it[0], answer: k * n,
        text: 'Her sepette ' + n + ' ' + it[1] + ' var. Toplam kaç ' + it[1] + ' var?',
        speak: 'Her sepette ' + TR.words(n) + ' ' + it[1] + ' var. ' + TR.speakLabel(n) + ' sayarak bul: toplam kaç ' + it[1] + ' var? Sepetlere dokunarak sayabilirsin.',
        hint: 'Sepetlere dokunarak ' + TR.label(n) + ' say!'
      };
    }
    function buildQs() {
      const out = []; let bag = [];
      for (let i = 0; i < 10; i++) {
        if (!bag.length) bag = shuffle(L.rocketTypes);
        out.push(gen(bag.pop(), ctx.mixed ? pick(ctx.ns) : ctx.n));
      }
      return out;
    }

    function renderGroups(q) {
      const wrap = h('div', { class: 'rk-groups' });
      let counted = 0;
      for (let g = 0; g < q.groups; g++) {
        const items = h('div', { class: 'rk-items', style: { '--cols': q.n <= 4 ? 2 : 3 } });
        for (let i = 0; i < q.n; i++) items.append(h('span', null, q.item));
        const cnt = h('div', { class: 'rk-cnt' }, '👆');
        const grp = h('div', { class: 'rk-grp' }, items, cnt);
        onTap(grp, () => {
          if (grp.classList.contains('counted') || ctx.paused) return;
          counted++; grp.classList.add('counted'); cnt.textContent = String(counted * q.n);
          Sound.sfx.step(counted); ctx.say(String(counted * q.n));
        });
        wrap.append(grp);
      }
      vis.append(wrap);
    }

    function ask(q, qi) {
      restartAnim(card, 'card-in');
      tag.textContent = 'Soru ' + (qi + 1) + ' / 10 · ' + TR.label(q.n);
      tag.style.background = NUM_COLORS[q.n];
      qEl.textContent = q.text;
      vis.innerHTML = ''; ansEl.innerHTML = '';
      msg.innerHTML = q.groups ? '👆 Sepetlere dokunarak say!' : '';
      let seqQ = null;
      if (q.seq) {
        const row = h('div', { class: 'rk-seq seq-bar', style: { '--c': NUM_COLORS[q.n] } },
          q.seq.map(v => h('span', { class: 'chip ' + (v == null ? 'cur' : 'filled') }, v == null ? '?' : String(v))));
        vis.append(row);
        seqQ = row.querySelector('.cur');
      }
      if (q.groups) renderGroups(q);
      ctx.say(q.speak || q.text);
      return new Promise(resolve => {
        let wrongHere = 0, locked = false;
        const choices = q.choices || numChoices(q.answer, q.n, 4, easy);
        const btns = choices.map(c => {
          const b = h('button', { class: 'rk-btn' }, String(c));
          onTap(b, () => {
            if (locked || b.classList.contains('wrong') || b.classList.contains('gone') || ctx.paused) return;
            if (c === q.answer) {
              locked = true; b.classList.add('right'); ctx.correct++; Sound.sfx.correct();
              const r = b.getBoundingClientRect(); FX.stars(r.left + r.width / 2, r.top + r.height / 2, 12);
              if (seqQ) { seqQ.textContent = String(c); seqQ.className = 'chip filled'; }
              const p = praise(); msg.innerHTML = p + ' ✨'; ctx.say(p + ' ' + c);
              ctx.later(resolve, 1100);
            } else {
              ctx.wrong++; wrongHere++;
              b.classList.add('wrong'); Sound.sfx.wrong();
              msg.innerHTML = pick(TRY_AGAIN); restartAnim(msg, 'msg-in');
              if (wrongHere >= 2) {
                const rest = btns.filter(x => !x.classList.contains('wrong') && !x.classList.contains('gone') && +x.textContent !== q.answer);
                if (rest.length > 1) rest[0].classList.add('gone');
                msg.innerHTML = '💡 İpucu: ' + q.hint;
                ctx.say('İpucu: ' + q.hint.replace(/= \?/, ''));
              }
            }
          });
          ansEl.append(b);
          return b;
        });
      });
    }

    (async () => {
      setLevel(0); ctx.progress(0, 10);
      await ctx.talk(msg, '🚀 Her doğru cevapta roket yükselir. Hadi aya gidelim!');
      const qs = buildQs();
      for (let i = 0; i < qs.length; i++) {
        await ask(qs[i], i);
        setLevel(i + 1); ctx.progress(i + 1, 10);
        rocket.classList.add('boost'); Sound.sfx.boost();
        ctx.later(() => rocket.classList.remove('boost'), 1000);
        await ctx.wait(i === 9 ? 1300 : 650);
      }
      rocket.classList.add('landed');
      $('.rk-moon', S).classList.add('flag');
      Sound.sfx.fanfare(); FX.confetti(140);
      await ctx.talk(msg, 'Yaşasın! Aya ulaştın! 🌕🚩');
      await ctx.wait(700);
      ctx.finish({ stars: starsFrom(ctx.wrong, 1, 3) });
    })();
  }
};
