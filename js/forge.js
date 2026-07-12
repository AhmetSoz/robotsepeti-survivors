'use strict';
// ─── SKİLL ATÖLYESİ v2 — yerel "akıllı ayrıştırıcı" + OP kütüphanesi ───
// Oyuncu serbest Türkçe cümle(ler) yazar. Burada niyeti çözüp SIRALI BİR OP
// LİSTESİ üretiriz; her op motorun mevcut primitiflerinden birini çalıştırır.
// Dış AI YOK: tamamen yerel, masrafsız, anında. Zincirleme mümkün:
//   "önce ileri atıl, sonra etrafına buz halkası yay, sonra herkesi yavaşlat"
// Motor asla ham veriye güvenmez — sayılar geniş ama güvenli aralığa kırpılır.

// ═══════════════ TEMALAR ═══════════════
// Görsel çeşitliliğin kalbi: renk + parçacık + imza statüsü + ses.
// Aynı "nova" bile temaya göre bambaşka görünür ve davranır.
const THEMES = {
  sade:   { col: 'white',  rgb: '244,244,248', part: 'puff',  sfx: 'suplex',  payload: null },
  ates:   { col: 'orange', rgb: '247,118,34',  part: 'spark', sfx: 'explode', payload: { burn: 14 },  decal: true },
  buz:    { col: 'teal',   rgb: '44,232,245',  part: 'puff',  sfx: 'teleport',payload: { chill: 0.5, stun: 0.5 } },
  zehir:  { col: 'green',  rgb: '99,199,77',   part: 'puff',  sfx: 'puff',    payload: { poison: 10 } },
  sok:    { col: 'yellow', rgb: '254,231,97',  part: 'spark', sfx: 'zimba',   payload: { stun: 0.8 } },
  kutsal: { col: 'gold',   rgb: '254,174,52',  part: 'crit',  sfx: 'evolve',  payload: null, beam: true },
  void:   { col: 'purple', rgb: '181,80,136',  part: 'ghost', sfx: 'magnet',  payload: { pull: 200 } },
  kan:    { col: 'red',    rgb: '228,59,68',   part: 'px',    sfx: 'bigslam', payload: null, lifesteal: true },
  ruzgar: { col: 'greyLight', rgb: '192,203,220', part: 'puff', sfx: 'wave',  payload: { kb: 300 } }
};

// ═══════════════ KELİME SÖZLÜĞÜ ═══════════════
// Her op ve tema için eşanlamlı kelime öbekleri. Genişledikçe "anlıyor" hissi artar.
const ATOM_WORDS = {
  // ── SERBEST ŞEKİLLER (ızgara hücreleriyle inşa edilir; elle de düzenlenebilir) ──
  s_rect:   ['dikdortgen', 'kare', 'blok', 'kutu seklinde', 'dortgen'],
  s_line:   ['cizgi', 'seritte', 'serit', 'ince uzun', 'lazer'],
  s_wall:   ['duvar', 'bariyer', 'set', 'perde'],
  s_cross:  ['arti', 'haci', 'arti seklinde'],
  s_x:      ['carpi', 'x seklinde', 'capraz'],
  s_ring:   ['cember', 'yuzuk', 'halka seklinde'],
  s_circle: ['daire', 'yuvarlak', 'top seklinde'],
  // ── yerleşim / kalıcılık ──
  ground:   ['yerde', 'zeminde', 'yere', 'kalici', 'kalsin', 'birak', 'kalacak', 'duracak'],
  atenemy:  ['dusmanin uzerine', 'hedefin uzerine', 'onlarin uzerine'],
  fromsky:  ['gokten', 'gokyuzunden', 'yukaridan', 'tepeden'],
  moving:   ['ilerlesin', 'gitsin', 'yol alsin', 'kaysin', 'suzulsun'],
  follow:   ['pesimden', 'benimle', 'takip etsin', 'yanimda'],
  // ── şekiller / alan (hazır kalıplar) ──
  nova:    ['patlama', 'patlat', 'patla', 'etraf', 'cevre', 'cevremde', 'nova', 'sarsinti', 'infilak'],
  wave:    ['halka', 'dalga', 'yay', 'yayil', 'genisleyen', 'sok dalgasi'],
  cone:    ['koni', 'one', 'onume', 'huni', 'yelpaze', 'onumdeki', 'ondeki'],
  cloud:   ['bulut', 'sis', 'alan', 'zemin', 'birak', 'kalici'],
  meteor:  ['meteor', 'gok tasi', 'gokten', 'yagdir', 'yagsin', 'gokyuzu', 'dussun'],
  rain:    ['yagmur', 'bombardiman', 'salvo'],
  car:     ['arac', 'araba', 'kamyon', 'forklift', 'ezici', 'ezsin', 'gecsin'],
  orbit:   ['yorunge', 'donen', 'donsun', 'kure', 'etrafimda donen', 'orbit', 'cevremde donen'],
  // ── mermiler ──
  proj:    ['mermi', 'at', 'firlat', 'ok', 'fuze', 'roket', 'sac', 'atis'],
  homing:  ['gudumlu', 'takip eden', 'pesine', 'hedef bulan', 'kovalayan'],
  boomerang: ['bumerang', 'geri donen', 'geri gelsin', 'donup gelen'],
  spiral:  ['her yone', 'butun yonlere', 'radyal', 'dairesel', 'cepecevre', 'tum yonlere'],
  // ── hareket ──
  dash:    ['atil', 'atilis', 'dal', 'hamle', 'kos', 'sicra', 'ileri atil'],
  blink:   ['isinlan', 'teleport', 'kaybol', 'yer degistir'],
  // ── statü ──
  stun:    ['dondur', 'sersemlet', 'uyustur', 'donsun', 'felc', 'kilitle', 'dursun'],
  chill:   ['yavaslat', 'agirlastir', 'yavaslasin'],
  slowmo:  ['agir cekim', 'zamani yavaslat', 'zaman'],
  burn:    ['yak', 'yaksin', 'yanma', 'kavur', 'kizart'],
  poison:  ['zehirle', 'zehirlesin', 'eritsin'],
  kb:      ['savur', 'it', 'itsin', 'ittir', 'geri savur', 'firlatip at'],
  pull:    ['cek', 'ceksin', 'kendine cek', 'vakum', 'topla'],
  // ── buff ──
  shield:  ['kalkan', 'koru', 'zirh kusan', 'siperlen'],
  heal:    ['iyiles', 'can', 'canimi doldur', 'sifa'],
  haste:   ['hizlan', 'hizlansin', 'turbo'],
  rage:    ['ofkelen', 'guclen', 'hasarim artsin', 'gazaba gel'],
  invuln:  ['dokunulmaz', 'olumsuz', 'hasar almayayim'],
  magnet:  ['miknatis', 'topla'],
  // ── özel ──
  decoy:   ['sahte', 'kopya', 'klon', 'yem', 'maket'],
  // ── temalar ──
  ates:    ['ates', 'alev', 'yangin', 'kor', 'lav', 'atesli', 'yak', 'yaksin'],
  buz:     ['buz', 'soguk', 'kar', 'ayaz', 'donduran', 'buzlu'],
  zehir:   ['zehir', 'gaz', 'asit', 'toksik', 'zehirli'],
  sok:     ['sok', 'elektrik', 'yildirim', 'simsek', 'volt'],
  kutsal:  ['kutsal', 'isik', 'altin', 'ilahi', 'nur', 'melek'],
  void:    ['karanlik', 'golge', 'void', 'kara delik', 'bosluk', 'ruh'],
  kan:     ['kan', 'kanli', 'vampir', 'can emici', 'emsin'],
  ruzgar:  ['ruzgar', 'firtina', 'kasirga', 'hava'],
  // ── büyüklük / hız ──
  buyuk:   ['buyuk', 'guclu', 'dev', 'kocaman', 'muazzam', 'sert', 'agir', 'yikici'],
  kucuk:   ['kucuk', 'ufak', 'hafif', 'minik'],
  hizli:   ['hizli', 'sik', 'cabuk', 'seri', 'kisa bekleme'],
  // ── tetikler ──
  auto:    ['otomatik', 'saniyede bir', 'surekli', 'kendiliginden', 'her saniye'],
  onhit:   ['vurunca', 'vurdugumda', 'her vurusta', 'isabet edince'],
  onhurt:  ['hasar alinca', 'vuruldugumda', 'canim giderse', 'bana vurunca'],
  lowhp:   ['canim azalinca', 'can azalinca', 'olmek uzereyken', 'az kalinca', 'tehlikede'],
  onkill:  ['oldurunce', 'oldurdugumde', 'devirince', 'olduren']
};

// ═══════════════ ŞEKİL ÜRETEÇLERİ (atomik hücrelerden herhangi bir şekil) ═══════════════
// Yeteneğin vuruş alanı = ızgaraya boyanmış HÜCRELER. Dikdörtgen = yan yana kareler,
// duvar = uzun ince dizi, artı = iki dikdörtgen, halka = kabuk... Hepsi aynı primitif.
// Oyuncu bunları elle de boyayıp değiştirebilir (şekil editörü).
const ZONE_CELL = 9;          // bir hücre = 9 dünya pikseli
const SHAPE_MAX = 7;          // ızgara yarıçapı (15x15 hücre = 135x135 px)

const SHAPES = {
  // kare/dikdörtgen: w×h hücre, oyuncunun ÖNÜNE doğru uzanır
  rect(w, h) {
    const cells = [];
    w = forgeClamp(Math.round(w), 1, 13); h = forgeClamp(Math.round(h), 1, 13);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        cells.push({ x: x + 1, y: y - ((h - 1) / 2 | 0) });   // önden başlar
      }
    }
    return cells;
  },
  // daire: r yarıçapında dolu hücre kümesi (oyuncu merkezli)
  circle(r) {
    const cells = [];
    r = forgeClamp(Math.round(r), 1, SHAPE_MAX);
    for (let x = -r; x <= r; x++)
      for (let y = -r; y <= r; y++)
        if (x * x + y * y <= r * r) cells.push({ x, y });
    return cells;
  },
  // halka: sadece kabuk
  ring(r) {
    const cells = [];
    r = forgeClamp(Math.round(r), 2, SHAPE_MAX);
    for (let x = -r; x <= r; x++)
      for (let y = -r; y <= r; y++) {
        const d = x * x + y * y;
        if (d <= r * r && d >= (r - 1.2) * (r - 1.2)) cells.push({ x, y });
      }
    return cells;
  },
  // çizgi/duvar: uzunluk × kalınlık, öne doğru
  line(len, th) {
    return SHAPES.rect(len, th || 1);
  },
  // dik duvar: öne uzak, yana geniş
  wall(len, dist) {
    const cells = [];
    len = forgeClamp(Math.round(len), 2, 13);
    const d = forgeClamp(Math.round(dist || 3), 1, SHAPE_MAX);
    for (let y = -(len >> 1); y <= (len >> 1); y++) cells.push({ x: d, y });
    return cells;
  },
  // koni: öne doğru genişleyen
  cone(range, arc) {
    const cells = [];
    range = forgeClamp(Math.round(range), 2, SHAPE_MAX);
    const half = (arc || 0.9) / 2;
    for (let x = 1; x <= range; x++)
      for (let y = -range; y <= range; y++) {
        const ang = Math.atan2(y, x);
        if (Math.abs(ang) <= half && x * x + y * y <= range * range) cells.push({ x, y });
      }
    return cells;
  },
  // artı / çarpı
  cross(len) {
    const cells = [];
    len = forgeClamp(Math.round(len), 1, SHAPE_MAX);
    for (let i = -len; i <= len; i++) { cells.push({ x: i, y: 0 }); cells.push({ x: 0, y: i }); }
    return cells;
  },
  x(len) {
    const cells = [];
    len = forgeClamp(Math.round(len), 1, SHAPE_MAX);
    for (let i = -len; i <= len; i++) { cells.push({ x: i, y: i }); cells.push({ x: i, y: -i }); }
    return cells;
  },
  // tek nokta
  dot() { return [{ x: 0, y: 0 }]; }
};

// Hücre listesini benzersizleştir (üst üste binmesin)
function dedupeCells(cells) {
  const seen = new Set(), out = [];
  for (const c of cells) {
    const k = c.x + ',' + c.y;
    if (seen.has(k)) continue;
    seen.add(k);
    if (Math.abs(c.x) <= 13 && Math.abs(c.y) <= 13) out.push({ x: c.x, y: c.y });
  }
  return out;
}

// Türkçe karakterleri sadeleştir (eşleşme kolaylığı)
function forgeNorm(s) {
  return String(s).toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}
function forgeClamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

// Bağlaçlar/dolgu kelimeleri — "anlamadım" listesinde gösterilmez
const FORGE_STOP = ['once', 'sonra', 'ardindan', 'sonrasinda', 'daha', 'bir', 'bana', 'beni',
  'benim', 'kendi', 'kendime', 'olsun', 'yapsin', 'etsin', 'versin', 'olarak', 'gibi', 'icin',
  'herkesi', 'herkese', 'onlari', 'onlara', 'dusman', 'dusmanlari', 'musteri', 'musterileri'];

// KELİME SINIRLI eşleşme: "atıl" içindeki "at" yanlışlıkla eşleşmesin.
// Çok kelimeli öbekler (ör. "kara delik") düz arama; tek kelimeler tam ya da
// 4+ harfli kök öneki ("dondur" → "dondursun") ile eşleşir.
function segHas(seg, key) {
  const list = ATOM_WORDS[key];
  if (!list) return false;
  const words = seg.split(/[^a-z0-9]+/).filter(Boolean);
  return list.some(w => {
    if (w.indexOf(' ') >= 0) return seg.indexOf(w) >= 0;
    return words.some(x => x === w || (w.length >= 4 && x.length > w.length && x.startsWith(w)));
  });
}

// ═══════════════ AYRIŞTIRICI ═══════════════
// Cümleyi cümleciklere böler; her cümlecik bir "şekil" op'u üretebilir.
// Yükler/tema/büyüklük cümlenin tamamından okunur ve op'lara dağıtılır.
function parseAbility(text) {
  const raw = String(text || '');
  const full = ' ' + forgeNorm(raw) + ' ';
  const matched = [];
  const has = key => {
    const found = segHas(full, key);
    if (found && matched.indexOf(key) < 0) matched.push(key);
    return found;
  };

  // ── tema ── (ilk eşleşen kazanır)
  let theme = 'sade';
  for (const t of ['ates', 'buz', 'zehir', 'sok', 'kutsal', 'void', 'kan', 'ruzgar']) {
    if (has(t)) { theme = t; break; }
  }
  const TH = THEMES[theme];

  // ── büyüklük / hız ──
  let mag = 1, cdMul = 1;
  if (has('buyuk')) mag = 1.6;
  if (has('kucuk')) mag = 0.7;
  if (has('hizli')) cdMul = 0.65;

  // ── sayı okuma: "3 mermi", "5 saniyede bir" ──
  const nums = (full.match(/\d+/g) || []).map(n => parseInt(n, 10));
  const countHint = nums.find(n => n >= 2 && n <= 16);
  const everyHint = (full.match(/(\d+)\s*saniye/) || [])[1];

  // ── tetik ──
  let trigger = { kind: 'space' };
  if (has('auto') || everyHint) trigger = { kind: 'auto', every: forgeClamp(+(everyHint || 4), 1.5, 20) };
  else if (has('onhit')) trigger = { kind: 'onhit', chance: 0.25 };
  else if (has('onhurt')) trigger = { kind: 'onhurt' };
  else if (has('lowhp')) trigger = { kind: 'lowhp', hp: 0.3 };
  else if (has('onkill')) trigger = { kind: 'onkill', chance: 0.2 };

  // ── yükler (statü) — tema imzası + açıkça yazılanlar ──
  const payload = {};
  if (TH.payload) for (const k in TH.payload) payload[k] = TH.payload[k];
  if (has('stun')) payload.stun = 1.0 * mag;
  if (has('chill')) payload.chill = 0.5;
  if (has('burn')) payload.burn = 16 * mag;
  if (has('poison')) payload.poison = 12 * mag;
  if (has('kb')) payload.kb = 300 * mag;
  if (has('pull')) payload.pull = 240;
  if (payload.burn) payload.burnCol = TH.col;
  if (payload.poison) payload.burnCol = 'green';

  // ── ŞEKİL/HAREKET op'ları: cümleciklere göre SIRALI ──
  const ops = [];
  const D = m => forgeClamp(Math.round(26 * mag * m), 5, 400);   // hasar yardımcısı
  const clauses = full.split(/,|;| sonra | ardindan | ve | daha sonra /).filter(c => c.trim());

  const addShapeOps = seg => {
    const h = key => segHas(seg, key);
    let added = false;

    // ══ SERBEST ŞEKİL (zone): hücrelerden inşa edilir — "2 kareyi yan yana koy = dikdörtgen" ══
    // Sıra en spesifikten en gevşeğe: 'lazer'/'kare' gibi gevşek kelimeler sonda kalsın.
    let cells = null;
    const sz = forgeClamp(Math.round(3 * mag), 1, 7);
    if (h('s_cross')) cells = SHAPES.cross(sz);
    else if (h('s_x')) cells = SHAPES.x(sz);
    else if (h('s_ring')) cells = SHAPES.ring(sz + 1);
    else if (h('s_circle')) cells = SHAPES.circle(sz);
    else if (h('s_wall')) cells = SHAPES.wall(countHint || Math.round(7 * mag), 3);
    else if (h('s_rect')) cells = SHAPES.rect(countHint || Math.round(4 * mag), Math.max(2, Math.round(2 * mag)));
    else if (h('s_line')) cells = SHAPES.line(countHint || Math.round(6 * mag), 1);

    if (cells) {
      // Yerleşim/kalıcılık nitelikleri AYRI bir cümlecikte yazılmış olabilir
      // ("dikdörtgen ateş at, BİR SÜRE YERDE KALIP yaksın") → tüm metinden bak.
      const ground = has('ground');
      const sky = has('fromsky');
      const move = has('moving');
      const foll = has('follow');
      ops.push({
        op: 'zone',
        cells: dedupeCells(cells),
        dmg: D(ground ? 0.45 : 1.1),          // kalıcı bölge tik başına daha az vurur
        dur: ground ? forgeClamp(5 * mag, 1, 12) : 0.35,
        tickRate: ground ? 0.4 : 0,           // 0 = tek sefer (anlık vuruş)
        place: sky ? 'sky' : (has('atenemy') ? 'enemy' : 'self'),
        motion: foll ? 'follow' : (move ? 'forward' : null),
        warn: sky ? 0.7 : 0
      });
      // Şekil bu cümleciğin ana fikri — ayrıca mermi/koni/patlama EKLEME.
      return true;
    }

    // hareket önce (öncelikli)
    if (h('dash')) { ops.push({ op: 'dash', range: forgeClamp(75 * mag, 40, 200), dmg: D(1.2) }); added = true; }
    if (h('blink')) { ops.push({ op: 'blink', range: forgeClamp(90 * mag, 40, 200) }); added = true; }
    // şekiller
    if (h('orbit')) { ops.push({ op: 'orbit', n: countHint || 3, r: forgeClamp(34 * mag, 20, 90), dmg: D(0.6), dur: 6 }); added = true; }
    if (h('meteor') || h('rain')) { ops.push({ op: 'meteor', n: countHint || 4, r: forgeClamp(28 * mag, 15, 70), dmg: D(1.5) }); added = true; }
    if (h('car')) { ops.push({ op: 'car', n: countHint || 2, dmg: D(1.4) }); added = true; }
    if (h('cloud')) { ops.push({ op: 'cloud', r: forgeClamp(30 * mag, 15, 90), dps: D(0.5), dur: forgeClamp(4 * mag, 1, 10) }); added = true; }
    if (h('cone')) { ops.push({ op: 'cone', range: forgeClamp(75 * mag, 30, 200), dmg: D(1) }); added = true; }
    if (h('wave')) { ops.push({ op: 'wave', maxR: forgeClamp(80 * mag, 30, 200), dmg: D(1), n: countHint && countHint <= 4 ? countHint : 1 }); added = true; }
    if (h('spiral')) { ops.push({ op: 'spiral', n: countHint || 10, dmg: D(0.7) }); added = true; }
    if (h('boomerang')) { ops.push({ op: 'boomerang', n: countHint || 2, dmg: D(0.9) }); added = true; }
    if (h('homing')) { ops.push({ op: 'homing', n: countHint || 4, dmg: D(0.8) }); added = true; }
    if (h('proj')) { ops.push({ op: 'proj', n: countHint || 3, dmg: D(0.8) }); added = true; }
    if (h('nova')) { ops.push({ op: 'nova', r: forgeClamp(55 * mag, 20, 200), dmg: D(1.2) }); added = true; }
    if (h('decoy')) { ops.push({ op: 'decoy', dur: 4, r: forgeClamp(50 * mag, 20, 120), dmg: D(1.3) }); added = true; }
    // buff'lar
    if (h('shield')) { ops.push({ op: 'shield', dur: forgeClamp(5 * mag, 1, 10) }); added = true; }
    if (h('heal')) { ops.push({ op: 'heal', pct: 0.25 }); added = true; }
    if (h('haste')) { ops.push({ op: 'haste', dur: 5, k: 1.5 }); added = true; }
    if (h('rage')) { ops.push({ op: 'rage', dur: 6, k: 1.5 }); added = true; }
    if (h('invuln')) { ops.push({ op: 'invuln', dur: 2 }); added = true; }
    if (h('magnet')) { ops.push({ op: 'magnet', dur: 3 }); added = true; }
    if (h('slowmo')) { ops.push({ op: 'slowmo', dur: 3, k: 0.45 }); added = true; }
    return added;
  };

  for (const c of clauses) addShapeOps(c);
  // hiç şekil çıkmadıysa: yükler varsa nova ile taşı, hiçbir şey yoksa unknown
  if (!ops.length) {
    if (matched.length) ops.push({ op: 'nova', r: forgeClamp(55 * mag, 20, 200), dmg: D(1.2) });
  }

  // tema imzası: kutsal → ışık huzmesi, kan → can emme (op olarak eklenir)
  if (TH.beam && ops.length) ops.push({ op: 'beam' });

  // ── bekleme: op sayısı ve güce göre makul bir taban (geniş sınırlar) ──
  const power = ops.reduce((s, o) => s + (o.dmg || o.dps || 10) / 26, 0);
  let cd = forgeClamp(+(4 + power * 1.4).toFixed(1) * cdMul, 1.5, 20);
  if (trigger.kind === 'auto') cd = trigger.every;

  // ── isim ──
  const opName = ops.length ? ({
    zone: 'ŞEKİL', nova: 'PATLAMA', wave: 'DALGA', cone: 'KONİ', proj: 'ATIŞ', spiral: 'SAÇILIM',
    homing: 'GÜDÜM', boomerang: 'BUMERANG', meteor: 'YAĞMUR', car: 'EZİCİ', cloud: 'BULUT',
    orbit: 'YÖRÜNGE', dash: 'HAMLE', blink: 'SIÇRAMA', decoy: 'KLON', shield: 'KALKAN',
    heal: 'ŞİFA', haste: 'HIZ', rage: 'ÖFKE', slowmo: 'ZAMAN', invuln: 'ZIRH', magnet: 'ÇEKİM'
  }[ops[0].op] || 'YETENEK') : 'YETENEK';
  const themeName = theme === 'sade' ? '' : theme.toLocaleUpperCase('tr-TR') + ' ';
  const name = (themeName + opName).slice(0, 18);

  // ── anlaşılmayan kelimeler (öğretici geri bildirim; bağlaçlar sayılmaz) ──
  const known = [];
  for (const k in ATOM_WORDS) for (const w of ATOM_WORDS[k]) known.push(w);
  const ignored = forgeNorm(raw).split(/[^a-z0-9]+/).filter(w =>
    w.length > 3 && FORGE_STOP.indexOf(w) < 0 &&
    !known.some(k => k === w || (k.length >= 4 && w.startsWith(k)) || k.indexOf(w) >= 0));

  return {
    id: 'f' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
    name, text: raw, theme, trigger, cd, ops, payload,
    matched, ignored: ignored.slice(0, 6),
    unknown: ops.length === 0
  };
}

// İnsan-okunur op zinciri ("1. İLERİ ATIL → 2. BUZ HALKASI")
const OP_LABEL = {
  zone: 'ÇİZİLMİŞ ŞEKİL',
  nova: 'PATLAMA', wave: 'YAYILAN HALKA', cone: 'ÖNE KONİ', proj: 'MERMİ', spiral: 'HER YÖNE SAÇILIM',
  homing: 'GÜDÜMLÜ', boomerang: 'BUMERANG', meteor: 'GÖKTEN YAĞMUR', car: 'ARAÇ EZMESİ',
  cloud: 'KALICI BULUT', orbit: 'DÖNEN KÜRE', dash: 'İLERİ ATILIŞ', blink: 'IŞINLANMA',
  decoy: 'SAHTE KOPYA', shield: 'KALKAN', heal: 'İYİLEŞME', haste: 'HIZLANMA', rage: 'ÖFKE',
  invuln: 'DOKUNULMAZLIK', magnet: 'MIKNATIS', slowmo: 'AĞIR ÇEKİM', beam: 'IŞIK HUZMESİ'
};
const TRIGGER_LABEL = {
  space: 'SPACE', auto: 'OTOMATİK', onhit: 'VURUNCA', onhurt: 'HASAR ALINCA',
  lowhp: 'CAN AZALINCA', onkill: 'ÖLDÜRÜNCE'
};

function specChain(spec) {
  return spec.ops.map((o, i) => (i + 1) + '. ' + (OP_LABEL[o.op] || o.op)).join(' → ');
}
function specSummary(spec) {
  const tr = TRIGGER_LABEL[spec.trigger.kind] +
    (spec.trigger.kind === 'auto' ? ' (' + spec.trigger.every + 'sn)' : '');
  const yuk = Object.keys(spec.payload).filter(k => k !== 'burnCol').map(k => ({
    stun: 'DONDUR', chill: 'YAVAŞLAT', burn: 'YAKMA', poison: 'ZEHİR', kb: 'SAVUR', pull: 'ÇEKME'
  }[k] || k)).join('+') || 'YOK';
  return 'TETİK: ' + tr + ' · TEMA: ' + spec.theme.toLocaleUpperCase('tr-TR') +
    ' · YÜK: ' + yuk + ' · BEKLEME: ' + spec.cd + 'sn';
}

// ═══════════════ OP YORUMLAYICISI ═══════════════
function runAbility(spec, p) {
  const TH = THEMES[spec.theme] || THEMES.sade;
  const col = COL[TH.col] || COL.white;
  for (const o of spec.ops) runOp(o, spec, p, TH, col);
  Sfx.play(TH.sfx);
  addFloat(p.x, p.y - 26, spec.name + '!', col, true);
}

function runOp(o, spec, p, TH, col) {
  const pay = spec.payload;
  const dmgMul = 1 + (Game.level - 1) * 0.08;   // custom yetenek seviyeyle büyür
  const D = (o.dmg || 0) * p.might * dmgMul;

  switch (o.op) {
    // ══ SERBEST ŞEKİLLİ BÖLGE: oyuncunun çizdiği/tarif ettiği hücre deseni ══
    case 'zone': {
      const cells = o.cells && o.cells.length ? o.cells : [{ x: 0, y: 0 }];
      const ang = facingAngle(p);
      let zx = p.x, zy = p.y;
      if (o.place === 'enemy' || o.place === 'sky') {
        // en yakın düşmanın üstüne kur
        let best = null, bd = 220 * 220;
        for (const e of Game.enemies) {
          if (e.dead || e.spawnT > 0) continue;
          const d = dist2(p.x, p.y, e.x, e.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { zx = best.x; zy = best.y; }
        else { zx = p.x + Math.cos(ang) * 60; zy = p.y + Math.sin(ang) * 60; }
      }
      const persistent = (o.tickRate || 0) > 0;
      const mv = o.motion === 'forward'
        ? { vx: Math.cos(ang) * 90, vy: Math.sin(ang) * 90 }
        : (o.motion === 'follow' ? 'follow' : null);
      Game.zones.push({
        cells, cw: ZONE_CELL, cellSet: null,
        x: zx, y: zy, ang: (o.place === 'self' ? ang : 0),
        t: 0, dur: o.dur || 0.35,
        tick: 0, tickRate: o.tickRate || 0.3,
        dmg: D,
        payload: pay, col, part: TH.part,
        motion: mv, warn: o.warn || 0,
        hit: persistent ? null : new Set(),   // anlık: her düşmana bir kez
        silent: persistent
      });
      Game.shake = Math.max(Game.shake, persistent ? 1.5 : 3);
      break;
    }
    // ── ŞEKİL: anlık halka patlaması ──
    case 'nova': {
      Game.shocks.push({ x: p.x, y: p.y - 6, r: o.r, t: 0, col });
      Game.shake = Math.max(Game.shake, 3);
      forEachEnemyIn(p.x, p.y, o.r, e => {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        damageEnemy(e, D, Math.cos(a) * (pay.kb || 80), Math.sin(a) * (pay.kb || 80));
        applyForgePayload(pay, e);
      });
      burstFx(p.x, p.y - 4, o.r, col, TH.part, Math.round(o.r / 4));
      if (TH.decal) {
        (Game.decals.length > 60 && Game.decals.shift());
        Game.decals.push({ x: p.x, y: p.y, r: o.r * 0.7, t: 0, dur: 2 });
      }
      break;
    }
    // ── ŞEKİL: dışarı yayılan hasar halkası (rings) ──
    case 'wave': {
      for (let i = 0; i < (o.n || 1); i++) {
        Game.rings.push({ x: p.x, y: p.y - 6, r: 6, maxR: o.maxR, dmg: D, hit: new Set(),
          delay: i * 0.18, stun: pay.stun || 0, kb: pay.kb || 60, col, forgePay: pay });
      }
      Game.shake = Math.max(Game.shake, 2);
      break;
    }
    // ── ŞEKİL: öne koni ──
    case 'cone': {
      const ang = facingAngle(p), arc = 1.2;
      Game.cones.push({ x: p.x, y: p.y - 6, ang, range: o.range, arc, t: 0, col });
      for (const e of Game.enemies) {
        if (e.dead || e.spawnT > 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) > o.range * o.range) continue;
        const ea = Math.atan2(e.y - p.y, e.x - p.x);
        let diff = Math.abs(ea - ang);
        if (diff > Math.PI) diff = TAU - diff;
        if (diff < arc / 2) {
          damageEnemy(e, D, Math.cos(ea) * (pay.kb || 80), Math.sin(ea) * (pay.kb || 80));
          applyForgePayload(pay, e);
        }
      }
      for (let i = 0; i < 10; i++) {
        const a = ang + rand(-arc / 2, arc / 2), sp = rand(50, 130);
        addPart({ x: p.x, y: p.y - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          dur: 0.35, type: TH.part, col, size: 2 });
      }
      break;
    }
    // ── ŞEKİL: kalıcı bulut (zemin DoT alanı) ──
    case 'cloud': {
      const fx = p.facing.x || (p.flip ? -1 : 1), fy = p.facing.y;
      Game.clouds.push({ x: p.x + fx * 18, y: p.y + fy * 18, r: o.r, dur: o.dur, t: 0,
        dps: (o.dps || 10) * p.might * dmgMul, tick: 0, col, forgePay: pay });
      break;
    }
    // ── ŞEKİL: gökten telegraflı meteor yağmuru (hazards ally) ──
    case 'meteor': {
      const targets = Game.enemies.filter(e => !e.dead && e.spawnT <= 0 &&
        dist2(p.x, p.y, e.x, e.y) < 200 * 200);
      for (let i = 0; i < o.n; i++) {
        const tg = targets.length ? pick(targets) : null;
        const tx = tg ? tg.x + rand(-14, 14) : p.x + rand(-120, 120);
        const ty = tg ? tg.y + rand(-10, 10) : p.y + rand(-90, 90);
        Game.hazards.push({ kind: 'pallet', ally: true, col, payload: pay,
          x0: tx + rand(-8, 8), y0: ty - 120, x: tx, y: ty,
          r: o.r, dmg: D, kb: pay.kb || 120, warn: 0.75 + i * 0.16, t: 0 });
      }
      break;
    }
    // ── ŞEKİL: şeritten geçen ezici araç ──
    case 'car': {
      for (let i = 0; i < o.n; i++) {
        const d = i % 2 ? 1 : -1;
        Game.cars.push({ x: p.x - d * (280 + (i >> 1) * 70), y: p.y + (i - o.n / 2) * 26 + rand(-6, 6),
          dir: d, spd: 260, dmg: D, kb: pay.kb || 240, band: 15,
          hit: new Set(), life: 3.2, vis: 'car' });
      }
      Sfx.play('horn');
      break;
    }
    // ── ŞEKİL: etrafta dönen küreler ──
    case 'orbit': {
      for (let i = 0; i < o.n; i++) {
        Game.orbs.push({ i, n: o.n, angle: 0, rot: 3, r: o.r, dur: o.dur, t: 0,
          dmg: D, col, payload: pay });
      }
      break;
    }
    // ── MERMİ: düz / güdümlü / bumerang / radyal ──
    case 'proj': case 'homing': case 'boomerang': case 'spiral': {
      const targets = Game.enemies.filter(e => !e.dead && e.spawnT <= 0);
      let best = null, bd = 240 * 240;
      for (const e of targets) {
        const d = dist2(p.x, p.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      const base = best ? Math.atan2(best.y - 6 - (p.y - 8), best.x - p.x) : facingAngle(p);
      for (let i = 0; i < o.n; i++) {
        let a;
        if (o.op === 'spiral') a = (i / o.n) * TAU + rand(0.15);
        else a = base + (i - (o.n - 1) / 2) * 0.18;
        const pr = { type: o.op === 'orbit' ? 'orb' : 'staple', x: p.x, y: p.y - 8,
          vx: Math.cos(a) * 210, vy: Math.sin(a) * 210,
          dmg: D, pierce: 2, hit: new Set(), t: 0, col, payload: pay };
        if (o.op === 'homing') {
          pr.homing = true; pr.spd = 150;
          pr.target = targets.length ? pick(targets) : null;
          pr.vx = Math.cos(a) * 70; pr.vy = Math.sin(a) * 70;
        }
        if (o.op === 'boomerang') {
          pr.boom = { ox: p.x, oy: p.y - 8, out: 0.55, back: false };
          pr.pierce = 99;
        }
        Game.projs.push(pr);
      }
      Sfx.play('zimba');
      break;
    }
    // ── HAREKET ──
    case 'dash': {
      let fx = p.facing.x, fy = p.facing.y;
      if (!fx && !fy) fx = p.flip ? -1 : 1;
      const len = Math.sqrt(fx * fx + fy * fy) || 1, dur = 0.3;
      p.dashS = { t: 0, dur, vx: (fx / len) * (o.range / dur), vy: (fy / len) * (o.range / dur),
        dmg: D, stun: pay.stun || 0, hit: new Set() };
      Sfx.play('dash');
      break;
    }
    case 'blink': {
      for (let i = 0; i < 6; i++) emitAfterimage(p, 1);
      let fx = p.facing.x, fy = p.facing.y;
      if (!fx && !fy) fx = p.flip ? -1 : 1;
      const len = Math.sqrt(fx * fx + fy * fy) || 1;
      burstFx(p.x, p.y - 6, 20, col, 'puff', 10);
      p.x += (fx / len) * o.range;
      p.y += (fy / len) * o.range;
      p.invuln = Math.max(p.invuln, 0.4);
      burstFx(p.x, p.y - 6, 20, col, 'puff', 10);
      Sfx.play('teleport');
      break;
    }
    // ── ÖZEL ──
    case 'decoy':
      Game.decoy = { x: p.x, y: p.y, t: 0, dur: o.dur, dmg: D, r: o.r, charId: p.charId };
      Sfx.play('question');
      break;
    // ── BUFF ──
    case 'shield': p.shieldT = Math.max(p.shieldT, o.dur); Sfx.play('shield'); break;
    case 'invuln': p.invuln = Math.max(p.invuln, o.dur); break;
    case 'haste': p.spdBuffT = o.dur; p.spdBuffK = o.k; recalcStats(p); Sfx.play('turbo'); break;
    case 'rage': p.mightBuffT = o.dur; p.mightBuffK = o.k; recalcStats(p); Sfx.play('ready'); break;
    case 'heal': {
      const h = Math.round(p.maxHp * o.pct);
      p.hp = Math.min(p.maxHp, p.hp + h);
      addFloat(p.x, p.y - 20, '+' + h, COL.green, true);
      Sfx.play('heart');
      break;
    }
    case 'magnet': p.magnetBoostT = Math.max(p.magnetBoostT, o.dur); Sfx.play('magnet'); break;
    case 'slowmo':
      Game.slowT = Math.max(Game.slowT, o.dur);
      Game.slowK = o.k;
      Game.flashT = 0.25; Game.flashCol = '68,100,220';
      break;
    // ── GÖRSEL ──
    case 'beam':
      Game.beams.push({ x: p.x, y: p.y, t: 0, rgb: TH.rgb });
      Game.flashT = Math.max(Game.flashT, 0.2); Game.flashCol = TH.rgb;
      break;
  }
}

// ── yardımcılar ──
function facingAngle(p) {
  let fx = p.facing.x, fy = p.facing.y;
  if (!fx && !fy) fx = p.flip ? -1 : 1;
  return Math.atan2(fy, fx);
}
function forEachEnemyIn(x, y, r, fn) {
  for (const e of Game.enemies) {
    if (e.dead || e.spawnT > 0) continue;
    if (dist2(x, y, e.x, e.y) < r * r) fn(e);
  }
}
function burstFx(x, y, r, col, type, n) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(0.3);
    addPart({ x: x + Math.cos(a) * r * 0.6, y: y + Math.sin(a) * r * 0.35,
      vx: Math.cos(a) * rand(30, 70), vy: Math.sin(a) * rand(20, 50) - 15,
      dur: 0.45, type: type || 'puff', col, size: 3 });
  }
}

// Statü yüklerini tek düşmana uygula (tüm op'lar bunu çağırır)
function applyForgePayload(pay, e) {
  if (!pay || !e || e.dead) return;
  if (pay.stun) e.stun = Math.max(e.stun, pay.stun);
  if (pay.chill) { e.slowT = Math.max(e.slowT, 3); e.slowK = 1 - pay.chill; }
  if (pay.burn || pay.poison) {
    e.burnT = Math.max(e.burnT, 3);
    e.burnDps = Math.max(e.burnDps, (pay.burn || pay.poison) * Game.player.might);
    e.burnCol = COL[pay.burnCol] || COL.orange;
    if (e.burnTick <= 0) e.burnTick = 0.35;
  }
  if (pay.pull) {
    const p = Game.player;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    if (!e.type.boss) { e.kx += Math.cos(a) * pay.pull; e.ky += Math.sin(a) * pay.pull; }
  }
}
// v1 uyumluluğu (eski çağrı adı)
function forgeApplyPayloads(spec, e) { applyForgePayload(spec && spec.payload, e); }

// ═══════════════ KÜTÜPHANE (sınırsız yetenek + 3 slot) ═══════════════
const Forge = {
  data: { abilities: [], equipped: [null, null, null] },
  input: '',
  draft: null,     // ANLA sonucu (henüz kaydedilmemiş)
  editIdx: -1,     // düzenlenen yeteneğin indeksi (-1 = yeni)

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('rs_forge') || '{}');
      this.data = {
        abilities: Array.isArray(d.abilities) ? d.abilities : [],
        equipped: Array.isArray(d.equipped) ? d.equipped.slice(0, 3) : [null, null, null]
      };
      while (this.data.equipped.length < 3) this.data.equipped.push(null);
    } catch (e) { this.data = { abilities: [], equipped: [null, null, null] }; }
  },
  save() {
    try { localStorage.setItem('rs_forge', JSON.stringify(this.data)); } catch (e) {}
  },

  byId(id) { return this.data.abilities.find(a => a.id === id) || null; },

  // taslağı kütüphaneye kaydet (düzenlemedeyse üstüne yaz)
  commit() {
    if (!this.draft || this.draft.unknown) return false;
    if (this.editIdx >= 0 && this.data.abilities[this.editIdx]) {
      this.draft.id = this.data.abilities[this.editIdx].id;   // slot bağı korunsun
      this.data.abilities[this.editIdx] = this.draft;
    } else {
      this.data.abilities.push(this.draft);
      // ilk boş slota otomatik tak
      const s = this.data.equipped.indexOf(null);
      if (s >= 0) this.data.equipped[s] = this.draft.id;
    }
    this.save();
    this.draft = null; this.editIdx = -1; this.input = '';
    return true;
  },

  remove(i) {
    const a = this.data.abilities[i];
    if (!a) return;
    this.data.abilities.splice(i, 1);
    for (let s = 0; s < 3; s++) if (this.data.equipped[s] === a.id) this.data.equipped[s] = null;
    this.save();
  },

  // yeteneği bir slota tak (zaten takılıysa çıkar)
  toggleEquip(id) {
    const cur = this.data.equipped.indexOf(id);
    if (cur >= 0) { this.data.equipped[cur] = null; this.save(); return; }
    const s = this.data.equipped.indexOf(null);
    if (s >= 0) this.data.equipped[s] = id;
    else this.data.equipped[0] = id;   // hepsi doluysa ilkini değiştir
    this.save();
  },

  equippedSpecs() {
    return this.data.equipped.map(id => (id ? this.byId(id) : null)).filter(Boolean);
  }
};
