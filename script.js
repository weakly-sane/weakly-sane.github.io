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


(() => {
  const canvas = document.getElementById('cursor-trail-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 1;
  let height = 1;
  let dpr = 1;
  const trail = [];

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  window.addEventListener('pointermove', e => {
    for (let i = 0; i < 2; i++) {
      trail.push({
        x: e.clientX + (Math.random() - .5) * 7,
        y: e.clientY + (Math.random() - .5) * 7,
        vx: (Math.random() - .5) * .30,
        vy: -.18 - Math.random() * .30,
        life: 1,
        size: .9 + Math.random() * 1.9
      });
    }

    if (trail.length > 120) {
      trail.splice(0, trail.length - 120);
    }
  }, { passive: true });

  function frame() {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= .022;

      if (p.life <= 0) {
        trail.splice(i, 1);
        continue;
      }

      const glow = p.size * 6.2;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
      g.addColorStop(0, 'rgba(232,249,255,' + (.74 * p.life) + ')');
      g.addColorStop(.28, 'rgba(130,210,255,' + (.34 * p.life) + ')');
      g.addColorStop(.62, 'rgba(92,172,255,' + (.12 * p.life) + ')');
      g.addColorStop(1, 'rgba(70,150,255,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();


(() => {
  const canvas = document.getElementById('content-water-canvas');
  const cover = document.querySelector('.wallpaper-cover');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });

  if (!gl) return;

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;

    const float PI = 3.141592653589793;

    float waterHeight(vec2 p, float t) {
      // One clear disturbance source on the water surface.
      // Perspective makes these circular world-space ripples appear elliptical on screen.
      vec2 center = vec2(0.10, 3.10);
      float r = length(p - center);

      // Main outward-propagating ripple train.
      float mainRipple =
        sin(r * 10.8 - t * 2.55) *
        exp(-r * 0.16) *
        0.132;

      // A finer harmonic gives each ring a thin luminous crest instead of a soft blob.
      float fineRipple =
        sin(r * 21.6 - t * 5.10 + 0.55) *
        exp(-r * 0.22) *
        0.026;

      // Very gentle background water motion so the surface is alive between rings.
      vec2 d1 = normalize(vec2(1.0, 0.18));
      vec2 d2 = normalize(vec2(-0.36, 1.0));
      float ambient =
        sin(dot(p, d1) * 2.45 + t * 0.42) * 0.020 +
        sin(dot(p, d2) * 4.10 - t * 0.55 + 1.2) * 0.012;

      return mainRipple + fineRipple + ambient;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;

      // Perspective projection of an effectively endless water plane.
      float y = clamp(uv.y, 0.02, 1.0);
      float farScale = mix(8.6, 2.7, pow(y, 0.78));
      vec2 p = vec2(
        (uv.x - 0.5) * aspect * farScale,
        mix(8.4, 0.55, pow(y, 0.72))
      );

      float eps = 0.018;
      float hx = waterHeight(p + vec2(eps, 0.0), u_time)
               - waterHeight(p - vec2(eps, 0.0), u_time);
      float hz = waterHeight(p + vec2(0.0, eps), u_time)
               - waterHeight(p - vec2(0.0, eps), u_time);

      vec3 N = normalize(vec3(-hx * 7.2, 1.0, -hz * 7.2));

      // Camera looking down the surface; moon is above/right and outside the viewport.
      vec3 V = normalize(vec3((0.5 - uv.x) * 0.20, 1.15, 0.88));
      vec3 L = normalize(vec3(0.88, 1.42, -0.62));
      vec3 H = normalize(V + L);

      float ndv = max(dot(N, V), 0.0);
      float ndh = max(dot(N, H), 0.0);

      float fresnel = pow(1.0 - ndv, 4.0);
      float broadSpec = pow(ndh, 26.0);
      float sharpSpec = pow(ndh, 115.0);

      // A diagonal moon-glitter path, widening toward the viewer.
      float trailCenter = 0.79 - uv.y * 0.20;
      float trailWidth = 0.055 + uv.y * 0.18;
      float trail = exp(-pow((uv.x - trailCenter) / trailWidth, 2.0));

      // Break the reflection into small moving shards on wave crests.
      float shardA = 0.5 + 0.5 * sin(p.x * 21.0 + p.y * 7.0 + u_time * 2.25);
      float shardB = 0.5 + 0.5 * sin(p.x * 11.0 - p.y * 15.0 - u_time * 1.72);
      float shards = smoothstep(0.47, 0.96, shardA * 0.60 + shardB * 0.62);

      float moonSpec = trail * (
        broadSpec * 0.92 +
        sharpSpec * (1.15 + shards * 1.85)
      );

      // Cool reflection from the night sky, stronger toward the horizon.
      float horizon = pow(1.0 - uv.y, 2.2);
      vec3 deep = vec3(0.010, 0.038, 0.061);
      vec3 mid = vec3(0.018, 0.092, 0.132);
      vec3 sky = vec3(0.095, 0.165, 0.235);

      vec3 color = mix(deep, mid, 0.30 + 0.45 * y);
      color += sky * fresnel * (0.26 + horizon * 0.32);

      // Fine wave-face brightness, kept subtle so the surface stays natural.
      float slopeLight = clamp(N.y * 0.65 + N.x * 0.16 - N.z * 0.10, 0.0, 1.0);
      color += vec3(0.035, 0.085, 0.115) * slopeLight * 0.38;

      vec3 moonColor = vec3(0.78, 0.88, 1.0);
      color += moonColor * moonSpec * 0.72;

      // Sparse pinprick sparkles inside the reflected path.
      float micro = pow(max(0.0, sin(p.x * 31.0 + u_time * 3.0)
                                  * sin(p.y * 23.0 - u_time * 2.3)), 8.0);
      color += moonColor * trail * sharpSpec * micro * 1.10;

      // Slight haze in the distance makes perspective feel less synthetic.
      color = mix(color, vec3(0.055, 0.105, 0.155), horizon * 0.13);

      // Mild vignette keeps text readable at the edges.
      vec2 q = uv - 0.5;
      float vignette = smoothstep(0.78, 0.25, dot(q, q));
      color *= 0.86 + 0.14 * vignette;

      // Simple display gamma.
      color = pow(color, vec3(0.92));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Water shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Water shader link failed:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, 'u_resolution');
  const time = gl.getUniformLocation(program, 'u_time');

  let active = true;
  let lastRender = 0;
  const started = performance.now();

  function resize() {
    const cssW = Math.max(1, window.innerWidth);
    const cssH = Math.max(1, window.innerHeight);

    // Background detail does not need native 4K resolution.
    const maxW = 1800;
    const scale = Math.min(1, maxW / cssW, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(cssW * scale));
    const h = Math.max(1, Math.round(cssH * scale));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
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
    // ~45 fps is enough for water and significantly cheaper than 90/165 fps.
    if (active && !document.hidden && now - lastRender >= 22) {
      lastRender = now;
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - started) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
