/* pluft 2: áudio. tudo sintetizado em Web Audio (sem arquivos de efeito).
   trilha: se existir musica.mp3 na pasta, toca em loop; senão, uma trilha gerativa suave.
   o estúdio tem um sequenciador de 4 trilhas x 8 passos (bumbo, chimbal, baixo, melodia). */
(function () {
  const P = window.P;
  let ac = null, master = null, musicBus = null, sfxBus = null;
  let muted = false, synthOn = false, musicEl = null, duck = 1;

  function ensure() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ac.destination);
    musicBus = ac.createGain();
    musicBus.gain.value = 0.9 * duck;
    musicBus.connect(master);
    sfxBus = ac.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);
    return ac;
  }

  function unlock() {
    ensure();
    if (ac && ac.state === 'suspended') ac.resume();
  }

  function envAt(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  /* t = tempo absoluto do contexto */
  function toneAt(type, f0, f1, dur, vol, t, attack, bus, lp) {
    if (!ac) return;
    attack = attack || 0.006;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    envAt(g, t, attack, dur, vol);
    let out = o;
    if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); out = f; }
    out.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + attack + dur + 0.05);
  }
  function tone(type, f0, f1, dur, vol, delay, attack, bus) {
    if (!ac) return;
    toneAt(type, f0, f1, dur, vol, ac.currentTime + (delay || 0), attack, bus);
  }

  let noiseBuf = null;
  function nbuf() {
    if (noiseBuf) return noiseBuf;
    const len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function noiseAt(dur, vol, ftype, f0, f1, t, bus) {
    if (!ac) return;
    const src = ac.createBufferSource(); src.buffer = nbuf();
    src.loop = true;
    const f = ac.createBiquadFilter(); f.type = ftype;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function noise(dur, vol, ftype, f0, f1, delay) {
    if (!ac) return;
    noiseAt(dur, vol, ftype, f0, f1, ac.currentTime + (delay || 0));
  }

  /* ruído contínuo (fritura, fogo, esperar o macarrão): devolve {set, stop} */
  function loopNoise(ftype, freq, vol, q) {
    if (!ac) return { set() {}, stop() {} };
    const src = ac.createBufferSource(); src.buffer = nbuf(); src.loop = true;
    const f = ac.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0.0001;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start();
    g.gain.setTargetAtTime(vol, ac.currentTime, 0.08);
    return {
      set(v, fr) {
        g.gain.setTargetAtTime(Math.max(0.0001, v), ac.currentTime, 0.1);
        if (fr) f.frequency.setTargetAtTime(fr, ac.currentTime, 0.1);
      },
      stop() { g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.1); setTimeout(() => { try { src.stop(); } catch (e) {} }, 500); },
    };
  }

  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function startSynth() {
    if (synthOn || !ac) return;
    synthOn = true;
    /* acordes com sétima, lentos: clima de vitrola, não é a música dela (essa o pluft canta sozinho, desafinado) */
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
    let i = 0;
    function pad() {
      const t = ac.currentTime, ch = chords[i++ % chords.length];
      ch.forEach((m, k) => {
        const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
        o.type = 'triangle';
        o.frequency.value = m2f(m) + (k - 1) * 0.5;
        lp.type = 'lowpass'; lp.frequency.value = 1000;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.03, t + 1.3);
        g.gain.linearRampToValueAtTime(0.0001, t + 4.7);
        o.connect(lp); lp.connect(g); g.connect(musicBus);
        o.start(t); o.stop(t + 4.9);
      });
    }
    const pent = [69, 72, 74, 76, 79, 81, 84];
    function bell() {
      if (!ac) return;
      const m = pent[Math.floor(Math.random() * pent.length)];
      tone('sine', m2f(m), null, 1.6, 0.016, 0, 0.01, musicBus);
      tone('sine', m2f(m) * 2.005, null, 0.8, 0.006, 0, 0.01, musicBus);
      setTimeout(bell, 600 + Math.random() * 1900);
    }
    pad(); setInterval(pad, 3800); bell();
  }

  function startMusic() {
    if (!ensure()) return;
    try {
      musicEl = new Audio(P.CFG.musica);
      musicEl.loop = true; musicEl.volume = 0.55 * duck; musicEl.muted = muted;
      musicEl.addEventListener('error', startSynth, { once: true });
      const pr = musicEl.play();
      if (pr && pr.catch) pr.catch(startSynth);
    } catch (e) { startSynth(); }
  }

  /* ---------- sequenciador do estúdio ---------- */
  const BASS = [33, 33, 29, 29, 36, 36, 31, 31];
  const LEAD = [76, 74, 72, 74, 76, 79, 76, 72];
  const seq = { on: false, grid: null, step: 0, nextT: 0, bpm: 108, timer: null, onStep: null, vol: 1 };

  function voice(row, col, t, vol) {
    vol = (vol == null ? 1 : vol) * seq.vol;
    if (row === 0) { toneAt('sine', 160, 42, 0.2, 0.55 * vol, t, 0.003); noiseAt(0.03, 0.08 * vol, 'lowpass', 900, 300, t); }
    else if (row === 1) { noiseAt(0.06, 0.07 * vol, 'highpass', 7000, 9000, t); }
    else if (row === 2) { toneAt('sawtooth', m2f(BASS[col]), m2f(BASS[col]) * 0.98, 0.34, 0.2 * vol, t, 0.01, null, 380); }
    else if (row === 3) {
      toneAt('square', m2f(LEAD[col]), null, 0.24, 0.07 * vol, t, 0.006, null, 2600);
      toneAt('triangle', m2f(LEAD[col]) * 2, null, 0.16, 0.04 * vol, t, 0.006);
    }
  }
  function seqTick() {
    if (!ac || !seq.on) return;
    while (seq.nextT < ac.currentTime + 0.15) {
      const col = seq.step, t = Math.max(seq.nextT, ac.currentTime);
      if (seq.grid) for (let r = 0; r < 4; r++) if (seq.grid[r][col]) voice(r, col, t);
      if (seq.onStep) { const cb = seq.onStep; setTimeout(() => cb(col), Math.max(0, (t - ac.currentTime) * 1000)); }
      seq.nextT += 60 / seq.bpm / 2;
      seq.step = (seq.step + 1) % 8;
    }
  }

  P.audio = {
    unlock, startMusic,
    get muted() { return muted; },
    setMuted(v) {
      muted = v;
      if (master) master.gain.value = v ? 0 : 1;
      if (musicEl) musicEl.muted = v;
    },
    /* abaixa a trilha de fundo (quando o beat do jogador toca) */
    duck(v) {
      duck = v;
      if (musicBus) musicBus.gain.setTargetAtTime(0.9 * v, ac.currentTime, 0.2);
      if (musicEl) musicEl.volume = 0.55 * v;
    },
    loopNoise,

    seq: {
      start(grid, onStep, bpm) {
        if (!ensure()) return;
        seq.grid = grid; seq.onStep = onStep || null; seq.bpm = bpm || seq.bpm;
        if (seq.on) return;
        seq.on = true; seq.step = 0; seq.nextT = ac.currentTime + 0.08;
        seq.timer = setInterval(seqTick, 25);
      },
      setGrid(g) { seq.grid = g; },
      stop() { seq.on = false; clearInterval(seq.timer); seq.onStep = null; },
      get on() { return seq.on; },
      set vol(v) { seq.vol = v; },
      pad(row, col) { if (ac) voice(row, col, ac.currentTime + 0.005, 1); },
    },
    voz() {
      try {
        const u = new SpeechSynthesisUtterance('luxúria wayne');
        u.lang = 'pt-BR'; u.rate = 0.9; u.pitch = 0.7;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch (e) {}
    },

    /* ---------- efeitos ---------- */
    blip(pitch) {
      const f = (pitch || 1) * (430 + Math.random() * 170);
      tone('square', f, f * 0.96, 0.05, 0.018, 0, 0.004);
    },
    fall() {
      tone('sine', 1500, 220, 3.1, 0.05, 0, 0.1);
      noise(3.0, 0.05, 'bandpass', 500, 2400);
    },
    boom() {
      tone('sine', 150, 38, 0.55, 0.7, 0, 0.004);
      noise(0.5, 0.35, 'lowpass', 1800, 120);
      noise(1.0, 0.1, 'lowpass', 300, 60, 0.1);
      if (navigator.vibrate && !P.reduced) navigator.vibrate(60);
    },
    boing() {
      tone('sine', 220, 620, 0.12, 0.2, 0, 0.005);
      tone('sine', 620, 240, 0.28, 0.18, 0.1, 0.005);
    },
    pop() { tone('sine', 380, 900, 0.09, 0.22, 0, 0.004); noise(0.08, 0.08, 'highpass', 2000, 6000); },
    grunt() { tone('sawtooth', 130, 95, 0.16, 0.05, 0, 0.01); },
    chime(i) {
      const n = [659.3, 784, 987.8, 1318.5][Math.min(3, i || 0)];
      tone('sine', n, null, 1.1, 0.12, 0, 0.008);
      tone('sine', n * 2.005, null, 0.6, 0.04, 0, 0.008);
      tone('sine', n * 1.5, null, 0.9, 0.05, 0.06, 0.008);
    },
    sparkle() { [1568, 1976, 2349, 2637].forEach((f, k) => tone('sine', f, null, 0.35, 0.05, k * 0.05, 0.004)); },
    gust() { noise(1.0, 0.16, 'bandpass', 300, 1800); },
    tick() { tone('square', 900 + Math.random() * 300, null, 0.02, 0.012, 0, 0.002); },
    beat() { tone('sine', 70, 48, 0.16, 0.22, 0, 0.005); tone('sine', 66, 46, 0.14, 0.16, 0.18, 0.005); },
    heart() { tone('sine', 523, null, 0.35, 0.09, 0, 0.01); tone('sine', 784, null, 0.5, 0.09, 0.1, 0.01); },
    wah() { [196, 185, 175].forEach((f, k) => tone('sawtooth', f, f * 0.93, 0.28, 0.05, k * 0.26, 0.02)); },
    ding() { tone('triangle', 988, null, 0.6, 0.1, 0, 0.005); tone('triangle', 1319, null, 0.9, 0.1, 0.1, 0.005); },
    fanfare() {
      [523, 659, 784, 1047, 1319].forEach((f, k) => {
        tone('triangle', f, null, 0.9, 0.12, k * 0.12, 0.01);
        tone('sine', f * 2, null, 0.5, 0.04, k * 0.12, 0.01);
      });
    },
    whoosh() { noise(0.4, 0.12, 'bandpass', 2400, 400); },

    /* cozinha */
    splash() { noise(0.45, 0.22, 'bandpass', 1800, 500); tone('sine', 300, 120, 0.2, 0.12, 0, 0.005); },
    sizzle() { noise(0.7, 0.1, 'highpass', 5000, 7500); },
    psst() { noise(0.9, 0.2, 'highpass', 3000, 900); },
    clang() { tone('triangle', 820, 790, 0.5, 0.16, 0, 0.002); tone('triangle', 1330, 1300, 0.35, 0.1, 0, 0.002); tone('square', 410, 400, 0.12, 0.05, 0, 0.002); },
    thump() { tone('sine', 120, 50, 0.16, 0.4, 0, 0.003); noise(0.08, 0.1, 'lowpass', 900, 300); },
    whoomp() { tone('sine', 90, 40, 0.5, 0.5, 0, 0.01); noise(0.7, 0.2, 'lowpass', 1500, 200); },
    bell() { tone('triangle', 1760, null, 1.2, 0.12, 0, 0.003); tone('triangle', 2217, null, 0.9, 0.08, 0, 0.003); },
    slurp() { tone('sine', 300, 900, 0.5, 0.12, 0, 0.01); tone('sine', 900, 300, 0.3, 0.08, 0.5, 0.01); },
    splat() { noise(0.35, 0.3, 'lowpass', 1400, 200); tone('sine', 180, 60, 0.3, 0.3, 0, 0.004); },
    squeak() { tone('square', 1400, 1900, 0.09, 0.03, 0, 0.004); },

    /* arte */
    brush() { noise(0.12, 0.05, 'bandpass', 1400 + Math.random() * 500, 800, 0); },
    chip() { noise(0.1, 0.18, 'highpass', 2500, 5000); tone('triangle', 520 + Math.random() * 300, null, 0.1, 0.08, 0, 0.002); },
    crash() { noise(0.9, 0.5, 'lowpass', 2500, 100); tone('sine', 110, 35, 0.6, 0.6, 0, 0.004); if (navigator.vibrate && !P.reduced) navigator.vibrate([40, 30, 60]); },
    shatter() {
      for (let k = 0; k < 7; k++) noise(0.3, 0.12, 'highpass', 3000 + k * 500, 1500, k * 0.045);
      tone('triangle', 2400, 800, 0.4, 0.06, 0, 0.002);
    },
    polish() { tone('sine', 1760 + Math.random() * 600, null, 0.18, 0.04, 0, 0.004); },

    /* música */
    riser(dur) {
      tone('sawtooth', 120, 1400, dur, 0.1, 0, 0.1);
      noise(dur, 0.12, 'bandpass', 400, 6000);
    },
    dropHit() {
      tone('sine', 90, 28, 1.1, 0.9, 0, 0.004);
      tone('sawtooth', 55, 40, 0.8, 0.25, 0, 0.004);
      noise(0.7, 0.4, 'lowpass', 3000, 150);
      if (navigator.vibrate && !P.reduced) navigator.vibrate(120);
    },
    blown() {
      noise(0.5, 0.6, 'lowpass', 5000, 120);
      for (let k = 0; k < 6; k++) tone('sawtooth', 200 + Math.random() * 1200, null, 0.05, 0.08, k * 0.05, 0.002);
      tone('sine', 400, 40, 1.4, 0.3, 0.2, 0.01);
    },
    zap() { for (let k = 0; k < 4; k++) tone('sawtooth', 600 + Math.random() * 1500, null, 0.04, 0.07, k * 0.04, 0.002); },

    /* banho */
    /* voz do pluft cantando no chuveiro: serra filtrada com vibrato, "cents" = quanto desafina */
    hum(midi, dur, cents) {
      if (!ac) return;
      const t = ac.currentTime + 0.01, f = m2f(midi) * Math.pow(2, (cents || 0) / 1200);
      const o = ac.createOscillator(), g = ac.createGain(), bp = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      lfo.frequency.value = 5.2; lg.gain.value = f * 0.014; lfo.connect(lg); lg.connect(o.frequency);
      bp.type = 'bandpass'; bp.frequency.value = 820; bp.Q.value = 1.3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.07);
      g.gain.setValueAtTime(0.085, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(bp); bp.connect(g); g.connect(sfxBus);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    },
    bubble() {
      const f = 620 + Math.random() * 520;
      tone('sine', f, f * 1.7, 0.07, 0.13, 0, 0.003); noise(0.05, 0.06, 'highpass', 4000, 7000);
    },
    wash() { noise(1.3, 0.3, 'bandpass', 1600, 500); tone('sine', 260, 90, 0.7, 0.1, 0.2, 0.05); },
    inhale() { noise(0.35, 0.16, 'bandpass', 500, 2600); },
    rustle() { noise(0.55, 0.14, 'bandpass', 900, 2200); noise(0.4, 0.08, 'highpass', 3500, 5000, 0.1); },
    towelFlap() { noise(0.18, 0.2, 'bandpass', 700, 300); },

    /* fotografia */
    shutter() { noise(0.04, 0.3, 'highpass', 3000, 5000); noise(0.05, 0.25, 'highpass', 2000, 4000, 0.07); },
    cardPop() { tone('triangle', 1200, 1800, 0.08, 0.1, 0, 0.002); },
  };
})();
