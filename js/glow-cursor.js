/* =========================================================
   Glow cursor elétrico (teste)
   Rastro luminoso que segue o mouse, portado do GlowCursor do
   React Bits (WebGL) sem dependências, com "eletricidade":
   o rastro vira um arco que estala em zigue-zague, cintila e
   solta faíscas enquanto o mouse se move.

   - Para desligar de vez: remova a tag <script src="js/glow-cursor.js">
   - Para comparar sem o efeito: abra o site com ?glow=0
   ========================================================= */
(function () {
  var CONFIG = {
    color: '#C8702B',          // cor da cabeça do rastro (laranja --copper do site)
    secondaryColor: '#C8702B', // cor da cauda
    trailWidth: 3,
    trailLength: 10,
    trailTaper: 0.8,
    followSpeed: 0.16,
    glowIntensity: 1.9,
    glowSpread: 1.2,
    hotspot: 0.65,
    brightness: 1.25,
    pulseSpeed: 1.1,
    idleTimeout: 700,          // ms parado até o rastro sumir
    fadeDuration: 900,
    maxDevicePixelRatio: 1.5,
    // eletricidade
    jitter: 7,                 // amplitude (px) do zigue-zague do arco
    crackleMs: 45,             // intervalo entre "estalos" (novo zigue-zague + cintilação)
    sparkChance: 0.4,          // chance de faísca por estalo, com o mouse em movimento
    sparkLifeMs: 200
  };

  if (/[?&]glow=0(&|$)/.test(location.search)) return;
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MAX_POINTS = 16;
  var MAX_SPARKS = 4;

  var VERTEX_SHADER = [
    'attribute vec2 position;',
    'void main() { gl_Position = vec4(position, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENT_SHADER = [
    'precision highp float;',
    '#define MAX_POINTS ' + MAX_POINTS,
    '#define MAX_SPARKS ' + MAX_SPARKS,
    'uniform float uDpr;',
    'uniform vec2 uPoints[MAX_POINTS];',
    'uniform float uPointCount;',
    'uniform vec3 uColor;',
    'uniform vec3 uSecondaryColor;',
    'uniform float uTrailWidth;',
    'uniform float uTaper;',
    'uniform float uGlowIntensity;',
    'uniform float uGlowSpread;',
    'uniform float uHotspot;',
    'uniform float uBrightness;',
    'uniform float uPulseSpeed;',
    'uniform float uTime;',
    'uniform float uFade;',
    'uniform float uFlicker;',
    'uniform vec2 uSparks[MAX_SPARKS * 2];',
    'uniform float uSparkLife[MAX_SPARKS];',
    '',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
    '',
    'void main() {',
    '  vec2 pixel = gl_FragCoord.xy / uDpr;',
    '  float denominator = max(uPointCount - 1.0, 1.0);',
    '  float strongest = 0.0;',
    '  float strongestCore = 0.0;',
    '  float colorWeight = 0.0;',
    '  vec3 colorSum = vec3(0.0);',
    '',
    '  for (int i = 0; i < MAX_POINTS - 1; i++) {',
    '    float index = float(i);',
    '    float active = 1.0 - step(uPointCount - 1.0, index);',
    '    vec2 start = uPoints[i];',
    '    vec2 end = uPoints[i + 1];',
    '    vec2 toPixel = pixel - start;',
    '    vec2 segment = end - start;',
    '    float along = clamp(dot(toPixel, segment) / max(dot(segment, segment), 0.0001), 0.0, 1.0);',
    '    float progress = clamp((index + along) / denominator, 0.0, 1.0);',
    '    float life = pow(max(1.0 - progress, 0.0), mix(0.55, 1.25, uTaper));',
    '    float width = uTrailWidth * mix(1.0, 0.25, pow(progress, mix(0.55, 1.6, uTaper)));',
    '    float distanceToTrail = length(toPixel - segment * along);',
    '    float falloff = max(width * (0.8 + uGlowSpread * 1.4), 0.5);',
    '    float beam = min(1.0, (falloff * falloff) / (distanceToTrail * distanceToTrail + falloff * falloff));',
    '    beam *= 1.0 - smoothstep(falloff * 3.0, falloff * 9.0, distanceToTrail);', // halo com alcance limitado
    '    float core = exp(-pow(distanceToTrail / max(width, 0.5), 2.0) * 2.5);',
    '    float pulseAmount = min(abs(uPulseSpeed), 1.0);',
    '    float pulse = 1.0 + sin(uTime * uPulseSpeed * 3.0 - progress * 11.0) * 0.16 * pulseAmount;',
    '    float intensity = (core + beam * uGlowIntensity * 0.55) * life * pulse * active;',
    '    vec3 segmentColor = mix(uColor, uSecondaryColor, progress);',
    '    strongest = max(strongest, intensity);',
    '    strongestCore = max(strongestCore, core * life * active);',
    '    colorSum += segmentColor * intensity;',
    '    colorWeight += intensity;',
    '  }',
    '',
    // Faíscas: segmentos finos e curtos, quase brancos
    '  for (int s = 0; s < MAX_SPARKS; s++) {',
    '    float sparkLife = uSparkLife[s];',
    '    vec2 a = uSparks[s * 2];',
    '    vec2 ab = uSparks[s * 2 + 1] - a;',
    '    vec2 ap = pixel - a;',
    '    float t = clamp(dot(ap, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);',
    '    float d = length(ap - ab * t);',
    '    float w = max(uTrailWidth * 0.4, 0.6);',
    '    float f = w * 2.5;',
    '    float core = exp(-pow(d / w, 2.0) * 2.5);',
    '    float beam = min(1.0, (f * f) / (d * d + f * f)) * (1.0 - smoothstep(f * 3.0, f * 9.0, d));',
    '    float intensity = (core + beam * 0.45) * sparkLife * (1.0 - t * 0.7);',
    '    strongest = max(strongest, intensity);',
    '    strongestCore = max(strongestCore, core * sparkLife);',
    '    colorSum += mix(uColor, vec3(1.0), 0.55) * intensity;',
    '    colorWeight += intensity;',
    '  }',
    '',
    '  float alpha = strongest * uBrightness * uFlicker * uFade;',
    '  alpha = clamp(alpha + (hash(gl_FragCoord.xy) - 0.5) / 255.0, 0.0, 1.0);', // dithering contra banding
    '  if (alpha < 0.5 / 255.0) discard;',
    '  vec3 color = colorSum / max(colorWeight, 0.0001);',
    '  color = mix(color, vec3(1.0), smoothstep(0.45, 1.0, strongestCore) * uHotspot * 0.35);',
    '  gl_FragColor = vec4(color * alpha, alpha);', // alfa pré-multiplicado
    '}'
  ].join('\n');

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80;';
  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return;

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  var program = gl.createProgram();
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (err) {
    if (window.console) console.warn('glow-cursor desativado:', err);
    return;
  }
  gl.useProgram(program);
  document.body.appendChild(canvas);

  // Triângulo que cobre a tela inteira
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var positionLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  var u = {};
  ['uDpr', 'uPoints', 'uPointCount', 'uColor', 'uSecondaryColor', 'uTrailWidth', 'uTaper', 'uGlowIntensity',
    'uGlowSpread', 'uHotspot', 'uBrightness', 'uPulseSpeed', 'uTime', 'uFade', 'uFlicker', 'uSparks', 'uSparkLife'
  ].forEach(function (name) { u[name] = gl.getUniformLocation(program, name); });

  function hexToRgb(hex) {
    var v = String(hex).replace('#', '');
    if (v.length === 3) v = v.replace(/./g, '$&$&');
    var n = parseInt(v, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  var count = clamp(Math.round(CONFIG.trailLength), 2, MAX_POINTS);
  var falloff = CONFIG.trailWidth * (0.8 + CONFIG.glowSpread * 1.4);
  var reach = Math.ceil(falloff * 9); // alcance do halo (px), igual ao limite no shader

  gl.uniform1f(u.uPointCount, count);
  gl.uniform3fv(u.uColor, hexToRgb(CONFIG.color));
  gl.uniform3fv(u.uSecondaryColor, hexToRgb(CONFIG.secondaryColor));
  gl.uniform1f(u.uTrailWidth, CONFIG.trailWidth);
  gl.uniform1f(u.uTaper, CONFIG.trailTaper);
  gl.uniform1f(u.uGlowIntensity, CONFIG.glowIntensity);
  gl.uniform1f(u.uGlowSpread, CONFIG.glowSpread);
  gl.uniform1f(u.uHotspot, CONFIG.hotspot);
  gl.uniform1f(u.uBrightness, CONFIG.brightness);
  gl.uniform1f(u.uPulseSpeed, CONFIG.pulseSpeed);

  var points = [];
  for (var i = 0; i < MAX_POINTS; i++) points.push({ x: 0, y: 0 });
  var jitter = new Float32Array(MAX_POINTS);
  var pointData = new Float32Array(MAX_POINTS * 2);
  var sparks = [];
  var sparkData = new Float32Array(MAX_SPARKS * 4);
  var sparkLife = new Float32Array(MAX_SPARKS);
  var target = { x: 0, y: 0 };
  var head = { x: 0, y: 0 };
  var width = 1, height = 1, dpr = 1;
  var initialized = false, inside = false, running = false;
  var fade = 0, flicker = 1, charge = 0;
  var lastInput = 0, lastFrame = 0, lastCrackle = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDevicePixelRatio);
    width = Math.max(canvas.clientWidth, 1);
    height = Math.max(canvas.clientHeight, 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(u.uDpr, dpr);
  }

  function start() {
    if (running) return;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    var x = e.clientX, y = height - e.clientY; // WebGL: origem embaixo
    if (!initialized) {
      head.x = target.x = x; head.y = target.y = y;
      for (var i = 0; i < MAX_POINTS; i++) { points[i].x = x; points[i].y = y; }
      initialized = true;
      fade = 1;
    }
    target.x = x; target.y = y;
    inside = true;
    lastInput = performance.now();
    start();
  }
  function onLeave() { inside = false; lastInput = performance.now(); }

  // Novo zigue-zague, cintilação e eventualmente uma faísca
  function crackle() {
    for (var i = 0; i < count; i++) {
      var shape = Math.sin(Math.PI * i / (count - 1) * 0.9); // cabeça presa no cursor
      jitter[i] = (Math.random() * 2 - 1) * CONFIG.jitter * shape;
    }
    flicker = 0.78 + Math.random() * 0.34;
    if (charge > 0.25 && Math.random() < CONFIG.sparkChance) {
      var k = 1 + Math.floor(Math.random() * (count - 2));
      var p = points[k], q = points[k - 1];
      var dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
      var side = Math.random() < 0.5 ? -1 : 1;
      var ang = Math.atan2(dy, dx) + side * (0.6 + Math.random() * 0.9);
      var size = 7 + Math.random() * 12;
      var ox = p.x + (-dy / len) * jitter[k], oy = p.y + (dx / len) * jitter[k];
      sparks.push({ ax: ox, ay: oy, bx: ox + Math.cos(ang) * size, by: oy + Math.sin(ang) * size, born: performance.now() });
      if (sparks.length > MAX_SPARKS) sparks.shift();
    }
  }

  function frame(now) {
    var delta = Math.min((now - lastFrame) / 16.667, 3);
    lastFrame = now;

    // Cabeça segue o mouse; cada ponto segue o anterior (corrente)
    var headEase = 1 - Math.pow(1 - clamp(CONFIG.followSpeed, 0.01, 0.99), delta);
    var chainEase = 1 - Math.pow(1 - clamp(0.28 + CONFIG.followSpeed * 0.35, 0.08, 0.92), delta);
    head.x += (target.x - head.x) * headEase;
    head.y += (target.y - head.y) * headEase;
    points[0].x = head.x; points[0].y = head.y;
    for (var i = 1; i < MAX_POINTS; i++) {
      points[i].x += (points[i - 1].x - points[i].x) * chainEase;
      points[i].y += (points[i - 1].y - points[i].y) * chainEase;
    }

    // "Carga": quanto o rastro está esticado (mouse em movimento)
    var span = Math.hypot(points[0].x - points[count - 1].x, points[0].y - points[count - 1].y);
    charge = clamp(span / 60, 0, 1);
    if (now - lastCrackle > CONFIG.crackleMs) { lastCrackle = now; crackle(); }

    // Pontos deslocados na perpendicular → arco elétrico
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (i = 0; i < MAX_POINTS; i++) {
      var p = points[Math.min(i, count - 1)];
      var a = points[Math.max(Math.min(i, count - 1) - 1, 0)];
      var b = points[Math.min(i + 1, count - 1)];
      var dx = a.x - b.x, dy = a.y - b.y, len = Math.hypot(dx, dy);
      var off = i < count && len > 0.01 ? jitter[i] * charge : 0;
      var x = p.x + (len > 0.01 ? -dy / len : 0) * off;
      var y = p.y + (len > 0.01 ? dx / len : 0) * off;
      pointData[i * 2] = x; pointData[i * 2 + 1] = y;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }

    for (i = 0; i < MAX_SPARKS; i++) {
      var s = sparks[i];
      var life = s ? 1 - (now - s.born) / CONFIG.sparkLifeMs : 0;
      sparkLife[i] = life > 0 ? life * (0.6 + Math.random() * 0.4) : 0;
      if (s && life > 0) {
        sparkData[i * 4] = s.ax; sparkData[i * 4 + 1] = s.ay;
        sparkData[i * 4 + 2] = s.bx; sparkData[i * 4 + 3] = s.by;
      }
    }
    sparks = sparks.filter(function (s) { return now - s.born < CONFIG.sparkLifeMs; });

    var shouldFade = !inside || now - lastInput > CONFIG.idleTimeout;
    var fadeStep = (16.667 * delta) / Math.max(CONFIG.fadeDuration, 16);
    fade += ((initialized && !shouldFade ? 1 : 0) - fade) * Math.min(1, fadeStep * 7);

    gl.uniform2fv(u.uPoints, pointData);
    gl.uniform2fv(u.uSparks, sparkData);
    gl.uniform1fv(u.uSparkLife, sparkLife);
    gl.uniform1f(u.uTime, now * 0.001);
    gl.uniform1f(u.uFade, fade);
    gl.uniform1f(u.uFlicker, flicker);

    // Limpa tudo e desenha só na região do rastro (+ alcance do brilho)
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var pad = reach + CONFIG.jitter + 24;
    var sx = Math.max(Math.floor((minX - pad) * dpr), 0);
    var sy = Math.max(Math.floor((minY - pad) * dpr), 0);
    var sw = Math.min(Math.ceil((maxX + pad) * dpr), canvas.width) - sx;
    var sh = Math.min(Math.ceil((maxY + pad) * dpr), canvas.height) - sy;
    if (fade > 0.002 && sw > 0 && sh > 0) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(sx, sy, sw, sh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Parado e apagado: para o loop até o próximo movimento
    if (shouldFade && fade < 0.002 && !sparks.length) { running = false; return; }
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeave);
  window.addEventListener('blur', onLeave);
})();
