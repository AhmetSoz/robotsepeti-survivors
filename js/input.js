'use strict';
// ─── Klavye + fare girişi ────────────────────────────────────
const Input = {
  keys: {},
  pressed: {},
  typed: [],       // isim girişi için yazılan karakterler
  mouse: { x: 0, y: 0, down: false, clicked: false },

  init(canvas) {
    window.addEventListener('keydown', e => {
      Sfx.init();
      if (!e.repeat) { this.keys[e.code] = true; this.pressed[e.code] = true; }
      if (e.key && e.key.length === 1) this.typed.push(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) / (r.width / 480);
      this.mouse.y = (e.clientY - r.top) / (r.height / 270);
    });
    canvas.addEventListener('mousedown', () => {
      Sfx.init();
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  },

  axis() {
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
