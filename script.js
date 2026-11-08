const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

(() => {
  const IMAGE_URL = "https://images.steamusercontent.com/ugc/11997909639098621526/8DC7F56419FFAA39ADE80567B878B94A3C2D0E54/?ima=fit&imcolor=%23000000&imh=2160&impolicy=Letterbox&imw=3840&letterbox=true";
  const cover = document.querySelector('.wallpaper-cover');
  const canvas = document.getElementById('wallpaper-canvas');
  const particleCanvas = document.getElementById('particle-canvas');
  if (!cover || !canvas || !particleCanvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particleCtx = particleCanvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let visible = true;
  let mouse = { x: .5, y: .5, tx: .5, ty: .5 };
  let pointerInside = false;

  const sizeCanvases = () => {
    const rect = cover.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (particleCanvas.width !== w || particleCanvas.height !== h) {
      particleCanvas.width = w;
      particleCanvas.height = h;
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  sizeCanvases();
  window.addEventListener('resize', sizeCanvases, { passive: true });

  new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
  }, { threshold: .01 }).observe(cover);

  const fireflies = Array.from({ length: 34 }, (_, i) => ({
    x: .03 + Math.random() * .84,
    y: .12 + Math.random() * .72,
    r: .7 + Math.random() * 1.8,
    speed: .35 + Math.random() * .75,
    phase: Math.random() * Math.PI * 2,
    drift: (Math.random() - .5) * .03,
    warm: i % 7 === 0
  }));
  const trail = [];

  function addTrail(x, y) {
    if (reduceMotion) return;
    const sx = particleCanvas.width / cover.clientWidth;
    const sy = particleCanvas.height / cover.clientHeight;
    for (let i = 0; i < 2; i++) {
      trail.push({
        x: x * sx + (Math.random() - .5) * 8,
        y: y * sy + (Math.random() - .5) * 8,
        vx: (Math.random() - .5) * .28,
        vy: -.18 - Math.random() * .32,
        life: 1,
        size: 1 + Math.random() * 2.2
      });
    }
    if (trail.length > 120) trail.splice(0, trail.length - 120);
  }

  cover.addEventListener('pointermove', event => {
    const r = cover.getBoundingClientRect();
    mouse.tx = Math.max(0, Math.min(1, (event.clientX - r.left) / r.width));
    mouse.ty = Math.max(0, Math.min(1, (event.clientY - r.top) / r.height));
    pointerInside = true;
    addTrail(event.clientX - r.left, event.clientY - r.top);
  }, { passive: true });

  cover.addEventListener('pointerleave', () => {
    mouse.tx = .5;
    mouse.ty = .5;
    pointerInside = false;
  });

  function drawParticles(time) {
    if (!particleCtx) return;
    const w = particleCanvas.width;
    const h = particleCanvas.height;
    particleCtx.clearRect(0, 0, w, h);
    if (reduceMotion) return;

    particleCtx.save();
    particleCtx.globalCompositeOperation = 'screen';

    for (const p of fireflies) {
      const phase = time * p.speed + p.phase;
      const x = (p.x + Math.sin(phase * .7) * p.drift) * w;
      const y = (p.y + Math.sin(phase * .85) * .014) * h;
      const pulse = .26 + .74 * (.5 + .5 * Math.sin(phase * 2.3));
      const radius = p.r * dpr;
      const g = particleCtx.createRadialGradient(x, y, 0, x, y, radius * 8);
      if (p.warm) {
        g.addColorStop(0, `rgba(255,246,191,${.82 * pulse})`);
        g.addColorStop(.22, `rgba(255,225,134,${.36 * pulse})`);
      } else {
        g.addColorStop(0, `rgba(226,248,255,${.86 * pulse})`);
        g.addColorStop(.24, `rgba(132,210,255,${.36 * pulse})`);
      }
      g.addColorStop(1, 'rgba(84,164,255,0)');
      particleCtx.fillStyle = g;
      particleCtx.beginPath();
      particleCtx.arc(x, y, radius * 8, 0, Math.PI * 2);
      particleCtx.fill();
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
      const g = particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5 * dpr);
      g.addColorStop(0, `rgba(226,248,255,${.72 * p.life})`);
      g.addColorStop(.32, `rgba(125,207,255,${.34 * p.life})`);
      g.addColorStop(1, 'rgba(90,180,255,0)');
      particleCtx.fillStyle = g;
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.size * 5 * dpr, 0, Math.PI * 2);
      particleCtx.fill();
    }
    particleCtx.restore();
  }

  // WebGL is the high-fidelity layer. If Steam blocks canvas access,
  // the animated CSS layers above remain visible as the fallback.
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });

  if (!gl || reduceMotion) {
    canvas.style.display = 'none';
    let start = performance.now();
    const loop = now => {
      if (visible) drawParticles((now - start) / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return;
  }

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    const float IMAGE_ASPECT = 1.7777777778;

    float ellipseMask(vec2 uv, vec2 center, vec2 radius) {
      vec2 q = (uv - center) / radius;
      return exp(-dot(q, q) * 2.8);
    }

    vec2 coverUV(vec2 uv) {
      float screenAspect = u_resolution.x / u_resolution.y;
      float focusX = 0.54;
      if (screenAspect > IMAGE_ASPECT) {
        float visibleY = IMAGE_ASPECT / screenAspect;
        uv.y = (uv.y - 0.5) * visibleY + 0.5;
      } else {
        float visibleX = screenAspect / IMAGE_ASPECT;
        uv.x = (uv.x - 0.5) * visibleX + focusX;
      }
      return uv;
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                 mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
    }

    void main() {
      vec2 screenUV = gl_FragCoord.xy / u_resolution.xy;
      screenUV.y = 1.0 - screenUV.y;
      vec2 uv = coverUV(screenUV);

      vec2 mouse = (u_mouse - .5) * vec2(1.0, -1.0);
      uv += mouse * .0045;

      float hair = ellipseMask(uv, vec2(.65, .37), vec2(.14, .22));
      float ribbons = max(
        ellipseMask(uv, vec2(.72, .57), vec2(.25, .27)),
        ellipseMask(uv, vec2(.55, .48), vec2(.17, .20))
      );
      float water = smoothstep(.62, .82, uv.y);

      // Keep all water displacement off the character.
      // The exclusion uses two overlapping soft ellipses that cover the torso,
      // skirt/legs and the lower-right foreground character silhouette.
      float characterBody = ellipseMask(uv, vec2(.64, .53), vec2(.27, .39));
      float characterLower = ellipseMask(uv, vec2(.61, .78), vec2(.24, .25));
      float characterMask = max(characterBody, characterLower);
      water *= 1.0 - smoothstep(.08, .48, characterMask);

      vec2 disp = vec2(0.0);
      disp.x += hair * sin(u_time * 2.15 + uv.y * 43.0) * .00145;
      disp.y += hair * cos(u_time * 1.8 + uv.x * 27.0) * .00055;

      disp.x += ribbons * sin(u_time * 3.7 + uv.x * 24.0 + uv.y * 19.0) * .00185;
      disp.y += ribbons * cos(u_time * 3.1 + uv.x * 22.0) * .00078;

      // Water and ripple displacement disabled.
      // Keep the image geometry stable; motion now comes from subtle
      // non-water layers, lighting pulses and particles only.
      uv += disp * 0.0;
      uv = clamp(uv, vec2(.001), vec2(.999));
      vec3 col = texture2D(u_image, uv).rgb;

      float lantern = ellipseMask(uv, vec2(.18, .19), vec2(.20, .20));
      float waterGlow = ellipseMask(uv, vec2(.43, .80), vec2(.22, .18));
      float pulseA = .5 + .5 * sin(u_time * 1.18 + 1.55);
      float pulseB = .5 + .5 * sin(u_time * 1.72 + 3.0);
      col *= 1.0 + lantern * pulseA * .045;
      col += vec3(.12, .22, .42) * waterGlow * pulseB * .045;

      float shimmer = noise(vec2(uv.x * 125.0 + u_time * .25, uv.y * 48.0 - u_time * .19));
      col += vec3(.10, .18, .31) * shimmer * water * .025;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const makeShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = makeShader(gl.VERTEX_SHADER, vertexSource);
  const fs = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) {
    canvas.style.display = 'none';
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    canvas.style.display = 'none';
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1,
    -1,1, 1,-1, 1,1
  ]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uMouse = gl.getUniformLocation(program, 'u_mouse');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uImage = gl.getUniformLocation(program, 'u_image');

  function loadTexture() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const texture = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.uniform1i(uImage, 0);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = IMAGE_URL;
    });
  }

  loadTexture().then(() => {
    const start = performance.now();
    const frame = now => {
      if (visible) {
        sizeCanvases();
        gl.viewport(0, 0, canvas.width, canvas.height);
        mouse.x += (mouse.tx - mouse.x) * .045;
        mouse.y += (mouse.ty - mouse.y) * .045;
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        drawParticles((now - start) / 1000);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }).catch(error => {
    console.info('WebGL wallpaper fallback active:', error);
    canvas.style.display = 'none';
    const start = performance.now();
    const frame = now => {
      if (visible) drawParticles((now - start) / 1000);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
})();
