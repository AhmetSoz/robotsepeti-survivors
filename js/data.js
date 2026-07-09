'use strict';
// ─── Oyun verileri: karakterler, silahlar, düşmanlar, itemler ───

// Karakter sprite tarifleri: suit rengi + kafa/aksesuar katmanları.
// Katman satırları 14 karakter genişliğinde, oy = üstten satır ofseti.
const CHARACTERS = {
  ahmet: {
    name: 'AHMET',
    title: 'GÜREŞÇİ / BT UZMANI',
    color: COL.red,
    hp: 125, speed: 1.0,
    weapon: 'suplex',
    passiveName: 'GÜREŞÇİ VÜCUDU',
    passiveDesc: 'Gelen hasar %15 azalır, +1 zırh ile başlar.',
    suit: COL.red, suitShade: COL.redDark,
    overlays: [
      { oy: 2, map: { H: COL.hairDark, R: COL.redDark, o: COL.outline }, rows: [
        '..oHHHHHHHHo..',
        '.oRRRRRRRRRRo.'
      ]}
    ]
  },
  ali: {
    name: 'ALİ',
    title: 'TEDARİK ŞOFÖRÜ',
    color: COL.cyan,
    hp: 90, speed: 1.15,
    weapon: 'car',
    passiveName: 'İKNA KABİLİYETİ',
    passiveDesc: 'Müşteriler yalanına kanar: %12 şansla hasardan kaçar.',
    suit: COL.cyan, suitShade: COL.blueDark,
    overlays: [
      { oy: 2, map: { C: COL.grey, D: COL.greyDark, o: COL.outline }, rows: [
        '..oCCCCCCCCo..',
        '.oDDDDDDDDDDo.'
      ]},
      { oy: 7, map: { M: COL.hairDark }, rows: [
        '.....MMMM.....'
      ]}
    ]
  },
  bekir: {
    name: 'BEKİR',
    title: 'ŞARKICI',
    color: COL.purple,
    hp: 100, speed: 1.0,
    weapon: 'wave',
    passiveName: 'SAHNE IŞIĞI',
    passiveDesc: 'Vuruşlar %10 şansla sersemletir, +%10 tecrübe.',
    suit: COL.purple, suitShade: COL.purpleDark,
    overlays: [
      { oy: 0, map: { H: COL.navyDark, i: COL.greyDark, o: COL.outline }, rows: [
        '..oHHHHo......',
        '.oHiHHHHHHHo..',
        '.oHHHHHHHHHHo.',
        '.oHH......HHo.'
      ]},
      { oy: 8, map: { M: COL.greyDark, W: COL.greyLight }, rows: [
        '............MW',
        '............MM'
      ]}
    ]
  },
  can: {
    name: 'CAN',
    title: 'SORU MAKİNESİ',
    color: COL.green,
    hp: 110, speed: 0.95,
    weapon: 'burp',
    passiveName: 'SORU YAĞMURU',
    passiveDesc: 'Her 6 sn: en yakın müşteri soruya boğulur, 2 sn donar.',
    suit: COL.green, suitShade: COL.greenDark,
    overlays: [
      { oy: 0, map: { H: COL.brown, o: COL.outline }, rows: [
        '..H...HH...H..',
        '..oHHHHHHHHo..',
        '.oHHHHHHHHHHo.',
        '.oHH.HH.HH.Ho.'
      ]},
      { oy: 7, map: { R: COL.red }, rows: [
        '......RR......'
      ]},
      { oy: 8, map: { G: COL.green }, rows: [
        '........G.....'
      ]}
    ]
  },
  erkan: {
    name: 'ERKAN',
    title: 'MUHASEBECİ',
    color: COL.grey,
    hp: 95, speed: 1.0,
    weapon: 'puff',
    passiveName: 'MUHASEBE',
    passiveDesc: 'Paralar ve skor +%25. Hesap her zaman tutar.',
    suit: COL.greyDark, suitShade: COL.navy,
    overlays: [
      { oy: 2, map: { H: COL.grey, o: COL.outline }, rows: [
        '..oHH....HHo..',
        '.oH........Ho.'
      ]},
      { oy: 5, map: { G: COL.navyDark, L: COL.teal, o: COL.outline }, rows: [
        '.oGLLGGGGLLGo.'
      ]},
      { oy: 10, map: { R: COL.redDark }, rows: [
        '......RR......',
        '......RR......',
        '.......R......'
      ]},
      { oy: 12, map: { V: COL.navy, T: COL.teal }, rows: [
        '............VT'
      ]}
    ]
  },
  berker: {
    name: 'BERKER',
    title: 'DEPO / KARGO',
    color: COL.orange,
    hp: 105, speed: 1.05,
    weapon: 'box',
    passiveName: 'PAKETLEME USTASI',
    passiveDesc: 'Kolilerden +1 ödül çıkar, elit müşteriler daha sık gelir.',
    suit: COL.orange, suitShade: COL.orangeDark,
    overlays: [
      { oy: 2, map: { C: COL.orange, o: COL.outline }, rows: [
        '..oCCCCCCCCo..',
        '.oCCCCCCCCCCo.',
        '.oCC..........'
      ]},
      { oy: 10, map: { A: COL.greyLight }, rows: [
        '....A....A....',
        '....AAAAAA....',
        '....AAAAAA....',
        '....AAAAAA....'
      ]},
      { oy: 12, map: { B: COL.skinAlt, t: COL.brown, o: COL.outline }, rows: [
        '....oBBBBo....',
        '....oBttBo....',
        '....oooooo....'
      ]}
    ]
  }
};

const CHAR_ORDER = ['ahmet', 'ali', 'bekir', 'can', 'erkan', 'berker'];

// ─── Silahlar (seviye 1-6) ───────────────────────────────────
const WEAPONS = {
  suplex: {
    name: 'SUPLEKS ŞOKU',
    desc: 'Etrafındaki müşterileri mindere çakar.',
    lvlDesc: 'Hasar ve alan artar.',
    base: { cd: 2.0, dmg: 10, radius: 27, kb: 160 },
    perLvl: { cd: -0.13, dmg: 4.5, radius: 4 }
  },
  car: {
    name: 'ŞİRKET ARACI',
    desc: 'Tedarik aracı sahadan geçer, önüne geleni ezer.',
    lvlDesc: 'Hasar artar, bekleme düşer. SV4: çift araç!',
    base: { cd: 4.6, dmg: 20, kb: 220, band: 13 },
    perLvl: { cd: -0.38, dmg: 6 }
  },
  wave: {
    name: 'SES DALGASI',
    desc: 'Genişleyen nota halkaları müşterileri sarsar.',
    lvlDesc: 'Menzil ve hasar artar. SV4: +1 halka.',
    base: { cd: 1.8, dmg: 6, maxR: 44 },
    perLvl: { cd: -0.11, dmg: 2.5, maxR: 8 }
  },
  burp: {
    name: 'GEĞİRTİ DALGASI',
    desc: 'Koni şeklinde itici bir geğirti. Afiyet olsun.',
    lvlDesc: 'Menzil, açı ve hasar artar.',
    base: { cd: 1.5, dmg: 8, range: 35, arc: 1.3, kb: 190 },
    perLvl: { cd: -0.08, dmg: 3.5, range: 4.5, arc: 0.13 }
  },
  puff: {
    name: 'PUF BULUTU',
    desc: 'Kalıcı buhar bulutu içindekileri eritir.',
    lvlDesc: 'Alan, süre ve hasar artar.',
    base: { cd: 2.4, dps: 5, radius: 18, dur: 3.2, maxClouds: 3 },
    perLvl: { cd: -0.13, dps: 2, radius: 2.5, dur: 0.35 }
  },
  box: {
    name: 'KOLİ FIRLATMA',
    desc: 'Paketlenmiş koli en yakın müşteriye uçar.',
    lvlDesc: 'Hasar ve alan artar. SV3/SV5: +1 koli.',
    base: { cd: 1.6, dmg: 11, splash: 17 },
    perLvl: { cd: -0.09, dmg: 4, splash: 2.5 }
  },
  // ── koşu içinde alınabilen ek silahlar ──
  zimba: {
    name: 'ZIMBA TABANCASI',
    desc: 'En yakın müşteriye delici zımba teli fırlatır.',
    lvlDesc: 'Hasar ve delme artar. SV3/SV5: +1 tel.',
    base: { cd: 1.15, dmg: 8, spd: 210, pierce: 2 },
    perLvl: { cd: -0.07, dmg: 3, pierce: 0.4 }
  },
  mail: {
    name: 'TOPLU MAİL',
    desc: 'Güdümlü e-postalar rastgele müşterileri bulur.',
    lvlDesc: 'Hasar ve mail sayısı artar.',
    base: { cd: 2.3, dmg: 10, count: 2, spd: 125 },
    perLvl: { cd: -0.14, dmg: 3.5, count: 0.4 }
  },
  mop: {
    name: 'DEVRİYE PASPASI',
    desc: 'Etrafında dönen paspas müşterileri siler süpürür.',
    lvlDesc: 'Hasar ve hız artar. SV4/SV6: +1 paspas.',
    base: { cd: 1, dmg: 9, orbitR: 30, rot: 2.6 },
    perLvl: { dmg: 3.5, orbitR: 2, rot: 0.22 }
  }
};
const WEAPON_MAX_LVL = 6;
const MAX_WEAPONS = 3;

// ─── Silah evrimleri: SV6 silah + eşleşen item ≥ gerekli seviye ───
// Kargo kolisi açıldığında koşullar sağlanıyorsa silah evrimleşir.
const EVOLUTIONS = {
  suplex: { need: 'sigorta',  needLvl: 2, name: 'ŞAMPİYONLUK KEMERİ', desc: 'Dev sarsıntı: alan ve hasar ikiye katlanır, müşteriler sersemler.' },
  car:    { need: 'kahve',    needLvl: 2, name: 'SEVKİYAT KONVOYU',   desc: 'Araç filosu aralıksız sefer yapar.' },
  wave:   { need: 'klavye',   needLvl: 2, name: 'STADYUM KONSERİ',    desc: 'Dev nota halkaları sahneyi inletir ve sersemletir.' },
  burp:   { need: 'robotkol', needLvl: 2, name: 'SONİK GEĞİRTİ',      desc: '360 derece ses patlaması. Rezalet ama etkili.' },
  puff:   { need: 'miknatis', needLvl: 2, name: 'SİS MAKİNESİ',       desc: 'Seni takip eden dev buhar bulutu.' },
  box:    { need: 'drone',    needLvl: 1, name: 'KARGO FİLOSU',       desc: 'Drone filosu gökten koli yağdırır.' }
};

// ─── Aktif yetenekler (SPACE): karaktere özel, SV1-5 ─────────
const SKILL_MAX_LVL = 5;
const SKILLS = {
  ahmet: {
    name: 'MİNDER DAYAĞI',
    desc: 'İleri atılır, yolundaki müşterileri mindere çakar.',
    lvlDesc: 'Hasar, menzil ve sersemletme artar.',
    cd: 11,
    base: { dmg: 32, range: 75, stun: 1.2 },
    perLvl: { dmg: 16, range: 12, stun: 0.2, cd: -0.5 }
  },
  ali: {
    name: 'EL FRENİ ŞOV',
    desc: 'Kısa süre ışık hızında: değdiğini ezer, hasar almaz.',
    lvlDesc: 'Süre ve ezme hasarı artar.',
    cd: 12,
    base: { dur: 1.6, dmg: 20 },
    perLvl: { dur: 0.3, dmg: 9, cd: -0.5 }
  },
  bekir: {
    name: 'AKUSTİK PATLAMA',
    desc: 'Dev nota dalgası: herkesi savurur ve sersemletir.',
    lvlDesc: 'Alan, hasar ve sersemletme artar.',
    cd: 13,
    base: { r: 90, dmg: 26, stun: 1.4 },
    perLvl: { r: 15, dmg: 12, stun: 0.25, cd: -0.5 }
  },
  can: {
    name: 'SORU BOMBARDIMANI',
    desc: 'Ekrandaki HERKES soruya boğulur ve donar.',
    lvlDesc: 'Donma süresi ve hasar artar.',
    cd: 14,
    base: { dur: 2.2, dmg: 10 },
    perLvl: { dur: 0.4, dmg: 7, cd: -0.6 }
  },
  erkan: {
    name: 'VERGİ DENETİMİ',
    desc: 'Yakın müşterilerden para söker, çipleri mıknatıslar.',
    lvlDesc: 'Alan, hasar ve sökülen para artar.',
    cd: 13,
    base: { r: 85, dmg: 24, coins: 2 },
    perLvl: { r: 12, dmg: 11, coins: 1, cd: -0.5 }
  },
  berker: {
    name: 'SEVKİYAT YAĞMURU',
    desc: 'Baktığın yöne koli bombardımanı. Nişan sende!',
    lvlDesc: 'Koli sayısı ve hasar artar.',
    cd: 12,
    base: { n: 6, dmg: 20, splash: 22 },
    perLvl: { n: 2, dmg: 8, splash: 2, cd: -0.5 }
  }
};

// ─── Pasif geliştirme itemleri ───────────────────────────────
const ITEMS = {
  kahve:    { name: 'BAYAT KAHVE',      desc: '+%8 hareket hızı',            max: 5 },
  sigorta:  { name: 'İŞ GÜVENLİĞİ',     desc: '+1 zırh (hasar azaltma)',     max: 5 },
  klavye:   { name: 'MEKANİK KLAVYE',   desc: 'Silah beklemesi -%7',         max: 5 },
  miknatis: { name: 'NEODYUM MIKNATIS', desc: '+%22 toplama alanı',          max: 5 },
  robotkol: { name: 'ROBOT KOL',        desc: 'Yumruk atan kol: +%9 hasar, +%4 kritik', max: 5 },
  drone:    { name: 'SERVO DRONE',      desc: 'Yörüngende dönen drone (+1)', max: 3 },
  prim:     { name: 'SATIŞ PRİMİ',      desc: 'Para ve skor +%12',           max: 3 },
  enerji:   { name: 'ENERJİ İÇECEĞİ',   desc: 'Canının %40 kadarını doldurur', max: 99, heal: true }
};

// ─── Düşman (müşteri) tipleri ────────────────────────────────
const ENEMY_TYPES = {
  aceleci: {
    name: 'ACELECİ MÜŞTERİ',
    hp: 12, dmg: 7, speed: 46, scale: 0.9, xp: 1, score: 10,
    shirt: COL.teal, shade: COL.cyan, skin: COL.skin,
    minTime: 0, weight: 3
  },
  kararsiz: {
    name: 'KARARSIZ MÜŞTERİ',
    hp: 22, dmg: 8, speed: 25, scale: 1.0, xp: 1, score: 12,
    shirt: COL.yellow, shade: COL.gold, skin: COL.skinAlt,
    minTime: 0, weight: 4, wander: true,
    overlay: { oy: 0, map: { H: COL.gold, o: COL.outline }, rows: [
      '..oHHHHHHo..',
      'oHHHHHHHHHHo'
    ]}
  },
  pazarlikci: {
    name: 'PAZARLIKÇI MÜŞTERİ',
    hp: 55, dmg: 12, speed: 17, scale: 1.15, xp: 2, score: 20,
    shirt: COL.brown, shade: COL.brownDark, skin: COL.skinAlt,
    minTime: 90, weight: 2.5,
    overlay: { oy: 0, map: { H: COL.greenDeep, o: COL.outline }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.'
    ]}
  },
  iadeci: {
    name: 'İADECİ MÜŞTERİ',
    hp: 30, dmg: 6, speed: 23, scale: 1.0, xp: 2, score: 18,
    shirt: COL.pink, shade: COL.redDark, skin: COL.skin,
    minTime: 180, weight: 2, ranged: { range: 130, cd: 3.2, projSpd: 65, dmg: 9 },
    overlay: { oy: 7, map: { B: COL.skinAlt, t: COL.brown, o: COL.outline }, rows: [
      '..oBBBBBBo..',
      '..oBttttBo..',
      '..oBBBBBBo..'
    ]}
  },
  kuponcu: {
    name: 'KUPON AVCISI',
    hp: 16, dmg: 9, speed: 30, scale: 0.9, xp: 2, score: 16,
    shirt: COL.gold, shade: COL.orange, skin: COL.skin,
    minTime: 120, weight: 2,
    dash: { cd: 3.2, wind: 0.45, spd: 165, dur: 0.35 },
    overlay: { oy: 0, map: { H: COL.red, o: COL.outline }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.'
    ]}
  },
  kalabalik: {
    name: 'KALABALIK AİLE',
    hp: 78, dmg: 10, speed: 18, scale: 1.35, xp: 3, score: 28,
    shirt: COL.greenDeep, shade: COL.greenDark, skin: COL.skinAlt,
    minTime: 240, weight: 1.6,
    split: { id: 'cocuk', n: 3 },
    overlay: { oy: 0, map: { H: COL.hairDark, o: COL.outline }, rows: [
      '....oHHo....',
      '..oHHHHHHo..'
    ]}
  },
  cocuk: {
    name: 'VELET',
    hp: 7, dmg: 5, speed: 56, scale: 0.7, xp: 1, score: 6,
    shirt: COL.teal, shade: COL.cyan, skin: COL.skinAlt,
    minTime: 0, weight: 0
  },
  sosyalci: {
    name: 'FENOMEN',
    hp: 45, dmg: 8, speed: 22, scale: 1.0, xp: 3, score: 26,
    shirt: COL.pink, shade: COL.purple, skin: COL.skin,
    minTime: 300, weight: 1.3,
    aura: { r: 55, spdMul: 1.45 },
    overlay: { oy: 0, map: { H: COL.purple, o: COL.outline, T: COL.teal }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.',
      '.oHH....HHo.',
      '..........T.',
      '..........T.'
    ]}
  },
  kurye: {
    name: 'BOMBACI KURYE',
    hp: 22, dmg: 6, speed: 58, scale: 0.95, xp: 2, score: 22,
    shirt: COL.red, shade: COL.redDark, skin: COL.skinAlt,
    minTime: 360, weight: 1.4,
    bomb: { fuse: 0.7, r: 30, dmg: 20 },
    overlay: { oy: 0, map: { H: COL.orange, o: COL.outline }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.'
    ]}
  },
  nine: {
    name: 'PAZARCI TEYZE',
    hp: 90, dmg: 14, speed: 14, scale: 1.2, xp: 3, score: 30,
    shirt: COL.purple, shade: COL.purpleDark, skin: COL.skinAlt,
    minTime: 150, weight: 1.8, armor: 2, heavy: true,
    overlay: { oy: 0, map: { H: COL.greyLight, o: COL.outline, B: COL.brownDark }, rows: [
      '.oHHHHHHHHo.',
      'oHHHHHHHHHHo',
      'oHH......HHo',
      '.oH......Ho.',
      '............',
      '............',
      '............',
      '............',
      '.........BBB',
      '.........BBB'
    ]}
  },
  yildizci: {
    name: 'BİR YILDIZCI',
    hp: 26, dmg: 8, speed: 26, scale: 1.0, xp: 3, score: 24,
    shirt: COL.gold, shade: COL.orangeDark, skin: COL.skin,
    minTime: 210, weight: 1.6,
    ranged: { range: 120, cd: 3.6, projSpd: 72, dmg: 8, spread: 3, spr: 'star' },
    overlay: { oy: 0, map: { H: COL.hairDark, o: COL.outline, Y: COL.yellow }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '.....Y......',
      '....YYY.....',
      '.....Y......'
    ]}
  },
  gececi: {
    name: 'GECE MÜŞTERİSİ',
    hp: 24, dmg: 11, speed: 62, scale: 0.95, xp: 3, score: 28,
    shirt: COL.navyDark, shade: COL.outline, skin: COL.greyLight,
    minTime: 480, weight: 2.4, ghostly: true,
    overlay: { oy: 0, map: { H: COL.navyDark, o: COL.outline, T: COL.teal }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.',
      '.oHH....HHo.',
      '....T..T....'
    ]}
  },
  vip: {
    name: 'VIP MÜŞTERİ',
    hp: 130, dmg: 14, speed: 19, scale: 1.25, xp: 5, score: 60,
    shirt: COL.navyDark, shade: COL.outline, skin: COL.skin,
    minTime: 420, weight: 0.9, armor: 3,
    overlay: { oy: 2, map: { S: COL.outline, G: COL.gold }, rows: [
      '.SSSS..SSSS.',
      '............',
      '............',
      '............',
      '............',
      '...GGGGGG...'
    ]}
  },
  // ── kırılabilir çevre nesneleri (silahlarla parçalanır, ödül düşürür) ──
  kasa: {
    name: 'KASA', hp: 8, dmg: 0, speed: 0, scale: 1.0, xp: 0, score: 5,
    breakable: true, sprite: 'kasa', weight: 0, minTime: 0,
    shirt: COL.brown, shade: COL.brownDark, skin: COL.skinAlt
  },
  varil: {
    name: 'VARİL', hp: 14, dmg: 0, speed: 0, scale: 1.0, xp: 0, score: 8,
    breakable: true, sprite: 'varil', weight: 0, minTime: 0,
    shirt: COL.cyan, shade: COL.blueDark, skin: COL.skin
  },
  kizgin: {
    name: 'KIZGIN MÜŞTERİ',
    hp: 260, dmg: 16, speed: 21, scale: 1.7, xp: 10, score: 150,
    shirt: COL.red, shade: COL.redDark, skin: COL.skin,
    elite: true
  },
  toptanci: {
    name: 'TOPTANCI',
    hp: 950, dmg: 24, speed: 15, scale: 2.4, xp: 40, score: 1500,
    shirt: COL.purpleDark, shade: COL.hairDark, skin: COL.skinAlt,
    boss: true, big: true, sprScale: 1.6,
    charge: { cd: 8, wind: 0.7, spd: 185, dur: 0.55 },
    summon: { cd: 6, id: 'aceleci', n: 3 },
    lob: { cd: 5.5, n: 2, dmg: 16, r: 24, warn: 0.9 }
  },
  karaborsaci: {
    name: 'KARABORSACI',
    hp: 1500, dmg: 20, speed: 13, scale: 2.1, xp: 50, score: 2500,
    shirt: COL.hairDark, shade: COL.outline, skin: COL.skinAlt,
    boss: true, big: true, sprScale: 1.55,
    tele: { cd: 5, burst: 10, projSpd: 78, dmg: 11 },
    rain: { cd: 7, n: 8, dmg: 9, r: 14, warn: 0.8 }
  },
  mudur: {
    name: 'BÖLGE MÜDÜRÜ',
    hp: 3400, dmg: 26, speed: 16, scale: 2.4, xp: 90, score: 5000,
    shirt: COL.blueDark, shade: COL.navyDark, skin: COL.skin,
    boss: true,
    charge: { cd: 5, wind: 0.6, spd: 210, dur: 0.5 },
    shotgun: { cd: 4.5, n: 5, spread: 0.7, projSpd: 85, dmg: 13 },
    overlay: { oy: 0, map: { H: COL.grey, o: COL.outline, K: COL.red }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.',
      '............',
      '............',
      '............',
      '............',
      '............',
      '.....KK.....',
      '.....KK.....'
    ]}
  },
  rakip: {
    name: 'RAKİP CEO',
    hp: 4200, dmg: 30, speed: 15, scale: 2.5, xp: 110, score: 6000,
    shirt: COL.greenDeep, shade: COL.outline, skin: COL.skinAlt,
    boss: true,
    tele: { cd: 6, burst: 14, projSpd: 85, dmg: 13 },
    summon: { cd: 7, id: 'kuponcu', n: 3 },
    overlay: { oy: 0, map: { H: COL.hairDark, S: COL.outline, G: COL.gold }, rows: [
      '.HHHHHHHHHH.',
      'HHHHHHHHHHHH',
      '.SSSS..SSSS.',
      '............',
      '............',
      '............',
      '...G....G...',
      '............',
      '.....GG.....'
    ]}
  },
  patron: {
    name: 'BÜYÜK PATRON',
    hp: 2600, dmg: 28, speed: 14, scale: 2.7, xp: 80, score: 4000,
    shirt: COL.outline, shade: COL.hairDark, skin: COL.skin,
    boss: true, patron: true, big: true, sprScale: 1.85,
    charge: { cd: 6, wind: 0.7, spd: 200, dur: 0.55 },
    tele: { cd: 7, burst: 12, projSpd: 82, dmg: 12 },
    summon: { cd: 8, id: 'kurye', n: 2 },
    slam: { cd: 9, wind: 0.8, dmg: 14, maxR: 95 }
  }
};

// Boss takvimi: ilk üç patron sabit, sonrası sonsuz döngü
const BOSS_SCHEDULE = [
  { t: 300, id: 'toptanci',    banner: 'TOPTANCI GELDİ! BÜYÜK SİPARİŞ!' },
  { t: 600, id: 'karaborsaci', banner: 'KARABORSACI GELDİ! PİYASAYI KARIŞTIRIYOR!' },
  { t: 840, id: 'patron',      banner: 'BÜYÜK PATRON GELDİ! HERKES İŞ BAŞINA!' }
];
// Fazla mesaide dönen boss havuzu (90 sn arayla, güçleri zamanla ölçeklenir)
const BOSS_POOL = ['toptanci', 'karaborsaci', 'mudur', 'patron', 'rakip'];
const BOSS_CYCLE_GAP = 150;
