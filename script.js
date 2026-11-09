const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

(() => {
  const cover = document.querySelector('.wallpaper-cover');
  const canvas = document.getElementById('wallpaper-canvas');
  const particleCanvas = document.getElementById('particle-canvas');
  if (!cover || !canvas || !particleCanvas) return;

  const IMAGE_URL = 'assets/wallpaper/iuno.jpg?v=2';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const pctx = particleCanvas.getContext('2d');
  let visible = true;

  function resize() {
    const r = cover.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    if (particleCanvas.width !== w || particleCanvas.height !== h) {
      particleCanvas.width = w; particleCanvas.height = h;
    }
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

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

  const fireflies = Array.from({ length: 32 }, (_, i) => ({
    x: 0.04 + Math.random() * 0.84,
    y: 0.12 + Math.random() * 0.70,
    r: 0.7 + Math.random() * 1.7,
    speed: 0.35 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 0.026,
    warm: i % 7 === 0
  }));

  const trail = [];

  cover.addEventListener('pointermove', e => {
    const r = cover.getBoundingClientRect();
    if (reduceMotion) return;
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
    const w = particleCanvas.width, h = particleCanvas.height;
    pctx.clearRect(0, 0, w, h);
    if (reduceMotion) return;

    pctx.save();
    pctx.globalCompositeOperation = 'screen';

    for (const p of fireflies) {
      const q = t * p.speed + p.phase;
      const x = (p.x + Math.sin(q * .7) * p.drift) * w;
      const y = (p.y + Math.sin(q * .83) * .012) * h;
      const pulse = .25 + .75 * (.5 + .5 * Math.sin(q * 2.2));
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

  if (reduceMotion) {
    canvas.style.display = 'none';
    return;
  }

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });

  if (!gl) {
    canvas.style.display = 'none';
    const start = performance.now();
    const loop = now => {
      if (visible) drawParticles((now - start) / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return;
  }

  const VERT = [
    'attribute vec2 a_position;',
    'void main(){ gl_Position = vec4(a_position,0.0,1.0); }'
  ].join('\n');

  const FRAG = [
    'precision highp float;',
    'uniform sampler2D u_image;',
    'uniform sampler2D u_bodyMask;',
    'uniform sampler2D u_boatMask;',
    'uniform sampler2D u_waterMask;',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    'const float ASPECT = 1.7777777778;',
    'const float PI = 3.14159265359;',

    'vec2 coverUV(vec2 uv){',
    '  float a = u_resolution.x/u_resolution.y;',
    '  float focusX = .54;',
    '  if(a > ASPECT){',
    '    float visibleY = ASPECT/a;',
    '    uv.y = (uv.y-.5)*visibleY+.5;',
    '  } else {',
    '    float visibleX = a/ASPECT;',
    '    uv.x = (uv.x-.5)*visibleX+focusX;',
    '  }',
    '  return uv;',
    '}',

    'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }',

    'float noise(vec2 p){',
    '  vec2 i=floor(p), f=fract(p);',
    '  f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);',
    '}',

    'vec2 rot(vec2 v,float a){',
    '  float c=cos(a),s=sin(a);',
    '  return vec2(c*v.x-s*v.y,s*v.x+c*v.y);',
    '}',

    'vec2 foliage(vec2 uv,float mask,float phase,float ratio,float scale,float direction,float speed,float strength){',
    '  float aspect = ASPECT*ratio;',
    '  vec2 weights = rot(vec2(1.0/aspect,aspect),direction);',
    '  vec2 p = rot(uv,direction);',
    '  float n = noise(uv/max(scale,.015));',
    '  float ph = (n*PI*2.0 + p.x*10.0 + p.y*5.0)*phase;',
    '  vec4 a = ph + speed*u_time*vec4(1.0,-.16161616,.0083333,-.00019841);',
    '  vec4 b = .4 + ph + speed*u_time*vec4(-.5,.041666666,-.0013888889,.000024801587);',
    '  vec4 sa = sin(a), sb = sin(b);',
    '  float amp = strength*strength*.005*mask;',
    '  return vec2(weights.x*dot(sa,vec4(amp)),weights.y*dot(sb,vec4(amp)));',
    '}',

    'vec2 waterNormal(vec2 uv,float t){',
    '  vec2 c1=(uv+vec2(t*.0225))*1.3;',
    '  vec2 c2=(uv*1.333-vec2(t*.0225))*1.3;',
    '  c1.x*=ASPECT;',
    '  c2.x*=ASPECT;',
    '  vec2 n1=vec2(sin(c1.x*18.0 + sin(c1.y*13.0)),cos(c1.y*20.0 + sin(c1.x*11.0)));',
    '  vec2 n2=vec2(sin(c2.x*15.0 + cos(c2.y*17.0)),cos(c2.y*16.0 + sin(c2.x*14.0)));',
    '  return (n1+n2)*.5;',
    '}',

    'void main(){',
    '  vec2 screenUV=gl_FragCoord.xy/u_resolution.xy;',
    '  screenUV.y=1.0-screenUV.y;',
    '  vec2 base=coverUV(screenUV);',
    '  float water=smoothstep(.03,.78,texture2D(u_waterMask,base).r);',
    '  float body=smoothstep(.05,.88,texture2D(u_bodyMask,base).r);',
    '  float boat=smoothstep(.04,.88,texture2D(u_boatMask,base).r);',
    '  vec2 uv=base;',

    '  vec2 wn=waterNormal(base,u_time);',
    '  uv += wn * (.0036*water);',

    '  vec2 bd=foliage(base,body,.13,.30,.05,1.2485846,5.0,.35);',
    '  uv += bd*.18;',

    '  vec2 bt=foliage(base,boat,.10,1.84,.11,0.0,5.0,.40);',
    '  uv += bt*.34;',

    '  uv=clamp(uv,vec2(.001),vec2(.999));',
    '  vec3 col=texture2D(u_image,uv).rgb;',

    '  float lamp=.5+.5*sin(u_time*1.8+3.0);',
    '  float nearP=.5+.5*sin(u_time*1.19+1.55);',
    '  vec2 q=(base-vec2(.17,.19))/vec2(.18,.20);',
    '  float leftGlow=exp(-dot(q,q)*2.2);',
    '  vec2 qw=(base-vec2(.42,.81))/vec2(.24,.16);',
    '  float waterGlow=exp(-dot(qw,qw)*2.4);',
    '  col*=1.0+leftGlow*lamp*.025;',
    '  col+=vec3(.06,.12,.22)*waterGlow*nearP*.03;',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);

    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }

    return s;
  }

  const vs = shader(gl.VERTEX_SHADER, VERT);
  const fs = shader(gl.FRAGMENT_SHADER, FRAG);

  if (!vs || !fs) {
    canvas.style.display = 'none';
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(prog));
    canvas.style.display = 'none';
    return;
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
    gl.STATIC_DRAW
  );

  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uImage = gl.getUniformLocation(prog, 'u_image');
  const uBody = gl.getUniformLocation(prog, 'u_bodyMask');
  const uBoat = gl.getUniformLocation(prog, 'u_boatMask');
  const uWater = gl.getUniformLocation(prog, 'u_waterMask');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uTime = gl.getUniformLocation(prog, 'u_time');

  function loadTex(url, unit, uniform) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          const tex = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.uniform1i(uniform, unit);
          resolve(tex);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = reject;
      img.src = url;
    });
  }

  Promise.all([
    loadTex(IMAGE_URL, 0, uImage),
    loadTex('assets/wallpaper/body-mask.png?v=2', 1, uBody),
    loadTex('assets/wallpaper/boat-mask.png?v=2', 2, uBoat),
    loadTex('assets/wallpaper/water-mask.png?v=2', 3, uWater)
  ]).then(() => {
    canvas.style.display = 'block';
    const start = performance.now();

    const frame = now => {
      if (visible) {
        resize();
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        drawParticles((now - start) / 1000);
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }).catch(err => {
    console.info('Wallpaper WebGL fallback:', err);
    canvas.style.display = 'none';

    const start = performance.now();
    const frame = now => {
      if (visible) drawParticles((now - start) / 1000);
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  });
})();
