/* pluft 3: o banho. chuveiro (bolhas, bumbum, susto) e toalha (a cortina que tapa a câmera).
   as duas cenas dividem o mesmo estado (ST) e o mesmo desenho, porque o pluft não sai do box entre uma e outra.
   cenário: ROOMS.banheiro em world.js. o pluft fica de pé no box, em x=180, pés em L.floor+20. */
(function () {
  const P = window.P, E = P.E, G = E.G, pl = E.pl, L = E.L, T = E.T, au = E.au, Wd = E.Wd, C = P.C, ok = P.ok;
  const TAU = P.TAU, clamp = P.clamp, nz = P.nz;
  const { say, sayAll, quip, hint, cap, wait, until } = E;
  const fo = P.fillOut, rr = P.rrect, COL = Wd.COL;
  P.scenes = P.scenes || {};

  const SX0 = 66, SX1 = 294, CX = 180;
  const headPos = () => ({ x: CX, y: Math.round(L.H * 0.17) });
  const rackPos = () => ({ x: 326, y: Math.round(L.H * 0.34) });

  let ST = null;
  const newST = () => ({
    water: false, k: 1, fog: 1, bubbles: [], popped: 0, need: 99, phase: 'bubbles', armed: false, hum: false, snd: null,
    towelGone: false, fly: null, hintAt: 0, cur: { edge: 9999, live: false, auto: false },
  });

  /* ---------- as bolhas de censura ---------- */
  function makeBubbles() {
    const list = [], cy = -52;
    const mk = (x, y, r, i) => ({ lx: x, ly: y, r: r * pl.s, ph: nz(i, 31) * 6, on: true, free: false, x: 0, y: 0, vx: 0, vy: 0 });
    const big = [[-52, 0], [-26, -6], [0, -4], [26, -6], [52, 0], [-40, 18], [-14, 16], [14, 16], [40, 18], [-38, -18], [-12, -22], [12, -22], [38, -18]];
    big.forEach(([x, y], i) => list.push(mk(x, cy + y, 15 + nz(i, 7) * 5, i)));
    for (let i = 0; i < 14; i++) {
      const a = nz(i, 21) * TAU, d = Math.sqrt(nz(i, 22));
      list.push(mk(Math.cos(a) * d * 66, cy + Math.sin(a) * d * 30, 7 + nz(i, 23) * 6, i + 40));
    }
    list.forEach((b) => { b.x = pl.x + b.lx * pl.s; b.y = pl.y + b.ly * pl.s; });
    return list;
  }

  function popBubble(b) {
    b.on = false; ST.popped++;
    au.bubble();
    Wd.ring(G.fx, b.x, b.y, b.r * 0.6, b.r * 1.9, 'rgba(255,255,255,.9)', 0.3);
    Wd.drops(G.fx, b.x, b.y, 3, 'rgba(225,245,255,.9)', 80);
  }

  function drawBubble(c, b) {
    const wob = Math.sin(G.now * 3 + b.ph) * 0.06, r = b.r;
    c.save(); c.translate(b.x, b.y); c.scale(1 + wob, 1 - wob);
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,.97)'); g.addColorStop(0.7, 'rgba(236,248,255,.95)'); g.addColorStop(1, 'rgba(196,224,255,.96)');
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
    c.lineWidth = 2.6; c.strokeStyle = C.outline; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.66, Math.PI * 1.1, Math.PI * 1.45);
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2.4; c.lineCap = 'round'; c.stroke();
    c.restore();
  }

  /* ---------- água, vapor, vidro, toalha, cortina ---------- */
  function drawWater(c, layer) {
    if (!ST.water) return;
    const h = headPos(), y1 = L.floor + 34, k = ST.k, t = G.now;
    const n = Math.round(26 * Math.min(k, 2.2));
    c.save(); c.lineCap = 'round';
    c.strokeStyle = 'rgba(205,238,255,' + (layer ? 0.5 : 0.62) + ')'; c.lineWidth = 2 + (k > 1 ? 1.2 : 0);
    c.beginPath();
    for (let i = layer; i < n; i += 2) {
      const u = (t * (1.5 + nz(i, 1) * 0.9) + nz(i, 2)) % 1, spread = 20 + u * 62;
      const x = h.x + (nz(i, 3) - 0.5) * 2 * spread, y = h.y + 10 + u * (y1 - h.y - 10);
      c.moveTo(x, y); c.lineTo(x + (x - h.x) * 0.03, y + 15);
    }
    c.stroke(); c.restore();
  }

  function drawGlass(c) {
    const st = Math.round(L.H * 0.07), bot = L.floor + 42;
    c.save(); c.globalAlpha = ST.fog;
    c.beginPath(); c.rect(SX0, st, SX1 - SX0, bot - st); c.clip();
    const g = c.createLinearGradient(0, st, 0, bot);
    g.addColorStop(0, 'rgba(230,255,248,.20)'); g.addColorStop(1, 'rgba(230,255,248,.05)');
    c.fillStyle = g; c.fillRect(SX0, st, SX1 - SX0, bot - st);
    c.fillStyle = 'rgba(255,255,255,.10)';
    for (const [dx, w] of [[96, 24], [132, 8]]) {
      c.beginPath(); c.moveTo(SX0 + dx, st); c.lineTo(SX0 + dx + w, st); c.lineTo(SX0 + dx + w - 80, bot); c.lineTo(SX0 + dx - 80, bot); c.closePath(); c.fill();
    }
    c.restore();
  }

  function towelShape(c, w, h) {
    rr(c, -w / 2, -h / 2, w, h, 4); fo(c, COL.dCream, 3.2);
    c.fillStyle = COL.dGold; c.fillRect(-w / 2 + 1.6, h * 0.18, w - 3.2, 7);
    c.fillStyle = COL.dGoldD; c.fillRect(-w / 2 + 1.6, h * 0.18 + 9, w - 3.2, 2.5);
  }
  function drawRackTowel(c) {
    if (ST.towelGone) return;
    const r = rackPos();
    c.save(); c.translate(r.x, r.y + 38); towelShape(c, 44, 82); c.restore();
    c.beginPath(); c.arc(303, r.y, 7, 0, TAU); fo(c, COL.dGold, 3);
  }
  function drawFlyTowel(c) {
    const f = ST.fly; if (!f || f.t >= 1) return;
    const a = rackPos(), x = a.x + (pl.x - a.x) * f.t, y = a.y + 38 + ((pl.y - 56 * pl.s) - (a.y + 38)) * f.t - Math.sin(f.t * Math.PI) * 26;
    c.save(); c.translate(x, y); c.rotate(f.t * 6.5); towelShape(c, 44 * (1 - f.t * 0.3), 82 * (1 - f.t * 0.45)); c.restore();
  }

  function drawCurtain(c) {
    const cu = ST.cur;
    if (cu.edge > L.vx1 + 30) return;
    const x0 = cu.edge, x1 = L.vx1 + 8, H = L.H, t = G.now;
    const edgePath = () => {
      c.beginPath(); c.moveTo(x0, 0);
      for (let y = 0; y <= H + 24; y += 24) c.lineTo(x0 + Math.sin(y * 0.03 + t * 2.2) * 3, y);
    };
    /* painel */
    c.save();
    edgePath(); c.lineTo(x1, H + 24); c.lineTo(x1, 0); c.closePath();
    c.fillStyle = COL.dgD; c.fill(); c.clip();
    let k = 0;
    for (let x = x1 - 13; x > x0 - 26; x -= 26, k++) {
      c.fillStyle = k % 2 ? ok(0.31, 0.065, 178) : ok(0.36, 0.07, 174); c.fillRect(x - 13, 0, 26, H + 24);
      c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(x, 0, 13, H + 24);
      c.strokeStyle = 'rgba(222,184,96,.5)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - 13, 0); c.lineTo(x - 13, H + 24); c.stroke();
      /* leque art déco no meio da cortina */
      const ay = H * 0.58;
      c.strokeStyle = 'rgba(232,196,108,.55)'; c.lineWidth = 2;
      for (const r of [6, 11, 16]) { c.beginPath(); c.arc(x, ay, r, Math.PI, 0); c.stroke(); }
      c.beginPath(); c.moveTo(x, ay); c.lineTo(x, ay - 22); c.stroke();
    }
    /* barra */
    c.fillStyle = COL.dGold; c.fillRect(x0 - 10, H - 20, x1 - x0 + 20, 20);
    c.fillStyle = COL.dBlack; c.fillRect(x0 - 10, H - 24, x1 - x0 + 20, 4);
    c.restore();
    /* franja dourada na ponta */
    for (const [w, col] of [[6, C.outline], [2.6, COL.dGold]]) { edgePath(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x0 - 12, 0, 12, H);
    /* varão */
    c.fillStyle = COL.dGold; c.fillRect(L.vx0 - 4, 6, x1 - L.vx0 + 8, 11); c.strokeStyle = C.outline; c.lineWidth = 3; c.strokeRect(L.vx0 - 4, 6, x1 - L.vx0 + 8, 11);
    for (let x = x1 - 13; x > x0 - 8; x -= 26) { c.beginPath(); c.arc(x, 11, 5.5, 0, TAU); fo(c, COL.dGoldD, 2.6); }
  }

  /* ---------- a cena (compartilhada) ---------- */
  function banhoScene() {
    return {
      beforePluft(c) { drawRackTowel(c); drawWater(c, 0); },
      afterPluft(c) {
        for (const b of ST.bubbles) if (b.on) drawBubble(c, b);
        drawFlyTowel(c);
        drawWater(c, 1);
        drawGlass(c);
      },
      over: drawCurtain,
      keyPos: () => ({ x: pl.x, y: pl.y - 52 * pl.s }),
      step(dt) {
        const S = ST;
        /* chuveiro: respingos no piso e vapor no alto */
        if (S.water) {
          if (Math.random() < dt * 11) Wd.drops(G.fx, CX + (Math.random() - 0.5) * 90, L.floor + 32, 2, 'rgba(210,240,255,.85)', 90);
          if (Math.random() < dt * 1.1) {
            G.fx.push({ k: 'smoke', x: CX + (Math.random() - 0.5) * 120, y: L.floor - 10, vx: (Math.random() - 0.5) * 14, vy: -24, g: -3, t: 0, life: 3.6, s0: 16, s1: 46, a: 0.2, col: '#eafff8' });
          }
        }
        /* bolhas: seguem o corpo; o dedo (ou a tecla) estoura */
        for (const b of S.bubbles) {
          if (!b.on) continue;
          if (!b.free) {
            b.x = pl.x + b.lx * pl.s + Math.sin(G.now * 2.6 + b.ph) * 1.6;
            b.y = pl.y + b.ly * pl.s + Math.cos(G.now * 2.1 + b.ph) * 1.2;
          } else {
            b.vy += 430 * dt; b.x += (b.vx + Math.sin(G.now * 5 + b.ph) * 22) * dt; b.y += b.vy * dt;
            if (b.y > L.floor + 26) { b.on = false; Wd.drops(G.fx, b.x, L.floor + 26, 2, 'rgba(225,245,255,.9)', 70); }
          }
        }
        if (S.phase === 'bubbles' && S.armed && !E.isSaying()) {
          const ptr = G.ptr;
          if (ptr.down) for (const b of S.bubbles) if (b.on && Math.hypot(ptr.x - b.x, ptr.y - b.y) < b.r + 12) popBubble(b);
          if (G.taps.some((k) => k.key)) {
            const alive = S.bubbles.filter((b) => b.on);
            for (let i = 0; i < 3 && alive.length; i++) popBubble(alive.splice(Math.floor(Math.random() * alive.length), 1)[0]);
          }
          if (S.popped >= S.need || G.now - S.hintAt > 15) S.phase = 'wash';
        }
        /* cortina: segue o dedo; um toque fecha sozinha */
        const cu = S.cur;
        if (cu.live && !cu.auto && !E.isSaying()) {
          if (G.ptr.down) cu.edge = clamp(G.ptr.x, L.vx0 - 12, L.vx1 - 28);
          if (G.taps.length) { cu.auto = true; au.rustle(); E.tween(cu, 'edge', L.vx0 - 12, 0.8); }
        }
        if (S.fly && S.fly.t >= 1) S.fly = null;
      },
    };
  }

  /* o pluft canta desafinado enquanto ninguém interrompe */
  async function singLoop(id) {
    const mel = [69, 72, 71, 69, 67, 69, 72, 74, 76, 74, 72, 71, 69, 67, 69, 67], len = [0.5, 0.5, 0.7, 0.4, 0.5, 0.9];
    let i = 0;
    while (ST && ST.hum && id === G.runId) {
      const d = len[i % len.length], m = mel[i % mel.length] - 12 + (nz(i, 3) < 0.25 ? 1 : 0);
      au.hum(m, d * 0.95, (nz(i, 5) - 0.5) * 80);
      if (i % 3 === 0) Wd.notes(G.fx, pl.x + (nz(i, 1) - 0.5) * 40, pl.y - 190 * pl.s, 1);
      i++;
      await wait(d * 1000);
    }
  }

  /* ============================================================
     1. o chuveiro: bolhas, bumbum, susto
     ============================================================ */
  P.scenes.chuveiro = async function () {
    const run = G.runId, TC = T.chuveiro;
    await E.enter('banheiro', {
      x: CX, s: 1.1, y: L.floor + 20, base: 'showerSing',
      beforeShow() {
        ST = newST(); ST.water = true;
        ST.bubbles = makeBubbles(); ST.need = Math.ceil(ST.bubbles.length * 0.6);
        E.setScene(banhoScene());
      },
    });
    if (run !== G.runId) return;
    ST.snd = au.loopNoise('highpass', 2600, 0.05);
    E.onExit(() => { if (ST && ST.snd) ST.snd.stop(); });
    au.duck(0.55);

    ST.hum = true; singLoop(run);
    cap(TC.titulo, { size: 34, y: L.H * 0.27, life: 3.2, rise: 16 });
    await wait(3200);
    if (run !== G.runId) return;

    /* a interação: estourar as bolhas */
    hint(TC.dica);
    ST.armed = true; ST.hintAt = G.now;
    E.ghost({ kind: 'tap', pos: () => { const b = ST.bubbles.find((q) => q.on); return b ? { x: b.x, y: b.y } : { x: pl.x, y: pl.y }; } });
    await until(() => ST.phase !== 'bubbles');
    if (run !== G.runId) return;
    hint(null); E.ghost(null);

    /* a água leva o resto */
    au.wash(); ST.k = 3;
    for (const b of ST.bubbles) if (b.on) { b.free = true; b.vy = 40 + Math.random() * 60; b.vx = (Math.random() - 0.5) * 50; }
    await wait(1500);
    E.tween(ST, 'k', 1, 0.6);
    await wait(700);

    /* ta-da */
    au.ding(); Wd.starBurst(G.fx, pl.x, pl.y - 60 * pl.s, 16);
    pl.base = 'showerDance';
    cap(TC.oxe, { size: 46, y: L.H * 0.3, shake: 3, life: 2.2, rot: -0.04 });
    await wait(4200);
    if (run !== G.runId) return;

    /* sentiu o olhar */
    ST.hum = false;
    pl.base = 'sensed';
    await wait(1400);
    quip(TC.sente, 1800);
    await wait(1700);
    pl.base = 'stunned';
    await E.playOnce('turn');
    au.inhale();
    await wait(600);
    await E.playOnce('startle');
    cap(T.toalha.grito, { size: 54, y: L.H * 0.3, shake: 6, life: 1.8, rot: -0.05 });
    au.boing(); G.shake = 8;
    ST.water = false; ST.snd.stop(); au.duck(1);

    /* pega a toalha do toalheiro */
    au.towelFlap(); ST.towelGone = true; ST.fly = { t: 0 };
    E.tween(ST.fly, 't', 1, 0.32);
    await wait(200);
    pl.base = 'cover';
    await E.playOnce('grab');
    ST.fog = 0.45;
  };

  /* ============================================================
     2. a toalha: "tapa a câmera"
     ============================================================ */
  P.scenes.toalha = async function (cont) {
    const run = G.runId, TT = T.toalha;
    if (!cont) {
      await E.enter('banheiro', {
        x: CX, s: 1.1, y: L.floor + 20, base: 'cover',
        beforeShow() { ST = newST(); ST.towelGone = true; ST.fog = 0.45; E.setScene(banhoScene()); },
      });
    }
    await wait(500);
    await sayAll(TT.l1);
    await sayAll(TT.l2);
    await say(TT.pedido);
    if (run !== G.runId) return;

    /* a cortina entra pela direita */
    const cu = ST.cur;
    cu.edge = L.vx1 + 40;
    await E.tween(cu, 'edge', L.vx1 - 28, 0.7);
    cu.live = true;
    hint(TT.dica);
    E.ghost({ kind: 'drag', x: L.vx1 - 40, y: L.H * 0.55, x2: L.vx0 + 50, y2: L.H * 0.55 });
    await until(() => cu.edge <= L.vx0 + 4);
    if (run !== G.runId) return;
    E.ghost(null); hint(null);
    if (!cu.auto) au.rustle();
    cu.live = false; cu.edge = L.vx0 - 12;

    /* tudo preto, só a voz */
    await wait(700);
    await sayAll(TT.atras);
    E.hideCard();
    au.rustle(); await wait(1500);
    au.rustle(); await wait(1300);
    await sayAll(TT.ainda);
  };

  /* ============================================================
     3. se arrumar: cinco coisas na bancada, duas pesam demais
     ============================================================ */
  const chestOf = () => ({ x: pl.x, y: pl.y - 70 * pl.s, r: 84 });
  const IY = () => L.bench + 62;
  const BLK = ok(0.2, 0.02, 280);

  /* desenhos dos objetos (origem no centro) */
  const ITEMS = {
    gravata(c) {
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 3, 0); c.lineTo(s * 25, -14); c.lineTo(s * 25, 14); c.closePath(); fo(c, BLK, 3.2); }
      c.beginPath(); c.arc(0, 0, 7, 0, TAU); fo(c, COL.dGold, 2.8);
    },
    flor(c) {
      c.strokeStyle = C.outline; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 6); c.lineTo(-3, 24); c.stroke();
      c.strokeStyle = ok(0.55, 0.14, 145); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 6); c.lineTo(-3, 24); c.stroke();
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU - Math.PI / 2; c.beginPath(); c.arc(Math.cos(a) * 10, -4 + Math.sin(a) * 10, 8.5, 0, TAU); fo(c, ok(0.6, 0.21, 22), 2.6); }
      c.beginPath(); c.arc(0, -4, 6, 0, TAU); fo(c, C.gold, 2.4);
    },
    perfume(c) {
      rr(c, -17, -6, 34, 32, 7); fo(c, ok(0.72, 0.1, 185), 3.2);
      rr(c, -9, -19, 18, 14, 3); fo(c, COL.dGold, 3);
      c.fillStyle = 'rgba(255,255,255,.65)'; c.fillRect(-12, 0, 4, 20);
      c.strokeStyle = COL.dGoldD; c.lineWidth = 2; c.beginPath(); c.moveTo(-17, 18); c.lineTo(17, 18); c.stroke();
    },
    cartola(c) {
      rr(c, -17, -24, 34, 34, 4); fo(c, BLK, 3.2);
      c.beginPath(); c.ellipse(0, 10, 29, 7, 0, 0, TAU); fo(c, BLK, 3.2);
      c.fillStyle = COL.dGold; c.fillRect(-17, 0, 34, 6);
    },
    bengala(c) {
      c.lineCap = 'round';
      c.strokeStyle = C.outline; c.lineWidth = 10; c.beginPath(); c.moveTo(-18, 26); c.lineTo(14, -18); c.stroke();
      c.strokeStyle = BLK; c.lineWidth = 4.5; c.beginPath(); c.moveTo(-18, 26); c.lineTo(14, -18); c.stroke();
      c.beginPath(); c.arc(16, -22, 9, 0, TAU); fo(c, COL.dGold, 3);
    },
  };
  const ORDEM = ['gravata', 'flor', 'perfume', 'cartola', 'bengala'];

  function applyDress() {
    const q = ST.eq;
    Object.assign(pl.mod, { towel: 1, bow: q.gravata ? 1 : 0, flower: q.flor ? 1 : 0, spark: q.perfume ? 1 : 0, hat: q.cartola ? 'cartola' : '', propR: q.bengala ? 'cane' : undefined });
    if (!q.bengala) delete pl.mod.propR;
  }

  function camScene() {
    return {
      front(c) {
        for (const f of ST.fling) {
          c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.scale(1.15, 1.15); ITEMS[f.kind](c); c.restore();
        }
      },
      over(c) { drawMirror(c); drawCurtain(c); },
      keyPos: chestOf,
      step(dt) {
        /* peso: quanto mais coisa, mais ele balança */
        const q = ST.eq, n = ORDEM.filter((k) => q[k]).length;
        const heavy = ST.phase === 'equip' ? (n >= 5 ? 1 : n === 4 ? 0.35 : 0) : ST.phase === 'trim' ? ((q.cartola ? 0.5 : 0) + (q.bengala ? 0.5 : 0)) : 0;
        if (heavy > 0 && !P.reduced) { pl.mod.rot = Math.sin(G.now * 5) * 0.07 * heavy; pl.mod.jit = 1.6 * heavy; pl.mod.sweat = 1; pl.mod.brow = -1; }
        else { delete pl.mod.rot; delete pl.mod.jit; delete pl.mod.sweat; delete pl.mod.brow; }
        for (let i = ST.fling.length - 1; i >= 0; i--) {
          const f = ST.fling[i]; f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
          if (f.y > L.H + 60) ST.fling.splice(i, 1);
        }
        /* tirar o que pesa: toque na cartola ou na bengala */
        if (ST.phase === 'trim' && !E.isSaying()) {
          for (const k of G.taps) {
            const hatP = { x: pl.x, y: pl.y - 160 * pl.s }, caneP = { x: pl.x + 64 * pl.s, y: pl.y - 70 * pl.s };
            let which = null;
            if (q.cartola && (k.key || E.dist(k, hatP) < 76)) which = 'cartola';
            else if (q.bengala && (k.key || E.dist(k, caneP) < 76)) which = 'bengala';
            else if (E.dist(k, chestOf()) < 90) {
              ST.stuck = (ST.stuck || 0) + 1;
              if (ST.stuck > 2) which = q.cartola ? 'cartola' : 'bengala';
              else quip(T.arrumar.fica, 1800);
            }
            if (which) trimItem(which);
          }
        }
      },
    };
  }

  function trimItem(which) {
    ST.eq[which] = false;
    const hp = which === 'cartola' ? { x: pl.x, y: pl.y - 160 * pl.s } : { x: pl.x + 64 * pl.s, y: pl.y - 70 * pl.s };
    ST.fling.push({ kind: which, x: hp.x, y: hp.y, vx: (which === 'cartola' ? -1 : 1) * (130 + Math.random() * 60), vy: -260, rot: 0, vr: (Math.random() - 0.5) * 12 });
    au.whoosh(); au.thump();
    applyDress();
  }

  /* o engine chama isto quando a janela muda de tamanho (girar o celular, barra do navegador) */
  E.onLayout = function () {
    const sala = Wd.current();
    if (sala === 'banheiro') pl.y = L.floor + 20;
    else if (sala === 'camarim') {
      pl.y = L.bench - 2;
      for (const it of G.drags) if (it.slot != null) { it.hx = 48 + it.slot * 66; it.hy = IY(); if (it.state === 'idle') { it.x = it.hx; it.y = it.hy; } }
    }
  };

  async function enterCam() {
    await E.enter('camarim', {
      x: CX, s: 1.05, base: 'idle',
      beforeShow() { pl.y = L.bench - 2; pl.mod = { towel: 1 }; E.setScene(camScene()); },
    });
  }

  P.scenes.arrumar = async function (cont) {
    const run = G.runId, TA = T.arrumar;
    if (!cont || !ST) { ST = newST(); ST.cur.edge = 9999; }
    ST.eq = {}; ST.fling = []; ST.phase = 'equip';
    await enterCam();
    if (run !== G.runId) return;
    /* a cortina abre e mostra o camarim */
    if (ST.cur.edge < 9000) { au.rustle(); await E.tween(ST.cur, 'edge', L.vx1 + 60, 0.9); ST.cur.edge = 9999; }
    await sayAll(TA.intro);

    /* os cinco objetos, na bandeja da bancada */
    let equipped = 0;
    ORDEM.forEach((kind, i) => {
      E.addDrag({
        x: 48 + i * 66, y: IY(), r: 30, slot: i, target: chestOf,
        draw(c) { ITEMS[kind](c); },
        onDone() {
          ST.eq[kind] = true; equipped++;
          applyDress(); au.ding();
          if (kind === 'perfume') { Wd.dust(G.fx, pl.x, pl.y - 100 * pl.s, 8, 60, 'rgba(255,240,200,.8)'); au.psst(); }
          Wd.starBurst(G.fx, pl.x, pl.y - 80 * pl.s, 6);
          if (equipped < 5) quip(TA[kind], 2600);
        },
      });
    });
    hint(TA.dica);
    E.ghost({ kind: 'drag', x: 48, y: IY(), to: () => chestOf() });
    await until(() => equipped >= 5);
    if (run !== G.runId) return;
    E.ghost(null); hint(null);

    /* peso demais */
    await wait(500);
    ST.phase = 'trim';
    await sayAll(TA.pesado);
    hint(TA.dicaTira);
    await until(() => !ST.eq.cartola || !ST.eq.bengala);
    if (ST.eq.cartola || ST.eq.bengala) quip(TA.tirou1, 1800);
    await until(() => !ST.eq.cartola && !ST.eq.bengala);
    if (run !== G.runId) return;
    hint(null);
    ST.phase = 'ok';
    au.chime(1);
    pl.base = 'proud';
    await wait(500);
    await sayAll([TA.tirou2].concat(TA.leve));
    pl.base = 'idle';
  };

  /* ============================================================
     4. o espelho: ele vira pra ela
     ============================================================ */
  function drawMirror(c) {
    const m = ST.mir; if (!m || m.t <= 0.001) return;
    const e = P.easeInOut(m.t), H = L.H;
    const hx = pl.x + 22 * pl.s, hy = pl.y - 92 * pl.s;
    let cx = hx + (CX - hx) * e, cy = hy + (H * 0.6 - hy) * e, rx = 24 + 92 * e, ry = 30 + 122 * e;
    /* em tela pequena o parágrafo comprido cobriria o espelho: encolhe e desce até caber abaixo da caixa */
    const cb = E.el.card.hidden ? 0 : E.el.card.getBoundingClientRect().bottom / L.S;
    const alvo = cb ? clamp((H - (cb + 18) - 24) / (2 * ry), 0.55, 1) : 1;
    m.fit = (m.fit || 1) + (alvo - (m.fit || 1)) * 0.15;
    rx *= m.fit; ry *= m.fit;
    if (cb && e > 0.98) cy = Math.max(cy, cb + 18 + ry);
    cy = Math.min(cy, H - ry - 24);
    c.save();
    c.fillStyle = 'rgba(10,6,14,' + 0.74 * e + ')'; c.fillRect(L.vx0 - 4, 0, L.vx1 - L.vx0 + 8, H);
    c.translate(cx, cy);
    /* raios dourados */
    c.fillStyle = 'rgba(244,214,128,' + 0.16 * e + ')';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + G.now * 0.05, b = a + TAU / 48;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 520, Math.sin(a) * 520); c.lineTo(Math.cos(b) * 520, Math.sin(b) * 520); c.closePath(); c.fill();
    }
    /* cabo */
    c.fillStyle = COL.dGold; rr(c, -13, ry - 4, 26, 90 * e, 8); c.fill(); c.lineWidth = 3.5; c.strokeStyle = C.outline; c.stroke();
    /* moldura */
    c.beginPath(); c.ellipse(0, 0, rx + 16, ry + 16, 0, 0, TAU); fo(c, COL.dGold, 4);
    c.beginPath(); c.ellipse(0, 0, rx + 7, ry + 7, 0, 0, TAU); c.strokeStyle = COL.dGoldD; c.lineWidth = 2.4; c.stroke();
    /* vidro */
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.save(); c.clip();
    const g = c.createRadialGradient(0, -ry * 0.2, 10, 0, 0, ry);
    g.addColorStop(0, ok(0.86, 0.06, 95)); g.addColorStop(0.55, ok(0.62, 0.08, 150)); g.addColorStop(1, ok(0.36, 0.06, 190));
    c.fillStyle = g; c.fillRect(-rx, -ry, rx * 2, ry * 2);
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 7; k++) {
      const t = (G.now * 0.5 + k / 7) % 1, x = (nz(k, 3) - 0.5) * rx * 1.6, y = (nz(k, 4) - 0.5) * ry * 1.6, s = 4 + Math.sin(t * Math.PI) * 9;
      c.globalAlpha = Math.sin(t * Math.PI);
      c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
    }
    c.globalAlpha = 1;
    /* brilho do vidro */
    c.fillStyle = 'rgba(255,255,255,.13)';
    c.beginPath(); c.moveTo(-rx * 0.7, -ry); c.lineTo(-rx * 0.2, -ry); c.lineTo(-rx * 0.9, ry * 0.3); c.lineTo(-rx * 1.2, ry * 0.3); c.closePath(); c.fill();
    c.restore();
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.lineWidth = 3.5; c.strokeStyle = C.outline; c.stroke();
    c.restore();
  }

  P.scenes.espelho = async function (cont) {
    const run = G.runId, TE = T.espelho;
    if (!cont || !ST || !ST.eq) {
      ST = newST(); ST.cur.edge = 9999; ST.eq = { gravata: true, flor: true, perfume: true }; ST.fling = []; ST.phase = 'ok';
      await enterCam();
      applyDress();
    }
    ST.mir = { t: 0 };
    await wait(300);
    await sayAll(TE.l1);
    pl.base = 'mirror';
    await wait(900);
    await sayAll(TE.olha);
    await sayAll(TE.vira);
    if (run !== G.runId) return;
    E.hideCard();
    pl.base = 'idle';
    au.sparkle();
    await E.tween(ST.mir, 't', 1, 0.9);
    await sayAll(TE.l2);
    await say(TE.fecha);
    await E.tween(ST.mir, 't', 0, 0.7);
    pl.base = 'proud';
    await wait(900);
  };
})();
