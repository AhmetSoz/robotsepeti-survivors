'use strict';
// ─── Oyun akışı ve yönetmen (director) ───────────────────────
// Oyun SONSUZ: kazanma yok. 15. dakikada "fazla mesai" başlar,
// skor çarpanı artar, bosslar döngüyle geri gelir, zorluk büyümeye devam eder.
const WIN_TIME = 900; // 15 dakika = fazla mesai eşiği

// ─── Ortak skor tablosu (Vercel + Upstash Redis) ─────────────
// http(s) üzerinden açıldığında skorlar buluttaki API'ye gider;
// yerel dosya (file://) olarak açıldığında localStorage'a düşer.
const SCORES_REMOTE = location.protocol === 'http:' || location.protocol === 'https:';
const SCORES_API = '/api/scores';

const Game = {
  state: 'title',   // title | select | play | levelup | chest | pause | over | scores
  player: null,
  time: 0,
  camX: 0, camY: 0, camRX: 0, camRY: 0,
  shake: 0, freeze: 0,
  xp: 0, level: 1, kills: 0, coins: 0, score: 0,
  won: false,
  enemies: [], eShots: [], boxes: [], clouds: [], rings: [],
  cars: [], shocks: [], cones: [], pickups: [], parts: [], floats: [],
  projs: [], corpses: [], decals: [],
  achQueue: [], achToast: null,
  slowT: 0, slowK: 1, decoy: null,
  hazards: [], eRings: [], afterimgs: [], beams: [], ambients: [],
  orbs: [], forgeQueue: [], forgeFiring: false,   // atölye: küreler + kuyruk + rekürsiyon kilidi
  bossIntro: null, curZone: 'depo', roombaT: 6, sparkT: 12,
  ringT: 20, bossChestT: 0, bossChestQ: 0, t2Seen: false, t3Seen: false,
  spawnAcc: 0, eliteT: 60, hordeT: 120, bossIdx: 0, bossAlive: false, hordeN: 0,
  banner: null, flashT: 0, flashCol: '255,255,255',
  combo: 0, comboT: 0, comboBest: 0,
  kickX: 0, kickY: 0,
  pickStreak: 0, pickStreakT: 0,
  lastHurtT: 0, lullT: 0, crateT: 8, tickN: 0, banked: false,
  overtime: false, nextBossT: 0, bossCycleIdx: 0,
  levelOptions: [], levelIdx: 0,
  chestAnim: null,
  nameInput: '', nameDone: false,
  selIdx: 0, menuIdx: 0, savedRank: -1,
  remoteScores: null, scoresState: 'idle',
  bgWalkers: [],

  // ── Günün Vardiyası yardımcıları ──
  daily: false, dailyPending: false, dailyFx: null, rng: null,

  todayMods() {
    // tohumdan deterministik 2 farklı mod seç (herkese aynı)
    const r = mulberry32(dailySeed() * 7 + 3);
    const i1 = (r() * DAILY_MODS.length) | 0;
    let i2 = (r() * DAILY_MODS.length) | 0;
    if (i2 === i1) i2 = (i2 + 1) % DAILY_MODS.length;
    return [DAILY_MODS[i1], DAILY_MODS[i2]];
  },

  dRand(n) {
    // daily modda tohumlu, normalde standart rastgele (spawn akışı herkese benzer)
    return this.daily && this.rng ? this.rng() * n : rand(n);
  },

  // ── koşu başlat ──
  startRun(charId) {
    this.time = 0; this.xp = 0; this.level = 1;
    // Günün Vardiyası: seçilmişse modları ve tohumlu RNG'yi kur
    this.daily = this.dailyPending;
    this.dailyPending = false;
    this.dailyFx = null;
    this.rng = null;
    if (this.daily) {
      this.rng = mulberry32(dailySeed());
      this.dailyFx = { kuryeW: 1, spdMul: 1, hpMul: 1, crate: false, elite: false, xpMul: 1, coinMul: 1, comboWin: 2.2 };
      for (const m of this.todayMods()) {
        for (const k in m.fx) this.dailyFx[k] = m.fx[k];
      }
    }
    // vardiya zorluğu (1-5): seçime göre çarpanlar
    this.shiftN = clamp(Meta.data.shift || 1, 1, 5);
    const sd = SHIFT_DEFS[this.shiftN - 1];
    this.shiftFx = { hp: sd.hp, dmg: sd.dmg, rate: sd.rate, reward: sd.reward };
    this.player = makePlayer(charId);
    this.kills = 0; this.coins = 0; this.score = 0;
    this.won = false; this.savedRank = -1;
    this.camX = 0; this.camY = 0; this.shake = 0; this.freeze = 0;
    this.enemies = []; this.eShots = []; this.boxes = []; this.clouds = [];
    this.rings = []; this.cars = []; this.shocks = []; this.cones = [];
    this.pickups = []; this.parts = []; this.floats = [];
    this.projs = []; this.corpses = []; this.decals = [];
    this.hazards = []; this.eRings = []; this.afterimgs = []; this.beams = []; this.ambients = [];
    this.orbs = []; this.forgeQueue = [];
    this.bossIntro = null; this.curZone = 'depo'; this.roombaT = 6; this.sparkT = 12;
    this.ringT = 20; this.bossChestT = 0; this.bossChestQ = 0; this.t2Seen = false; this.t3Seen = false;
    this.spawnAcc = 0; this.hordeT = 120; this.bossIdx = 0; this.bossAlive = false; this.hordeN = 0;
    this.flashT = 0;
    this.combo = 0; this.comboT = 0; this.comboBest = 0;
    this.kickX = 0; this.kickY = 0;
    this.pickStreak = 0; this.pickStreakT = 0;
    this.lastHurtT = 0; this.lullT = 0; this.crateT = 6; this.tickN = 0; this.banked = false;
    this.overtime = false; this.nextBossT = WIN_TIME + 90; this.bossCycleIdx = 0;
    this.achQueue = []; this.achToast = null;
    this.slowT = 0; this.slowK = 1; this.decoy = null;
    this.reportT = 300; this.repKills = 0; this.repCoins = 0; this.report = null;
    // hikâye durumu: konuşma balonu, anons, kilometre taşları
    this.speech = null; this.introSayT = 1.2; this.sayMilestone = 300;
    this.lowSayT = -99; this.anons = null; this.anonsT = 50;
    Story.anonsIdx = -1;
    // build derinliği: yeniden çek/yasakla hakları + sırlar
    this.rerolls = 2; this.banishes = 1; this.banished = {};
    this.gizliDone = false; this.roombaCd = 0;
    Missions.reset();
    Achievements.startRun();
    this.eliteT = charId === 'berker' ? 48 : 60;
    this.banner = this.daily
      ? { txt: 'GÜNÜN VARDİYASI: ' + this.todayMods().map(m => m.name).join(' + ') + '!', t: 0 }
      : { txt: 'MESAİ BAŞLADI! MÜŞTERİLER GELİYOR!', t: 0 };
    this.nameInput = ''; this.nameDone = false;
    this.state = 'play';
    Sfx.startMusic();
  },

  // SKİLL ATÖLYESİ testi: takılı özel yeteneklerle koşu başlat.
  // makePlayer zaten Forge.equippedSpecs()'i okuyup p.customs'ı ve (varsa)
  // SPACE yeteneğini kurar — burada sadece koşuyu başlatıp duyuruyu yapıyoruz.
  startForgeTest(charId) {
    const eq = Forge.equippedSpecs();
    if (!eq.length) return;
    this.startRun(charId || 'ahmet');
    const names = eq.map(s => s.name).join(' · ');
    this.banner = { txt: 'ÖZEL YETENEK: ' + names, t: 0 };
  },

  xpNeeded(l) { return 8 + (l - 1) * 7 + Math.max(0, l - 8) * 6; },

  displayScore() {
    // fazla mesaiye ulaşmak bonus verir; kazanma yok, oyun sonsuz
    return this.score + Math.floor(this.time * 8) + (this.level - 1) * 120 + (this.time >= WIN_TIME ? 2500 : 0);
  },

  // fazla mesaide skor çarpanı: her 15 dakikada +1x
  scoreMul() {
    return (1 + Math.floor(this.time / WIN_TIME)) * (this.shiftFx ? this.shiftFx.reward : 1);
  },

  // ── güncelleme ──
  update(dt) {
    if (this.freeze > 0) {
      // vuruş donması sırasında basılan yetenek/duraklat yutulmasın
      if (Input.pressed['Space'] || Input.pressed['KeyE']) this.pendSkill = true;
      if (Input.pressed['Escape']) this.pendPause = true;
      this.freeze -= dt;
      return;
    }
    if (this.pendSkill) { this.pendSkill = false; Input.pressed['Space'] = true; }
    if (this.pendPause) { this.pendPause = false; Input.pressed['Escape'] = true; }

    switch (this.state) {
      case 'play': this.updatePlay(dt); break;
      case 'levelup': UI.updateLevelUp(); break;
      case 'chest': this.updateChest(dt); break;
      case 'pause': UI.updatePause(); break;
      case 'over': UI.updateOver(); break;
      case 'title': UI.updateTitle(dt); break;
      case 'select': UI.updateSelect(); break;
      case 'scores': UI.updateScores(); break;
      case 'shop': UI.updateShop(); break;
      case 'album': UI.updateAlbum(); break;
      case 'daily': UI.updateDaily(); break;
      case 'forge': UI.updateForge(); break;
    }

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > 3) this.banner = null;
    }
    if (this.flashT > 0) this.flashT -= dt;
  },

  updatePlay(dt) {
    this.time += dt;
    if (Input.back()) { this.state = 'pause'; this.menuIdx = 0; Sfx.play('click'); return; }
    if (Input.pressed['KeyM']) Sfx.setMute(!Sfx.muted);

    // NaN bekçisi: konum/kamera bozulursa (rotasyon/tam ekran anındaki giriş
    // hataları) her şey "kaybolmuş" görünür — anında toparla
    const p0 = this.player;
    if (!isFinite(p0.x) || !isFinite(p0.y)) { p0.x = isFinite(this.camX) ? this.camX : 0; p0.y = isFinite(this.camY) ? this.camY : 0; }
    if (!isFinite(this.camX) || !isFinite(this.camY)) { this.camX = p0.x; this.camY = p0.y; }

    updatePlayer(dt);
    fireWeapons(dt);
    updateWeaponEntities(dt);
    updateEnemies(dt);
    updatePickups(dt);
    updateHazards(dt);
    sweepDead();   // bu karede ölenler tek seferde temizlenir (splice-atlama düzeltmesi)
    updateFx(dt);
    this.director(dt);
    Missions.update(dt);
    Achievements.update();

    // ağır çekim yeteneği sayacı
    if (this.slowT > 0) this.slowT -= dt;

    // VARDİYA RAPORU: her 5 dakikada bir ilerleme özeti + küçük bonus
    if (this.time >= this.reportT) {
      const dk = Math.round(this.reportT / 60);
      const dKill = this.kills - (this.repKills || 0);
      const dCoin = this.coins - (this.repCoins || 0);
      this.repKills = this.kills; this.repCoins = this.coins;
      this.report = { t: 0, dk, kills: dKill, coins: dCoin, combo: this.comboBest };
      this.score += 100 * (dk / 5);
      this.reportT += 300;
      Sfx.play('mission');
    }
    if (this.report) {
      this.report.t += dt;
      if (this.report.t > 4) this.report = null;
    }

    // ── HİKÂYE: karakter konuşmaları + depo anonsları ──
    if (this.speech) {
      this.speech.t += dt;
      if (this.speech.t > 2.8) this.speech = null;
    }
    if (this.introSayT > 0) {
      this.introSayT -= dt;
      if (this.introSayT <= 0) Story.sayFrom('start');
    }
    if (this.time >= this.sayMilestone) {
      this.sayMilestone += 300;
      if (!this.speech) Story.sayFrom('mid');
    }
    const pl = this.player;
    if (pl.hp > 0 && pl.hp < pl.maxHp * 0.25 && this.time - this.lowSayT > 30) {
      this.lowSayT = this.time;
      Story.sayFrom('low');
    }
    // hoparlör anonsu: 75-100 sn'de bir mizah/hikâye kırıntısı
    this.anonsT -= dt;
    if (this.anonsT <= 0) {
      this.anonsT = rand(75, 100);
      this.anons = { txt: 'ANONS: ' + Story.nextAnnouncement(), t: 0 };
      Sfx.play('click');
    }
    if (this.anons) {
      this.anons.t += dt;
      if (this.anons.t > 5) this.anons = null;
    }

    // sahte hedef (decoy): süre bitince patlar
    if (this.decoy) {
      const d = this.decoy;
      d.t += dt;
      if (d.t >= d.dur) {
        this.shocks.push({ x: d.x, y: d.y - 4, r: d.r, t: 0, col: COL.orange });
        this.shake = Math.max(this.shake, 4);
        for (const e of this.enemies) {
          if (dist2(d.x, d.y, e.x, e.y) < d.r * d.r) {
            const a = Math.atan2(e.y - d.y, e.x - d.x);
            damageEnemy(e, d.dmg, Math.cos(a) * 220, Math.sin(a) * 220);
          }
        }
        for (let i = 0; i < 18; i++) {
          addPart({ x: d.x, y: d.y - 6, vx: rand(-100, 100), vy: rand(-120, 10), dur: 0.5,
            type: 'px', col: pick([COL.orange, COL.yellow, COL.white]), size: 2 });
        }
        Sfx.play('bomb');
        this.decoy = null;
      }
    }

    // başarım toast'ı: kuyruktan sırayla, 3'er saniye altın bildirim
    if (this.achToast) {
      this.achToast.t += dt;
      if (this.achToast.t > 3) this.achToast = null;
    }
    if (!this.achToast && this.achQueue.length) {
      this.achToast = { a: this.achQueue.shift(), t: 0 };
      Sfx.play('evolve');
      this.flashT = Math.max(this.flashT, 0.2); this.flashCol = '254,174,52';
    }

    // boss giriş sineması sayacı
    if (this.bossIntro) {
      this.bossIntro.t += dt;
      if (this.bossIntro.t > 2.2) this.bossIntro = null;
    }

    // boss ödülü: ölüm şovu bitince büyük koli kendiliğinden açılır (kuyruklu)
    if (this.bossChestT > 0) {
      this.bossChestT -= dt;
      if (this.bossChestT <= 0) {
        if (--this.bossChestQ > 0) this.bossChestT = 0.6;   // sıradaki boss ödülü
        this.banner = { txt: 'BOSS ÖDÜLÜ: BÜYÜK KARGO!', t: 0 };
        this.openChest(true);
        return;
      }
    }

    // bölge takibi: yeni bölgeye girince ismi duyur
    const zid = zoneAt(Math.floor(this.player.x / 16), Math.floor(this.player.y / 16));
    if (zid !== this.curZone) {
      this.curZone = zid;
      if (this.time > 2 && !this.banner) {
        this.banner = { txt: '— ' + ZONE_DEFS[zid].name + ' —', t: 0.8 };
      }
      // SIR: ofise ilk girişte bazen altın gizli kasa belirir
      if (zid === 'ofis' && !this.gizliDone && Math.random() < 0.35) {
        this.gizliDone = true;
        const a = rand(TAU);
        const gk = spawnEnemy('kasa', this.player.x + Math.cos(a) * 90, this.player.y + Math.sin(a) * 90);
        gk.gizli = true;
        addFloat(gk.x, gk.y - 14, '???', COL.gold, true);
      }
    }

    // SIR: robot süpürgeye dokunma sayacı (gizli başarım)
    if (this.roombaCd > 0) this.roombaCd -= dt;
    for (const am of this.ambients) {
      if (this.roombaCd > 0) break;
      if (dist2(this.player.x, this.player.y, am.x, am.y) < 13 * 13) {
        this.roombaCd = 2;
        Achievements.event('roomba');
        addFloat(am.x, am.y - 12, 'BİP!', COL.teal);
        Sfx.play('click');
        break;
      }
    }

    // ambiyans: robot süpürge sahneden geçer
    this.roombaT -= dt;
    if (this.roombaT <= 0 && this.ambients.length < 3) {
      this.roombaT = rand(14, 26);
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.ambients.push({ x: this.player.x - dir * 300, y: this.player.y + rand(-110, 110),
        dir, spd: rand(22, 38), t: 0, wob: rand(TAU) });
    }
    // ambiyans: tavandan kıvılcım yağmuru
    this.sparkT -= dt;
    if (this.sparkT <= 0) {
      this.sparkT = rand(8, 16);
      const wx = this.player.x + rand(-190, 190), wy = this.player.y + rand(-110, 110);
      for (let i = 0; i < 6; i++) {
        addPart({ x: wx + rand(-3, 3), y: wy - 60 - rand(0, 20), vx: rand(-12, 12), vy: rand(40, 90),
          dur: rand(0.4, 0.7), type: 'spark', col: pick([COL.yellow, COL.white, COL.gold]) });
      }
    }

    // kombo penceresi
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    // çip toplama serisi penceresi
    if (this.pickStreakT > 0) {
      this.pickStreakT -= dt;
      if (this.pickStreakT <= 0) this.pickStreak = 0;
    }
    // müzik yoğunluğu: boss veya akın yaklaşınca tempo artar
    Sfx.intensity = (this.bossAlive || this.hordeT < 6 || this.enemies.length > 110) ? 1 : 0;

    // kamera
    const k = 1 - Math.exp(-8 * dt);
    this.camX += (this.player.x - this.camX) * k;
    this.camY += (this.player.y - this.camY) * k;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 24 * dt);
    // kamera tepmesi (vuruş darbesi)
    const kd = Math.exp(-10 * dt);
    this.kickX *= kd; this.kickY *= kd;

    // fazla mesai! (kazanma yok, oyun sonsuz devam eder)
    if (this.time >= WIN_TIME && !this.overtime) {
      this.overtime = true;
      // vardiya tamamlandı: kalıcı kayıt + bir üst vardiyanın kilidi
      const sk = 'shift_' + this.player.charId + '_' + this.shiftN;
      if (!Achievements.stats[sk]) Achievements.stats[sk] = 1;
      if ((Achievements.stats.shiftMax || 1) < this.shiftN + 1) Achievements.stats.shiftMax = Math.min(5, this.shiftN + 1);
      Achievements.event('shift' + this.shiftN);
      Achievements.save();
      this.banner = { txt: 'PAYDOS YOK! FAZLA MESAİ BAŞLADI: x2 SKOR!', t: 0 };
      const p = this.player;
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3));
      this.flashT = 0.3; this.flashCol = '254,231,97';
      Sfx.play('win');
    }
  },

  // ── dalga yönetmeni ──
  director(dt) {
    const t = this.time;
    const cap = t > 1200 ? 220 : (t > 420 ? 180 : 140);

    // sürekli akış: akın sonrası kısa nefes molası, son dakikada çılgınlık
    // 5. dakikadan sonra temposu ekstra artar (hız itemleri rahatlatmasın)
    if (this.lullT > 0) this.lullT -= dt;
    let rate = (1.1 + t * 0.011 + Math.max(0, (t - 300) * 0.0035)) * (this.lullT > 0 ? 0.45 : 1);
    if (this.shiftFx) rate *= this.shiftFx.rate;
    if (t > WIN_TIME - 50) rate *= 2.2;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length < cap) this.spawnOne();
    }

    // kırılabilir kasa/variller: sahada her zaman birkaç tane olsun
    this.crateT -= dt;
    if (this.crateT <= 0) {
      this.crateT = this.dailyFx && this.dailyFx.crate ? 5 : 14;
      let crates = 0;
      for (const e of this.enemies) if (e.type.breakable) crates++;
      if (crates < 5) {
        const a = rand(TAU), r = rand(120, 240);
        spawnEnemy(Math.random() < 0.6 ? 'kasa' : 'varil',
          this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r);
      }
    }

    // kuşatma çemberi (5. dakikadan sonra): oyuncuyu daireyle sıkıştırır
    if (t > 300) {
      this.ringT -= dt;
      if (this.ringT <= 0) {
        this.ringT = 42;
        const n = 12 + Math.floor(t / 90);
        if (!this.banner) this.banner = { txt: 'KUŞATILIYORSUN!', t: 0 };
        Sfx.play('akin');
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rand(0.25);
          const id = i % 6 === 0 ? 'kuponcu' : (i % 4 === 0 ? 'kararsiz' : 'aceleci');
          spawnEnemy(id, this.player.x + Math.cos(a) * 235, this.player.y + Math.sin(a) * 235,
            this.tierRoll(id));
        }
      }
    }

    // akın uyarısı: son 5 saniyede tik tak
    if (this.hordeT < 5 && this.hordeT > 0) {
      const sec = Math.ceil(this.hordeT);
      if (sec !== this.tickN) { this.tickN = sec; Sfx.play('tick'); }
    }

    // elit müşteri (koli taşıyıcısı)
    this.eliteT -= dt;
    if (this.eliteT <= 0) {
      this.eliteT = this.dailyFx && this.dailyFx.elite ? 45 : (this.player.charId === 'berker' ? 60 : 75);
      this.spawnAt('kizgin');
      this.banner = { txt: 'KIZGIN MÜŞTERİ GELDİ!', t: 0 };
      Sfx.play('akin');
    }

    // akın dalgası: her seferinde farklı desen
    this.hordeT -= dt;
    if (this.hordeT <= 0) {
      this.hordeT = 90;
      this.lullT = 14;   // akından sonra nefes alma anı
      Sfx.play('akin');
      const n = 14 + Math.floor(t / 60) * 2;
      const p = this.player;
      const pat = this.hordeN++ % 3;
      if (pat === 0) {
        // çember kuşatması
        this.banner = { txt: 'MÜŞTERİ AKINI!', t: 0 };
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          spawnEnemy('aceleci', p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 260,
            this.tierRoll('aceleci'));
        }
      } else if (pat === 1) {
        // duvar: tek taraftan hat
        this.banner = { txt: 'OTOBÜS DOLUSU MÜŞTERİ GELDİ!', t: 0 };
        const dir = Math.random() < 0.5 ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const id = i % 4 === 0 ? 'kuponcu' : 'aceleci';
          spawnEnemy(id, p.x + dir * (270 + rand(40)), p.y + (i - n / 2) * 22, this.tierRoll(id));
        }
      } else {
        // kıskaç: iki karşı köşe
        this.banner = { txt: 'İKİ KAPIDAN BİRDEN GELİYORLAR!', t: 0 };
        for (let i = 0; i < n; i++) {
          const side = i % 2 ? 1 : -1;
          const a = rand(TAU / 6) - TAU / 12 + (side > 0 ? 0 : Math.PI);
          const id = i % 5 === 0 ? 'kararsiz' : 'aceleci';
          spawnEnemy(id, p.x + Math.cos(a) * 270, p.y + Math.sin(a) * 270, this.tierRoll(id));
        }
      }
    }

    // boss takvimi (ilk üç sabit)
    if (this.bossIdx < BOSS_SCHEDULE.length && t >= BOSS_SCHEDULE[this.bossIdx].t) {
      const b = BOSS_SCHEDULE[this.bossIdx++];
      const boss = this.spawnAt(b.id);
      this.bossAlive = true;
      this.banner = { txt: b.banner, t: 0 };
      this.bossIntro = { t: 0, name: ENEMY_TYPES[b.id].name, line: ENEMY_TYPES[b.id].line };
      this.shocks.push({ x: boss.x, y: boss.y - 8, r: 70, t: 0, col: COL.purple });
      Sfx.play('boss');
      this.shake = Math.max(this.shake, 4);
    }
    // fazla mesai boss döngüsü: sırayla, her turda daha da güçlenerek dönerler.
    // Her 2. boss NEMESIS: oyuncunun build'ini okuyup counter'ını yollar.
    if (t >= this.nextBossT) {
      const lapNow = Math.ceil((this.bossCycleIdx + 1) / BOSS_POOL.length);
      // aralık her turda kısalır: 150 → 90 sn
      this.nextBossT = t + Math.max(90, BOSS_CYCLE_GAP - (lapNow - 1) * 15);
      let id, nemesis = false;
      if (this.bossCycleIdx % 2 === 1 && t >= 720) {
        id = COUNTER_BY_PROFILE[this.buildProfile()] || BOSS_POOL[this.bossCycleIdx % BOSS_POOL.length];
        nemesis = true;
      } else {
        id = BOSS_POOL[this.bossCycleIdx % BOSS_POOL.length];
      }
      this.bossCycleIdx++;
      const boss = this.spawnAt(id);
      const lap = Math.ceil(this.bossCycleIdx / BOSS_POOL.length);
      boss.hp = boss.maxHp = Math.round(boss.hp * (1 + 0.25 * lap));
      boss.lap = lap;   // kan parası: ölünce tur başına bonus para
      this.bossAlive = true;
      // tur ilerledikçe unvan: KIDEMLİ (2+) / EFSANE (4+)
      const title = (lap >= 4 ? 'EFSANE ' : lap >= 2 ? 'KIDEMLİ ' : '') + ENEMY_TYPES[id].name;
      this.banner = nemesis
        ? { txt: 'DEPO SENİ İZLİYOR: ' + title + ' GELDİ!', t: 0 }
        : { txt: title + ' GERİ DÖNDÜ! DAHA DA ÖFKELİ!', t: 0 };
      this.bossIntro = { t: 0, name: title, line: ENEMY_TYPES[id].line };
      this.shocks.push({ x: boss.x, y: boss.y - 8, r: 70, t: 0, col: nemesis ? COL.red : COL.purple });
      Sfx.play('boss');
      this.shake = Math.max(this.shake, 4);
    }
  },

  // Oyuncunun build profili: counter boss seçimi için okunur
  buildProfile() {
    const p = this.player;
    let melee = 0, ranged = 0;
    for (const w of p.weapons) {
      const k = WEAPONS[w.id].kind;
      if (k === 'pulse' || k === 'cone' || k === 'orbit') melee++;
      else if (k === 'proj' || k === 'homing' || k === 'thrown' || k === 'car') ranged++;
    }
    if (p.spd >= 80) return 'mobile';           // hız yığmış kaçak build
    if (melee > ranged) return 'melee';
    if (ranged > melee) return 'ranged';
    return pick(['melee', 'ranged', 'mobile']);
  },

  spawnOne() {
    const t = this.time;
    const pool = [];
    for (const id in ENEMY_TYPES) {
      const d = ENEMY_TYPES[id];
      if (d.elite || d.boss || !d.weight) continue;
      let w2 = d.weight;
      if (id === 'kurye' && this.dailyFx) w2 *= this.dailyFx.kuryeW;
      if (t >= d.minTime) pool.push({ id, w: w2 });
    }
    let total = 0;
    for (const o of pool) total += o.w;
    let r = this.dRand(total);
    for (const o of pool) {
      r -= o.w;
      if (r <= 0) { this.spawnAt(o.id); return; }
    }
  },

  // Kademe zarı: süre ilerledikçe KIDEMLİ (T2) ve EFSANE (T3) müşteriler karışır.
  // 9. dakikadan sonra T2, 19. dakikadan sonra T3 gelmeye başlar — sonsuz tırmanış.
  tierRoll(typeId) {
    const d = ENEMY_TYPES[typeId];
    if (d.boss || d.elite || d.breakable) return 1;
    const t = this.time;
    if (Math.random() >= clamp((t - 540) / 500, 0, 0.8)) return 1;
    const tier = Math.random() < clamp((t - 1140) / 600, 0, 0.7) ? 3 : 2;
    if (tier === 2 && !this.t2Seen) {
      this.t2Seen = true;
      this.banner = { txt: 'KIDEMLİ MÜŞTERİLER GELDİ! (ALTIN ÜNİFORMA)', t: 0 };
      Sfx.play('akin');
    } else if (tier === 3 && !this.t3Seen) {
      this.t3Seen = true;
      this.banner = { txt: 'EFSANE MÜŞTERİLER SAHADA! ÇOK DİKKAT!', t: 0 };
      Sfx.play('boss');
    }
    return tier;
  },

  spawnAt(typeId) {
    const a = rand(TAU);
    const r = 280 + rand(40);
    return spawnEnemy(typeId, this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r,
      this.tierRoll(typeId));
  },

  // ── seviye atlama ──
  checkLevelUp() {
    if (this.xp >= this.xpNeeded(this.level)) {
      this.xp -= this.xpNeeded(this.level);
      this.level++;
      const p = this.player;
      // nova patlaması: seviye gücü hissedilsin
      Game.shocks.push({ x: p.x, y: p.y - 6, r: 70, t: 0, col: COL.teal });
      for (const e of this.enemies) {
        if (e.spawnT > 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) < 70 * 70) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          damageEnemy(e, 5 + this.level, Math.cos(a) * 240, Math.sin(a) * 240, true);
        }
      }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        addPart({ x: p.x + Math.cos(a) * 10, y: p.y - 8 + Math.sin(a) * 6,
          vx: Math.cos(a) * 70, vy: Math.sin(a) * 40 - 20, dur: 0.5, type: 'spark', col: COL.teal });
      }
      // gökten inen ışık huzmesi
      this.beams.push({ x: p.x, y: p.y, t: 0 });
      // küçük iyileşme + kalıcı güç artışı (recalcStats seviyeyi okur)
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.06));
      recalcStats(p);
      this.flashT = 0.25; this.flashCol = '44,232,245';
      this.shake = Math.max(this.shake, 2);
      this.levelOptions = this.genOptions();
      this.levelIdx = 0;
      this.state = 'levelup';
      Sfx.play('levelup'); Sfx.play('nova');
    }
  },

  genOptions() {
    const p = this.player;
    const pool = [];
    // sahip olunan silahların yükseltmeleri
    for (const w of p.weapons) {
      if (w.lvl >= WEAPON_MAX_LVL) continue;
      const d = WEAPONS[w.id];
      pool.push({ kind: 'weapon', id: w.id, name: d.name, desc: d.lvlDesc,
        lvl: w.lvl + 1, weight: 3 });
    }
    // aktif yetenek yükseltmesi
    if (p.skill.lvl < SKILL_MAX_LVL) {
      const sd = SKILLS[p.skill.id];
      pool.push({ kind: 'skill', id: sd.icon, name: sd.name, desc: sd.lvlDesc,
        lvl: p.skill.lvl + 1, weight: 2 });
    }
    // boş slot varsa yeni silahlar (dükkândan açılmamış olanlar çıkmaz)
    if (p.weapons.length < MAX_WEAPONS) {
      const owned = new Set(p.weapons.map(w => w.id));
      const unowned = Object.keys(WEAPONS).filter(id => !owned.has(id) && Meta.weaponUnlocked(id));
      // her seferinde en fazla 2 farklı yeni silah teklif edilir
      for (let i = 0; i < 2 && unowned.length; i++) {
        const id = unowned.splice((Math.random() * unowned.length) | 0, 1)[0];
        const d = WEAPONS[id];
        pool.push({ kind: 'newweapon', id, name: d.name, desc: d.desc, lvl: 1, weight: 2 });
      }
    }
    for (const id in ITEMS) {
      const it = ITEMS[id];
      const cur = p.items[id] || 0;
      if (it.heal) {
        if (p.hp < p.maxHp * 0.7) pool.push({ kind: 'item', id, name: it.name, desc: it.desc, lvl: 0, weight: 1 });
        continue;
      }
      if (cur < it.max) {
        // evrim ipucu: bu item, sahip olunan bir silahın evrim anahtarıysa söyle
        let evo = null;
        for (const w of p.weapons) {
          const ev = EVOLUTIONS[w.id];
          if (ev && !w.evolved && ev.need === id) { evo = ev.name; break; }
        }
        pool.push({ kind: 'item', id, name: it.name, desc: it.desc, lvl: cur + 1, weight: evo ? 1.4 : 1, evo });
      }
    }
    // SONSUZ STAT KARTLARI: havuz asla boşalmaz, geç oyunda da gelişirsin
    // (rakipler sonsuza kadar güçlendiği için sen de sonsuza kadar güçlenmelisin)
    const b = p.bonus;
    pool.push({ kind: 'stat', id: 'st_hp',    icon: 'enerji',   name: 'ÇELİK VÜCUT',  desc: '+%6 maks can (sınırsız)',  lvl: b.hp + 1,    weight: 0.6 });
    pool.push({ kind: 'stat', id: 'st_dmg',   icon: 'robotkol', name: 'KESKİN BİLEK', desc: '+%5 hasar (sınırsız)',     lvl: b.dmg + 1,   weight: 0.6 });
    pool.push({ kind: 'stat', id: 'st_armor', icon: 'sigorta',  name: 'KALIN DERİ',   desc: '+1 zırh (sınırsız)',       lvl: b.armor + 1, weight: 0.5 });
    pool.push({ kind: 'stat', id: 'st_spd',   icon: 'kahve',    name: 'SERİ ADIM',    desc: '+%3 hız (sınırsız)',       lvl: b.spd + 1,   weight: 0.5 });
    pool.push({ kind: 'stat', id: 'st_greed', icon: 'prim',     name: 'ŞANS PARASI',  desc: '+%8 para/skor (sınırsız)', lvl: b.greed + 1, weight: 0.4 });
    // YETENEK DEĞİŞTİRME: açık başka varyantın varsa koşu ortasında geçiş yap
    const others = (TECHS[p.charId].skills || []).filter(sid =>
      sid !== p.skill.id && Meta.techUnlocked(p.charId, 'skills', sid));
    if (others.length && p.skill.lvl >= 2) {
      const sid = pick(others);
      pool.push({ kind: 'skillswap', id: sid, name: 'YETENEK DEĞİŞ: ' + SKILLS[sid].name,
        desc: SKILLS[sid].desc, lvl: p.skill.lvl, weight: 0.5 });
    }
    // yasaklananlar havuzdan düşer (YASAKLA hakkı)
    const banned = this.banished || {};
    for (let i = pool.length - 1; i >= 0; i--) {
      if (banned[pool[i].kind + ':' + pool[i].id]) pool.splice(i, 1);
    }
    // ağırlıklı, tekrarsız 3 seçim
    const opts = [];
    const copy = pool.slice();
    while (opts.length < 3 && copy.length) {
      let total = 0;
      for (const o of copy) total += o.weight;
      let r = rand(total);
      for (let i = 0; i < copy.length; i++) {
        r -= copy[i].weight;
        if (r <= 0) { opts.push(copy.splice(i, 1)[0]); break; }
      }
    }
    return opts;
  },

  applyOption(o) {
    const p = this.player;
    if (o.kind === 'weapon') {
      const w = p.weapons.find(w => w.id === o.id);
      if (w) w.lvl++;
    } else if (o.kind === 'newweapon') {
      p.weapons.push(makeWeapon(o.id));
    } else if (o.kind === 'skill') {
      p.skill.lvl++;
    } else if (o.kind === 'skillswap') {
      // koşu ortasında yetenek değiştir (seviye korunur)
      p.skill.id = o.id;
      p.skill.cd = Math.min(p.skill.cd, 3);
      this.banner = { txt: 'YENİ YETENEK: ' + SKILLS[o.id].name + '!', t: 0 };
    } else if (o.kind === 'stat') {
      // sonsuz stat kartı: kalıcı koşu-içi bonus
      const b = p.bonus;
      if (o.id === 'st_hp') {
        b.hp++;
        const add = Math.round(p.maxHp * 0.06);
        p.maxHp += add; p.hp += add;
      }
      else if (o.id === 'st_dmg') b.dmg++;
      else if (o.id === 'st_armor') b.armor++;
      else if (o.id === 'st_spd') b.spd++;
      else b.greed++;
      recalcStats(p);
    } else if (ITEMS[o.id].heal) {
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4));
    } else {
      p.items[o.id] = (p.items[o.id] || 0) + 1;
      recalcStats(p);
    }
    Sfx.play('select');
    this.state = 'play';
    this.checkLevelUp(); // zincirleme seviye varsa devam
  },

  // Evrim koşulu sağlayan ilk silah (SV6 + eşleşen item)
  evolvableWeapon() {
    const p = this.player;
    return p.weapons.find(w => {
      const ev = EVOLUTIONS[w.id];
      return ev && !w.evolved && w.lvl >= WEAPON_MAX_LVL && (p.items[ev.need] || 0) >= ev.needLvl;
    }) || null;
  },

  // ── kargo kolisi (sandık) ── bossReward: boss ödülü, garantili büyük koli
  openChest(bossReward) {
    const p = this.player;

    // önce evrim kontrolü: koşullar sağlanıyorsa koli evrim getirir
    const evoW = this.evolvableWeapon();
    if (evoW) {
      const ev = EVOLUTIONS[evoW.id];
      evoW.evolved = true;
      Achievements.event('evolutions');
      this.coins += bossReward ? 15 : 5;
      this.score += Math.round(400 * p.greed);
      this.chestAnim = { t: 0, rewards: [{ name: ev.name, icon: evoW.id, evolve: true, desc: ev.desc }], evolve: true };
      this.state = 'chest';
      this.banner = { txt: 'SİLAH EVRİMLEŞTİ: ' + ev.name + '!', t: 0 };
      Sfx.play('evolve');
      return;
    }

    const roll = Math.random();
    let count = roll < 0.65 ? 1 : (roll < 0.93 ? 3 : 5);
    if (bossReward) count = Math.max(3, count);
    if (p.charId === 'berker') count++;
    const rewards = [];
    for (let i = 0; i < count; i++) {
      const opts = this.genOptions();
      if (!opts.length) { this.coins += 2; this.score += 60; rewards.push({ name: 'PARA DESTESİ', icon: 'prim' }); continue; }
      const o = opts[0];
      if (o.kind === 'weapon') {
        const w = p.weapons.find(w => w.id === o.id);
        w.lvl++;
        rewards.push({ name: o.name + ' SV' + w.lvl, icon: o.id });
      } else if (o.kind === 'newweapon') {
        p.weapons.push(makeWeapon(o.id));
        rewards.push({ name: o.name + ' (YENİ!)', icon: o.id });
      } else if (o.kind === 'skill') {
        p.skill.lvl++;
        rewards.push({ name: o.name + ' SV' + p.skill.lvl, icon: o.id });
      } else if (o.kind === 'stat') {
        const b = p.bonus;
        if (o.id === 'st_hp') { b.hp++; const add = Math.round(p.maxHp * 0.06); p.maxHp += add; p.hp += add; }
        else if (o.id === 'st_dmg') b.dmg++;
        else if (o.id === 'st_armor') b.armor++;
        else if (o.id === 'st_spd') b.spd++;
        else b.greed++;
        recalcStats(p);
        rewards.push({ name: o.name + ' SV' + o.lvl, icon: o.icon });
      } else if (o.kind === 'skillswap') {
        p.skill.id = o.id;
        p.skill.cd = Math.min(p.skill.cd, 3);
        rewards.push({ name: 'YENİ YETENEK: ' + SKILLS[o.id].name, icon: SKILLS[o.id].icon });
      } else if (ITEMS[o.id].heal) {
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4));
        rewards.push({ name: o.name, icon: o.id });
      } else {
        p.items[o.id] = (p.items[o.id] || 0) + 1;
        recalcStats(p);
        rewards.push({ name: o.name + ' SV' + p.items[o.id], icon: o.id });
      }
    }
    this.coins += (bossReward ? 13 : 3) + Meta.lvl('kolipara') * 2;
    this.score += Math.round((bossReward ? 400 : 150) * p.greed);
    this.chestAnim = { t: 0, rewards, boss: !!bossReward };
    this.state = 'chest';
    Achievements.event('chests');
    Sfx.play('chest');
  },

  updateChest(dt) {
    const a = this.chestAnim;
    a.t += dt;
    if (a.t > 1.1 && !a.burst) {
      a.burst = true;
      for (let i = 0; i < 24; i++) {
        addPart({ x: this.player.x, y: this.player.y - 10, vx: rand(-90, 90), vy: rand(-130, -30),
          dur: 0.8, type: 'px', col: pick([COL.yellow, COL.gold, COL.teal, COL.red, COL.white]), size: 2 });
      }
    }
    updateFx(dt);
    if (a.t > 1.2 && (Input.confirm() || Input.mouse.clicked || a.t > 4.5)) {
      this.chestAnim = null;
      this.state = 'play';
      this.checkLevelUp();
    }
  },

  // ── oyun sonu ──
  bankCoins() {
    if (this.banked) return;
    this.banked = true;
    Meta.deposit(this.coins);
    // koşu istatistikleri kalıcı sayaçlara işlenir
    Achievements.event('runs');
    if (this.daily) Achievements.event('daily');
    Achievements.event('time', Math.floor(this.time));
    Achievements.save();
  },

  gameOver() {
    this.state = 'over';
    this.won = false;
    this.overT = this.uiT;   // ölüm anındaki dokunuşlar ekranı kapatmasın
    this.nameInput = this.player.def.name;
    this.bankCoins();
    Sfx.play('over');
    this.shake = 6;
  },

  saveScore() {
    const entry = {
      name: this.nameInput.trim() || this.player.def.name,
      charId: this.player.charId,
      score: this.displayScore(),
      time: Math.floor(this.time),
      kills: this.kills,
      level: this.level,
      date: new Date().toISOString().slice(0, 10)
    };
    // Günün Vardiyası skoru ayrı (günlük) tabloya gider
    if (this.daily) entry.day = dailyKey();
    // her durumda yerel kopya tut (internet yoksa skor kaybolmasın)
    this.saveLocal(entry);
    this.state = 'scores';
    UI.scoresTab = this.daily ? 1 : 0;
    this.scoresT = this.uiT;   // kayıt sonrası yanlışlıkla anında kapanmasın
    if (!SCORES_REMOTE) { this.scoresState = 'ok'; return; }
    // buluta gönder: dönüşte ortak tabloyu ve sıramızı al
    this.scoresState = 'saving';
    fetch(SCORES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    })
      .then(r => r.json())
      .then(d => {
        if (!d || !d.list) throw new Error('gecersiz yanit');
        this.remoteScores = d.list;
        this.savedRank = (d.rank != null ? d.rank : -1);
        this.scoresState = 'ok';
      })
      .catch(() => { this.scoresState = 'error'; });   // yerel kopya zaten kayıtlı
  },

  // yerel yedek tablo (localStorage) — çevrimdışı ya da API hatasında devreye girer
  saveLocal(entry) {
    let list = this.localScores();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, 20);
    this.savedRank = list.indexOf(entry);
    try { localStorage.setItem('rs_scores', JSON.stringify(list)); } catch (e) {}
  },

  localScores() {
    try { return JSON.parse(localStorage.getItem('rs_scores') || '[]'); } catch (e) { return []; }
  },

  // ortak tabloyu buluttan çek (skor ekranına girerken çağrılır)
  // daily=true: bugünün vardiyası tablosu (rs_daily_<gün>)
  fetchScores(daily) {
    this.savedRank = -1;
    if (!SCORES_REMOTE) { this.remoteScores = this.localScores(); this.scoresState = 'ok'; return; }
    this.scoresState = 'loading';
    fetch(SCORES_API + (daily ? '?day=' + dailyKey() : ''))
      .then(r => r.json())
      .then(d => {
        if (!d || !d.list) throw new Error('gecersiz yanit');
        this.remoteScores = d.list;
        this.scoresState = 'ok';
      })
      .catch(() => { this.scoresState = 'error'; });
  },

  loadScores() {
    if (this.remoteScores) return this.remoteScores;
    return this.localScores();
  },

  // ── çizim ──
  draw(ctx) {
    ctx.fillStyle = COL.outline;
    ctx.fillRect(0, 0, 480, 270);

    if (this.state === 'title') { UI.drawTitle(ctx); return; }
    if (this.state === 'select') { UI.drawSelect(ctx); return; }
    if (this.state === 'scores') { UI.drawScores(ctx); return; }
    if (this.state === 'shop') { UI.drawShop(ctx); return; }
    if (this.state === 'album') { UI.drawAlbum(ctx); return; }
    if (this.state === 'daily') { UI.drawDaily(ctx); return; }
    if (this.state === 'forge') { UI.drawForge(ctx); return; }

    // oyun sahnesi (play, levelup, chest, pause, over)
    this.camRX = this.camX + (this.shake > 0 ? rand(-this.shake, this.shake) : 0) + this.kickX;
    this.camRY = this.camY + (this.shake > 0 ? rand(-this.shake, this.shake) : 0) + this.kickY;
    World.drawFloor(ctx, this.camRX, this.camRY, this.time);
    World.drawProps(ctx, this.camRX, this.camRY);
    drawPlayField(ctx);

    // vardiya ilerledikçe ışık değişir: akşam turuncusu → gece mavisi
    const k = clamp(this.time / WIN_TIME, 0, 1);
    const evening = Math.sin(clamp((k - 0.25) / 0.5, 0, 1) * Math.PI); // 4-11 dk arası tepe yapar
    if (evening > 0.01) {
      ctx.fillStyle = 'rgba(247,118,34,' + (evening * 0.07).toFixed(3) + ')';
      ctx.fillRect(0, 0, 480, 270);
    }
    const night = Math.max(0, (k - 0.55) / 0.45);
    if (night > 0.01) {
      ctx.fillStyle = 'rgba(18,28,80,' + (night * 0.22).toFixed(3) + ')';
      ctx.fillRect(0, 0, 480, 270);
    }

    // havada süzülen toz zerreleri (depo atmosferi)
    for (let i = 0; i < 16; i++) {
      const h = hash2(i, 7, 3);
      const mx = ((h * 480 + this.time * (4 + h * 7)) % 500) - 10;
      const my = ((hash2(i, 11, 5) * 270 + this.time * (2 + h * 4)) % 290) - 10;
      const a = 0.04 + 0.06 * Math.sin(this.time * (0.5 + h) + i * 2);
      if (a <= 0) continue;
      ctx.fillStyle = 'rgba(255,240,210,' + a.toFixed(3) + ')';
      ctx.fillRect(Math.round(mx), Math.round(my), i % 5 === 0 ? 2 : 1, 1);
    }

    // yetenek/seviye ekran flaşı
    if (this.flashT > 0) {
      ctx.fillStyle = 'rgba(' + this.flashCol + ',' + (this.flashT * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, 480, 270);
    }

    World.drawVignette(ctx);

    // düşük can uyarısı: kırmızı nabız
    const p = this.player;
    if (p && p.hp > 0 && p.hp < p.maxHp * 0.3 && this.state === 'play') {
      const pulse = 0.06 + Math.sin(this.time * 6) * 0.04;
      ctx.fillStyle = 'rgba(228,59,68,' + pulse.toFixed(3) + ')';
      ctx.fillRect(0, 0, 480, 270);
    }

    UI.drawHUD(ctx);

    // boss giriş sineması: letterbox bantları + dev isim
    if (this.bossIntro && this.state === 'play') {
      const t = this.bossIntro.t;
      const k = Math.min(1, t / 0.3, Math.max(0, (2.2 - t) / 0.4));
      const bh = Math.round(k * 24);
      ctx.fillStyle = COL.outline;
      ctx.fillRect(0, 0, 480, bh);
      ctx.fillRect(0, 270 - bh, 480, bh);
      if (k > 0.5) {
        const shakeX = t < 0.6 ? rand(-2, 2) : 0;
        drawText(ctx, this.bossIntro.name, 240 + shakeX, 116, COL.red,
          { align: 'center', scale: 3, shadow: COL.outline, alpha: Math.min(1, k) });
        drawText(ctx, 'GELDİ!', 240, 146, COL.yellow,
          { align: 'center', scale: 1, shadow: COL.outline, alpha: (0.6 + Math.sin(t * 10) * 0.4) * k });
        // boss repliği: kişilik tek satırda
        if (this.bossIntro.line && t > 0.7) {
          drawText(ctx, '"' + this.bossIntro.line + '"', 240, 160, COL.greyLight,
            { align: 'center', alpha: Math.min(1, (t - 0.7) / 0.3) * k });
        }
      }
    }

    if (this.state === 'levelup') UI.drawLevelUp(ctx);
    else if (this.state === 'chest') UI.drawChest(ctx);
    else if (this.state === 'pause') UI.drawPause(ctx);
    else if (this.state === 'over') UI.drawOver(ctx);
  }
};
