'use strict';
// ═══════════════ KARAKTER ATÖLYESİ ═══════════════
// Oyuncu kendi karakterini YOKTAN yaratır: her piksel elle boyanabilir,
// istersen cümleyle tarif et ("kırmızı saçlı, şapkalı, yeşil önlüklü") —
// sistem sana bir taslak çizsin, sen üstünde oyna. Statlarını dağıt,
// atölyede yarattığın yetenekleri tak, kaydet ve o karakterle oyna.
// Kaydedilen karakter, oyunun geri kalanına normal bir karakter gibi görünür.

// ── 24 renklik piksel paleti ──
const PX_CHARS = '0123456789abcdefghijklmn';
const PX_PAL = [
  'outline', 'navyDark', 'navy', 'greyDark', 'grey', 'greyLight', 'white',
  'skin', 'skinShade', 'brown', 'brownDark', 'hairDark',
  'red', 'redDark', 'orange', 'orangeDark', 'gold', 'yellow',
  'green', 'greenDark', 'teal', 'cyan', 'blueDark', 'purple'
];
// her rengin gölgesi (üniforma alt tonu için)
const PX_SHADE = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 3, 5: 4, 6: 4, 7: 8, 8: 10, 9: 10, 10: 0, 11: 0,
  12: 13, 13: 0, 14: 15, 15: 13, 16: 14, 17: 14, 18: 19, 19: 0, 20: 22, 21: 22, 22: 1, 23: 1 };
const PX_W = 14, PX_H = 17;
const CH = i => PX_CHARS[i] || '0';

function pxMap() {
  const m = {};
  for (let i = 0; i < PX_PAL.length; i++) m[PX_CHARS[i]] = COL[PX_PAL[i]] || '#ffffff';
  return m;
}

// Taban gövde: seçilen üniforma renginde chibi vücut (üstüne boyanacak tuval)
function baseBody(suitIdx, shadeIdx) {
  const S = CH(suitIdx), s = CH(shadeIdx === undefined ? PX_SHADE[suitIdx] : shadeIdx);
  const o = '0', k = '7', j = '8', e = '1';
  return [
    '..............',
    '...' + o.repeat(8) + '...',
    '..' + o + k.repeat(8) + o + '..',
    '.' + o + k.repeat(10) + o + '.',
    '.' + o + k.repeat(10) + o + '.',
    '.' + o + k + k + e + k + k + k + k + e + k + k + o + '.',
    '.' + o + k + k + e + k + k + k + k + e + k + k + o + '.',
    '.' + o + k.repeat(10) + o + '.',
    '..' + o + k + k + k + j + j + k + k + k + o + '..',
    '...' + o + k.repeat(6) + o + '...',
    '..' + o + S.repeat(8) + o + '..',
    '.' + o + S.repeat(10) + o + '.',
    '.' + o + k + S.repeat(8) + k + o + '.',
    '..' + o + S + s + S.repeat(4) + s + S + o + '..',
    '..' + o + s.repeat(8) + o + '..',
    '..' + o + e + e + o + '..' + o + e + e + o + '..',
    '..' + o.repeat(4) + '..' + o.repeat(4) + '..'
  ];
}

// ── Görünüş sözlüğü: cümleden taslak sprite üret ──
const LOOK_COLORS = {
  kirmizi: 12, kizil: 12, mavi: 2, lacivert: 22, yesil: 18, sari: 17, turuncu: 14,
  mor: 23, beyaz: 6, gri: 4, siyah: 0, turkuaz: 20, camgobegi: 21, altin: 16,
  kahverengi: 9, pembe: 23
};
const LOOK_WORDS = {
  sac: ['sac', 'sacli', 'perma', 'kakul', 'saclari'],
  kel: ['kel', 'dazlak', 'sacsiz'],
  sapka: ['sapka', 'sapkali', 'kask', 'kaskli', 'bere', 'kep', 'tac', 'kasket', 'migfer'],
  gozluk: ['gozluk', 'gozluklu', 'siperlik'],
  sakal: ['sakal', 'sakalli', 'biyik', 'biyikli'],
  pelerin: ['pelerin', 'pelerinli', 'kaftan', 'panco'],
  zirh: ['zirh', 'zirhli', 'plaka', 'gogusluk'],
  robot: ['robot', 'android', 'makine', 'siborg']
};

function looksHas(t, key) {
  const words = t.split(/\s+/);
  for (const w of LOOK_WORDS[key] || []) {
    for (const x of words) if (x === w || (w.length >= 3 && x.startsWith(w))) return true;
  }
  return false;
}

// "kırmızı saçlı" → saç rengi kırmızı (niteleyici solunda aranır)
function lookColorNear(t, key) {
  const words = t.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    let hit = false;
    for (const w of LOOK_WORDS[key] || []) {
      if (words[i] === w || (w.length >= 3 && words[i].startsWith(w))) { hit = true; break; }
    }
    if (!hit) continue;
    for (let j = Math.max(0, i - 2); j < i; j++) {
      for (const c in LOOK_COLORS) if (words[j].startsWith(c)) return LOOK_COLORS[c];
    }
  }
  return -1;
}

// Cümle → 14x17 piksel ızgara (taslak; oyuncu sonra elle bozar)
function parseLook(text) {
  const t = forgeNorm(text || '');
  const hairC = lookColorNear(t, 'sac');
  const hatC = lookColorNear(t, 'sapka');
  const capeC = lookColorNear(t, 'pelerin');
  // üniforma rengi: saça/şapkaya/pelerine ait olmayan ilk renk
  let suit = 12;
  for (const c in LOOK_COLORS) {
    if (!t.includes(c)) continue;
    const v = LOOK_COLORS[c];
    if (v === hairC || v === hatC || v === capeC) continue;
    suit = v; break;
  }
  if (looksHas(t, 'robot')) suit = 3;

  const rows = baseBody(suit).map(r => r.split(''));
  const put = (y, x, ch) => { if (y >= 0 && y < PX_H && x >= 0 && x < PX_W) rows[y][x] = ch; };

  if (!looksHas(t, 'kel')) {                         // saç
    const hc = CH(hairC >= 0 ? hairC : 11);
    for (let x = 3; x <= 10; x++) put(2, x, hc);
    for (let x = 2; x <= 11; x++) put(3, x, hc);
    if (t.includes('uzun sac')) for (let y = 4; y <= 9; y++) { put(y, 1, hc); put(y, 12, hc); }
  }
  if (looksHas(t, 'sapka')) {                        // şapka / kask / taç
    const kc = CH(hatC >= 0 ? hatC : 18);
    for (let x = 2; x <= 11; x++) put(1, x, kc);
    for (let x = 1; x <= 12; x++) put(2, x, kc);
    for (let x = 0; x <= 13; x++) put(3, x, '0');
  }
  if (looksHas(t, 'gozluk')) {                       // gözlük
    for (const x of [3, 4, 5, 8, 9, 10]) put(5, x, '0');
    put(6, 3, '6'); put(6, 4, '6'); put(6, 9, '6'); put(6, 10, '6');
    put(5, 6, '0'); put(5, 7, '0');
  }
  if (looksHas(t, 'sakal')) {                        // sakal / bıyık
    for (let x = 3; x <= 10; x++) put(8, x, 'b');
    for (let x = 4; x <= 9; x++) put(9, x, 'b');
  }
  if (looksHas(t, 'pelerin')) {                      // pelerin ("mor pelerinli" → mor)
    const pc = CH(capeC >= 0 ? capeC : (suit === 12 ? 23 : 12));
    for (let y = 10; y <= 14; y++) { put(y, 1, pc); put(y, 12, pc); }
    put(10, 2, pc); put(10, 11, pc);
  }
  if (looksHas(t, 'zirh')) {                         // göğüs zırhı
    for (let y = 11; y <= 13; y++) for (let x = 4; x <= 9; x++) put(y, x, '4');
    for (let x = 4; x <= 9; x++) put(11, x, '5');
  }
  if (looksHas(t, 'robot')) {                        // yüz ekranı + anten
    for (let y = 4; y <= 7; y++) for (let x = 3; x <= 10; x++) put(y, x, '1');
    for (const x of [4, 5, 8, 9]) { put(5, x, 'l'); put(6, x, 'l'); }
    put(0, 6, '0'); put(1, 6, 'l');
  }
  return rows.map(r => r.join(''));
}

// Boş tuval: her şeyi sıfırdan çizmek isteyenler için
function blankBody() {
  const rows = [];
  for (let y = 0; y < PX_H; y++) rows.push('.'.repeat(PX_W));
  return rows;
}

// ── sprite üretimi (motorun beklediği biçim) ──
// Editörde her karede çağrılıyor → aynı ızgara için sonucu önbellekle,
// yoksa kare başına 8 tuval üretip telefonu boğuyoruz.
const _sprCache = { key: null, spr: null };
function buildCustomSprite(px) {
  const key = px.join('|');
  if (_sprCache.key === key) return _sprCache.spr;
  const map = pxMap();
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = makeCanvas(PX_W, PX_H);
    gridPaint(c.getContext('2d'), px, map, 0, f);   // 2. kare 1px zıplar → yürüyüş
    frames.push(makeVariant(c));
  }
  const spr = { w: PX_W, h: PX_H, frames };
  _sprCache.key = key; _sprCache.spr = spr;
  return spr;
}

// ── Karakter deposu ──
const STAT_PTS = 6;                                  // dağıtılabilir puan
const CREATOR_WEAPONS = ['suplex', 'car', 'wave', 'burp', 'puff', 'box'];
const CREATOR_SKILLS = ['minder', 'elfren', 'akustik', 'sorubomb', 'vergi', 'sevkiyat'];

function newCharDraft() {
  return {
    id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
    name: '', look: '',
    px: baseBody(12),
    pts: { can: 2, hiz: 2, guc: 2 },
    weapon: 'suplex', skill: 'minder',
    abilities: []
  };
}

// taslak → oyunun CHARACTERS şeması
function charDefOf(c) {
  const i = PX_CHARS.indexOf(c.px[11] ? c.px[11][6] : 'c');
  const col = COL[PX_PAL[i >= 0 ? i : 12]] || COL.red;
  return {
    name: (c.name || 'İSİMSİZ').toLocaleUpperCase('tr-TR').slice(0, 12),
    title: 'KENDİ YARATTIĞIN',
    color: col,
    hp: 80 + c.pts.can * 15,
    speed: +(0.85 + c.pts.hiz * 0.075).toFixed(3),
    might: +(0.8 + c.pts.guc * 0.1).toFixed(2),
    weapon: c.weapon,
    passiveName: 'KENDİ YOLU',
    passiveDesc: 'ATÖLYEDE YARATTIĞIN YETENEKLER SENİN PASİFİN.',
    suit: col, suitShade: col,
    overlays: [],
    custom: true, srcId: c.id
  };
}

const Creator = {
  data: { chars: [] },
  draft: null, editIdx: -1, step: 0, palIdx: 12,
  undo: [],                                   // çizim geçmişi (en çok 40 adım)

  pushUndo(d) {
    if (!d || !d.px) return;
    this.undo.push(d.px.slice());
    if (this.undo.length > 40) this.undo.shift();
  },

  popUndo(d) {
    if (!d || !this.undo.length) return false;
    d.px = this.undo.pop();
    return true;
  },

  // ÜNİFORMA RENGİ: gövdedeki kıyafet pikselleri (ve gölgesi) yeni renge boyanır.
  // Elle yaptığın diğer çizimlere (saç, gözlük, pelerin) dokunmaz.
  recolorSuit(d, idx) {
    if (!d || !d.px) return;
    const oldS = d.px[11] ? d.px[11][6] : null;   // göğüs ortası = kıyafet rengi
    const oldSh = d.px[14] ? d.px[14][6] : null;  // etek/alt = gölge
    const newS = CH(idx), newSh = CH(PX_SHADE[idx] !== undefined ? PX_SHADE[idx] : idx);
    if (!oldS || oldS === '.') { d.px = baseBody(idx); return; }
    d.px = d.px.map(row => {
      let out = '';
      for (const ch of row) {
        if (ch === oldS) out += newS;
        else if (oldSh && oldSh !== '.' && oldSh !== oldS && ch === oldSh) out += newSh;
        else out += ch;
      }
      return out;
    });
  },

  load() {
    try {
      const raw = localStorage.getItem('rs_chars');
      const d = raw && JSON.parse(raw);
      if (d && Array.isArray(d.chars)) this.data.chars = d.chars;
    } catch (e) { /* bozuk kayıt → temiz başla */ }
    this.registerAll();
  },

  save() {
    try { localStorage.setItem('rs_chars', JSON.stringify(this.data)); } catch (e) { /* dolu */ }
  },

  // Özel karakterleri oyunun tablolarına yaz: bundan sonra normal karakter gibi davranırlar
  registerAll() { for (const c of this.data.chars) this.register(c); },

  register(c) {
    if (!c || !c.px || c.px.length !== PX_H) return;
    CHARACTERS[c.id] = charDefOf(c);
    TECHS[c.id] = { weapons: [c.weapon], skills: [c.skill] };
    if (typeof SPR !== 'undefined' && SPR.chars) SPR.chars[c.id] = buildCustomSprite(c.px);
  },

  ids() { return this.data.chars.map(c => c.id); },
  byId(id) { return this.data.chars.find(c => c.id === id); },

  commit() {
    const d = this.draft;
    if (!d) return false;
    if (!d.name) d.name = 'İSİMSİZ';
    if (this.editIdx >= 0 && this.data.chars[this.editIdx]) this.data.chars[this.editIdx] = d;
    else this.data.chars.push(d);
    this.register(d);
    this.save();
    return true;
  },

  remove(i) {
    const c = this.data.chars[i];
    if (!c) return;
    delete CHARACTERS[c.id];
    delete TECHS[c.id];
    if (typeof SPR !== 'undefined' && SPR.chars) delete SPR.chars[c.id];
    this.data.chars.splice(i, 1);
    this.save();
  },

  // Koşu başlarken karakterin yeteneklerini atölye slotlarına tak
  equipFor(charId) {
    const c = this.byId(charId);
    if (!c) return;
    Forge.data.equipped = [null, null, null];
    for (let i = 0; i < Math.min(3, (c.abilities || []).length); i++) {
      Forge.data.equipped[i] = c.abilities[i];
    }
    Forge.save();
  }
};

// ═══════════════ PAYLAŞIM ═══════════════
// Karakter ve yetenekler tek bir metin koduna dönüşür. Kodu arkadaşına yolla,
// o yapıştırsın → senin yarattığın karakteri (yetenekleriyle) oynasın.
// Böylece oyunun karakter/skill çeşitliliğini oyuncular büyütür.
const Share = {
  msg: '', msgT: -99,

  say(m) { this.msg = m; this.msgT = Game.uiT; },

  // Unicode-güvenli base64 (Türkçe harfler kod içinde geçebiliyor)
  enc(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return 'RS1' + btoa(bin).replace(/=+$/, '');
  },

  dec(code) {
    let s = String(code || '').trim();
    if (s.startsWith('RS1')) s = s.slice(3);
    s = s.replace(/\s+/g, '');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  },

  // paylaşımda gereksiz alanları at (matched/ignored yeniden üretilebilir)
  slim(s) {
    const o = {};
    for (const k in s) if (k !== 'matched' && k !== 'ignored') o[k] = s[k];
    return o;
  },

  // Karakter + kullandığı yetenekler tek pakette
  charCode(c) {
    const specs = (c.abilities || []).map(id => Forge.byId(id)).filter(Boolean).map(s => this.slim(s));
    return this.enc({ v: 1, c: { name: c.name, px: c.px, pts: c.pts, weapon: c.weapon, skill: c.skill }, a: specs });
  },

  copyChar(c) {
    const code = this.charCode(c);
    this.toClipboard(code);
    this.say('KOD KOPYALANDI (' + code.length + ' HARF) — ARKADAŞINA YOLLA!');
  },

  copySpec(spec) {
    const code = this.enc({ v: 1, a: [this.slim(spec)] });
    this.toClipboard(code);
    this.say('YETENEK KODU KOPYALANDI — ARKADAŞINA YOLLA!');
  },

  toClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text));
      } else this.fallbackCopy(text);
    } catch (e) { this.fallbackCopy(text); }
  },

  fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* olmadıysa kullanıcı elle kopyalar */ }
    document.body.removeChild(ta);
  },

  // Kodu içeri al: karakteri + yeteneklerini kütüphaneye ekler
  importCode(code) {
    let d;
    try { d = this.dec(code); } catch (e) { this.say('KOD OKUNAMADI — TAMAMINI YAPIŞTIRDIN MI?'); return false; }
    if (!d || (!d.c && !d.a)) { this.say('KOD GEÇERSİZ.'); return false; }

    for (const sp of (d.a || [])) {
      if (!sp || !sp.ops) continue;
      // kimlik çakışmasın diye yeniden kimliklendir; eksik alanları tamamla
      sp.id = 'f' + Date.now().toString(36) + Math.floor(Math.random() * 9999);
      sp.matched = sp.matched || [];
      sp.ignored = sp.ignored || [];
      sp.payload = sp.payload || {};
      sp.trigger = sp.trigger || { kind: 'space' };
      Forge.data.abilities.push(sp);
    }
    Forge.save();

    if (d.c && d.c.px && d.c.px.length === PX_H) {
      const c = newCharDraft();
      c.name = String(d.c.name || 'MİSAFİR').slice(0, 12);
      c.px = d.c.px.slice();
      c.pts = d.c.pts || c.pts;
      c.weapon = WEAPONS[d.c.weapon] ? d.c.weapon : 'suplex';
      c.skill = SKILLS[d.c.skill] ? d.c.skill : 'minder';
      c.abilities = (d.a || []).map(sp => sp.id).slice(0, 3);
      Creator.data.chars.push(c);
      Creator.register(c);
      Creator.save();
      this.say(c.name.toLocaleUpperCase('tr-TR') + ' GELDİ! ' + c.abilities.length + ' YETENEĞİYLE.');
    } else {
      this.say((d.a || []).length + ' YETENEK KÜTÜPHANENE EKLENDİ.');
    }
    return true;
  },

  importPrompt() {
    const code = window.prompt('ARKADAŞININ KODUNU YAPIŞTIR:');
    if (code) this.importCode(code);
  }
};
