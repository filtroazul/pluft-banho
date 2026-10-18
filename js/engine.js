/* pluft 2: motor. diálogo, entrada (arrastar / segurar / tocar), itens arrastáveis, jogo de segurar,
   transições, a "lista", o pluft (andar, pular, adereços) e o laço de desenho.
   as cenas ficam em cenas-*.js e usam este objeto: P.E. */
(function () {
  const P = window.P, C = P.C, T = P.T, TAU = P.TAU, clamp = P.clamp, lerp = P.lerp;
  const Wd = P.world, au = P.audio;
  const $ = (id) => document.getElementById(id);
  const cv = $('c'), ctx = cv.getContext('2d');
  const el = {
    card: $('card'), typed: $('typed'), rest: $('rest'), sr: $('sr'), tag: $('tag'), more: $('more'),
    hint: $('hint'), hintTxt: $('hintTxt'), start: $('start'), fim: $('fim'), mute: $('mute'), go: $('go'),
    fade: $('fade'), lista: $('lista'),
  };

  const L = (P.L = { W: 360 });
  const pl = {
    vis: false, x: 0, y: 0, s: 0.85, rot: 0, sq: 0, anim: 'idle', base: 'idle', animT: 0, mod: {}, once: null,
    shadow: 0, flip: 1, walk: null, hop: null,
  };
  const G = (P.G = {
    now: 0, ts: 1, runId: 0, timers: [], waits: [], scene: 'start', pl, shake: 0, flash: 0, fx: [], caps: [], drags: [],
    ptr: { down: false, x: 0, y: 0, sx: 0, sy: 0, moved: 0, carry: null }, taps: [], ghost: null,
    hold: null, locked: false, allowPoke: false, pokeI: 0, quipUntil: 0, sc: null, found: {}, arte: {}, exits: [], tws: [],
  });
  const S = { active: false, text: '', shown: 0, typing: false, res: null, auto: 0, waitT: 0, lastN: 0 };
  const E = (P.E = { G, pl, L, ctx, cv, el, au, Wd, T });

  /* ---------- layout ---------- */
  function layout() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    L.dpr = dpr;
    L.S = w / h < 0.5625 ? w / 360 : Math.min(h / 640, 1.3);
    L.H = h / L.S;
    L.ox = (w - 360 * L.S) / 2;
    L.vx0 = -L.ox / L.S; L.vx1 = 360 + L.ox / L.S;
    L.floor = Math.round(L.H * 0.8);
    Wd.room(Wd.current(), L);
    if (E.onLayout) E.onLayout();
  }

  /* ---------- tempo, esperas ---------- */
  const fastK = P.Q.fast ? 6 : 1;
  E.fastK = fastK;
  const wait = (ms) => new Promise((r) => G.timers.push({ at: G.now + ms / 1000 / fastK, r }));
  const until = (fn) => new Promise((r) => G.waits.push({ fn, r }));
  E.wait = wait; E.until = until;
  /* anima obj[key] até 'to' em 'sec' segundos */
  E.tween = (o, k, to, sec, ease) => new Promise((r) => G.tws.push({ o, k, f: o[k], to, d: Math.max(0.001, sec / fastK), t: 0, e: ease || P.easeInOut, r }));
  E.slow = (k) => { G.ts = k; };

  /* ---------- UI: diálogo, dica ---------- */
  function showCard(text, o) {
    el.card.hidden = false;
    el.card.dataset.len = text.length > 300 ? 'xl' : text.length > 215 ? 'l' : text.length > 150 ? 'm' : 's';
    el.card.classList.toggle('narr', !!(o && o.tag === false));
    el.tag.hidden = !!(o && o.tag === false);
    el.sr.textContent = text;
    el.card.classList.remove('pop'); void el.card.offsetWidth; el.card.classList.add('pop');
  }
  function say(text, o) {
    o = o || {};
    return new Promise((res) => {
      S.active = true; S.text = text; S.shown = 0; S.lastN = 0; S.typing = true; S.res = res; S.auto = o.auto || 0; S.waitT = 0;
      G.quipUntil = 0;
      showCard(text, o);
      el.typed.textContent = ''; el.rest.textContent = text;
      el.more.classList.remove('on');
      hint(null);
    });
  }
  async function sayAll(list, o) { for (const l of list) await say(l, o); }
  function finishSay() {
    S.active = false;
    const r = S.res; S.res = null; el.more.classList.remove('on');
    if (r) r();
  }
  function advance() {
    if (!S.active) return false;
    if (S.typing) { S.shown = S.text.length + 1; return true; }
    finishSay(); au.pop();
    return true;
  }
  function hideCard() { el.card.hidden = true; G.quipUntil = 0; }
  function quip(text, ms) {
    if (S.active) return;
    showCard(text);
    el.typed.textContent = text; el.rest.textContent = '';
    el.more.classList.remove('on');
    G.quipUntil = G.now + (ms || 2400) / 1000;
    au.blip(1.2);
  }
  function hint(text) {
    if (!text) { el.hint.hidden = true; return; }
    if (!S.active) hideCard();
    el.hintTxt.textContent = text; el.hint.hidden = false;
  }
  function cap(text, o) {
    G.caps.push(Object.assign({ text, x: L.W / 2, y: L.H * 0.3, size: 56, t: 0, life: 2, col: C.cap, shake: 0 }, o));
  }
  Object.assign(E, { say, sayAll, quip, hint, hideCard, cap, isSaying: () => S.active });

  /* ---------- o pluft ---------- */
  const TALK = { idle: 'talk', paper: 'paperTalk', hold: 'holdTalk', cover: 'coverTalk' };
  function setAnim(name) { if (pl.anim !== name) { pl.anim = name; pl.animT = 0; } }
  function playOnce(name) {
    return new Promise((r) => {
      const A = P.ANIMS[name];
      pl.once = { name, dur: A.n / A.fps, r }; pl.anim = name; pl.animT = 0;
    });
  }
  const frameOf = (name, t) => {
    const A = P.ANIMS[name], f = Math.floor(t * A.fps);
    return A.loop ? f % A.n : Math.min(f, A.n - 1);
  };
  const chest = () => ({ x: pl.x, y: pl.y - 64 * pl.s });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function walk(x, dur) {
    return new Promise((r) => { pl.walk = { x0: pl.x, x1: x, t: 0, dur: dur || Math.max(0.3, Math.abs(x - pl.x) / 95), r }; });
  }
  function hop(h) { pl.hop = { t: 0, dur: 0.38, h: h || 22 }; }
  /* o pluft de pé atrás do balcão (só do peito pra cima) ou no chão */
  function stand(x, o) {
    o = o || {};
    pl.vis = true; pl.x = x; pl.s = o.s || 0.85; pl.rot = 0; pl.once = null; pl.walk = null; pl.hop = null; pl.mod = {};
    pl.shadow = o.shadow || 0; pl.flip = o.flip || 1; pl.base = o.base || 'idle';
    pl.y = o.y != null ? o.y : L.bench - 4;
  }
  Object.assign(E, { playOnce, chest, dist, walk, hop, stand, setAnim });
  E.base = (n) => { pl.base = n; };

  /* ---------- itens arrastáveis (com caminho fácil: tocar também leva ao destino) ---------- */
  function addDrag(o) {
    const it = Object.assign({ state: 'idle', r: 30, t: 0, ph: Math.random() * 6, hx: o.x, hy: o.y, rot: 0, s: 1, glow: true, off: false }, o);
    it.x = o.x; it.y = o.y;
    G.drags.push(it);
    return it;
  }
  function stepDrags(dt) {
    const ptr = G.ptr;
    for (const it of G.drags) {
      it.t += dt;
      const tg = it.target ? (typeof it.target === 'function' ? it.target() : it.target) : null;
      if (it.state === 'idle') {
        it.x = it.hx; it.y = it.hy + Math.sin(G.now * 2.4 + it.ph) * (it.glow ? 2.5 : 0);
        if (!it.off && ptr.down && !ptr.carry && !G.locked && dist(ptr, it) < it.r + 14) { ptr.carry = it; it.state = 'drag'; au.pop(); if (it.onGrab) it.onGrab(it); }
      } else if (it.state === 'drag') {
        it.x = lerp(it.x, ptr.x, Math.min(1, dt * 24)); it.y = lerp(it.y, ptr.y - 14, Math.min(1, dt * 24));
        if (!ptr.down) {
          ptr.carry = null;
          if (tg && (ptr.moved < 12 || dist(it, tg) < tg.r)) it.state = 'fly';
          else it.state = 'home';
        }
      } else if (it.state === 'home') {
        it.x = lerp(it.x, it.hx, Math.min(1, dt * 12)); it.y = lerp(it.y, it.hy, Math.min(1, dt * 12));
        if (dist(it, { x: it.hx, y: it.hy }) < 2) it.state = 'idle';
        if (!it.off && ptr.down && !ptr.carry && !G.locked && dist(ptr, it) < it.r + 14) { ptr.carry = it; it.state = 'drag'; }
      } else if (it.state === 'fly' && tg) {
        const d = dist(it, tg), v = 420;
        it.x += ((tg.x - it.x) / (d || 1)) * Math.min(d, v * dt); it.y += ((tg.y - it.y) / (d || 1)) * Math.min(d, v * dt);
        if (Math.random() < 0.4) G.fx.push({ k: 'spark', x: it.x, y: it.y, vx: 0, vy: 10, g: 0, t: 0, life: 0.3, s0: 4, col: C.gold });
        if (d < 8) { it.state = 'done'; if (it.onDone) it.onDone(it); }
      }
    }
    G.drags = G.drags.filter((i) => i.state !== 'done' || i.keep);
  }
  function drawDrags(c) {
    for (const it of G.drags) {
      if (it.hidden) continue;
      c.save();
      c.translate(it.x, it.y);
      const sc = (it.s || 1) * (it.state === 'drag' ? 1.12 : 1);
      c.scale(sc, sc);
      if (it.state === 'idle' && it.glow && !it.off) {
        c.beginPath(); c.arc(0, 0, it.r + 4 + Math.sin(G.now * 3 + it.ph) * 2, 0, TAU);
        c.strokeStyle = 'rgba(255,255,255,.45)'; c.setLineDash([5, 7]); c.lineWidth = 2.5; c.stroke(); c.setLineDash([]);
      }
      if (it.draw) it.draw(c, it);
      c.restore();
    }
  }
  E.addDrag = addDrag;
  E.clearDrags = () => { G.drags = []; G.ptr.carry = null; };

  /* ---------- jogo de segurar (acalmar, mexer, esperar, firmar a mão, carregar o drop) ---------- */
  function holdGame(o) {
    return new Promise((res) => { G.hold = Object.assign({ p: 0, near: 130, rate: 0.3, decay: 0.12, ringR: 52, holding: false, idle: 0, col: C.pink, res }, o); });
  }
  E.holdGame = holdGame;

  function stepHold(dt) {
    const h = G.hold; if (!h) return;
    const pos = h.pos(), ptr = G.ptr;
    h.holding = ptr.down && !ptr.carry && dist(ptr, pos) < h.near;
    if (h.holding) { h.p = Math.min(1, h.p + h.rate * dt); h.idle = 0; }
    else { h.p = Math.max(h.floor || 0, h.p - h.decay * dt); h.idle += dt; }
    if (h.onUpdate) h.onUpdate(h, dt);
    if (h.p >= 1) { G.hold = null; h.res(); }
  }
  function drawHold(c) {
    const h = G.hold; if (!h || h.noRing) return;
    const pos = h.pos(), r = h.ringR + Math.sin(G.now * 1.7) * 2;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.arc(pos.x, pos.y, r, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 8; c.stroke();
    if (h.p > 0.005) { c.beginPath(); c.arc(pos.x, pos.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * h.p); c.strokeStyle = h.col; c.lineWidth = 8; c.stroke(); }
    c.restore();
  }

  /* dedo fantasma: ensina a interação */
  function drawGhost(c) {
    const g = G.ghost; if (!g) return;
    const t = G.now;
    c.save();
    const a = g.pos ? g.pos() : { x: g.x, y: g.y };
    if (g.kind === 'hold') {
      const pulse = (t % 1.4) / 1.4;
      c.globalAlpha = G.ptr.down ? 0.25 : 0.9;
      c.beginPath(); c.arc(a.x, a.y, 15 + pulse * 22, 0, TAU); c.strokeStyle = `rgba(255,255,255,${0.6 * (1 - pulse)})`; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.arc(a.x, a.y, 15, 0, TAU); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill();
    } else if (g.kind === 'tap') {
      const u = (t % 1.2) / 1.2;
      c.globalAlpha = G.ptr.down ? 0.2 : 0.95;
      c.beginPath(); c.arc(a.x, a.y, 24 - u * 12, 0, TAU); c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - u)})`; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.arc(a.x, a.y, 11 + (u < 0.3 ? -3 : 0), 0, TAU); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
    } else if (g.kind === 'drag') {
      const b = g.to ? (typeof g.to === 'function' ? g.to() : g.to) : { x: g.x2, y: g.y2 };
      const u = (t % 1.9) / 1.9, e = P.easeInOut(Math.min(1, u * 1.25));
      c.globalAlpha = u > 0.85 ? (1 - u) / 0.15 : Math.min(1, u * 6);
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([2, 10]); c.lineWidth = 4; c.lineCap = 'round'; c.stroke(); c.setLineDash([]);
      const x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e);
      c.beginPath(); c.arc(x, y, 17, 0, TAU); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
      c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
    } else if (g.kind === 'scrub') {
      const u = (t % 1.6) / 1.6;
      c.globalAlpha = G.ptr.down ? 0.2 : 0.9;
      const x = a.x + Math.sin(u * TAU * 2) * 50, y = a.y + Math.cos(u * TAU) * 20;
      c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
    }
    c.restore();
  }
  E.ghost = (g) => { G.ghost = g; };

  /* ---------- entrada ---------- */
  function toL(e) { return { x: (e.clientX - L.ox) / L.S, y: e.clientY / L.S }; }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = toL(e);
    G.ptr = { down: true, id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0, carry: null, t0: G.now, px: p.x, py: p.y, justDown: true };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!G.ptr.down || e.pointerId !== G.ptr.id) return;
    const p = toL(e);
    G.ptr.x = p.x; G.ptr.y = p.y;
    G.ptr.moved = Math.max(G.ptr.moved, Math.hypot(p.x - G.ptr.sx, p.y - G.ptr.sy));
  });
  function up(e) {
    if (!G.ptr.down || e.pointerId !== G.ptr.id) return;
    const wasTap = G.ptr.moved < 12 && G.now - G.ptr.t0 < 0.6;
    G.ptr.down = false;
    if (wasTap) { if (!advance()) G.taps.push({ x: G.ptr.x, y: G.ptr.y }); }
  }
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  el.card.addEventListener('click', () => { advance(); });
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.repeat && !G.hold) return;
      if (advance()) return;
      const c = G.sc && G.sc.keyPos ? G.sc.keyPos() : chest();
      G.taps.push({ x: c.x, y: c.y, key: true });
      if (G.hold) { const p = G.hold.pos(); G.ptr.down = true; G.ptr.x = p.x; G.ptr.y = p.y; G.ptr.moved = 0; G.ptr.id = 'kb'; G.ptr.t0 = G.now; }
    }
  });
  window.addEventListener('keyup', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && G.ptr.id === 'kb') G.ptr.down = false;
  });
  el.mute.addEventListener('click', () => {
    au.setMuted(!au.muted);
    el.mute.setAttribute('aria-pressed', String(au.muted));
    el.mute.classList.toggle('off', au.muted);
  });
  E.keyDown = (key) => G.taps.push({ key: true, x: 0, y: 0, k: key });

  /* ---------- transições e a lista ---------- */
  function fade(to) { el.fade.style.opacity = String(to); return wait(560); }
  E.fade = fade;

  /* a lista: idx = item atual. os anteriores aparecem riscados com o que aconteceu */
  async function lista(idx, o) {
    o = o || {};
    const LT = T.lista;
    const ol = $('itens');
    $('listaTitulo').textContent = LT.titulo; $('listaSub').textContent = o.sub || LT.sub;
    ol.innerHTML = '';
    LT.itens.forEach((it, i) => {
      const li = document.createElement('li');
      li.dataset.s = i < idx - 1 ? 'done' : i === idx - 1 ? 'fresh' : i === idx ? 'now' : 'todo';
      li.innerHTML = '<span class="t"></span><span class="x"></span>';
      li.querySelector('.t').textContent = it.t;
      li.querySelector('.x').textContent = i < idx ? it.x : '';
      ol.appendChild(li);
    });
    $('bora').textContent = o.botao || LT.botao;
    el.lista.hidden = false; el.lista.classList.remove('in'); void el.lista.offsetWidth; el.lista.classList.add('in');
    hint(null); hideCard();
    await wait(450);
    const fresh = ol.querySelector('[data-s="fresh"]');
    if (fresh) { fresh.dataset.s = 'striking'; au.squeak(); await wait(700); fresh.dataset.s = 'done'; }
    if (o.finalCheck) {
      const now = ol.querySelector('[data-s="now"]');
      if (now) { await wait(700); now.dataset.s = 'checked'; now.querySelector('.x').textContent = LT.itens[idx].x; au.chime(2); }
    }
    await new Promise((r) => { E.listaDone = r; });
    au.pop();
    el.lista.hidden = true;
  }
  $('bora').addEventListener('click', () => { if (E.listaDone) { const r = E.listaDone; E.listaDone = null; r(); } });
  E.lista = lista;

  /* troca de sala: escurece, monta, clareia. as cenas chamam no começo */
  E.onExit = (fn) => { G.exits.push(fn); };
  function runExits() { const l = G.exits; G.exits = []; for (const f of l) { try { f(); } catch (e) {} } }
  async function enter(room, o) {
    o = o || {};
    runExits();
    G.sc = null; G.drags = []; G.hold = null; G.ghost = null; G.fx = []; G.caps = []; G.locked = false; G.allowPoke = false;
    G.ptr.carry = null; G.ts = 1; G.taps.length = 0; G.tws = [];
    Wd.room(room, L);
    G.room = room;
    pl.vis = true; pl.mod = {}; pl.once = null; pl.walk = null; pl.hop = null; pl.rot = 0; pl.sq = 0;
    if (o.stand !== false) stand(o.x != null ? o.x : 90, o);
    if (o.beforeShow) o.beforeShow();
    await fade(0);
  }
  E.enter = enter;
  E.setScene = (sc) => { G.sc = sc; };

  /* ---------- simulação ---------- */
  function step(rdt) {
    const dt = rdt * G.ts;
    G.now += dt;
    G.f8 = Math.floor(G.now * 8);

    for (const t of G.timers.slice()) if (G.now >= t.at) { G.timers.splice(G.timers.indexOf(t), 1); t.r(); }
    for (const w of G.waits.slice()) if (w.fn()) { G.waits.splice(G.waits.indexOf(w), 1); w.r(); }
    for (let i = G.tws.length - 1; i >= 0; i--) {
      const a = G.tws[i]; a.t += dt;
      const u = Math.min(1, a.t / a.d);
      a.o[a.k] = a.f + (a.to - a.f) * a.e(u);
      if (u >= 1) { G.tws.splice(i, 1); a.r(); }
    }

    /* digitação (tempo real, mesmo em câmera lenta) */
    if (S.active && S.typing) {
      S.shown += rdt * (P.Q.fast ? 400 : 38);
      const n = Math.min(S.text.length, Math.floor(S.shown));
      if (n !== S.lastN) {
        if (n > S.lastN && S.text[n - 1] !== ' ' && n % 2 === 0) au.blip(1.25);
        S.lastN = n;
        el.typed.textContent = S.text.slice(0, n); el.rest.textContent = S.text.slice(n);
      }
      if (S.shown >= S.text.length) { S.typing = false; S.waitT = 0; el.typed.textContent = S.text; el.rest.textContent = ''; el.more.classList.add('on'); }
    } else if (S.active) {
      S.waitT += rdt;
      if (S.auto && S.waitT >= S.auto) finishSay();
    }
    if (G.quipUntil && G.now > G.quipUntil && !S.active) hideCard();

    if (G.sc && G.sc.step) G.sc.step(dt);
    if (G.drags.length) {
      if (!G.locked && !S.active) for (const k of G.taps) if (k.key) { const it = G.drags.find((i) => i.state === 'idle' && !i.off && i.target); if (it) it.state = 'fly'; }
      stepDrags(dt);
    }
    stepHold(dt);

    /* cutucar o pluft */
    if (G.allowPoke && !S.active) {
      while (G.taps.length) {
        const k = G.taps.shift(), c0 = chest();
        if (k.key || dist(k, c0) < 110) {
          quip(T.cutucadas[G.pokeI++ % T.cutucadas.length], 2200); au.boing();
          if (!pl.once && !pl.walk) { pl.sq = 0.7; Wd.hearts(G.fx, c0.x, c0.y - 60, 2); }
        }
      }
    }
    G.taps.length = 0;
    if (G.ptr.justDown) G.ptr.justDown = false;

    /* andar e pular */
    if (pl.walk) {
      const w = pl.walk; w.t += dt;
      const u = Math.min(1, w.t / w.dur);
      pl.x = lerp(w.x0, w.x1, P.easeInOut(u));
      if (u >= 1) { pl.walk = null; w.r(); }
    }
    if (pl.hop) { pl.hop.t += dt; if (pl.hop.t >= pl.hop.dur) pl.hop = null; }

    /* animação */
    let name = pl.base;
    if (S.typing && TALK[name]) name = TALK[name];
    if (pl.once) {
      name = pl.once.name;
      if (pl.animT >= pl.once.dur) { const r = pl.once.r; pl.once = null; r(); name = pl.base; }
    }
    if (pl.walk) name = 'walk';
    setAnim(name);
    pl.animT += dt;
    pl.sq = Math.max(0, pl.sq - dt * 4);

    /* fx / letreiros */
    for (let i = G.fx.length - 1; i >= 0; i--) {
      const p = G.fx[i];
      p.t += dt;
      if (p.t >= p.life) { G.fx.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = G.caps.length - 1; i >= 0; i--) { G.caps[i].t += dt; if (G.caps[i].t >= G.caps[i].life) G.caps.splice(i, 1); }
    G.shake = Math.max(0, G.shake - rdt * 36);
    G.flash = Math.max(0, G.flash - rdt * 2.4);
  }

  /* ---------- desenho ---------- */
  function drawPluft() {
    if (!pl.vis) return;
    const A = P.ANIMS[pl.anim];
    if (!A) return;
    const f = frameOf(pl.anim, pl.animT);
    const pose = Object.assign({}, A.f(f, A.n), pl.mod);
    pose.rot = (pose.rot || 0) + pl.rot;
    if (pl.sq > 0) { pose.sx = (pose.sx || 1) * (1 + 0.3 * pl.sq); pose.sy = (pose.sy || 1) * (1 - 0.3 * pl.sq); }
    let hy = 0;
    if (pl.hop) { const u = pl.hop.t / pl.hop.dur; hy = -pl.hop.h * 4 * u * (1 - u); }
    ctx.save();
    ctx.translate(pl.x, pl.y + hy);
    ctx.scale(pl.s * pl.flip, pl.s);
    const spr = P.sprites[pl.anim];
    if (spr) P.drawSprite(ctx, spr, f, pose);
    else P.rig.draw(ctx, pose, f, Math.floor(G.now * 8), Math.floor(G.now * 18));
    ctx.restore();
  }
  E.drawPluft = drawPluft;

  function render() {
    const c = ctx, sc = G.sc;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    Wd.drawBg(c);
    const sh = P.reduced ? 0 : G.shake;
    const sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh;
    c.setTransform(L.S * L.dpr, 0, 0, L.S * L.dpr, (L.ox + sx) * L.dpr, sy * L.dpr);

    if (sc && sc.back) sc.back(c);
    Wd.drawFx(c, G.fx, 'back');
    if (pl.vis && pl.shadow) {
      c.save(); c.globalAlpha = 0.3 * pl.shadow; c.fillStyle = '#05061a';
      c.beginPath(); c.ellipse(pl.x, pl.y + 2, 54 * pl.s, 10 * pl.s, 0, 0, TAU); c.fill(); c.restore();
    }
    if (sc && sc.beforePluft) sc.beforePluft(c);
    drawPluft();
    if (sc && sc.afterPluft) sc.afterPluft(c);
    Wd.drawFg(c);
    c.setTransform(L.S * L.dpr, 0, 0, L.S * L.dpr, (L.ox + sx) * L.dpr, sy * L.dpr);
    if (sc && sc.front) sc.front(c);
    drawDrags(c);
    drawHold(c);
    drawGhost(c);
    Wd.drawFx(c, G.fx, 'front');
    Wd.drawCaps(c, G.caps);
    if (sc && sc.over) sc.over(c);

    if (G.flash > 0.01) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = `rgba(255,248,235,${G.flash * 0.75})`; c.fillRect(0, 0, cv.width, cv.height);
    }
  }

  /* ---------- laço ---------- */
  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    if (!G.paused) step(dt);
    render();
    requestAnimationFrame(frame);
  }
  E.start = () => requestAnimationFrame(frame);
  E.layout = layout;
  E.render = render;
  E.step = step;
  E.resetAll = function () {
    runExits();
    G.runId++; G.timers = []; G.waits = []; G.tws = []; G.drags = []; G.fx = []; G.caps = []; G.sc = null; G.hold = null; G.ghost = null;
    G.allowPoke = false; G.locked = false; G.ts = 1; G.found = {}; G.arte = {}; G.track = null;
    S.active = false; S.res = null;
    au.seq.stop(); au.duck(1);
    el.fim.hidden = true; el.lista.hidden = true; E.listaDone = null; hideCard(); hint(null);
    Object.assign(pl, { vis: false, mod: {}, once: null, walk: null, hop: null, base: 'idle', rot: 0 });
  };

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 120));
})();
