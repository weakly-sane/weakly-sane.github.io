const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

(() => {
  const clock = document.getElementById('scene-clock');
  const sceneDate = document.getElementById('scene-date');
  const sceneDay = document.getElementById('scene-day');

  function updateSceneTime() {
    const now = new Date();
    if (clock) {
      clock.textContent = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).format(now);
    }
    if (sceneDate) {
      const day = String(now.getDate());
      const month = new Intl.DateTimeFormat('en-GB', { month: 'short' })
        .format(now).toUpperCase();
      sceneDate.textContent = `${day} ${month} ${now.getFullYear()}`;
    }
    if (sceneDay) {
      const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })
        .format(now).toUpperCase();
      sceneDay.textContent = `| ${weekday.split('').join(' ')} |`;
    }
  }

  updateSceneTime();
  window.setInterval(updateSceneTime, 1000);
})();

(() => {
  const cover = document.querySelector('.wallpaper-cover');
  const particleCanvas = document.getElementById('particle-canvas');
  if (!cover || !particleCanvas) return;

  const pctx = particleCanvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let visible = true;

  function resizeParticles() {
    const r = cover.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (particleCanvas.width !== w || particleCanvas.height !== h) {
      particleCanvas.width = w;
      particleCanvas.height = h;
    }
  }

  resizeParticles();
  window.addEventListener('resize', resizeParticles, { passive: true });

  new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
  }, { threshold: 0.01 }).observe(cover);

  const about = document.getElementById('about');
  let snapLocked = false;
  let touchStartY = null;

  function enterAbout() {
    if (!about || snapLocked) return;
    snapLocked = true;
    about.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => { snapLocked = false; }, 900);
  }

  cover.addEventListener('wheel', e => {
    if (e.deltaY > 2 && window.scrollY < cover.clientHeight * 0.8) {
      e.preventDefault();
      enterAbout();
    }
  }, { passive: false });

  cover.addEventListener('touchstart', e => {
    touchStartY = e.touches[0]?.clientY ?? null;
  }, { passive: true });

  cover.addEventListener('touchend', e => {
    if (touchStartY == null) return;
    const y = e.changedTouches[0]?.clientY ?? touchStartY;
    if (touchStartY - y > 24) enterAbout();
    touchStartY = null;
  }, { passive: true });

  const fireflies = Array.from({ length: 38 }, (_, i) => ({
    x: 0.04 + Math.random() * 0.88,
    y: 0.10 + Math.random() * 0.74,
    r: 0.75 + Math.random() * 1.65,
    phase: Math.random() * Math.PI * 2,
    heading: Math.random() * Math.PI * 2,
    moveSpeed: 0.014 + Math.random() * 0.022,
    turnRate: 0.55 + Math.random() * 0.75,
    flutter: 0.85 + Math.random() * 1.25,
    pulseSpeed: 0.8 + Math.random() * 0.75,
    warm: i % 7 === 0
  }));

  const trail = [];

  cover.addEventListener('pointermove', e => {
    const r = cover.getBoundingClientRect();
    const sx = particleCanvas.width / r.width;
    const sy = particleCanvas.height / r.height;

    for (let i = 0; i < 2; i++) {
      trail.push({
        x: (e.clientX - r.left) * sx + (Math.random() - .5) * 8,
        y: (e.clientY - r.top) * sy + (Math.random() - .5) * 8,
        vx: (Math.random() - .5) * .25,
        vy: -.15 - Math.random() * .28,
        life: 1,
        size: 1 + Math.random() * 2
      });
    }

    if (trail.length > 110) trail.splice(0, trail.length - 110);
  }, { passive: true });

  function drawParticles(t) {
    if (!pctx) return;
    const w = particleCanvas.width;
    const h = particleCanvas.height;

    pctx.clearRect(0, 0, w, h);
    pctx.save();
    pctx.globalCompositeOperation = 'screen';

    for (const p of fireflies) {
      p.heading += Math.sin(t * 0.34 + p.phase) * p.turnRate * particleDt;
      p.x += Math.cos(p.heading) * p.moveSpeed * particleDt;
      p.y += Math.sin(p.heading) * p.moveSpeed * 0.62 * particleDt;

      if (p.x < 0.025 || p.x > 0.975) {
        p.heading = Math.PI - p.heading;
        p.x = Math.max(0.025, Math.min(0.975, p.x));
      }
      if (p.y < 0.07 || p.y > 0.90) {
        p.heading = -p.heading;
        p.y = Math.max(0.07, Math.min(0.90, p.y));
      }

      const x = (p.x + Math.sin(t * p.flutter + p.phase) * 0.0065) * w;
      const y = (p.y + Math.cos(t * (p.flutter * 0.83) + p.phase) * 0.0085) * h;
      const pulse = .25 + .75 * (.5 + .5 * Math.sin(t * p.pulseSpeed * 2.2 + p.phase));
      const rad = p.r * dpr;
      const g = pctx.createRadialGradient(x, y, 0, x, y, rad * 8);

      if (p.warm) {
        g.addColorStop(0, 'rgba(255,246,191,' + (.78 * pulse) + ')');
        g.addColorStop(.25, 'rgba(255,220,125,' + (.30 * pulse) + ')');
      } else {
        g.addColorStop(0, 'rgba(226,248,255,' + (.82 * pulse) + ')');
        g.addColorStop(.25, 'rgba(120,205,255,' + (.32 * pulse) + ')');
      }

      g.addColorStop(1, 'rgba(80,160,255,0)');
      pctx.fillStyle = g;
      pctx.beginPath();
      pctx.arc(x, y, rad * 8, 0, Math.PI * 2);
      pctx.fill();
    }

    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.x += p.vx * dpr;
      p.y += p.vy * dpr;
      p.life -= .024;

      if (p.life <= 0) {
        trail.splice(i, 1);
        continue;
      }

      const g = pctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5 * dpr);
      g.addColorStop(0, 'rgba(225,248,255,' + (.68 * p.life) + ')');
      g.addColorStop(.32, 'rgba(120,205,255,' + (.30 * p.life) + ')');
      g.addColorStop(1, 'rgba(80,170,255,0)');

      pctx.fillStyle = g;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size * 5 * dpr, 0, Math.PI * 2);
      pctx.fill();
    }

    pctx.restore();
  }

  const start = performance.now();
  let lastFrame = start;
  let particleDt = 0;

  function frame(now) {
    particleDt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (visible) drawParticles((now - start) / 1000);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();


(() => {
  const canvas = document.getElementById('content-particle-canvas');
  const cover = document.querySelector('.wallpaper-cover');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let active = true;
  let last = performance.now();

  const fireflies = Array.from({ length: 22 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - .5) * .012,
    vy: -.004 - Math.random() * .010,
    drift: .45 + Math.random() * 1.15,
    phase: Math.random() * Math.PI * 2,
    pulse: .45 + Math.random() * 1.1,
    radius: .65 + Math.random() * 1.35,
    warm: i % 5 !== 0
  }));

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  if (cover) {
    new IntersectionObserver(entries => {
      const ratio = entries[0]?.intersectionRatio ?? 0;
      active = ratio < 0.55;
    }, { threshold: [0, .25, .55, 1] }).observe(cover);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;

    ctx.clearRect(0, 0, width, height);

    if (active && !document.hidden) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const t = now / 1000;

      for (const p of fireflies) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x < -.04) p.x = 1.04;
        if (p.x > 1.04) p.x = -.04;
        if (p.y < -.06) {
          p.y = 1.06;
          p.x = Math.random();
        }

        const wobbleX = Math.sin(t * p.drift + p.phase) * 12;
        const wobbleY = Math.cos(t * p.drift * .78 + p.phase) * 8;
        const x = p.x * width + wobbleX;
        const y = p.y * height + wobbleY;
        const pulse = .28 + .72 * (.5 + .5 * Math.sin(t * p.pulse * 2 + p.phase));
        const glow = p.radius * 7.5;

        const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
        if (p.warm) {
          g.addColorStop(0, 'rgba(255,244,174,' + (.72 * pulse) + ')');
          g.addColorStop(.18, 'rgba(230,214,122,' + (.24 * pulse) + ')');
          g.addColorStop(1, 'rgba(202,190,95,0)');
        } else {
          g.addColorStop(0, 'rgba(220,241,255,' + (.62 * pulse) + ')');
          g.addColorStop(.18, 'rgba(133,193,255,' + (.20 * pulse) + ')');
          g.addColorStop(1, 'rgba(91,158,230,0)');
        }

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, glow, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
