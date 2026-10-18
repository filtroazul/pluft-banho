/* pluft: carregador de sprites (opcional).
   procura img/pluft/<animacao>.png: uma TIRA HORIZONTAL com N quadros do mesmo tamanho
   (N = P.ANIMS[nome].n). se o arquivo existir, substitui o desenho em código; se não, nada muda.
   o fundo pode ser transparente OU verde chapado (#00ff00): o chroma key é feito aqui, em tempo de execução. */
(function () {
  const P = window.P;
  P.sprites = {};

  /* tira o verde: alpha pelo quanto o G passa de R e B; e remove o "vazamento" verde da borda */
  function keyGreen(img) {
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    try {
      const id = c.getImageData(0, 0, cv.width, cv.height), d = id.data;
      let hasAlpha = 0;
      for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) hasAlpha++;
      if (hasAlpha > 8) return cv; // já veio com transparência
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const dd = g - Math.max(r, b);
        if (dd > 70) d[i + 3] = 0;
        else if (dd > 22) {
          d[i + 3] = Math.round(255 * (1 - (dd - 22) / 48));
          d[i + 1] = Math.min(g, Math.max(r, b) + 8);
        } else if (dd > 6) d[i + 1] = Math.min(g, Math.max(r, b) + 6);
      }
      c.putImageData(id, 0, 0);
    } catch (e) {
      /* file:// "suja" o canvas e o getImageData falha: usa a imagem crua (precisa já ter alpha) */
    }
    return cv;
  }

  P.loadSprites = function () {
    if (!P.Q.sprites) return;
    for (const name of Object.keys(P.ANIMS)) {
      const img = new Image();
      img.onload = () => {
        const n = P.ANIMS[name].n;
        if (img.naturalWidth % n) console.warn('[pluft] ' + name + '.png: largura não divide por ' + n + ' quadros');
        P.sprites[name] = { cv: keyGreen(img), n, cw: img.naturalWidth / n, ch: img.naturalHeight };
      };
      img.onerror = () => {};
      img.src = P.CFG.spriteDir + name + '.png';
    }
  };

  /* desenha o quadro f da tira; âncora: base central da célula no pé do personagem */
  P.drawSprite = function (c, spr, f, pose) {
    const h = P.CFG.spriteHeight, w = (h * spr.cw) / spr.ch;
    const p = pose || {};
    c.save();
    c.translate(p.dx || 0, p.dy || 0);
    c.scale(p.sx || 1, p.sy || 1);
    c.translate(0, -h / 2); c.rotate(p.rot || 0); c.translate(0, h / 2);
    c.drawImage(spr.cv, (f % spr.n) * spr.cw, 0, spr.cw, spr.ch, -w / 2, -h + h * (P.CFG.spriteFootPad || 0), w, h);
    c.restore();
  };
})();
