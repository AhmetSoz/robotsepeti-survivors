'use strict';
// ─── Koşu içi görevler: sürekli dönen mini hedefler ──────────
// Tamamlanan her görev ödül verir (koli / para / can) ve yenisi gelir.

const MISSION_DEFS = [
  { id: 'kill',   txt: 'MÜŞTERİ DEVİR',            base: 20, scale: 12, reward: 'chest' },
  { id: 'chips',  txt: 'ÇİP TOPLA',                base: 25, scale: 12, reward: 'coins' },
  { id: 'crates', txt: 'KASA/VARİL KIR',           base: 3,  scale: 1,  reward: 'heal' },
  { id: 'nodmg',  txt: 'SN HASAR ALMADAN DAYAN',   base: 25, scale: 5,  reward: 'coins', timer: true },
  { id: 'elite',  txt: 'KIZGIN MÜŞTERİ DEVİR',     base: 1,  scale: 0,  reward: 'chest' },
  { id: 'combo',  txt: 'KOMBO YAP',                base: 12, scale: 5,  reward: 'coins' }
];

const Missions = {
  cur: null,       // { def, target, prog }
  doneN: 0,        // tamamlanan görev sayısı (hedefleri büyütür)
  cooldown: 2,     // yeni görev gelmeden önceki bekleme
  lastId: '',

  reset() {
    this.cur = null;
    this.doneN = 0;
    this.cooldown = 4;
    this.lastId = '';
  },

  newMission() {
    let def = pick(MISSION_DEFS);
    // elit görevi ilk 1 dk gelmesin, aynı görev üst üste gelmesin
    for (let tries = 0; tries < 6; tries++) {
      if (def.id !== this.lastId && !(def.id === 'elite' && Game.time < 60)) break;
      def = pick(MISSION_DEFS);
    }
    this.lastId = def.id;
    this.cur = { def, target: def.base + def.scale * this.doneN, prog: 0 };
  },

  // olay bildirimleri: killEnemy / collectPickup / kombo çağırır
  event(type, n) {
    if (!this.cur || this.cur.def.id !== type) return;
    if (type === 'combo') {
      // kombo görevinde hedef "tek seferde X kombo"
      this.cur.prog = Math.max(this.cur.prog, n);
    } else {
      this.cur.prog += (n || 1);
    }
    if (this.cur.prog >= this.cur.target) this.complete();
  },

  update(dt) {
    if (!this.cur) {
      this.cooldown -= dt;
      if (this.cooldown <= 0) this.newMission();
      return;
    }
    if (this.cur.def.timer) {
      // hasarsız dayanma: son hasar anından beri geçen süre
      this.cur.prog = Math.min(this.cur.target, Game.time - Game.lastHurtT);
      if (this.cur.prog >= this.cur.target) this.complete();
    }
  },

  complete() {
    const p = Game.player;
    const r = this.cur.def.reward;
    if (r === 'chest') {
      addPickup('chest', p.x + rand(-20, 20), p.y + rand(-16, 16));
      Game.banner = { txt: 'GÖREV TAMAM! KARGO YOLDA!', t: 0 };
    } else if (r === 'coins') {
      const c = 6 + this.doneN * 2;
      Game.coins += c;
      Game.banner = { txt: 'GÖREV TAMAM! +' + c + ' PARA!', t: 0 };
      addFloat(p.x, p.y - 24, '+' + c + ' PARA', COL.gold, true);
    } else {
      const heal = Math.round(p.maxHp * 0.25);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      Game.banner = { txt: 'GÖREV TAMAM! +' + heal + ' CAN!', t: 0 };
      addFloat(p.x, p.y - 24, '+' + heal, COL.green, true);
    }
    Game.score += 200 + this.doneN * 50;
    this.doneN++;
    this.cur = null;
    this.cooldown = 8;
    Sfx.play('mission');
  },

  draw(ctx) {
    if (!this.cur) return;
    const m = this.cur;
    const prog = Math.min(m.prog, m.target);
    const txt = 'GÖREV: ' + Math.floor(prog) + '/' + m.target + ' ' + m.def.txt;
    drawText(ctx, txt, 8, 46, COL.greyLight, { shadow: COL.outline });
    // ilerleme çubuğu
    ctx.fillStyle = COL.navyDark; ctx.fillRect(8, 56, 90, 3);
    ctx.fillStyle = COL.gold; ctx.fillRect(8, 56, Math.round(90 * (prog / m.target)), 3);
  }
};
