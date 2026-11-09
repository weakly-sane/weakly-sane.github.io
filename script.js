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
  const audio = document.getElementById('cover-bgm');
  const toggle = document.getElementById('audio-toggle');
  const volume = document.getElementById('audio-volume');
  const cover = document.querySelector('.wallpaper-cover');
  const about = document.getElementById('about');
  if (!audio || !toggle || !volume || !cover) return;

  const DEFAULT_VOLUME = 0.07;
  const saved = Number.parseFloat(localStorage.getItem('wallpaper-bgm-volume-v2') || '');
  let preferredVolume = Number.isFinite(saved)
    ? Math.max(0, Math.min(1, saved))
    : DEFAULT_VOLUME;
  let muted = localStorage.getItem('wallpaper-bgm-muted-v2') === '1';
  let coverActive = true;
  let fadeId = 0;

  audio.volume = preferredVolume;
  audio.muted = muted;
  volume.value = String(preferredVolume);

  function syncControl() {
    const silent = muted || preferredVolume <= 0.001;
    toggle.classList.toggle('is-muted', silent);
    toggle.setAttribute('aria-label', silent ? 'Unmute background music' : 'Mute background music');
  }

  function playOnCover() {
    if (!coverActive || muted || preferredVolume <= 0.001) return;
    fadeId += 1;
    audio.volume = preferredVolume;
    audio.play().catch(() => {});
  }

  function pauseWithFade() {
    if (audio.paused) return;
    const token = ++fadeId;
    const startVolume = audio.volume;
    const start = performance.now();
    const duration = 320;

    function step(now) {
      if (token !== fadeId) return;
      const p = Math.min(1, (now - start) / duration);
      audio.volume = startVolume * (1 - p);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        audio.pause();
        audio.volume = preferredVolume;
      }
    }

    requestAnimationFrame(step);
  }

  syncControl();

  // Browsers may block audible autoplay. Try immediately, then retry on the
  // first genuine user gesture while the wallpaper cover is active.
  playOnCover();
  const unlock = () => {
    playOnCover();
    if (!audio.paused) {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('mousemove', unlock);
      window.removeEventListener('wheel', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('mousemove', unlock, { passive: true });
  window.addEventListener('wheel', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });

  toggle.addEventListener('click', () => {
    muted = !muted;
    audio.muted = muted;
    localStorage.setItem('wallpaper-bgm-muted-v2', muted ? '1' : '0');
    syncControl();
    if (!muted) playOnCover();
  });

  volume.addEventListener('input', () => {
    preferredVolume = Math.max(0, Math.min(1, Number(volume.value)));
    audio.volume = preferredVolume;
    if (preferredVolume > 0) {
      muted = false;
      audio.muted = false;
      localStorage.setItem('wallpaper-bgm-muted-v2', '0');
    }
    localStorage.setItem('wallpaper-bgm-volume-v2', String(preferredVolume));
    syncControl();
    playOnCover();
  });

  if (about) {
    new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting ?? false;
      if (visible) {
        coverActive = false;
        pauseWithFade();
      }
    }, { threshold: 0.01 }).observe(about);
  }

  new IntersectionObserver(entries => {
    const ratio = entries[0]?.intersectionRatio ?? 0;
    if (ratio >= 0.6) {
      coverActive = true;
      playOnCover();
    } else if (ratio < 0.15) {
      coverActive = false;
      pauseWithFade();
    }
  }, { threshold: [0, 0.15, 0.6, 1] }).observe(cover);
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
