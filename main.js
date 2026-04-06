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
   Flow Field Particle System
───────────────────────────────────────────────────── */
function initParticles() {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  const noise3D = createNoise3D();

  // Config
  const PARTICLE_COUNT = 300;
  const NOISE_SCALE = 0.003;
  const NOISE_SPEED = 0.0004;
  const FORCE = 0.35;
  const FRICTION = 0.97;
  const TRAIL_ALPHA = 0.03;
  const MAX_SPEED = 2.5;

  // Color palettes per theme
  const palettes = {
    dark: [
      { h: 28, s: 75, l: 55 },  // golden amber
      { h: 18, s: 85, l: 48 },  // burnt orange
      { h: 35, s: 65, l: 62 },  // warm gold
      { h: 10, s: 70, l: 42 },  // deep rust
      { h: 42, s: 55, l: 68 },  // soft wheat
      { h: 22, s: 90, l: 52 },  // bright amber
    ],
    light: [
      { h: 25, s: 60, l: 40 },  // muted amber
      { h: 15, s: 55, l: 35 },  // earthy brown
      { h: 32, s: 50, l: 45 },  // warm tan
      { h: 8,  s: 45, l: 38 },  // muted rust
      { h: 38, s: 40, l: 50 },  // soft olive-gold
      { h: 20, s: 65, l: 42 },  // medium amber
    ]
  };

  let dpr, w, h;
  let zOffset = 0;
  let animId;
  let mouseX = -1000, mouseY = -1000;

  // Particles stored as arrays for performance
  const px = new Float32Array(PARTICLE_COUNT);
  const py = new Float32Array(PARTICLE_COUNT);
  const vx = new Float32Array(PARTICLE_COUNT);
  const vy = new Float32Array(PARTICLE_COUNT);
  const pAlpha = new Float32Array(PARTICLE_COUNT);
  const pSize = new Float32Array(PARTICLE_COUNT);
  const pColorIdx = new Uint8Array(PARTICLE_COUNT);
  const pLife = new Float32Array(PARTICLE_COUNT);
  const pMaxLife = new Float32Array(PARTICLE_COUNT);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Clear trails on resize
    ctx.clearRect(0, 0, w, h);
  }

  function spawnParticle(i) {
    // Spawn from edges or random positions with bias toward center
    const edge = Math.random() < 0.3;
    if (edge) {
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0: px[i] = Math.random() * w; py[i] = -5; break;
        case 1: px[i] = w + 5; py[i] = Math.random() * h; break;
        case 2: px[i] = Math.random() * w; py[i] = h + 5; break;
        case 3: px[i] = -5; py[i] = Math.random() * h; break;
      }
    } else {
      px[i] = Math.random() * w;
      py[i] = Math.random() * h;
    }
    vx[i] = (Math.random() - 0.5) * 0.5;
    vy[i] = (Math.random() - 0.5) * 0.5;
    pAlpha[i] = 0;
    pSize[i] = 0.5 + Math.random() * 2;
    pColorIdx[i] = Math.floor(Math.random() * 6);
    pMaxLife[i] = 200 + Math.random() * 400;
    pLife[i] = 0;
  }

  function init() {
    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      spawnParticle(i);
      pLife[i] = Math.random() * pMaxLife[i]; // stagger initial life
    }
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function getBgColor() {
    const theme = getTheme();
    return theme === 'light' ? '244, 239, 230' : '10, 10, 10';
  }

  function getPalette() {
    return palettes[getTheme()] || palettes.dark;
  }

  function frame() {
    const bg = getBgColor();
    const palette = getPalette();

    // Trail overlay — don't clear, just fade
    ctx.fillStyle = `rgba(${bg}, ${TRAIL_ALPHA})`;
    ctx.fillRect(0, 0, w, h);

    zOffset += NOISE_SPEED;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pLife[i]++;

      // Lifecycle alpha: fade in → sustain → fade out
      const lifeRatio = pLife[i] / pMaxLife[i];
      if (lifeRatio < 0.1) {
        pAlpha[i] = lifeRatio / 0.1;
      } else if (lifeRatio > 0.85) {
        pAlpha[i] = (1 - lifeRatio) / 0.15;
      } else {
        pAlpha[i] = 1;
      }

      // Respawn if life exceeded or out of bounds
      if (pLife[i] > pMaxLife[i] || px[i] < -50 || px[i] > w + 50 || py[i] < -50 || py[i] > h + 50) {
        spawnParticle(i);
        continue;
      }

      // Flow field angle from noise
      const angle = noise3D(px[i] * NOISE_SCALE, py[i] * NOISE_SCALE, zOffset) * Math.PI * 2;

      // Apply force
      vx[i] += Math.cos(angle) * FORCE;
      vy[i] += Math.sin(angle) * FORCE;

      // Mouse repulsion
      const dx = px[i] - mouseX;
      const dy = py[i] - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        const repulse = (80 - dist) / 80 * 2;
        vx[i] += (dx / dist) * repulse;
        vy[i] += (dy / dist) * repulse;
      }

      // Friction + speed clamp
      vx[i] *= FRICTION;
      vy[i] *= FRICTION;
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      if (speed > MAX_SPEED) {
        vx[i] = (vx[i] / speed) * MAX_SPEED;
        vy[i] = (vy[i] / speed) * MAX_SPEED;
      }

      // Move
      px[i] += vx[i];
      py[i] += vy[i];

      // Draw
      const c = palette[pColorIdx[i]];
      const alpha = pAlpha[i] * (0.2 + (speed / MAX_SPEED) * 0.5);
      ctx.beginPath();
      ctx.arc(px[i], py[i], pSize[i], 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;
      ctx.fill();

      // Draw glow for larger/faster particles
      if (pSize[i] > 1.2 && speed > 0.8) {
        ctx.beginPath();
        ctx.arc(px[i], py[i], pSize[i] * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha * 0.08})`;
        ctx.fill();
      }
    }

    animId = requestAnimationFrame(frame);
  }

  // Mouse tracking on canvas
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseX = -1000;
    mouseY = -1000;
  });

  // Pause when hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(frame);
    }
  });

  // Resize handling
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  // Start
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

  // Fade in particles alongside subtitle
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
