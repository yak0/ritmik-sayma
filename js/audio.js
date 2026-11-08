'use strict';
/* =========================================================
   Ses motoru — tüm sesler ve müzikler Web Audio ile üretilir
   (dışarıdan ses dosyası gerekmez, telif sorunu yoktur)
   ========================================================= */

const Sound = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let ducked = false;
  const MUSIC_VOL = 0.3, DUCK_VOL = 0.09;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const safe = p => { if (p && p.catch) p.catch(() => {}); };

  function init() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 5;
        comp.attack.value = 0.003; comp.release.value = 0.25;
        master = ac.createGain(); master.gain.value = 0.85;
        master.connect(comp); comp.connect(ac.destination);
        sfxBus = ac.createGain(); sfxBus.connect(master);
        musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        // iOS ses kilidini aç
        const s = ac.createBufferSource();
        s.buffer = ac.createBuffer(1, 1, 22050); s.connect(ac.destination); s.start(0);
        apply();
      }
      if (ac.state !== 'running') safe(ac.resume());
    } catch (e) { console.warn('Ses başlatılamadı:', e); }
  }

  function apply() {
    if (!ac) return;
    const s = Store.s, t = ac.currentTime;
    sfxBus.gain.cancelScheduledValues(t);
    sfxBus.gain.setTargetAtTime(s.sfx ? 1 : 0, t, 0.02);
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(s.music ? (ducked ? DUCK_VOL : MUSIC_VOL) : 0, t, 0.08);
  }
  function duck(on) { if (ducked === on) return; ducked = on; apply(); }
  function suspend() { if (ac && ac.state === 'running') safe(ac.suspend()); }
  function resume() { if (ac && ac.state !== 'running') safe(ac.resume()); }

  /* --- temel ses üreticiler --- */
  function tone(o) {
    if (!ac) return;
    const at = o.at == null ? ac.currentTime : o.at;
    const dur = o.dur || 0.2, vol = o.vol == null ? 0.25 : o.vol, a = o.a || 0.005;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, at);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + (o.slide || dur));
    if (o.detune) osc.detune.value = o.detune;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), at + a);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(at); osc.stop(at + dur + 0.05);
  }
  function noise(o) {
    if (!ac) return;
    const at = o.at == null ? ac.currentTime : o.at;
    const dur = o.dur || 0.2, vol = o.vol == null ? 0.3 : o.vol, a = o.a || 0.002;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f || 1000, at);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, at + dur);
    fl.Q.value = o.q == null ? 1 : o.q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), at + a);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(fl); fl.connect(g); g.connect(o.bus || sfxBus);
    src.start(at, Math.random() * 0.5); src.stop(at + dur + 0.05);
  }

  /* --- enstrümanlar --- */
  const kick = (at, vol, bus) => tone({ f: 150, to: 42, slide: 0.12, type: 'sine', at, dur: 0.32, vol: vol == null ? 0.8 : vol, bus });
  const snare = (at, vol, bus) => {
    vol = vol == null ? 0.3 : vol;
    noise({ at, dur: 0.14, vol, type: 'highpass', f: 1600, bus });
    tone({ f: 230, to: 150, type: 'triangle', at, dur: 0.09, vol: vol * 0.5, bus });
  };
  const hat = (at, vol, bus) => noise({ at, dur: 0.035, vol: vol == null ? 0.1 : vol, type: 'highpass', f: 8000, q: 0.7, bus });
  const block = (at, vol) => {
    vol = vol == null ? 0.22 : vol;
    tone({ f: 1050, type: 'sine', at, dur: 0.07, vol });
    tone({ f: 2100, type: 'sine', at, dur: 0.03, vol: vol * 0.3 });
  };
  const cowbell = (at, vol) => {
    vol = vol == null ? 0.2 : vol;
    tone({ f: 800, type: 'square', at, dur: 0.14, vol: vol * 0.3 });
    tone({ f: 540, type: 'square', at, dur: 0.14, vol: vol * 0.3 });
  };
  const bell = (m, at, vol) => {
    vol = vol == null ? 0.15 : vol;
    const f = mtof(m);
    tone({ f, type: 'sine', at, dur: 0.9, vol });
    tone({ f: f * 2.76, type: 'sine', at, dur: 0.35, vol: vol * 0.25 });
  };
  const drum = at => {
    if (!ac) return;
    at = at == null ? ac.currentTime : at;
    tone({ f: 125, to: 48, slide: 0.16, type: 'sine', at, dur: 0.45, vol: 0.95 });
    tone({ f: 200, to: 90, slide: 0.1, type: 'triangle', at, dur: 0.2, vol: 0.35 });
    noise({ at, dur: 0.12, vol: 0.28, type: 'lowpass', f: 1400 });
  };

  /* --- efektler --- */
  const sfx = {
    click() { if (ac) tone({ f: 740, type: 'sine', dur: 0.07, vol: 0.12 }); },
    pop() {
      if (!ac) return; const at = ac.currentTime;
      noise({ at, dur: 0.16, vol: 0.75, type: 'bandpass', f: 2300, to: 500, q: 0.9 });
      tone({ f: 1100, to: 260, type: 'triangle', at, dur: 0.09, vol: 0.25 });
    },
    correct() {
      if (!ac) return; const at = ac.currentTime + 0.02;
      [72, 76, 79, 84].forEach((m, i) => {
        tone({ f: mtof(m), type: 'triangle', at: at + i * 0.065, dur: 0.3, vol: 0.18 });
        tone({ f: mtof(m + 12), type: 'sine', at: at + i * 0.065, dur: 0.2, vol: 0.05 });
      });
    },
    wrong() {
      if (!ac) return; const at = ac.currentTime;
      tone({ f: 330, to: 262, type: 'triangle', at, dur: 0.22, vol: 0.18 });
      tone({ f: 262, to: 196, type: 'triangle', at: at + 0.18, dur: 0.3, vol: 0.18 });
    },
    star() {
      if (!ac) return; const at = ac.currentTime;
      [84, 88, 91, 96, 100].forEach((m, i) => tone({ f: mtof(m), type: 'sine', at: at + i * 0.05, dur: 0.25, vol: 0.1 }));
    },
    whoosh() { if (ac) noise({ dur: 0.7, vol: 0.35, type: 'bandpass', f: 250, to: 2600, q: 1.2, a: 0.25 }); },
    boost() {
      if (!ac) return;
      noise({ dur: 0.9, vol: 0.4, type: 'bandpass', f: 200, to: 1800, q: 0.8, a: 0.15 });
      tone({ f: 80, to: 160, type: 'sawtooth', dur: 0.7, vol: 0.05 });
    },
    jump() { if (ac) tone({ f: 320, to: 900, slide: 0.16, type: 'sine', dur: 0.2, vol: 0.18 }); },
    splash() {
      if (!ac) return;
      noise({ dur: 0.35, vol: 0.28, type: 'lowpass', f: 2200, to: 300 });
      tone({ f: 600, to: 200, type: 'sine', dur: 0.15, vol: 0.08 });
    },
    step(i) { if (ac) tone({ f: mtof(72 + [0, 2, 4, 7, 9, 12, 14, 16, 19][i % 9]), type: 'sine', dur: 0.12, vol: 0.1 }); },
    chug() { if (ac) noise({ dur: 0.1, vol: 0.16, type: 'bandpass', f: 500, q: 0.8 }); },
    whistle() {
      if (!ac) return; const at = ac.currentTime;
      [[0, 0.42], [0.52, 0.7]].forEach(([d, l]) => {
        tone({ f: 587, type: 'sine', at: at + d, dur: l, vol: 0.12, a: 0.05 });
        tone({ f: 740, type: 'sine', at: at + d, dur: l, vol: 0.1, a: 0.05 });
        tone({ f: 880, type: 'triangle', at: at + d, dur: l, vol: 0.05, a: 0.05 });
      });
      noise({ at, dur: 1.2, vol: 0.05, type: 'highpass', f: 3000 });
    },
    fanfare() {
      if (!ac) return; const at = ac.currentTime + 0.05;
      [[67, 0, 0.15], [72, 0.15, 0.15], [76, 0.3, 0.15], [79, 0.45, 0.3], [76, 0.75, 0.15], [79, 0.9, 0.6]].forEach(([m, d, l]) => {
        tone({ f: mtof(m), type: 'square', at: at + d, dur: l + 0.1, vol: 0.05 });
        tone({ f: mtof(m), type: 'triangle', at: at + d, dur: l + 0.15, vol: 0.14 });
      });
      [60, 64, 67, 72].forEach(m => tone({ f: mtof(m), type: 'triangle', at: at + 0.9, dur: 1, vol: 0.06 }));
    },
    tick() { if (ac) tone({ f: 1500, dur: 0.03, vol: 0.06 }); }
  };

  return {
    init, apply, duck, suspend, resume, tone, noise, mtof,
    kick, snare, hat, block, cowbell, bell, drum, sfx,
    ctx: () => ac,
    musicBus: () => musicBus
  };
})();

/* =========================================================
   Müzik: küçük bir sıralayıcı (sequencer) ile döngüsel parçalar
   ========================================================= */
const Music = (() => {
  // akor kökleri: C3=48, A2=45, F2=41, G2=43
  const TRACKS = {
    menu: {
      bpm: 100,
      chords: [[48, 'M'], [45, 'm'], [41, 'M'], [43, 'M']],
      bass: 'R.......R...F...', pad: true, dvol: 0.45,
      drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
      melody: [
        [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 81, 2], [10, 79, 2], [12, 76, 4]],
        [[0, 72, 2], [2, 76, 2], [4, 81, 4], [8, 79, 2], [10, 76, 2], [12, 74, 4]],
        [[0, 72, 2], [2, 74, 2], [4, 77, 4], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
        [[0, 74, 2], [2, 79, 2], [4, 76, 2], [6, 74, 2], [8, 79, 6]]
      ],
      altArp: '0.1.2.1.0.1.2.3.'
    },
    play: {
      bpm: 116,
      chords: [[48, 'M'], [43, 'M'], [45, 'm'], [41, 'M']],
      bass: 'R...O.R.R...O.R.', pad: true, dvol: 0.55,
      drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      melody: [
        [[0, 79, 2], [2, 76, 2], [4, 79, 2], [6, 84, 2], [8, 81, 3], [12, 79, 4]],
        [[0, 74, 2], [2, 79, 2], [4, 83, 3], [8, 81, 2], [10, 79, 2], [12, 74, 4]],
        [[0, 76, 2], [2, 81, 2], [4, 84, 3], [8, 83, 2], [10, 81, 2], [12, 76, 4]],
        [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 74, 3], [12, 79, 3]]
      ],
      altArp: '0.2.1.2.3.2.1.2.'
    },
    space: {
      bpm: 104,
      chords: [[45, 'm'], [41, 'M'], [48, 'M'], [43, 'M']],
      bass: 'R.......R.......', pad: true, dvol: 0.4,
      drums: { k: 'x.......x.......', h: '..x...x...x...x.' },
      arp: '0123012301230123'
    },
    learn: {
      bpm: 84,
      chords: [[48, 'M'], [41, 'M'], [43, 'M'], [48, 'M']],
      bass: 'R.......R.......', pad: true, dvol: 0.3,
      drums: { h: '....x.......x...' },
      arp: '0.2.1.2.0.2.1.2.'
    }
  };

  let tr = null, name = null, step = 0, nextT = 0, timer = null;

  function play(n) {
    if (name === n && timer) return;
    stop();
    const t = TRACKS[n], ac = Sound.ctx();
    if (!t || !ac) return;
    tr = t; name = n; step = 0; nextT = ac.currentTime + 0.08;
    timer = setInterval(tick, 30);
    tick();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; name = null; tr = null; }
  function current() { return name; }

  function tick() {
    const ac = Sound.ctx();
    if (!ac || !tr) return;
    if (ac.state !== 'running') return;
    const sd = 60 / tr.bpm / 4;
    if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.02; // geride kaldıysa
    while (nextT < ac.currentTime + 0.15) {
      if (Store.s.music) sched(step, nextT, sd);
      nextT += sd; step++;
    }
  }

  function sched(st, at, sd) {
    const bars = tr.chords.length, s = st % 16, barIdx = Math.floor(st / 16);
    const bar = barIdx % bars, loop = Math.floor(barIdx / bars);
    const root = tr.chords[bar][0], tones = tr.chords[bar][1] === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12];
    const B = Sound.musicBus(), dv = tr.dvol || 0.5, D = tr.drums || {}, mtof = Sound.mtof;

    if (D.k && D.k[s] === 'x') Sound.kick(at, 0.55 * dv, B);
    if (D.s && D.s[s] === 'x') Sound.snare(at, 0.3 * dv, B);
    if (D.h && D.h[s] === 'x') Sound.hat(at, 0.09 * dv, B);

    if (tr.bass) {
      const c = tr.bass[s];
      if (c !== '.') {
        const off = c === 'F' ? 7 : c === 'O' ? 12 : 0;
        Sound.tone({ f: mtof(root + off), type: 'triangle', at, dur: sd * 3, vol: 0.22, bus: B });
      }
    }
    if (tr.pad && s === 0) {
      tones.slice(0, 3).forEach(t => Sound.tone({ f: mtof(root + 12 + t), type: 'triangle', at, dur: sd * 16, vol: 0.035, a: 0.08, bus: B }));
    }
    const useMel = tr.melody && (!tr.altArp || loop % 2 === 0);
    if (useMel) {
      tr.melody[bar].forEach(([ms, m, len]) => {
        if (ms !== s) return;
        Sound.tone({ f: mtof(m), type: 'triangle', at, dur: sd * len * 0.95, vol: 0.1, a: 0.01, bus: B });
        Sound.tone({ f: mtof(m + 12), type: 'sine', at, dur: sd * len * 0.6, vol: 0.022, bus: B });
      });
    }
    const arp = (tr.melody && !useMel) ? tr.altArp : tr.arp;
    if (arp) {
      const c = arp[s];
      if (c !== '.') Sound.tone({ f: mtof(root + 24 + tones[+c]), type: 'sine', at, dur: sd * 2, vol: 0.05, bus: B });
    }
  }

  return { play, stop, current };
})();
