'use strict';
// ─── Klavye + fare + dokunmatik giriş ────────────────────────
const Input = {
  keys: {},
  pressed: {},
  typed: [],       // isim girişi için yazılan karakterler
  mouse: { x: 0, y: 0, down: false, clicked: false },
  // dokunmatik: sanal joystick + yetenek butonu
  touchMode: false,               // ilk dokunuşta açılır, HUD buton çizer
  joy: { id: -1, ox: 0, oy: 0, ax: 0, ay: 0 },
  skillTouchId: -1,

  init(canvas) {
    window.addEventListener('keydown', e => {
      Sfx.init();
      // BİR METİN KUTUSUNA yazılıyorsa (isim ya da skill atölyesi):
      // sadece Enter/Escape oyuna geçsin; harf/boşluk oyun tuşu sayılmasın ve
      // preventDefault YAPILMASIN — yoksa Space yutulur, kelimeler bitişik yazılır.
      const inBox = e.target && (e.target.id === 'nameBox' || e.target.id === 'forgeBox');
      if (inBox) {
        if (!e.repeat && ['Enter', 'NumpadEnter', 'Escape'].includes(e.code)) {
          this.pressed[e.code] = true;
        }
        return;
      }
      if (!e.repeat) { this.keys[e.code] = true; this.pressed[e.code] = true; }
      if (e.key && e.key.length === 1) this.typed.push(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    canvas.addEventListener('mousemove', e => {
      const p = this.toGame(canvas, e.clientX, e.clientY);
      this.mouse.x = p.x; this.mouse.y = p.y;
    });
    canvas.addEventListener('mousedown', () => {
      Sfx.init();
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });

    // ── dokunmatik ──
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      Sfx.init();
      this.touchMode = true;
      for (const t of e.changedTouches) {
        const p = this.toGame(canvas, t.clientX, t.clientY);
        // oyun dışı ekranlar: dokunuş = tıklama
        if (Game.state !== 'play') {
          this.mouse.x = p.x; this.mouse.y = p.y;
          this.mouse.down = true; this.mouse.clicked = true;
          continue;
        }
        // yetenek butonu (sağ alt köşe bölgesi)
        if (p.x > 400 && p.y > 180) {
          this.skillTouchId = t.identifier;
          this.pressed['Space'] = true;
          continue;
        }
        // duraklat (sağ üstteki buton bölgesi)
        if (p.x > 445 && p.y > 40 && p.y < 70) {
          this.pressed['Escape'] = true;
          continue;
        }
        // geri kalan her yer: sanal joystick (dokunduğun nokta merkez olur)
        if (this.joy.id === -1) {
          this.joy.id = t.identifier;
          this.joy.ox = p.x; this.joy.oy = p.y;
          this.joy.ax = 0; this.joy.ay = 0;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joy.id) continue;
        const p = this.toGame(canvas, t.clientX, t.clientY);
        let dx = p.x - this.joy.ox, dy = p.y - this.joy.oy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 4) { this.joy.ax = 0; this.joy.ay = 0; continue; }   // ölü bölge
        const k = Math.min(1, d / 22);
        this.joy.ax = (dx / d) * k;
        this.joy.ay = (dy / d) * k;
      }
    }, { passive: false });

    const endTouch = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) { this.joy.id = -1; this.joy.ax = 0; this.joy.ay = 0; }
        if (t.identifier === this.skillTouchId) this.skillTouchId = -1;
      }
      this.mouse.down = false;
    };
    canvas.addEventListener('touchend', endTouch, { passive: false });
    canvas.addEventListener('touchcancel', endTouch, { passive: false });
  },

  // ekran koordinatını 480x270 oyun koordinatına çevirir
  toGame(canvas, cx, cy) {
    const r = canvas.getBoundingClientRect();
    // tam ekran / döndürme geçişi anında rect 0 olabilir → NaN üretme!
    if (!r.width || !r.height) return { x: this.mouse.x, y: this.mouse.y };
    return { x: (cx - r.left) / (r.width / 480), y: (cy - r.top) / (r.height / 270) };
  },

  axis() {
    // dokunmatik joystick aktifse onu kullan (NaN sızarsa sıfırla)
    if (!isFinite(this.joy.ax) || !isFinite(this.joy.ay)) { this.joy.ax = 0; this.joy.ay = 0; }
    if (this.joy.id !== -1 && (this.joy.ax || this.joy.ay)) {
      return { dx: this.joy.ax, dy: this.joy.ay };
    }
    let dx = 0, dy = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    return { dx, dy };
  },

  confirm() { return this.pressed['Enter'] || this.pressed['Space'] || this.pressed['NumpadEnter']; },
  back() { return this.pressed['Escape']; },
  mouseIn(x, y, w, h) {
    return this.mouse.x >= x && this.mouse.x < x + w && this.mouse.y >= y && this.mouse.y < y + h;
  },

  endFrame() {
    this.pressed = {};
    this.typed.length = 0;
    this.mouse.clicked = false;
  }
};
