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
  let last = performance.now();
  const petals = [];

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

  function spawnPetal(x, y) {
    const white = Math.random() < 0.48;
    petals.push({
      x: x + (Math.random() - .5) * 9,
      y: y + (Math.random() - .5) * 6,
      vx: (Math.random() - .5) * .55,
      vy: .22 + Math.random() * .48,
      size: 2.0 + Math.random() * 3.1,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - .5) * .065,
      sway: .8 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      life: 1,
      white
    });
  }

  window.addEventListener('pointermove', e => {
    spawnPetal(e.clientX, e.clientY);
    if (Math.random() < .34) spawnPetal(e.clientX, e.clientY);

    if (petals.length > 96) {
      petals.splice(0, petals.length - 96);
    }
  }, { passive: true });

  function drawPetal(p, alpha) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(p.size * .60, p.size);

    const grad = ctx.createLinearGradient(0, -1, 0, 1);
    if (p.white) {
      grad.addColorStop(0, 'rgba(247,252,255,' + (.94 * alpha) + ')');
      grad.addColorStop(.55, 'rgba(215,239,255,' + (.82 * alpha) + ')');
      grad.addColorStop(1, 'rgba(154,205,248,' + (.34 * alpha) + ')');
      ctx.shadowColor = 'rgba(179,225,255,' + (.35 * alpha) + ')';
    } else {
      grad.addColorStop(0, 'rgba(218,240,255,' + (.92 * alpha) + ')');
      grad.addColorStop(.55, 'rgba(127,190,245,' + (.78 * alpha) + ')');
      grad.addColorStop(1, 'rgba(82,145,220,' + (.32 * alpha) + ')');
      ctx.shadowColor = 'rgba(103,184,255,' + (.32 * alpha) + ')';
    }

    ctx.shadowBlur = 4.5;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(.80, -.48, .82, .48, 0, 1);
    ctx.bezierCurveTo(-.82, .48, -.80, -.48, 0, -1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 16.67, 2.0);
    last = now;

    ctx.clearRect(0, 0, width, height);

    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];

      p.phase += .035 * p.sway * dt;
      p.vy += .006 * dt;
      p.x += (p.vx + Math.sin(p.phase) * .24) * dt;
      p.y += p.vy * dt;
      p.rot += (p.vr + Math.sin(p.phase * .73) * .008) * dt;
      p.life -= .0125 * dt;

      if (p.life <= 0 || p.y > height + 24) {
        petals.splice(i, 1);
        continue;
      }

      const alpha = Math.min(1, p.life * 1.5);
      drawPetal(p, alpha);
    }

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
    uniform sampler2D u_texture;

    vec2 coverUv(vec2 uv) {
      float screenAspect = u_resolution.x / u_resolution.y;
      float texAspect = 1.7777778;
      vec2 p = uv;

      if (screenAspect > texAspect) {
        float s = texAspect / screenAspect;
        p.y = (p.y - .5) * s + .5;
      } else {
        float s = screenAspect / texAspect;
        p.x = (p.x - .5) * s + .5;
      }

      return p;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 suv = vec2(uv.x, 1.0 - uv.y);
      float aspect = u_resolution.x / u_resolution.y;

      // One visible ripple source, slightly below center like the source wallpaper.
      vec2 center = vec2(.53, .61);
      vec2 delta = vec2((suv.x - center.x) * aspect, suv.y - center.y);
      float r = length(delta);
      vec2 dir = r > .0001 ? normalize(delta) : vec2(0.0);

      float phase = r * 47.0 - u_time * 4.15;
      float envelope = exp(-r * 1.75);
      float ringWave = sin(phase) * envelope;
      float fineWave = sin(phase * 1.95 + .55) * exp(-r * 2.5);

      // Gentle ambient motion, much weaker than the central ripple.
      vec2 ambient = vec2(
        sin(suv.y * 19.0 + u_time * .48) + sin((suv.x + suv.y) * 13.0 - u_time * .34),
        cos(suv.x * 17.0 - u_time * .42) + sin((suv.x - suv.y) * 11.0 + u_time * .29)
      ) * .00085;

      vec2 rippleOffset = dir * (ringWave * .0072 + fineWave * .0018);
      vec2 sampleUv = coverUv(suv + rippleOffset + ambient);
      sampleUv = clamp(sampleUv, .001, .999);

      vec3 base = texture2D(u_texture, sampleUv).rgb;

      // Shift the blurred wallpaper-derived palette toward its deep indigo water.
      base = mix(base, vec3(.015, .035, .080), .31);
      base *= vec3(.70, .80, .98) * .82;

      // Crest definition: thin silver-blue rings, not cartoon circles.
      float crest = pow(max(0.0, cos(phase)), 10.0) * envelope;
      float trough = pow(max(0.0, -cos(phase)), 5.0) * envelope;
      base += vec3(.35, .64, 1.0) * crest * .12;
      base -= vec3(.015, .030, .050) * trough * .32;

      // Moon reflection comes from outside the upper-right viewport.
      float trailCenter = .83 - suv.y * .27;
      float trailWidth = .045 + suv.y * .135;
      float moonTrail = exp(-pow((suv.x - trailCenter) / trailWidth, 2.0));

      float glitter1 = .5 + .5 * sin(suv.x * 220.0 + suv.y * 84.0 + u_time * 2.8 + ringWave * 5.0);
      float glitter2 = .5 + .5 * sin(suv.x * 119.0 - suv.y * 173.0 - u_time * 2.1);
      float glitter = pow(max(0.0, glitter1 * .64 + glitter2 * .54 - .60), 5.0);

      vec3 moon = vec3(.78, .88, 1.0);
      base += moon * moonTrail * (.055 + glitter * .55);
      base += moon * crest * moonTrail * .20;

      // Sparse tiny blue-white water sparkles, like the wallpaper.
      float speck =
        pow(max(0.0,
          sin((suv.x * 313.0 + suv.y * 157.0) + u_time * .23) *
          sin((suv.x * 181.0 - suv.y * 271.0) - u_time * .19)
        ), 14.0);
      base += vec3(.62, .83, 1.0) * speck * .12;

      // Keep headings/body text readable even where the moon reflection passes.
      float centerReadability = smoothstep(.95, .18, length((suv - vec2(.48,.52)) * vec2(.88,1.0)));
      base *= 1.0 - centerReadability * .08;

      vec2 q = suv - .5;
      float vignette = smoothstep(.84, .20, dot(q, q));
      base *= .82 + .18 * vignette;

      base = pow(max(base, 0.0), vec3(.92));
      gl_FragColor = vec4(base, 1.0);
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
  const textureUniform = gl.getUniformLocation(program, 'u_texture');

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([8, 18, 32, 255])
  );
  gl.uniform1i(textureUniform, 0);

  let textureReady = false;
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
      gl.UNSIGNED_BYTE, image
    );
    textureReady = true;
  };
  image.src = 'assets/background/water-texture.webp?v=1';

  let active = true;
  let lastRender = 0;
  const started = performance.now();

  function resize() {
    const cssW = Math.max(1, window.innerWidth);
    const cssH = Math.max(1, window.innerHeight);
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
      active = ratio < .55;
    }, { threshold: [0, .25, .55, 1] }).observe(cover);
  }

  function frame(now) {
    if (active && !document.hidden && textureReady && now - lastRender >= 22) {
      lastRender = now;
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - started) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
