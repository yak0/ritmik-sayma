'use strict';
/* =========================================================
   Görsel efektler: konfeti, patlama parçacıkları, yıldızlar
   ========================================================= */
const FX = (() => {
  let cv, cx, W = 0, H = 0, dpr = 1, parts = [], raf = 0, last = 0;
  const CONF = ['#ff4d6d', '#ffd23f', '#3ecf6e', '#3fa7ff', '#a66cff', '#ff9f1c', '#ff70cf', '#26c6da'];

  function init() {
    cv = $('#fx-canvas'); cx = cv.getContext('2d');
    resize(); window.addEventListener('resize', resize);
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function star(r) {
    cx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    cx.closePath(); cx.fill();
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    cx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      const dr = 1 - p.drag * dt;
      p.vx *= dr; p.vy = p.vy * dr + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = 1 - p.age / p.life;
      cx.globalAlpha = Math.min(1, k * 2.5);
      cx.fillStyle = p.color;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
      if (p.shape === 'rect') {
        const f = Math.abs(Math.cos(p.age * p.wob));
        cx.fillRect(-p.s / 2, -p.s * 0.3 * f, p.s, Math.max(1, p.s * 0.6 * f));
      } else if (p.shape === 'star') star(p.s * (0.5 + 0.5 * k));
      else { cx.beginPath(); cx.arc(0, 0, Math.max(0.5, p.s * k), 0, 6.283); cx.fill(); }
      cx.restore();
    }
    cx.globalAlpha = 1;
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; cx.clearRect(0, 0, W, H); }
  }

  function burst(x, y, color, count) {
    count = count || 22;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283, sp = 160 + Math.random() * 320;
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, g: 520, drag: 2.2,
        life: 0.55 + Math.random() * 0.4, age: 0, s: 3 + Math.random() * 6,
        color: Math.random() < 0.75 ? color : '#ffffff', shape: Math.random() < 0.35 ? 'rect' : 'circle',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, wob: 8 + Math.random() * 8
      });
    }
    start();
  }
  function stars(x, y, count) {
    count = count || 12;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.283, sp = 120 + Math.random() * 260;
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 380, drag: 1.6,
        life: 0.8 + Math.random() * 0.5, age: 0, s: 7 + Math.random() * 8,
        color: Math.random() < 0.7 ? '#ffd23f' : '#fff3a0', shape: 'star',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, wob: 0
      });
    }
    start();
  }
  function confetti(count) {
    count = count || 120;
    for (let i = 0; i < count; i++) {
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 120, vy: 80 + Math.random() * 180, g: 110, drag: 0.6,
        life: 3 + Math.random() * 1.8, age: 0, s: 8 + Math.random() * 8,
        color: pick(CONF), shape: Math.random() < 0.85 ? 'rect' : 'star',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, wob: 4 + Math.random() * 8
      });
    }
    start();
  }
  function floatText(x, y, text, cls) {
    const e = h('div', { class: 'float-text ' + (cls || ''), style: { left: x + 'px', top: y + 'px' } }, text);
    document.getElementById('app').append(e);
    setTimeout(() => e.remove(), 1200);
  }
  function clear() { parts = []; }

  return { init, burst, stars, confetti, floatText, clear };
})();
