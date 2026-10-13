/* ===== Ops HUD: boot preloader + session status bar =====
 * Everything shown is real local state (session uptime, 3D on/off, current
 * section). No fake counters. Respects prefers-reduced-motion: boot is
 * skipped, status bar still renders (static text, 1s updates are cheap).
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bootEl = document.getElementById('boot');
const bootLog = document.getElementById('boot-log');
const sessionStart = performance.now();

// Fast boot overlay. Skipped on repeat views in the same tab session,
// skipped entirely for reduced motion. Click/keypress dismisses early.
function finishBoot() {
  bootEl?.classList.add('done');
  setTimeout(() => bootEl?.remove(), 600);
  try { sessionStorage.setItem('matt-booted', '1'); } catch { /* private mode */ }
}

if (bootEl && !reduced) {
  let skip = false;
  try { skip = sessionStorage.getItem('matt-booted') === '1'; } catch { skip = false; }
  if (skip) {
    bootEl.remove();
  } else {
    const lines = [
      ['$ matt-portfolio --boot', ''],
      ['flow field', document.body.classList.contains('has-3d') ? 'webgl' : 'css fallback'],
      ['motion', window.matchMedia('(pointer: fine)').matches ? 'tilt + scroll' : 'touch mode'],
      ['terminal', document.getElementById('terminal-input') ? 'ready' : 'missing'],
    ];
    // has-3d lands async (CDN import); re-check at print time.
    setTimeout(() => {
      lines[1][1] = document.body.classList.contains('has-3d') ? 'webgl' : 'css fallback';
      lines.forEach(([k, v], i) => {
        setTimeout(() => {
          if (!bootLog.isConnected) return;
          const row = document.createElement('div');
          row.className = 'boot-line';
          const ok = document.createElement('span');
          ok.className = 'terminal-success';
          ok.textContent = ' ok';
          row.textContent = `${k} …`;
          if (v) { row.textContent = `${k}: ${v}`; }
          row.appendChild(ok);
          bootLog.appendChild(row);
        }, 120 * (i + 1));
      });
      setTimeout(finishBoot, 120 * (lines.length + 1) + 250);
    }, 350);
    bootEl.addEventListener('click', finishBoot);
    window.addEventListener('keydown', finishBoot, { once: true });
  }
} else {
  bootEl?.remove();
}

// Status bar: session uptime · 3D state · current section mood.
const hudTime = document.getElementById('hud-uptime');
const hudFlow = document.getElementById('hud-flow');
const hudMood = document.getElementById('hud-mood');
if (hudTime) {
  const pad = (n) => String(n).padStart(2, '0');
  setInterval(() => {
    const s = Math.floor((performance.now() - sessionStart) / 1000);
    hudTime.textContent = `up ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    if (hudFlow) {
      hudFlow.textContent = document.body.classList.contains('has-3d')
        ? (reduced ? 'flow: static' : 'flow: live')
        : 'flow: off';
    }
    if (hudMood) hudMood.textContent = `sec: ${document.body.dataset.mood || 'hero'}`;
  }, 1000);
}
