'use strict';
// ─── SKİLL ATÖLYESİ (yerel "akıllı ayrıştırıcı") — MİNİK KANIT ───
// Oyuncu serbest Türkçe cümle yazar; burada niyeti çözüp küçük davranış
// atomlarını (şekil + yük + görsel) birleştirerek oynanabilir bir yetenek
// reçetesi (spec) üretiriz. Dış AI YOK: tamamen yerel, masrafsız, anında.
// Motor asla ham veriye güvenmez — tüm sayılar güvenli aralığa kırpılır.

// Kelime → atom sözlüğü (eşanlamlarla). Genişledikçe "her şeyi anlıyor" hissi artar.
const ATOM_WORDS = {
  // şekiller
  nova:  ['halka', 'patlama', 'patla', 'etraf', 'cevre', 'cevremdeki', 'dalga', 'nova', 'sarsinti'],
  cone:  ['koni', 'one', 'ileri', 'huni', 'onumdeki', 'yelpaze'],
  proj:  ['mermi', 'at', 'firlat', 'ok', 'fuze', 'roket', 'ates et', 'nisan'],
  // yükler
  knockback: ['savur', 'it', 'geri', 'ittir', 'firlat'],
  slow:      ['yavaslat', 'agirlastir', 'yavas'],
  stun:      ['dondur', 'sersemlet', 'uyustur', 'dondurucu', 'donduran', 'buz', 'donsun'],
  // renk temaları
  ates:  ['ates', 'alev', 'yak', 'yaksin', 'yangin', 'kor'],
  buz:   ['buz', 'soguk', 'donduran', 'kar', 'ayaz'],
  zehir: ['zehir', 'gaz', 'asit', 'zehirli', 'toksik'],
  sok:   ['sok', 'elektrik', 'yildirim', 'simsek'],
  // büyüklük / hız değiştiriciler
  buyuk: ['buyuk', 'guclu', 'dev', 'kocaman', 'muazzam', 'sert'],
  hizli: ['hizli', 'sik', 'cabuk', 'seri'],
  yavasCd: ['agir', 'guclu ama', 'nadir']
};

// Türkçe karakterleri sadeleştir (eşleşme kolaylığı) — ç,ğ,ı,ö,ş,ü → c,g,i,o,s,u
function forgeNorm(s) {
  return String(s).toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

function forgeClamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// Serbest metin → yetenek reçetesi (spec). Tanınan hiçbir kelime yoksa unknown.
function parseAbility(text) {
  const t = ' ' + forgeNorm(text) + ' ';
  const hit = key => ATOM_WORDS[key].some(w => t.indexOf(w) >= 0);
  const matched = [];

  // ── şekil ── (öncelik: koni > mermi > nova; hiçbiri yoksa nova varsayılan)
  let shape = 'nova';
  if (hit('cone')) { shape = 'cone'; matched.push('koni'); }
  else if (hit('proj')) { shape = 'proj'; matched.push('mermi'); }
  else if (hit('nova')) { shape = 'nova'; matched.push('halka'); }

  // ── görsel/renk teması ──
  let colName = 'white', theme = '';
  if (hit('ates')) { colName = 'orange'; theme = 'ateş'; }
  else if (hit('buz')) { colName = 'teal'; theme = 'buz'; }
  else if (hit('zehir')) { colName = 'green'; theme = 'zehir'; }
  else if (hit('sok')) { colName = 'yellow'; theme = 'şok'; }
  if (theme) matched.push(theme);

  // ── yükler ── (hasar hep var; ekstralar üstüne biner)
  const payloads = [];
  if (hit('stun')) { payloads.push('stun'); matched.push('dondur'); }
  if (hit('knockback')) { payloads.push('knockback'); matched.push('savur'); }
  if (hit('slow')) { payloads.push('slow'); matched.push('yavaşlat'); }
  // buz teması otomatik hafif yavaşlatır (his tutarlılığı)
  if (theme === 'buz' && payloads.indexOf('slow') < 0) payloads.push('slow');

  // ── büyüklük / hız çarpanları ──
  let mag = 1, cdMul = 1;
  if (hit('buyuk')) { mag = 1.4; matched.push('büyük'); }
  if (hit('hizli')) { cdMul *= 0.7; matched.push('hızlı'); }
  if (hit('yavasCd')) cdMul *= 1.3;

  // ── temel parametreler (şekle göre) + güvenli kırpma ──
  let dmg, radius, range, count, cd;
  if (shape === 'nova') {
    dmg = forgeClamp(Math.round(26 * mag), 12, 70);
    radius = forgeClamp(Math.round(48 * mag), 30, 80);
    cd = forgeClamp(+(8 * cdMul).toFixed(1), 5, 13);
  } else if (shape === 'cone') {
    dmg = forgeClamp(Math.round(24 * mag), 12, 70);
    range = forgeClamp(Math.round(70 * mag), 40, 110);
    cd = forgeClamp(+(7 * cdMul).toFixed(1), 4, 12);
  } else { // proj
    dmg = forgeClamp(Math.round(18 * mag), 10, 55);
    count = forgeClamp(hit('buyuk') ? 4 : 3, 1, 6);
    cd = forgeClamp(+(5 * cdMul).toFixed(1), 3, 10);
  }

  // ── isim: temayı ve şekli yansıtan mizahi otomatik ad ──
  const shapeName = shape === 'nova' ? 'PATLAMA' : shape === 'cone' ? 'DALGA' : 'ATIŞ';
  const themeName = theme ? theme.toLocaleUpperCase('tr-TR') + ' ' : '';
  const name = (themeName + shapeName).slice(0, 16);

  return {
    shape, dmg, radius, range, count, cd, colName,
    stun: payloads.indexOf('stun') >= 0 ? forgeClamp(0.8 * mag, 0.5, 2) : 0,
    kb: payloads.indexOf('knockback') >= 0 ? Math.round(260 * mag) : 60,
    slow: payloads.indexOf('slow') >= 0 ? 0.5 : 0,
    payloads, name, matched,
    unknown: matched.length === 0
  };
}

// Yeteneğin insan-okunur özeti (UI'da gösterilir)
function specSummary(spec) {
  const sh = spec.shape === 'nova' ? 'ETRAFA HALKA' : spec.shape === 'cone' ? 'ÖNE KONİ' : ('ÖNE ' + spec.count + ' MERMİ');
  const yuk = ['HASAR'].concat(
    spec.payloads.map(pl => pl === 'stun' ? 'DONDUR' : pl === 'knockback' ? 'SAVUR' : 'YAVAŞLAT')
  ).join('+');
  const renk = { orange: 'ATEŞ', teal: 'BUZ', green: 'ZEHİR', yellow: 'ŞOK', white: 'SADE' }[spec.colName];
  return 'ŞEKİL: ' + sh + ' · YÜK: ' + yuk + ' · TEMA: ' + renk + ' · BEKLEME: ' + spec.cd + 'sn';
}

// ── Genel yorumlayıcı: reçeteyi mevcut motor primitifleriyle çalıştırır ──
function runAbility(spec, p) {
  const col = COL[spec.colName] || COL.white;

  if (spec.shape === 'nova') {
    Game.shocks.push({ x: p.x, y: p.y - 6, r: spec.radius, t: 0, col });
    Game.shake = Math.max(Game.shake, 3);
    for (const e of Game.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      if (dist2(p.x, p.y, e.x, e.y) < spec.radius * spec.radius) {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        damageEnemy(e, spec.dmg, Math.cos(a) * spec.kb, Math.sin(a) * spec.kb);
        forgeApplyPayloads(spec, e);
      }
    }
    const n = Math.round(spec.radius / 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(0.4);
      addPart({ x: p.x + Math.cos(a) * spec.radius * 0.7, y: p.y - 4 + Math.sin(a) * spec.radius * 0.4,
        vx: Math.cos(a) * rand(25, 55), vy: -rand(10, 45), dur: 0.4, type: 'puff', col, size: 3 });
    }
    Sfx.play('suplex');

  } else if (spec.shape === 'cone') {
    let fx = p.facing.x, fy = p.facing.y;
    if (!fx && !fy) fx = p.flip ? -1 : 1;
    const ang = Math.atan2(fy, fx), arc = 1.2;
    Game.cones.push({ x: p.x, y: p.y - 6, ang, range: spec.range, arc, t: 0, col });
    for (const e of Game.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      if (dist2(p.x, p.y, e.x, e.y) > spec.range * spec.range) continue;
      const ea = Math.atan2(e.y - p.y, e.x - p.x);
      let diff = Math.abs(ea - ang);
      if (diff > Math.PI) diff = TAU - diff;
      if (diff < arc / 2) {
        damageEnemy(e, spec.dmg, Math.cos(ea) * spec.kb, Math.sin(ea) * spec.kb);
        forgeApplyPayloads(spec, e);
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = ang + rand(-arc / 2, arc / 2), sp = rand(50, 120);
      addPart({ x: p.x, y: p.y - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dur: 0.35, type: 'puff', col, size: 2 });
    }
    Sfx.play('burp');

  } else { // proj
    let fx = p.facing.x, fy = p.facing.y;
    if (!fx && !fy) fx = p.flip ? -1 : 1;
    // en yakın düşmana nişan al, yoksa bakılan yön
    let best = null, bd = 220 * 220;
    for (const e of Game.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d = dist2(p.x, p.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    const base = best ? Math.atan2(best.y - 6 - (p.y - 8), best.x - p.x) : Math.atan2(fy, fx);
    for (let i = 0; i < spec.count; i++) {
      const a = base + (i - (spec.count - 1) / 2) * 0.16;
      Game.projs.push({ type: 'staple', x: p.x, y: p.y - 8,
        vx: Math.cos(a) * 210, vy: Math.sin(a) * 210,
        dmg: spec.dmg, pierce: 2, hit: new Set(), t: 0,
        forge: spec, col });
    }
    Sfx.play('zimba');
  }
  addFloat(p.x, p.y - 26, spec.name + '!', col, true);
}

// Yükleri tek bir düşmana uygula (nova/cone doğrudan; proj çarpışmada çağırır)
function forgeApplyPayloads(spec, e) {
  if (spec.stun) e.stun = Math.max(e.stun, spec.stun);
  if (spec.slow) { Game.slowT = Math.max(Game.slowT, 2.5); Game.slowK = 1 - spec.slow; }
}

// ── Kalıcılık: son üretilen yetenek (Meta.load/save kalıbı) ──
const Forge = {
  data: {},        // { ability: spec }
  input: '',       // atölye metin kutusu içeriği

  load() {
    try { this.data = JSON.parse(localStorage.getItem('rs_forge') || '{}'); }
    catch (e) { this.data = {}; }
  },
  save() {
    try { localStorage.setItem('rs_forge', JSON.stringify(this.data)); } catch (e) {}
  }
};
