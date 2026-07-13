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
  Achievements.load();
  Story.load();
  Forge.load();
  Creator.load();     // özel karakterleri CHARACTERS/TECHS/SPR'ye kaydeder

  // PWA: service worker (yalnızca http/https — yerel dosyada çalışmaz)
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // pencereye tam sığan piksel ölçek
  function resize() {
    const raw = Math.min(window.innerWidth / 480, window.innerHeight / 270);
    // büyük ekranda tam sayı ölçek (keskin piksel); küçük ekranda (mobil)
    // kesirli ölçekle ekranı doldur — aksi halde telefonda minicik kalır
    const s = raw >= 2 ? Math.floor(raw) : Math.max(0.5, raw);
    canvas.style.width = Math.round(480 * s) + 'px';
    canvas.style.height = Math.round(270 * s) + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));
  resize();

  // odak kaybında otomatik mola (tam ekran geçişinin tetiklediği sahte blur hariç)
  window.addEventListener('blur', () => {
    if (Game.state === 'play' && Game.uiT - (Game.fsT || -10) > 0.8) {
      Game.state = 'pause'; Game.menuIdx = 0;
    }
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
  // tüm teknik kilitlerini aç (seçim/dükkân ekran testleri)
  if (params.get('unlockall')) {
    for (const cid in TECHS) {
      for (const listName of ['weapons', 'skills']) {
        for (const tid of TECHS[cid][listName]) Meta.grantUnlock('t_' + tid);
      }
    }
  }
  // ?mkchar=<isim>&look=<cümle>[&forge=<yetenek cümlesi>] → 'ctest' kimlikli örnek
  // karakteri kaydeder. Sonra ?char=ctest ile normal koşu/sim yoluna girebilir.
  if (params.get('mkchar')) {
    const cc = newCharDraft();
    cc.id = 'ctest';
    cc.name = params.get('mkchar');
    cc.look = params.get('look') || '';
    if (cc.look) cc.px = parseLook(cc.look);
    if (params.get('cw')) cc.weapon = params.get('cw');
    if (params.get('forge')) {
      const sp = parseAbility(params.get('forge'));
      if (!sp.unknown) {
        Forge.data.abilities.push(sp);
        cc.abilities = [sp.id];
        Forge.data.equipped[0] = sp.id;
      }
    }
    Creator.data.chars.push(cc);
    Creator.register(cc);
    if (!params.get('char')) { Game.state = 'creator'; UI.creatorView = 'lib'; }
  }
  if (params.get('char')) {
    const c = params.get('char');
    if (CHARACTERS[c]) {
      // günün vardiyası testi: ?daily=1 (modlar + tohumlu akış)
      if (params.get('daily')) Game.dailyPending = true;
      // vardiya zorluğu testi: ?shift=3 (kilidi de açar)
      if (params.get('shift')) {
        const sn = parseInt(params.get('shift'), 10) || 1;
        Achievements.stats.shiftMax = Math.max(Achievements.stats.shiftMax || 1, sn);
        Meta.data.shift = sn;
      }
      // loadout testi: ?lw=kemer&ls=sampiyonk (kilidi otomatik açar)
      if (params.get('lw') || params.get('ls')) {
        const lw = params.get('lw'), ls = params.get('ls');
        if (lw) Meta.grantUnlock('t_' + lw);
        if (ls) Meta.grantUnlock('t_' + ls);
        Meta.setLoadout(c, lw || TECHS[c].weapons[0], ls || TECHS[c].skills[0]);
      }
      // skill atölyesi testi: ?char=ahmet&forge=<cümle> → yeteneği üret, tak, başla
      if (params.get('forge')) {
        const sp = parseAbility(params.get('forge'));
        if (!sp.unknown) {
          Forge.data.abilities.push(sp);
          Forge.data.equipped[0] = sp.id;
        }
        Game.startForgeTest(c);
      } else {
        Game.startRun(c);
      }
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
      // denge telemetrisi: &debug=1 → dakika anlarında durum + ölüm anı title'a JSON yazılır
      const dbg = params.get('debug') ? { snaps: [], death: null } : null;
      const dbgMarks = [180, 360, 540, 720, 900, 1200];
      let dbgIdx = 0;
      try {
        for (let i = 0; i < sim * 60; i++) {
          if (Game.state === 'levelup' && Game.levelOptions.length) Game.applyOption(Game.levelOptions[0]);
          if (Game.state === 'chest') { Game.chestAnim = null; Game.state = 'play'; }
          if (params.get('autoskill') && Game.state === 'play' && Game.player.skill.cd <= 0) useSkill(Game.player);
          // automove: bot en yakın tehditlerden kaçar (gerçekçi denge telemetrisi)
          if (params.get('automove') && Game.state === 'play') {
            let fx2 = 0, fy2 = 0;
            for (const en of Game.enemies) {
              if (en.dead || en.spawnT > 0 || en.type.breakable) continue;
              const dd = dist2(en.x, en.y, Game.player.x, Game.player.y);
              if (dd < 120 * 120) {
                const w2 = 1 / Math.max(dd, 100);
                fx2 += (Game.player.x - en.x) * w2;
                fy2 += (Game.player.y - en.y) * w2;
              }
            }
            const fl = Math.sqrt(fx2 * fx2 + fy2 * fy2);
            if (fl > 0.0001) {
              Input.joy.id = 99;
              Input.joy.ax = fx2 / fl;
              Input.joy.ay = fy2 / fl;
            } else { Input.joy.id = -1; Input.joy.ax = 0; Input.joy.ay = 0; }
          }
          Game.update(1 / 60);
          if (dbg) {
            if (dbgIdx < dbgMarks.length && Game.time >= dbgMarks[dbgIdx]) {
              dbg.snaps.push({
                t: dbgMarks[dbgIdx], hp: Math.round(Game.player.hp), sv: Game.level,
                w: Game.player.weapons.map(w => w.id + (w.evolved ? '*' : '') + w.lvl).join('/'),
                kill: Game.kills, para: Game.coins
              });
              dbgIdx++;
            }
            if (Game.state === 'over' && !dbg.death) dbg.death = Math.round(Game.time);
          }
          if (Game.state === 'over' && dbg) break;
        }
      } catch (e) {
        document.title = 'SIM HATA: ' + e.message + ' | ' + (e.stack || '').split('\n')[1];
        throw e;
      }
      if (dbg) document.title = 'DEBUG ' + JSON.stringify(dbg);
      // probe: atölye testi — yetenek gerçekten iş yaptı mı? (zone vuruşu / öldürme)
      if (params.get('probe')) {
        document.title = 'PROBE ' + JSON.stringify({
          zoneHits: Game.zoneHits || 0,
          zonesAlive: Game.zones.length,
          kills: Game.kills,
          enemies: Game.enemies.length
        });
      }
      // ekran görüntüsü testi: yeteneği hemen kullan
      if (params.get('useskill') && Game.state === 'play') {
        Game.player.skill.cd = 0;
        useSkill(Game.player);
        for (let i = 0; i < parseInt(params.get('useskill'), 10); i++) Game.update(1 / 60);
      }
    }
  }
  if (params.get('screen') === 'select') {
    Game.state = 'select';
    // bilgi kartı testi: ?tip=w1 (vuruş 1) / ?tip=s2 (yetenek 2)
    const tip = params.get('tip');
    if (tip) {
      UI.tipHold = {
        slot: { listName: tip[0] === 'w' ? 'weapons' : 'skills', idx: parseInt(tip[1], 10) || 0 },
        until: 1e9
      };
    }
  }
  if (params.get('screen') === 'scores') Game.state = 'scores';
  if (params.get('screen') === 'shop') {
    Game.state = 'shop';
    if (params.get('tab')) UI.shopTab = parseInt(params.get('tab'), 10) || 0;
  }
  if (params.get('screen') === 'album') Game.state = 'album';
  if (params.get('screen') === 'daily') Game.state = 'daily';
  // karakter atölyesi testi:
  //   ?screen=creator                       → kütüphane
  //   ?screen=creator&cview=edit&cstep=1&look=<cümle>&cname=<isim>
  if (params.get('screen') === 'creator') {
    Game.state = 'creator';
    UI.creatorView = params.get('cview') === 'edit' ? 'edit' : 'lib';
    if (UI.creatorView === 'edit') {
      Creator.draft = newCharDraft();
      Creator.editIdx = -1;
      if (params.get('cname')) Creator.draft.name = params.get('cname');
      if (params.get('look')) {
        Creator.draft.look = params.get('look');
        Creator.draft.px = parseLook(Creator.draft.look);
      }
      // adım kutusunu da kur (gerçek akışta creatorStepTo bunu yapıyor)
      UI.creatorStepTo(clamp(parseInt(params.get('cstep') || '0', 10), 0, 3));
    }
  }
  if (params.get('screen') === 'forge') {
    Game.state = 'forge';
    if (params.get('text')) {
      Forge.input = params.get('text');
      Forge.draft = parseAbility(Forge.input);
      UI.forgeView = 'edit';
      // &shape=1 → doğrudan ızgara şekil editörüne düş (yazının şekli hazır gelir)
      if (params.get('shape')) {
        const z = specZoneOp(Forge.draft);
        Forge.draft.handCells = z ? z.cells.map(c => ({ x: c.x, y: c.y })) : [];
        UI.forgeView = 'shape';
      }
    }
  }
  // test: başarım/istatistik doldurma — ?unlockach=kill1,combo1 ve ?achstats=kills:600,runs:7
  if (params.get('unlockach')) {
    for (const id of params.get('unlockach').split(',')) {
      const a = ACH_DEFS.find(d => d.id === id);
      if (a && !Achievements.done[a.id]) Achievements.done[a.id] = 1;
    }
  }
  for (const pair of (params.get('achstats') || '').split(',')) {
    const [k, v] = pair.split(':');
    if (k) Achievements.stats[k] = parseInt(v || '0', 10);
  }
  if (params.get('bank')) { Meta.bank = parseInt(params.get('bank'), 10); }
  if (params.get('costume') && COSTUMES[params.get('costume')]) {
    if (!Meta.data.costumes) Meta.data.costumes = {};
    Meta.data.costumes[params.get('costume')] = 1;
    Meta.data.costume = params.get('costume');
  }

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
