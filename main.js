import { createNoise3D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';

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

  // Particle arrays
  const px = new Float32Array(PARTICLE_COUNT);
  const py = new Float32Array(PARTICLE_COUNT);
  const vx = new Float32Array(PARTICLE_COUNT);
  const vy = new Float32Array(PARTICLE_COUNT);
  const pLife = new Float32Array(PARTICLE_COUNT);
  const pMaxLife = new Float32Array(PARTICLE_COUNT);
  const pSize = new Float32Array(PARTICLE_COUNT);
  const pHue = new Float32Array(PARTICLE_COUNT);
  const pSat = new Float32Array(PARTICLE_COUNT);
  const pLight = new Float32Array(PARTICLE_COUNT);

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
    // Sun center: right side, vertically centered
    sunX = w * 0.72;
    sunY = h * 0.45;
    ctx.clearRect(0, 0, w, h);
  }

  function spawnParticle(i) {
    // Spawn particles radiating outward from the sun center
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 60; // near the core
    px[i] = sunX + Math.cos(angle) * dist;
    py[i] = sunY + Math.sin(angle) * dist;

    // Initial velocity: radiate outward with some randomness
    const speed = 0.3 + Math.random() * 1.2;
    vx[i] = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5;
    vy[i] = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.5;

    pMaxLife[i] = 150 + Math.random() * 350;
    pLife[i] = 0;
    pSize[i] = 0.3 + Math.random() * 2.2;

    // Color range: deep red → orange → golden → white-hot
    const colorRoll = Math.random();
    if (colorRoll < 0.15) {
      // White-hot core
      pHue[i] = 38 + Math.random() * 10;
      pSat[i] = 20 + Math.random() * 30;
      pLight[i] = 85 + Math.random() * 15;
    } else if (colorRoll < 0.4) {
      // Bright gold
      pHue[i] = 35 + Math.random() * 15;
      pSat[i] = 80 + Math.random() * 20;
      pLight[i] = 55 + Math.random() * 20;
    } else if (colorRoll < 0.7) {
      // Deep orange
      pHue[i] = 18 + Math.random() * 18;
      pSat[i] = 85 + Math.random() * 15;
      pLight[i] = 45 + Math.random() * 20;
    } else {
      // Ember red
      pHue[i] = 2 + Math.random() * 18;
      pSat[i] = 80 + Math.random() * 20;
      pLight[i] = 35 + Math.random() * 20;
    }
  }

  function init() {
    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      spawnParticle(i);
      pLife[i] = Math.random() * pMaxLife[i];
    }
  }

  function drawSunCore() {
    const dark = isDark();
    const time = zOffset * 800;

    // Pulsating core glow — multiple layered radial gradients
    const pulseA = 0.85 + Math.sin(time * 0.7) * 0.15;
    const pulseB = 0.9 + Math.sin(time * 1.3 + 1) * 0.1;

    // Outer halo — huge, soft
    const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 350);
    if (dark) {
      halo.addColorStop(0, `rgba(212, 146, 74, ${0.06 * pulseA})`);
      halo.addColorStop(0.3, `rgba(200, 100, 40, ${0.03 * pulseA})`);
      halo.addColorStop(0.6, `rgba(180, 60, 20, ${0.015 * pulseB})`);
      halo.addColorStop(1, 'rgba(180, 60, 20, 0)');
    } else {
      halo.addColorStop(0, `rgba(181, 100, 42, ${0.05 * pulseA})`);
      halo.addColorStop(0.3, `rgba(160, 80, 30, ${0.025 * pulseA})`);
      halo.addColorStop(0.6, `rgba(140, 60, 20, ${0.01 * pulseB})`);
      halo.addColorStop(1, 'rgba(140, 60, 20, 0)');
    }
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // Inner corona
    const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120);
    if (dark) {
      corona.addColorStop(0, `rgba(255, 220, 160, ${0.12 * pulseB})`);
      corona.addColorStop(0.2, `rgba(230, 160, 80, ${0.08 * pulseA})`);
      corona.addColorStop(0.5, `rgba(212, 120, 50, ${0.04 * pulseA})`);
      corona.addColorStop(1, 'rgba(200, 100, 40, 0)');
    } else {
      corona.addColorStop(0, `rgba(220, 180, 120, ${0.1 * pulseB})`);
      corona.addColorStop(0.2, `rgba(200, 130, 60, ${0.06 * pulseA})`);
      corona.addColorStop(0.5, `rgba(181, 100, 42, ${0.03 * pulseA})`);
      corona.addColorStop(1, 'rgba(181, 100, 42, 0)');
    }
    ctx.fillStyle = corona;
    ctx.fillRect(0, 0, w, h);

    // Bright core — small, intense
    const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 35);
    if (dark) {
      core.addColorStop(0, `rgba(255, 240, 200, ${0.2 * pulseB})`);
      core.addColorStop(0.4, `rgba(255, 200, 130, ${0.12 * pulseA})`);
      core.addColorStop(1, 'rgba(230, 160, 80, 0)');
    } else {
      core.addColorStop(0, `rgba(240, 210, 160, ${0.15 * pulseB})`);
      core.addColorStop(0.4, `rgba(220, 170, 100, ${0.08 * pulseA})`);
      core.addColorStop(1, 'rgba(200, 140, 70, 0)');
    }
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
  }

  function frame() {
    const dark = isDark();
    const bgR = dark ? 10 : 244;
    const bgG = dark ? 10 : 239;
    const bgB = dark ? 10 : 230;

    // Trail fade — creates flowing streaks
    ctx.fillStyle = `rgba(${bgR}, ${bgG}, ${bgB}, 0.06)`;
    ctx.fillRect(0, 0, w, h);

    // Draw pulsating sun core underneath particles
    drawSunCore();

    zOffset += NOISE_SPEED;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
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

      // Close to core: more radial push. Far away: more noise-driven flow
      const radialBlend = Math.max(0, 1 - distSun / 250);
      const angle = noiseAngle * (1 - radialBlend * 0.6) + radialAngle * radialBlend * 0.6;

      // Outward force weakens with distance
      const outwardForce = FORCE * (0.3 + radialBlend * 0.7);
      vx[i] += Math.cos(angle) * outwardForce;
      vy[i] += Math.sin(angle) * outwardForce;

      // Slight tangential swirl near the core
      if (distSun < 150) {
        const swirlStrength = (1 - distSun / 150) * 0.15;
        vx[i] += -dySun / distSun * swirlStrength;
        vy[i] += dxSun / distSun * swirlStrength;
      }

      // Mouse interaction — attract gently
      const dxM = px[i] - mouseX;
      const dyM = py[i] - mouseY;
      const distM = Math.sqrt(dxM * dxM + dyM * dyM);
      if (distM < 120) {
        const attract = (120 - distM) / 120 * 0.8;
        vx[i] -= (dxM / distM) * attract;
        vy[i] -= (dyM / distM) * attract;
      }

      // Friction + speed clamp
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      if (speed > MAX_SPEED) {
        vx[i] = (vx[i] / speed) * MAX_SPEED;
        vy[i] = (vy[i] / speed) * MAX_SPEED;
      }

      px[i] += vx[i];
      py[i] += vy[i];

      // Draw particle
      const intensityBoost = distSun < 80 ? (1 - distSun / 80) * 0.4 : 0;
      const drawAlpha = alpha * (0.15 + (speed / MAX_SPEED) * 0.55 + intensityBoost);
      const drawLight = Math.min(100, pLight[i] + intensityBoost * 40);

      ctx.beginPath();
      ctx.arc(px[i], py[i], pSize[i], 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${pHue[i]}, ${pSat[i]}%, ${drawLight}%, ${drawAlpha})`;
      ctx.fill();

      // Glow for brighter/larger particles
      if (pSize[i] > 1 && speed > 0.6) {
        ctx.beginPath();
        ctx.arc(px[i], py[i], pSize[i] * 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${pHue[i]}, ${pSat[i]}%, ${drawLight}%, ${drawAlpha * 0.06})`;
        ctx.fill();
      }
    }

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
    // Re-scatter particles around new sun position
    for (let i = 0; i < PARTICLE_COUNT; i++) spawnParticle(i);
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
      if (metaTheme) metaTheme.setAttribute('content', '#f4efe6');
    } else {
      icon.textContent  = '◑';
      label.textContent = 'light_mode';
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
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

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
