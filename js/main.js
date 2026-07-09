'use strict';
// ─── Başlatma ve ana döngü ───────────────────────────────────
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  buildAllSprites();
  World.init();
  Input.init(canvas);
  Meta.load();

  // pencereye tam sığan piksel ölçek
  function resize() {
    const s = Math.max(1, Math.floor(Math.min(window.innerWidth / 480, window.innerHeight / 270)));
    canvas.style.width = 480 * s + 'px';
    canvas.style.height = 270 * s + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // odak kaybında otomatik mola
  window.addEventListener('blur', () => {
    if (Game.state === 'play') { Game.state = 'pause'; Game.menuIdx = 0; }
  });

  // hata olursa ekranda göster (geliştirme kolaylığı)
  window.onerror = function (msg, src, line) {
    document.title = 'HATA: ' + msg;
    try {
      ctx.fillStyle = '#181425'; ctx.fillRect(0, 0, 480, 270);
      drawText(ctx, 'HATA!', 240, 40, '#e43b44', { align: 'center', scale: 2 });
      const lines = wrapText(msg + ' (' + (src || '').split('/').pop() + ':' + line + ')', 70);
      let y = 70;
      for (const ln of lines) { drawText(ctx, ln, 240, y, '#f4f4f8', { align: 'center' }); y += 12; }
    } catch (e) {}
  };

  // hızlı test için URL parametreleri: ?char=ahmet&t=120
  const params = new URLSearchParams(location.search);
  if (params.get('char')) {
    const c = params.get('char');
    if (CHARACTERS[c]) {
      Game.startRun(c);
      const skip = parseFloat(params.get('t') || '0');
      if (skip > 0) Game.time = skip;
      // demo: sahneyi doldur (görsel test için)
      if (params.get('demo')) {
        Game.player.weapons[0].lvl = parseInt(params.get('wl') || '4', 10);
        if (params.get('evo')) Game.player.weapons[0].evolved = true;
        for (const wid of (params.get('w2') || '').split(',')) {
          if (WEAPONS[wid]) Game.player.weapons.push(makeWeapon(wid));
        }
        // itemler: ?items=robotkol:3,sigorta:2
        for (const pair of (params.get('items') || '').split(',')) {
          const [iid, ilvl] = pair.split(':');
          if (ITEMS[iid]) Game.player.items[iid] = parseInt(ilvl || '1', 10);
        }
        recalcStats(Game.player);
        if (params.get('sklvl')) Game.player.skill.lvl = parseInt(params.get('sklvl'), 10);
        for (let i = 0; i < 26; i++) {
          const a = rand(TAU), r = rand(50, 210);
          spawnEnemy(pick(['aceleci', 'kararsiz', 'pazarlikci', 'iadeci', 'nine', 'yildizci']),
            Math.cos(a) * r, Math.sin(a) * r);
        }
        spawnEnemy('kizgin', 90, -50);
        spawnEnemy('kasa', -70, -40);
        spawnEnemy('varil', 80, 50);
        for (let i = 0; i < 10; i++) addPickup('chip', rand(-110, 110), rand(-80, 80));
        addPickup('coin', -50, 40);
        addPickup('chest', 60, 60);
        addPickup('magnet', -30, 60);
        addPickup('bomb', 30, -60);
        addPickup('shield', -90, 20);
        addPickup('turbo', 100, -20);
      }
      // px/py: oyuncuyu ışınla (bölge ekran görüntüleri için)
      if (params.get('px') || params.get('py')) {
        const px = parseFloat(params.get('px') || '0'), py = parseFloat(params.get('py') || '0');
        Game.player.x = px; Game.player.y = py;
        Game.camX = px; Game.camY = py;
        for (const e of Game.enemies) { e.x += px; e.y += py; }
        for (const pk of Game.pickups) { pk.x += px; pk.y += py; }
      }
      // boss: anında boss testi (?boss=toptanci)
      if (params.get('boss') && ENEMY_TYPES[params.get('boss')]) {
        const bid = params.get('boss');
        const b = spawnEnemy(bid, Game.player.x + 70, Game.player.y - 30);
        b.spawnT = 0;
        Game.bossAlive = true;
        Game.bossIntro = { t: 0, name: ENEMY_TYPES[bid].name };
        if (params.get('bosshp')) b.hp = b.maxHp * parseFloat(params.get('bosshp'));
      }
      // sim: N saniyelik oyunu önceden işlet (deterministik ekran görüntüsü)
      const sim = parseFloat(params.get('sim') || '0');
      try {
        for (let i = 0; i < sim * 60; i++) {
          if (Game.state === 'levelup' && Game.levelOptions.length) Game.applyOption(Game.levelOptions[0]);
          if (Game.state === 'chest') { Game.chestAnim = null; Game.state = 'play'; }
          if (params.get('autoskill') && Game.state === 'play' && Game.player.skill.cd <= 0) useSkill(Game.player);
          Game.update(1 / 60);
        }
      } catch (e) {
        document.title = 'SIM HATA: ' + e.message + ' | ' + (e.stack || '').split('\n')[1];
        throw e;
      }
      // ekran görüntüsü testi: yeteneği hemen kullan
      if (params.get('useskill') && Game.state === 'play') {
        Game.player.skill.cd = 0;
        useSkill(Game.player);
        for (let i = 0; i < parseInt(params.get('useskill'), 10); i++) Game.update(1 / 60);
      }
    }
  }
  if (params.get('screen') === 'select') Game.state = 'select';
  if (params.get('screen') === 'scores') Game.state = 'scores';
  if (params.get('screen') === 'shop') Game.state = 'shop';
  if (params.get('bank')) { Meta.bank = parseInt(params.get('bank'), 10); }

  Game.uiT = 0;
  let last = performance.now();
  function loop(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    Game.uiT += dt;
    try {
      Game.update(dt);
      Game.draw(ctx);
    } catch (e) {
      document.title = 'HATA: ' + e.message + ' | ' + (e.stack || '').split('\n')[1];
      return; // döngüyü durdur, hata başlıkta kalsın
    }
    Input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
