import { createNoise3D } from './lib/simplex-noise.js';

/* ─────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function typeWriter(el, text, speed = 62) {
  const node = document.createTextNode('');
  el.appendChild(node);
  for (const char of text) {
    node.textContent += char;
    await sleep(speed + (Math.random() * 20 - 10));
  }
}

/* ─────────────────────────────────────────────────────
   Existential Sun — Flow Field Particle System
───────────────────────────────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  const noise3D = createNoise3D();

  // Config
  const PARTICLE_COUNT = 600;
  const TOTAL = PARTICLE_COUNT;
  const NOISE_SCALE = 0.0025;
  const NOISE_SPEED = 0.00035;
  const FORCE = 0.4;
  const FRICTION = 0.965;
  const MAX_SPEED = 3;

  let dpr, w, h;
  let zOffset = 0;
  let animId;
  let mouseX = -9999, mouseY = -9999;
  let sunX, sunY;

  // Offscreen buffer for trails (avoids bg tint accumulation on main canvas)
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');

  // Particle arrays
  const px = new Float32Array(TOTAL);
  const py = new Float32Array(TOTAL);
  const vx = new Float32Array(TOTAL);
  const vy = new Float32Array(TOTAL);
  const pLife = new Float32Array(TOTAL);
  const pMaxLife = new Float32Array(TOTAL);
  const pSize = new Float32Array(TOTAL);
  const pHue = new Float32Array(TOTAL);
  const pSat = new Float32Array(TOTAL);
  const pLight = new Float32Array(TOTAL);

  function isDark() {
    return (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light';
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Size offscreen buffer to match
    offscreen.width = w * dpr;
    offscreen.height = h * dpr;
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Sun center: right side, vertically centered
    sunX = w * 0.72;
    sunY = h * 0.45;
    ctx.clearRect(0, 0, w, h);
    offCtx.clearRect(0, 0, w, h);
  }

  function spawnParticle(i) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 60;
    px[i] = sunX + Math.cos(angle) * dist;
    py[i] = sunY + Math.sin(angle) * dist;
    const speed = 0.3 + Math.random() * 1.2;
    vx[i] = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5;
    vy[i] = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.5;
    pMaxLife[i] = 150 + Math.random() * 350;
    pLife[i] = 0;
    pSize[i] = 0.3 + Math.random() * 2.2;

    const dark = isDark();
    const colorRoll = Math.random();

    if (dark) {
      // Dark mode: white-hot → gold → orange → ember red
      if (colorRoll < 0.15) {
        pHue[i] = 38 + Math.random() * 10;
        pSat[i] = 20 + Math.random() * 30;
        pLight[i] = 85 + Math.random() * 15;
      } else if (colorRoll < 0.4) {
        pHue[i] = 35 + Math.random() * 15;
        pSat[i] = 80 + Math.random() * 20;
        pLight[i] = 55 + Math.random() * 20;
      } else if (colorRoll < 0.7) {
        pHue[i] = 18 + Math.random() * 18;
        pSat[i] = 85 + Math.random() * 15;
        pLight[i] = 45 + Math.random() * 20;
      } else {
        pHue[i] = 2 + Math.random() * 18;
        pSat[i] = 80 + Math.random() * 20;
        pLight[i] = 35 + Math.random() * 20;
      }
    } else {
      // Light mode: deep burnt sienna → terra cotta → dark amber → chocolate
      // Low lightness + high saturation = vivid strokes on cream background
      if (colorRoll < 0.15) {
        pHue[i] = 25 + Math.random() * 15;
        pSat[i] = 70 + Math.random() * 30;
        pLight[i] = 40 + Math.random() * 15;
      } else if (colorRoll < 0.4) {
        pHue[i] = 18 + Math.random() * 14;
        pSat[i] = 75 + Math.random() * 25;
        pLight[i] = 32 + Math.random() * 14;
      } else if (colorRoll < 0.7) {
        pHue[i] = 10 + Math.random() * 16;
        pSat[i] = 80 + Math.random() * 20;
        pLight[i] = 28 + Math.random() * 15;
      } else {
        pHue[i] = 4 + Math.random() * 14;
        pSat[i] = 65 + Math.random() * 25;
        pLight[i] = 22 + Math.random() * 14;
      }
    }
  }

  function init() {
    resize();
    for (let i = 0; i < TOTAL; i++) {
      spawnParticle(i);
      pLife[i] = Math.random() * pMaxLife[i];
    }
  }

  function drawSunCore() {
    const dark = isDark();
    const time = zOffset * 800;

    const pulseA = 0.85 + Math.sin(time * 0.7) * 0.15;
    const pulseB = 0.9 + Math.sin(time * 1.3 + 1) * 0.1;

    const glowR = 400;
    const gx = sunX - glowR;
    const gy = sunY - glowR;
    const gd = glowR * 2;

    if (dark) {
      // ── Dark mode glow (unchanged) ──
      const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
      const hB = 0.05 * pulseA;
      halo.addColorStop(0,    `rgba(212, 146, 74, ${hB})`);
      halo.addColorStop(0.08, `rgba(210, 135, 65, ${hB * 0.9})`);
      halo.addColorStop(0.15, `rgba(205, 120, 55, ${hB * 0.75})`);
      halo.addColorStop(0.25, `rgba(200, 105, 45, ${hB * 0.55})`);
      halo.addColorStop(0.4,  `rgba(195, 90, 35, ${hB * 0.35})`);
      halo.addColorStop(0.55, `rgba(190, 75, 28, ${hB * 0.2})`);
      halo.addColorStop(0.7,  `rgba(185, 65, 22, ${hB * 0.1})`);
      halo.addColorStop(0.85, `rgba(180, 60, 20, ${hB * 0.04})`);
      halo.addColorStop(1,    'rgba(180, 60, 20, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(gx, gy, gd, gd);

      const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 140);
      const cB = 0.1 * pulseB;
      corona.addColorStop(0,    `rgba(255, 225, 170, ${cB})`);
      corona.addColorStop(0.1,  `rgba(245, 200, 130, ${cB * 0.85})`);
      corona.addColorStop(0.2,  `rgba(235, 175, 100, ${cB * 0.65})`);
      corona.addColorStop(0.35, `rgba(220, 145, 70, ${cB * 0.45})`);
      corona.addColorStop(0.5,  `rgba(212, 125, 55, ${cB * 0.28})`);
      corona.addColorStop(0.7,  `rgba(205, 110, 45, ${cB * 0.12})`);
      corona.addColorStop(0.85, `rgba(200, 100, 40, ${cB * 0.04})`);
      corona.addColorStop(1,    'rgba(200, 100, 40, 0)');
      ctx.fillStyle = corona;
      ctx.fillRect(sunX - 140, sunY - 140, 280, 280);

      const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
      const kB = 0.18 * pulseB;
      core.addColorStop(0,    `rgba(255, 245, 210, ${kB})`);
      core.addColorStop(0.15, `rgba(255, 230, 180, ${kB * 0.8})`);
      core.addColorStop(0.3,  `rgba(255, 210, 140, ${kB * 0.55})`);
      core.addColorStop(0.5,  `rgba(245, 190, 110, ${kB * 0.3})`);
      core.addColorStop(0.7,  `rgba(235, 170, 85, ${kB * 0.12})`);
      core.addColorStop(0.85, `rgba(230, 160, 80, ${kB * 0.04})`);
      core.addColorStop(1,    'rgba(230, 160, 80, 0)');
      ctx.fillStyle = core;
      ctx.fillRect(sunX - 40, sunY - 40, 80, 80);

    } else {
      // ── Light mode glow — darker, earthier tones at moderate opacity ──
      const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
      const hB = 0.035 * pulseA;
      halo.addColorStop(0,    `rgba(160, 80, 30, ${hB})`);
      halo.addColorStop(0.08, `rgba(155, 72, 28, ${hB * 0.9})`);
      halo.addColorStop(0.15, `rgba(148, 65, 25, ${hB * 0.75})`);
      halo.addColorStop(0.25, `rgba(140, 58, 22, ${hB * 0.55})`);
      halo.addColorStop(0.4,  `rgba(132, 50, 18, ${hB * 0.35})`);
      halo.addColorStop(0.55, `rgba(125, 44, 15, ${hB * 0.2})`);
      halo.addColorStop(0.7,  `rgba(118, 38, 12, ${hB * 0.1})`);
      halo.addColorStop(0.85, `rgba(110, 32, 10, ${hB * 0.04})`);
      halo.addColorStop(1,    'rgba(110, 32, 10, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(gx, gy, gd, gd);

      const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 140);
      const cB = 0.06 * pulseB;
      corona.addColorStop(0,    `rgba(190, 110, 50, ${cB})`);
      corona.addColorStop(0.1,  `rgba(178, 95, 40, ${cB * 0.85})`);
      corona.addColorStop(0.2,  `rgba(165, 82, 32, ${cB * 0.65})`);
      corona.addColorStop(0.35, `rgba(150, 70, 25, ${cB * 0.45})`);
      corona.addColorStop(0.5,  `rgba(140, 60, 20, ${cB * 0.28})`);
      corona.addColorStop(0.7,  `rgba(130, 52, 16, ${cB * 0.12})`);
      corona.addColorStop(0.85, `rgba(120, 45, 12, ${cB * 0.04})`);
      corona.addColorStop(1,    'rgba(120, 45, 12, 0)');
      ctx.fillStyle = corona;
      ctx.fillRect(sunX - 140, sunY - 140, 280, 280);

      const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
      const kB = 0.1 * pulseB;
      core.addColorStop(0,    `rgba(210, 150, 80, ${kB})`);
      core.addColorStop(0.15, `rgba(195, 130, 60, ${kB * 0.8})`);
      core.addColorStop(0.3,  `rgba(180, 110, 45, ${kB * 0.55})`);
      core.addColorStop(0.5,  `rgba(165, 92, 35, ${kB * 0.3})`);
      core.addColorStop(0.7,  `rgba(150, 78, 28, ${kB * 0.12})`);
      core.addColorStop(0.85, `rgba(140, 68, 22, ${kB * 0.04})`);
      core.addColorStop(1,    'rgba(140, 68, 22, 0)');
      ctx.fillStyle = core;
      ctx.fillRect(sunX - 40, sunY - 40, 80, 80);
    }
  }

  function frame() {
    const dark = isDark();
    const bgR = dark ? 10 : 244;
    const bgG = dark ? 10 : 239;
    const bgB = dark ? 10 : 230;

    // ── Offscreen buffer: full clear each frame — no trails ──
    offCtx.clearRect(0, 0, w, h);

    zOffset += NOISE_SPEED;

    for (let i = 0; i < TOTAL; i++) {
      pLife[i]++;

      // Lifecycle alpha
      const lifeRatio = pLife[i] / pMaxLife[i];
      let alpha;
      if (lifeRatio < 0.08) {
        alpha = lifeRatio / 0.08;
      } else if (lifeRatio > 0.75) {
        alpha = (1 - lifeRatio) / 0.25;
      } else {
        alpha = 1;
      }

      // Respawn
      if (pLife[i] > pMaxLife[i] || px[i] < -80 || px[i] > w + 80 || py[i] < -80 || py[i] > h + 80) {
        spawnParticle(i);
        continue;
      }

      // Distance from sun center
      const dxSun = px[i] - sunX;
      const dySun = py[i] - sunY;
      const distSun = Math.sqrt(dxSun * dxSun + dySun * dySun) + 0.01;

      // Flow field angle — blend noise with radial outward force
      const noiseAngle = noise3D(px[i] * NOISE_SCALE, py[i] * NOISE_SCALE, zOffset) * Math.PI * 2;
      const radialAngle = Math.atan2(dySun, dxSun);

      const radialBlend = Math.max(0, 1 - distSun / 250);
      const angle = noiseAngle * (1 - radialBlend * 0.6) + radialAngle * radialBlend * 0.6;

      const outwardForce = FORCE * (0.3 + radialBlend * 0.7);
      vx[i] += Math.cos(angle) * outwardForce;
      vy[i] += Math.sin(angle) * outwardForce;

      if (distSun < 150) {
        const swirlStrength = (1 - distSun / 150) * 0.15;
        vx[i] += -dySun / distSun * swirlStrength;
        vy[i] += dxSun / distSun * swirlStrength;
      }

      // Mouse interaction
      const dxM = px[i] - mouseX;
      const dyM = py[i] - mouseY;
      const distM = Math.sqrt(dxM * dxM + dyM * dyM);
      if (distM < 120) {
        const attract = (120 - distM) / 120 * 0.8;
        vx[i] -= (dxM / distM) * attract;
        vy[i] -= (dyM / distM) * attract;
      }

      vx[i] *= FRICTION;
      vy[i] *= FRICTION;

      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      if (speed > MAX_SPEED) {
        vx[i] = (vx[i] / speed) * MAX_SPEED;
        vy[i] = (vy[i] / speed) * MAX_SPEED;
      }

      px[i] += vx[i];
      py[i] += vy[i];

      // Edge fade — particles fade as they approach canvas boundaries
      const edgeFadeX = Math.min(1, px[i] / 80, (w - px[i]) / 80);
      const edgeFadeTop = Math.min(1, py[i] / 60);
      const edgeFadeBot = Math.min(1, (h - py[i]) / 120);
      const edgeFade = Math.max(0, Math.min(edgeFadeX, edgeFadeTop, edgeFadeBot));

      // Draw particle
      const intensityBoost = distSun < 80 ? (1 - distSun / 80) * 0.4 : 0;
      const drawAlpha = alpha * edgeFade * (0.15 + (speed / MAX_SPEED) * 0.55 + intensityBoost);
      const drawLight = Math.min(100, pLight[i] + intensityBoost * 40);

      offCtx.beginPath();
      offCtx.arc(px[i], py[i], pSize[i], 0, Math.PI * 2);
      offCtx.fillStyle = `hsla(${pHue[i]}, ${pSat[i]}%, ${drawLight}%, ${drawAlpha})`;
      offCtx.fill();

      // Glow for brighter/larger particles
      if (pSize[i] > 1 && speed > 0.6) {
        const glowRadius = pSize[i] * 4;
        const glowAlpha = drawAlpha * 0.06;
        offCtx.beginPath();
        offCtx.arc(px[i], py[i], glowRadius, 0, Math.PI * 2);
        offCtx.fillStyle = `hsla(${pHue[i]}, ${pSat[i]}%, ${drawLight}%, ${glowAlpha})`;
        offCtx.fill();
      }
    }

    // ── Composite to main canvas (fully cleared each frame) ──
    ctx.clearRect(0, 0, w, h);

    // Sun glow drawn fresh (no accumulation)
    drawSunCore();

    // Copy trails + particles from offscreen buffer
    ctx.drawImage(offscreen, 0, 0, offscreen.width, offscreen.height, 0, 0, w, h);

    // Edge blends to transparent (CSS bg shows through perfectly)
    const edgeH = 120;
    const edgeGrad = ctx.createLinearGradient(0, h - edgeH, 0, h);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, h - edgeH, w, edgeH);

    const leftGrad = ctx.createLinearGradient(0, 0, 80, 0);
    leftGrad.addColorStop(0, 'rgba(0,0,0,1)');
    leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 80, h);

    const topGrad = ctx.createLinearGradient(0, 0, 0, 60);
    topGrad.addColorStop(0, 'rgba(0,0,0,1)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, 60);

    const rightGrad = ctx.createLinearGradient(w - 60, 0, w, 0);
    rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rightGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(w - 60, 0, 60, h);
    ctx.restore();

    animId = requestAnimationFrame(frame);
  }

  // Mouse tracking on hero section
  const hero = canvas.parentElement;
  hero.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  hero.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(frame);
    }
  });

  const ro = new ResizeObserver(() => {
    resize();
    for (let i = 0; i < TOTAL; i++) spawnParticle(i);
  });
  ro.observe(canvas);

  init();
  animId = requestAnimationFrame(frame);
}

/* ─────────────────────────────────────────────────────
   Hero sequence
───────────────────────────────────────────────────── */
async function runHeroSequence() {
  const promptCursor = document.getElementById('prompt-cursor');
  const nameEl       = document.getElementById('hero-name');
  const subEl        = document.getElementById('hero-sub');
  const scrollEl     = document.getElementById('hero-scroll');
  const particlesEl  = document.getElementById('hero-particles');

  await sleep(1400);

  promptCursor.style.visibility = 'hidden';
  nameEl.classList.add('is-typing');

  await sleep(120);
  await typeWriter(nameEl, 'Antonio', 62);
  nameEl.appendChild(document.createElement('br'));
  await typeWriter(nameEl, 'Baltic', 62);

  nameEl.classList.remove('is-typing');
  nameEl.classList.add('is-done');

  // Fade in the sun
  await sleep(280);
  subEl.classList.add('visible');
  if (particlesEl) particlesEl.classList.add('visible');

  await sleep(520);
  scrollEl.classList.add('visible');
}

/* ─────────────────────────────────────────────────────
   Scroll reveal
───────────────────────────────────────────────────── */
function initScrollReveal() {
  const targets = document.querySelectorAll('.fade-up');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────────────
   Theme toggle
───────────────────────────────────────────────────── */
function initTheme() {
  const btn       = document.getElementById('theme-btn');
  const icon      = document.getElementById('theme-icon');
  const label     = document.getElementById('theme-label');
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  const stored = localStorage.getItem('theme');
  let theme = stored || 'light';

  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'light') {
      icon.textContent  = '◐';
      label.textContent = 'dark_mode';
      btn.setAttribute('aria-label', 'Switch to dark mode');
      if (metaTheme) metaTheme.setAttribute('content', '#f4efe6');
    } else {
      icon.textContent  = '◑';
      label.textContent = 'light_mode';
      btn.setAttribute('aria-label', 'Switch to light mode');
      if (metaTheme) metaTheme.setAttribute('content', '#0a0a0a');
    }
    localStorage.setItem('theme', t);
    theme = t;
  }

  apply(theme);
  btn.addEventListener('click', () => apply(theme === 'dark' ? 'light' : 'dark'));
}

/* ─────────────────────────────────────────────────────
   Project filter
───────────────────────────────────────────────────── */
function initFilter() {
  const btns  = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('#project-grid .card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const filter = btn.dataset.filter;
      cards.forEach(card => {
        const tags = card.dataset.tags || '';
        const match = filter === 'all' || tags.split(' ').includes(filter);
        card.classList.toggle('hidden', !match);
      });
    });
  });
}

/* ─────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initParticles();
  runHeroSequence();
  initScrollReveal();
  initFilter();
});
