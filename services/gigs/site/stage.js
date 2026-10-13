/* Vault staging: boot, HUD, beams canvas, reveals, tilt, console.
 * Everything shown is real archive state via gigs:* events. */

(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- boot ---------- */

  const bootEl = document.getElementById("boot");
  const bootLog = document.getElementById("boot-log");
  const sessionStart = performance.now();

  function bootLine(text, ok) {
    if (!bootLog || !bootLog.isConnected) return;
    const row = document.createElement("div");
    row.className = "boot-line";
    row.textContent = text;
    if (ok) {
      const span = document.createElement("span");
      span.className = "ok";
      span.textContent = " ok";
      row.appendChild(span);
    }
    bootLog.appendChild(row);
  }

  function finishBoot() {
    bootEl?.classList.add("done");
    setTimeout(() => bootEl?.remove(), 600);
    try { sessionStorage.setItem("gigs-booted", "1"); } catch { /* private mode */ }
  }

  let booted = false;
  function tryBoot() {
    if (booted) return;
    booted = true;
    finishBoot();
  }

  if (bootEl && !reduced) {
    let skip = false;
    try { skip = sessionStorage.getItem("gigs-booted") === "1"; } catch { skip = false; }
    if (skip) {
      bootEl.remove();
    } else {
      bootLine("gigs.vault --mount");
      bootLine("stage lights …", true);
      window.addEventListener("gigs:ready", (event) => {
        const { clips, gigs, error } = event.detail || {};
        if (error) bootLine("catalog … missing");
        else bootLine(`catalog … ${clips} clips / ${gigs} nights`, true);
        setTimeout(tryBoot, 450);
      }, { once: true });
      setTimeout(tryBoot, 6000); // never trap the vault behind the boot
      bootEl.addEventListener("click", tryBoot);
      window.addEventListener("keydown", tryBoot, { once: true });
    }
  } else {
    bootEl?.remove();
  }

  /* ---------- HUD ---------- */

  const hudTime = document.getElementById("hud-uptime");
  const hudNow = document.getElementById("hud-now");
  const hudMood = document.getElementById("hud-mood");
  const hudInbox = document.getElementById("hud-inbox");
  const pad = (n) => String(n).padStart(2, "0");
  setInterval(() => {
    if (!hudTime) return;
    const s = Math.floor((performance.now() - sessionStart) / 1000);
    hudTime.textContent = `up ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  }, 1000);

  window.addEventListener("gigs:now", (event) => {
    const { title, playing } = event.detail || {};
    if (hudNow) hudNow.textContent = title ? `${playing ? "▶" : "❚❚"} ${title}` : "idle";
  });

  window.addEventListener("gigs:counts", (event) => {
    const { untagged } = event.detail || {};
    if (hudInbox) hudInbox.textContent = untagged > 0 ? String(untagged) : "";
  });

  // Section mood tracking.
  const moodSections = document.querySelectorAll("[data-mood]");
  if ("IntersectionObserver" in window && !reduced) {
    const moodObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const mood = entry.target.dataset.mood || "top";
        document.body.dataset.mood = mood;
        if (hudMood) hudMood.textContent = `sec: ${mood}`;
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    moodSections.forEach((section) => moodObserver.observe(section));
  }

  /* ---------- scroll progress ---------- */

  if (!reduced) {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- reveals + count-ups ---------- */

  function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    if (reduced) {
      el.textContent = String(target);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  let statsPainted = false;
  function paintStats() {
    const values = ["stat-clips", "stat-gigs", "stat-mins", "stat-untagged"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!values.length) return;
    if (statsPainted) {
      values.forEach((el) => { el.textContent = el.dataset.count || "0"; });
      return;
    }
    statsPainted = true;
    values.forEach(countUp);
  }

  if ("IntersectionObserver" in window && !reduced) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".fade-up, .stagger").forEach((el) => revealObserver.observe(el));
  } else {
    document.querySelectorAll(".fade-up, .stagger").forEach((el) => el.classList.add("in"));
  }

  /* ---------- tilt (dynamic gig cards) ---------- */

  function bindTilt(container) {
    if (reduced || !finePointer || !container) return;
    container.querySelectorAll(".gig-card:not(.tilt)").forEach((card) => {
      card.classList.add("tilt");
      let raf = 0;
      card.addEventListener("pointermove", (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-4px)`;
        });
      }, { passive: true });
      card.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        card.style.transform = "";
      });
    });
  }

  window.Stage = { bindTilt, paintStats };

  /* ---------- beams canvas ---------- */

  const canvas = document.getElementById("beams");
  let surge = 0;
  function pulse(amount) {
    surge = Math.min(1.5, surge + amount);
  }
  window.addEventListener("gigs:play", () => pulse(0.7));
  window.addEventListener("vault:command", () => pulse(0.4));

  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      document.body.classList.add("has-fx");
      let w = 0;
      let h = 0;
      let particles = [];
      let running = true;
      let beams = [
        { x: 0.22, tilt: 0.35, width: 0.09, hue: 28, speed: 0.00012, phase: 0 },
        { x: 0.55, tilt: -0.3, width: 0.07, hue: 187, speed: 0.00009, phase: 2 },
        { x: 0.8, tilt: 0.42, width: 0.11, hue: 18, speed: 0.00007, phase: 4 },
      ];

      function resize() {
        const rect = canvas.getBoundingClientRect();
        w = canvas.width = Math.max(1, Math.floor(rect.width));
        h = canvas.height = Math.max(1, Math.floor(rect.height));
        const count = Math.min(90, Math.floor((w * h) / 22000));
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.6 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -0.08 - Math.random() * 0.3,
          warm: Math.random() > 0.45,
          tw: Math.random() * Math.PI * 2,
        }));
      }

      function drawBeam(now, beam) {
        const sway = Math.sin(now * beam.speed + beam.phase) * w * 0.06;
        const topX = (beam.x * w) + sway;
        const botX = topX + beam.tilt * h;
        const grad = ctx.createLinearGradient(topX, 0, botX, h);
        const alpha = 0.10 + surge * 0.08;
        grad.addColorStop(0, `hsla(${beam.hue}, 95%, 62%, ${alpha})`);
        grad.addColorStop(1, "hsla(20, 95%, 55%, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(topX - beam.width * w, 0);
        ctx.lineTo(topX + beam.width * w, 0);
        ctx.lineTo(botX + beam.width * w * 2.4, h);
        ctx.lineTo(botX - beam.width * w * 2.4, h);
        ctx.closePath();
        ctx.fill();
      }

      function frame(now) {
        if (!running) return;
        ctx.clearRect(0, 0, w, h);
        beams.forEach((beam) => drawBeam(now, beam));
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.tw += 0.03;
          if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
          if (p.x < -4) p.x = w + 4;
          if (p.x > w + 4) p.x = -4;
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(p.tw));
          ctx.fillStyle = p.warm
            ? `rgba(255, 190, 120, ${(0.5 * twinkle + surge * 0.3).toFixed(3)})`
            : `rgba(120, 220, 235, ${(0.4 * twinkle).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
        surge = Math.max(0, surge - 0.012);
        requestAnimationFrame(frame);
      }

      resize();
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", () => {
        const hidden = document.hidden;
        if (!hidden && !running) {
          running = true;
          resize();
          requestAnimationFrame(frame);
        } else if (hidden) {
          running = false;
        }
      });
      requestAnimationFrame(frame);
    }
  }

  /* ---------- vault console ---------- */

  const consoleOut = document.getElementById("console-out");
  const consoleIn = document.getElementById("console-in");

  function print(text, cls) {
    if (!consoleOut) return;
    const line = document.createElement("div");
    line.className = `console-line${cls ? ` ${cls}` : ""}`;
    line.textContent = text;
    consoleOut.appendChild(line);
    while (consoleOut.childElementCount > 60) consoleOut.firstChild.remove();
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }

  const COMMANDS = {
    help: () => [
      "commands:",
      "  play <words> — screen the first match",
      "  next / prev  — move through the queue",
      "  tag          — open the tag editor (T works too)",
      "  inbox        — screen everything awaiting tags",
      "  tour         — back to the tour history",
      "  stats        — vault totals",
      "  clear        — wipe this console",
    ],
    stats: () => [window.Vault ? window.Vault.stats() : "vault offline"],
    play: (arg) => [window.Vault ? window.Vault.play(arg) : "vault offline"],
    next: () => [window.Vault ? window.Vault.next() : "vault offline"],
    prev: () => [window.Vault ? window.Vault.prev() : "vault offline"],
    tag: () => [window.Vault ? window.Vault.tag() : "vault offline"],
    inbox: () => [window.Vault ? window.Vault.inbox() : "vault offline"],
    tour: () => [window.Vault ? window.Vault.tour() : "vault offline"],
  };

  consoleIn?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const raw = consoleIn.value.trim();
    if (!raw) return;
    consoleIn.value = "";
    print(raw, "cmd");
    window.dispatchEvent(new CustomEvent("vault:command", { detail: { command: raw } }));
    const [name, ...rest] = raw.toLowerCase().split(/\s+/);
    if (name === "clear") {
      if (consoleOut) consoleOut.replaceChildren();
      return;
    }
    const handler = COMMANDS[name];
    if (!handler) {
      print(`unknown command "${name}" — try help`);
      return;
    }
    handler(rest.join(" ")).forEach((line) => print(line));
  });
})();
