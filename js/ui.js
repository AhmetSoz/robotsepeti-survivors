'use strict';
// ─── Arayüz: menüler, HUD, kartlar ───────────────────────────
const UI = {
  titleT: 0,
  walkerT: 0,

  // ── yardımcılar ──
  dim(ctx, a) {
    ctx.fillStyle = 'rgba(24,20,37,' + a + ')';
    ctx.fillRect(0, 0, 480, 270);
  },

  panel(ctx, x, y, w, h, border) {
    ctx.fillStyle = 'rgba(38,43,68,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border || COL.greyDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // köşe süsleri
    ctx.fillStyle = border || COL.greyDark;
    ctx.fillRect(x, y, 3, 1); ctx.fillRect(x, y, 1, 3);
    ctx.fillRect(x + w - 3, y, 3, 1); ctx.fillRect(x + w - 1, y, 1, 3);
    ctx.fillRect(x, y + h - 1, 3, 1); ctx.fillRect(x, y + h - 3, 1, 3);
    ctx.fillRect(x + w - 3, y + h - 1, 3, 1); ctx.fillRect(x + w - 1, y + h - 3, 1, 3);
  },

  navVertical(len) {
    if (Input.pressed['ArrowDown'] || Input.pressed['KeyS']) { Game.menuIdx = (Game.menuIdx + 1) % len; Sfx.play('click'); }
    if (Input.pressed['ArrowUp'] || Input.pressed['KeyW']) { Game.menuIdx = (Game.menuIdx + len - 1) % len; Sfx.play('click'); }
  },

  // ── ANA MENÜ ──
  updateTitle(dt) {
    this.titleT += dt;
    // arka plan yürüyüşçüleri
    this.walkerT -= dt;
    if (this.walkerT <= 0 && Game.bgWalkers.length < 10) {
      this.walkerT = rand(0.7, 1.6);
      Game.bgWalkers.push({
        typeId: pick(['aceleci', 'kararsiz', 'pazarlikci', 'iadeci']),
        x: -20, y: rand(175, 255), spd: rand(18, 40), t: rand(10)
      });
    }
    for (let i = Game.bgWalkers.length - 1; i >= 0; i--) {
      const w = Game.bgWalkers[i];
      w.x += w.spd * dt; w.t += dt;
      if (w.x > 500) Game.bgWalkers.splice(i, 1);
    }

    const items = 6;
    this.navVertical(items);
    const hit = this.titleMenuHit();
    if (hit >= 0) Game.menuIdx = hit;
    if (Input.confirm() || (Input.mouse.clicked && hit >= 0)) {
      Sfx.play('select');
      if (Game.menuIdx === 0) {
        // mobilde oyuna girerken otomatik tam ekran (uygulama hissi)
        if (Input.touchMode) goFullscreen();
        Game.state = 'select'; Game.selIdx = 0;
      }
      else if (Game.menuIdx === 1) { Game.state = 'shop'; Game.menuIdx = 0; }
      else if (Game.menuIdx === 2) { Game.state = 'album'; Game.menuIdx = 0; }
      else if (Game.menuIdx === 3) { Game.state = 'scores'; Game.fetchScores(); }
      else if (Game.menuIdx === 4) { isFullscreen() ? exitFullscreen() : goFullscreen(); }
      else { Sfx.setMute(!Sfx.muted); }
    }
  },

  titleMenuHit() {
    for (let i = 0; i < 6; i++) {
      if (Input.mouseIn(160, 162 + i * 14 - 3, 160, 12)) return i;
    }
    return -1;
  },

  drawTitle(ctx) {
    // zemin şeridi (logo ve bant çizgisinden uzak bir kamera)
    World.drawFloor(ctx, 777, 333, this.titleT);
    this.dim(ctx, 0.55);

    // sahne spot ışıkları
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const sway = Math.sin(this.titleT * 0.7 + i * 2.1) * 40;
      const cx = 120 + i * 120 + sway;
      ctx.fillStyle = 'rgba(255,238,180,0.05)';
      ctx.beginPath();
      ctx.moveTo(cx, -5);
      ctx.lineTo(cx - 45, 180); ctx.lineTo(cx + 45, 180);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // yürüyüşçüler
    for (const w of Game.bgWalkers) {
      const spr = SPR.enemies[w.typeId];
      drawShadow(ctx, w.x, w.y, 6, 2.4);
      drawSpr(ctx, spr, ((w.t * 7) | 0) % 2, w.x, w.y, { scale: ENEMY_TYPES[w.typeId].scale });
    }

    // logo
    const bob = Math.sin(this.titleT * 2) * 2;
    drawText(ctx, 'ROBOTSEPETİ', 242, 40 + bob, COL.outline, { align: 'center', scale: 3 });
    drawText(ctx, 'ROBOTSEPETİ', 240, 38 + bob, COL.orange, { align: 'center', scale: 3, shadow: COL.outline });
    drawText(ctx, 'SURVIVORS', 240, 66 + bob, COL.teal, { align: 'center', scale: 2, shadow: COL.outline });
    drawText(ctx, 'MÜŞTERİ AKININDAN SAĞ ÇIK!', 240, 88, COL.greyLight, { align: 'center' });

    // araç geçidi
    const carX = ((this.titleT * 40) % 700) - 110;
    ctx.drawImage(SPR.car.n, Math.round(carX), 108);

    // ekibin durduğu konveyör bandı
    const beltY = 154;
    ctx.fillStyle = COL.navyDark; ctx.fillRect(140, beltY, 200, 8);
    ctx.fillStyle = COL.outline; ctx.fillRect(140, beltY + 1, 200, 6);
    ctx.fillStyle = COL.navy;
    const off = Math.round(this.titleT * 24) % 8;
    for (let px = 140 - 8 + off; px < 344; px += 8) ctx.fillRect(px, beltY + 2, 2, 4);
    ctx.fillStyle = COL.greyDark;
    ctx.fillRect(140, beltY, 200, 1); ctx.fillRect(140, beltY + 7, 200, 1);

    // ekip
    for (let i = 0; i < CHAR_ORDER.length; i++) {
      const id = CHAR_ORDER[i];
      const x = 240 + (i - 2.5) * 26;
      drawSpr(ctx, SPR.chars[id], ((this.titleT * 6 + i) | 0) % 2, x, 152 + Math.sin(this.titleT * 3 + i) * 1.5, {});
    }

    // menü
    const achN = Achievements.countDone();
    const labels = ['BAŞLA', 'DÜKKAN',
      'ALBÜM (' + achN + '/' + ACH_DEFS.length + ')',
      'SKOR TABLOSU',
      'TAM EKRAN: ' + (isFullscreen() ? 'AÇIK' : 'KAPALI'),
      'SES: ' + (Sfx.muted ? 'KAPALI' : 'AÇIK')];
    for (let i = 0; i < labels.length; i++) {
      const sel = Game.menuIdx === i;
      const y = 162 + i * 14;
      if (sel) {
        drawText(ctx, '>', 240 - textW(labels[i]) / 2 - 14, y, COL.yellow, { shadow: COL.outline });
      }
      drawText(ctx, labels[i], 240, y, sel ? COL.yellow : COL.greyLight, { align: 'center', shadow: COL.outline });
    }

    // banka
    ctx.drawImage(SPR.coin, 8, 8);
    drawText(ctx, Meta.bank + ' PARA', 18, 9, COL.gold, { shadow: COL.outline });

    drawText(ctx, Input.touchMode ? 'DOKUN: HAREKET · SAĞ ALT: YETENEK'
      : 'WASD: HAREKET · SPACE: YETENEK · ENTER: SEÇ', 240, 242, COL.greyDark, { align: 'center' });
    drawText(ctx, 'ROBOTSEPETİ EKİP OYUNU · V4.0', 240, 250, COL.navy, { align: 'center' });
  },

  // ── DÜKKAN: kalıcı yükseltmeler ──
  shopTab: 0,   // 0: yükseltmeler, 1: kostümler

  updateShop() {
    if (Input.back()) { Game.state = 'title'; Game.menuIdx = 0; return; }
    // sekme değiştir: sol/sağ ya da sekme başlığına tıkla
    const rows = this.shopTab === 0 ? META_ORDER : COSTUME_ORDER;
    if (Input.pressed['ArrowLeft'] || Input.pressed['KeyA'] ||
        Input.pressed['ArrowRight'] || Input.pressed['KeyD']) {
      this.shopTab = 1 - this.shopTab; Game.menuIdx = 0; Sfx.play('click'); return;
    }
    for (let tb = 0; tb < 2; tb++) {
      if (Input.mouse.clicked && Input.mouseIn(140 + tb * 110, 24, 100, 14) && this.shopTab !== tb) {
        this.shopTab = tb; Game.menuIdx = 0; Sfx.play('click'); return;
      }
    }
    this.navVertical(rows.length);
    const act = id => {
      const ok = this.shopTab === 0 ? Meta.buy(id) : Meta.buyOrWear(id);
      Sfx.play(ok ? 'chest' : 'hurt');
    };
    for (let i = 0; i < rows.length; i++) {
      if (Input.mouseIn(40, 44 + i * 21, 400, 19)) {
        Game.menuIdx = i;
        if (Input.mouse.clicked) act(rows[i]);
      }
    }
    if (Input.confirm()) act(rows[Game.menuIdx]);
  },

  drawShop(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.72);
    drawText(ctx, 'DÜKKAN', 240, 8, COL.orange, { align: 'center', scale: 2, shadow: COL.outline });
    ctx.drawImage(SPR.coin, 380, 10);
    drawText(ctx, Meta.bank, 390, 11, COL.gold, { shadow: COL.outline });

    // sekmeler
    const tabs = ['YÜKSELTMELER', 'KOSTÜMLER'];
    for (let tb = 0; tb < 2; tb++) {
      const on = this.shopTab === tb;
      const x = 140 + tb * 110;
      ctx.fillStyle = on ? 'rgba(254,174,52,0.15)' : 'rgba(38,43,68,0.8)';
      ctx.fillRect(x, 24, 100, 14);
      ctx.strokeStyle = on ? COL.gold : COL.navy;
      ctx.strokeRect(x + 0.5, 24.5, 99, 13);
      drawText(ctx, tabs[tb], x + 50, 28, on ? COL.gold : COL.greyDark, { align: 'center' });
    }

    if (this.shopTab === 0) {
      // ── yükseltmeler ──
      for (let i = 0; i < META_ORDER.length; i++) {
        const id = META_ORDER[i];
        const u = META_UPGRADES[id];
        const lvl = Meta.lvl(id);
        const maxed = lvl >= u.max;
        const sel = Game.menuIdx === i;
        const y = 44 + i * 21;
        this.panel(ctx, 40, y, 400, 19, sel ? COL.yellow : COL.navy);
        ctx.drawImage(SPR.icons[u.icon], 45, y + 3);
        drawText(ctx, u.name, 62, y + 2, sel ? COL.yellow : COL.white);
        drawText(ctx, u.desc, 62, y + 11, COL.grey);
        for (let l = 0; l < u.max; l++) {
          ctx.fillStyle = l < lvl ? (u.weapon ? COL.teal : COL.gold) : COL.navyDark;
          ctx.fillRect(300 + l * 8, y + 7, 6, 5);
        }
        if (maxed) {
          drawText(ctx, u.weapon ? 'AÇIK' : 'MAKS', 434, y + 6, COL.green, { align: 'right' });
        } else {
          const cost = Meta.cost(id);
          drawText(ctx, cost + ' PARA', 434, y + 6, Meta.bank >= cost ? COL.gold : COL.redDark, { align: 'right' });
        }
      }
      drawText(ctx, 'ENTER: SATIN AL · A/D: SEKME · ESC: GERİ', 240, 250, COL.greyLight, { align: 'center' });
    } else {
      // ── kostümler ──
      for (let i = 0; i < COSTUME_ORDER.length; i++) {
        const id = COSTUME_ORDER[i];
        const c = COSTUMES[id];
        const owned = Meta.ownsCostume(id);
        const worn = Meta.costume() === id;
        const sel = Game.menuIdx === i;
        const y = 44 + i * 21;
        this.panel(ctx, 40, y, 400, 19, sel ? COL.yellow : (worn ? COL.teal : COL.navy));
        drawText(ctx, c.name, 62, y + 2, sel ? COL.yellow : (worn ? COL.teal : COL.white));
        drawText(ctx, c.desc, 62, y + 11, COL.grey);
        if (worn) {
          drawText(ctx, 'GİYİLİ', 434, y + 6, COL.green, { align: 'right' });
        } else if (owned) {
          drawText(ctx, 'GİY', 434, y + 6, COL.teal, { align: 'right' });
        } else {
          drawText(ctx, c.cost + ' PARA', 434, y + 6, Meta.bank >= c.cost ? COL.gold : COL.redDark, { align: 'right' });
        }
      }
      drawText(ctx, 'ENTER: SATIN AL / GİY · A/D: SEKME · ESC: GERİ', 240, 250, COL.greyLight, { align: 'center' });
    }
  },

  // ── ALBÜM: başarımlar + istatistikler ──
  updateAlbum() {
    if (Input.back()) { Game.state = 'title'; Game.menuIdx = 0; return; }
    this.navVertical(ACH_DEFS.length);
    // dokunma/tekerlek yerine: tıklanan satır seçilir
    for (let r = 0; r < 8; r++) {
      if (Input.mouseIn(30, 62 + r * 22, 420, 20) && Input.mouse.clicked) {
        const first = clamp(Game.menuIdx - 3, 0, Math.max(0, ACH_DEFS.length - 8));
        Game.menuIdx = clamp(first + r, 0, ACH_DEFS.length - 1);
      }
    }
    if (Input.confirm()) { Game.state = 'title'; Game.menuIdx = 0; }
  },

  drawAlbum(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.75);
    const doneN = Achievements.countDone();
    drawText(ctx, 'ALBÜM', 240, 8, COL.gold, { align: 'center', scale: 2, shadow: COL.outline });
    drawText(ctx, doneN + '/' + ACH_DEFS.length + ' BAŞARIM', 240, 26, COL.greyLight, { align: 'center' });

    // istatistik şeridi
    const st = Achievements.stats;
    drawText(ctx, 'DEVRİLEN: ' + (st.kills || 0), 36, 40, COL.grey);
    drawText(ctx, 'KOŞU: ' + (st.runs || 0), 176, 40, COL.grey);
    drawText(ctx, 'SÜRE: ' + fmtTime(st.time || 0), 268, 40, COL.grey);
    drawText(ctx, 'BOSS: ' + (st.bossTotal || 0), 390, 40, COL.grey);

    // kaydırmalı başarım listesi (8 satırlık pencere)
    const first = clamp(Game.menuIdx - 3, 0, Math.max(0, ACH_DEFS.length - 8));
    for (let r = 0; r < 8 && first + r < ACH_DEFS.length; r++) {
      const a = ACH_DEFS[first + r];
      const open = !!Achievements.done[a.id];
      const sel = Game.menuIdx === first + r;
      const y = 62 + r * 22;
      this.panel(ctx, 30, y, 420, 20, sel ? COL.yellow : (open ? COL.gold : COL.navy));
      // durum kutusu
      ctx.fillStyle = open ? COL.gold : COL.navyDark;
      ctx.fillRect(36, y + 6, 8, 8);
      if (open) { ctx.fillStyle = COL.outline; ctx.fillRect(38, y + 8, 4, 4); }
      if (a.hidden && !open) {
        drawText(ctx, '???', 52, y + 3, COL.greyDark);
        drawText(ctx, 'GİZLİ BAŞARIM', 52, y + 12, COL.navy);
      } else {
        drawText(ctx, a.name, 52, y + 3, open ? COL.gold : (sel ? COL.yellow : COL.white));
        drawText(ctx, a.desc, 52, y + 12, COL.grey);
        // ilerleme / ödül
        if (open) {
          drawText(ctx, 'TAMAM', 444, y + 7, COL.green, { align: 'right' });
        } else {
          const cur = Achievements.progressOf(a);
          drawText(ctx, cur + '/' + a.target, 444, y + 3, COL.greyLight, { align: 'right' });
          if (a.reward && a.reward.coins) {
            drawText(ctx, '+' + a.reward.coins + ' PARA', 444, y + 12, COL.gold, { align: 'right' });
          }
        }
      }
    }
    // kaydırma ipucu
    if (ACH_DEFS.length > 8) {
      const k = Game.menuIdx / (ACH_DEFS.length - 1);
      ctx.fillStyle = COL.navyDark; ctx.fillRect(456, 62, 3, 174);
      ctx.fillStyle = COL.grey; ctx.fillRect(456, 62 + Math.round(k * 160), 3, 14);
    }
    drawText(ctx, 'W/S: GEZİN · ESC: GERİ', 240, 250, COL.greyLight, { align: 'center' });
  },

  // ── KARAKTER SEÇİMİ ──
  cardRect(i) {
    return { x: 66 + (i % 3) * 120, y: 38 + ((i / 3) | 0) * 94, w: 108, h: 86 };
  },

  updateSelect() {
    if (Input.back()) { Game.state = 'title'; Game.menuIdx = 0; return; }
    if (Input.pressed['ArrowRight'] || Input.pressed['KeyD']) { Game.selIdx = (Game.selIdx + 1) % 6; Sfx.play('click'); }
    if (Input.pressed['ArrowLeft'] || Input.pressed['KeyA']) { Game.selIdx = (Game.selIdx + 5) % 6; Sfx.play('click'); }
    if (Input.pressed['ArrowDown'] || Input.pressed['KeyS']) { Game.selIdx = (Game.selIdx + 3) % 6; Sfx.play('click'); }
    if (Input.pressed['ArrowUp'] || Input.pressed['KeyW']) { Game.selIdx = (Game.selIdx + 3) % 6; Sfx.play('click'); }
    for (let i = 0; i < 6; i++) {
      const r = this.cardRect(i);
      if (Input.mouseIn(r.x, r.y, r.w, r.h)) {
        if (Game.selIdx !== i && (Input.mouse.clicked)) Sfx.play('click');
        if (Input.mouse.clicked && Game.selIdx === i) { Sfx.play('select'); Game.startRun(CHAR_ORDER[i]); return; }
        Game.selIdx = i;
      }
    }
    if (Input.confirm()) { Sfx.play('select'); Game.startRun(CHAR_ORDER[Game.selIdx]); }
  },

  drawSelect(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.6);
    drawText(ctx, 'KARAKTERİNİ SEÇ', 240, 12, COL.white, { align: 'center', scale: 2, shadow: COL.outline });

    for (let i = 0; i < 6; i++) {
      const id = CHAR_ORDER[i];
      const def = CHARACTERS[id];
      const r = this.cardRect(i);
      const sel = Game.selIdx === i;
      this.panel(ctx, r.x, r.y, r.w, r.h, sel ? def.color : COL.navy);
      if (sel) {
        ctx.strokeStyle = COL.yellow;
        ctx.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
      }
      const frame = sel ? ((Game.uiT * 6 | 0) % 2) : 0;
      const bob = sel ? Math.sin(Game.uiT * 5) * 1.5 : 0;
      drawSpr(ctx, SPR.chars[id], frame, r.x + r.w / 2, r.y + 50 + bob, { scale: 2 });
      drawText(ctx, def.name, r.x + r.w / 2, r.y + 56, sel ? COL.yellow : COL.white, { align: 'center', shadow: COL.outline });
      drawText(ctx, def.title, r.x + r.w / 2, r.y + 67, COL.grey, { align: 'center' });
      drawText(ctx, 'CAN ' + def.hp + ' · HIZ %' + Math.round(def.speed * 100), r.x + r.w / 2, r.y + 77,
        sel ? COL.greyLight : COL.greyDark, { align: 'center' });
    }

    // seçili karakter detayı
    const id = CHAR_ORDER[Game.selIdx];
    const def = CHARACTERS[id];
    const w = WEAPONS[def.weapon];
    const sk = SKILLS[id];
    this.panel(ctx, 10, 224, 460, 42, def.color);
    ctx.drawImage(SPR.icons[def.weapon], 16, 227);
    drawText(ctx, w.name + ': ' + w.desc, 34, 228, COL.white);
    drawText(ctx, def.passiveName + ': ' + def.passiveDesc, 34, 240, COL.teal);
    ctx.drawImage(SPR.icons['sk_' + id], 16, 249);
    drawText(ctx, 'SPACE · ' + sk.name + ': ' + sk.desc, 34, 252, COL.yellow);
  },

  // ── HUD ──
  drawHUD(ctx) {
    const p = Game.player;

    // XP çubuğu (en üst)
    ctx.fillStyle = COL.navyDark; ctx.fillRect(0, 0, 480, 5);
    const need = Game.xpNeeded(Game.level);
    ctx.fillStyle = COL.cyan; ctx.fillRect(0, 0, 480 * clamp(Game.xp / need, 0, 1), 4);
    ctx.fillStyle = COL.teal; ctx.fillRect(0, 0, 480 * clamp(Game.xp / need, 0, 1), 2);

    // sol üst: can + seviye
    this.panel(ctx, 6, 10, 92, 30, COL.navy);
    ctx.fillStyle = COL.navyDark; ctx.fillRect(11, 15, 66, 7);
    ctx.fillStyle = COL.redDark; ctx.fillRect(12, 16, 64 * clamp(p.hp / p.maxHp, 0, 1), 5);
    ctx.fillStyle = COL.red; ctx.fillRect(12, 16, 64 * clamp(p.hp / p.maxHp, 0, 1), 2);
    drawText(ctx, Math.ceil(p.hp), 80, 15, COL.white, { align: 'left' });
    drawText(ctx, 'SV ' + Game.level, 11, 27, COL.teal);
    drawText(ctx, p.def.name, 46, 27, p.def.color);

    // üst orta: süre
    const tcol = Game.time >= WIN_TIME ? COL.gold : COL.white;
    drawText(ctx, fmtTime(Game.time), 240, 10, tcol, { align: 'center', scale: 2, shadow: COL.outline });
    if (Game.time > WIN_TIME - 30 && Game.time < WIN_TIME) {
      drawText(ctx, 'FAZLA MESAİYE AZ KALDI!', 240, 28, COL.yellow, { align: 'center' });
    } else if (Game.time >= WIN_TIME && Game.time < WIN_TIME + 8) {
      drawText(ctx, 'FAZLA MESAİ: x' + Game.scoreMul() + ' SKOR!', 240, 28, COL.gold, { align: 'center' });
    } else if (Game.hordeT <= 15 && Game.hordeT > 0) {
      // akın geri sayımı: ritim uyarısı
      const warn = Game.hordeT <= 5;
      const wcol = warn ? COL.red : COL.grey;
      const alpha = warn ? 0.6 + Math.sin(Game.uiT * 12) * 0.4 : 0.8;
      drawText(ctx, 'AKIN: ' + Math.ceil(Game.hordeT), 240, 28, wcol, { align: 'center', shadow: COL.outline, alpha });
    }

    // görev paneli (sol üst, can barının altında)
    Missions.draw(ctx);

    // mini radar: boss / elit müşteri / kargo kolisi konumları
    {
      const rx = 6, ry = 64, rw = 46, rh = 34;
      ctx.fillStyle = 'rgba(24,20,37,0.55)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = COL.navy; ctx.lineWidth = 1;
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
      const cx = rx + rw / 2, cy = ry + rh / 2;
      const scl = 0.05;   // 1 radar pikseli ≈ 20 dünya pikseli
      const dot = (wx, wy, col, sz, blink) => {
        if (blink && ((Game.uiT * 5) | 0) % 2) return;
        const dx = clamp((wx - p.x) * scl, -rw / 2 + 2, rw / 2 - 2);
        const dy = clamp((wy - p.y) * scl, -rh / 2 + 2, rh / 2 - 2);
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(cx + dx) - (sz >> 1), Math.round(cy + dy) - (sz >> 1), sz, sz);
      };
      for (const pk of Game.pickups) if (pk.type === 'chest') dot(pk.x, pk.y, COL.gold, 2);
      for (const e of Game.enemies) {
        if (e.type.boss) dot(e.x, e.y, COL.red, 3, true);
        else if (e.type.elite) dot(e.x, e.y, COL.orange, 2);
      }
      // oyuncu: merkezde
      ctx.fillStyle = COL.white;
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }

    // kombo sayacı (sağ orta): büyüdükçe renklenir ve titrer
    if (Game.combo >= 5) {
      const c = Game.combo;
      const col = c >= 35 ? COL.red : c >= 20 ? COL.gold : c >= 10 ? COL.yellow : COL.white;
      const wob = c >= 20 ? Math.sin(Game.uiT * 20) * 1.5 : 0;
      drawText(ctx, 'x' + c, 468 + wob, 96, col, { align: 'right', scale: 2, shadow: COL.outline });
      drawText(ctx, 'KOMBO', 468, 114, col, { align: 'right', shadow: COL.outline });
      // kombo süresi çubuğu
      ctx.fillStyle = COL.navyDark; ctx.fillRect(428, 122, 40, 3);
      ctx.fillStyle = col; ctx.fillRect(428, 122, Math.round(40 * clamp(Game.comboT / 2.2, 0, 1)), 3);
    }

    // sağ üst: skor / kill / para
    drawText(ctx, 'SKOR ' + Game.displayScore(), 474, 10, COL.gold, { align: 'right', shadow: COL.outline });
    drawText(ctx, 'MÜŞTERİ ' + Game.kills, 474, 22, COL.greyLight, { align: 'right', shadow: COL.outline });
    drawText(ctx, 'PARA ' + Game.coins, 474, 34, COL.yellow, { align: 'right', shadow: COL.outline });

    // sol alt: silah slotları + itemler
    const wy = 248;
    const wn = p.weapons.length;
    this.panel(ctx, 6, wy - 4, 8 + wn * 26, 22, COL.navy);
    for (let i = 0; i < wn; i++) {
      const w = p.weapons[i];
      const x = 10 + i * 26;
      if (w.evolved) {
        ctx.strokeStyle = COL.gold; ctx.lineWidth = 1;
        ctx.strokeRect(x - 1.5, wy - 2.5, 15, 15);
      }
      ctx.drawImage(SPR.icons[w.id], x, wy - 1);
      drawText(ctx, w.evolved ? 'E' : w.lvl, x + 13, wy + 4, w.evolved ? COL.gold : COL.white, { shadow: COL.outline });
    }
    let ix = 20 + wn * 26;
    for (const id in p.items) {
      if (!p.items[id] || ITEMS[id].heal) continue;
      ctx.drawImage(SPR.icons[id], ix, wy - 1);
      drawText(ctx, p.items[id], ix + 10, wy + 4, COL.white, { shadow: COL.outline });
      ix += 20;
    }

    // sağ alt: aktif yetenek kutusu (SPACE)
    {
      const sk = p.skill;
      const ss = skillStats(p);
      const bx = 442, by = 210;
      const ready = sk.cd <= 0;
      this.panel(ctx, bx, by, 30, 30, ready ? p.def.color : COL.navy);
      ctx.drawImage(SPR.icons['sk_' + p.charId], bx + 3, by + 3, 24, 24);
      if (!ready) {
        const h = Math.round(28 * clamp(sk.cd / ss.cd, 0, 1));
        ctx.fillStyle = 'rgba(24,20,37,0.75)';
        ctx.fillRect(bx + 1, by + 1 + 28 - h, 28, h);
        drawText(ctx, Math.ceil(sk.cd), bx + 13, by + 11, COL.white, { align: 'center', shadow: COL.outline });
      } else {
        const pulse = 0.5 + Math.sin(Game.uiT * 6) * 0.5;
        ctx.strokeStyle = 'rgba(254,231,97,' + (0.3 + pulse * 0.7).toFixed(2) + ')';
        ctx.strokeRect(bx - 1.5, by - 1.5, 33, 33);
      }
      // yetenek seviyesi noktaları
      for (let i = 0; i < SKILL_MAX_LVL; i++) {
        ctx.fillStyle = i < sk.lvl ? COL.yellow : COL.navyDark;
        ctx.fillRect(bx + 2 + i * 6, by + 32, 4, 2);
      }
      drawText(ctx, 'SPACE', bx + 15, by - 9, ready ? COL.yellow : COL.greyDark, { align: 'center' });
    }

    // başarım toast'ı: üstten süzülen altın bildirim
    if (Game.achToast) {
      const t = Game.achToast.t;
      const a = Game.achToast.a;
      const slide = t < 0.25 ? (1 - t / 0.25) * -30 : (t > 2.6 ? (t - 2.6) / 0.4 * -30 : 0);
      const y = 40 + slide;
      const txt = 'BAŞARIM: ' + a.name + '!';
      const sub = a.reward && a.reward.coins ? a.desc + ' (+' + a.reward.coins + ' PARA)' : a.desc;
      const tw = Math.max(textW(txt), textW(sub)) + 20;
      ctx.save();
      ctx.globalAlpha = clamp(3 - t, 0, 1);
      this.panel(ctx, 240 - tw / 2, y, tw, 26, COL.gold);
      drawText(ctx, txt, 240, y + 4, COL.gold, { align: 'center', shadow: COL.outline });
      drawText(ctx, sub, 240, y + 15, COL.greyLight, { align: 'center' });
      ctx.restore();
    }

    // ── dokunmatik HUD (mobil) ──
    if (Input.touchMode) {
      // duraklat butonu (sağ üst)
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = COL.navyDark; ctx.fillRect(452, 46, 22, 18);
      ctx.fillStyle = COL.greyLight;
      ctx.fillRect(458, 50, 3, 10); ctx.fillRect(464, 50, 3, 10);
      ctx.restore();
      // sanal joystick: dokunulan noktada taban + topuz
      if (Input.joy.id !== -1) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = COL.white; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(Input.joy.ox, Input.joy.oy, 22, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = COL.white;
        ctx.beginPath();
        ctx.arc(Input.joy.ox + Input.joy.ax * 16, Input.joy.oy + Input.joy.ay * 16, 8, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    // boss can barı (en son gelen bossun adıyla, öfke fazı işaretli)
    if (Game.bossAlive) {
      let boss = null;
      for (let i = Game.enemies.length - 1; i >= 0; i--) {
        if (Game.enemies[i].type.boss) { boss = Game.enemies[i]; break; }
      }
      if (boss) {
        const hpK = clamp(boss.hp / boss.maxHp, 0, 1);
        const col = boss.enraged ? COL.red : COL.purple;
        const colDark = boss.enraged ? COL.redDark : COL.purpleDark;
        // çerçeveli bar
        ctx.fillStyle = COL.outline; ctx.fillRect(136, 252, 208, 12);
        ctx.strokeStyle = boss.enraged ? COL.red : COL.greyDark; ctx.lineWidth = 1;
        ctx.strokeRect(136.5, 252.5, 207, 11);
        ctx.fillStyle = colDark; ctx.fillRect(138, 254, 204, 8);
        ctx.fillStyle = col; ctx.fillRect(138, 254, Math.round(204 * hpK), 8);
        ctx.fillStyle = boss.enraged ? COL.pink : COL.purple;
        ctx.fillRect(138, 254, Math.round(204 * hpK), 2);
        // segment çizgileri (her %25)
        ctx.fillStyle = COL.outline;
        for (let s = 1; s < 4; s++) ctx.fillRect(138 + s * 51, 254, 1, 8);
        // öfke eşiği işareti (%60)
        ctx.fillStyle = COL.orange;
        ctx.fillRect(138 + Math.round(204 * 0.6), 251, 1, 3);
        const label = boss.type.name + (boss.enraged ? ' · ÖFKELİ!' : '');
        drawText(ctx, label, 240, 242, boss.enraged ? COL.red : COL.purple,
          { align: 'center', shadow: COL.outline });
      }
    }

    // duyuru bandı (koyu şerit üstünde)
    if (Game.banner) {
      const a = clamp(3 - Game.banner.t, 0, 1);
      const tw = textW(Game.banner.txt);
      ctx.fillStyle = 'rgba(24,20,37,' + (a * 0.6).toFixed(3) + ')';
      ctx.fillRect(240 - tw / 2 - 8, 56, tw + 16, 13);
      const blink = 0.7 + Math.sin(Game.banner.t * 10) * 0.3;
      drawText(ctx, Game.banner.txt, 240, 59, COL.yellow, { align: 'center', scale: 1, shadow: COL.outline, alpha: clamp(a * blink, 0, 1) });
    }

    drawText(ctx, 'ESC: MOLA', 474, 258, COL.navy, { align: 'right' });
  },

  // ── SEVİYE ATLAMA ──
  levelCardRect(i) {
    return { x: 66 + i * 120, y: 76, w: 108, h: 118 };
  },

  updateLevelUp() {
    const n = Game.levelOptions.length;
    if (!n) { Game.state = 'play'; return; }
    if (Input.pressed['ArrowRight'] || Input.pressed['KeyD']) { Game.levelIdx = (Game.levelIdx + 1) % n; Sfx.play('click'); }
    if (Input.pressed['ArrowLeft'] || Input.pressed['KeyA']) { Game.levelIdx = (Game.levelIdx + n - 1) % n; Sfx.play('click'); }
    for (let i = 0; i < n; i++) {
      if (Input.pressed['Digit' + (i + 1)]) { Game.levelIdx = i; Game.applyOption(Game.levelOptions[i]); return; }
      const r = this.levelCardRect(i);
      if (Input.mouseIn(r.x, r.y, r.w, r.h)) {
        Game.levelIdx = i;
        if (Input.mouse.clicked) { Game.applyOption(Game.levelOptions[i]); return; }
      }
    }
    if (Input.confirm()) Game.applyOption(Game.levelOptions[Game.levelIdx]);
  },

  drawLevelUp(ctx) {
    this.dim(ctx, 0.65);
    drawText(ctx, 'SEVİYE ' + Game.level + '!', 240, 34, COL.yellow, { align: 'center', scale: 2, shadow: COL.outline });
    drawText(ctx, 'BİR GELİŞTİRME SEÇ', 240, 56, COL.greyLight, { align: 'center' });

    for (let i = 0; i < Game.levelOptions.length; i++) {
      const o = Game.levelOptions[i];
      const r = this.levelCardRect(i);
      const sel = Game.levelIdx === i;
      this.panel(ctx, r.x, r.y, r.w, r.h, sel ? COL.yellow : COL.navy);
      if (sel) {
        const pulse = 0.5 + Math.sin(Game.uiT * 6) * 0.5;
        ctx.strokeStyle = 'rgba(254,231,97,' + (0.4 + pulse * 0.6) + ')';
        ctx.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
      }
      const icon = SPR.icons[o.id];
      if (icon) ctx.drawImage(icon, r.x + r.w / 2 - 12, r.y + 8, 24, 24);
      const lines = wrapText(o.name, 16);
      let ty = r.y + 38;
      for (const ln of lines) { drawText(ctx, ln, r.x + r.w / 2, ty, sel ? COL.yellow : COL.white, { align: 'center' }); ty += 10; }
      if (o.lvl > 0) {
        const tag = o.kind === 'newweapon' ? 'YENİ SİLAH!'
          : o.kind === 'weapon' ? 'SİLAH SV' + o.lvl
          : o.kind === 'skill' ? 'YETENEK SV' + o.lvl
          : 'SEVİYE ' + o.lvl;
        const tcol = o.kind === 'newweapon' ? COL.orange : (o.kind === 'skill' ? COL.yellow : COL.teal);
        drawText(ctx, tag, r.x + r.w / 2, ty + 2, tcol, { align: 'center' });
        ty += 12;
      }
      const dlines = wrapText(o.desc, 16);
      ty += 4;
      for (const ln of dlines) { drawText(ctx, ln, r.x + r.w / 2, ty, COL.grey, { align: 'center' }); ty += 9; }
      drawText(ctx, '' + (i + 1), r.x + 5, r.y + 4, COL.greyDark);
    }
    drawText(ctx, '1/2/3 VEYA OK + ENTER', 240, 208, COL.greyDark, { align: 'center' });
  },

  // ── KOLİ AÇILIŞI ──
  drawChest(ctx) {
    const a = Game.chestAnim;
    if (!a) return;
    this.dim(ctx, 0.6);
    if (a.evolve) {
      const flash = 0.7 + Math.sin(Game.uiT * 8) * 0.3;
      drawText(ctx, 'EVRİM!', 240, 30, COL.gold, { align: 'center', scale: 3, shadow: COL.outline, alpha: flash });
    } else if (a.boss) {
      const flash = 0.7 + Math.sin(Game.uiT * 8) * 0.3;
      drawText(ctx, 'BOSS ÖDÜLÜ!', 240, 30, COL.gold, { align: 'center', scale: 2, shadow: COL.outline, alpha: flash });
      drawText(ctx, 'BÜYÜK KARGO: BOL GELİŞTİRME + BOL PARA', 240, 48, COL.greyDark, { align: 'center' });
    } else {
      drawText(ctx, 'KARGO GELDİ!', 240, 30, COL.orange, { align: 'center', scale: 2, shadow: COL.outline });
      drawText(ctx, 'KOLİ: BEDAVA RASTGELE GELİŞTİRME + PARA', 240, 48, COL.greyDark, { align: 'center' });
    }

    const cx = 240, cy = 120;
    if (!a.burst) {
      // sallanan koli
      const sh = Math.sin(a.t * 30) * a.t * 4;
      ctx.save();
      ctx.translate(cx + sh, cy);
      ctx.drawImage(SPR.chest, -27, -20, 54, 39);
      ctx.restore();
      drawText(ctx, 'AÇILIYOR...', 240, 150, COL.greyLight, { align: 'center', alpha: 0.5 + Math.sin(a.t * 8) * 0.4 });
    } else {
      // ışık huzmeleri
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = COL.yellow;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + a.t * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(cx + Math.cos(ang) * 130, cy - 10 + Math.sin(ang) * 130);
        ctx.lineTo(cx + Math.cos(ang + 0.18) * 130, cy - 10 + Math.sin(ang + 0.18) * 130);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.drawImage(SPR.chest, cx - 27, cy - 14 + 4, 54, 39);

      // ödüller
      const rh = a.evolve ? 58 : a.rewards.length * 16 + 14;
      this.panel(ctx, a.evolve ? 110 : 150, 152, a.evolve ? 260 : 180, rh, COL.gold);
      for (let i = 0; i < a.rewards.length; i++) {
        const rw = a.rewards[i];
        const show = a.t > 1.2 + i * 0.25;
        if (!show) continue;
        if (a.evolve) {
          const icon = SPR.icons[rw.icon];
          if (icon) ctx.drawImage(icon, 124, 160, 24, 24);
          drawText(ctx, rw.name, 156, 162, COL.gold, { shadow: COL.outline });
          const dlines = wrapText(rw.desc || '', 32);
          let dy = 176;
          for (const ln of dlines) { drawText(ctx, ln, 156, dy, COL.greyLight); dy += 10; }
        } else {
          const icon = SPR.icons[rw.icon];
          if (icon) ctx.drawImage(icon, 158, 158 + i * 16);
          drawText(ctx, rw.name, 176, 160 + i * 16, COL.white);
        }
      }
      if (a.t > 1.6) drawText(ctx, 'ENTER: DEVAM', 240, 152 + rh + 10, COL.greyLight, { align: 'center', alpha: 0.6 + Math.sin(a.t * 5) * 0.4 });
    }
  },

  // ── MOLA ──
  updatePause() {
    const labels = 4;
    this.navVertical(labels);
    if (Input.back()) { Game.state = 'play'; return; }
    let hit = -1;
    for (let i = 0; i < labels; i++) {
      if (Input.mouseIn(180, 118 + i * 20 - 4, 120, 16)) { hit = i; Game.menuIdx = i; }
    }
    if (Input.confirm() || (Input.mouse.clicked && hit >= 0)) {
      Sfx.play('select');
      if (Game.menuIdx === 0) Game.state = 'play';
      else if (Game.menuIdx === 1) Game.startRun(Game.player.charId);
      else if (Game.menuIdx === 2) { Game.state = 'title'; Game.menuIdx = 0; Sfx.stopMusic(); }
      else Sfx.setMute(!Sfx.muted);
    }
  },

  drawPause(ctx) {
    this.dim(ctx, 0.6);
    drawText(ctx, 'MOLA', 240, 60, COL.white, { align: 'center', scale: 3, shadow: COL.outline });
    const p = Game.player;
    drawText(ctx, p.def.name + ' · SV ' + Game.level + ' · ' + fmtTime(Game.time), 240, 92, COL.grey, { align: 'center' });
    const labels = ['DEVAM ET', 'YENİDEN BAŞLA', 'ANA MENÜ', 'SES: ' + (Sfx.muted ? 'KAPALI' : 'AÇIK')];
    for (let i = 0; i < labels.length; i++) {
      const sel = Game.menuIdx === i;
      if (sel) drawText(ctx, '>', 240 - textW(labels[i]) / 2 - 14, 118 + i * 20, COL.yellow, { shadow: COL.outline });
      drawText(ctx, labels[i], 240, 118 + i * 20, sel ? COL.yellow : COL.greyLight, { align: 'center', shadow: COL.outline });
    }
  },

  // ── OYUN SONU ──
  updateOver() {
    // isim girişi
    for (const ch of Input.typed) {
      if (Game.nameInput.length < 10 && /[a-zA-ZçğıöşüÇĞİÖŞÜ0-9 ]/.test(ch)) {
        Game.nameInput += ch;
      }
    }
    if (Input.pressed['Backspace']) Game.nameInput = Game.nameInput.slice(0, -1);
    if (Input.pressed['KeyR'] && Game.nameInput === '') { Game.startRun(Game.player.charId); return; }
    // mobil: dokunuş = kaydet (isim zaten karakter adıyla dolu gelir)
    const touchSave = Input.touchMode && Input.mouse.clicked;
    if (Input.pressed['Enter'] || Input.pressed['NumpadEnter'] || touchSave) { Sfx.play('select'); Game.saveScore(); }
  },

  drawOver(ctx) {
    this.dim(ctx, 0.72);
    const legend = Game.time >= WIN_TIME;
    if (legend) {
      drawText(ctx, 'EFSANE MESAİ!', 240, 34, COL.gold, { align: 'center', scale: 3, shadow: COL.outline });
      drawText(ctx, Math.floor(Game.time / 60) + ' DAKİKA DAYANDIN! DESTANLIK PERFORMANS!', 240, 62, COL.greyLight, { align: 'center' });
    } else {
      drawText(ctx, 'MESAİ FELAKETİ!', 240, 34, COL.red, { align: 'center', scale: 3, shadow: COL.outline });
      drawText(ctx, 'MÜŞTERİLER ' + Game.player.def.name + "'İ YEDİ BİTİRDİ...", 240, 62, COL.greyLight, { align: 'center' });
    }

    this.panel(ctx, 130, 78, 220, 104, legend ? COL.gold : COL.red);
    const rows = [
      ['SÜRE', fmtTime(Game.time)],
      ['SEVİYE', Game.level],
      ['MÜŞTERİ', Game.kills],
      ['PARA', Game.coins]
    ];
    for (let i = 0; i < rows.length; i++) {
      drawText(ctx, rows[i][0], 142, 86 + i * 14, COL.grey);
      drawText(ctx, rows[i][1], 338, 86 + i * 14, COL.white, { align: 'right' });
    }
    drawText(ctx, 'SKOR', 142, 146, COL.gold);
    drawText(ctx, Game.displayScore(), 338, 142, COL.gold, { align: 'right', scale: 2, shadow: COL.outline });
    drawText(ctx, '+' + Game.coins + ' PARA BANKAYA YATTI (DÜKKAN)', 240, 164, COL.gold, { align: 'center' });

    // bu koşuda açılan başarımlar + sıradaki hedef (bir daha oynat!)
    if (Achievements.runUnlocked.length) {
      const names = Achievements.runUnlocked.slice(0, 3).map(a => a.name).join(' · ');
      drawText(ctx, 'AÇILDI: ' + names, 240, 178, COL.gold, { align: 'center', shadow: COL.outline });
    } else {
      const g = Achievements.nextGoal();
      if (g) {
        const cur = Achievements.progressOf(g);
        drawText(ctx, 'SONRAKİ HEDEF: ' + g.name + ' (' + cur + '/' + g.target + ')',
          240, 178, COL.teal, { align: 'center' });
      }
    }

    const cursor = ((Game.uiT * 3) | 0) % 2 ? '_' : ' ';
    drawText(ctx, 'ADIN: ' + Game.nameInput + cursor, 240, 196, COL.yellow, { align: 'center', shadow: COL.outline });
    drawText(ctx, 'ENTER: SKORU KAYDET', 240, 216, COL.greyLight, { align: 'center' });
    drawText(ctx, 'İSMİ SİLİP R: HEMEN TEKRAR', 240, 230, COL.greyDark, { align: 'center' });
  },

  // ── SKOR TABLOSU ──
  updateScores() {
    if (Input.back() || Input.confirm() || Input.mouse.clicked) {
      Game.state = 'title'; Game.menuIdx = 0;
      Sfx.stopMusic();
    }
    if (Input.pressed['KeyR'] && Game.player) { Game.startRun(Game.player.charId); }
  },

  drawScores(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.7);
    drawText(ctx, 'SKOR TABLOSU', 240, 14, COL.gold, { align: 'center', scale: 2, shadow: COL.outline });

    const list = Game.loadScores();

    // durum satırı: kayıt / yükleme / çevrimdışı / ortak tablo
    const st = Game.scoresState;
    let subTxt, subCol;
    if (st === 'saving')       { subTxt = 'SKORUN KAYDEDİLİYOR...';    subCol = COL.yellow; }
    else if (st === 'loading') { subTxt = 'ORTAK TABLO YÜKLENİYOR...'; subCol = COL.greyLight; }
    else if (st === 'error')   { subTxt = 'İNTERNET YOK · YEREL SKORLAR'; subCol = COL.orange; }
    else                       { subTxt = SCORES_REMOTE ? 'ROBOTSEPETİ EKİP TABLOSU' : 'YEREL SKORLAR'; subCol = COL.teal; }
    const subOpts = { align: 'center', shadow: COL.outline };
    if (st === 'saving' || st === 'loading') subOpts.alpha = 0.5 + Math.sin(Game.uiT * 6) * 0.4;
    drawText(ctx, subTxt, 240, 30, subCol, subOpts);

    if (!list.length && st !== 'loading') {
      drawText(ctx, 'HENÜZ SKOR YOK. İLK REKORU SEN KIR!', 240, 120, COL.grey, { align: 'center' });
    }
    this.panel(ctx, 40, 38, 400, 200, COL.navy);
    drawText(ctx, '#', 52, 44, COL.greyDark);
    drawText(ctx, 'AD', 70, 44, COL.greyDark);
    drawText(ctx, 'KARAKTER', 180, 44, COL.greyDark);
    drawText(ctx, 'SÜRE', 320, 44, COL.greyDark);
    drawText(ctx, 'SKOR', 428, 44, COL.greyDark, { align: 'right' });

    for (let i = 0; i < Math.min(list.length, 12); i++) {
      const s = list[i];
      const y = 58 + i * 15;
      const me = i === Game.savedRank;
      const def = CHARACTERS[s.charId];
      if (me) {
        ctx.fillStyle = 'rgba(254,231,97,0.12)';
        ctx.fillRect(44, y - 3, 392, 13);
      }
      const col = me ? COL.yellow : (i === 0 ? COL.gold : COL.white);
      drawText(ctx, i + 1, 52, y, col);
      drawText(ctx, s.name, 70, y, col);
      if (def) {
        ctx.fillStyle = def.color;
        ctx.fillRect(180, y + 1, 5, 5);
        drawText(ctx, def.name, 190, y, def.color);
      }
      drawText(ctx, fmtTime(s.time), 320, y, COL.grey);
      drawText(ctx, s.score, 428, y, col, { align: 'right' });
    }
    // sıralaman görünen ilk 12'nin dışındaysa altta göster
    if (Game.savedRank >= 12) {
      drawText(ctx, 'SENİN SIRAN: #' + (Game.savedRank + 1), 240, 240, COL.gold, { align: 'center', shadow: COL.outline });
    }
    drawText(ctx, 'ENTER/ESC: ANA MENÜ', 240, 252, COL.greyLight, { align: 'center' });
  }
};
