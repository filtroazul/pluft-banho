/* pluft: o Pluft desenhado em código (placeholder fiel) + a tabela de animações frame a frame (8 fps).
   quando existir img/pluft/<nome>.png (tira horizontal com N quadros), o jogo usa a imagem no lugar
   deste desenho. os nomes e a contagem de quadros aqui são o CONTRATO das tiras de sprite.

   coordenadas locais: origem = pé (centro), y negativo = pra cima. corpo ~140 de altura.
   centro do corpo (pivô das rotações) = (0, CY). */
(function () {
  const P = window.P, C = P.C, TAU = P.TAU, nz = P.nz;
  const D = Math.PI / 180;
  const CY = -82;

  const BASE = {
    sx: 1, sy: 1, rot: 0, dx: 0, dy: 0, back: 0,
    aL: 14, aR: 14, lL: 0, lR: 0,
    eye: 'o', px: 0, py: 0, brow: 0, mouth: 'smile', blush: 0.55,
    sweat: 0, jit: 0, paper: 0, armBack: 0, dizzy: 0, hearts: 0, spark: 0, tears: 0, lean: 0,
    propR: '', propL: '', propRot: 0, propLRot: 0, brushCol: '#e8b020',
    hat: '', blind: 0, soot: 0, splat: 0, zap: 0, hp: 0, cam: 0, naruto: 0,
    bum: 0, towel: 0, foam: 0, wet: 0, bow: 0, flower: 0,
  };
  let SOOT = 0;
  /* quando o pluft está chamuscado, braços e pernas escurecem junto com o corpo */
  function dk(col) {
    if (!SOOT || col.charAt(0) !== '#') return col;
    const n = parseInt(col.slice(1), 16), k = 0.82 * SOOT;
    const m = (v, t) => Math.round(v + (t - v) * k);
    return 'rgb(' + m(n >> 16, 30) + ',' + m((n >> 8) & 255, 22) + ',' + m(n & 255, 28) + ')';
  }

  /* curva fechada suave por pontos */
  function smooth(c, pts) {
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[n - 1], pts[0]);
    c.beginPath();
    c.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], m = mid(p, pts[(i + 1) % n]);
      c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    c.closePath();
  }

  function bodyPts(f, bum) {
    const pts = [], N = 30;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i / N) * TAU, s = Math.sin(a), co = Math.cos(a);
      /* topo mais estreito, quadril largo: a "bundinha grandinha" (bum alarga o quadril ainda mais) */
      const rx = 43 + ((27 + 10 * (bum || 0)) * (1 + s)) / 2 + (nz(i, f) - 0.5) * 1.6;
      pts.push([co * rx, CY + s * 58 + (nz(i + 50, f) - 0.5) * 1.4]);
    }
    return pts;
  }

  function limb(c, x0, y0, x1, y1, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = C.outline; c.lineWidth = w + 6;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = dk(col); c.lineWidth = w;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  }

  function leg(c, side, ang) {
    const a = ang * D, hx = side * 24, hy = -30, L = 30;
    const fx = hx + side * Math.sin(a) * L, fy = hy + Math.cos(a) * L;
    limb(c, hx, hy, fx, fy - 7, 18, C.leg);
    c.save();
    c.translate(fx + side * 4, fy - 4);
    c.rotate(side * (0.1 + a * 0.5));
    c.beginPath(); c.ellipse(0, 0, 17, 9.5, 0, 0, TAU);
    c.fillStyle = dk(C.leg); c.fill();
    c.lineWidth = 3.5; c.strokeStyle = C.outline; c.stroke();
    /* dedinhos */
    c.lineWidth = 2.4; c.beginPath();
    c.moveTo(side * 6, -4.5); c.lineTo(side * 7, 4); c.moveTo(side * 12, -3.5); c.lineTo(side * 12.5, 3.5);
    c.stroke();
    c.restore();
  }

  /* devolve a posição da mão */
  function arm(c, side, ang) {
    const a = ang * D, L = 38, sx0 = side * 51, sy0 = -84;
    const hx = sx0 + side * Math.sin(a) * L, hy = sy0 + Math.cos(a) * L;
    limb(c, sx0, sy0, hx, hy, 12, C.pink);
    c.beginPath(); c.arc(hx, hy, 8.5, 0, TAU);
    c.fillStyle = dk(C.pink); c.fill();
    c.lineWidth = 3.5; c.strokeStyle = C.outline; c.stroke();
    return [hx, hy];
  }

  function antennae(c, p, f) {
    for (const side of [-1, 1]) {
      const bx = side * 15, by = -135;
      const sway = Math.sin(f * 1.7 + side) * 5 + p.lean * 9;
      const tx = bx + side * 13 + sway, ty = by - 31;
      c.lineCap = 'round';
      for (const [w, col] of [[8, C.outline], [4.5, C.pinkShade]]) {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath(); c.moveTo(bx, by + 4);
        c.quadraticCurveTo(bx + side * 2 + sway * 0.3, by - 18, tx, ty); c.stroke();
      }
      c.beginPath(); c.arc(tx, ty, 7.5, 0, TAU);
      c.fillStyle = C.gold; c.fill();
      c.lineWidth = 3; c.strokeStyle = C.outline; c.stroke();
      c.beginPath(); c.arc(tx - 2, ty - 2, 2, 0, TAU);
      c.fillStyle = 'rgba(255,255,255,.8)'; c.fill();
    }
  }

  function eyeAt(c, x, y, p, f, side) {
    const k = p.eye;
    c.lineCap = 'round';
    if (k === 'b' || k === 'c' || k === 'h') {
      c.strokeStyle = C.outline; c.lineWidth = 4.5; c.beginPath();
      if (k === 'b') { c.moveTo(x - 12, y + 1); c.quadraticCurveTo(x, y + 6, x + 12, y + 1); }
      else if (k === 'c') { c.arc(x, y - 4, 11, 0.15 * Math.PI, 0.85 * Math.PI); }
      else { c.arc(x, y + 4, 12, 1.12 * Math.PI, 1.88 * Math.PI); }
      c.stroke();
      return;
    }
    const wide = k === 'w', big = k === 's';
    const rx = wide ? 15.5 : 14.5, ry = wide ? 19.5 : big ? 19 : 17.5;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
    c.fillStyle = C.eyeWhite; c.fill();
    c.lineWidth = 3.5; c.strokeStyle = C.outline; c.stroke();
    if (k === 'x') {
      c.beginPath();
      for (let j = 0; j < 36; j++) {
        const ang = j * 0.5 + f * 1.1 * (side || 1), r = 1 + j * 0.3;
        const px = x + Math.cos(ang) * r * 0.85, py = y + Math.sin(ang) * r;
        j ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.strokeStyle = C.pupil; c.lineWidth = 2.4; c.stroke();
      return;
    }
    const pr = wide ? 5.5 : big ? 11 : 8.2, pry = wide ? 5.8 : big ? 13 : 10.5;
    const ox = P.clamp(p.px, -1, 1) * 5.2, oy = P.clamp(p.py, -1, 1) * 5.8;
    c.beginPath(); c.ellipse(x + ox, y + oy, pr, pry, 0, 0, TAU);
    c.fillStyle = C.pupil; c.fill();
    c.beginPath(); c.arc(x + ox + 2.8, y + oy - 3.5, big ? 3.8 : 3, 0, TAU);
    c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(x + ox - 2.6, y + oy + 3.2, 1.5, 0, TAU);
    c.fill();
    if (k === 't') {
      c.beginPath(); c.ellipse(x, y + ry - 4, rx - 3, 4, 0, 0, TAU);
      c.fillStyle = 'rgba(160,215,255,.85)'; c.fill();
    }
  }

  function mouth(c, p, f) {
    const y = -76;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = SOOT > 0.4 ? '#f3e6ea' : C.outline; c.fillStyle = C.pupil;
    switch (p.mouth) {
      case 'smile':
        c.lineWidth = 4.5; c.beginPath(); c.moveTo(-14, y - 2); c.quadraticCurveTo(0, y + 13, 14, y - 2); c.stroke(); break;
      case 'sad':
        c.lineWidth = 4.5; c.beginPath(); c.moveTo(-12, y + 5); c.quadraticCurveTo(0, y - 8, 12, y + 5); c.stroke(); break;
      case 'flat':
        c.lineWidth = 4.5; c.beginPath(); c.moveTo(-10, y + 2); c.lineTo(10, y + 2); c.stroke(); break;
      case 'o':
        c.beginPath(); c.ellipse(0, y + 2, 6.5, 8, 0, 0, TAU); c.fill(); c.lineWidth = 3; c.stroke(); break;
      case 'mid':
        c.beginPath(); c.ellipse(0, y + 2, 10, 8.5, 0, 0, TAU); c.fill(); c.lineWidth = 3; c.stroke(); break;
      case 'wob': {
        c.lineWidth = 4.5; c.beginPath();
        for (let i = 0; i <= 8; i++) {
          const x = -15 + i * 3.75, yy = y + 2 + (i % 2 ? -3 : 3) * (f % 2 ? 1 : -1);
          i ? c.lineTo(x, yy) : c.moveTo(x, yy);
        }
        c.stroke(); break;
      }
      case 'open':
        c.beginPath(); c.ellipse(0, y + 6, 15, 19, 0, 0, TAU); c.fill(); c.lineWidth = 3.5; c.stroke();
        c.save(); c.clip(); c.beginPath(); c.ellipse(0, y + 22, 11, 9, 0, 0, TAU); c.fillStyle = C.tongue; c.fill(); c.restore(); break;
      case 'big':
        c.beginPath(); c.moveTo(-17, y - 4); c.quadraticCurveTo(0, y - 2, 17, y - 4); c.quadraticCurveTo(14, y + 21, 0, y + 21); c.quadraticCurveTo(-14, y + 21, -17, y - 4); c.closePath();
        c.fill(); c.lineWidth = 3.5; c.stroke();
        c.save(); c.clip(); c.beginPath(); c.ellipse(0, y + 21, 10, 8, 0, 0, TAU); c.fillStyle = C.tongue; c.fill(); c.restore(); break;
    }
  }

  function drop(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y - 7 * s);
    c.quadraticCurveTo(x + 5 * s, y, x, y + 4 * s);
    c.quadraticCurveTo(x - 5 * s, y, x, y - 7 * s);
    c.fillStyle = C.sweat; c.fill();
    c.lineWidth = 2; c.strokeStyle = C.outline; c.stroke();
  }

  function star5(c, x, y, r, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  }
  P.star5 = star5;

  function paperOpen(c, f, shake) {
    c.save();
    c.translate(0, -56);
    c.rotate((nz(f, 7) - 0.5) * 0.05 * shake);
    c.beginPath();
    const w = 27, h = 33, r = 4;
    c.moveTo(-w + r, -h); c.lineTo(w - r, -h); c.quadraticCurveTo(w, -h, w, -h + r);
    c.lineTo(w, h - r); c.quadraticCurveTo(w, h, w - r, h);
    c.lineTo(-w + r, h); c.quadraticCurveTo(-w, h, -w, h - r);
    c.lineTo(-w, -h + r); c.quadraticCurveTo(-w, -h, -w + r, -h); c.closePath();
    c.fillStyle = C.paper; c.fill();
    c.lineWidth = 3.5; c.strokeStyle = C.outline; c.stroke();
    c.strokeStyle = C.ink; c.lineCap = 'round'; c.lineWidth = 2.6;
    const rows = [[-22, 16], [-10, 20], [2, 14], [14, 18], [26, 10]];
    rows.forEach(([yy, ww], i) => {
      c.beginPath();
      c.moveTo(-20, yy - h * 0.55);
      for (let k = 1; k <= 5; k++) c.lineTo(-20 + (k * ww * 2) / 5, yy - h * 0.55 + (k % 2 ? -1.6 : 1.6));
      c.stroke();
    });
    c.restore();
  }

  function crumple(c, x, y, f) {
    c.save();
    c.translate(x, y - 6);
    c.beginPath();
    const N = 11;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU, r = 13 + ((i * 7 + 3) % 5) * 1.6 + (nz(i, f) - 0.5) * 1.2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.9;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
    c.fillStyle = C.paper; c.fill();
    c.lineWidth = 3.3; c.strokeStyle = C.outline; c.stroke();
    c.strokeStyle = C.paperShade; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-6, -3); c.lineTo(2, 2); c.lineTo(-1, 8); c.moveTo(3, -8); c.lineTo(6, -1); c.stroke();
    c.restore();
  }

  function heart(c, x, y, s, col) {
    c.beginPath();
    c.moveTo(x, y + 4 * s);
    c.bezierCurveTo(x - 9 * s, y - 2 * s, x - 5 * s, y - 9 * s, x, y - 4 * s);
    c.bezierCurveTo(x + 5 * s, y - 9 * s, x + 9 * s, y - 2 * s, x, y + 4 * s);
    c.fillStyle = col || C.heart; c.fill();
    c.lineWidth = 2; c.strokeStyle = C.outline; c.stroke();
  }
  P.heart = heart;

  /* ---------- adereços (cartoon, mesmo contorno do personagem) ---------- */
  function fillOut(c, fill, lw) {
    c.fillStyle = fill; c.fill(); c.lineWidth = lw || 3; c.lineJoin = 'round'; c.strokeStyle = C.outline; c.stroke();
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  P.rrect = rrect; P.fillOut = fillOut;

  const WOOD = P.ok(0.62, 0.1, 62), WOOD_D = P.ok(0.48, 0.09, 55), STEEL = P.ok(0.82, 0.02, 250), STEEL_D = P.ok(0.6, 0.03, 255);

  function prop(c, kind, x, y, rot, brushCol, f) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.lineJoin = 'round'; c.lineCap = 'round';
    if (kind === 'spoon') {
      c.strokeStyle = C.outline; c.lineWidth = 11; c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -34); c.stroke();
      c.strokeStyle = WOOD; c.lineWidth = 5.5; c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -34); c.stroke();
      c.beginPath(); c.ellipse(0, -44, 10, 13, 0, 0, TAU); fillOut(c, WOOD);
    } else if (kind === 'brush') {
      c.strokeStyle = C.outline; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -26); c.stroke();
      c.strokeStyle = WOOD_D; c.lineWidth = 4.5; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -26); c.stroke();
      c.fillStyle = STEEL; c.fillRect(-4.5, -33, 9, 9); c.lineWidth = 2.4; c.strokeStyle = C.outline; c.strokeRect(-4.5, -33, 9, 9);
      c.beginPath(); c.moveTo(-5, -33); c.quadraticCurveTo(0, -56, 5, -33); c.closePath(); fillOut(c, brushCol || '#e8b020', 2.6);
    } else if (kind === 'palette') {
      c.beginPath(); c.ellipse(0, -6, 27, 19, -0.25, 0, TAU); fillOut(c, P.ok(0.84, 0.07, 75));
      [['#e8b020', -13, -10], ['#2f6fb0', -3, -17], ['#d8602a', 9, -13], ['#4a9a52', 15, -2]].forEach(([col, dx, dy]) => {
        c.beginPath(); c.arc(dx, dy, 4.6, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 1.6; c.strokeStyle = C.outline; c.stroke();
      });
    } else if (kind === 'chisel') {
      c.beginPath(); c.moveTo(-6, 14); c.lineTo(6, 14); c.lineTo(5, -16); c.lineTo(0, -30); c.lineTo(-5, -16); c.closePath(); fillOut(c, STEEL);
    } else if (kind === 'hammer') {
      c.strokeStyle = C.outline; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 16); c.lineTo(0, -22); c.stroke();
      c.strokeStyle = WOOD; c.lineWidth = 4.5; c.beginPath(); c.moveTo(0, 16); c.lineTo(0, -22); c.stroke();
      rrect(c, -15, -38, 30, 17, 4); fillOut(c, STEEL_D);
    } else if (kind === 'hashi') {
      for (const s of [-1, 1]) {
        c.strokeStyle = C.outline; c.lineWidth = 7; c.beginPath(); c.moveTo(s * 2, 16); c.lineTo(s * 5, -40); c.stroke();
        c.strokeStyle = WOOD; c.lineWidth = 3; c.beginPath(); c.moveTo(s * 2, 16); c.lineTo(s * 5, -40); c.stroke();
      }
    } else if (kind === 'cane') {
      c.strokeStyle = C.outline; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 24); c.lineTo(0, -44); c.stroke();
      c.strokeStyle = P.ok(0.2, 0.02, 280); c.lineWidth = 4.5; c.beginPath(); c.moveTo(0, 24); c.lineTo(0, -44); c.stroke();
      c.fillStyle = P.ok(0.8, 0.125, 85); c.fillRect(-3.5, 14, 7, 10);
      c.beginPath(); c.arc(0, -50, 9, 0, TAU); fillOut(c, P.ok(0.8, 0.125, 85), 3);
    } else if (kind === 'handmirror') {
      /* de costas pra quem joga: só se vê o dourado de trás, com o leque art déco */
      const gold = P.ok(0.8, 0.125, 85), goldD = P.ok(0.62, 0.11, 75);
      c.strokeStyle = C.outline; c.lineWidth = 11; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 22); c.stroke();
      c.strokeStyle = gold; c.lineWidth = 5.5; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 22); c.stroke();
      c.beginPath(); c.ellipse(0, -46, 22, 28, 0, 0, TAU); fillOut(c, gold, 3.6);
      c.strokeStyle = goldD; c.lineWidth = 2;
      for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(0, -30); c.lineTo(k * 6, -70); c.stroke(); }
      c.beginPath(); c.ellipse(0, -46, 13, 18, 0, 0, TAU); c.stroke();
    } else if (kind === 'ladle') {
      c.strokeStyle = C.outline; c.lineWidth = 9; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -30); c.stroke();
      c.strokeStyle = STEEL; c.lineWidth = 3.5; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -30); c.stroke();
      c.beginPath(); c.arc(0, -38, 11, 0, TAU); fillOut(c, STEEL);
    }
    c.restore();
  }

  function headphones(c) {
    c.strokeStyle = C.outline; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.arc(0, -96, 50, Math.PI * 1.04, Math.PI * 1.96); c.stroke();
    c.strokeStyle = P.ok(0.5, 0.2, 290); c.lineWidth = 5;
    c.beginPath(); c.arc(0, -96, 50, Math.PI * 1.04, Math.PI * 1.96); c.stroke();
    for (const s of [-1, 1]) { rrect(c, s * 50 - 9, -112, 18, 34, 7); fillOut(c, P.ok(0.4, 0.2, 290)); }
  }

  function camera(c, x, y) {
    c.save(); c.translate(x, y);
    rrect(c, -34, -18, 68, 38, 7); fillOut(c, P.ok(0.4, 0.04, 260), 3.5);
    rrect(c, -34, -18, 68, 12, 6); fillOut(c, P.ok(0.7, 0.02, 250), 3);
    rrect(c, -22, -26, 14, 10, 3); fillOut(c, P.ok(0.7, 0.02, 250), 2.6);
    c.beginPath(); c.arc(4, 3, 14, 0, TAU); fillOut(c, P.ok(0.3, 0.04, 260), 3.5);
    c.beginPath(); c.arc(4, 3, 8, 0, TAU); c.fillStyle = P.ok(0.55, 0.12, 245); c.fill();
    c.beginPath(); c.arc(1, 0, 2.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill();
    c.restore();
  }

  function blindfold(c) {
    c.beginPath(); c.moveTo(-46, -110); c.lineTo(46, -110); c.lineTo(46, -90); c.lineTo(-46, -90); c.closePath();
    fillOut(c, P.ok(0.42, 0.12, 20), 3.5);
    c.strokeStyle = P.ok(0.62, 0.12, 20); c.lineWidth = 2; c.beginPath(); c.moveTo(-40, -104); c.lineTo(40, -104); c.stroke();
    c.beginPath(); c.moveTo(46, -100); c.lineTo(62, -88); c.lineTo(54, -78); c.lineTo(46, -96); c.closePath(); fillOut(c, P.ok(0.42, 0.12, 20), 3);
  }

  function hat(c, kind) {
    if (kind === 'cartola') {
      const blk = P.ok(0.2, 0.02, 280);
      c.save(); c.translate(0, -138); c.rotate(0.05);
      rrect(c, -27, -52, 54, 56, 5); fillOut(c, blk, 3.6);
      c.beginPath(); c.ellipse(0, 4, 46, 9, 0, 0, TAU); fillOut(c, blk, 3.6);
      c.fillStyle = P.ok(0.8, 0.125, 85); c.fillRect(-27, -10, 54, 9); c.strokeStyle = C.outline; c.lineWidth = 2.4; c.strokeRect(-27, -10, 54, 9);
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-20, -46, 6, 30);
      c.restore();
      return;
    }
    if (kind === 'bowl') {
      c.beginPath(); c.moveTo(-40, -140); c.quadraticCurveTo(0, -196, 40, -140); c.closePath(); fillOut(c, P.ok(0.94, 0.02, 90), 3.5);
      c.beginPath(); c.moveTo(-40, -140); c.quadraticCurveTo(0, -178, 40, -140); c.lineTo(36, -148); c.quadraticCurveTo(0, -180, -36, -148); c.closePath();
      c.fillStyle = P.ok(0.6, 0.17, 25); c.fill();
      c.strokeStyle = P.ok(0.9, 0.1, 95); c.lineWidth = 5; c.lineCap = 'round';
      [-30, -14, 4, 20, 34].forEach((dx, i) => { c.beginPath(); c.moveTo(dx, -146); c.quadraticCurveTo(dx + 6, -128, dx - 3, -112 + (i % 2) * 14); c.stroke(); });
    }
  }

  function splat(c, hue) {
    const col = P.ok(0.5, 0.17, hue);
    c.fillStyle = col;
    [[-26, -118, 13], [30, -78, 17], [-38, -54, 9], [8, -134, 8], [46, -104, 9], [-6, -58, 11]].forEach(([x, y, r]) => {
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.fillRect(x - 2.2, y, 4.4, r * 1.6);
    });
  }

  function zap(c, f) {
    c.strokeStyle = C.gold; c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3 + (f % 3) * 0.5, r0 = 62, r1 = 84 + (k % 2) * 10;
      const x0 = Math.cos(a) * r0, y0 = -100 + Math.sin(a) * r0, x1 = Math.cos(a) * r1, y1 = -100 + Math.sin(a) * r1;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo((x0 + x1) / 2 + 5, (y0 + y1) / 2 - 4); c.lineTo((x0 + x1) / 2 - 4, (y0 + y1) / 2 + 5); c.lineTo(x1, y1); c.stroke();
    }
  }

  /* ---------- pluft 3 (banho): espuma na cabeça, brilho de molhado, toalha art déco ---------- */
  function foamCrown(c, f) {
    const dots = [[-22, -138, 13], [0, -146, 16], [22, -138, 13], [-38, -126, 9], [38, -126, 9], [-10, -160, 10], [12, -158, 9], [0, -134, 11]];
    c.lineJoin = 'round';
    dots.forEach(([x, y, r], i) => {
      const j = (nz(i, f) - 0.5) * 1.6;
      c.beginPath(); c.arc(x + j, y + j, r, 0, TAU); c.fillStyle = '#fbfeff'; c.fill();
      c.lineWidth = 3; c.strokeStyle = C.outline; c.stroke();
    });
    dots.forEach(([x, y, r], i) => {
      const j = (nz(i, f) - 0.5) * 1.6;
      c.beginPath(); c.arc(x + j, y + j, r - 1.6, 0, TAU); c.fillStyle = '#fbfeff'; c.fill();
    });
    c.fillStyle = 'rgba(170,215,240,.55)';
    [[-6, -142, 4], [16, -134, 3], [-26, -132, 3]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
    /* bolinhas soltas subindo */
    for (let k = 0; k < 3; k++) {
      const u = ((f + k * 2) % 6) / 6, x = (k - 1) * 40 + Math.sin(u * 6 + k) * 4, y = -168 - u * 26;
      c.globalAlpha = 1 - u; c.beginPath(); c.arc(x, y, 4 + (k % 2) * 2, 0, TAU);
      c.fillStyle = '#fbfeff'; c.fill(); c.lineWidth = 2; c.strokeStyle = C.outline; c.stroke(); c.globalAlpha = 1;
    }
  }

  function wetShine(c, back) {
    c.save(); c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 4.5;
    if (back) {
      c.beginPath(); c.arc(-27, -52, 22, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
      c.beginPath(); c.arc(27, -52, 22, Math.PI * 1.58, Math.PI * 1.92); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.arc(-27, -52, 12, Math.PI * 1.15, Math.PI * 1.4); c.stroke();
    } else {
      c.beginPath(); c.arc(-30, -56, 24, Math.PI * 1.08, Math.PI * 1.4); c.stroke();
    }
    c.restore();
  }

  function towelPath(c) {
    c.beginPath();
    c.moveTo(-60, -70); c.quadraticCurveTo(0, -62, 60, -70); c.lineTo(73, -22); c.quadraticCurveTo(0, -13, -73, -22); c.closePath();
  }
  function towelWrap(c) {
    const cream = P.ok(0.96, 0.025, 90), gold = P.ok(0.78, 0.13, 85), goldD = P.ok(0.62, 0.11, 75);
    towelPath(c); fillOut(c, cream, 3.8);
    c.save(); towelPath(c); c.clip();
    c.fillStyle = gold; c.fillRect(-80, -46, 160, 8);
    c.fillStyle = goldD; c.fillRect(-80, -37, 160, 3);
    c.strokeStyle = gold; c.lineWidth = 2.2;
    for (let x = -66; x < 70; x += 14) { c.beginPath(); c.moveTo(x, -24); c.lineTo(x + 7, -32); c.lineTo(x + 14, -24); c.stroke(); }
    c.restore();
    towelPath(c); c.lineWidth = 3.8; c.strokeStyle = C.outline; c.stroke();
    /* nó no quadril */
    c.beginPath(); c.ellipse(-50, -61, 12, 9, 0.5, 0, TAU); fillOut(c, cream, 3.2);
    c.strokeStyle = C.outline; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-56, -64); c.quadraticCurveTo(-50, -59, -43, -62); c.stroke();
  }

  /* ---------- pluft arrumado: gravata borboleta, florzinha de lapela ---------- */
  function bowTie(c) {
    const blk = P.ok(0.2, 0.02, 280), gold = P.ok(0.8, 0.125, 85);
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 3, -58); c.lineTo(s * 22, -69); c.lineTo(s * 22, -47); c.closePath(); fillOut(c, blk, 3.2);
    }
    c.beginPath(); c.arc(0, -58, 6.5, 0, TAU); fillOut(c, gold, 2.8);
  }
  function flowerPin(c) {
    const x = -38, y = -52;
    c.strokeStyle = C.outline; c.lineWidth = 3.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x - 3, y + 17); c.stroke();
    c.strokeStyle = P.ok(0.55, 0.14, 145); c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x - 3, y + 17); c.stroke();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU - Math.PI / 2;
      c.beginPath(); c.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5.2, 0, TAU); fillOut(c, P.ok(0.6, 0.21, 22), 2.2);
    }
    c.beginPath(); c.arc(x, y, 4, 0, TAU); fillOut(c, C.gold, 2);
  }

  function narutoMark(c) {
    c.beginPath(); c.arc(0, -126, 12, 0, TAU); fillOut(c, P.ok(0.97, 0.02, 90), 2.6);
    c.beginPath();
    for (let j = 0; j < 22; j++) { const a = j * 0.55, r = 1 + j * 0.45; j ? c.lineTo(Math.cos(a) * r, -126 + Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, -126 + Math.sin(a) * r); }
    c.strokeStyle = P.ok(0.68, 0.17, 5); c.lineWidth = 2.4; c.stroke();
  }

  function draw(c, pose, f, fb, fj) {
    if (fb == null) fb = f;
    if (fj == null) fj = f;
    const p = Object.assign({}, BASE, pose);
    SOOT = p.soot || 0;
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'round';
    const jx = p.jit ? (nz(fj, 1) - 0.5) * 2 * p.jit : 0;
    const jy = p.jit ? (nz(fj, 2) - 0.5) * p.jit : 0;
    c.translate(p.dx + jx, p.dy + jy);
    c.scale(p.sx, p.sy);
    c.translate(0, CY); c.rotate(p.rot); c.translate(0, -CY);

    let hR = null;
    if (p.armBack) hR = arm(c, 1, p.aR);
    antennae(c, p, f);
    leg(c, -1, p.lL); leg(c, 1, p.lR);

    /* corpo */
    const pts = bodyPts(fb, p.bum);
    smooth(c, pts); c.fillStyle = C.pink; c.fill();
    c.save();
    smooth(c, pts); c.clip();
    c.fillStyle = C.pinkShade;
    c.beginPath(); c.ellipse(32, -44, 72, 82, 0, 0, TAU); c.fill();
    c.fillStyle = C.pink;
    c.beginPath(); c.ellipse(-7, -88, 68, 70, 0, 0, TAU); c.fill();
    if (!p.back) {
      c.fillStyle = C.belly;
      c.beginPath(); c.ellipse(0, -46, 36, 26, 0, 0, TAU); c.fill();
    } else {
      /* costas: duas bochechas da bunda + fenda + rabinho */
      for (const s of [-1, 1]) {
        c.beginPath(); c.arc(s * (25 + 3 * p.bum), -48, 30 + 5 * p.bum, 0, TAU);
        c.fillStyle = s < 0 ? C.pinkLight : C.pink; c.globalAlpha = s < 0 ? 0.5 : 0.9; c.fill(); c.globalAlpha = 1;
        c.lineWidth = 2.6; c.strokeStyle = C.outline; c.globalAlpha = 0.55; c.stroke(); c.globalAlpha = 1;
      }
      c.lineWidth = 3.2; c.strokeStyle = C.outline;
      c.beginPath(); c.moveTo(0, -82); c.bezierCurveTo(5, -66, -5, -48, 0, -26); c.stroke();
      c.beginPath(); c.arc(0, -76, 8.5, 0, TAU); c.fillStyle = C.pinkLight; c.fill();
      c.lineWidth = 3; c.stroke();
    }
    if (p.splat) splat(c, p.splat);
    if (p.soot) { c.fillStyle = 'rgba(28,20,26,' + 0.82 * p.soot + ')'; c.fillRect(-120, -220, 240, 260); }
    c.fillStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.ellipse(-29, -124, 10, 5, -0.7, 0, TAU); c.fill();
    c.beginPath(); c.arc(-14, -131, 2.6, 0, TAU); c.fill();
    c.restore();
    smooth(c, pts); c.lineWidth = 4.5; c.strokeStyle = C.outline; c.stroke();
    if (p.wet) wetShine(c, p.back);
    if (p.towel) towelWrap(c);
    if (p.bow && !p.back) bowTie(c);
    if (p.flower && !p.back) flowerPin(c);
    if (p.foam) foamCrown(c, f);

    /* rosto */
    if (!p.back) {
      c.globalAlpha = Math.min(1, p.blush);
      for (const s of [-1, 1]) {
        c.beginPath(); c.ellipse(s * 38, -84, 10, 6, 0, 0, TAU); c.fillStyle = C.blush; c.fill();
      }
      c.globalAlpha = 1;
      eyeAt(c, -21, -100, p, f, -1);
      eyeAt(c, 21, -100, p, f, 1);
      if (p.blind) blindfold(c);
      if (p.brow) {
        c.strokeStyle = C.outline; c.lineWidth = 4; c.lineCap = 'round';
        for (const s of [-1, 1]) {
          c.beginPath();
          c.moveTo(s * 9, p.brow < 0 ? -131 : -124);
          c.lineTo(s * 30, p.brow < 0 ? -123 : -131);
          c.stroke();
        }
      }
      mouth(c, p, f);
      if (p.sweat) {
        drop(c, -50, -118 + (f % 2) * 3, 1.15);
        if (p.sweat > 1) drop(c, 54, -108 + ((f + 1) % 2) * 3, 0.95);
      }
      if (p.tears) {
        for (const s of [-1, 1]) {
          const t = (f + (s > 0 ? 1 : 0)) % 3;
          drop(c, s * 28, -80 + t * 8, 1.1 - t * 0.12);
        }
      }
    }

    if (!p.back) {
      if (p.hat) hat(c, p.hat);
      if (p.naruto) narutoMark(c);
      if (p.hp) headphones(c);
      if (p.cam) camera(c, 0, -96);
    }

    /* papel (atrás das mãos) e braços da frente */
    if (p.paper === 2) paperOpen(c, f, 1 + p.jit);
    if (!p.armBack) hR = arm(c, 1, p.aR);
    const hL = arm(c, -1, p.aL);
    if (p.propL && hL) prop(c, p.propL, hL[0], hL[1], p.propLRot, p.brushCol, f);
    if (p.propR && hR) prop(c, p.propR, hR[0], hR[1], p.propRot, p.brushCol, f);
    if (p.paper === 1) {
      const a = p.aR * D;
      crumple(c, 51 + Math.sin(a) * 38, -84 + Math.cos(a) * 38, f);
    }

    /* extras */
    if (p.dizzy) {
      for (let k = 0; k < 3; k++) {
        const a = f * 0.95 + (k * TAU) / 3;
        star5(c, Math.cos(a) * 46, -152 + Math.sin(a) * 9, 7.5, a);
        c.fillStyle = C.gold; c.fill(); c.lineWidth = 2.6; c.strokeStyle = C.outline; c.stroke();
      }
    }
    if (p.hearts) {
      for (let k = 0; k < 3; k++) {
        const t = ((f + k * 2) % 6) / 6;
        c.globalAlpha = 1 - t;
        heart(c, (k - 1) * 30 + Math.sin(t * 6 + k) * 5, -148 - t * 38, 1.1 - t * 0.3);
        c.globalAlpha = 1;
      }
    }
    if (p.spark) {
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7 + 0.4, r = 76 + (k % 2) * 14;
        const tw = ((f + k) % 3) / 3, sz = 4 + tw * 6;
        const x = Math.cos(a) * r, y = -88 + Math.sin(a) * r * 0.85;
        c.beginPath();
        c.moveTo(x, y - sz); c.quadraticCurveTo(x, y, x + sz, y); c.quadraticCurveTo(x, y, x, y + sz);
        c.quadraticCurveTo(x, y, x - sz, y); c.quadraticCurveTo(x, y, x, y - sz);
        c.fillStyle = C.gold; c.fill();
      }
    }
    if (p.zap) zap(c, f);
    c.restore();
    SOOT = 0;
  }

  /* -------- animações (n quadros, 8 fps) -------- */
  const A = (P.ANIMS = {});
  const osc = (i, n, ph) => Math.sin((i / n + (ph || 0)) * TAU);
  function def(name, n, loop, fn) { A[name] = { n, fps: 8, loop, f: fn }; }

  def('idle', 4, true, (i, n) => ({
    sy: 1 + 0.02 * osc(i, n), sx: 1 - 0.012 * osc(i, n),
    aL: 14 + 3 * osc(i, n), aR: 14 - 3 * osc(i, n), eye: i === 3 ? 'b' : 'o', mouth: 'smile',
  }));
  def('talk', 4, true, (i) => ({
    sy: 1 + (i % 2 ? 0.02 : -0.005), mouth: ['o', 'mid', 'smile', 'mid'][i],
    aL: 14 + (i % 2) * 6, aR: 14 - (i % 2) * 4, eye: 'o',
  }));
  def('look', 6, true, (i) => ({
    px: [0, -1, -1, 0, 1, 1][i], rot: [0, -0.04, -0.04, 0, 0.04, 0.04][i], mouth: 'flat', brow: -1, sweat: i === 2 || i === 5 ? 1 : 0,
  }));
  def('nervous', 4, true, (i) => ({
    jit: 2.2, eye: 'w', mouth: 'wob', sweat: 1 + (i % 2), brow: -1, aL: -38, aR: -38,
    lL: i % 2 ? -7 : 5, lR: i % 2 ? 5 : -7, sy: 1 - 0.015 * (i % 2),
  }));
  def('nervousPaper', 4, true, (i) => ({
    jit: 2.6, eye: 'w', mouth: 'wob', sweat: 1 + (i % 2), brow: -1, aL: -38, aR: -38, paper: 2,
    lL: i % 2 ? -7 : 5, lR: i % 2 ? 5 : -7,
  }));
  def('calm', 4, true, (i, n) => ({
    sy: 1 + 0.035 * osc(i, n), sx: 1 - 0.02 * osc(i, n), eye: 'c', mouth: 'smile', blush: 0.9, paper: 2,
    aL: -38, aR: -38, hearts: 1,
  }));
  def('paper', 4, true, (i, n) => ({
    sy: 1 + 0.02 * osc(i, n), paper: 2, aL: -38, aR: -38, eye: i === 3 ? 'b' : 'o', mouth: 'smile',
  }));
  def('paperTalk', 4, true, (i, n) => ({
    sy: 1 + 0.02 * osc(i, n), paper: 2, aL: -38, aR: -38, eye: 'o', mouth: ['o', 'mid', 'smile', 'mid'][i],
  }));
  def('read', 6, true, (i) => ({
    paper: 2, aL: -38, aR: -38, eye: 'o', py: 0.9, px: [-1, -0.4, 0.2, 0.8, 0.2, -0.4][i],
    mouth: ['o', 'smile', 'o', 'smile', 'flat', 'smile'][i], jit: 0.35, blush: 0.7,
  }));
  def('reach', 6, false, (i) => [
    { eye: 'o', mouth: 'smile' },
    { eye: 'w', px: 1, mouth: 'o', sweat: 1, brow: -1, rot: 0.03 },
    { eye: 'w', px: 1, mouth: 'flat', rot: 0.1, armBack: 1, aR: 20, sweat: 1, lean: 1 },
    { eye: 'b', mouth: 'flat', rot: 0.14, armBack: 1, aR: 28, jit: 1.2, sweat: 2, lL: 4, lR: -5 },
    { eye: 'o', mouth: 'o', rot: 0.05, aR: 96, paper: 1, sy: 1.04 },
    { eye: 'o', py: 0.8, mouth: 'wob', aR: 70, paper: 1, sweat: 1, brow: -1 },
  ][i]);
  def('hold', 4, true, (i) => ({
    paper: 1, aR: 70 + (i % 2) * 6, eye: i === 3 ? 'b' : 'o', mouth: 'smile', sweat: 1,
  }));
  def('holdTalk', 4, true, (i) => ({
    paper: 1, aR: 70 + (i % 2) * 6, eye: 'o', mouth: ['o', 'mid', 'smile', 'mid'][i], sweat: 1,
  }));
  def('wave', 6, true, (i) => ({
    aR: [140, 168, 140, 168, 140, 168][i], aL: 14, eye: 'h', mouth: 'big', blush: 0.9, sy: 1 + (i % 2) * 0.02, spark: 1,
  }));
  def('happy', 4, true, (i) => ({
    aL: 160 + (i % 2) * 10, aR: 160 - (i % 2) * 10, eye: 'h', mouth: 'big', blush: 0.95,
    sy: [1, 1.07, 1, 0.95][i], dy: [0, -6, 0, 0][i], spark: 1,
  }));
  def('catch', 4, false, (i) => [
    { aL: 120, aR: 120, eye: 'w', mouth: 'o', sy: 1.05 },
    { aL: 170, aR: 170, eye: 'w', mouth: 'o', sy: 1.08, dy: -4 },
    { aL: 175, aR: 175, eye: 's', mouth: 'mid', sy: 1.03, spark: 1 },
    { aL: 160, aR: 160, eye: 'h', mouth: 'big', sy: 0.97, spark: 1 },
  ][i]);
  def('emotional', 4, true, (i, n) => ({
    eye: 't', mouth: 'wob', blush: 1, tears: 1, aL: -30, aR: -30, brow: -1, sx: 1 + 0.015 * osc(i, n), sy: 1 - 0.01 * osc(i, n), jit: 0.5,
  }));
  def('dizzy', 4, true, (i) => ({
    eye: 'x', mouth: 'wob', dizzy: 1, rot: [-0.06, 0, 0.06, 0][i], aL: 40, aR: 40, sy: 1 - (i % 2) * 0.015,
  }));
  def('fall', 6, true, (i, n) => ({
    sx: 0.92, sy: 1.12, aL: 150 + 30 * osc(i, n), aR: 150 - 30 * osc(i, n),
    lL: 20 * osc(i, n), lR: -20 * osc(i, n), eye: 'w', mouth: 'open', sweat: 2, brow: -1,
  }));
  def('stuck', 4, true, (i) => ({
    back: 1, rot: Math.PI, lL: [18, 4, -10, 4][i], lR: [-10, 4, 18, 4][i], aL: 30, aR: 30, jit: 0.4,
  }));
  def('pull', 4, true, (i) => ({
    back: 1, rot: Math.PI, lL: [28, 8, -16, 8][i], lR: [-16, 8, 28, 8][i], aL: 50, aR: 50,
    sx: [0.96, 1.03, 0.96, 1.03][i], jit: 1.6,
  }));
  def('pop', 6, false, (i) => ({
    back: i < 2 ? 1 : 0, lL: [20, -15, 25, -10, 15, 0][i], lR: [-15, 20, -10, 25, 0, 15][i],
    aL: 150, aR: 150, eye: i < 2 ? 'o' : 'w', mouth: 'open', sy: 1.06,
  }));
  def('impact', 5, false, (i) => [
    { back: 1, rot: Math.PI, sy: 1.3, sx: 0.85, lL: 8, lR: 8 },
    { back: 1, rot: Math.PI, sy: 0.55, sx: 1.35, lL: 30, lR: 30 },
    { back: 1, rot: Math.PI, sy: 1.15, sx: 0.92, lL: -10, lR: 14 },
    { back: 1, rot: Math.PI, sy: 0.94, sx: 1.04, lL: 16, lR: -8 },
    { back: 1, rot: Math.PI, sy: 1.0, lL: 6, lR: 6 },
  ][i]);

  /* ---------- animações do pluft 2 (tímido, cozinheiro, artista) ---------- */
  def('walk', 4, true, (i) => ({
    lL: [24, 0, -24, 0][i], lR: [-24, 0, 24, 0][i], aL: [26, 14, 0, 14][i], aR: [0, 14, 26, 14][i],
    dy: [0, -4, 0, -4][i], rot: [0.03, 0, -0.03, 0][i], eye: 'o', mouth: 'smile',
  }));
  def('shy', 4, true, (i, n) => ({
    aL: -122 + (i % 2) * 4, aR: -122 - (i % 2) * 4, eye: 'c', mouth: 'smile', blush: 1, sweat: 1,
    sy: 1 + 0.015 * osc(i, n), rot: [-0.03, 0, 0.03, 0][i],
  }));
  def('peek', 4, true, (i) => ({
    px: 1, eye: 'o', mouth: 'flat', blush: 1, brow: -1, aL: -100, aR: 30, rot: 0.05, sweat: i % 2, jit: 0.3,
  }));
  def('cook', 4, true, (i) => ({
    propR: 'spoon', aR: [-30, -46, -58, -46][i], aL: 14, eye: 'o', px: 0.5, py: 0.7, mouth: i % 2 ? 'smile' : 'o',
    blush: 0.7, sy: 1 + 0.015 * (i % 2), sweat: 1,
  }));
  def('panic', 4, true, (i) => ({
    aL: [150, 175, 150, 175][i], aR: [175, 150, 175, 150][i], eye: 'w', mouth: 'open', sweat: 2, brow: -1, jit: 1.5,
    lL: i % 2 ? -14 : 14, lR: i % 2 ? 14 : -14, dy: i % 2 ? -5 : 0,
  }));
  def('proud', 4, true, (i) => ({
    aL: 46, aR: 46, eye: 'h', mouth: 'smile', blush: 1, spark: 1, sy: 1.04 + 0.012 * (i % 2), dy: i % 2 ? -2 : 0,
  }));
  def('ashamed', 4, true, (i) => ({
    eye: 'b', mouth: 'sad', brow: -1, sweat: 1, blush: 1, aL: 20, aR: 20, rot: 0.05, sy: 0.96 + 0.01 * (i % 2), dy: 2,
  }));
  def('paint', 4, true, (i) => ({
    propR: 'brush', propL: 'palette', aR: [-60, -80, -100, -80][i], aL: 30, propRot: [-0.2, 0, 0.2, 0][i],
    eye: 'o', px: 1, py: -0.2, mouth: i % 2 ? 'o' : 'smile', blush: 0.7,
  }));
  def('chisel', 4, true, (i) => ({
    propL: 'chisel', propR: 'hammer', propRot: [-0.8, -0.2, 0.5, -0.2][i], aL: 100, aR: [150, 120, 70, 120][i],
    eye: 'b', mouth: 'flat', blind: 1, sy: 1 + 0.015 * (i % 2),
  }));
  def('dj', 4, true, (i) => ({
    hp: 1, aL: [30, 50, 30, 50][i], aR: [50, 30, 50, 30][i], eye: 'h', mouth: ['big', 'smile', 'big', 'smile'][i],
    dy: [0, -5, 0, -5][i], sy: [1, 1.03, 1, 0.97][i], rot: [-0.05, 0, 0.05, 0][i], blush: 0.9,
  }));
  def('photo', 4, true, (i) => ({
    cam: 1, aL: -128, aR: -128, blush: 0.9, sy: 1 + 0.012 * (i % 2), rot: [0, 0.015, 0, -0.015][i],
  }));
  def('gasp', 4, true, (i) => ({
    eye: 'w', mouth: 'o', aL: 100, aR: 100, sy: 1.04, sweat: 2, brow: -1, jit: 0.8, dy: i % 2 ? -2 : 0,
  }));
  def('bowl', 4, true, (i) => ({
    hat: 'bowl', naruto: 1, eye: 'w', mouth: 'wob', aL: 30, aR: 30, sweat: 1, sy: 1 - 0.01 * (i % 2), rot: [0.04, 0, -0.04, 0][i],
  }));

  /* ---------- animações do pluft 3 (banho) ---------- */
  const SH = { foam: 1, wet: 1 };
  /* de costas, cantando com sabão na cabeça */
  def('showerSing', 4, true, (i) => Object.assign({
    back: 1, bum: 1, aL: [150, 168, 150, 168][i], aR: [168, 150, 168, 150][i],
    rot: [-0.04, 0, 0.04, 0][i], dx: [-3, 0, 3, 0][i], sy: 1 + 0.01 * (i % 2),
  }, SH));
  /* quando as bolhas saem: ele rebola de verdade */
  def('showerDance', 4, true, (i) => Object.assign({
    back: 1, bum: 1, aL: [165, 120, 165, 120][i], aR: [120, 165, 120, 165][i],
    rot: [-0.1, 0, 0.1, 0][i], dx: [-9, 0, 9, 0][i], dy: [0, -4, 0, -4][i],
    lL: [10, 0, -10, 0][i], lR: [-10, 0, 10, 0][i], sx: [1.03, 0.97, 1.03, 0.97][i], sy: [0.98, 1.03, 0.98, 1.03][i],
  }, SH));
  /* sentiu um olhar */
  def('sensed', 4, true, (i) => Object.assign({
    back: 1, bum: 1, aL: 12, aR: 12, jit: 0.5, rot: [0.01, 0, -0.01, 0][i], lean: 1,
  }, SH));
  def('turn', 6, false, (i) => Object.assign([
    { back: 1, bum: 1, sx: 0.86, rot: 0.02, aL: 12, aR: 12 },
    { back: 1, bum: 1, sx: 0.55, aL: 14, aR: 14 },
    { back: 1, bum: 1, sx: 0.2, aL: 20, aR: 20 },
    { sx: 0.2, eye: 'w', mouth: 'o', brow: -1, aL: 20, aR: 20 },
    { sx: 0.62, eye: 'w', mouth: 'o', brow: -1, aL: 20, aR: 20, sweat: 1 },
    { sx: 1, eye: 'w', mouth: 'o', brow: -1, aL: 20, aR: 20, sweat: 2 },
  ][i], SH));
  def('stunned', 4, true, (i) => Object.assign({
    eye: 'w', mouth: 'o', brow: -1, aL: 20, aR: 20, jit: 0.8, sweat: 2, dy: i % 2 ? -2 : 0,
  }, SH));
  def('startle', 4, false, (i) => Object.assign({
    eye: 'w', mouth: 'open', aL: 170, aR: 170, brow: -1, sweat: 2, jit: 1.6,
    dy: [0, -16, -10, 0][i], sy: [1.08, 1.12, 1.06, 1][i], lL: [0, 12, -12, 0][i], lR: [0, -12, 12, 0][i],
  }, SH));
  def('grab', 4, false, (i) => Object.assign({
    towel: [0, 1, 1, 1][i], eye: 'w', mouth: 'o', brow: -1, sweat: 2, jit: 1.2,
    aL: [150, 40, -40, -62][i], aR: [150, 40, -40, -62][i], dy: [-6, -2, 0, 0][i],
  }, SH));
  /* de toalha, morrendo de vergonha */
  def('cover', 4, true, (i) => Object.assign({
    towel: 1, aL: -62, aR: -62, eye: 'b', mouth: 'wob', blush: 1, sweat: 2, brow: -1, jit: 1.1,
    rot: [-0.03, 0, 0.03, 0][i], sy: 1 - 0.01 * (i % 2),
  }, SH));
  def('coverTalk', 4, true, (i) => Object.assign({
    towel: 1, aL: -62, aR: -62, eye: 'w', mouth: ['open', 'mid', 'o', 'mid'][i], blush: 1, sweat: 2, brow: -1, jit: 0.9,
    rot: [-0.03, 0, 0.03, 0][i],
  }, SH));

  /* olhando o espelho de mão (só se vê o verso dele) */
  def('mirror', 4, true, (i) => ({
    propR: 'handmirror', propRot: 0.12, aR: -52, aL: 14, eye: 'o', py: 0.9, mouth: 'smile', blush: 0.85,
    sy: 1 + 0.012 * (i % 2), rot: [0, 0.01, 0, -0.01][i],
  }));

  P.rig = { draw, CY, star5, heart, prop, rrect, fillOut, camera };
})();
