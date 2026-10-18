/* pluft 3 (pluft no banho): orquestra as cenas, a tela inicial e a tela de fim.
   debug: ?fase=chuveiro|toalha  ·  ?rapido=1  ·  ?sprites=0 */
(function () {
  const P = window.P, E = P.E, G = E.G, T = E.T, au = E.au, el = E.el;
  const $ = (id) => document.getElementById(id);

  /* ordem do jogo. cada cena recebe cont=true quando continua direto da anterior (sem trocar de sala) */
  const ORDER = ['chuveiro', 'toalha', 'arrumar', 'espelho'];

  E.showFim = function () {
    $('autor').textContent = T.autor;
    E.hideCard();
    el.fim.hidden = false; el.fim.classList.remove('in'); void el.fim.offsetWidth; el.fim.classList.add('in');
    G.allowPoke = true;
  };

  async function run(from) {
    const id = ++G.runId;
    const start = Math.max(0, ORDER.indexOf(from));
    for (let k = start; k < ORDER.length; k++) {
      G.scene = ORDER[k];
      await P.scenes[ORDER[k]](k > start);
      if (id !== G.runId) return;
    }
    E.showFim();
  }

  function restart() {
    E.resetAll();
    el.fade.style.opacity = '1';
    E.wait(400).then(() => run('chuveiro'));
  }
  $('again').addEventListener('click', () => { au.pop(); restart(); });

  function begin() {
    au.unlock(); au.startMusic();
    el.start.classList.add('out');
    setTimeout(() => { el.start.hidden = true; }, 600);
    el.fade.style.opacity = '1';
    run(P.Q.fase && P.scenes[P.Q.fase] ? P.Q.fase : 'chuveiro');
  }

  /* debug: P.dbg.pause(); await P.dbg.adv(seg) anda o tempo de forma determinística */
  P.dbg = {
    pause(v) { G.paused = v !== false; },
    async adv(sec) { const n = Math.max(1, Math.round(sec * 30)); for (let i = 0; i < n; i++) { E.step(1 / 30); await Promise.resolve(); await Promise.resolve(); } E.render(); },
    tap(x, y) { G.taps.push({ x, y }); },
    press(x, y) { G.ptr = { down: true, id: 1, x, y, sx: x, sy: y, moved: 0, carry: null, t0: G.now, justDown: true }; },
    move(x, y) { G.ptr.x = x; G.ptr.y = y; G.ptr.moved = Math.max(G.ptr.moved, Math.hypot(x - G.ptr.sx, y - G.ptr.sy)); },
    release() { G.ptr.down = false; },
    G, E,
  };

  E.layout();
  P.loadSprites();
  if (document.fonts && document.fonts.load) {
    document.fonts.load('48px "Bagel Fat One"'); document.fonts.load('700 20px "Grandstander"');
  }
  document.querySelector('.start-sub').textContent = T.inicio.sub;
  el.go.textContent = T.inicio.botao;
  document.querySelector('.start-note').textContent = T.inicio.nota;
  document.querySelector('#fim h2').textContent = T.fim.titulo;
  document.querySelector('#fim .oficial').textContent = T.fim.oficial;
  $('again').textContent = T.fim.de_novo;
  $('autor').previousSibling.textContent = T.fim.credito + ' ';
  el.go.addEventListener('click', begin);

  if (P.Q.fase && P.scenes[P.Q.fase]) {
    /* modo debug: pula a tela inicial; o áudio só destrava no primeiro toque */
    el.start.hidden = true;
    const unlock = () => { au.unlock(); au.startMusic(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    el.fade.style.opacity = '1';
    run(P.Q.fase);
  }
  E.start();
})();
