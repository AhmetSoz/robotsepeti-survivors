'use strict';
// ─── Oyun varlıkları: oyuncu, silahlar, düşmanlar, efektler ───

let nextEntityId = 1;

// Evrimleşmiş silahların stat değişiklikleri
const EVO_MODS = {
  suplex: s => { s.radius *= 1.6; s.dmg *= 2; },
  car:    s => { s.cd *= 0.55; s.dmg *= 1.7; },
  wave:   s => { s.maxR *= 1.5; s.dmg *= 1.8; },
  burp:   s => { s.arc = TAU; s.range *= 1.3; s.dmg *= 1.8; },
  puff:   s => { s.radius *= 1.8; s.dps *= 1.8; s.dur *= 1.6; s.maxClouds = 1; },
  box:    s => { s.dmg *= 1.6; s.splash *= 1.5; }
};

function makeWeapon(id) {
  return { id, lvl: 1, cd: 0.5, echo: 0, evolved: false, angle: rand(TAU) };
}

// ── Oyuncu ──
function makePlayer(charId) {
  const def = CHARACTERS[charId];
  // dükkân yükseltmesi: kalıcı can bonusu
  const mhp = Math.round(def.hp * (1 + Meta.lvl('can') * 0.08));
  const p = {
    charId, def,
    x: 0, y: 0,
    hp: mhp, maxHp: mhp,
    facing: { x: 1, y: 0 },
    moving: false, flip: false,
    animT: 0, invuln: 0, hurtFlash: 0, dustT: 0,
    weapons: [makeWeapon(def.weapon)],
    items: {},          // itemId -> seviye
    droneAngle: 0,
    questionT: 3,       // Can pasifi sayacı
    // aktif yetenek + robot kol
    skill: { lvl: 1, cd: 4, wasReady: false },
    dashS: null, turboT: 0, turboHit: null, magnetBoostT: 0,
    shieldT: 0, turboPickT: 0, afterT: 0, lean: 0, turnT: 0,
    armT: 1, armAnim: null,
    // hesaplanan statlar
    spd: 64, armor: 0, cdr: 0, might: 1, magnetR: 26, crit: 0.05,
    greed: 1, xpGain: 1, dodge: 0, stunChance: 0, dmgTakenMul: 1
  };
  recalcStats(p);
  return p;
}

function recalcStats(p) {
  const d = p.def, it = p.items;
  const lv = id => it[id] || 0;
  p.spd = 64 * d.speed * (1 + lv('kahve') * 0.08) * (1 + Meta.lvl('hiz') * 0.03);
  p.armor = lv('sigorta');
  p.cdr = Math.min(0.5, lv('klavye') * 0.07);
  // her seviye kalıcı +%1.5 güç: koşu boyu hissedilir büyüme
  p.might = (1 + lv('robotkol') * 0.09) * (1 + (Game.level - 1) * 0.015) * (1 + Meta.lvl('guc') * 0.04);
  p.crit = 0.05 + lv('robotkol') * 0.04;
  p.magnetR = 26 * (1 + lv('miknatis') * 0.22) * (1 + Meta.lvl('cekim') * 0.15);
  p.greed = 1 + lv('prim') * 0.12;
  p.xpGain = 1; p.dodge = 0; p.stunChance = 0; p.dmgTakenMul = 1;
  // karaktere özgü pasifler
  if (p.charId === 'ahmet') { p.dmgTakenMul = 0.85; p.armor += 1; }
  if (p.charId === 'ali') p.dodge = 0.12;
  if (p.charId === 'bekir') { p.stunChance = 0.1; p.xpGain = 1.1; }
  if (p.charId === 'erkan') p.greed += 0.25;
}

function weaponStats(p, w) {
  const d = WEAPONS[w.id];
  const l = Math.min(w.lvl, WEAPON_MAX_LVL) - 1;
  const s = {};
  for (const k in d.base) {
    s[k] = d.base[k] + (d.perLvl[k] || 0) * l;
  }
  s.cd *= (1 - p.cdr);
  if (s.dmg) s.dmg *= p.might;
  if (s.dps) s.dps *= p.might;
  if (w.evolved && EVO_MODS[w.id]) EVO_MODS[w.id](s);
  return s;
}

function skillStats(p) {
  const d = SKILLS[p.charId];
  const l = p.skill.lvl - 1;
  const s = { cd: d.cd };
  for (const k in d.base) s[k] = d.base[k] + (d.perLvl[k] || 0) * l;
  if (d.perLvl.cd) s.cd += d.perLvl.cd * l;
  s.cd *= (1 - Meta.lvl('yetenek') * 0.07);
  return s;
}

// Hızlı hareket sırasında geride kalan oyuncu silüetleri
function emitAfterimage(p, dt) {
  p.afterT -= dt;
  if (p.afterT > 0) return;
  p.afterT = 0.045;
  Game.afterimgs.push({ charId: p.charId, x: p.x, y: p.y, flip: p.flip,
    frame: ((p.animT * 9) | 0) % 2, t: 0 });
}

function updatePlayer(dt) {
  const p = Game.player;

  // ── aktif yetenek ──
  if (p.skill.cd > 0) {
    p.skill.cd -= dt;
    if (p.skill.cd <= 0) { Sfx.play('ready'); addFloat(p.x, p.y - 24, 'YETENEK HAZIR!', p.def.color); }
  }
  if ((Input.pressed['Space'] || Input.pressed['KeyE']) && p.skill.cd <= 0 && !p.dashS && p.turboT <= 0) {
    useSkill(p);
  }

  // Ahmet'in atılışı: kontrolü devral
  if (p.dashS) {
    const ds = p.dashS;
    ds.t += dt;
    p.x += ds.vx * dt; p.y += ds.vy * dt;
    p.invuln = Math.max(p.invuln, 0.1);
    // yol üstündekileri çak
    for (const e of Game.enemies) {
      if (ds.hit.has(e.id) || e.spawnT > 0) continue;
      const r = 12 + 5 * e.type.scale;
      if (dist2(p.x, p.y, e.x, e.y) < r * r) {
        ds.hit.add(e.id);
        damageEnemy(e, ds.dmg, ds.vx * 0.6, ds.vy * 0.6);
        e.stun = Math.max(e.stun, ds.stun);
        Game.shake = Math.max(Game.shake, 2);
      }
    }
    addPart({ x: p.x - ds.vx * 0.02, y: p.y - 8, vx: rand(-10, 10), vy: rand(-10, 10),
      dur: 0.25, type: 'puff', col: p.def.color, size: 3 });
    emitAfterimage(p, dt);
    if (ds.t >= ds.dur) p.dashS = null;
    p.animT += dt;
    p.moving = true;
    return;
  }

  const { dx, dy } = Input.axis();
  p.moving = !!(dx || dy);

  // Ali'nin el freni turbosu
  let spdMul = 1;
  if (p.turboT > 0) {
    p.turboT -= dt;
    spdMul = 2.3;
    p.invuln = Math.max(p.invuln, 0.12);
    for (const e of Game.enemies) {
      if (p.turboHit.has(e.id) || e.spawnT > 0) continue;
      const r = 12 + 5 * e.type.scale;
      if (dist2(p.x, p.y, e.x, e.y) < r * r) {
        p.turboHit.add(e.id);
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        damageEnemy(e, p.turboDmg, Math.cos(a) * 220, Math.sin(a) * 220);
      }
    }
    addPart({ x: p.x + rand(-4, 4), y: p.y - rand(2, 12), vx: -(dx || 1) * 40, vy: 0,
      dur: 0.3, type: 'spark', col: pick([COL.teal, COL.white]) });
    emitAfterimage(p, dt);
  }
  if (p.magnetBoostT > 0) p.magnetBoostT -= dt;
  if (p.shieldT > 0) p.shieldT -= dt;
  if (p.turboPickT > 0) {
    p.turboPickT -= dt;
    spdMul *= 1.6;
    if (p.moving) {
      emitAfterimage(p, dt);
      if (Math.random() < 0.4) {
        addPart({ x: p.x + rand(-3, 3), y: p.y - rand(2, 10), vx: -(dx || 1) * 30, vy: 0,
          dur: 0.25, type: 'spark', col: COL.yellow });
      }
    }
  }

  if (p.moving) {
    p.x += dx * p.spd * spdMul * dt;
    p.y += dy * p.spd * spdMul * dt;
    p.facing.x = dx || p.facing.x * (dy ? 0 : 1) || (dx === 0 && dy !== 0 ? 0 : p.facing.x);
    p.facing = { x: dx || (dy ? 0 : p.facing.x), y: dy };
    if (!dx && !dy) p.facing = { x: 1, y: 0 };
    if (dx) {
      const nf = dx < 0;
      if (nf !== p.flip) p.turnT = 0.12;   // yön değişti: dönüş animasyonu
      p.flip = nf;
    }
    p.animT += dt;
    // ayak tozu
    p.dustT -= dt;
    if (p.dustT <= 0) {
      p.dustT = 0.18;
      addPart({ x: p.x + rand(-3, 3), y: p.y, vx: rand(-8, 8), vy: -rand(2, 8),
        dur: 0.4, type: 'puff', col: COL.greyDark, size: 2 });
    }
  }
  if (p.invuln > 0) p.invuln -= dt;
  if (p.hurtFlash > 0) p.hurtFlash -= dt;

  // koşarken yöne eğilme + dönüş animasyonu sayacı
  const targetLean = p.moving ? dx * 0.09 : 0;
  p.lean += (targetLean - p.lean) * Math.min(1, 10 * dt);
  if (p.turnT > 0) p.turnT -= dt;

  // Can'ın pasifi: periyodik soru sorup en yakını dondurur
  if (p.charId === 'can') {
    p.questionT -= dt;
    if (p.questionT <= 0) {
      p.questionT = 6;
      let best = null, bd = 100 * 100;
      for (const e of Game.enemies) {
        const d = dist2(p.x, p.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        best.stun = Math.max(best.stun, 2);
        addFloat(best.x, best.y - 16, '?', COL.yellow);
        Sfx.play('question');
      }
    }
  }
}

// ── Aktif yetenek kullanımı ──
function useSkill(p) {
  const s = skillStats(p);
  p.skill.cd = s.cd;
  Game.banner = { txt: SKILLS[p.charId].name + '!', t: 2.2 };

  switch (p.charId) {
    case 'ahmet': {
      // minder dayağı: ileri atılış
      let fx = p.facing.x, fy = p.facing.y;
      if (!fx && !fy) fx = 1;
      const len = Math.sqrt(fx * fx + fy * fy) || 1;
      const dur = 0.3;
      p.dashS = { t: 0, dur, vx: (fx / len) * (s.range / dur), vy: (fy / len) * (s.range / dur),
        dmg: s.dmg, stun: s.stun, hit: new Set() };
      Sfx.play('dash'); Sfx.play('suplex');
      break;
    }
    case 'ali': {
      p.turboT = s.dur;
      p.turboDmg = s.dmg;
      p.turboHit = new Set();
      Sfx.play('horn'); Sfx.play('dash');
      break;
    }
    case 'bekir': {
      // akustik patlama: dev itiş halkası
      Game.shocks.push({ x: p.x, y: p.y - 6, r: s.r, t: 0, col: COL.purple });
      Game.rings.push({ x: p.x, y: p.y - 6, r: 6, maxR: s.r, dmg: 0, hit: new Set(), delay: 0, stun: 0 });
      for (const e of Game.enemies) {
        if (e.spawnT > 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) < s.r * s.r) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          damageEnemy(e, s.dmg, Math.cos(a) * 300, Math.sin(a) * 300);
          e.stun = Math.max(e.stun, s.stun);
        }
      }
      for (let i = 0; i < 14; i++) {
        const a = rand(TAU);
        addPart({ x: p.x, y: p.y - 10, vx: Math.cos(a) * rand(40, 90), vy: Math.sin(a) * rand(30, 60) - 20,
          dur: 0.7, type: 'note', col: pick([COL.purple, COL.pink, COL.teal]) });
      }
      Game.shake = Math.max(Game.shake, 5);
      Sfx.play('wave'); Sfx.play('explode');
      break;
    }
    case 'can': {
      // soru bombardımanı: ekrandaki herkes donar
      for (const e of Game.enemies) {
        if (e.spawnT > 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) > 320 * 320) continue;
        e.stun = Math.max(e.stun, s.dur);
        damageEnemy(e, s.dmg, 0, 0, true);
        addFloat(e.x, e.y - 14 * e.type.scale, '?', COL.yellow);
      }
      Game.flashT = 0.3; Game.flashCol = '44,232,245';
      Sfx.play('question'); Sfx.play('teleport');
      break;
    }
    case 'erkan': {
      // vergi denetimi: para söküp çipleri mıknatısla
      let took = 0;
      for (const e of Game.enemies) {
        if (e.spawnT > 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) < s.r * s.r) {
          damageEnemy(e, s.dmg, 0, 0, true);
          addFloat(e.x, e.y - 14 * e.type.scale, '+VERGİ', COL.gold);
          took++;
        }
      }
      const gain = Math.min(s.coins + Math.floor(took / 4), s.coins * 3);
      Game.coins += gain;
      Game.score += Math.round(gain * 30 * p.greed);
      p.magnetBoostT = 1.6;
      Game.shocks.push({ x: p.x, y: p.y - 6, r: s.r, t: 0, col: COL.gold });
      Game.flashT = 0.25; Game.flashCol = '254,174,52';
      Sfx.play('coin'); Sfx.play('chest');
      break;
    }
    case 'berker': {
      // sevkiyat yağmuru: BAKTIĞIN yöne koli bombardımanı (oyuncu nişan alır)
      let fx = p.facing.x, fy = p.facing.y;
      if (!fx && !fy) fx = p.flip ? -1 : 1;
      const base = Math.atan2(fy, fx);
      const count = Math.round(s.n);
      for (let i = 0; i < count; i++) {
        // koni şeklinde ileri saçılım: yakından uzağa dizilir
        const a = base + rand(-0.5, 0.5);
        const r = 26 + (i / count) * 115 + rand(-10, 10);
        const tx = p.x + Math.cos(a) * r, ty = p.y + Math.sin(a) * r;
        Game.boxes.push({ x0: p.x, y0: p.y - 10, tx, ty, t: -i * 0.09, dur: 0.45,
          dmg: s.dmg, splash: s.splash, sky: true });
      }
      Sfx.play('box'); Sfx.play('akin');
      break;
    }
  }
}

// ── Robot kol: görünür yumruk ──
function updateRobotArm(p, dt) {
  const lvl = p.items['robotkol'] || 0;
  if (p.armAnim) {
    p.armAnim.t += dt;
    if (p.armAnim.t > 0.16) p.armAnim = null;
  }
  if (!lvl) return;
  p.armT -= dt;
  if (p.armT > 0) return;
  // menzildeki en yakın müşteriye yumruk
  let best = null, bd = 38 * 38;
  for (const e of Game.enemies) {
    if (e.spawnT > 0) continue;
    const d = dist2(p.x, p.y - 8, e.x, e.y - 6);
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) { p.armT = 0.25; return; }
  p.armT = Math.max(1.2, 2.8 - lvl * 0.3);
  p.armAnim = { t: 0, tx: best.x, ty: best.y - 6 };
  const a = Math.atan2(best.y - p.y, best.x - p.x);
  damageEnemy(best, (10 + lvl * 5) * p.might, Math.cos(a) * 170, Math.sin(a) * 170);
  for (let i = 0; i < 4; i++) {
    addPart({ x: best.x, y: best.y - 8, vx: rand(-40, 40), vy: rand(-50, 0),
      dur: 0.3, type: 'spark', col: COL.teal });
  }
  Sfx.play('zimba');
}

function damagePlayer(amount) {
  const p = Game.player;
  if (p.invuln > 0 || Game.state !== 'play') return;
  // kalkan güçlendirmesi: hasarı tamamen emer
  if (p.shieldT > 0) {
    addFloat(p.x, p.y - 20, 'KALKAN!', COL.teal);
    Sfx.play('shield');
    p.invuln = 0.4;
    return;
  }
  if (Math.random() < p.dodge) {
    addFloat(p.x, p.y - 20, 'KAÇTI!', COL.teal);
    Sfx.play('dodge');
    p.invuln = 0.4;
    return;
  }
  Game.lastHurtT = Game.time;
  const dmg = Math.max(1, Math.round(amount * p.dmgTakenMul) - p.armor);
  p.hp -= dmg;
  p.invuln = 0.7;
  p.hurtFlash = 0.25;
  Game.shake = Math.max(Game.shake, 3);
  addFloat(p.x, p.y - 20, '-' + dmg, COL.red);
  Sfx.play('hurt');
  for (let i = 0; i < 6; i++) {
    addPart({ x: p.x, y: p.y - 8, vx: rand(-40, 40), vy: rand(-50, 10), dur: 0.4, type: 'px', col: COL.red, size: 1 });
  }
  if (p.hp <= 0) { p.hp = 0; Game.gameOver(); }
}

// ── Silahlar ──
function fireWeapons(dt) {
  const p = Game.player;
  updateRobotArm(p, dt);
  for (const w of p.weapons) {
    const s = weaponStats(p, w);
    if (w.id === 'mop') { updateMop(w, s, dt); continue; }
    w.cd -= dt;
    if (w.echo > 0) { w.echo -= dt; if (w.echo <= 0) suplexPulse(s, w); }
    if (w.cd <= 0) {
      w.cd = s.cd;
      switch (w.id) {
        case 'suplex': suplexPulse(s, w); if (w.lvl >= 6 || w.evolved) w.echo = 0.28; break;
        case 'car': fireCar(s, w); break;
        case 'wave': fireWave(s, w); break;
        case 'burp': fireBurp(s); break;
        case 'puff': firePuff(s, w); break;
        case 'box': fireBox(s, w); break;
        case 'zimba': fireZimba(s, w); break;
        case 'mail': fireMail(s, w); break;
      }
    }
  }
  // drone'lar (pasif item silahı)
  const droneCount = p.items['drone'] || 0;
  if (droneCount > 0) {
    p.droneAngle += dt * 2.4;
    const dmg = (6 + droneCount * 3) * p.might;
    for (let i = 0; i < droneCount; i++) {
      const a = p.droneAngle + (i / droneCount) * TAU;
      const dx = p.x + Math.cos(a) * 26, dy = p.y - 8 + Math.sin(a) * 26;
      for (const e of Game.enemies) {
        if (e.droneCd > 0) continue;
        const r = 6 + 5 * e.type.scale;
        if (dist2(dx, dy, e.x, e.y - 6) < r * r) {
          e.droneCd = 0.5;
          damageEnemy(e, dmg, (e.x - dx) * 4, (e.y - dy) * 4);
        }
      }
    }
  }
}

function suplexPulse(s, w) {
  const p = Game.player;
  // her 4. vuruş ŞAMPİYON VURUŞU: daha büyük, daha sert
  if (w) w.pulseN = (w.pulseN || 0) + 1;
  const champ = w && w.pulseN % 4 === 0;
  const radius = s.radius * (champ ? 1.5 : 1);
  const dmg = s.dmg * (champ ? 1.6 : 1);

  Game.shocks.push({ x: p.x, y: p.y - 6, r: radius, t: 0, col: champ ? COL.gold : undefined });
  Game.decals.push({ x: p.x, y: p.y, r: radius * 0.7, t: 0, dur: champ ? 3 : 1.8 });
  Game.shake = Math.max(Game.shake, champ ? 4 : 2);
  Game.kickY = Math.min(4, Game.kickY + (champ ? 3 : 1.5));
  Sfx.play(champ ? 'bigslam' : 'suplex');
  if (champ) {
    addFloat(p.x, p.y - 26, 'ŞAMPİYON!', COL.gold, true);
    Game.freeze = Math.max(Game.freeze, 0.05);
  }

  for (const e of Game.enemies) {
    if (dist2(p.x, p.y, e.x, e.y) < radius * radius) {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      damageEnemy(e, dmg, Math.cos(a) * s.kb, Math.sin(a) * s.kb);
      e.bounceT = 0.35;   // müşteriler havaya zıplar
      if (w && w.evolved) e.stun = Math.max(e.stun, 0.5);
    }
  }
  const n = Math.round(radius / 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(0.4);
    addPart({ x: p.x + Math.cos(a) * radius * 0.75, y: p.y - 4 + Math.sin(a) * radius * 0.42,
      vx: Math.cos(a) * rand(25, 55), vy: -rand(10, 45), dur: 0.4, type: 'puff',
      col: champ && i % 3 === 0 ? COL.gold : COL.greyLight, size: champ ? 4 : 3 });
  }
}

function fireCar(s, w) {
  const p = Game.player;
  const lvl = w.lvl;
  // kalabalık taraftan gelsin
  let left = 0, right = 0;
  for (const e of Game.enemies) (e.x < p.x ? left++ : right++);
  const dir = left >= right ? 1 : -1;
  Sfx.play('horn');
  // her araca ayrı şerit, aynı yönden gelenlere kademeli mesafe:
  // araçlar üst üste binmez, konvoy gibi arka arkaya dizilir
  const lanes = [0, -27, 27, -50];
  let laneIdx = 0;
  const stagger = { '1': 0, '-1': 0 };
  const mk = d => {
    const stag = stagger[String(d)];
    stagger[String(d)] += 80;
    Game.cars.push({
      x: p.x - d * (280 + stag), y: p.y + lanes[laneIdx++ % lanes.length] + rand(-4, 4),
      dir: d, spd: 250, dmg: s.dmg, kb: s.kb, band: s.band,
      hit: new Set(), life: 3 + stag / 250
    });
  };
  mk(dir);
  if (lvl >= 4) mk(-dir);
  if (lvl >= 6) mk(dir);
  if (w.evolved) mk(-dir);
}

function fireWave(s, w) {
  const p = Game.player;
  const lvl = w.lvl;
  Sfx.play('wave');
  const stun = w.evolved ? 0.3 : 0;
  const mk = delay => Game.rings.push({ x: p.x, y: p.y - 6, r: 6, maxR: s.maxR, dmg: s.dmg, hit: new Set(), delay, stun });
  mk(0);
  if (lvl >= 4) mk(0.18);
  if (lvl >= 6) mk(0.36);
  addPart({ x: p.x + rand(-6, 6), y: p.y - 18, vx: rand(-8, 8), vy: -22, dur: 0.8, type: 'note', col: COL.purple });
}

function fireBurp(s) {
  const p = Game.player;
  let fx = p.facing.x, fy = p.facing.y;
  if (!fx && !fy) fx = 1;
  const ang = Math.atan2(fy, fx);
  Sfx.play('burp');
  Game.cones.push({ x: p.x, y: p.y - 6, ang, range: s.range, arc: s.arc, t: 0 });
  for (const e of Game.enemies) {
    const d2 = dist2(p.x, p.y, e.x, e.y);
    if (d2 > s.range * s.range) continue;
    const ea = Math.atan2(e.y - p.y, e.x - p.x);
    let diff = Math.abs(ea - ang);
    if (diff > Math.PI) diff = TAU - diff;
    if (diff < s.arc / 2) {
      damageEnemy(e, s.dmg, Math.cos(ea) * s.kb, Math.sin(ea) * s.kb);
    }
  }
  for (let i = 0; i < 7; i++) {
    const a = ang + rand(-s.arc / 2, s.arc / 2);
    const sp = rand(50, 110);
    addPart({ x: p.x, y: p.y - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dur: 0.35,
      type: 'puff', col: i % 2 ? COL.green : COL.yellow, size: 2 });
  }
}

function firePuff(s, w) {
  const p = Game.player;
  Sfx.play('puff');
  const fx = p.facing.x || 1, fy = p.facing.y;
  const cx = p.x + fx * 16 + rand(-6, 6), cy = p.y + fy * 16 + rand(-6, 6);
  Game.clouds.push({ x: cx, y: cy, r: s.radius, dur: s.dur, t: 0, dps: s.dps, tick: 0, follow: w.evolved });
  while (Game.clouds.length > s.maxClouds + 1) Game.clouds.shift();
}

function fireBox(s, w) {
  const p = Game.player;
  const lvl = w.lvl;
  const count = 1 + (lvl >= 3 ? 1 : 0) + (lvl >= 5 ? 1 : 0) + (w.evolved ? 2 : 0);
  Sfx.play('box');
  // hedefler: en yakın düşmanlar
  const sorted = Game.enemies
    .map(e => ({ e, d: dist2(p.x, p.y, e.x, e.y) }))
    .filter(o => o.d < 140 * 140)
    .sort((a, b) => a.d - b.d);
  for (let i = 0; i < count; i++) {
    let tx, ty;
    if (sorted[i]) { tx = sorted[i].e.x + rand(-6, 6); ty = sorted[i].e.y + rand(-6, 6); }
    else { const a = rand(TAU); tx = p.x + Math.cos(a) * rand(40, 80); ty = p.y + Math.sin(a) * rand(40, 80); }
    // evrimleşmişse koliler gökten (drone filosundan) düşer
    Game.boxes.push({ x0: p.x, y0: p.y - 10, tx, ty, t: 0, dur: 0.5, dmg: s.dmg, splash: s.splash, sky: w.evolved });
  }
}

function fireZimba(s, w) {
  const p = Game.player;
  const count = 1 + (w.lvl >= 3 ? 1 : 0) + (w.lvl >= 5 ? 1 : 0);
  // en yakın müşteriye nişan al, kimse yoksa bakılan yöne
  let best = null, bd = 200 * 200;
  for (const e of Game.enemies) {
    if (e.spawnT > 0) continue;
    const d = dist2(p.x, p.y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  const ang = best ? Math.atan2(best.y - 6 - (p.y - 8), best.x - p.x)
                   : Math.atan2(p.facing.y, p.facing.x || 1);
  Sfx.play('zimba');
  for (let i = 0; i < count; i++) {
    const a = ang + (i - (count - 1) / 2) * 0.14;
    Game.projs.push({ type: 'staple', x: p.x, y: p.y - 8,
      vx: Math.cos(a) * s.spd, vy: Math.sin(a) * s.spd,
      dmg: s.dmg, pierce: Math.round(s.pierce), hit: new Set(), t: 0 });
  }
}

function fireMail(s, w) {
  const p = Game.player;
  const count = Math.round(s.count);
  const targets = Game.enemies.filter(e => e.spawnT <= 0 && dist2(p.x, p.y, e.x, e.y) < 230 * 230);
  if (!targets.length) return;
  Sfx.play('mail');
  for (let i = 0; i < count; i++) {
    const a = rand(TAU);
    Game.projs.push({ type: 'mail', x: p.x, y: p.y - 10,
      vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
      spd: s.spd, dmg: s.dmg, target: pick(targets), t: 0 });
  }
}

// Paspas: sürekli dönen yörünge silahı
function updateMop(w, s, dt) {
  const p = Game.player;
  w.angle += s.rot * dt;
  const count = 1 + (w.lvl >= 4 ? 1 : 0) + (w.lvl >= 6 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const a = w.angle + (i / count) * TAU;
    const mx = p.x + Math.cos(a) * s.orbitR, my = p.y - 6 + Math.sin(a) * s.orbitR * 0.7;
    for (const e of Game.enemies) {
      if (e.spawnT > 0 || e.mopCd > 0) continue;
      const r = 7 + 5 * e.type.scale;
      if (dist2(mx, my, e.x, e.y - 6) < r * r) {
        e.mopCd = 0.4;
        damageEnemy(e, s.dmg, (e.x - p.x) * 3, (e.y - p.y) * 3);
      }
    }
  }
}

// ── Silah varlıklarının güncellenmesi ──
function updateWeaponEntities(dt) {
  const p = Game.player;

  // supleks halka görselleri
  for (let i = Game.shocks.length - 1; i >= 0; i--) {
    const sh = Game.shocks[i];
    sh.t += dt;
    if (sh.t > 0.3) Game.shocks.splice(i, 1);
  }

  // geğirti konileri (görsel)
  for (let i = Game.cones.length - 1; i >= 0; i--) {
    Game.cones[i].t += dt;
    if (Game.cones[i].t > 0.25) Game.cones.splice(i, 1);
  }

  // arabalar
  for (let i = Game.cars.length - 1; i >= 0; i--) {
    const c = Game.cars[i];
    c.x += c.dir * c.spd * dt;
    c.life -= dt;
    if (Math.random() < 0.5) {
      addPart({ x: c.x - c.dir * 14, y: c.y + rand(-2, 2), vx: -c.dir * 20, vy: rand(-14, -4),
        dur: 0.4, type: 'puff', col: COL.greyDark, size: 2 });
    }
    // asfalta lastik izi bırakır
    c.skidT = (c.skidT || 0) - dt;
    if (c.skidT <= 0) {
      c.skidT = 0.05;
      Game.decals.push({ type: 'skid', x: c.x - c.dir * 10, y: c.y + 2, dir: c.dir, t: 0, dur: 2.2 });
    }
    for (const e of Game.enemies) {
      if (c.hit.has(e.id)) continue;
      if (Math.abs(e.y - c.y) < c.band && Math.abs(e.x - c.x) < 17) {
        c.hit.add(e.id);
        damageEnemy(e, c.dmg, c.dir * c.kb, rand(-60, 60));
      }
    }
    if (c.life <= 0) Game.cars.splice(i, 1);
  }

  // ses halkaları
  for (let i = Game.rings.length - 1; i >= 0; i--) {
    const r = Game.rings[i];
    if (r.delay > 0) { r.delay -= dt; continue; }
    r.r += 130 * dt;
    for (const e of Game.enemies) {
      if (r.hit.has(e.id)) continue;
      const d = Math.sqrt(dist2(r.x, r.y, e.x, e.y - 6));
      if (Math.abs(d - r.r) < 7) {
        r.hit.add(e.id);
        const a = Math.atan2(e.y - 6 - r.y, e.x - r.x);
        if (r.dmg > 0) damageEnemy(e, r.dmg, Math.cos(a) * 60, Math.sin(a) * 60);
        if (r.stun) e.stun = Math.max(e.stun, r.stun);
        if (Math.random() < 0.3) {
          addPart({ x: e.x, y: e.y - 14, vx: rand(-10, 10), vy: -25, dur: 0.6, type: 'note', col: COL.purple });
        }
      }
    }
    if (r.r > r.maxR) Game.rings.splice(i, 1);
  }

  // buhar bulutları
  for (let i = Game.clouds.length - 1; i >= 0; i--) {
    const cl = Game.clouds[i];
    cl.t += dt; cl.tick -= dt;
    if (cl.follow) {
      const k = Math.min(1, 3 * dt);
      cl.x += (p.x - cl.x) * k; cl.y += (p.y - cl.y) * k;
    }
    if (cl.tick <= 0) {
      cl.tick = 0.4;
      for (const e of Game.enemies) {
        if (dist2(cl.x, cl.y, e.x, e.y - 4) < cl.r * cl.r) {
          damageEnemy(e, cl.dps * 0.4, 0, 0, true);
        }
      }
      addPart({ x: cl.x + rand(-cl.r, cl.r) * 0.6, y: cl.y + rand(-cl.r, cl.r) * 0.4,
        vx: rand(-6, 6), vy: -rand(4, 12), dur: 0.9, type: 'puff', col: COL.grey, size: 4 });
    }
    if (cl.t > cl.dur) Game.clouds.splice(i, 1);
  }

  // koliler (havada uçan)
  for (let i = Game.boxes.length - 1; i >= 0; i--) {
    const b = Game.boxes[i];
    b.t += dt;
    if (b.t >= b.dur) {
      // yere indi: alan hasarı
      for (const e of Game.enemies) {
        if (dist2(b.tx, b.ty, e.x, e.y) < b.splash * b.splash) {
          const a = Math.atan2(e.y - b.ty, e.x - b.tx);
          damageEnemy(e, b.dmg, Math.cos(a) * 90, Math.sin(a) * 90);
          e.stun = Math.max(e.stun, 0.3);
        }
      }
      Sfx.play('hit');
      for (let k = 0; k < 6; k++) {
        addPart({ x: b.tx, y: b.ty, vx: rand(-50, 50), vy: rand(-60, -10), dur: 0.4,
          type: 'px', col: k % 2 ? COL.skinAlt : COL.brown, size: 2 });
      }
      Game.boxes.splice(i, 1);
    }
  }

  // iadeci mermileri
  for (let i = Game.eShots.length - 1; i >= 0; i--) {
    const s = Game.eShots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
    if (s.t > 3.5) { Game.eShots.splice(i, 1); continue; }
    if (dist2(s.x, s.y, p.x, p.y - 8) < 8 * 8) {
      damagePlayer(s.dmg);
      Game.eShots.splice(i, 1);
    }
  }

  // oyuncu mermileri: zımba telleri + güdümlü mailler
  for (let i = Game.projs.length - 1; i >= 0; i--) {
    const pr = Game.projs[i];
    pr.t += dt;
    if (pr.type === 'mail') {
      let tgt = pr.target;
      if (!tgt || tgt.hp <= 0) {
        tgt = null; let bd = 1e9;
        for (const e of Game.enemies) {
          if (e.spawnT > 0) continue;
          const d = dist2(pr.x, pr.y, e.x, e.y);
          if (d < bd) { bd = d; tgt = e; }
        }
        pr.target = tgt;
      }
      if (tgt) {
        const a = Math.atan2(tgt.y - 6 - pr.y, tgt.x - pr.x);
        const k = Math.min(1, 6 * dt);
        pr.vx = lerp(pr.vx, Math.cos(a) * pr.spd, k);
        pr.vy = lerp(pr.vy, Math.sin(a) * pr.spd, k);
      }
    }
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.t > 3) { Game.projs.splice(i, 1); continue; }
    let dead = false;
    for (const e of Game.enemies) {
      if (e.spawnT > 0 || (pr.hit && pr.hit.has(e.id))) continue;
      const r = 5 + 5 * e.type.scale;
      if (dist2(pr.x, pr.y, e.x, e.y - 6) < r * r) {
        damageEnemy(e, pr.dmg, pr.vx * 0.25, pr.vy * 0.25);
        if (pr.type === 'staple') {
          pr.hit.add(e.id);
          pr.pierce--;
          if (pr.pierce < 0) dead = true;
        } else dead = true;
        if (dead) break;
      }
    }
    if (dead) Game.projs.splice(i, 1);
  }
}

// ── Düşmanlar ──
function spawnEnemy(typeId, x, y) {
  const t = ENEMY_TYPES[typeId];
  const hpMul = 1 + Game.time / 60 * 0.42 + Math.max(0, (Game.time - 420) / 60 * 0.5);
  const e = {
    id: nextEntityId++,
    typeId, type: t,
    x, y,
    hp: t.breakable ? t.hp : t.hp * (t.boss || t.elite ? hpMul * 0.8 + 0.2 : hpMul),
    maxHp: 0,
    spd: t.speed * rand(0.9, 1.1),
    flip: false, animT: rand(1),
    kx: 0, ky: 0, stun: 0, flash: 0, popT: 0, bounceT: 0,
    wanderT: rand(TAU), shotCd: rand(1, 3), droneCd: 0,
    spawnT: t.breakable ? 0 : (t.boss ? 1.0 : 0.55),
    mopCd: 0, hasteT: 0, fuseT: -1,
    windT: 0, dashT: 0, dvx: 0, dvy: 0,
    acCd: rand(1.5, 3.5),
    teleCd: t.tele ? t.tele.cd * 0.7 : 0,
    sumCd: t.summon ? t.summon.cd * 0.7 : 0,
    lobCd: t.lob ? t.lob.cd * 0.6 : 0,
    rainCd: t.rain ? t.rain.cd * 0.6 : 0,
    slamCd: t.slam ? t.slam.cd * 0.5 : 0,
    slamWindT: 0, enraged: false
  };
  e.maxHp = e.hp;
  Game.enemies.push(e);
  return e;
}

function damageEnemy(e, dmg, kx, ky, silent) {
  const p = Game.player;
  if (e.spawnT > 0) return;   // henüz sahaya inmedi
  if (e.type.armor) dmg = Math.max(1, dmg - e.type.armor);
  // kritik vuruş (robot kol şansı artırır)
  let crit = false;
  if (!silent && Math.random() < (p.crit || 0)) {
    crit = true;
    dmg *= 2;
    addPart({ x: e.x, y: e.y - 10, dur: 0.22, type: 'crit', col: COL.yellow, size: 6 });
    for (let i = 0; i < 4; i++) {
      addPart({ x: e.x + rand(-4, 4), y: e.y - 10 + rand(-4, 4), vx: rand(-50, 50), vy: rand(-60, -10),
        dur: 0.35, type: 'spark', col: COL.yellow });
    }
  }
  e.hp -= dmg;
  e.flash = 0.1;
  e.popT = 0.09;   // vuruş "pop"u: sprite anlık büyür
  if (kx || ky) {
    const kbRes = e.type.boss ? 0.06 : (e.type.elite ? 0.25 : (e.type.heavy ? 0.35 : (e.type.breakable ? 0 : 1)));
    e.kx += kx * kbRes; e.ky += ky * kbRes;
  }
  // boss öfke fazı: canı %60 altına düşünce
  if (e.type.boss && !e.enraged && e.hp > 0 && e.hp < e.maxHp * 0.6) {
    e.enraged = true;
    Game.banner = { txt: e.type.name + ' ÖFKELENDİ!', t: 0 };
    Game.flashT = 0.25; Game.flashCol = '228,59,68';
    Game.shake = Math.max(Game.shake, 4);
    Sfx.play('boss');
  }
  if (!silent) {
    const big = crit || dmg >= 30;
    addFloat(e.x + rand(-4, 4), e.y - 14 * e.type.scale, Math.round(dmg) + (crit ? '!' : ''),
      big ? COL.gold : COL.white, big);
    Sfx.play('hit');
  }
  if (p.stunChance && Math.random() < p.stunChance) e.stun = Math.max(e.stun, 0.8);
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  const idx = Game.enemies.indexOf(e);
  if (idx < 0) return;
  Game.enemies.splice(idx, 1);
  Game.score += Math.round(e.type.score * Game.player.greed);

  // kırılabilir nesne: ödül düşür, kıymık saç
  if (e.type.breakable) {
    Sfx.play('break');
    Missions.event('crates');
    const roll = Math.random();
    if (roll < 0.28) addPickup('coin', e.x, e.y);
    else if (roll < 0.5) { for (let i = 0; i < 3; i++) addPickup('chip', e.x + rand(-8, 8), e.y + rand(-6, 6), 2); }
    else if (roll < 0.64) addPickup('heart', e.x, e.y);
    else if (roll < 0.76) addPickup('magnet', e.x, e.y);
    else if (roll < 0.86) addPickup('bomb', e.x, e.y);
    else if (roll < 0.94) addPickup('shield', e.x, e.y);
    else addPickup('turbo', e.x, e.y);
    const cols = e.typeId === 'varil' ? [COL.cyan, COL.blueDark, COL.teal] : [COL.skinAlt, COL.brown, COL.brownDark];
    for (let i = 0; i < 10; i++) {
      addPart({ x: e.x, y: e.y - 5, vx: rand(-70, 70), vy: rand(-90, -10), dur: 0.5,
        type: 'px', col: pick(cols), size: 2 });
    }
    return;
  }

  Game.kills++;
  Sfx.play('die');

  // kombo zinciri
  Game.combo++;
  Game.comboT = 2.2;
  if (Game.combo > Game.comboBest) Game.comboBest = Game.combo;
  Missions.event('kill');
  Missions.event('combo', Game.combo);
  if (e.type.elite) Missions.event('elite');
  if (Game.combo >= 10 && Game.combo % 10 === 0) {
    addFloat(Game.player.x, Game.player.y - 26, 'KOMBO x' + Game.combo + '!', COL.gold, true);
    Sfx.comboTier(Game.combo / 10);
    Game.score += Game.combo * 5;
  }

  // ceset animasyonu (yere serilip kaybolur)
  if (Game.corpses.length > 40) Game.corpses.shift();
  Game.corpses.push({ typeId: e.typeId, x: e.x, y: e.y, flip: e.flip,
    scale: e.type.big ? e.type.sprScale : e.type.scale, t: 0 });

  // kalabalık aile: veletlere bölünür
  if (e.type.split) {
    for (let i = 0; i < e.type.split.n; i++) {
      const c = spawnEnemy(e.type.split.id, e.x + rand(-12, 12), e.y + rand(-8, 8));
      c.spawnT = 0.25;
    }
    addFloat(e.x, e.y - 20, 'ÇOCUKLAR!', COL.teal);
  }

  // XP çipi (6. dakikadan sonra altın görünür)
  addPickup('chip', e.x, e.y, Math.round(e.type.xp * Game.player.xpGain * 10) / 10);
  if (e.type.elite) {
    addPickup('chest', e.x, e.y);
    for (let i = 0; i < 3; i++) addPickup('coin', e.x + rand(-14, 14), e.y + rand(-10, 10));
    Game.freeze = 0.12;
    Game.shake = Math.max(Game.shake, 4);
  } else if (e.type.boss) {
    addPickup('heart', e.x - 18, e.y);
    addPickup('heart', e.x + 18, e.y);
    for (let i = 0; i < 6; i++) addPickup('coin', e.x + rand(-20, 20), e.y + rand(-14, 14));
    Game.bossAlive = false;
    Game.bossChestT = 1.0;   // ölüm şovundan sonra ödül kolisi kendiliğinden açılır
    Game.freeze = 0.25;
    Game.shake = Math.max(Game.shake, 6);
    // boss ölüm şovu: beyaz flaş + çifte şok halkası + kıvılcım yağmuru
    Game.flashT = 0.35; Game.flashCol = '255,255,255';
    Game.shocks.push({ x: e.x, y: e.y - 8, r: 90, t: 0, col: COL.gold });
    Game.shocks.push({ x: e.x, y: e.y - 8, r: 55, t: -0.08, col: COL.white });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      addPart({ x: e.x, y: e.y - 10, vx: Math.cos(a) * rand(60, 140), vy: Math.sin(a) * rand(40, 90) - 30,
        dur: 0.7, type: 'spark', col: pick([COL.gold, COL.yellow, COL.white]) });
    }
  } else if (Math.random() < 0.09) {
    addPickup('coin', e.x, e.y);
  } else if (Math.random() < 0.015) {
    addPickup('heart', e.x, e.y);
  }

  for (let i = 0; i < 7; i++) {
    addPart({ x: e.x, y: e.y - 6, vx: rand(-55, 55), vy: rand(-70, -5), dur: 0.45,
      type: 'puff', col: pick([e.type.shirt, COL.greyLight, COL.white]), size: 2 });
  }
  // müşterinin ruhu göğe yükselir
  addPart({ x: e.x, y: e.y - 8, vx: rand(-6, 6), vy: -30, dur: 0.75, type: 'ghost' });
}

function updateEnemies(dt) {
  const p = Game.player;

  // ayrışma için uzamsal ızgara
  const CELL = 20;
  const grid = new Map();
  for (const e of Game.enemies) {
    const key = ((e.x / CELL) | 0) + ',' + ((e.y / CELL) | 0);
    let arr = grid.get(key);
    if (!arr) { arr = []; grid.set(key, arr); }
    arr.push(e);
  }

  const dmgMul = 1 + Game.time / 60 * 0.12;

  for (const e of Game.enemies) {
    e.animT += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.droneCd > 0) e.droneCd -= dt;
    if (e.mopCd > 0) e.mopCd -= dt;
    if (e.hasteT > 0) e.hasteT -= dt;
    if (e.popT > 0) e.popT -= dt;
    if (e.bounceT > 0) e.bounceT -= dt;

    // kırılabilir nesneler hareket etmez, saldırmaz
    if (e.type.breakable) continue;

    // doğuş telegrafı: kısa süre hareketsiz ve zararsız
    if (e.spawnT > 0) { e.spawnT -= dt; continue; }

    // geri tepme
    e.x += e.kx * dt; e.y += e.ky * dt;
    e.kx *= Math.max(0, 1 - 8 * dt); e.ky *= Math.max(0, 1 - 8 * dt);

    if (e.stun > 0) { e.stun -= dt; continue; }

    // bombacı kurye fitili: yanarken durur, sonra patlar
    if (e.fuseT >= 0) {
      e.fuseT -= dt;
      if (e.fuseT <= 0) { explodeBomber(e); continue; }
    } else {
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      if (e.dashT > 0) {
        // atılış halinde: düz ileri
        e.dashT -= dt;
        e.x += e.dvx * dt; e.y += e.dvy * dt;
      } else if (e.slamWindT > 0) {
        // masa şoku telegrafı: durup güç topluyor, zemin titriyor
        e.slamWindT -= dt;
        if (Math.random() < 12 * dt) {
          const a = rand(TAU);
          addPart({ x: e.x + Math.cos(a) * 18, y: e.y + Math.sin(a) * 8, vx: 0, vy: -rand(15, 35),
            dur: 0.3, type: 'spark', col: COL.orange });
        }
        if (e.slamWindT <= 0) {
          const cfg = e.type.slam;
          Game.eRings.push({ x: e.x, y: e.y - 4, r: 10, maxR: cfg.maxR, dmg: cfg.dmg * dmgMul, hitP: false });
          Game.shocks.push({ x: e.x, y: e.y - 4, r: 30, t: 0, col: COL.orange });
          Game.shake = Math.max(Game.shake, 5);
          Sfx.play('bigslam');
        }
      } else if (e.windT > 0) {
        // telegraf: durup güç topluyor
        e.windT -= dt;
        if (e.windT <= 0) {
          const cfg = e.type.dash || e.type.charge;
          e.dashT = cfg.dur;
          e.dvx = (dx / d) * cfg.spd; e.dvy = (dy / d) * cfg.spd;
          Sfx.play('dash');
        }
      } else {
        let mx = dx / d, my = dy / d;

        if (e.type.wander) {
          e.wanderT += dt * 2;
          mx += Math.cos(e.wanderT) * 0.6;
          my += Math.sin(e.wanderT * 1.3) * 0.6;
        }
        if (e.type.ranged) {
          const r = e.type.ranged;
          if (d < r.range * 0.75) { mx = -mx; my = -my; }       // mesafesini korur
          else if (d < r.range) { mx *= 0.1; my *= 0.1; }
          e.shotCd -= dt;
          if (e.shotCd <= 0 && d < r.range + 20) {
            e.shotCd = r.cd;
            const a = Math.atan2(p.y - 8 - e.y, p.x - e.x);
            const n = r.spread || 1;
            for (let si = 0; si < n; si++) {
              const sa = a + (si - (n - 1) / 2) * 0.28;
              Game.eShots.push({ x: e.x, y: e.y - 8, vx: Math.cos(sa) * r.projSpd, vy: Math.sin(sa) * r.projSpd,
                dmg: r.dmg * dmgMul, t: 0, spr: r.spr });
            }
          }
        }

        // atılış / boss şarjı başlat
        const dashCfg = e.type.dash || e.type.charge;
        if (dashCfg && d < 210 && d > 26) {
          e.acCd -= dt;
          if (e.acCd <= 0) {
            e.acCd = dashCfg.cd * rand(0.85, 1.15);
            e.windT = dashCfg.wind;
            continue;
          }
        }
        // bombacı: yaklaşınca fitili ateşle
        if (e.type.bomb && d < 26) { e.fuseT = e.type.bomb.fuse; continue; }
        // ışınlanan boss (patron sadece canı %60 altındayken)
        if (e.type.tele && (!e.type.patron || e.hp < e.maxHp * 0.6)) {
          e.teleCd -= dt;
          if (e.teleCd <= 0) { e.teleCd = e.type.tele.cd; bossTeleport(e, dmgMul); continue; }
        }
        // yardım çağıran boss (patron sadece öfke fazında)
        if (e.type.summon && (!e.type.patron || e.hp < e.maxHp * 0.3)) {
          e.sumCd -= dt;
          if (e.sumCd <= 0) { e.sumCd = e.type.summon.cd; bossSummon(e); }
        }
        // toptancı: palet fırlatma (yer hedefli telegraf)
        if (e.type.lob && d < 260) {
          e.lobCd -= dt;
          if (e.lobCd <= 0) { e.lobCd = e.type.lob.cd; bossLob(e); }
        }
        // karaborsacı: para yağmuru
        if (e.type.rain && d < 280) {
          e.rainCd -= dt;
          if (e.rainCd <= 0) { e.rainCd = e.type.rain.cd; bossRain(e); }
        }
        // patron: masa şoku (öfke fazında, yakın mesafede)
        if (e.type.slam && e.enraged && d < 130) {
          e.slamCd -= dt;
          if (e.slamCd <= 0) {
            e.slamCd = e.type.slam.cd;
            e.slamWindT = e.type.slam.wind;
            Sfx.play('tick');
            continue;
          }
        }
        // fenomen aurası: yakın müşterileri hızlandırır
        if (e.type.aura) {
          const ar2 = e.type.aura.r * e.type.aura.r;
          for (const o of Game.enemies) {
            if (o === e || o.type.boss) continue;
            if (dist2(e.x, e.y, o.x, o.y) < ar2) o.hasteT = 0.25;
          }
        }

        let spd = e.spd;
        if (e.hasteT > 0) spd *= 1.45;
        if (e.enraged) spd *= 1.15;                              // boss öfkesi
        if (e.type.patron && e.hp < e.maxHp * 0.3) spd *= 1.5;   // patron çılgın fazı
        e.x += mx * spd * dt;
        e.y += my * spd * dt;
        e.flip = p.x < e.x;
        // öfkeli boss'tan buhar tüter
        if (e.enraged && Math.random() < 6 * dt) {
          addPart({ x: e.x + rand(-8, 8), y: e.y - 16 * e.type.scale, vx: rand(-6, 6), vy: -rand(18, 32),
            dur: 0.5, type: 'puff', col: pick([COL.red, COL.orange]), size: 2 });
        }
      }
    }

    // ayrışma: yakın komşuları it
    const cx = (e.x / CELL) | 0, cy = (e.y / CELL) | 0;
    const rr = 7 * e.type.scale;
    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        const arr = grid.get(gx + ',' + gy);
        if (!arr) continue;
        for (const o of arr) {
          if (o === e) continue;
          const ddx = e.x - o.x, ddy = e.y - o.y;
          const dd = ddx * ddx + ddy * ddy;
          const min = rr + 7 * o.type.scale - 4;
          if (dd > 0.01 && dd < min * min) {
            const l = Math.sqrt(dd);
            const push = (min - l) * 0.5;
            e.x += (ddx / l) * push; e.y += (ddy / l) * push;
          }
        }
      }
    }

    // oyuncuya temas hasarı
    const pr = 6 + 5 * e.type.scale;
    if (dist2(e.x, e.y, p.x, p.y) < pr * pr) {
      damagePlayer(e.type.dmg * dmgMul);
    }
  }
}

// ── Özel düşman davranışları ──
function explodeBomber(e) {
  const p = Game.player;
  const b = e.type.bomb;
  const dmgMul = 1 + Game.time / 60 * 0.12;
  Sfx.play('explode');
  Game.shake = Math.max(Game.shake, 4);
  Game.shocks.push({ x: e.x, y: e.y - 4, r: b.r, t: 0, col: COL.orange });
  if (dist2(e.x, e.y, p.x, p.y) < b.r * b.r) damagePlayer(b.dmg * dmgMul);
  for (const o of Game.enemies) {
    if (o === e) continue;
    if (dist2(e.x, e.y, o.x, o.y) < b.r * b.r) {
      damageEnemy(o, b.dmg * 0.6, (o.x - e.x) * 4, (o.y - e.y) * 4, true);
    }
  }
  for (let i = 0; i < 16; i++) {
    addPart({ x: e.x, y: e.y - 6, vx: rand(-90, 90), vy: rand(-100, 10), dur: 0.5,
      type: 'px', col: pick([COL.orange, COL.yellow, COL.red]), size: 2 });
  }
  killEnemy(e);
}

function bossTeleport(e, dmgMul) {
  const p = Game.player;
  for (let i = 0; i < 12; i++) {
    addPart({ x: e.x + rand(-10, 10), y: e.y - rand(0, 24), vx: rand(-30, 30), vy: rand(-40, 0),
      dur: 0.5, type: 'puff', col: COL.purple, size: 3 });
  }
  const a = rand(TAU), r = rand(80, 130);
  e.x = p.x + Math.cos(a) * r;
  e.y = p.y + Math.sin(a) * r;
  Sfx.play('teleport');
  Game.shake = Math.max(Game.shake, 2);
  // belirdiği yerden radyal mermi patlaması
  const cfg = e.type.tele;
  for (let i = 0; i < cfg.burst; i++) {
    const ba = (i / cfg.burst) * TAU + rand(0.2);
    Game.eShots.push({ x: e.x, y: e.y - 10, vx: Math.cos(ba) * cfg.projSpd, vy: Math.sin(ba) * cfg.projSpd,
      dmg: cfg.dmg * dmgMul, t: 0 });
  }
  for (let i = 0; i < 12; i++) {
    addPart({ x: e.x + rand(-10, 10), y: e.y - rand(0, 24), vx: rand(-30, 30), vy: rand(-40, 0),
      dur: 0.5, type: 'puff', col: COL.purple, size: 3 });
  }
}

function bossSummon(e) {
  const cfg = e.type.summon;
  for (let i = 0; i < cfg.n; i++) {
    const a = rand(TAU);
    spawnEnemy(cfg.id, e.x + Math.cos(a) * 32, e.y + Math.sin(a) * 32);
  }
  addFloat(e.x, e.y - 20 * e.type.scale, 'YARDIMA GELİN!', COL.purple);
  Sfx.play('akin');
}

// Toptancı: oyuncunun konumuna palet fırlatır (telegraf + alan hasarı)
function bossLob(e) {
  const p = Game.player, cfg = e.type.lob;
  const dmgMul = 1 + Game.time / 60 * 0.12;
  for (let i = 0; i < cfg.n; i++) {
    Game.hazards.push({
      kind: 'pallet', x0: e.x, y0: e.y - 20,
      x: p.x + rand(-26, 26), y: p.y + rand(-20, 20),
      r: cfg.r, dmg: cfg.dmg * dmgMul, warn: cfg.warn + i * 0.28, t: 0
    });
  }
  addFloat(e.x, e.y - 20 * e.type.scale, 'PALETLERİ YÜKLEYİN!', COL.orange);
  Sfx.play('box');
}

// Karaborsacı: gökten para yağar, düştüğü yer yakar
function bossRain(e) {
  const p = Game.player, cfg = e.type.rain;
  const dmgMul = 1 + Game.time / 60 * 0.12;
  for (let i = 0; i < cfg.n; i++) {
    const tx = p.x + rand(-85, 85), ty = p.y + rand(-55, 55);
    Game.hazards.push({
      kind: 'bill', x0: tx + rand(-10, 10), y0: ty - 110,
      x: tx, y: ty, r: cfg.r, dmg: cfg.dmg * dmgMul, warn: cfg.warn + i * 0.12, t: 0
    });
  }
  addFloat(e.x, e.y - 20 * e.type.scale, 'KARA PARA YAĞIYOR!', COL.green);
  Sfx.play('coin');
}

// ── Tehlike bölgeleri (boss telegraf saldırıları) + düşman şok halkaları ──
function updateHazards(dt) {
  const p = Game.player;
  for (let i = Game.hazards.length - 1; i >= 0; i--) {
    const h = Game.hazards[i];
    h.t += dt;
    if (h.t < h.warn) continue;
    // patlama anı
    if (dist2(h.x, h.y, p.x, p.y) < h.r * h.r) damagePlayer(h.dmg);
    Game.shake = Math.max(Game.shake, h.kind === 'pallet' ? 3 : 1.5);
    Sfx.play(h.kind === 'pallet' ? 'box' : 'hit');
    const cols = h.kind === 'pallet' ? [COL.brown, COL.brownDark, COL.skinAlt] : [COL.green, COL.greenDark, COL.gold];
    for (let k = 0; k < 8; k++) {
      addPart({ x: h.x, y: h.y - 2, vx: rand(-70, 70), vy: rand(-80, -10), dur: 0.45,
        type: 'px', col: pick(cols), size: 2 });
    }
    Game.hazards.splice(i, 1);
  }
  // düşman şok halkaları (patron slam'i): halka oyuncudan geçerken hasar
  for (let i = Game.eRings.length - 1; i >= 0; i--) {
    const r = Game.eRings[i];
    r.r += 150 * dt;
    if (!r.hitP) {
      const d = Math.sqrt(dist2(r.x, r.y, p.x, p.y - 4));
      if (Math.abs(d - r.r) < 9) { r.hitP = true; damagePlayer(r.dmg); }
    }
    if (r.r > r.maxR) Game.eRings.splice(i, 1);
  }
  // ambiyans: robot süpürgeler sahneden geçer
  for (let i = Game.ambients.length - 1; i >= 0; i--) {
    const a = Game.ambients[i];
    a.t += dt;
    a.x += a.dir * a.spd * dt;
    a.y += Math.sin(a.t * 1.7 + a.wob) * 6 * dt;
    if (Math.random() < 1.5 * dt) {
      addPart({ x: a.x - a.dir * 6, y: a.y, vx: -a.dir * 8, vy: -rand(2, 6),
        dur: 0.5, type: 'puff', col: COL.greyDark, size: 1 });
    }
    if (dist2(a.x, a.y, p.x, p.y) > 400 * 400) Game.ambients.splice(i, 1);
  }
}

// ── Toplanabilirler ──
function addPickup(type, x, y, value) {
  if (type === 'chip') {
    // performans: çok fazla çip birikirse birleştir
    const chips = Game.pickups.filter(pk => pk.type === 'chip');
    if (chips.length > 300) { pick(chips).value += value; return; }
  }
  Game.pickups.push({ type, x, y, value: value || 1, vx: rand(-20, 20), vy: rand(-30, -10), t: 0 });
}

function updatePickups(dt) {
  const p = Game.player;
  for (let i = Game.pickups.length - 1; i >= 0; i--) {
    const pk = Game.pickups[i];
    pk.t += dt;
    // çıkış zıplaması
    if (pk.t < 0.3) { pk.x += pk.vx * dt; pk.y += pk.vy * dt; pk.vy += 200 * dt; }
    const d2 = dist2(pk.x, pk.y, p.x, p.y);
    let magnet = pk.type === 'chip' || pk.type === 'coin' ? p.magnetR : 14;
    if (p.magnetBoostT > 0) magnet *= 8;   // vergi denetimi: her şey oyuncuya akar
    if (pk.type !== 'chest' && d2 < magnet * magnet) {
      // oyuncuya çekilme
      const d = Math.sqrt(d2) || 1;
      const sp = 240 * dt / d;
      pk.x += (p.x - pk.x) * sp; pk.y += (p.y - pk.y) * sp;
    }
    const cr = pk.type === 'chest' ? 12 : 6;
    if (d2 < cr * cr) {
      collectPickup(pk);
      Game.pickups.splice(i, 1);
    }
  }
}

function collectPickup(pk) {
  const p = Game.player;
  switch (pk.type) {
    case 'chip':
      Game.xp += pk.value;
      Game.score += Math.round(2 * p.greed);
      // perde merdiveni: seri toplamada ses tizleşir
      Game.pickStreak++;
      Game.pickStreakT = 0.6;
      Sfx.pickupLadder(Game.pickStreak);
      Missions.event('chips');
      Game.checkLevelUp();
      break;
    case 'magnet': {
      p.magnetBoostT = 2.5;
      addFloat(pk.x, pk.y - 8, 'MIKNATIS!', COL.red, true);
      Sfx.play('magnet');
      break;
    }
    case 'bomb': {
      addFloat(pk.x, pk.y - 8, 'BOMBA!', COL.orange, true);
      Game.shocks.push({ x: pk.x, y: pk.y - 4, r: 170, t: 0, col: COL.orange });
      Game.flashT = 0.3; Game.flashCol = '255,200,120';
      Game.shake = Math.max(Game.shake, 7);
      Game.freeze = Math.max(Game.freeze, 0.08);
      for (const e of Game.enemies) {
        if (dist2(pk.x, pk.y, e.x, e.y) < 170 * 170) {
          const a = Math.atan2(e.y - pk.y, e.x - pk.x);
          damageEnemy(e, 45 * p.might, Math.cos(a) * 200, Math.sin(a) * 200);
        }
      }
      for (let i = 0; i < 30; i++) {
        addPart({ x: pk.x, y: pk.y - 4, vx: rand(-140, 140), vy: rand(-150, 20), dur: 0.6,
          type: 'px', col: pick([COL.orange, COL.yellow, COL.red, COL.white]), size: 2 });
      }
      Sfx.play('bomb');
      break;
    }
    case 'shield': {
      p.shieldT = 6;
      addFloat(pk.x, pk.y - 8, 'KALKAN!', COL.teal, true);
      Sfx.play('shield');
      break;
    }
    case 'turbo': {
      p.turboPickT = 5;
      addFloat(pk.x, pk.y - 8, 'TURBO!', COL.yellow, true);
      Sfx.play('turbo');
      break;
    }
    case 'coin':
      Game.coins++;
      Game.score += Math.round(30 * p.greed);
      Sfx.play('coin');
      addFloat(pk.x, pk.y - 8, '+PARA', COL.gold);
      break;
    case 'heart': {
      const heal = Math.round(p.maxHp * 0.25);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      Sfx.play('heart');
      addFloat(pk.x, pk.y - 8, '+' + heal, COL.green);
      break;
    }
    case 'chest':
      Game.openChest();
      break;
  }
}

// ── Parçacıklar ve yazılar ──
function addPart(o) {
  o.t = 0;
  o.vx = o.vx || 0; o.vy = o.vy || 0;
  Game.parts.push(o);
}

function addFloat(x, y, txt, col, big) {
  if (Game.floats.length > 40) Game.floats.shift();
  Game.floats.push({ x, y, txt: String(txt), col, t: 0, big: !!big });
}

function updateFx(dt) {
  for (let i = Game.parts.length - 1; i >= 0; i--) {
    const pt = Game.parts[i];
    pt.t += dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    if (pt.type === 'px') pt.vy += 150 * dt;
    if (pt.t > pt.dur) Game.parts.splice(i, 1);
  }
  for (let i = Game.floats.length - 1; i >= 0; i--) {
    const f = Game.floats[i];
    f.t += dt; f.y -= 18 * dt;
    if (f.t > 0.8) Game.floats.splice(i, 1);
  }
  for (let i = Game.corpses.length - 1; i >= 0; i--) {
    Game.corpses[i].t += dt;
    if (Game.corpses[i].t > 0.45) Game.corpses.splice(i, 1);
  }
  for (let i = Game.decals.length - 1; i >= 0; i--) {
    Game.decals[i].t += dt;
    if (Game.decals[i].t > Game.decals[i].dur) Game.decals.splice(i, 1);
  }
  for (let i = Game.afterimgs.length - 1; i >= 0; i--) {
    Game.afterimgs[i].t += dt;
    if (Game.afterimgs[i].t > 0.22) Game.afterimgs.splice(i, 1);
  }
  for (let i = Game.beams.length - 1; i >= 0; i--) {
    Game.beams[i].t += dt;
    if (Game.beams[i].t > 0.6) Game.beams.splice(i, 1);
  }
}

// ─── Çizim ───────────────────────────────────────────────────
function drawPlayField(ctx) {
  const camX = Game.camX, camY = Game.camY;
  const p = Game.player;
  const W2S = (x, y) => [Math.round(x - camX + 240), Math.round(y - camY + 135)];

  // zemin izleri: supleks çatlakları + lastik izleri
  for (const d of Game.decals) {
    const [sx, sy] = W2S(d.x, d.y);
    const a = clamp(1 - d.t / d.dur, 0, 1) * 0.4;
    if (a <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = a;
    if (d.type === 'skid') {
      ctx.fillStyle = COL.outline;
      ctx.fillRect(sx - 5, sy - 4, 10, 1);
      ctx.fillRect(sx - 5, sy + 3, 10, 1);
    } else {
      ctx.strokeStyle = COL.outline; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const ca = (i / 6) * TAU + d.x * 0.7;
        const r1 = d.r * 0.3, r2 = d.r * (0.7 + (i % 3) * 0.15);
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(ca) * r1, sy + Math.sin(ca) * r1 * 0.5);
        ctx.lineTo(sx + Math.cos(ca + 0.3) * r2, sy + Math.sin(ca + 0.3) * r2 * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // tehlike bölgeleri: yanıp sönen telegraf + havada uçan palet/banknot
  for (const h of Game.hazards) {
    const [sx, sy] = W2S(h.x, h.y);
    const k = clamp(h.t / h.warn, 0, 1);
    const blink = 0.35 + Math.sin(h.t * 18) * 0.2;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.strokeStyle = h.kind === 'pallet' ? COL.orange : COL.green;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy, h.r, h.r * 0.55, 0, 0, TAU); ctx.stroke();
    // dolan iç halka: düşme anını gösterir
    ctx.globalAlpha = blink * 0.55;
    ctx.fillStyle = h.kind === 'pallet' ? COL.orange : COL.green;
    ctx.beginPath(); ctx.ellipse(sx, sy, h.r * k, h.r * 0.55 * k, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // uçan nesne
    const fx = lerp(h.x0, h.x, k), fy = lerp(h.y0, h.y, k) - (h.kind === 'pallet' ? Math.sin(k * Math.PI) * 42 : 0);
    const [ax, ay] = W2S(fx, fy);
    const img = h.kind === 'pallet' ? SPR.pallet : SPR.bill;
    ctx.drawImage(img, ax - (img.width >> 1), ay - (img.height >> 1));
  }

  // düşman şok halkaları (patron slam'i)
  for (const r of Game.eRings) {
    const [sx, sy] = W2S(r.x, r.y);
    ctx.save();
    ctx.globalAlpha = clamp(1 - r.r / r.maxR, 0.2, 0.85);
    ctx.strokeStyle = COL.orange; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, r.r, r.r * 0.6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = COL.red; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy, r.r - 3, (r.r - 3) * 0.6, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // cesetler (yere serilip kaybolur)
  for (const c of Game.corpses) {
    const [sx, sy] = W2S(c.x, c.y);
    if (sx < -30 || sx > 510 || sy < -30 || sy > 300) continue;
    const k = 1 - c.t / 0.45;
    const spr = SPR.bosses[c.typeId] || SPR.enemies[c.typeId];
    const v = c.flip ? spr.frames[0].f : spr.frames[0].n;
    const w = spr.w * c.scale, h = Math.max(2, spr.h * c.scale * Math.max(0.15, k));
    ctx.save();
    ctx.globalAlpha = k * 0.8;
    ctx.drawImage(v, Math.round(sx - w / 2), Math.round(sy - h), w, h);
    ctx.restore();
  }

  // ambiyans: robot süpürgeler (zeminde dolaşır)
  for (const a of Game.ambients) {
    const [sx, sy] = W2S(a.x, a.y);
    if (sx < -20 || sx > 500 || sy < -20 || sy > 290) continue;
    drawShadow(ctx, sx, sy + 1, 5, 2);
    ctx.drawImage(a.dir > 0 ? SPR.roomba.n : SPR.roomba.f, sx - 5, sy - 6);
    // led ışığı yanıp söner
    if (((a.t * 3) | 0) % 2 === 0) {
      ctx.fillStyle = COL.teal;
      ctx.fillRect(sx + (a.dir > 0 ? 2 : -3), sy - 4, 1, 1);
    }
  }

  // buhar bulutları (zeminde)
  for (const cl of Game.clouds) {
    const [sx, sy] = W2S(cl.x, cl.y);
    const pulse = 1 + Math.sin(cl.t * 5) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.3 * Math.min(1, (cl.dur - cl.t) * 2);
    ctx.fillStyle = COL.grey;
    ctx.beginPath(); ctx.ellipse(sx, sy, cl.r * pulse, cl.r * 0.65 * pulse, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = COL.greyLight;
    ctx.beginPath(); ctx.ellipse(sx, sy - 2, cl.r * 0.6, cl.r * 0.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // supleks / patlama şok halkaları
  for (const sh of Game.shocks) {
    const [sx, sy] = W2S(sh.x, sh.y);
    const pr = sh.r * Math.min(1, sh.t / 0.22);
    ctx.save();
    ctx.globalAlpha = 1 - sh.t / 0.3;
    ctx.strokeStyle = COL.white; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, pr, pr * 0.6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = sh.col || COL.red; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy, pr * 0.8, pr * 0.48, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // ses halkaları
  for (const r of Game.rings) {
    if (r.delay > 0) continue;
    const [sx, sy] = W2S(r.x, r.y);
    ctx.save();
    ctx.globalAlpha = clamp(1 - r.r / r.maxR, 0.15, 0.8);
    ctx.strokeStyle = COL.purple; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, r.r, r.r * 0.7, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = COL.pink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy, r.r - 3, (r.r - 3) * 0.7, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // geğirti konisi
  for (const cn of Game.cones) {
    const [sx, sy] = W2S(cn.x, cn.y);
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - cn.t / 0.25);
    ctx.fillStyle = COL.green;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, cn.range, cn.ang - cn.arc / 2, cn.ang + cn.arc / 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // toplanabilirler
  for (const pk of Game.pickups) {
    const [sx, sy] = W2S(pk.x, pk.y);
    if (sx < -20 || sx > 500 || sy < -20 || sy > 290) continue;
    const bob = Math.sin(pk.t * 4 + pk.x) * 1.5;
    if (pk.type === 'chip') {
      const img = pk.value >= 5 ? SPR.chipGold : SPR.chip;
      ctx.drawImage(img, sx - 3, sy - 4 + bob);
    } else if (pk.type === 'coin') {
      ctx.drawImage(SPR.coin, sx - 3, sy - 5 + bob);
    } else if (pk.type === 'heart') {
      ctx.drawImage(SPR.heart, sx - 4, sy - 5 + bob);
    } else if (pk.type === 'magnet' || pk.type === 'bomb' || pk.type === 'shield' || pk.type === 'turbo') {
      // güçlendirmeler: parlayan halka + ikon
      const spr = pk.type === 'magnet' ? SPR.pkMagnet : pk.type === 'bomb' ? SPR.pkBomb
                : pk.type === 'shield' ? SPR.pkShield : SPR.pkTurbo;
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(pk.t * 6) * 0.15;
      ctx.strokeStyle = COL.white;
      ctx.beginPath(); ctx.ellipse(sx, sy - 3, 7, 5, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.drawImage(spr, sx - 3, sy - 6 + bob);
    } else if (pk.type === 'chest') {
      drawShadow(ctx, sx, sy + 2, 9, 3);
      const glow = 0.5 + Math.sin(pk.t * 5) * 0.3;
      ctx.save();
      ctx.globalAlpha = glow * 0.35;
      ctx.fillStyle = COL.yellow;
      ctx.beginPath(); ctx.ellipse(sx, sy - 5, 14, 10, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.drawImage(SPR.chest, sx - 9, sy - 11 + bob * 0.5);
    }
  }

  // oyuncu art izleri (dash/turbo silüetleri)
  for (const ai of Game.afterimgs) {
    const [sx, sy] = W2S(ai.x, ai.y);
    const k = 1 - ai.t / 0.22;
    drawSpr(ctx, SPR.chars[ai.charId], ai.frame, sx, sy + 1, { flip: ai.flip, alpha: k * 0.35 });
  }

  // y'ye göre sıralanmış varlıklar (düşmanlar + oyuncu)
  const drawables = [];
  for (const e of Game.enemies) drawables.push({ y: e.y, e });
  drawables.push({ y: p.y, player: true });
  drawables.sort((a, b) => a.y - b.y);

  for (const d of drawables) {
    if (d.player) { drawPlayerSprite(ctx); continue; }
    const e = d.e;
    const [sx, sy] = W2S(e.x, e.y);
    if (sx < -30 || sx > 510 || sy < -30 || sy > 300) continue;

    // kırılabilir nesneler: kendi sprite'ları
    if (e.type.breakable) {
      const bs = SPR.breakables[e.type.sprite];
      drawShadow(ctx, sx, sy, 7, 2.6);
      const pop = e.popT > 0 ? Math.round(e.popT * 22) : 0;
      const img = e.flash > 0 ? bs.w : bs.n;
      ctx.drawImage(img, Math.round(sx - img.width / 2 - pop / 2), Math.round(sy - img.height - pop),
        img.width + pop, img.height + pop);
      continue;
    }

    const spr = e.type.big ? SPR.bosses[e.typeId] : SPR.enemies[e.typeId];
    const baseSc = e.type.big ? e.type.sprScale : e.type.scale;
    const sc = baseSc * (1 + (e.popT > 0 ? e.popT * 1.7 : 0));

    // doğuş telegrafı: hayalet + ünlem
    if (e.spawnT > 0) {
      const k = clamp(1 - e.spawnT / 0.55, 0, 1);
      drawShadow(ctx, sx, sy, 6 * sc * k, 2.4 * sc * k);
      drawSpr(ctx, spr, 0, sx, sy + 1, { flip: e.flip, scale: sc, alpha: 0.2 + k * 0.4 });
      drawText(ctx, '!', sx - 2, sy - spr.h * sc - 10, COL.yellow,
        { shadow: COL.outline, alpha: 0.5 + Math.sin(Game.time * 14) * 0.4 });
      continue;
    }

    // fenomen aurası
    if (e.type.aura) {
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(e.animT * 4) * 0.08;
      ctx.strokeStyle = COL.pink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(sx, sy, e.type.aura.r, e.type.aura.r * 0.6, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    drawShadow(ctx, sx, sy, 6 * sc, 2.4 * sc);
    // supleks zıplaması: havaya fırlar
    const bounce = e.bounceT > 0 ? Math.round(Math.sin((1 - e.bounceT / 0.35) * Math.PI) * 7) : 0;
    // elit/boss parlaması: arkadan nabız gibi atan hale (öfkede hızlı ve güçlü)
    if (e.type.elite || e.type.boss) {
      const ga = (e.enraged ? 0.24 : 0.14) + Math.sin(e.animT * (e.enraged ? 9 : 5)) * 0.08;
      const gv = e.flip ? spr.frames[0].wf : spr.frames[0].wn;
      const gw = spr.w * sc, gh = spr.h * sc;
      ctx.save();
      ctx.globalAlpha = ga;
      for (const [ox, oy2] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        ctx.drawImage(gv, Math.round(sx - gw / 2 + ox), Math.round(sy - gh + oy2 - bounce), gw, gh);
      }
      ctx.restore();
    }
    const frame = e.stun > 0 ? 0 : ((e.animT * 7) | 0) % 2;
    const fuseFlash = e.fuseT >= 0 && ((e.fuseT * 14) | 0) % 2 === 0;
    // gece müşterisi: yarı saydam, hayalet gibi titrer
    const gAlpha = e.type.ghostly ? 0.6 + Math.sin(e.animT * 13) * 0.18 : undefined;
    drawSpr(ctx, spr, frame, sx, sy + 1 - bounce,
      { flip: e.flip, scale: sc, white: e.flash > 0 || fuseFlash, alpha: gAlpha });
    if (e.stun > 0) {
      drawText(ctx, '?', sx - 2, sy - spr.h * sc - 8, COL.yellow, { shadow: COL.outline });
    }
    // atılış telegrafı: kırmızı ünlem
    if (e.windT > 0) {
      drawText(ctx, '!', sx - 2, sy - spr.h * sc - 8, COL.red, { shadow: COL.outline });
    }
    // masa şoku telegrafı: büyüyen turuncu ikaz halkası
    if (e.slamWindT > 0 && e.type.slam) {
      const k = 1 - e.slamWindT / e.type.slam.wind;
      const wr = 12 + e.type.slam.maxR * 0.5 * k;
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(Game.time * 20) * 0.18;
      ctx.strokeStyle = COL.orange; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(sx, sy, wr, wr * 0.6, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // elit/boss can barı
    if ((e.type.elite || e.type.boss) && e.hp < e.maxHp) {
      const bw = 16 * sc;
      ctx.fillStyle = COL.outline; ctx.fillRect(sx - bw / 2, sy + 3, bw, 3);
      ctx.fillStyle = COL.red; ctx.fillRect(sx - bw / 2 + 1, sy + 4, (bw - 2) * (e.hp / e.maxHp), 1);
    }
  }

  // uçan koliler (evrimde gökten düşer)
  for (const b of Game.boxes) {
    const k = b.t / b.dur;
    let bx, by;
    if (b.sky) { bx = b.tx; by = lerp(b.ty - 90, b.ty, k * k); }
    else {
      bx = lerp(b.x0, b.tx, k);
      by = lerp(b.y0, b.ty, k) - Math.sin(k * Math.PI) * 24;
    }
    const [sx, sy] = W2S(bx, by);
    const [tx2, ty2] = W2S(b.tx, b.ty);
    drawShadow(ctx, tx2, ty2, 5, 2);
    ctx.drawImage(SPR.minibox, sx - 4, sy - 4);
  }

  // arabalar
  for (const c of Game.cars) {
    const [sx, sy] = W2S(c.x, c.y);
    drawShadow(ctx, sx, sy + 2, 15, 4);
    ctx.drawImage(c.dir > 0 ? SPR.car.n : SPR.car.f, sx - 16, sy - 15);
  }

  // düşman mermileri: koli / dönen yıldız / banknot
  for (const s of Game.eShots) {
    const [sx, sy] = W2S(s.x, s.y);
    if (s.spr === 'star') {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(s.t * 7);
      ctx.drawImage(SPR.star, -3, -3);
      ctx.restore();
    } else if (s.spr === 'bill') {
      ctx.drawImage(SPR.bill, sx - 4, sy - 2 + Math.sin(s.t * 9) * 1.5);
    } else {
      ctx.drawImage(SPR.minibox, sx - 4, sy - 3);
    }
  }

  // oyuncu mermileri: zımba telleri + mailler
  for (const pr of Game.projs) {
    const [sx, sy] = W2S(pr.x, pr.y);
    if (pr.type === 'staple') {
      ctx.fillStyle = COL.greyLight; ctx.fillRect(sx - 1, sy - 1, 3, 2);
      ctx.fillStyle = COL.white; ctx.fillRect(sx, sy - 1, 1, 1);
    } else {
      ctx.drawImage(SPR.mail, sx - 4, sy - 3);
    }
  }

  // devriye paspasları
  const mopW = p.weapons.find(w => w.id === 'mop');
  if (mopW) {
    const ms = weaponStats(p, mopW);
    const mopCount = 1 + (mopW.lvl >= 4 ? 1 : 0) + (mopW.lvl >= 6 ? 1 : 0);
    const [px2, py2] = W2S(p.x, p.y);
    for (let i = 0; i < mopCount; i++) {
      const a = mopW.angle + (i / mopCount) * TAU;
      const mx = px2 + Math.cos(a) * ms.orbitR;
      const my = py2 - 6 + Math.sin(a) * ms.orbitR * 0.7;
      ctx.strokeStyle = COL.brown; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px2, py2 - 8); ctx.lineTo(mx, my); ctx.stroke();
      ctx.drawImage(SPR.mop, Math.round(mx - 3), Math.round(my - 3));
    }
  }

  // drone'lar
  const droneCount = p.items['drone'] || 0;
  for (let i = 0; i < droneCount; i++) {
    const a = p.droneAngle + (i / droneCount) * TAU;
    const [sx, sy] = W2S(p.x + Math.cos(a) * 26, p.y - 8 + Math.sin(a) * 26);
    ctx.drawImage(SPR.drone, sx - 4, sy - 3 + Math.sin(Game.time * 6 + i) * 1.5);
  }

  // parçacıklar
  for (const pt of Game.parts) {
    const [sx, sy] = W2S(pt.x, pt.y);
    const k = 1 - pt.t / pt.dur;
    ctx.save();
    ctx.globalAlpha = k;
    if (pt.type === 'puff') {
      ctx.fillStyle = pt.col;
      const r = Math.max(0.5, pt.size * k + 0.5);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    } else if (pt.type === 'px') {
      ctx.fillStyle = pt.col;
      ctx.fillRect(sx, sy, pt.size, pt.size);
    } else if (pt.type === 'note') {
      drawText(ctx, '♪', sx, sy, pt.col, { shadow: COL.outline });
    } else if (pt.type === 'spark') {
      ctx.fillStyle = pt.col;
      ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3);
    } else if (pt.type === 'ghost') {
      // yükselen müşteri ruhu: hafif sağa sola salınır
      const wob = Math.sin(pt.t * 9) * 2;
      ctx.globalAlpha = k * 0.75;
      ctx.drawImage(SPR.ghost, Math.round(sx + wob) - 3, sy - 4);
    } else if (pt.type === 'crit') {
      // kritik çakması: büyüyen 4 kollu yıldız
      const r = pt.size * (0.4 + (1 - k) * 1.2);
      ctx.fillStyle = pt.col;
      ctx.fillRect(sx - r, sy, r * 2 + 1, 1);
      ctx.fillRect(sx, sy - r, 1, r * 2 + 1);
      ctx.fillStyle = COL.white;
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
    }
    ctx.restore();
  }

  // seviye atlama ışık huzmeleri (varlıkların üstünde parlar)
  for (const b of Game.beams) {
    const [sx, sy] = W2S(b.x, b.y);
    const k = 1 - b.t / 0.6;
    const w = 5 + k * 9;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = k * 0.5;
    const g = ctx.createLinearGradient(0, sy - 130, 0, sy);
    g.addColorStop(0, 'rgba(44,232,245,0)');
    g.addColorStop(1, 'rgba(44,232,245,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(sx - w / 2), sy - 130, Math.round(w), 130);
    ctx.globalAlpha = k * 0.8;
    ctx.fillStyle = 'rgba(244,244,248,0.8)';
    ctx.fillRect(Math.round(sx - 1), sy - 110, 2, 110);
    ctx.restore();
  }

  // hasar yazıları (büyük vuruşlar 2x altın yazı)
  for (const f of Game.floats) {
    const [sx, sy] = W2S(f.x, f.y);
    drawText(ctx, f.txt, sx, sy, f.col,
      { align: 'center', shadow: COL.outline, alpha: clamp(1.2 - f.t, 0, 1), scale: f.big ? 2 : 1 });
  }
}

function drawPlayerSprite(ctx) {
  const p = Game.player;
  const sx = Math.round(p.x - Game.camX + 240);
  const sy = Math.round(p.y - Game.camY + 135);

  // seviye aurası: SV10+ hafif, SV20+ güçlü halka
  if (Game.level >= 10) {
    const strong = Game.level >= 20;
    ctx.save();
    ctx.globalAlpha = (strong ? 0.3 : 0.16) + Math.sin(Game.time * 4) * 0.06;
    ctx.strokeStyle = p.def.color; ctx.lineWidth = 1;
    const ar = 12 + Math.sin(Game.time * 3) * 1.5;
    ctx.beginPath(); ctx.ellipse(sx, sy, ar, ar * 0.45, 0, 0, TAU); ctx.stroke();
    if (strong) {
      ctx.globalAlpha *= 0.7;
      ctx.strokeStyle = COL.white;
      ctx.beginPath(); ctx.ellipse(sx, sy, ar + 3, (ar + 3) * 0.45, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  drawShadow(ctx, sx, sy, 6, 2.4);

  // kalkan baloncuğu
  if (p.shieldT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, p.shieldT) * (0.5 + Math.sin(Game.time * 8) * 0.15);
    ctx.strokeStyle = COL.teal; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy - 8, 12, 13, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = COL.teal;
    ctx.beginPath(); ctx.ellipse(sx, sy - 8, 12, 13, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // yanıp sönme (hasar dokunulmazlığı)
  if (p.invuln > 0 && p.turboT <= 0 && !p.dashS && ((p.invuln * 12) | 0) % 2 === 0 && p.hp > 0) return;
  const frame = p.moving ? ((p.animT * 9) | 0) % 2 : 0;
  const bob = p.moving ? 0 : Math.round(Math.sin(Game.time * 3) * 0.8);
  const py = sy + 1 + bob;

  // ── gövde + baret: yöne eğilme ve dönüş büzüşmesiyle çizilir ──
  const turnK = p.turnT > 0 ? Math.sin((p.turnT / 0.12) * Math.PI) : 0;
  ctx.save();
  ctx.translate(sx, py);
  if (Math.abs(p.lean) > 0.004) ctx.rotate(p.lean);
  if (turnK > 0.01) ctx.scale(1 - turnK * 0.35, 1);
  drawSpr(ctx, SPR.chars[p.charId], frame, 0, 0, { flip: p.flip, white: p.hurtFlash > 0.15 });
  const top = -17;   // sprite üst kenarı (yerel koordinat)

  // iş güvenliği: sarı baret (SV3+ ışıklı)
  if (p.items['sigorta']) {
    ctx.fillStyle = COL.gold;
    ctx.fillRect(-4, top, 8, 2);
    ctx.fillRect(-6, top + 2, 12, 1);
    ctx.fillStyle = COL.yellow;
    ctx.fillRect(-2, top, 4, 1);
    if (p.items['sigorta'] >= 3 && ((Game.time * 2) | 0) % 2) {
      ctx.fillStyle = COL.red; ctx.fillRect(-1, top - 1, 2, 1);
    }
  }
  // robot kol: omuzda duran mekanik kol (yumruk dışarıda çizilir)
  if (p.items['robotkol'] && !p.armAnim) {
    const side = p.flip ? -1 : 1;
    const ax = side * 7, ay = -9;
    ctx.fillStyle = COL.greyDark; ctx.fillRect(ax - 1, ay - 2, 3, 6);
    ctx.fillStyle = COL.grey; ctx.fillRect(ax, ay - 2, 2, 5);
    ctx.fillStyle = COL.teal; ctx.fillRect(ax, ay, 1, 1);
    if (p.items['robotkol'] >= 3) { ctx.fillStyle = COL.greyLight; ctx.fillRect(ax - 1, ay + 4, 4, 2); }
  }
  ctx.restore();

  // robot kol yumruğu: dünya hedefine uzanır (dönüşten etkilenmez)
  if (p.items['robotkol'] && p.armAnim) {
    const side = p.flip ? -1 : 1;
    const ax = sx + side * 7, ay = py - 9;
    const k = Math.sin((p.armAnim.t / 0.16) * Math.PI);
    const tx2 = Math.round(p.armAnim.tx - Game.camX + 240);
    const ty2 = Math.round(p.armAnim.ty - Game.camY + 135);
    const hx = Math.round(lerp(ax, tx2, k)), hy = Math.round(lerp(ay, ty2, k));
    ctx.strokeStyle = COL.grey; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = COL.greyLight; ctx.fillRect(hx - 2, hy - 2, 4, 4);
    ctx.fillStyle = COL.teal; ctx.fillRect(hx - 1, hy - 1, 2, 2);
  }
  // bayat kahve: koşarken hız çizgileri
  if (p.items['kahve'] >= 2 && p.moving && Math.random() < 0.06 * p.items['kahve']) {
    addPart({ x: p.x - (p.flip ? -8 : 8), y: p.y - rand(4, 12), vx: (p.flip ? 30 : -30), vy: 0,
      dur: 0.25, type: 'spark', col: COL.white });
  }
  // satış primi: altın parıltı
  if (p.items['prim'] && Math.random() < 0.02 * p.items['prim']) {
    addPart({ x: p.x + rand(-6, 6), y: p.y - rand(10, 18), vx: 0, vy: -8,
      dur: 0.5, type: 'spark', col: COL.gold });
  }
  // Erkan'ın buharı: hafif ambiyans
  if (p.charId === 'erkan' && Math.random() < 0.03) {
    addPart({ x: p.x + (p.flip ? -7 : 7), y: p.y - 14, vx: rand(-4, 4), vy: -10, dur: 1.2, type: 'puff', col: COL.greyLight, size: 2 });
  }
}
