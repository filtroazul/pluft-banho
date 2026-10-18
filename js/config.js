/* pluft: configuração, paleta e utilidades.
   tudo no namespace global P (sem build, funciona com <script> comum). */
(function () {
  const P = (window.P = window.P || {});

  /* oklch -> #rrggbb (canvas não precisa suportar oklch) */
  P.ok = function (L, C, hDeg, alpha) {
    const h = (hDeg * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    const g = (x) => {
      x = Math.max(0, Math.min(1, x));
      return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255);
    };
    const [r, gg, bb] = lin.map(g);
    if (alpha != null && alpha < 1) return `rgba(${r},${gg},${bb},${alpha})`;
    return '#' + [r, gg, bb].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  const ok = P.ok;

  /* paleta: céu azul-cobalto (hue ~262), Pluft rosa-chiclete (hue ~356) como única cor quente forte,
     estrelas douradas. o css repete os mesmos números em oklch() no :root. */
  P.C = {
    skyTop: ok(0.15, 0.06, 264),
    skyMid: ok(0.26, 0.1, 268),
    skyLow: ok(0.4, 0.125, 292),
    glow: ok(0.55, 0.14, 330),
    moon: ok(0.95, 0.035, 95),
    moonShade: ok(0.84, 0.05, 90),
    star: ok(0.96, 0.04, 95),
    gold: ok(0.9, 0.16, 90),
    goldDeep: ok(0.78, 0.15, 75),
    hillFar: ok(0.27, 0.075, 280),
    hillMid: ok(0.22, 0.07, 268),
    grassTop: ok(0.34, 0.08, 172),
    grassBot: ok(0.2, 0.06, 185),
    grassLit: ok(0.46, 0.1, 165),
    soil: ok(0.36, 0.06, 55),
    soilLight: ok(0.47, 0.07, 60),
    soilDark: ok(0.19, 0.045, 40),
    soilDeep: ok(0.13, 0.035, 35),
    pink: ok(0.82, 0.135, 356),
    pinkShade: ok(0.68, 0.185, 356),
    pinkLight: ok(0.92, 0.07, 356),
    belly: ok(0.94, 0.055, 12),
    leg: ok(0.72, 0.17, 356),
    blush: ok(0.7, 0.19, 20),
    outline: ok(0.27, 0.09, 340),
    eyeWhite: ok(0.99, 0.01, 350),
    pupil: ok(0.22, 0.07, 330),
    tongue: ok(0.7, 0.18, 15),
    paper: ok(0.97, 0.015, 350),
    paperShade: ok(0.88, 0.03, 350),
    ink: ok(0.4, 0.07, 340),
    sweat: ok(0.88, 0.07, 225),
    heart: ok(0.68, 0.2, 10),
    cap: ok(0.97, 0.03, 350),
    firefly: ok(0.92, 0.15, 105),
  };

  P.CFG = {
    /* cor do fundo chapado das folhas de sprite (chroma key em tempo de execução).
       o Pluft é rosa, então o fundo é VERDE puro (#00ff00) e não magenta. */
    spriteDir: 'img/pluft/',
    spriteHeight: 196, // altura (em unidades do palco) da célula do sprite; ajustar quando a arte chegar
    spriteFootPad: 0.05, // fração da altura da célula entre o pé do personagem e a borda de baixo
    musica: 'musica.mp3', // opcional: se não existir, toca uma trilha sintetizada
    fps: 8,
  };

  /* helpers */
  /* mistura duas cores '#rrggbb' */
  P.mix = (a, b, t) => {
    const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    const m = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
    return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')';
  };
  P.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  P.lerp = (a, b, t) => a + (b - a) * t;
  P.TAU = Math.PI * 2;
  P.nz = (a, b) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  P.easeOut = (t) => 1 - Math.pow(1 - t, 3);
  P.easeIn = (t) => t * t * t;
  P.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  P.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const q = new URLSearchParams(location.search);
  P.Q = { fase: q.get('fase'), sprites: q.get('sprites') !== '0', fast: q.get('rapido') === '1' };
})();
