/* ─────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function typeWriter(el, text, speed = 62) {
  for (const char of text) {
    el.textContent += char;
    await sleep(speed + (Math.random() * 20 - 10)); // slight human jitter
  }
}

/* ─────────────────────────────────────────────────────
   Hero sequence
───────────────────────────────────────────────────── */
async function runHeroSequence() {
  const promptCursor = document.getElementById('prompt-cursor');
  const nameEl       = document.getElementById('hero-name');
  const subEl        = document.getElementById('hero-sub');
  const scrollEl     = document.getElementById('hero-scroll');

  // Prompt fades in via CSS (animation: fade-in 0.4s 0.2s)
  // Cursor blinks for a moment, then we start typing the name
  await sleep(1400);

  // Hide prompt cursor, begin name typing
  promptCursor.style.visibility = 'hidden';
  nameEl.classList.add('is-typing');

  await sleep(120);
  await typeWriter(nameEl, 'Antonio Baltic', 62);

  nameEl.classList.remove('is-typing');
  nameEl.classList.add('is-done');

  // Subtitle fades in
  await sleep(280);
  subEl.classList.add('visible');

  // Scroll hint fades in
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
   Init
───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  runHeroSequence();
  initScrollReveal();
});
