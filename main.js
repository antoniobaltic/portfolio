/* ─────────────────────────────────────────────────────
   Antonio Baltic — Index 2026
───────────────────────────────────────────────────── */

/* ───────── Local time ───────── */
function initClock() {
  const el = document.getElementById('local-time');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const tick = () => { el.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 30_000);
}

/* ───────── Project filter ─────────
   Two independent filter groups (status + type) AND'd together.
   Each group is single-select with "all" as the default.
   - status  → matched against data-status
   - type    → matched against data-tags (whitespace-split list)
*/
function initFilter() {
  const groups   = document.querySelectorAll('.filter-group');
  const projects = document.querySelectorAll('.project');
  const counter  = document.getElementById('project-count');

  if (!groups.length || !projects.length) return;

  // Initial state — read whichever button starts .is-active in each group
  const state = {};
  groups.forEach(g => {
    const key = g.dataset.filterGroup;
    const active = g.querySelector('.filter-btn.is-active');
    state[key] = active ? active.dataset.filterValue : 'all';
  });

  const apply = () => {
    let visible = 0;
    projects.forEach(p => {
      const tags   = (p.dataset.tags || '').split(/\s+/).filter(Boolean);
      const status = p.dataset.status || '';
      const matchStatus = state.status === 'all' || status === state.status;
      const matchType   = state.type   === 'all' || tags.includes(state.type);
      const match = matchStatus && matchType;
      p.hidden = !match;
      if (match) visible++;
    });
    if (counter) {
      counter.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'}`;
    }
  };

  groups.forEach(group => {
    const key = group.dataset.filterGroup;
    const buttons = group.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        state[key] = btn.dataset.filterValue;
        apply();
      });
    });
  });
}

/* ───────── Project row click → primary link ───────── */
function initRowClicks() {
  document.querySelectorAll('.project').forEach(row => {
    const primary = row.querySelector('.project-title-link');
    if (!primary) return;

    row.addEventListener('click', (e) => {
      // Let real <a>, <button>, etc. handle their own clicks
      if (e.target.closest('a, button')) return;
      // Mid-click / cmd-click / ctrl-click → new tab
      const newTab = e.metaKey || e.ctrlKey || e.button === 1 || primary.target === '_blank';
      if (newTab) window.open(primary.href, '_blank', 'noopener');
      else window.location.href = primary.href;
    });

    // Keyboard activation on the row
    row.tabIndex = -1; // primary link already handles tab; row is just a click surface
  });
}

/* ───────── Scroll reveal ───────── */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(t => t.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(t => io.observe(t));
}

/* ───────── Init ───────── */
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initFilter();
  initRowClicks();
  initReveal();
});

/* ───────── bfcache safety net ─────────
   When iOS Safari restores from the back-forward cache, the
   IntersectionObserver doesn't re-fire and any row whose .is-visible
   class wasn't set yet stays at opacity:0 — the row appears blank.
   On any persisted restore, force-mark every reveal as visible. */
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
});
