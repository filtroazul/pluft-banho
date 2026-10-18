/* pluft 2: cenários (cozinha, ateliê, estúdio, jardim das fotos, sala da mesa final), fogo, partículas e letreiros.
   cada sala é desenhada UMA vez em dois canvases fora da tela: bg (atrás do pluft) e fg (balcão/mesa, na frente dele).
   L.bench = a linha do topo do balcão/mesa/mesa de dj. o pluft fica ATRÁS dele, só do peito pra cima. */
(function () {
  const P = window.P, C = P.C, TAU = P.TAU, nz = P.nz, ok = P.ok;
  const Wd = (P.world = {});
  let bg = null, fg = null, cur = 'banheiro', lastL = null;

  const BENCH = { cozinha: 0.64, estudio: 0.5, sala: 0.74, atelie: 0.8, jardim: 0.8, banheiro: 0.8, camarim: 0.66 };
  Wd.benchFor = (name) => BENCH[name] || 0.64;

  const COL = {
    mint: ok(0.84, 0.06, 178), mintD: ok(0.76, 0.07, 178), grout: ok(0.93, 0.03, 172),
    wood: ok(0.62, 0.1, 62), woodL: ok(0.74, 0.1, 72), woodD: ok(0.46, 0.09, 52), woodDD: ok(0.34, 0.07, 48),
    steel: ok(0.8, 0.02, 250), steelD: ok(0.58, 0.03, 255), steelDD: ok(0.4, 0.04, 262),
    night: ok(0.2, 0.07, 265), night2: ok(0.34, 0.1, 285),
    plaster: ok(0.9, 0.04, 85), plasterD: ok(0.8, 0.05, 80), floorW: ok(0.56, 0.09, 58), floorWD: ok(0.46, 0.08, 52),
    foam: ok(0.24, 0.05, 300), foamD: ok(0.17, 0.05, 300), neonP: ok(0.72, 0.25, 350), neonC: ok(0.84, 0.15, 205),
    carpet: ok(0.2, 0.04, 285),
    salaW: ok(0.36, 0.08, 30), salaWD: ok(0.28, 0.07, 28),
    /* art déco: verde-garrafa, preto laqueado, dourado, creme */
    dg: ok(0.4, 0.07, 172), dgD: ok(0.3, 0.06, 176), dgL: ok(0.52, 0.075, 170),
    dBlack: ok(0.17, 0.02, 280), dGold: ok(0.8, 0.125, 85), dGoldD: ok(0.62, 0.11, 75), dCream: ok(0.93, 0.03, 90),
  };
  Wd.COL = COL;

  /* ---------- utilidades de desenho ---------- */
  const rr = (c, x, y, w, h, r) => P.rrect(c, x, y, w, h, r);
  const fo = (c, fill, lw) => P.fillOut(c, fill, lw);
  Wd.rr = rr; Wd.fo = fo;

  Wd.flame = function (c, x, y, s, t, k) {
    const f = Math.floor(t * 10), j = nz(k, f) - 0.5;
    const layers = [[ok(0.62, 0.2, 32), 1], [ok(0.78, 0.17, 62), 0.7], [ok(0.94, 0.1, 95), 0.4]];
    for (let i = 0; i < 3; i++) {
      const col = layers[i][0], sc = layers[i][1];
      const h = 64 * s * sc * (1 + j * 0.3), w = 24 * s * sc, sway = (nz(k + i, f + 3) - 0.5) * 16 * s;
      c.beginPath();
      c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 1.15, y - h * 0.5, x + sway * 0.5, y - h);
      c.quadraticCurveTo(x + w * 1.15, y - h * 0.5, x + w, y); c.quadraticCurveTo(x, y + w * 0.4, x - w, y); c.closePath();
      c.fillStyle = col; c.fill();
      if (i === 0) { c.lineWidth = 3; c.lineJoin = 'round'; c.strokeStyle = C.outline; c.stroke(); }
    }
  };

  /* ---------- as salas ---------- */
  function wallTiles(c, x0, x1, y0, y1, step, col) {
    c.strokeStyle = col; c.lineWidth = 1.6;
    c.beginPath();
    for (let x = x0 - ((x0 % step) + step) % step; x < x1; x += step) { c.moveTo(x, y0); c.lineTo(x, y1); }
    for (let y = y0; y < y1; y += step) { c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke();
  }

  function window_(c, x, y, w, h) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, COL.night); g.addColorStop(1, COL.night2);
    rr(c, x, y, w, h, 6); fo(c, g, 4);
    c.fillStyle = C.moon; c.beginPath(); c.arc(x + w * 0.72, y + h * 0.3, 8, 0, TAU); c.fill();
    c.fillStyle = C.star;
    [[0.2, 0.2], [0.4, 0.5], [0.15, 0.62], [0.55, 0.15], [0.85, 0.65]].forEach(([a, b]) => { c.beginPath(); c.arc(x + w * a, y + h * b, 1.4, 0, TAU); c.fill(); });
    c.strokeStyle = C.outline; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.55); c.lineTo(x + w, y + h * 0.55); c.stroke();
    rr(c, x - 6, y + h - 2, w + 12, 9, 3); fo(c, COL.woodL, 3);
  }

  const ROOMS = {};

  ROOMS.cozinha = function (c, L, bgc, fgc) {
    const x0 = L.vx0 - 4, x1 = L.vx1 + 4, H = L.H, bn = L.bench;
    let g = c.createLinearGradient(0, 0, 0, bn);
    g.addColorStop(0, COL.mint); g.addColorStop(1, COL.mintD);
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, bn);
    wallTiles(c, x0, x1, 0, bn, 36, COL.grout);
    /* armários de cima */
    const ch = Math.round(H * 0.095);
    c.fillStyle = COL.wood; c.fillRect(x0, 0, x1 - x0, ch);
    c.strokeStyle = C.outline; c.lineWidth = 3.5; c.strokeRect(x0 - 2, -2, x1 - x0 + 4, ch + 2);
    for (let x = x0 - ((x0 % 72) + 72) % 72 + 4; x < x1; x += 72) {
      rr(c, x, 6, 64, ch - 14, 5); fo(c, COL.woodL, 3);
      c.fillStyle = COL.woodDD; c.fillRect(x + 28, ch - 20, 8, 5);
    }
    /* janela e exaustor */
    window_(c, 18, Math.round(H * 0.19), 86, 100);
    c.strokeStyle = P.ok(0.7, 0.14, 25); c.lineWidth = 0;
    for (const sx of [-1, 1]) {
      const cx = sx < 0 ? 12 : 110;
      c.beginPath(); c.moveTo(cx, Math.round(H * 0.19) - 6); c.quadraticCurveTo(cx + sx * -8, Math.round(H * 0.19) + 60, cx + sx * 2, Math.round(H * 0.19) + 110);
      c.lineTo(cx + sx * 26, Math.round(H * 0.19) + 110); c.quadraticCurveTo(cx + sx * 16, Math.round(H * 0.19) + 50, cx + sx * 26, Math.round(H * 0.19) - 6); c.closePath();
      fo(c, ok(0.7, 0.14, 25), 3);
    }
    const hy = Math.round(H * 0.21);
    c.fillStyle = COL.steelDD; c.fillRect(278, ch - 4, 26, hy - ch + 6); c.strokeStyle = C.outline; c.lineWidth = 3; c.strokeRect(278, ch - 4, 26, hy - ch + 6);
    c.beginPath(); c.moveTo(232, hy + 52); c.lineTo(350, hy + 52); c.lineTo(326, hy); c.lineTo(256, hy); c.closePath(); fo(c, COL.steel, 4);
    c.fillStyle = ok(0.94, 0.12, 95, 0.9); rr(c, 262, hy + 40, 56, 8, 3); c.fill();
    /* faixa do azulejo atrás do balcão */
    c.fillStyle = 'rgba(40,60,70,.12)'; c.fillRect(x0, bn - 70, x1 - x0, 70);

    /* ---- fg: balcão ---- */
    g = fgc.createLinearGradient(0, bn, 0, H);
    g.addColorStop(0, COL.wood); g.addColorStop(1, COL.woodD);
    fgc.fillStyle = g; fgc.fillRect(x0, bn, x1 - x0, H - bn + 4);
    fgc.strokeStyle = C.outline; fgc.lineWidth = 3.5; fgc.strokeRect(x0 - 2, bn, x1 - x0 + 4, H - bn + 10);
    for (let x = x0 - ((x0 % 96) + 96) % 96 + 6; x < x1; x += 96) {
      rr(fgc, x, bn + 20, 84, Math.min(H - bn - 30, 150), 7); fo(fgc, COL.woodL, 3);
      fgc.fillStyle = COL.woodDD; rr(fgc, x + 34, bn + 34, 16, 6, 3); fgc.fill();
    }
    rr(fgc, x0 - 4, bn - 26, x1 - x0 + 8, 30, 6); fo(fgc, COL.woodL, 4);
    fgc.strokeStyle = 'rgba(255,255,255,.35)'; fgc.lineWidth = 3; fgc.beginPath(); fgc.moveTo(x0, bn - 21); fgc.lineTo(x1, bn - 21); fgc.stroke();
  };

  ROOMS.atelie = function (c, L, bgc, fgc) {
    const x0 = L.vx0 - 4, x1 = L.vx1 + 4, H = L.H, fl = L.floor;
    let g = c.createLinearGradient(0, 0, 0, fl);
    g.addColorStop(0, COL.plaster); g.addColorStop(1, COL.plasterD);
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, fl);
    /* rodapé e piso de tábua */
    c.fillStyle = COL.woodL; c.fillRect(x0, fl - 34, x1 - x0, 12); c.strokeStyle = C.outline; c.lineWidth = 3; c.strokeRect(x0 - 2, fl - 34, x1 - x0 + 4, 12);
    g = c.createLinearGradient(0, fl - 22, 0, H);
    g.addColorStop(0, COL.floorW); g.addColorStop(1, COL.floorWD);
    c.fillStyle = g; c.fillRect(x0, fl - 22, x1 - x0, H - fl + 24);
    c.strokeStyle = 'rgba(40,20,10,.3)'; c.lineWidth = 2; c.beginPath();
    for (let y = fl - 22, k = 0; y < H + 30; k++, y += 18 + k * 5) { c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke();
    /* janela grande de lua, luz no chão */
    const wy = Math.round(H * 0.16);
    g = c.createLinearGradient(0, wy, 0, fl);
    g.addColorStop(0, 'rgba(210,225,255,.30)'); g.addColorStop(1, 'rgba(210,225,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(236, wy + 120); c.lineTo(336, wy + 120); c.lineTo(350, fl + 20); c.lineTo(170, fl + 20); c.closePath(); c.fill();
    window_(c, 236, wy, 100, 120);
    /* prateleira com latas */
    c.fillStyle = COL.wood; rr(c, 20, Math.round(H * 0.31), 96, 8, 3); fo(c, COL.wood, 3);
    [[26, '#d8602a'], [48, '#2f6fb0'], [70, '#e8b020'], [92, '#4a9a52']].forEach(([x, col]) => { rr(c, x, Math.round(H * 0.31) - 24, 16, 24, 3); fo(c, col, 2.6); });
    /* quadrinhos na parede */
    rr(c, 22, Math.round(H * 0.17), 42, 54, 3); fo(c, ok(0.95, 0.03, 85), 3.5);
    c.fillStyle = ok(0.7, 0.1, 200); c.fillRect(27, Math.round(H * 0.17) + 6, 32, 28);
    c.fillStyle = ok(0.82, 0.14, 85); c.beginPath(); c.arc(43, Math.round(H * 0.17) + 20, 7, 0, TAU); c.fill();
  };

  ROOMS.estudio = function (c, L, bgc, fgc) {
    const x0 = L.vx0 - 4, x1 = L.vx1 + 4, H = L.H, bn = L.bench;
    let g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.foamD); g.addColorStop(1, COL.foam);
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, H);
    /* espuma acústica */
    for (let y = 0; y < bn; y += 38) {
      for (let x = x0 - ((x0 % 38) + 38) % 38; x < x1; x += 38) {
        const k = nz(x * 0.1, y * 0.1);
        rr(c, x + 2, y + 2, 34, 34, 6); c.fillStyle = k > 0.5 ? COL.foam : COL.foamD; c.fill();
        c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.stroke();
        c.beginPath(); c.moveTo(x + 6, y + 6); c.lineTo(x + 32, y + 32); c.moveTo(x + 32, y + 6); c.lineTo(x + 6, y + 32);
        c.strokeStyle = 'rgba(255,255,255,.05)'; c.stroke();
      }
    }
    /* fitas de neon */
    c.shadowColor = COL.neonP; c.shadowBlur = 14; c.strokeStyle = COL.neonP; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, Math.round(H * 0.1)); c.lineTo(x1, Math.round(H * 0.1)); c.stroke();
    c.shadowColor = COL.neonC; c.strokeStyle = COL.neonC;
    c.beginPath(); c.moveTo(x0, bn - 80); c.lineTo(x1, bn - 80); c.stroke();
    c.shadowBlur = 0;

    /* ---- fg: a mesa de dj ---- */
    g = fgc.createLinearGradient(0, bn, 0, H);
    g.addColorStop(0, ok(0.3, 0.04, 285)); g.addColorStop(1, ok(0.18, 0.04, 285));
    fgc.fillStyle = g; fgc.fillRect(x0, bn, x1 - x0, H - bn + 4);
    fgc.strokeStyle = C.outline; fgc.lineWidth = 3.5; fgc.strokeRect(x0 - 2, bn, x1 - x0 + 4, H - bn + 10);
    rr(fgc, x0 - 4, bn - 26, x1 - x0 + 8, 30, 6); fo(fgc, ok(0.36, 0.05, 285), 4);
    fgc.shadowColor = COL.neonC; fgc.shadowBlur = 10; fgc.strokeStyle = COL.neonC; fgc.lineWidth = 3;
    fgc.beginPath(); fgc.moveTo(x0, bn - 21); fgc.lineTo(x1, bn - 21); fgc.stroke(); fgc.shadowBlur = 0;
  };

  /* banheiro art déco: azulejo verde-garrafa, friso preto e dourado, box com leque de raios atrás do pluft, piso xadrez.
     o box vai de x=66 a x=294 (centro 180). chuveiro em y = H*0.17. L.floor = linha do piso. */
  ROOMS.banheiro = function (c, L) {
    const x0 = L.vx0 - 4, x1 = L.vx1 + 4, H = L.H, fl = L.floor, cx = 180;
    const sx0 = 66, sx1 = 294, st = Math.round(H * 0.07), hy = Math.round(H * 0.17);
    const gridX = (a, b, y0, y1, step) => {
      c.beginPath();
      for (let x = cx - step * Math.ceil((cx - a) / step); x < b; x += step) { c.moveTo(x, y0); c.lineTo(x, y1); }
      for (let y = y0; y < y1; y += step) { c.moveTo(a, y); c.lineTo(b, y); }
      c.stroke();
    };
    /* parede */
    let g = c.createLinearGradient(0, 0, 0, fl);
    g.addColorStop(0, COL.dgD); g.addColorStop(1, COL.dg);
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, fl + 4);
    c.strokeStyle = 'rgba(222,184,96,.32)'; c.lineWidth = 1.8; gridX(x0, x1, 0, fl, 44);
    /* cornija dourada */
    c.fillStyle = COL.dBlack; c.fillRect(x0, 0, x1 - x0, 12);
    c.fillStyle = COL.dGold; c.fillRect(x0, 12, x1 - x0, 4);
    /* friso: faixa preta com degraus dourados */
    const fy = Math.round(H * 0.4), fh = 26;
    c.fillStyle = COL.dBlack; c.fillRect(x0, fy, x1 - x0, fh);
    c.fillStyle = COL.dGold; c.fillRect(x0, fy, x1 - x0, 3); c.fillRect(x0, fy + fh - 3, x1 - x0, 3);
    for (let x = cx - 24 * Math.ceil((cx - x0) / 24); x < x1; x += 24) {
      c.beginPath(); c.moveTo(x + 2, fy + fh - 5); c.lineTo(x + 12, fy + 6); c.lineTo(x + 22, fy + fh - 5); c.closePath();
      c.fillStyle = COL.dGold; c.fill();
      c.beginPath(); c.moveTo(x + 7, fy + fh - 5); c.lineTo(x + 12, fy + 13); c.lineTo(x + 17, fy + fh - 5); c.closePath();
      c.fillStyle = COL.dBlack; c.fill();
    }
    /* lustre de parede, à esquerda */
    const ly = Math.round(H * 0.27);
    g = c.createRadialGradient(34, ly, 4, 34, ly, 70);
    g.addColorStop(0, 'rgba(255,226,150,.55)'); g.addColorStop(1, 'rgba(255,226,150,0)');
    c.fillStyle = g; c.fillRect(0, ly - 80, 110, 160);
    rr(c, 19, ly - 30, 30, 60, 4); fo(c, COL.dGold, 3.4);
    rr(c, 25, ly - 22, 18, 44, 8); fo(c, ok(0.97, 0.05, 92), 3);
    c.fillStyle = COL.dGoldD; c.fillRect(19, ly - 4, 30, 3);
    /* toalheiro, à direita */
    const ty = Math.round(H * 0.34);
    c.lineCap = 'round';
    c.strokeStyle = C.outline; c.lineWidth = 11; c.beginPath(); c.moveTo(303, ty); c.lineTo(350, ty); c.stroke();
    c.strokeStyle = COL.dGold; c.lineWidth = 5.5; c.beginPath(); c.moveTo(303, ty); c.lineTo(350, ty); c.stroke();
    c.beginPath(); c.arc(303, ty, 7, 0, TAU); fo(c, COL.dGold, 3);

    /* o box */
    const bot = fl + 42;
    g = c.createLinearGradient(0, st, 0, fl);
    g.addColorStop(0, COL.dgL); g.addColorStop(1, ok(0.46, 0.07, 172));
    c.fillStyle = g; c.fillRect(sx0, st, sx1 - sx0, bot - st);
    c.save(); c.beginPath(); c.rect(sx0, st, sx1 - sx0, bot - st); c.clip();
    /* leque de raios dourados atrás do pluft */
    const ry = fl - 100, R = 420, N = 26;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU, b = a + TAU / (N * 2);
      c.beginPath(); c.moveTo(cx, ry); c.lineTo(cx + Math.cos(a) * R, ry + Math.sin(a) * R); c.lineTo(cx + Math.cos(b) * R, ry + Math.sin(b) * R); c.closePath();
      c.fillStyle = 'rgba(244,214,128,.13)'; c.fill();
    }
    g = c.createRadialGradient(cx, ry, 10, cx, ry, 190);
    g.addColorStop(0, 'rgba(255,236,170,.34)'); g.addColorStop(1, 'rgba(255,236,170,0)');
    c.fillStyle = g; c.fillRect(sx0, st, sx1 - sx0, bot - st);
    c.strokeStyle = 'rgba(222,184,96,.22)'; c.lineWidth = 1.6; gridX(sx0, sx1, st, bot, 44);
    c.restore();
    /* moldura dourada com cantos em degrau */
    c.lineJoin = 'miter';
    for (const [w, col] of [[10, C.outline], [5.5, COL.dGold]]) {
      c.strokeStyle = col; c.lineWidth = w;
      c.beginPath(); c.moveTo(sx0, bot); c.lineTo(sx0, st); c.lineTo(sx1, st); c.lineTo(sx1, bot); c.stroke();
    }
    c.strokeStyle = COL.dGoldD; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(sx0 + 9, bot); c.lineTo(sx0 + 9, st + 9); c.lineTo(sx1 - 9, st + 9); c.lineTo(sx1 - 9, bot); c.stroke();
    for (const x of [sx0 - 7, sx1 - 11]) { c.fillStyle = COL.dGold; c.fillRect(x, st - 7, 18, 18); c.lineWidth = 3; c.strokeStyle = C.outline; c.strokeRect(x, st - 7, 18, 18); }
    /* cano e ducha */
    c.lineCap = 'round';
    for (const [w, col] of [[10, C.outline], [5, COL.dGold]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(cx, st); c.lineTo(cx, hy - 6); c.stroke(); }
    c.beginPath(); c.ellipse(cx, hy, 34, 9, 0, 0, TAU); fo(c, COL.dGold, 3.6);
    c.beginPath(); c.ellipse(cx, hy + 3, 28, 5, 0, 0, TAU); c.fillStyle = COL.dGoldD; c.fill();
    c.fillStyle = COL.dBlack; for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(cx + i * 8, hy + 4, 1.5, 0, TAU); c.fill(); }

    /* piso xadrez preto e creme */
    c.fillStyle = COL.dCream; c.fillRect(x0, fl, x1 - x0, H - fl + 8);
    c.fillStyle = COL.dBlack;
    for (let y = fl, k = 0; y < H + 30; k++) {
      const h = 14 + k * 8, w = 28 + k * 16;
      for (let i = -Math.ceil((cx - x0) / w) - 1; i <= Math.ceil((x1 - cx) / w) + 1; i++) if (Math.abs(i + k) % 2 === 0) c.fillRect(cx + i * w - w / 2, y, w, h);
      y += h;
    }
    c.fillStyle = COL.dBlack; c.fillRect(x0, fl - 9, x1 - x0, 11);
    c.fillStyle = COL.dGold; c.fillRect(x0, fl - 9, x1 - x0, 3);
    /* ralo */
    c.beginPath(); c.ellipse(cx, fl + 26, 46, 9, 0, 0, TAU); fo(c, COL.dGold, 3.4);
    c.beginPath(); c.ellipse(cx, fl + 26, 34, 5.5, 0, 0, TAU); c.fillStyle = COL.dBlack; c.fill();
  };

  /* camarim art déco: parede ameixa com escamas douradas, espelho grande em arco com lâmpadas atrás do pluft,
     bancada de laca preta na frente (fg). os objetos moram na face da bancada, em y = L.bench + 62. */
  ROOMS.camarim = function (c, L, bgc, fgc) {
    const x0 = L.vx0 - 4, x1 = L.vx1 + 4, H = L.H, bn = L.bench, cx = 180;
    const plum = ok(0.24, 0.07, 340), plumD = ok(0.17, 0.055, 335);
    let g = c.createLinearGradient(0, 0, 0, bn);
    g.addColorStop(0, plumD); g.addColorStop(1, plum);
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, bn + 4);
    /* escamas (leques) douradas */
    c.strokeStyle = 'rgba(226,188,100,.3)'; c.lineWidth = 1.8;
    for (let row = 0, y = 12; y < bn + 30; row++, y += 24) {
      const off = row % 2 ? 22 : 0;
      for (let x = cx - 44 * Math.ceil((cx - x0) / 44) + off - 44; x < x1 + 44; x += 44) {
        for (const r of [22, 15, 8]) { c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.stroke(); }
      }
    }
    /* cornija */
    c.fillStyle = COL.dBlack; c.fillRect(x0, 0, x1 - x0, 12);
    c.fillStyle = COL.dGold; c.fillRect(x0, 12, x1 - x0, 4);
    /* espelho em arco */
    const mx0 = 96, mx1 = 264, mt = Math.round(H * 0.1), mb = bn - 22, ar = (mx1 - mx0) / 2;
    const arch = () => { c.beginPath(); c.moveTo(mx0, mb); c.lineTo(mx0, mt + ar); c.arc(cx, mt + ar, ar, Math.PI, 0); c.lineTo(mx1, mb); c.closePath(); };
    arch(); g = c.createLinearGradient(mx0, mt, mx1, mb);
    g.addColorStop(0, ok(0.46, 0.05, 195)); g.addColorStop(0.5, ok(0.32, 0.05, 200)); g.addColorStop(1, ok(0.4, 0.05, 195));
    c.fillStyle = g; c.fill();
    c.save(); arch(); c.clip();
    c.fillStyle = 'rgba(255,255,255,.13)';
    for (const [dx, w] of [[24, 26], [62, 9]]) { c.beginPath(); c.moveTo(mx0 + dx, mt); c.lineTo(mx0 + dx + w, mt); c.lineTo(mx0 + dx + w - 120, mb); c.lineTo(mx0 + dx - 120, mb); c.closePath(); c.fill(); }
    c.restore();
    for (const [w, col] of [[14, C.outline], [8, COL.dGold]]) { arch(); c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); }
    /* lâmpadas em volta do arco */
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI + (k / 10) * Math.PI, bx = cx + Math.cos(a) * (ar + 14), by = mt + ar + Math.sin(a) * (ar + 14);
      c.beginPath(); c.arc(bx, by, 4.6, 0, TAU); fo(c, ok(0.97, 0.06, 95), 2);
    }
    /* lustres de parede */
    for (const lx of [40, 320]) {
      const ly = Math.round(H * 0.28);
      g = c.createRadialGradient(lx, ly, 4, lx, ly, 70);
      g.addColorStop(0, 'rgba(255,226,150,.5)'); g.addColorStop(1, 'rgba(255,226,150,0)');
      c.fillStyle = g; c.fillRect(lx - 70, ly - 80, 140, 160);
      rr(c, lx - 15, ly - 30, 30, 60, 4); fo(c, COL.dGold, 3.4);
      rr(c, lx - 9, ly - 22, 18, 44, 8); fo(c, ok(0.97, 0.05, 92), 3);
    }
    /* piso embaixo da bancada */
    c.fillStyle = COL.dBlack; c.fillRect(x0, bn, x1 - x0, H - bn + 6);

    /* ---- fg: a bancada de laca preta ---- */
    g = fgc.createLinearGradient(0, bn, 0, H);
    g.addColorStop(0, ok(0.24, 0.02, 280)); g.addColorStop(1, ok(0.12, 0.02, 280));
    fgc.fillStyle = g; fgc.fillRect(x0, bn, x1 - x0, H - bn + 4);
    fgc.strokeStyle = C.outline; fgc.lineWidth = 3.5; fgc.strokeRect(x0 - 2, bn, x1 - x0 + 4, H - bn + 10);
    fgc.strokeStyle = 'rgba(226,188,100,.55)'; fgc.lineWidth = 2;
    for (let x = cx - 90 * Math.ceil((cx - x0) / 90); x < x1 + 90; x += 90) {
      for (const r of [38, 28, 18]) { fgc.beginPath(); fgc.arc(x, H + 6, r * 1.9, Math.PI, 0); fgc.stroke(); }
    }
    rr(fgc, x0 - 4, bn - 26, x1 - x0 + 8, 30, 6); fo(fgc, ok(0.2, 0.02, 280), 4);
    fgc.fillStyle = COL.dGold; fgc.fillRect(x0, bn - 21, x1 - x0, 3);
    /* bandeja dourada pros objetos */
    rr(fgc, 14, bn + 26, 332, 74, 14); fo(fgc, ok(0.36, 0.06, 330), 3.4);
    fgc.strokeStyle = COL.dGoldD; fgc.lineWidth = 2; rr(fgc, 20, bn + 32, 320, 62, 11); fgc.stroke();
  };

  ROOMS.jardim = function (c, L) {
    const x0 = L.vx0 - 4, x1 = L.vx1 + 4, H = L.H, fl = L.floor, hz = Math.round(H * 0.5);
    let g = c.createLinearGradient(0, 0, 0, hz + 20);
    g.addColorStop(0, ok(0.4, 0.14, 300)); g.addColorStop(0.45, ok(0.62, 0.19, 5)); g.addColorStop(1, ok(0.86, 0.14, 70));
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, hz + 24);
    /* sol */
    const sx = 130, sy = hz - 6;
    g = c.createRadialGradient(sx, sy, 10, sx, sy, 150);
    g.addColorStop(0, 'rgba(255,230,160,.6)'); g.addColorStop(1, 'rgba(255,200,140,0)');
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, hz + 24);
    c.beginPath(); c.arc(sx, sy, 38, 0, TAU); c.fillStyle = ok(0.97, 0.1, 90); c.fill();
    /* nuvens */
    c.fillStyle = 'rgba(255,200,215,.6)';
    [[40, 0.12, 52], [250, 0.2, 44], [310, 0.09, 36], [180, 0.28, 40]].forEach(([x, y, w]) => { rr(c, x, Math.round(H * y), w * 1.8, w * 0.28, w * 0.14); c.fill(); });
    /* colinas */
    function hill(y, amp, col, seed, f1) {
      c.beginPath(); c.moveTo(x0, H);
      for (let x = x0; x <= x1; x += 6) c.lineTo(x, y + Math.sin(x * f1 + seed) * amp + Math.sin(x * f1 * 2.3 + seed * 2) * amp * 0.4);
      c.lineTo(x1, H); c.closePath(); c.fillStyle = col; c.fill();
    }
    hill(hz + 4, 12, ok(0.46, 0.12, 330), 1.1, 0.012);
    hill(hz + 26, 10, ok(0.5, 0.12, 350), 3.3, 0.018);
    g = c.createLinearGradient(0, hz + 40, 0, H);
    g.addColorStop(0, ok(0.58, 0.14, 120)); g.addColorStop(1, ok(0.4, 0.1, 150));
    c.fillStyle = g; c.beginPath(); c.moveTo(x0, hz + 44);
    for (let x = x0; x <= x1; x += 6) c.lineTo(x, hz + 44 + Math.sin(x * 0.02 + 2) * 6);
    c.lineTo(x1, H); c.lineTo(x0, H); c.closePath(); c.fill();
    /* flores e grama */
    for (let i = 0; i < 90; i++) {
      const x = x0 + nz(i, 1) * (x1 - x0), y = hz + 60 + Math.pow(nz(i, 2), 0.8) * (H - hz - 70), k = nz(i, 3), sc = 0.6 + ((y - hz) / (H - hz)) * 1.1;
      if (k < 0.6) {
        c.strokeStyle = ok(0.36, 0.1, 135); c.lineWidth = 1.6 * sc; c.lineCap = 'round';
        for (let b = -1; b <= 1; b++) { c.beginPath(); c.moveTo(x + b * 2.4 * sc, y); c.quadraticCurveTo(x + b * 4 * sc, y - 5 * sc, x + b * 6 * sc, y - 9 * sc); c.stroke(); }
      } else {
        const col = k < 0.75 ? C.pink : k < 0.88 ? C.gold : ok(0.92, 0.04, 90);
        c.strokeStyle = ok(0.36, 0.1, 135); c.lineWidth = 1.4 * sc; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 8 * sc); c.stroke();
        c.fillStyle = col; for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 2.6 * sc, y - 8 * sc + Math.sin(a) * 2.6 * sc, 1.9 * sc, 0, TAU); c.fill(); }
        c.fillStyle = C.gold; c.beginPath(); c.arc(x, y - 8 * sc, 1.3 * sc, 0, TAU); c.fill();
      }
    }
  };

  ROOMS.sala = function (c, L, bgc, fgc) {
    const x0 = L.vx0 - 4, x1 = L.vx1 + 4, H = L.H, bn = L.bench;
    let g = c.createLinearGradient(0, 0, 0, bn);
    g.addColorStop(0, COL.salaWD); g.addColorStop(1, COL.salaW);
    c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, bn);
    /* papel de parede listrado */
    c.fillStyle = 'rgba(255,220,180,.07)';
    for (let x = x0 - ((x0 % 40) + 40) % 40; x < x1; x += 40) c.fillRect(x, 0, 18, bn);
    /* luminária: cone de luz na mesa */
    g = c.createLinearGradient(0, 0, 0, bn);
    g.addColorStop(0, 'rgba(255,225,160,.32)'); g.addColorStop(1, 'rgba(255,225,160,.06)');
    c.fillStyle = g; c.beginPath(); c.moveTo(150, Math.round(H * 0.06)); c.lineTo(210, Math.round(H * 0.06)); c.lineTo(x1, bn); c.lineTo(x0, bn); c.closePath(); c.fill();
    c.strokeStyle = C.outline; c.lineWidth = 3; c.beginPath(); c.moveTo(180, 0); c.lineTo(180, Math.round(H * 0.05)); c.stroke();
    c.beginPath(); c.moveTo(150, Math.round(H * 0.075)); c.lineTo(210, Math.round(H * 0.075)); c.lineTo(198, Math.round(H * 0.045)); c.lineTo(162, Math.round(H * 0.045)); c.closePath(); fo(c, ok(0.78, 0.13, 85), 3.5);
    /* quadros na parede, vazios */
    [[16, 0.17, 44, 56], [296, 0.15, 48, 40], [300, 0.27, 40, 50]].forEach(([x, y, w, h]) => {
      rr(c, x, Math.round(H * y), w, h, 3); fo(c, ok(0.28, 0.05, 40), 3.5);
      c.fillStyle = 'rgba(255,240,210,.12)'; c.fillRect(x + 5, Math.round(H * y) + 5, w - 10, h - 10);
    });
    /* rodapé */
    c.fillStyle = COL.woodD; c.fillRect(x0, bn - 40, x1 - x0, 10);

    /* ---- fg: a mesa ---- */
    g = fgc.createLinearGradient(0, bn, 0, H);
    g.addColorStop(0, COL.wood); g.addColorStop(1, COL.woodDD);
    fgc.fillStyle = g; fgc.fillRect(x0, bn, x1 - x0, H - bn + 4);
    fgc.strokeStyle = C.outline; fgc.lineWidth = 3.5; fgc.strokeRect(x0 - 2, bn, x1 - x0 + 4, H - bn + 10);
    rr(fgc, x0 - 4, bn - 26, x1 - x0 + 8, 30, 6); fo(fgc, COL.woodL, 4);
    fgc.strokeStyle = 'rgba(255,255,255,.3)'; fgc.lineWidth = 3; fgc.beginPath(); fgc.moveTo(x0, bn - 21); fgc.lineTo(x1, bn - 21); fgc.stroke();
  };

  /* ---------- montagem ---------- */
  function mk(L) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(innerWidth * L.dpr); cv.height = Math.round(innerHeight * L.dpr);
    const c = cv.getContext('2d');
    c.setTransform(L.S * L.dpr, 0, 0, L.S * L.dpr, L.ox * L.dpr, 0);
    return [cv, c];
  }

  Wd.build = function (L) {
    lastL = L;
    const [bcv, bc] = mk(L), [fcv, fc] = mk(L);
    (ROOMS[cur] || ROOMS.cozinha)(bc, L, bc, fc);
    bg = bcv;
    fg = cur === 'cozinha' || cur === 'estudio' || cur === 'sala' || cur === 'camarim' ? fcv : null;
  };
  Wd.room = function (name, L) {
    cur = name;
    L.bench = Math.round(L.H * Wd.benchFor(name));
    Wd.build(L);
  };
  Wd.current = () => cur;

  Wd.drawBg = function (c) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); if (bg) c.drawImage(bg, 0, 0); c.restore(); };
  Wd.drawFg = function (c) { if (!fg) return; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(fg, 0, 0); c.restore(); };

  /* ---------- partículas ---------- */
  Wd.drawFx = function (c, fx, layer) {
    for (const p of fx) {
      if (layer && (layer === 'back') !== (p.k === 'trail')) continue;
      const u = p.t / p.life;
      c.save();
      switch (p.k) {
        case 'dust':
          c.globalAlpha = (1 - u) * 0.6; c.fillStyle = p.col || ok(0.8, 0.03, 80);
          c.beginPath(); c.arc(p.x, p.y, p.s0 + (p.s1 - p.s0) * u, 0, TAU); c.fill(); break;
        case 'smoke':
          c.globalAlpha = (u < 0.15 ? u / 0.15 : 1 - u) * (p.a || 0.55); c.fillStyle = p.col || ok(0.35, 0.01, 260);
          c.beginPath(); c.arc(p.x, p.y, p.s0 + (p.s1 - p.s0) * u, 0, TAU); c.fill(); break;
        case 'ember':
          c.globalAlpha = 1 - u; c.fillStyle = u < 0.5 ? ok(0.85, 0.17, 70) : ok(0.65, 0.2, 35);
          c.beginPath(); c.arc(p.x, p.y, p.s0 * (1 - u * 0.5), 0, TAU); c.fill(); break;
        case 'drop':
          c.globalAlpha = u > 0.8 ? (1 - u) * 5 : 1; c.fillStyle = p.col;
          c.beginPath(); c.arc(p.x, p.y, p.s0 * (1 - u * 0.4), 0, TAU); c.fill(); break;
        case 'chip':
          c.translate(p.x, p.y); c.rotate(p.rot + p.vr * p.t); c.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
          c.beginPath(); c.moveTo(-p.s0, -p.s0 * 0.4); c.lineTo(p.s0 * 0.3, -p.s0); c.lineTo(p.s0, p.s0 * 0.5); c.lineTo(-p.s0 * 0.2, p.s0 * 0.7); c.closePath();
          c.fillStyle = p.col || ok(0.96, 0.012, 90); c.fill(); c.lineWidth = 1.6; c.strokeStyle = 'rgba(80,70,100,.8)'; c.stroke(); break;
        case 'clod':
          c.translate(p.x, p.y); c.rotate(p.rot + p.vr * p.t); c.globalAlpha = u > 0.8 ? (1 - u) * 5 : 1;
          c.beginPath(); c.moveTo(-p.s0, -p.s0 * 0.5); c.lineTo(p.s0 * 0.4, -p.s0); c.lineTo(p.s0, p.s0 * 0.3); c.lineTo(-p.s0 * 0.3, p.s0 * 0.8); c.closePath();
          c.fillStyle = p.col || C.soil; c.fill(); c.lineWidth = 2; c.strokeStyle = C.outline; c.stroke(); break;
        case 'star':
          c.globalAlpha = u > 0.6 ? (1 - u) / 0.4 : 1; c.translate(p.x, p.y);
          P.rig.star5(c, 0, 0, p.s0 * (1 - u * 0.3), p.rot + p.vr * p.t);
          c.fillStyle = p.col || C.gold; c.fill(); c.lineWidth = 2; c.strokeStyle = C.outline; c.stroke(); break;
        case 'spark': {
          c.globalAlpha = 1 - u; c.translate(p.x, p.y);
          const z = p.s0 * (1 - u * 0.5);
          c.beginPath(); c.moveTo(0, -z); c.quadraticCurveTo(0, 0, z, 0); c.quadraticCurveTo(0, 0, 0, z); c.quadraticCurveTo(0, 0, -z, 0); c.quadraticCurveTo(0, 0, 0, -z);
          c.fillStyle = p.col || C.gold; c.fill(); break;
        }
        case 'heart':
          c.globalAlpha = u > 0.5 ? (1 - u) * 2 : 1; c.translate(p.x, p.y);
          P.rig.heart(c, 0, 0, p.s0, p.col); break;
        case 'note':
          c.globalAlpha = u > 0.6 ? (1 - u) / 0.4 : 1; c.translate(p.x + Math.sin(p.t * 4 + p.rot) * 6, p.y);
          c.font = '700 ' + p.s0 + 'px "Grandstander", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineWidth = 4; c.strokeStyle = C.outline; c.strokeText(p.ch, 0, 0); c.fillStyle = p.col; c.fillText(p.ch, 0, 0); break;
        case 'petal':
          c.translate(p.x, p.y); c.rotate(p.rot + p.vr * p.t); c.globalAlpha = u > 0.8 ? (1 - u) * 5 : 0.9;
          c.beginPath(); c.ellipse(0, 0, p.s0, p.s0 * 0.5, 0, 0, TAU); c.fillStyle = p.col; c.fill(); break;
        case 'ring':
          c.globalAlpha = (1 - u) * 0.9; c.strokeStyle = p.col || '#fff'; c.lineWidth = 3 * (1 - u) + 1;
          c.beginPath(); c.arc(p.x, p.y, p.s0 + (p.s1 - p.s0) * P.easeOut(u), 0, TAU); c.stroke(); break;
        case 'paper':
          c.translate(p.x + Math.sin(p.t * 3 + p.rot) * 18, p.y); c.rotate(Math.sin(p.t * 3 + p.rot) * 0.7);
          c.globalAlpha = u > 0.8 ? (1 - u) * 5 : 1;
          c.fillStyle = C.paper; c.fillRect(-13, -16, 26, 32); c.lineWidth = 2.6; c.strokeStyle = C.outline; c.strokeRect(-13, -16, 26, 32);
          c.strokeStyle = C.ink; c.lineWidth = 1.8;
          for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-8, -9 + i * 6); c.lineTo(8, -9 + i * 6); c.stroke(); }
          break;
        case 'trail':
          c.globalAlpha = (1 - u) * 0.8; c.fillStyle = p.col || C.pinkLight;
          c.beginPath(); c.arc(p.x, p.y, p.s0 * (1 - u), 0, TAU); c.fill(); break;
      }
      c.restore();
    }
  };

  /* letreiros em cima da cena */
  Wd.drawCaps = function (c, caps) {
    c.save();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const k of caps) {
      const u = k.t / k.life;
      const pop = u < 0.12 ? P.easeOut(u / 0.12) * 1.15 : 1 + (u < 0.2 ? (0.2 - u) * 1.5 : 0);
      c.save();
      const sx = k.shake ? (nz(Math.floor(k.t * 16), 5) - 0.5) * k.shake : 0;
      const sy = k.shake ? (nz(Math.floor(k.t * 16), 6) - 0.5) * k.shake : 0;
      c.translate(k.x + sx, k.y + sy + (k.rise ? -u * k.rise : 0));
      c.rotate(k.rot || 0);
      c.scale(pop, pop);
      c.globalAlpha = u > 0.8 ? Math.max(0, (1 - u) / 0.2) : 1;
      c.font = `${k.size}px "Bagel Fat One", "Grandstander", ui-rounded, sans-serif`;
      c.lineWidth = Math.max(5, k.size * 0.2); c.strokeStyle = C.outline; c.strokeText(k.text, 0, 0);
      c.fillStyle = k.col || C.cap; c.fillText(k.text, 0, 0);
      c.restore();
    }
    c.restore();
  };

  /* emissores */
  const R = Math.random;
  Wd.dust = function (fx, x, y, n, spread, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + R() * Math.PI;
      fx.push({ k: 'dust', x: x + (R() - 0.5) * spread, y, vx: Math.cos(a) * (30 + R() * 110), vy: Math.sin(a) * (20 + R() * 50), g: 30, t: 0, life: 0.7 + R() * 0.7, s0: 6 + R() * 6, s1: 22 + R() * 20, col });
    }
  };
  Wd.smoke = function (fx, x, y, n, dark, big) {
    for (let i = 0; i < n; i++) {
      fx.push({ k: 'smoke', x: x + (R() - 0.5) * 24, y, vx: (R() - 0.5) * 18, vy: -(30 + R() * 40), g: -6, t: 0, life: 1.2 + R() * 1, s0: 8 + R() * 6, s1: (big ? 40 : 26) + R() * 18, a: dark ? 0.7 : 0.5, col: dark ? ok(0.22, 0.01, 260) : ok(0.82, 0.01, 260) });
    }
  };
  Wd.embers = function (fx, x, y, n) {
    for (let i = 0; i < n; i++) fx.push({ k: 'ember', x: x + (R() - 0.5) * 30, y, vx: (R() - 0.5) * 50, vy: -(50 + R() * 90), g: 20, t: 0, life: 0.6 + R() * 0.7, s0: 2 + R() * 2.5 });
  };
  Wd.drops = function (fx, x, y, n, col, speed) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.05 + R() * 0.9), v = (speed || 200) * (0.4 + R() * 0.8);
      fx.push({ k: 'drop', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, t: 0, life: 0.8 + R() * 0.6, s0: 3 + R() * 4, col });
    }
  };
  Wd.chips = function (fx, x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + R() * 0.8), v = 120 + R() * 200;
      fx.push({ k: 'chip', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, t: 0, life: 0.9 + R() * 0.5, s0: 3 + R() * 4, rot: R() * 6, vr: (R() - 0.5) * 14, col });
    }
  };
  Wd.notes = function (fx, x, y, n) {
    const ch = ['♪', '♫', '♬'], cols = [C.pink, C.gold, ok(0.84, 0.15, 205)];
    for (let i = 0; i < n; i++) fx.push({ k: 'note', x: x + (R() - 0.5) * 50, y, vx: (R() - 0.5) * 30, vy: -(40 + R() * 50), g: 0, t: 0, life: 1.4 + R() * 0.6, s0: 22 + R() * 8, rot: R() * 6, ch: ch[i % 3], col: cols[i % 3] });
  };
  Wd.petals = function (fx, x0, x1, n) {
    for (let i = 0; i < n; i++) fx.push({ k: 'petal', x: x0 + R() * (x1 - x0), y: -10, vx: 20 + R() * 20, vy: 40 + R() * 40, g: 4, t: 0, life: 4 + R() * 2, s0: 4 + R() * 3, rot: R() * 6, vr: (R() - 0.5) * 4, col: R() < 0.5 ? C.pinkLight : ok(0.94, 0.07, 80) });
  };
  Wd.clods = function (fx, x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.15 + R() * 0.7), v = 160 + R() * 220;
      fx.push({ k: 'clod', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 620, t: 0, life: 1.3 + R() * 0.6, s0: 4 + R() * 6, rot: R() * 6, vr: (R() - 0.5) * 12, col: R() < 0.5 ? C.soil : C.soilLight });
    }
  };
  Wd.starBurst = function (fx, x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R() * 0.4, v = 70 + R() * 120;
      fx.push({ k: i % 3 ? 'spark' : 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 60, t: 0, life: 0.7 + R() * 0.5, s0: i % 3 ? 7 + R() * 5 : 6 + R() * 3, rot: R() * 6, vr: (R() - 0.5) * 8, col: col || (i % 2 ? C.gold : C.pinkLight) });
    }
  };
  Wd.hearts = function (fx, x, y, n) {
    for (let i = 0; i < n; i++) fx.push({ k: 'heart', x: x + (R() - 0.5) * 60, y: y - R() * 14, vx: (R() - 0.5) * 24, vy: -(40 + R() * 40), g: -4, t: 0, life: 1.4 + R() * 0.6, s0: 1 + R() * 0.8 });
  };
  Wd.ring = function (fx, x, y, s0, s1, col, life) {
    fx.push({ k: 'ring', x, y, vx: 0, vy: 0, g: 0, t: 0, life: life || 0.6, s0, s1, col });
  };
})();
