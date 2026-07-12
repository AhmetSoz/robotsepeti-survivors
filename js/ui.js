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

  // ── mobil GERİ butonu: tam ekran menülerin sol üstü (ESC'siz çıkış) ──
  backBtn(ctx) {
    this.panel(ctx, 6, 6, 46, 16, COL.navy);
    drawText(ctx, '< GERİ', 12, 10, COL.greyLight);
  },

  backHit() {
    return Input.mouse.clicked && Input.mouseIn(4, 4, 52, 22);
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

    const items = 8;
    this.navVertical(items);
    const hit = this.titleMenuHit();
    if (hit >= 0) Game.menuIdx = hit;
    if (Input.confirm() || (Input.mouse.clicked && hit >= 0)) {
      Sfx.play('select');
      if (Game.menuIdx === 0) {
        // mobilde oyuna girerken otomatik tam ekran (uygulama hissi)
        if (Input.touchMode) goFullscreen();
        Game.dailyPending = false;
        Game.state = 'select'; Game.selIdx = 0;
      }
      else if (Game.menuIdx === 1) { Game.state = 'daily'; }
      else if (Game.menuIdx === 2) { Game.state = 'forge'; }
      else if (Game.menuIdx === 3) { Game.state = 'shop'; Game.menuIdx = 0; }
      else if (Game.menuIdx === 4) { Game.state = 'album'; Game.menuIdx = 0; }
      else if (Game.menuIdx === 5) { Game.state = 'scores'; Game.scoresT = Game.uiT; this.scoresTab = 0; Game.fetchScores(); }
      else if (Game.menuIdx === 6) { isFullscreen() ? exitFullscreen() : goFullscreen(); }
      else { Sfx.setMute(!Sfx.muted); }
    }
  },

  titleMenuHit() {
    for (let i = 0; i < 8; i++) {
      if (Input.mouseIn(160, 156 + i * 12 - 3, 160, 11)) return i;
    }
    return -1;
  },

  // ── SKİLL ATÖLYESİ v2 (kütüphane + editör) ──
  forgeBox() { return document.getElementById('forgeBox'); },
  forgeView: 'lib',   // 'lib' (kütüphane) | 'edit' (yazma ekranı)

  showForgeBox(on) {
    const fb = this.forgeBox();
    if (!fb) return;
    if (on) {
      if (fb.style.display !== 'block') {
        fb.style.display = 'block';
        fb.value = Forge.input || '';
        if (!Input.touchMode) fb.focus();
      }
      Forge.input = fb.value.slice(0, 300);
    } else if (fb.style.display !== 'none') {
      fb.blur(); fb.style.display = 'none';
    }
  },

  updateForge() {
    this.showForgeBox(this.forgeView === 'edit');

    if (Input.back() || this.backHit()) {
      if (this.forgeView === 'edit') { this.forgeView = 'lib'; Sfx.play('click'); return; }
      this.showForgeBox(false);
      Game.state = 'title'; Game.menuIdx = 0; Sfx.play('click'); return;
    }

    // ══ EDİTÖR ══
    if (this.forgeView === 'edit') {
      const fb = this.forgeBox();
      if (Input.mouse.clicked && Input.mouseIn(30, 54, 420, 44) && fb && Input.touchMode) fb.focus();
      // ANLA
      if (Input.mouse.clicked && Input.mouseIn(30, 106, 130, 20)) {
        Forge.draft = parseAbility(Forge.input || '');
        Sfx.play('select');
      }
      // KAYDET (kütüphaneye ekle / üstüne yaz)
      if (Forge.draft && !Forge.draft.unknown && Input.mouse.clicked && Input.mouseIn(175, 106, 130, 20)) {
        if (Forge.commit()) { this.forgeView = 'lib'; Sfx.play('chest'); }
        return;
      }
      // KAYDET + TEST
      if (Forge.draft && !Forge.draft.unknown && Input.mouse.clicked && Input.mouseIn(320, 106, 130, 20)) {
        if (Forge.commit()) {
          this.showForgeBox(false);
          if (Input.touchMode) goFullscreen();
          Sfx.play('select');
          Game.startForgeTest('ahmet');
        }
        return;
      }
      return;
    }

    // ══ KÜTÜPHANE ══
    const list = Forge.data.abilities;
    // YENİ YETENEK butonu
    if (Input.mouse.clicked && Input.mouseIn(30, 46, 130, 20)) {
      Forge.draft = null; Forge.editIdx = -1; Forge.input = '';
      const fb = this.forgeBox(); if (fb) fb.value = '';
      this.forgeView = 'edit'; Sfx.play('select');
      return;
    }
    // OYNA butonu (takılı yeteneklerle koşu)
    if (Forge.equippedSpecs().length && Input.mouse.clicked && Input.mouseIn(320, 46, 130, 20)) {
      this.showForgeBox(false);
      if (Input.touchMode) goFullscreen();
      Sfx.play('select');
      Game.startForgeTest('ahmet');
      return;
    }
    // liste satırları: TAK/ÇIKAR · DÜZENLE · SİL
    for (let i = 0; i < Math.min(list.length, 6); i++) {
      const y = 76 + i * 26;
      if (!Input.mouse.clicked) break;
      if (Input.mouseIn(30, y, 250, 24)) {           // satır → tak/çıkar
        Forge.toggleEquip(list[i].id); Sfx.play('click'); return;
      }
      if (Input.mouseIn(288, y, 74, 24)) {           // DÜZENLE
        Forge.editIdx = i; Forge.draft = list[i];
        Forge.input = list[i].text || '';
        const fb = this.forgeBox(); if (fb) fb.value = Forge.input;
        this.forgeView = 'edit'; Sfx.play('select'); return;
      }
      if (Input.mouseIn(370, y, 80, 24)) {           // SİL
        Forge.remove(i); Sfx.play('hurt'); return;
      }
    }
  },

  drawForge(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.8);
    this.backBtn(ctx);

    if (this.forgeView === 'edit') { this.drawForgeEditor(ctx); return; }

    // ══ KÜTÜPHANE ══
    drawText(ctx, 'SKİLL ATÖLYESİ', 240, 8, COL.teal, { align: 'center', scale: 2, shadow: COL.outline });
    const eqN = Forge.equippedSpecs().length;
    drawText(ctx, 'KÜTÜPHANEN: ' + Forge.data.abilities.length + ' YETENEK · TAKILI: ' + eqN + '/3',
      240, 28, COL.greyLight, { align: 'center' });

    this.panel(ctx, 30, 46, 130, 20, COL.yellow);
    drawText(ctx, '+ YENİ YETENEK', 95, 52, COL.yellow, { align: 'center', shadow: COL.outline });
    this.panel(ctx, 320, 46, 130, 20, eqN ? COL.green : COL.navy);
    drawText(ctx, 'OYNA', 385, 52, eqN ? COL.green : COL.navyDark, { align: 'center', shadow: COL.outline });

    const list = Forge.data.abilities;
    if (!list.length) {
      drawText(ctx, 'HENÜZ YETENEK YOK.', 240, 120, COL.greyDark, { align: 'center' });
      drawText(ctx, '"+ YENİ YETENEK" İLE KENDİ CÜMLENLE YARAT.', 240, 134, COL.grey, { align: 'center' });
      drawText(ctx, 'örn: "önce ileri atıl, sonra etrafına buz halkası yay, dondursun"',
        240, 154, COL.navy, { align: 'center' });
    }
    for (let i = 0; i < Math.min(list.length, 6); i++) {
      const a = list[i];
      const y = 76 + i * 26;
      const slot = Forge.data.equipped.indexOf(a.id);
      const tcol = COL[(THEMES[a.theme] || THEMES.sade).col] || COL.white;
      this.panel(ctx, 30, y, 250, 24, slot >= 0 ? COL.gold : COL.navy);
      // tema renk noktası
      ctx.fillStyle = tcol; ctx.fillRect(36, y + 8, 6, 6);
      drawText(ctx, a.name, 48, y + 3, slot >= 0 ? COL.gold : COL.white);
      drawText(ctx, (TRIGGER_LABEL[a.trigger.kind] || '') + ' · ' + specChain(a).slice(0, 30),
        48, y + 13, COL.grey);
      if (slot >= 0) drawText(ctx, 'SLOT ' + (slot + 1), 274, y + 8, COL.gold, { align: 'right' });
      this.panel(ctx, 288, y, 74, 24, COL.teal);
      drawText(ctx, 'DÜZENLE', 325, y + 8, COL.teal, { align: 'center' });
      this.panel(ctx, 370, y, 80, 24, COL.red);
      drawText(ctx, 'SİL', 410, y + 8, COL.red, { align: 'center' });
    }
    drawText(ctx, 'SATIRA TIKLA: SLOTA TAK / ÇIKAR · ESC: GERİ', 240, 250, COL.greyDark, { align: 'center' });
  },

  drawForgeEditor(ctx) {
    drawText(ctx, Forge.editIdx >= 0 ? 'YETENEĞİ DÜZENLE' : 'YENİ YETENEK', 240, 8, COL.teal,
      { align: 'center', scale: 2, shadow: COL.outline });
    drawText(ctx, 'UZUN UZUN ANLAT — NE YAPSIN, NASIL GÖRÜNSÜN, NE ZAMAN ÇALIŞSIN?',
      240, 28, COL.greyLight, { align: 'center' });

    // uzun metin kutusu (3 satıra sarar)
    this.panel(ctx, 30, 40, 420, 58, COL.navy);
    const cursor = ((Game.uiT * 3) | 0) % 2 ? '_' : '';
    const shown = Forge.input || '';
    if (shown) {
      const lines = wrapText(shown + cursor, 66).slice(-4);
      let ty = 46;
      for (const ln of lines) { drawText(ctx, ln, 36, ty, COL.white); ty += 12; }
    } else {
      drawText(ctx, 'örn: "her 3 saniyede otomatik olarak', 36, 48, COL.greyDark);
      drawText(ctx, 'her yöne 8 zehir mermisi saç, zehirlesin"' + cursor, 36, 60, COL.greyDark);
      drawText(ctx, 'örn: "önce ileri atıl, sonra dev ateş patlaması yap, yaksın ve savursun"',
        36, 76, COL.navy);
    }

    // butonlar
    this.panel(ctx, 30, 106, 130, 20, COL.yellow);
    drawText(ctx, 'ANLA', 95, 112, COL.yellow, { align: 'center', shadow: COL.outline });
    const spec = Forge.draft;
    const ok = spec && !spec.unknown;
    this.panel(ctx, 175, 106, 130, 20, ok ? COL.teal : COL.navy);
    drawText(ctx, 'KAYDET', 240, 112, ok ? COL.teal : COL.navyDark, { align: 'center', shadow: COL.outline });
    this.panel(ctx, 320, 106, 130, 20, ok ? COL.green : COL.navy);
    drawText(ctx, 'KAYDET + TEST', 385, 112, ok ? COL.green : COL.navyDark, { align: 'center', shadow: COL.outline });

    // çözümleme
    if (!spec) {
      drawText(ctx, 'YAZ VE "ANLA"YA BAS.', 240, 150, COL.greyDark, { align: 'center' });
      drawText(ctx, 'KELİMELER: ateş buz zehir şok kutsal karanlık kan rüzgar · koni halka patlama',
        240, 176, COL.navy, { align: 'center' });
      drawText(ctx, 'mermi güdümlü bumerang meteor araç bulut yörünge atıl ışınlan sahte',
        240, 188, COL.navy, { align: 'center' });
      drawText(ctx, 'dondur yavaşlat yak zehirle savur çek kalkan iyileş öfkelen · otomatik vurunca',
        240, 200, COL.navy, { align: 'center' });
      return;
    }
    if (spec.unknown) {
      drawText(ctx, 'ANLAYAMADIM — YUKARIDAKİ KELİMELERDEN KULLAN.', 240, 150, COL.orange, { align: 'center' });
      return;
    }
    const tcol = COL[(THEMES[spec.theme] || THEMES.sade).col] || COL.white;
    this.panel(ctx, 30, 134, 420, 88, tcol);
    drawText(ctx, spec.name, 240, 139, COL.yellow, { align: 'center', shadow: COL.outline });
    // op zinciri (satır satır, çakışmasın)
    let cy = 152;
    for (const ln of wrapText(specChain(spec), 58).slice(0, 2)) {
      drawText(ctx, ln, 240, cy, tcol, { align: 'center' });
      cy += 11;
    }
    for (const ln of wrapText(specSummary(spec), 60).slice(0, 2)) {
      drawText(ctx, ln, 240, cy, COL.greyLight, { align: 'center' });
      cy += 11;
    }
    drawText(ctx, 'ANLADIM: ' + spec.matched.join(', ').slice(0, 56), 240, cy, COL.grey, { align: 'center' });
    cy += 10;
    if (spec.ignored && spec.ignored.length) {
      drawText(ctx, 'ANLAMADIM: ' + spec.ignored.join(', ').slice(0, 50), 240, cy, COL.redDark, { align: 'center' });
    }
    drawText(ctx, 'ESC: KÜTÜPHANEYE DÖN', 240, 250, COL.greyDark, { align: 'center' });
  },

  // ── GÜNÜN VARDİYASI onay ekranı ──
  updateDaily() {
    if (Input.back() || this.backHit()) { Game.state = 'title'; Game.menuIdx = 0; Sfx.play('click'); return; }
    const startHit = Input.mouse.clicked && Input.mouseIn(170, 190, 140, 22);
    if (Input.confirm() || startHit) {
      Sfx.play('select');
      if (Input.touchMode) goFullscreen();
      Game.dailyPending = true;
      Game.state = 'select'; Game.selIdx = 0;
    }
  },

  drawDaily(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.72);
    this.backBtn(ctx);
    drawText(ctx, 'GÜNÜN VARDİYASI', 240, 20, COL.teal, { align: 'center', scale: 2, shadow: COL.outline });
    drawText(ctx, dailyKey() + ' · HERKESE AYNI KOŞULLAR, AYRI SKOR TABLOSU', 240, 42, COL.greyLight, { align: 'center' });

    // bugünün modifiye edicileri
    const mods = Game.todayMods();
    for (let i = 0; i < mods.length; i++) {
      const y = 66 + i * 44;
      this.panel(ctx, 90, y, 300, 36, COL.teal);
      drawText(ctx, mods[i].name, 240, y + 7, COL.yellow, { align: 'center', shadow: COL.outline });
      drawText(ctx, mods[i].desc, 240, y + 21, COL.greyLight, { align: 'center' });
    }

    // başlat butonu
    const pulse = 0.6 + Math.sin(Game.uiT * 5) * 0.4;
    this.panel(ctx, 170, 190, 140, 22, COL.yellow);
    drawText(ctx, 'VARDİYAYA BAŞLA', 240, 197, COL.yellow, { align: 'center', shadow: COL.outline, alpha: pulse });
    drawText(ctx, 'SKORUN BUGÜNÜN TABLOSUNA YAZILIR (7 GÜN SAKLANIR)', 240, 226, COL.greyDark, { align: 'center' });
    drawText(ctx, 'ENTER: BAŞLA · ESC: GERİ', 240, 250, COL.greyLight, { align: 'center' });
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
    const labels = ['BAŞLA',
      'GÜNÜN VARDİYASI',
      'SKİLL ATÖLYESİ *YENİ*',
      'DÜKKAN',
      'ALBÜM (' + achN + '/' + ACH_DEFS.length + ')',
      'SKOR TABLOSU',
      'TAM EKRAN: ' + (isFullscreen() ? 'AÇIK' : 'KAPALI'),
      'SES: ' + (Sfx.muted ? 'KAPALI' : 'AÇIK')];
    for (let i = 0; i < labels.length; i++) {
      const sel = Game.menuIdx === i;
      const y = 156 + i * 12;
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

  // ── DÜKKAN: kalıcı yükseltmeler + kostümler + teknikler ──
  shopTab: 0,   // 0: yükseltmeler, 1: kostümler, 2: teknikler
  _techRows: null,

  // teknik satırları: her karakterin kilitlenebilir vuruş/yetenek varyantları
  techRows() {
    if (!this._techRows) {
      this._techRows = [];
      for (const cid of CHAR_ORDER) {
        for (const listName of ['weapons', 'skills']) {
          const list = TECHS[cid][listName];
          for (let idx = 1; idx < list.length; idx++) {
            this._techRows.push({ cid, listName, id: list[idx], cost: TECH_COST[idx] });
          }
        }
      }
    }
    return this._techRows;
  },

  // teknik kilidini açan başarımın adı (yoksa null)
  achFor(unlockId) {
    if (!this._achUnlocks) {
      this._achUnlocks = {};
      for (const a of ACH_DEFS) {
        if (a.reward && a.reward.unlock) this._achUnlocks[a.reward.unlock] = a.name;
      }
    }
    return this._achUnlocks[unlockId] || null;
  },

  shopRows() {
    return this.shopTab === 0 ? META_ORDER : (this.shopTab === 1 ? COSTUME_ORDER : this.techRows());
  },

  updateShop() {
    if (Input.back() || this.backHit()) { Game.state = 'title'; Game.menuIdx = 0; Sfx.play('click'); return; }
    // sekme değiştir: sol/sağ ya da sekme başlığına tıkla
    if (Input.pressed['ArrowRight'] || Input.pressed['KeyD']) {
      this.shopTab = (this.shopTab + 1) % 3; Game.menuIdx = 0; Sfx.play('click'); return;
    }
    if (Input.pressed['ArrowLeft'] || Input.pressed['KeyA']) {
      this.shopTab = (this.shopTab + 2) % 3; Game.menuIdx = 0; Sfx.play('click'); return;
    }
    for (let tb = 0; tb < 3; tb++) {
      if (Input.mouse.clicked && Input.mouseIn(80 + tb * 110, 24, 100, 14) && this.shopTab !== tb) {
        this.shopTab = tb; Game.menuIdx = 0; Sfx.play('click'); return;
      }
    }
    const rows = this.shopRows();
    this.navVertical(rows.length);
    const act = i => {
      const r = rows[i];
      const ok = this.shopTab === 0 ? Meta.buy(r)
               : this.shopTab === 1 ? Meta.buyOrWear(r)
               : Meta.buyUnlock('t_' + r.id, r.cost);
      Sfx.play(ok ? 'chest' : 'hurt');
    };
    if (this.shopTab === 2) {
      // kaydırmalı liste: tıklanan satır seçilir, seçiliyken tıklanınca alınır
      const first = clamp(Game.menuIdx - 4, 0, Math.max(0, rows.length - 9));
      for (let r = 0; r < 9 && first + r < rows.length; r++) {
        if (Input.mouse.clicked && Input.mouseIn(40, 44 + r * 21, 400, 19)) {
          if (Game.menuIdx === first + r) act(Game.menuIdx);
          else Game.menuIdx = first + r;
        }
      }
    } else {
      for (let i = 0; i < rows.length; i++) {
        if (Input.mouseIn(40, 44 + i * 21, 400, 19)) {
          Game.menuIdx = i;
          if (Input.mouse.clicked) act(i);
        }
      }
    }
    if (Input.confirm()) act(Game.menuIdx);
  },

  drawShop(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.72);
    this.backBtn(ctx);
    drawText(ctx, 'DÜKKAN', 240, 8, COL.orange, { align: 'center', scale: 2, shadow: COL.outline });
    ctx.drawImage(SPR.coin, 380, 10);
    drawText(ctx, Meta.bank, 390, 11, COL.gold, { shadow: COL.outline });

    // sekmeler
    const tabs = ['YÜKSELTMELER', 'KOSTÜMLER', 'TEKNİKLER'];
    for (let tb = 0; tb < 3; tb++) {
      const on = this.shopTab === tb;
      const x = 80 + tb * 110;
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
    } else if (this.shopTab === 1) {
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
    } else {
      // ── teknikler: karakter vuruş/yetenek varyant kilitleri ──
      const rows = this.techRows();
      const first = clamp(Game.menuIdx - 4, 0, Math.max(0, rows.length - 9));
      for (let r = 0; r < 9 && first + r < rows.length; r++) {
        const t = rows[first + r];
        const def = t.listName === 'weapons' ? WEAPONS[t.id] : SKILLS[t.id];
        const cdef = CHARACTERS[t.cid];
        const open = Meta.unlocked('t_' + t.id);
        const sel = Game.menuIdx === first + r;
        const y = 44 + r * 21;
        this.panel(ctx, 40, y, 400, 19, sel ? COL.yellow : (open ? COL.teal : COL.navy));
        // karakter renk şeridi + ikon
        ctx.fillStyle = cdef.color; ctx.fillRect(44, y + 2, 3, 15);
        const icon = SPR.icons[t.listName === 'weapons' ? t.id : def.icon];
        if (icon) ctx.drawImage(icon, 51, y + 3);
        const viaAch = !open && this.achFor('t_' + t.id);
        drawText(ctx, cdef.name + ' · ' + def.name, 67, y + 2, sel ? COL.yellow : (open ? COL.teal : COL.white));
        drawText(ctx, (t.listName === 'weapons' ? 'VURUŞ' : 'YETENEK') + ' — ' + def.desc.slice(0, viaAch ? 27 : 40), 67, y + 11, COL.grey);
        if (open) {
          drawText(ctx, 'AÇIK', 434, y + 6, COL.green, { align: 'right' });
        } else {
          drawText(ctx, t.cost + ' PARA', 434, y + 3, Meta.bank >= t.cost ? COL.gold : COL.redDark, { align: 'right' });
          if (viaAch) drawText(ctx, 'BAŞARIMLA DA AÇILIR', 434, y + 12, COL.greyDark, { align: 'right' });
        }
      }
      // kaydırma çubuğu
      if (rows.length > 9) {
        const k = Game.menuIdx / (rows.length - 1);
        ctx.fillStyle = COL.navyDark; ctx.fillRect(444, 44, 3, 187);
        ctx.fillStyle = COL.grey; ctx.fillRect(444, 44 + Math.round(k * 173), 3, 14);
      }
      drawText(ctx, 'ENTER: KİLİDİ AÇ · A/D: SEKME · ESC: GERİ', 240, 250, COL.greyLight, { align: 'center' });
    }
  },

  // ── ALBÜM: başarımlar + günlükler (hikâye) ──
  updateAlbum() {
    if (Input.back() || this.backHit()) { Game.state = 'title'; Game.menuIdx = 0; Sfx.play('click'); return; }
    // sekme değiştir: A/D ya da sekme başlığına dokun
    if (Input.pressed['ArrowLeft'] || Input.pressed['KeyA'] ||
        Input.pressed['ArrowRight'] || Input.pressed['KeyD']) {
      this.albumTab = 1 - this.albumTab; Game.menuIdx = 0; Sfx.play('click'); return;
    }
    for (let tb = 0; tb < 2; tb++) {
      if (Input.mouse.clicked && Input.mouseIn(120 + tb * 125, 24, 115, 18) && this.albumTab !== tb) {
        this.albumTab = tb; Game.menuIdx = 0; Sfx.play('click'); return;
      }
    }
    const len = this.albumTab === 0 ? ACH_DEFS.length : STORY_PAGES.length;
    this.navVertical(len);
    // dokunma: tıklanan satır seçilir (sekmeye göre satır düzeni farklı)
    if (this.albumTab === 0) {
      for (let r = 0; r < 8; r++) {
        if (Input.mouseIn(30, 62 + r * 22, 420, 20) && Input.mouse.clicked) {
          const first = clamp(Game.menuIdx - 3, 0, Math.max(0, len - 8));
          Game.menuIdx = clamp(first + r, 0, len - 1);
        }
      }
    } else {
      for (let r = 0; r < 6; r++) {
        if (Input.mouseIn(30, 46 + r * 20, 420, 18) && Input.mouse.clicked) {
          const first = clamp(Game.menuIdx - 2, 0, Math.max(0, len - 6));
          Game.menuIdx = clamp(first + r, 0, len - 1);
        }
      }
    }
    if (Input.confirm()) { Game.state = 'title'; Game.menuIdx = 0; }
  },

  albumTab: 0,   // 0: başarımlar, 1: günlükler (hikâye)

  drawAlbum(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.75);
    this.backBtn(ctx);
    const doneN = Achievements.countDone();
    drawText(ctx, 'ALBÜM', 240, 8, COL.gold, { align: 'center', scale: 2, shadow: COL.outline });

    // sekmeler: BAŞARIMLAR / GÜNLÜKLER
    const tabs = ['BAŞARIM (' + doneN + '/' + ACH_DEFS.length + ')',
                  'GÜNLÜKLER (' + Story.countFound() + '/' + STORY_PAGES.length + ')'];
    for (let tb = 0; tb < 2; tb++) {
      const on = this.albumTab === tb;
      const x = 120 + tb * 125;
      ctx.fillStyle = on ? 'rgba(254,174,52,0.15)' : 'rgba(38,43,68,0.8)';
      ctx.fillRect(x, 26, 115, 14);
      ctx.strokeStyle = on ? COL.gold : COL.navy;
      ctx.strokeRect(x + 0.5, 26.5, 114, 13);
      drawText(ctx, tabs[tb], x + 57, 30, on ? COL.gold : COL.greyDark, { align: 'center' });
    }

    if (this.albumTab === 1) { this.drawDiaries(ctx); return; }

    // istatistik şeridi
    const st = Achievements.stats;
    drawText(ctx, 'DEVRİLEN: ' + (st.kills || 0), 36, 46, COL.grey);
    drawText(ctx, 'KOŞU: ' + (st.runs || 0), 176, 46, COL.grey);
    drawText(ctx, 'SÜRE: ' + fmtTime(st.time || 0), 268, 46, COL.grey);
    drawText(ctx, 'BOSS: ' + (st.bossTotal || 0), 390, 46, COL.grey);

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
            const extra = a.reward.unlock ? ' +TEKNİK' : '';
            drawText(ctx, '+' + a.reward.coins + ' PARA' + extra, 444, y + 12,
              a.reward.unlock ? COL.teal : COL.gold, { align: 'right' });
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
    drawText(ctx, 'W/S: GEZİN · A/D: SEKME · ESC: GERİ', 240, 250, COL.greyLight, { align: 'center' });
  },

  // GÜNLÜKLER sekmesi: hikâye sayfaları (kayıp kasetlerle açılır)
  drawDiaries(ctx) {
    const n = STORY_PAGES.length;
    const first = clamp(Game.menuIdx - 2, 0, Math.max(0, n - 6));
    for (let r = 0; r < 6 && first + r < n; r++) {
      const pg = STORY_PAGES[first + r];
      const found = !!Story.found[pg.id];
      const sel = Game.menuIdx === first + r;
      const y = 46 + r * 20;
      this.panel(ctx, 30, y, 420, 18, sel ? COL.yellow : (found ? COL.teal : COL.navy));
      if (found) {
        ctx.drawImage(SPR.kaset, 38, y + 7);
        drawText(ctx, pg.title, 52, y + 5, sel ? COL.yellow : COL.teal);
      } else {
        drawText(ctx, '??? KAYIP SAYFA', 52, y + 5, COL.greyDark);
        drawText(ctx, 'KASET BUL (KASA/BOSS)', 444, y + 5, COL.navy, { align: 'right' });
      }
    }
    // kaydırma çubuğu
    if (n > 6) {
      const k = Game.menuIdx / (n - 1);
      ctx.fillStyle = COL.navyDark; ctx.fillRect(456, 46, 3, 118);
      ctx.fillStyle = COL.grey; ctx.fillRect(456, 46 + Math.round(k * 104), 3, 14);
    }
    // seçili sayfanın metni (bulunmuşsa)
    const cur = STORY_PAGES[clamp(Game.menuIdx, 0, n - 1)];
    this.panel(ctx, 30, 170, 420, 66, Story.found[cur.id] ? COL.teal : COL.navy);
    if (Story.found[cur.id]) {
      drawText(ctx, cur.title, 38, 175, COL.teal);
      let ty = 187;
      for (const ln of wrapText(cur.txt, 66).slice(0, 5)) {
        drawText(ctx, ln, 38, ty, COL.greyLight);
        ty += 9;
      }
    } else {
      drawText(ctx, 'BU SAYFA HENÜZ BULUNMADI', 240, 195, COL.greyDark, { align: 'center' });
      drawText(ctx, 'KASALARI KIR, BOSSLARI DEVİR: KAYIP KASETLERİ TOPLA', 240, 208, COL.navy, { align: 'center' });
    }
    drawText(ctx, 'W/S: GEZİN · A/D: SEKME · ESC: GERİ', 240, 250, COL.greyLight, { align: 'center' });
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
    // teknik (vuruş/yetenek) seçimi: Q/E döngü, kutucuklara tıklama
    const cid = CHAR_ORDER[Game.selIdx];
    if (Input.pressed['KeyQ']) this.cycleTech(cid, 'weapons');
    if (Input.pressed['KeyE']) this.cycleTech(cid, 'skills');
    // vardiya zorluğu: 1-5 tuşları ya da V kutularına dokunma
    const shiftMax = Achievements.stats.shiftMax || 1;
    for (let i = 0; i < 5; i++) {
      const nn = i + 1;
      const pressKey = Input.pressed['Digit' + nn];
      const clickBox = Input.mouse.clicked && Input.mouseIn(56, 210, 5 * 20 + 4, 19) &&
        Input.mouseIn(58 + i * 20 - 2, 210, 21, 19);
      if (pressKey || clickBox) {
        if (nn <= shiftMax) {
          Meta.data.shift = nn; Meta.save(); Sfx.play('click');
          this.tipFlash = { txt: SHIFT_DEFS[nn - 1].name + ': ' + SHIFT_DEFS[nn - 1].desc, until: Game.uiT + 2 };
        } else {
          Sfx.play('hurt');
          this.tipFlash = { txt: 'KİLİTLİ: VARDİYA ' + (nn - 1) + "'İ 15 DK GEÇ", until: Game.uiT + 2 };
        }
        if (clickBox) return;
      }
    }
    // kutucuk üzerinde bilgi kartı (hover); dokunmatikte tıklayınca 3 sn kalır
    // dokunma hedefleri büyük (25x25 bölge, 21px kutu) — mobil parmak dostu
    this.tipSlot = null;
    for (let k = 0; k < 3; k++) {
      if (Input.mouseIn(382 + k * 24, 220, 25, 24)) this.tipSlot = { listName: 'weapons', idx: k };
      if (Input.mouseIn(382 + k * 24, 244, 25, 24)) this.tipSlot = { listName: 'skills', idx: k };
    }
    if (this.tipSlot && Input.mouse.clicked) {
      this.tipHold = { slot: this.tipSlot, until: Game.uiT + 3 };
      this.pickTech(cid, this.tipSlot.listName, this.tipSlot.idx);
      return;
    }
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

  // ── teknik seçim yardımcıları ──
  cycleTech(cid, listName) {
    const list = TECHS[cid][listName];
    const lo = Meta.loadout(cid);
    const cur = list.indexOf(listName === 'weapons' ? lo.w : lo.s);
    for (let step = 1; step < list.length; step++) {
      const idx = (cur + step) % list.length;
      if (Meta.techUnlocked(cid, listName, list[idx])) {
        this.applyTech(cid, listName, list[idx]);
        return;
      }
    }
    Sfx.play('hurt');   // açık başka teknik yok
  },

  pickTech(cid, listName, idx) {
    const id = TECHS[cid][listName][idx];
    if (!id) return;
    if (!Meta.techUnlocked(cid, listName, id)) {
      // kilitli tekniğe dokunuş: paran yetiyorsa DOĞRUDAN satın al (mobil dostu)
      const cost = TECH_COST[idx] || 0;
      if (Meta.buyUnlock('t_' + id, cost)) {
        Sfx.play('chest');
        this.applyTech(cid, listName, id);
        this.tipFlash = { txt: 'TEKNİK AÇILDI: ' + (listName === 'weapons' ? WEAPONS[id] : SKILLS[id]).name + ' (-' + cost + ' PARA)', until: Game.uiT + 2.2 };
      } else {
        Sfx.play('hurt');
        this.tipFlash = { txt: 'KİLİTLİ: ' + cost + ' PARA GEREK (BANKA: ' + Meta.bank + ')', until: Game.uiT + 2 };
      }
      return;
    }
    this.applyTech(cid, listName, id);
  },

  applyTech(cid, listName, id) {
    const lo = Meta.loadout(cid);
    Meta.setLoadout(cid, listName === 'weapons' ? id : lo.w, listName === 'skills' ? id : lo.s);
    // onay yazısı: ne seçildiği net görülsün
    const def = listName === 'weapons' ? WEAPONS[id] : SKILLS[id];
    this.tipFlash = {
      txt: (listName === 'weapons' ? 'VURUŞ SEÇİLDİ: ' : 'YETENEK SEÇİLDİ: ') + def.name,
      until: Game.uiT + 1.8
    };
    Sfx.play('select');
  },

  // 3'lü teknik kutucuğu şeridi (seçim ekranı alt paneli; 21px kutu = parmak dostu)
  techSlots(ctx, cid, listName, curId, x0, y0) {
    const list = TECHS[cid][listName];
    for (let k = 0; k < list.length; k++) {
      const tid = list[k];
      const open = Meta.techUnlocked(cid, listName, tid);
      const cur = tid === curId;
      const x = x0 + k * 24;
      ctx.fillStyle = cur ? 'rgba(254,231,97,0.18)' : 'rgba(24,20,37,0.6)';
      ctx.fillRect(x, y0, 21, 21);
      ctx.strokeStyle = cur ? COL.yellow : (open ? COL.greyDark : COL.navyDark);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y0 + 0.5, 20, 20);
      const icon = SPR.icons[listName === 'weapons' ? tid : SKILLS[tid].icon];
      if (open) {
        if (icon) ctx.drawImage(icon, x + 4, y0 + 4);
      } else {
        // kilitli: soluk ikon + altın kilit
        if (icon) { ctx.save(); ctx.globalAlpha = 0.22; ctx.drawImage(icon, x + 4, y0 + 4); ctx.restore(); }
        ctx.fillStyle = COL.gold;
        ctx.fillRect(x + 8, y0 + 10, 6, 5);
        ctx.fillRect(x + 9, y0 + 7, 1, 3); ctx.fillRect(x + 12, y0 + 7, 1, 3);
      }
    }
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

    // seçili karakter detayı + teknik (loadout) seçimi
    const id = CHAR_ORDER[Game.selIdx];
    const def = CHARACTERS[id];
    const lo = Meta.loadout(id);
    const w = WEAPONS[lo.w];
    const sk = SKILLS[lo.s];
    // vardiya zorluğu seçici (V1-V5): bir üst vardiya, alttakini 15dk geçince açılır
    const shiftMax = Achievements.stats.shiftMax || 1;
    const selShift = clamp(Meta.data.shift || 1, 1, 5);
    drawText(ctx, 'ZORLUK:', 12, 216, COL.greyLight, { shadow: COL.outline });
    for (let i = 0; i < 5; i++) {
      const nn = i + 1;
      const x = 58 + i * 20;
      const openS = nn <= shiftMax;
      const cur = nn === selShift;
      ctx.fillStyle = cur ? 'rgba(254,231,97,0.2)' : 'rgba(24,20,37,0.6)';
      ctx.fillRect(x, 212, 17, 15);
      ctx.strokeStyle = cur ? COL.yellow : (openS ? COL.greyDark : COL.navyDark);
      ctx.strokeRect(x + 0.5, 212.5, 16, 14);
      // bu karakterle tamamlandıysa altın nokta
      if (Achievements.stats['shift_' + id + '_' + nn]) {
        ctx.fillStyle = COL.gold; ctx.fillRect(x + 12, 214, 3, 3);
      }
      drawText(ctx, 'V' + nn, x + 3, 216, openS ? (cur ? COL.yellow : COL.white) : COL.navyDark);
    }
    const sdf = SHIFT_DEFS[selShift - 1];
    drawText(ctx, (sdf.desc + ' · ÖDÜL x' + sdf.reward).slice(0, 30), 168, 216, COL.teal);
    drawText(ctx, 'Q/E: TEKNİK', 470, 216, COL.greyLight, { align: 'right' });
    this.panel(ctx, 10, 224, 460, 42, def.color);
    ctx.drawImage(SPR.icons[lo.w] || SPR.icons.box, 16, 226);
    drawText(ctx, (w.name + ': ' + w.desc).slice(0, 56), 34, 228, COL.white);
    drawText(ctx, (def.passiveName + ': ' + def.passiveDesc).slice(0, 56), 34, 240, COL.teal);
    ctx.drawImage(SPR.icons[sk.icon] || SPR.icons['sk_' + id], 16, 250);
    drawText(ctx, (sk.name + ': ' + sk.desc).slice(0, 56), 34, 252, COL.yellow);
    // sağda teknik kutucukları: üst sıra vuruşlar (Q), alt sıra yetenekler (E)
    this.techSlots(ctx, id, 'weapons', lo.w, 384, 221);
    this.techSlots(ctx, id, 'skills', lo.s, 384, 245);
    drawText(ctx, 'Q', 375, 228, COL.greyLight);
    drawText(ctx, 'E', 375, 252, COL.greyLight);

    // seçim onayı: Q/E ya da tıklamayla teknik değişince kısa bildirim
    if (this.tipFlash && Game.uiT < this.tipFlash.until) {
      const a = clamp((this.tipFlash.until - Game.uiT) / 0.4, 0, 1);
      const tw = textW(this.tipFlash.txt);
      ctx.fillStyle = 'rgba(24,20,37,' + (a * 0.85).toFixed(2) + ')';
      ctx.fillRect(240 - tw / 2 - 8, 198, tw + 16, 13);
      drawText(ctx, this.tipFlash.txt, 240, 201, COL.yellow, { align: 'center', shadow: COL.outline, alpha: a });
    }

    // bilgi kartı: kutucuğun üstüne gelince (dokunmatikte tıklayınca 3 sn)
    let tip = this.tipSlot;
    if (!tip && this.tipHold && Game.uiT < this.tipHold.until) tip = this.tipHold.slot;
    if (tip) {
      const list = TECHS[id][tip.listName];
      const tid = list[tip.idx];
      if (tid) {
        const isW = tip.listName === 'weapons';
        const tdef = isW ? WEAPONS[tid] : SKILLS[tid];
        const open = Meta.techUnlocked(id, tip.listName, tid);
        const curSel = (isW ? lo.w : lo.s) === tid;
        // içerik satırları
        const descLines = wrapText(tdef.desc, 34).slice(0, 2);
        const achName = open ? null : this.achFor('t_' + tid);
        const evExtra = (tip.listName === 'weapons' && EVOLUTIONS[tid]) ? 10 : 0;
        const h = 26 + descLines.length * 10 + (open ? 10 : (achName ? 20 : 10)) + evExtra;
        const bx = 240, by = 210 - h;
        this.panel(ctx, bx, by, 230, h, open ? COL.teal : COL.gold);
        const icon = SPR.icons[isW ? tid : tdef.icon];
        if (icon) ctx.drawImage(icon, bx + 6, by + 5);
        drawText(ctx, tdef.name, bx + 22, by + 4, open ? COL.white : COL.gold);
        drawText(ctx, isW ? 'OTOMATİK VURUŞ' : 'SPACE YETENEĞİ', bx + 22, by + 13, COL.grey);
        let ty = by + 24;
        for (const ln of descLines) { drawText(ctx, ln, bx + 6, ty, COL.greyLight); ty += 10; }
        if (curSel) {
          drawText(ctx, '► ŞU AN SEÇİLİ', bx + 6, ty, COL.green);
        } else if (open) {
          drawText(ctx, 'AÇIK · TIKLAYINCA SEÇİLİR', bx + 6, ty, COL.teal);
        } else {
          drawText(ctx, 'KİLİTLİ · DÜKKAN: ' + TECH_COST[tip.idx] + ' PARA', bx + 6, ty, COL.gold);
          if (achName) drawText(ctx, 'VEYA BAŞARIM: ' + achName, bx + 6, ty + 10, COL.yellow);
        }
        // evrim rehberi: silahın evrim tarifi (SV6 + hangi item)
        if (isW && EVOLUTIONS[tid]) {
          const ev = EVOLUTIONS[tid];
          drawText(ctx, ('EVRİM: SV6 + ' + ITEMS[ev.need].name + ' ' + ev.needLvl + ' = ' + ev.name).slice(0, 38),
            bx + 6, ty + (open ? 10 : (achName ? 20 : 10)), COL.purple);
        }
      }
    }
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
      ctx.drawImage(SPR.icons[w.id] || SPR.icons.box, x, wy - 1);
      drawText(ctx, w.evolved ? 'E' : w.lvl, x + 13, wy + 4, w.evolved ? COL.gold : COL.white, { shadow: COL.outline });
      // evrim rehberi: SV6'da altın "!" — koli açınca evrimleşir / item eksikse ipucu
      const ev = EVOLUTIONS[w.id];
      if (ev && !w.evolved && w.lvl >= WEAPON_MAX_LVL && ((Game.uiT * 3) | 0) % 2) {
        const ready = (p.items[ev.need] || 0) >= ev.needLvl;
        drawText(ctx, '!', x + 5, wy - 10, ready ? COL.gold : COL.greyDark, { shadow: COL.outline });
      }
    }
    let ix = 20 + wn * 26;
    for (const id in p.items) {
      if (!p.items[id] || ITEMS[id].heal) continue;
      ctx.drawImage(SPR.icons[id], ix, wy - 1);
      drawText(ctx, p.items[id], ix + 10, wy + 4, COL.white, { shadow: COL.outline });
      ix += 20;
    }
    // takılar: altın elmas ikonları
    for (const tid of p.trinkets) {
      ctx.drawImage(SPR.trinket, ix, wy);
      ix += 12;
    }

    // sağ alt: aktif yetenek kutusu (SPACE)
    {
      const sk = p.skill;
      const ss = skillStats(p);
      const bx = 442, by = 210;
      const ready = sk.cd <= 0;
      this.panel(ctx, bx, by, 30, 30, ready ? p.def.color : COL.navy);
      const skIcon = SPR.icons[SKILLS[p.skill.id].icon] || SPR.icons['sk_' + p.charId];
      ctx.drawImage(skIcon, bx + 3, by + 3, 24, 24);
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
        if (Game.enemies[i].type.boss && !Game.enemies[i].dead) { boss = Game.enemies[i]; break; }
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

    // ── HİKÂYE görselleri ──
    // karakter konuşma balonu (oyuncunun üstünde)
    if (Game.speech) {
      const spt = Game.speech;
      const psx = Math.round(p.x - Game.camRX + 240);
      const psy = Math.round(p.y - Game.camRY + 135);
      const a = clamp(spt.t < 0.2 ? spt.t / 0.2 : (2.8 - spt.t) / 0.4, 0, 1);
      const tw = Math.min(textW(spt.txt), 200);
      const lines2 = wrapText(spt.txt, 34);
      const bh = 8 + lines2.length * 9;
      const bx2 = clamp(psx - tw / 2 - 6, 4, 476 - tw - 12);
      const by2 = clamp(psy - 46 - bh, 8, 270);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(244,244,248,0.92)';
      ctx.fillRect(bx2, by2, tw + 12, bh);
      ctx.strokeStyle = COL.outline; ctx.lineWidth = 1;
      ctx.strokeRect(bx2 + 0.5, by2 + 0.5, tw + 11, bh - 1);
      // balon kuyruğu
      ctx.fillStyle = 'rgba(244,244,248,0.92)';
      ctx.beginPath();
      ctx.moveTo(psx - 3, by2 + bh); ctx.lineTo(psx + 3, by2 + bh); ctx.lineTo(psx, by2 + bh + 5);
      ctx.closePath(); ctx.fill();
      let sy2 = by2 + 4;
      for (const ln of lines2) {
        drawText(ctx, ln, bx2 + 6, sy2, COL.outline);
        sy2 += 9;
      }
      ctx.restore();
    }
    // depo hoparlör anonsu: üstte ince şerit
    if (Game.anons && !Game.bossIntro) {
      const an = Game.anons;
      const a = clamp(an.t < 0.3 ? an.t / 0.3 : (5 - an.t) / 0.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = 'rgba(24,20,37,0.75)';
      ctx.fillRect(0, 30, 480, 11);
      ctx.fillStyle = COL.greyDark;
      ctx.fillRect(0, 30, 480, 1); ctx.fillRect(0, 40, 480, 1);
      drawText(ctx, an.txt.slice(0, 72), 240, 32, COL.greyLight, { align: 'center' });
      ctx.restore();
    }

    // duyuru bandı (koyu şerit üstünde; başarım toast'ı varken alta kayar)
    if (Game.banner) {
      const by = Game.achToast ? 74 : 56;
      const a = clamp(3 - Game.banner.t, 0, 1);
      const tw = textW(Game.banner.txt);
      ctx.fillStyle = 'rgba(24,20,37,' + (a * 0.6).toFixed(3) + ')';
      ctx.fillRect(240 - tw / 2 - 8, by, tw + 16, 13);
      const blink = 0.7 + Math.sin(Game.banner.t * 10) * 0.3;
      drawText(ctx, Game.banner.txt, 240, by + 3, COL.yellow, { align: 'center', scale: 1, shadow: COL.outline, alpha: clamp(a * blink, 0, 1) });
    }

    // vardiya raporu: 5 dakikada bir ilerleme özeti (gelişme hissi)
    if (Game.report) {
      const rp = Game.report;
      const slide = rp.t < 0.3 ? (1 - rp.t / 0.3) * 40 : (rp.t > 3.5 ? (rp.t - 3.5) / 0.5 * 40 : 0);
      ctx.save();
      ctx.globalAlpha = clamp(4 - rp.t, 0, 1);
      this.panel(ctx, 320 + slide, 92, 154, 58, COL.gold);
      drawText(ctx, rp.dk + '. DAKİKA RAPORU', 397 + slide, 97, COL.gold, { align: 'center', shadow: COL.outline });
      drawText(ctx, 'DEVRİLEN: +' + rp.kills, 328 + slide, 110, COL.white);
      drawText(ctx, 'KAZANÇ: +' + rp.coins + ' PARA', 328 + slide, 121, COL.yellow);
      drawText(ctx, 'REKOR KOMBO: x' + rp.combo, 328 + slide, 132, COL.teal);
      drawText(ctx, 'BÖYLE DEVAM!', 397 + slide, 142, COL.green, { align: 'center' });
      ctx.restore();
    }

    drawText(ctx, 'ESC: MOLA', 474, 258, COL.navy, { align: 'right' });
  },

  // ── SEVİYE ATLAMA ──
  levelCardRect(i) {
    return { x: 66 + i * 120, y: 76, w: 108, h: 118 };
  },

  updateLevelUp() {
    const n = Game.levelOptions.length;
    if (!n) {
      // havuz boşsa emeğin karşılığı yine verilir (openChest ile tutarlı)
      Game.coins += 5;
      Game.score += 200;
      addFloat(Game.player.x, Game.player.y - 24, '+5 PARA', COL.gold, true);
      Game.state = 'play';
      return;
    }
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
    // YENİDEN ÇEK (R): üç kart yeniden dağıtılır (koşu başına 2 hak)
    const rrHit = Input.mouse.clicked && Input.mouseIn(118, 204, 118, 18);
    if ((Input.pressed['KeyR'] || rrHit) && Game.rerolls > 0) {
      Game.rerolls--;
      Game.levelOptions = Game.genOptions();
      Game.levelIdx = 0;
      Sfx.play('click');
      return;
    }
    // YASAKLA (B): seçili kart bu koşuda bir daha gelmez (1 hak)
    const bnHit = Input.mouse.clicked && Input.mouseIn(244, 204, 118, 18);
    if ((Input.pressed['KeyB'] || bnHit) && Game.banishes > 0) {
      const o = Game.levelOptions[Game.levelIdx];
      if (o && o.kind !== 'stat') {   // sonsuz stat kartları yasaklanamaz
        Game.banishes--;
        Game.banished[o.kind + ':' + o.id] = 1;
        Game.levelOptions = Game.genOptions();
        Game.levelIdx = 0;
        Sfx.play('hurt');
      }
      return;
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
      const icon = SPR.icons[o.icon || (o.kind === 'skillswap' ? SKILLS[o.id].icon : o.id)];
      if (icon) ctx.drawImage(icon, r.x + r.w / 2 - 12, r.y + 8, 24, 24);
      const lines = wrapText(o.name, 16);
      let ty = r.y + 38;
      for (const ln of lines) { drawText(ctx, ln, r.x + r.w / 2, ty, sel ? COL.yellow : COL.white, { align: 'center' }); ty += 10; }
      if (o.lvl > 0) {
        const tag = o.kind === 'newweapon' ? 'YENİ SİLAH!'
          : o.kind === 'weapon' ? 'SİLAH SV' + o.lvl
          : o.kind === 'skill' ? 'YETENEK SV' + o.lvl
          : o.kind === 'stat' ? 'SONSUZ KART SV' + o.lvl
          : o.kind === 'skillswap' ? 'YETENEK TAKASI'
          : 'SEVİYE ' + o.lvl;
        const tcol = o.kind === 'newweapon' ? COL.orange
          : (o.kind === 'skill' || o.kind === 'skillswap') ? COL.yellow
          : o.kind === 'stat' ? COL.green : COL.teal;
        drawText(ctx, tag, r.x + r.w / 2, ty + 2, tcol, { align: 'center' });
        ty += 12;
      }
      const dlines = wrapText(o.desc, 16);
      ty += 4;
      for (const ln of dlines) { drawText(ctx, ln, r.x + r.w / 2, ty, COL.grey, { align: 'center' }); ty += 9; }
      // evrim rehberi: bu item bir silahın evrim anahtarı
      if (o.evo) {
        const blink = 0.6 + Math.sin(Game.uiT * 6) * 0.4;
        drawText(ctx, '► EVRİME GİDER:', r.x + r.w / 2, ty + 2, COL.gold, { align: 'center', alpha: blink });
        drawText(ctx, o.evo, r.x + r.w / 2, ty + 11, COL.gold, { align: 'center', alpha: blink });
      }
      drawText(ctx, '' + (i + 1), r.x + 5, r.y + 4, COL.greyDark);
    }
    // yeniden çek / yasakla butonları (build derinliği)
    const rrOk = Game.rerolls > 0, bnOk = Game.banishes > 0;
    this.panel(ctx, 118, 204, 118, 18, rrOk ? COL.teal : COL.navy);
    drawText(ctx, 'YENİDEN ÇEK (' + Game.rerolls + ') R', 177, 209, rrOk ? COL.teal : COL.navyDark, { align: 'center' });
    this.panel(ctx, 244, 204, 118, 18, bnOk ? COL.red : COL.navy);
    drawText(ctx, 'YASAKLA (' + Game.banishes + ') B', 303, 209, bnOk ? COL.red : COL.navyDark, { align: 'center' });
    drawText(ctx, '1/2/3 VEYA OK + ENTER', 240, 232, COL.greyDark, { align: 'center' });
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
  // isim kutusu (gizli HTML input) yardımcıları: mobil klavye ancak
  // gerçek bir input odaklanınca açılır, canvas tek başına açamaz.
  nameBox() { return document.getElementById('nameBox'); },

  showNameBox() {
    const nb = this.nameBox();
    if (!nb) return;
    nb.value = Game.nameInput;
    nb.style.display = 'block';
    // masaüstünde direkt yazılabilsin; mobilde klavye dokununca açılır
    if (!Input.touchMode) nb.focus();
  },

  syncNameBox() {
    const nb = this.nameBox();
    if (!nb) return;
    if (nb.style.display !== 'block') this.showNameBox();
    const clean = nb.value.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9 ]/g, '').slice(0, 12);
    if (clean !== nb.value) nb.value = clean;
    Game.nameInput = clean;
  },

  hideNameBox() {
    const nb = this.nameBox();
    if (!nb) return;
    nb.blur();
    nb.style.display = 'none';
  },

  updateOver() {
    // isim tek kaynaktan gelir: HTML input (çift yazımı önler)
    this.syncNameBox();
    // ölüm anı grace süresi: basılı kalan parmak/tuş ekranı hemen kapatmasın
    if (Game.uiT - (Game.overT || 0) < 1.0) return;
    if (Input.pressed['KeyR'] && Game.nameInput === '') {
      this.hideNameBox();
      Game.startRun(Game.player.charId);
      return;
    }
    // isim satırına tık/dokunuş: input'a odaklan (mobil klavye açılır)
    if (Input.mouse.clicked && Input.mouseIn(150, 188, 180, 16)) {
      const nb = this.nameBox();
      if (nb) nb.focus();
      return;
    }
    // kaydet: ENTER ya da [SKORU KAYDET] butonuna tık/dokunuş
    const onBtn = Input.mouseIn(165, 210, 150, 18);
    if (Input.pressed['Enter'] || Input.pressed['NumpadEnter'] || (Input.mouse.clicked && onBtn)) {
      this.hideNameBox();
      Sfx.play('select');
      Game.saveScore();
    }
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
    // karakterin son sözü
    const lw = Story.deathLine(Game.player.charId);
    if (lw) drawText(ctx, '"' + lw + '"', 240, 71, COL.greyDark, { align: 'center' });

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

    // isim kutusu (tıklanabilir/dokunulabilir)
    const grace = Game.uiT - (Game.overT || 0) < 1.0;
    ctx.fillStyle = 'rgba(24,20,37,0.8)';
    ctx.fillRect(150, 188, 180, 16);
    ctx.strokeStyle = COL.yellow; ctx.lineWidth = 1;
    ctx.strokeRect(150.5, 188.5, 179, 15);
    const cursor = ((Game.uiT * 3) | 0) % 2 ? '_' : ' ';
    drawText(ctx, 'ADIN: ' + Game.nameInput + cursor, 240, 193, COL.yellow, { align: 'center', shadow: COL.outline });
    if (Input.touchMode) {
      drawText(ctx, 'İSME DOKUN: KLAVYE AÇILIR', 240, 179, COL.greyDark, { align: 'center' });
    }

    // [SKORU KAYDET] butonu
    const btnPulse = 0.5 + Math.sin(Game.uiT * 5) * 0.5;
    this.panel(ctx, 165, 210, 150, 18, grace ? COL.navy : COL.gold);
    if (!grace) {
      ctx.strokeStyle = 'rgba(254,174,52,' + (0.3 + btnPulse * 0.5).toFixed(2) + ')';
      ctx.strokeRect(163.5, 208.5, 153, 21);
    }
    drawText(ctx, 'SKORU KAYDET', 240, 215, grace ? COL.greyDark : COL.gold, { align: 'center', shadow: COL.outline });
    drawText(ctx, Input.touchMode ? 'BUTONA DOKUN' : 'ENTER VEYA TIKLA', 240, 234, COL.greyLight, { align: 'center' });
    drawText(ctx, 'İSMİ SİLİP R: HEMEN TEKRAR', 240, 246, COL.greyDark, { align: 'center' });
  },

  // ── SKOR TABLOSU ──
  scoresTab: 0,   // 0: tüm zamanlar, 1: bugünün vardiyası

  updateScores() {
    // kayıttan hemen sonra gelen dokunuş tabloyu kapatmasın
    if (Game.uiT - (Game.scoresT || 0) < 0.6) return;
    // sekme değiştir: A/D ya da sekme başlığına dokun
    if (Input.pressed['ArrowLeft'] || Input.pressed['KeyA'] ||
        Input.pressed['ArrowRight'] || Input.pressed['KeyD']) {
      this.scoresTab = 1 - this.scoresTab;
      Game.fetchScores(this.scoresTab === 1);
      Sfx.play('click');
      return;
    }
    for (let tb = 0; tb < 2; tb++) {
      if (Input.mouse.clicked && Input.mouseIn(130 + tb * 115, 24, 105, 16)) {
        if (this.scoresTab !== tb) {
          this.scoresTab = tb;
          Game.fetchScores(tb === 1);
          Sfx.play('click');
        }
        return;   // sekme dokunuşu tabloyu kapatmasın
      }
    }
    if (Input.back() || Input.confirm() || Input.mouse.clicked) {
      Game.state = 'title'; Game.menuIdx = 0;
      Sfx.stopMusic();
    }
    if (Input.pressed['KeyR'] && Game.player) { Game.startRun(Game.player.charId); }
  },

  drawScores(ctx) {
    World.drawFloor(ctx, 777, 333, Game.uiT);
    this.dim(ctx, 0.7);
    this.backBtn(ctx);
    drawText(ctx, 'SKOR TABLOSU', 240, 8, COL.gold, { align: 'center', scale: 2, shadow: COL.outline });

    // sekmeler: TÜM ZAMANLAR / BUGÜN (günün vardiyası)
    const stabs = ['TÜM ZAMANLAR', 'BUGÜN'];
    for (let tb = 0; tb < 2; tb++) {
      const on = this.scoresTab === tb;
      const x = 130 + tb * 115;
      ctx.fillStyle = on ? 'rgba(254,174,52,0.15)' : 'rgba(38,43,68,0.8)';
      ctx.fillRect(x, 24, 105, 13);
      ctx.strokeStyle = on ? COL.gold : COL.navy;
      ctx.strokeRect(x + 0.5, 24.5, 104, 12);
      drawText(ctx, stabs[tb], x + 52, 27, on ? COL.gold : COL.greyDark, { align: 'center' });
    }

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
    if (this.scoresTab === 1 && st === 'ok') { subTxt = 'GÜNÜN VARDİYASI: ' + dailyKey(); subCol = COL.teal; }
    drawText(ctx, subTxt, 240, 41, subCol, subOpts);

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
