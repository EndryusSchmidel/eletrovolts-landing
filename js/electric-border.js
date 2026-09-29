/* =========================================================
   Borda elétrica (teste)
   Contorno de arco elétrico animado em volta dos elementos com
   a classe .btn--electric, portado do ElectricBorder do React Bits
   (canvas 2D, sem dependências).

   - Para desligar de vez: remova a tag <script src="js/electric-border.js">
     e a classe btn--electric do botão
   - Para comparar sem o efeito: abra o site com ?eb=0
   ========================================================= */
(function () {
  var CONFIG = {
    color: '#C8702B',     // halo do arco (laranja --copper do site)
    coreColor: '#FFE8CF', // núcleo "incandescente" do arco
    speed: 0.7,           // mais lento = mais suave
    chaos: 0.03,          // intensidade da distorção (0 = borda lisa)
    waveLength: 520,      // px de contorno por ciclo base do ruído (maior = arco mais fluido)
    fps: 30,              // quadros por segundo (leve no celular)
    offset: 30            // folga (px) do canvas em volta do botão
  };
  var OCTAVES = 6, LACUNARITY = 1.6, GAIN = 0.7, FREQUENCY = 10, DISPLACEMENT = 60;

  var elements = document.querySelectorAll('.btn--electric');
  if (!elements.length) return;
  if (/[?&]eb=0(&|$)/.test(location.search)) {
    elements.forEach(function (el) { el.classList.remove('btn--electric'); });
    return;
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function random(x) { return (Math.sin(x * 12.9898) * 43758.5453) % 1; }

  function noise2D(x, y) {
    var i = Math.floor(x), j = Math.floor(y);
    var fx = x - i, fy = y - j;
    var a = random(i + j * 57);
    var b = random(i + 1 + j * 57);
    var c = random(i + (j + 1) * 57);
    var d = random(i + 1 + (j + 1) * 57);
    var ux = fx * fx * (3 - 2 * fx);
    var uy = fy * fy * (3 - 2 * fy);
    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
  }

  // Soma de oitavas de ruído (a 1ª oitava é "achatada", como no original)
  function octavedNoise(x, time, seed) {
    var y = 0, amplitude = CONFIG.chaos, frequency = FREQUENCY;
    for (var i = 0; i < OCTAVES; i++) {
      if (i > 0) y += amplitude * noise2D(frequency * x + seed * 100, time * frequency * 0.3);
      frequency *= LACUNARITY;
      amplitude *= GAIN;
    }
    return y;
  }

  function cornerPoint(cx, cy, r, startAngle, progress) {
    var angle = startAngle + progress * Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  // Ponto t (0–1) ao longo do perímetro de um retângulo arredondado
  function roundedRectPoint(t, left, top, width, height, r) {
    var sw = width - 2 * r, sh = height - 2 * r, arc = Math.PI * r / 2;
    var dist = t * (2 * sw + 2 * sh + 4 * arc);
    if ((dist -= 0) <= sw) return { x: left + r + dist, y: top };
    if ((dist -= sw) <= arc) return cornerPoint(left + width - r, top + r, r, -Math.PI / 2, dist / arc);
    if ((dist -= arc) <= sh) return { x: left + width, y: top + r + dist };
    if ((dist -= sh) <= arc) return cornerPoint(left + width - r, top + height - r, r, 0, dist / arc);
    if ((dist -= arc) <= sw) return { x: left + width - r - dist, y: top + height };
    if ((dist -= sw) <= arc) return cornerPoint(left + r, top + height - r, r, Math.PI / 2, dist / arc);
    if ((dist -= arc) <= sh) return { x: left, y: top + height - r - dist };
    dist -= sh;
    return cornerPoint(left + r, top + r, r, Math.PI, Math.min(dist / arc, 1));
  }

  function setup(el) {
    var canvas = document.createElement('canvas');
    canvas.className = 'eb-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width = 0, height = 0, radius = 0, dpr = 1;
    var time = 0, last = 0, raf = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = el.offsetWidth;
      height = el.offsetHeight;
      radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, Math.min(width, height) / 2);
      var cw = width + CONFIG.offset * 2, ch = height + CONFIG.offset * 2;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      canvas.style.left = -(CONFIG.offset + el.clientLeft) + 'px';
      canvas.style.top = -(CONFIG.offset + el.clientTop) + 'px';
    }

    function draw(now) {
      raf = requestAnimationFrame(draw);
      if (now - last < 1000 / CONFIG.fps - 2) return; // limita a ~30 fps
      time += Math.min((now - last) / 1000, 0.1) * CONFIG.speed;
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width + CONFIG.offset * 2, height + CONFIG.offset * 2);

      var perimeter = 2 * (width + height) + 2 * Math.PI * radius;
      var samples = Math.max(Math.floor(perimeter / 3), 8);
      var path = new Path2D();
      var firstX = 0, firstY = 0;
      for (var i = 0; i <= samples; i++) {
        var t = i / samples;
        var p = roundedRectPoint(t, CONFIG.offset, CONFIG.offset, width, height, radius);
        // ruído pela distância real no contorno: mesma "textura" em qualquer tamanho de botão
        var along = t * perimeter / CONFIG.waveLength;
        var nx = octavedNoise(along, time, 0);
        var ny = octavedNoise(along, time, 1);
        if (i === 0) { firstX = nx; firstY = ny; }
        // funde o fim com o começo para o contorno fechar sem "degrau"
        var seam = Math.max(0, (t - 0.94) / 0.06);
        seam = seam * seam * (3 - 2 * seam);
        var x = p.x + (nx + (firstX - nx) * seam) * DISPLACEMENT;
        var y = p.y + (ny + (firstY - ny) * seam) * DISPLACEMENT;
        if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
      }
      path.closePath();

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // halo laranja em duas passadas (sem shadowBlur, que pesa no celular)
      ctx.strokeStyle = CONFIG.color;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 7;
      ctx.stroke(path);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.stroke(path);
      // núcleo claro
      ctx.globalAlpha = 1;
      ctx.strokeStyle = CONFIG.coreColor;
      ctx.lineWidth = 1.2;
      ctx.stroke(path);
    }

    function start() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(draw);
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(el);
    else window.addEventListener('resize', resize);

    // Só anima enquanto o botão está na tela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start(); else stop();
      }).observe(el);
    } else {
      start();
    }
  }

  elements.forEach(setup);
})();
