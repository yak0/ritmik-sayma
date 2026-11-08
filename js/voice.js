'use strict';
/* =========================================================
   Sesli okuma — tabletin kendi Türkçe sesini kullanır
   (iPad: "Yelda", Android: Google Türkçe)
   ========================================================= */
const Voice = (() => {
  const synth = window.speechSynthesis;
  let voice = null, seq = 0;

  function load() {
    if (!synth) return;
    const tr = synth.getVoices().filter(v => /^tr([-_]|$)/i.test(v.lang));
    voice = tr.find(v => /yelda|premium|enhanced|geliştirilmiş/i.test(v.name)) ||
            tr.find(v => /google/i.test(v.name)) || tr[0] || null;
  }
  if (synth) {
    load();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', load);
    else synth.onvoiceschanged = load;
  }

  /* Ekrandaki metni okunacak hale getir: emojileri at, "3'er" → "üçer", "9'dan" → "dokuzdan" */
  let emojiRe = null;
  try { emojiRe = new RegExp('\\p{Extended_Pictographic}|\\uFE0F|\\u200D', 'gu'); } catch (e) { emojiRe = /[←-⯿️‍]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]/g; }
  function normalize(t) {
    return t.replace(/<[^>]+>/g, ' ')
      .replace(emojiRe, '')
      .replace(/(\d+)'(şer|şar|er|ar)\b/g, (m, d) => TR.dist[+d] || m)
      .replace(/(\d+)'(dan|den|tan|ten)\b/g, (m, d) => TR.ablSpeak(+d))
      .replace(/(\d+)'(ya|ye|a|e)\b/g, (m, d) => TR.datSpeak(+d))
      .replace(/\s*=\s*\?/g, ' kaç eder?')
      .replace(/\s−\s/g, ' eksi ')
      .replace(/\s\+\s/g, ' artı ')
      .replace(/\s+/g, ' ').trim();
  }

  function say(text, o) {
    o = o || {};
    text = normalize(String(text == null ? '' : text));
    if (!synth || !Store.s.voice || !text) return Promise.resolve();
    if (o.interrupt !== false) synth.cancel();
    const id = ++seq;
    return new Promise(res => {
      let done = false, to = 0;
      const fin = () => {
        if (done) return; done = true; clearTimeout(to);
        if (id === seq) Sound.duck(false);
        res();
      };
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'tr-TR';
        if (voice) u.voice = voice;
        u.rate = o.rate || 0.95;
        u.pitch = o.pitch || 1.1;
        u.volume = 1;
        u.onend = fin; u.onerror = fin;
        to = setTimeout(fin, 1800 + text.length * 110);
        Sound.duck(true);
        if (synth.paused) synth.resume();
        synth.speak(u);
      } catch (e) { fin(); }
    });
  }
  function cancel() { if (synth) { seq++; synth.cancel(); Sound.duck(false); } }
  function warm() { if (synth) { load(); try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'tr-TR'; synth.speak(u); } catch (e) {} } }
  function info() { load(); return { supported: !!synth, turkish: !!voice, name: voice ? voice.name : '' }; }

  return { say, cancel, warm, info, normalize };
})();
