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
    kind: 'pulse',
    desc: 'Etrafındaki müşterileri mindere çakar.',
    lvlDesc: 'Hasar ve alan artar.',
    base: { cd: 2.0, dmg: 10, radius: 27, kb: 160 },
    perLvl: { cd: -0.13, dmg: 4.5, radius: 4 }
  },
  car: {
    name: 'ŞİRKET ARACI',
    kind: 'car',
    desc: 'Tedarik aracı sahadan geçer, önüne geleni ezer.',
    lvlDesc: 'Hasar artar, bekleme düşer. SV4: çift araç!',
    base: { cd: 4.6, dmg: 20, kb: 220, band: 13 },
    perLvl: { cd: -0.38, dmg: 6 }
  },
  wave: {
    name: 'SES DALGASI',
    kind: 'ring',
    desc: 'Genişleyen nota halkaları müşterileri sarsar.',
    lvlDesc: 'Menzil ve hasar artar. SV4: +1 halka.',
    base: { cd: 1.8, dmg: 6, maxR: 44 },
    perLvl: { cd: -0.11, dmg: 2.5, maxR: 8 }
  },
  burp: {
    name: 'GEĞİRTİ DALGASI',
    kind: 'cone',
    desc: 'Koni şeklinde itici bir geğirti. Afiyet olsun.',
    lvlDesc: 'Menzil, açı ve hasar artar.',
    base: { cd: 1.5, dmg: 8, range: 35, arc: 1.3, kb: 190 },
    perLvl: { cd: -0.08, dmg: 3.5, range: 4.5, arc: 0.13 }
  },
  puff: {
    name: 'PUF BULUTU',
    kind: 'cloud',
    desc: 'Kalıcı buhar bulutu içindekileri eritir.',
    lvlDesc: 'Alan, süre ve hasar artar.',
    base: { cd: 2.4, dps: 5, radius: 18, dur: 3.2, maxClouds: 3 },
    perLvl: { cd: -0.13, dps: 2, radius: 2.5, dur: 0.35 }
  },
  box: {
    name: 'KOLİ FIRLATMA',
    kind: 'thrown',
    desc: 'Paketlenmiş koli en yakın müşteriye uçar.',
    lvlDesc: 'Hasar ve alan artar. SV3/SV5: +1 koli.',
    base: { cd: 1.6, dmg: 11, splash: 17 },
    perLvl: { cd: -0.09, dmg: 4, splash: 2.5 }
  },
  // ── koşu içinde alınabilen ek silahlar ──
  zimba: {
    name: 'ZIMBA TABANCASI',
    kind: 'proj',
    desc: 'En yakın müşteriye delici zımba teli fırlatır.',
    lvlDesc: 'Hasar ve delme artar. SV3/SV5: +1 tel.',
    base: { cd: 1.15, dmg: 8, spd: 210, pierce: 2 },
    perLvl: { cd: -0.07, dmg: 3, pierce: 0.4 }
  },
  mail: {
    name: 'TOPLU MAİL',
    kind: 'homing',
    desc: 'Güdümlü e-postalar rastgele müşterileri bulur.',
    lvlDesc: 'Hasar ve mail sayısı artar.',
    base: { cd: 2.3, dmg: 10, count: 2, spd: 125 },
    perLvl: { cd: -0.14, dmg: 3.5, count: 0.4 }
  },
  mop: {
    name: 'DEVRİYE PASPASI',
    kind: 'orbit',
    desc: 'Etrafında dönen paspas müşterileri siler süpürür.',
    lvlDesc: 'Hasar ve hız artar. SV4/SV6: +1 paspas.',
    base: { cd: 1, dmg: 9, orbitR: 30, rot: 2.6 },
    perLvl: { dmg: 3.5, orbitR: 2, rot: 0.22 }
  },

  // ── karakter oto vuruş varyantları (dükkân/başarımla açılır) ──
  kemer: {
    name: 'KEMER FIRLATMA', kind: 'proj', vis: 'kemer', boom: true,
    desc: 'Şampiyonluk kemeri gidip gelir, yolundaki herkesi biçer.',
    lvlDesc: 'Hasar ve hız artar. SV3/SV5: +1 kemer.',
    base: { cd: 1.6, dmg: 10, spd: 150, pierce: 99 },
    perLvl: { cd: -0.09, dmg: 4, spd: 8 }
  },
  salto: {
    name: 'SALTO ŞOKU', kind: 'cone', col: 'red',
    desc: 'İleri takla: önündekileri sert şekilde mindere gömer.',
    lvlDesc: 'Menzil, açı ve hasar artar.',
    base: { cd: 1.7, dmg: 12, range: 32, arc: 1.1, kb: 260 },
    perLvl: { cd: -0.09, dmg: 4.5, range: 4, arc: 0.1 }
  },
  korna: {
    name: 'KORNA DALGASI', kind: 'ring', col: 'yellow',
    desc: 'Kulak patlatan korna halkası müşterileri savurur.',
    lvlDesc: 'Menzil ve hasar artar. SV4: +1 halka.',
    base: { cd: 2.0, dmg: 5, maxR: 40, kb: 180 },
    perLvl: { cd: -0.12, dmg: 2, maxR: 7 }
  },
  lastik: {
    name: 'LASTİK YAKMA', kind: 'cloud', trail: true, col: 'orange',
    desc: 'Arkanda yanan lastik izi bırakırsın. Drift!',
    lvlDesc: 'Hasar, iz süresi ve alan artar.',
    base: { cd: 0.9, dps: 6, radius: 14, dur: 2.5, maxClouds: 6 },
    perLvl: { cd: -0.05, dps: 2, radius: 1.5, dur: 0.25 }
  },
  mikrofon: {
    name: 'MİKROFON ÇEVİRME', kind: 'orbit', vis: 'mic', single: true,
    desc: 'Kablolu mikrofon başının etrafında ölümcül döner.',
    lvlDesc: 'Hasar, menzil ve dönüş hızı artar.',
    base: { cd: 1, dmg: 14, orbitR: 34, rot: 3.2 },
    perLvl: { dmg: 5, orbitR: 2.5, rot: 0.25 }
  },
  basdrop: {
    name: 'BAS DROP', kind: 'pulse', atCrowd: true, col: 'purple',
    desc: 'Bas patlaması en kalabalık noktaya iner.',
    lvlDesc: 'Hasar ve alan artar.',
    base: { cd: 2.6, dmg: 14, radius: 30, kb: 200 },
    perLvl: { cd: -0.15, dmg: 5, radius: 4 }
  },
  soru: {
    name: 'SORU YAĞMURU', kind: 'homing', vis: 'soru',
    desc: 'Uçan sorular müşterileri bulur ve bunaltır.',
    lvlDesc: 'Hasar ve soru sayısı artar.',
    base: { cd: 2.1, dmg: 9, count: 3, spd: 110 },
    perLvl: { cd: -0.12, dmg: 3, count: 0.35 }
  },
  gaz: {
    name: 'GAZ BULUTU', kind: 'cloud', col: 'green',
    desc: 'Dev, ağır, utanç verici bir bulut. Kimse yaklaşamaz.',
    lvlDesc: 'Alan, süre ve hasar artar.',
    base: { cd: 3.0, dps: 7, radius: 26, dur: 4, maxClouds: 2 },
    perLvl: { cd: -0.16, dps: 2.5, radius: 3, dur: 0.4 }
  },
  fatura: {
    name: 'FATURA KESME', kind: 'proj', vis: 'fatura',
    desc: 'Kesilen faturalar müşterileri delip geçer.',
    lvlDesc: 'Hasar ve delme artar. SV3/SV5: +1 fatura.',
    base: { cd: 1.0, dmg: 9, spd: 230, pierce: 3 },
    perLvl: { cd: -0.06, dmg: 3, pierce: 0.5 }
  },
  muhur: {
    name: 'VERGİ MÜHRÜ', kind: 'thrown', stun: 0.5,
    desc: 'Resmi mühür: damgalanan sersemler.',
    lvlDesc: 'Hasar ve alan artar. SV3/SV5: +1 mühür.',
    base: { cd: 1.8, dmg: 12, splash: 15 },
    perLvl: { cd: -0.1, dmg: 4.5, splash: 2 }
  },
  forklift: {
    name: 'FORKLİFT SEFERİ', kind: 'car', vis: 'fork',
    desc: 'Forklift depodan geçer; ne bulursa taşır.',
    lvlDesc: 'Hasar artar, bekleme düşer. SV4: çift sefer!',
    base: { cd: 5.2, dmg: 26, kb: 260, band: 16 },
    perLvl: { cd: -0.4, dmg: 7 }
  },
  kolibandi: {
    name: 'KOLİ BANDI', kind: 'orbit', vis: 'koli',
    desc: 'Etrafında dönen koli hattı: üretim durmaz.',
    lvlDesc: 'Hasar ve hız artar. SV4/SV6: +1 koli.',
    base: { cd: 1, dmg: 8, orbitR: 28, rot: 2.4 },
    perLvl: { dmg: 3, orbitR: 2.5, rot: 0.2 }
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
  box:    { need: 'drone',    needLvl: 1, name: 'KARGO FİLOSU',       desc: 'Drone filosu gökten koli yağdırır.' },
  // varyant vuruşların evrimleri
  kemer:     { need: 'klavye',   needLvl: 2, name: 'ALTIN KEMER',        desc: 'Kemer daha hızlı döner, hasar patlar.' },
  salto:     { need: 'kahve',    needLvl: 2, name: 'TURBO SALTO',        desc: 'Peş peşe salto: alan ve hasar büyür.' },
  korna:     { need: 'robotkol', needLvl: 2, name: 'BASS KORNA',         desc: 'Kulak zarı yırtan devasa halkalar.' },
  lastik:    { need: 'miknatis', needLvl: 2, name: 'DRİFT USTASI',       desc: 'İz daha geniş yanar, daha uzun kalır.' },
  mikrofon:  { need: 'prim',     needLvl: 2, name: 'PLATİN MİKROFON',    desc: 'Mikrofon devleşir, sahne senindir.' },
  basdrop:   { need: 'drone',    needLvl: 1, name: 'FESTİVAL MODU',      desc: 'Bas patlamaları sahneyi yıkar.' },
  soru:      { need: 'klavye',   needLvl: 2, name: 'SINAV HAFTASI',      desc: 'Soru yağmuru sağanağa döner.' },
  gaz:       { need: 'sigorta',  needLvl: 2, name: 'KİMYASAL TEHLİKE',   desc: 'Bulut devleşir; bölge tahliye edilir.' },
  fatura:    { need: 'prim',     needLvl: 2, name: 'İCRA TAKİBİ',        desc: 'Faturalar seri ve acımasız kesilir.' },
  muhur:     { need: 'robotkol', needLvl: 2, name: 'KIRMIZI MÜHÜR',      desc: 'Dev mühür: damgalanan kalkamaz.' },
  forklift:  { need: 'kahve',    needLvl: 2, name: 'EKSPRES SEFER',      desc: 'Forkliftler aralıksız sefer yapar.' },
  kolibandi: { need: 'miknatis', needLvl: 2, name: 'OTOMASYON HATTI',    desc: 'Koli hattı tam kapasite döner.' }
};

// ─── Aktif yetenekler (SPACE): düz kayıt, id → tanım, SV1-5 ──
// kind: dash | turbo | burst | freezeall | taxsweep | boxrain
//     | shieldburst | carstrike | decoy | slowmo | vacuum
const SKILL_MAX_LVL = 5;
const SKILLS = {
  // ── varsayılanlar (baştan açık) ──
  minder: {
    char: 'ahmet', kind: 'dash', icon: 'sk_ahmet',
    name: 'MİNDER DAYAĞI',
    desc: 'İleri atılır, yolundaki müşterileri mindere çakar.',
    lvlDesc: 'Hasar, menzil ve sersemletme artar.',
    cd: 11,
    base: { dmg: 32, range: 75, stun: 1.2 },
    perLvl: { dmg: 16, range: 12, stun: 0.2, cd: -0.5 }
  },
  elfren: {
    char: 'ali', kind: 'turbo', icon: 'sk_ali',
    name: 'EL FRENİ ŞOV',
    desc: 'Kısa süre ışık hızında: değdiğini ezer, hasar almaz.',
    lvlDesc: 'Süre ve ezme hasarı artar.',
    cd: 12,
    base: { dur: 1.6, dmg: 20 },
    perLvl: { dur: 0.3, dmg: 9, cd: -0.5 }
  },
  akustik: {
    char: 'bekir', kind: 'burst', icon: 'sk_bekir', col: 'purple',
    name: 'AKUSTİK PATLAMA',
    desc: 'Dev nota dalgası: herkesi savurur ve sersemletir.',
    lvlDesc: 'Alan, hasar ve sersemletme artar.',
    cd: 13,
    base: { r: 90, dmg: 26, stun: 1.4, kb: 300 },
    perLvl: { r: 15, dmg: 12, stun: 0.25, cd: -0.5 }
  },
  sorubomb: {
    char: 'can', kind: 'freezeall', icon: 'sk_can',
    name: 'SORU BOMBARDIMANI',
    desc: 'Ekrandaki HERKES soruya boğulur ve donar.',
    lvlDesc: 'Donma süresi ve hasar artar.',
    cd: 14,
    base: { dur: 2.2, dmg: 10 },
    perLvl: { dur: 0.4, dmg: 7, cd: -0.6 }
  },
  vergi: {
    char: 'erkan', kind: 'taxsweep', icon: 'sk_erkan',
    name: 'VERGİ DENETİMİ',
    desc: 'Yakın müşterilerden para söker, çipleri mıknatıslar.',
    lvlDesc: 'Alan, hasar ve sökülen para artar.',
    cd: 13,
    base: { r: 85, dmg: 24, coins: 2 },
    perLvl: { r: 12, dmg: 11, coins: 1, cd: -0.5 }
  },
  sevkiyat: {
    char: 'berker', kind: 'boxrain', icon: 'sk_berker',
    name: 'SEVKİYAT YAĞMURU',
    desc: 'Baktığın yöne koli bombardımanı. Nişan sende!',
    lvlDesc: 'Koli sayısı ve hasar artar.',
    cd: 12,
    base: { n: 6, dmg: 20, splash: 22 },
    perLvl: { n: 2, dmg: 8, splash: 2, cd: -0.5 }
  },

  // ── açılabilir varyantlar ──
  kafagogus: {
    char: 'ahmet', kind: 'burst', icon: 'sk_kafa', col: 'red',
    name: 'KAFA GÖĞÜS',
    desc: 'Yakın çevreye yıkıcı kafa darbesi: az alan, dev hasar.',
    lvlDesc: 'Hasar ve sersemletme artar.',
    cd: 10,
    base: { r: 55, dmg: 50, stun: 0.8, kb: 340 },
    perLvl: { r: 6, dmg: 20, stun: 0.15, cd: -0.4 }
  },
  sampiyonk: {
    char: 'ahmet', kind: 'shieldburst', icon: 'sk_kalkan',
    name: 'ŞAMPİYON DURUŞU',
    desc: 'Kalkan kuşanır, etrafını savurur. Ringin sahibi belli.',
    lvlDesc: 'Kalkan süresi ve itiş hasarı artar.',
    cd: 14,
    base: { shield: 4, r: 60, dmg: 20 },
    perLvl: { shield: 0.6, r: 6, dmg: 8, cd: -0.5 }
  },
  konvoy: {
    char: 'ali', kind: 'carstrike', icon: 'sk_konvoy',
    name: 'KONVOY ÇAĞIR',
    desc: 'Dört bir yandan şirket araçları fırlar.',
    lvlDesc: 'Araç sayısı ve hasar artar.',
    cd: 13,
    base: { n: 4, dmg: 24 },
    perLvl: { n: 1, dmg: 8, cd: -0.5 }
  },
  yedek: {
    char: 'ali', kind: 'decoy', icon: 'sk_yedek',
    name: 'YEDEK ARAÇ',
    desc: 'Korna çalan sahte hedef bırakır; sonunda patlar.',
    lvlDesc: 'Süre ve patlama hasarı artar.',
    cd: 12,
    base: { dur: 3.5, dmg: 26, r: 45 },
    perLvl: { dur: 0.4, dmg: 10, r: 4, cd: -0.5 }
  },
  balad: {
    char: 'bekir', kind: 'slowmo', icon: 'sk_balad',
    name: 'AĞIR BALAD',
    desc: 'Duygusal şarkı: tüm müşteriler ağır çekime düşer.',
    lvlDesc: 'Süre ve yavaşlatma artar.',
    cd: 13,
    base: { dur: 3, slow: 0.45 },
    perLvl: { dur: 0.5, slow: 0.04, cd: -0.5 }
  },
  hayran: {
    char: 'bekir', kind: 'vacuum', icon: 'sk_hayran', col: 'pink',
    name: 'HAYRAN KİTLESİ',
    desc: 'Müşterileri kendine çeker; nota fırtınası vurur.',
    lvlDesc: 'Alan ve hasar artar.',
    cd: 12,
    base: { r: 110, dmg: 18, pull: 260 },
    perLvl: { r: 10, dmg: 8, cd: -0.5 }
  },
  klon: {
    char: 'can', kind: 'decoy', icon: 'sk_klon',
    name: 'SAHTE CAN',
    desc: 'Soru soran bir klon bırakır; dayanamayıp patlar.',
    lvlDesc: 'Süre ve patlama hasarı artar.',
    cd: 12,
    base: { dur: 4, dmg: 22, r: 42 },
    perLvl: { dur: 0.5, dmg: 9, r: 4, cd: -0.5 }
  },
  geger: {
    char: 'can', kind: 'burst', icon: 'sk_geger', col: 'green',
    name: 'MEGA GEĞİRTİ',
    desc: 'Tarihe geçecek bir geğirti: herkes savrulur.',
    lvlDesc: 'Alan ve hasar artar.',
    cd: 11,
    base: { r: 70, dmg: 30, stun: 0.5, kb: 320 },
    perLvl: { r: 9, dmg: 12, cd: -0.4 }
  },
  burokrasi: {
    char: 'erkan', kind: 'slowmo', icon: 'sk_burokrasi',
    name: 'BÜROKRASİ',
    desc: 'Evrak işine boğulan müşteriler yavaşlar.',
    lvlDesc: 'Süre ve yavaşlatma artar.',
    cd: 13,
    base: { dur: 3.5, slow: 0.5 },
    perLvl: { dur: 0.5, slow: 0.04, cd: -0.5 }
  },
  butce: {
    char: 'erkan', kind: 'shieldburst', icon: 'sk_butce',
    name: 'BÜTÇE KALKANI',
    desc: 'Bütçe onaylandı: kalkan + evrak fırtınası.',
    lvlDesc: 'Kalkan süresi ve hasar artar.',
    cd: 14,
    base: { shield: 5, r: 55, dmg: 16 },
    perLvl: { shield: 0.6, r: 6, dmg: 7, cd: -0.5 }
  },
  forkonvoy: {
    char: 'berker', kind: 'carstrike', icon: 'sk_forkonvoy',
    name: 'FORKLİFT FİLOSU',
    desc: 'Depodaki tüm forkliftler aynı anda sefere çıkar.',
    lvlDesc: 'Forklift sayısı ve hasar artar.',
    cd: 13,
    base: { n: 3, dmg: 30 },
    perLvl: { n: 1, dmg: 9, cd: -0.5 }
  },
  vakum: {
    char: 'berker', kind: 'vacuum', icon: 'sk_vakum', col: 'orange',
    name: 'VAKUM PAKETLEME',
    desc: 'Dev vakum: müşterileri çeker ve paketler.',
    lvlDesc: 'Alan ve hasar artar.',
    cd: 12,
    base: { r: 100, dmg: 20, pull: 280 },
    perLvl: { r: 10, dmg: 8, cd: -0.5 }
  }
};

// ─── Teknik kataloğu: karakter → seçilebilir vuruş/yetenek listeleri ───
// İlk giriş baştan açık; diğerleri dükkândan (TECH_COST) ya da başarımla açılır.
const TECHS = {
  ahmet:  { weapons: ['suplex', 'kemer', 'salto'],       skills: ['minder', 'kafagogus', 'sampiyonk'] },
  ali:    { weapons: ['car', 'korna', 'lastik'],         skills: ['elfren', 'konvoy', 'yedek'] },
  bekir:  { weapons: ['wave', 'mikrofon', 'basdrop'],    skills: ['akustik', 'balad', 'hayran'] },
  can:    { weapons: ['burp', 'soru', 'gaz'],            skills: ['sorubomb', 'klon', 'geger'] },
  erkan:  { weapons: ['puff', 'fatura', 'muhur'],        skills: ['vergi', 'burokrasi', 'butce'] },
  berker: { weapons: ['box', 'forklift', 'kolibandi'],   skills: ['sevkiyat', 'forkonvoy', 'vakum'] }
};
const TECH_COST = [0, 60, 120];   // varyant sırasına göre dükkân fiyatı

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
    line: "Hepsini toptan alıyorum... SİZİ DE!",
    hp: 950, dmg: 24, speed: 15, scale: 2.4, xp: 40, score: 1500,
    shirt: COL.purpleDark, shade: COL.hairDark, skin: COL.skinAlt,
    boss: true, big: true, sprScale: 1.6,
    charge: { cd: 8, wind: 0.7, spd: 185, dur: 0.55 },
    summon: { cd: 6, id: 'aceleci', n: 3 },
    lob: { cd: 5.5, n: 2, dmg: 16, r: 24, warn: 0.9 }
  },
  karaborsaci: {
    name: 'KARABORSACI',
    line: "Fiyatlar benim, kurallar benim.",
    hp: 1500, dmg: 20, speed: 13, scale: 2.1, xp: 50, score: 2500,
    shirt: COL.hairDark, shade: COL.outline, skin: COL.skinAlt,
    boss: true, big: true, sprScale: 1.55,
    tele: { cd: 5, burst: 10, projSpd: 78, dmg: 11 },
    rain: { cd: 7, n: 8, dmg: 9, r: 14, warn: 0.8 }
  },
  mudur: {
    name: 'BÖLGE MÜDÜRÜ',
    line: "KPI larınız tam bir felaket.",
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
    line: "Sitenizi 49 liraya satın alıyorum.",
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
    line: "Mesai bitti diyen KİM?",
    hp: 2600, dmg: 28, speed: 14, scale: 2.7, xp: 80, score: 4000,
    shirt: COL.outline, shade: COL.hairDark, skin: COL.skin,
    boss: true, patron: true, big: true, sprScale: 1.85,
    charge: { cd: 6, wind: 0.7, spd: 200, dur: 0.55 },
    tele: { cd: 7, burst: 12, projSpd: 82, dmg: 12 },
    summon: { cd: 8, id: 'kurye', n: 2 },
    slam: { cd: 9, wind: 0.8, dmg: 14, maxR: 95 }
  },

  // ── COUNTER BOSSLAR: oyuncunun build'ine göre gelen nemesis'ler ──
  // counter alanı buildProfile() çıktısıyla eşleşir; dk12+ döngüde gelirler.
  pazarlamaci: {
    name: 'PAZARLAMA MÜDÜRÜ',
    line: "Yaklaşma! Broşür fırlatırım!",
    hp: 3800, dmg: 24, speed: 20, scale: 2.3, xp: 100, score: 5500,
    shirt: COL.pink, shade: COL.purpleDark, skin: COL.skin,
    boss: true, counter: 'melee',
    // yakın dövüşçünün kabusu: yaklaşınca kaçar, uzaktan yelpaze sıkar, sıkışınca ışınlanır
    flee: { r: 130, k: 1.7 },
    shotgun: { cd: 3.2, n: 6, spread: 0.9, projSpd: 95, dmg: 13 },
    tele: { cd: 10, burst: 6, projSpd: 80, dmg: 12 },
    overlay: { oy: 0, map: { H: COL.gold, S: COL.outline, P: COL.pink }, rows: [
      '..HHHHHHHH..',
      '.HHHHHHHHHH.',
      '.SSSS..SSSS.',
      '............',
      '............',
      '............',
      '............',
      '....PPPP....',
      '....PPPP....'
    ]}
  },
  lojistik: {
    name: 'LOJİSTİK ŞEFİ',
    line: "Sevkiyat sana geliyor, sen bana değil.",
    hp: 4200, dmg: 26, speed: 18, scale: 2.4, xp: 110, score: 6000,
    shirt: COL.orange, shade: COL.orangeDark, skin: COL.skinAlt,
    boss: true, counter: 'ranged',
    // menzilcinin kabusu: uzak durur, mermilerden yana kaçar, araç/kargo yağdırır
    keepaway: { r: 170 },
    dodges: true,
    carAtk: { cd: 4.5, dmg: 20 },
    lob: { cd: 6, n: 3, dmg: 16, r: 26, warn: 0.9 },
    overlay: { oy: 0, map: { H: COL.orange, o: COL.outline, V: COL.yellow }, rows: [
      '..oHHHHHHo..',
      '.oHHHHHHHHo.',
      '............',
      '............',
      '............',
      '.V........V.',
      '.V........V.',
      '............',
      '............'
    ]}
  },
  takipci: {
    name: 'TAKİP UZMANI',
    line: "Kaçamazsın. Ben kargodan hızlıyım.",
    hp: 4600, dmg: 30, speed: 26, scale: 2.2, xp: 120, score: 6500,
    shirt: COL.hairDark, shade: COL.outline, skin: COL.skin,
    boss: true, counter: 'mobile',
    // kaçakçının kabusu: mermilerden kaçar, önünü keser, gitgide hızlanır
    dodges: true, predict: true,
    accel: { per: 10, k: 0.08, cap: 2.2 },
    overlay: { oy: 0, map: { H: COL.outline, S: COL.greyDark, R: COL.red }, rows: [
      '.HHHHHHHHHH.',
      'HHHHHHHHHHHH',
      '.SSSS..SSSS.',
      '..R......R..',
      '............',
      '............',
      '............',
      '............',
      '............'
    ]}
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
// build profili → counter boss eşlemesi (nemesis sistemi)
const COUNTER_BY_PROFILE = { melee: 'pazarlamaci', ranged: 'lojistik', mobile: 'takipci' };

// ─── Vardiya zorluğu 1-5 (Brotato danger): V(n) için V(n-1)'i 15dk geç ───
const SHIFT_DEFS = [
  { n: 1, name: 'VARDİYA 1', desc: 'Standart mesai',                    hp: 1,    dmg: 1,    rate: 1,    reward: 1 },
  { n: 2, name: 'VARDİYA 2', desc: 'Müşteriler sertleşir (+%25)',       hp: 1.25, dmg: 1.2,  rate: 1.15, reward: 1.3 },
  { n: 3, name: 'VARDİYA 3', desc: 'Yoğun mesai (+%50)',                hp: 1.5,  dmg: 1.4,  rate: 1.3,  reward: 1.6 },
  { n: 4, name: 'VARDİYA 4', desc: 'Kabus vardiyası (+%75)',            hp: 1.75, dmg: 1.6,  rate: 1.45, reward: 2 },
  { n: 5, name: 'VARDİYA 5', desc: 'Depo cehennemi (+%100)',            hp: 2,    dmg: 1.8,  rate: 1.6,  reward: 2.5 }
];

// ─── Günün Vardiyası modifiye edicileri (tohumdan 2'si seçilir) ───
// fx alanları Game.dailyFx'e işlenir; ilgili sistemler oradan okur.
const DAILY_MODS = [
  { id: 'kurye',  name: 'KURYE KRİZİ',     desc: 'Bombacı kuryeler 4 kat sık gelir',        fx: { kuryeW: 4 } },
  { id: 'aceleci', name: 'ACELECİ GÜN',    desc: 'Müşteriler %20 hızlı ama %15 kırılgan',   fx: { spdMul: 1.2, hpMul: 0.85 } },
  { id: 'saglam', name: 'SAĞLAM MÜŞTERİ',  desc: 'Müşteriler %40 dayanıklı, %10 yavaş',     fx: { hpMul: 1.4, spdMul: 0.9 } },
  { id: 'kasa',   name: 'KASA YAĞMURU',    desc: 'Kasalar 3 kat sık düşer',                 fx: { crate: true } },
  { id: 'elit',   name: 'ELİT SAATİ',      desc: 'Kızgın müşteri neredeyse hiç durmaz',     fx: { elite: true } },
  { id: 'prim',   name: 'MESAİ PRİMİ',     desc: 'Tecrübe kazancı +%50',                    fx: { xpMul: 1.5 } },
  { id: 'zam',    name: 'ZAM GÜNÜ',        desc: 'Para 2x ama müşteriler %20 dayanıklı',    fx: { coinMul: 2, hpMul: 1.2 } },
  { id: 'kombo',  name: 'KOMBO GÜNÜ',      desc: 'Kombo penceresi neredeyse iki kat uzun',  fx: { comboWin: 4 } }
];
