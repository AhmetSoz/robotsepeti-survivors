'use strict';
// ─── Piksel art sprite üretimi ───────────────────────────────
// Tüm görseller kod içinde üretilir; dış dosya gerekmez.

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Izgara satırlarını tuvale boyar. '.' = şeffaf.
function gridPaint(ctx, rows, map, ox, oy) {
  ox = ox || 0; oy = oy || 0;
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].length !== w) throw new Error('Sprite satir genisligi tutarsiz: "' + rows[r] + '"');
    for (let c = 0; c < w; c++) {
      const ch = rows[r][c];
      if (ch === '.') continue;
      const col = map[ch];
      if (!col) throw new Error('Sprite haritasinda eksik renk: "' + ch + '"');
      ctx.fillStyle = col;
      ctx.fillRect(ox + c, oy + r, 1, 1);
    }
  }
}

function flipOf(c) {
  const n = makeCanvas(c.width, c.height);
  const x = n.getContext('2d');
  x.translate(c.width, 0); x.scale(-1, 1);
  x.drawImage(c, 0, 0);
  return n;
}

function whiteOf(c) {
  const n = makeCanvas(c.width, c.height);
  const x = n.getContext('2d');
  x.drawImage(c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, n.width, n.height);
  return n;
}

function makeVariant(c) {
  return { n: c, f: flipOf(c), wn: whiteOf(c), wf: whiteOf(flipOf(c)) };
}

// ─── Karakter taban gövdesi (14x17, chibi) ───────────────────
const BASE_A = [
  '..............',
  '...oooooooo...',
  '..okkkkkkkko..',
  '.okkkkkkkkkko.',
  '.okkkkkkkkkko.',
  '.okkekkkkekko.',
  '.okkekkkkekko.',
  '.okkkkkkkkkko.',
  '..okkkjjkkko..',
  '...okkkkkko...',
  '..oSSSSSSSSo..',
  '.oSSSSSSSSSSo.',
  '.okSSSSSSSSko.',
  '..oSsSSSSsSo..',
  '..osssssssso..',
  '..obbo..obbo..',
  '..oooo..oooo..'
];
const BASE_B = BASE_A.slice(0, 15).concat([
  '.obbo....obbo.',
  '.oooo....oooo.'
]);

// Ahmet'in atlet kolları (omuzlar açık, kollar ten rengi)
const AHMET_ARMS = { oy: 10, rows: [
  '...kk....kk...',
  '..kk......kk..'
]};

function buildCharSprite(def) {
  const baseMap = {
    o: COL.outline, k: COL.skin, j: COL.skinShade, e: COL.navyDark,
    S: def.suit, s: def.suitShade, b: COL.navyDark
  };
  const frames = [];
  for (const base of [BASE_A, BASE_B]) {
    const c = makeCanvas(14, 17);
    const ctx = c.getContext('2d');
    gridPaint(ctx, base, baseMap, 0, 0);
    if (def === CHARACTERS.ahmet) {
      gridPaint(ctx, AHMET_ARMS.rows, { k: COL.skin }, 0, AHMET_ARMS.oy);
    }
    for (const ov of def.overlays) {
      gridPaint(ctx, ov.rows, ov.map, 0, ov.oy);
    }
    frames.push(makeVariant(c));
  }
  return { w: 14, h: 17, frames };
}

// ─── Düşman taban gövdesi (12x14, kızgın müşteri) ────────────
const EBASE_A = [
  '..oooooooo..',
  '.okkkkkkkko.',
  '.okkokkokko.',
  '.okkekkekko.',
  '.okkkkkkkko.',
  '.okkmmmmkko.',
  '..okkkkkko..',
  '.oSSSSSSSSo.',
  '.oSSSSSSSSo.',
  '.okSSSSSSko.',
  '.oSsSSSSsSo.',
  '..osssssso..',
  '..obo..obo..',
  '..obo..obo..'
];
const EBASE_B = EBASE_A.slice(0, 12).concat([
  '.obo....obo.',
  '.obo....obo.'
]);

function buildEnemySprite(def) {
  const map = {
    o: COL.outline, k: def.skin, e: COL.navyDark, m: COL.brownDark,
    S: def.shirt, s: def.shade, b: COL.navyDark
  };
  const frames = [];
  for (const base of [EBASE_A, EBASE_B]) {
    const c = makeCanvas(12, 14);
    const ctx = c.getContext('2d');
    gridPaint(ctx, base, map, 0, 0);
    if (def.overlay) gridPaint(ctx, def.overlay.rows, def.overlay.map, 0, def.overlay.oy);
    frames.push(makeVariant(c));
  }
  return { w: 12, h: 14, frames };
}

// ─── Boss gövdeleri (18x20, her boss'a özel çizim) ───────────
// Ortak lejant: o=dış hat, k=ten, e=göz, v=kaş, m=bıyık/ağız
const BOSS_SPRITES = {
  toptanci: {
    map: {
      o: COL.outline, k: COL.skinAlt, e: COL.navyDark, v: COL.hairDark,
      m: COL.hairDark, S: COL.purpleDark, s: COL.hairDark, G: COL.gold, b: COL.navyDark
    },
    rows: [
      '.....oooooooo.....',
      '....okkkkkkkko....',
      '...okkkkkkkkkko...',
      '...okvvkkkkvvko...',
      '...okeekkkkeeko...',
      '...okkkkkkkkkko...',
      '...okmmmmmmmmko...',
      '....okkmmmmkko....',
      '..ooSSSSSSSSSSoo..',
      '.oSSSGGGGGGGGSSSo.',
      'oSSSSSSSSSSSSSSSSo',
      'oSkSSSSSSSSSSSSkSo',
      'okkSSSSSSSSSSSSkko',
      'okkSsSSSSSSSSsSkko',
      '.ooSssSSSSSSssSoo.',
      '..oSSssssssssSSo..',
      '..obbbbbbbbbbbbo..',
      '..obbbbo..obbbbo..',
      '..obbbo....obbbo..',
      '...ooo......ooo...'
    ],
    legsB: [
      '.obbbbo....obbbbo.',
      '.obbbo......obbbo.',
      '..ooo........ooo..'
    ]
  },
  karaborsaci: {
    map: {
      o: COL.outline, k: COL.skinAlt, h: COL.hairDark, X: COL.outline,
      m: COL.brownDark, C: COL.hairDark, c: COL.outline, G: COL.gold, b: COL.navyDark
    },
    rows: [
      '.....oooooooo.....',
      '....ohhhhhhhho....',
      '....ohhhhhhhho....',
      '..oohhhhhhhhhhoo..',
      '.ohhhhhhhhhhhhhho.',
      '....okkkkkkkko....',
      '....oXXkkkkXXo....',
      '....okkkkkkkko....',
      '....okkmmmmkko....',
      '...oCCCkkkkCCCo...',
      '..oCCCCCCCCCCCCo..',
      '.oCCcCCCCCCCCcCCo.',
      '.oCCcCGGGGGGcCCCo.',
      '.oCCcCCCCCCCCcCCo.',
      '.oCCcCCCCCCCCcCCo.',
      '.oCCccCCCCCCccCCo.',
      '..oCCCCCCCCCCCCo..',
      '..obbo......obbo..',
      '..obbo......obbo..',
      '..oooo......oooo..'
    ],
    legsB: [
      '.obbo........obbo.',
      '.obbo........obbo.',
      '.oooo........oooo.'
    ]
  },
  patron: {
    map: {
      o: COL.outline, k: COL.skin, e: COL.navyDark, v: COL.hairDark,
      m: COL.brownDark, g: COL.grey, p: COL.orange, A: COL.outline,
      W: COL.white, R: COL.red, G: COL.gold
    },
    rows: [
      '.....oooooooo.....',
      '....oggggggggo....',
      '...okgkkkkkkgko...',
      '...okvvkkkkvvko...',
      '...okeekkkkeeko...',
      '...okkkkkkkkkko...',
      '...okkkmmmmkkko...',
      '....okkkkkkkkop...',
      '..ooAAAAWWAAAAoo..',
      '.oAAAAAWRRWAAAAAo.',
      'oAAAAAAWRRWAAAAAAo',
      'oAkAAAAWRRWAAAAkAo',
      'okkAAAAWRRWAAAAkko',
      'okGAAAAARRAAAAAGko',
      '.ooAAAAARRAAAAAoo.',
      '..oAAAAAAAAAAAAo..',
      '..oAAAAAAAAAAAAo..',
      '..oAAAo....oAAAo..',
      '..oAAAo....oAAAo..',
      '..ooooo....ooooo..'
    ],
    legsB: [
      '.oAAAo......oAAAo.',
      '.oAAAo......oAAAo.',
      '.ooooo......ooooo.'
    ]
  }
};

function buildBossSprite(def) {
  const frames = [];
  const rowsB = def.rows.slice(0, def.rows.length - def.legsB.length).concat(def.legsB);
  for (const rows of [def.rows, rowsB]) {
    const c = makeCanvas(rows[0].length, rows.length);
    gridPaint(c.getContext('2d'), rows, def.map, 0, 0);
    frames.push(makeVariant(c));
  }
  return { w: def.rows[0].length, h: def.rows.length, frames };
}

// ─── Küçük sprite'lar ────────────────────────────────────────
function buildGrid(rows, map) {
  const c = makeCanvas(rows[0].length, rows.length);
  gridPaint(c.getContext('2d'), rows, map, 0, 0);
  return c;
}

const CHIP_ROWS = [
  '.ooooo.',
  'oTTTTTo',
  'oTtTtTo',
  'oTTTTTo',
  '.ooooo.',
  '.G.G.G.'
];

const COIN_ROWS = [
  '..ooo..',
  '.oGGGo.',
  'oGWGGGo',
  'oGGGGGo',
  'oGGGGGo',
  '.ogggo.',
  '..ooo..'
];

const HEART_ROWS = [
  '.oo..oo.',
  'oRWooRRo',
  'oRRRRRRo',
  'oRRRRRRo',
  '.oRRRRo.',
  '..oRRo..',
  '...oo...'
];

const CHEST_ROWS = [
  '.oooooooooooooooo.',
  'oBBBBBBBrrBBBBBBBo',
  'oBBBBBBBrrBBBBBBBo',
  'oooooooooooooooooo',
  'obBBBBBBrrBBBBBBbo',
  'obBBBBBBrrBBBBBBbo',
  'obBBWWWWrrWWWWBBbo',
  'obBBWWWWrrWWWWBBbo',
  'obBBBBBBrrBBBBBBbo',
  'obBBBBBBrrBBBBBBbo',
  'obbBBBBBrrBBBBBbbo',
  'obbbbbbbrrbbbbbbbo',
  '.oooooooooooooooo.'
];

const DRONE_ROWS = [
  '.gg...gg.',
  '..o...o..',
  '..ooooo..',
  '.oCCTCCo.',
  '.oCCCCCo.',
  '..ooooo..'
];

// ─── Şirket aracı (programatik, 32x17) ───────────────────────
function buildCar() {
  const c = makeCanvas(32, 17);
  const x = c.getContext('2d');
  // dış hat + gövde
  x.fillStyle = COL.outline; x.fillRect(0, 2, 30, 11);
  x.fillStyle = COL.white;   x.fillRect(1, 3, 28, 9);
  x.fillStyle = COL.greyLight; x.fillRect(1, 10, 28, 2);
  // kırmızı marka şeridi
  x.fillStyle = COL.red; x.fillRect(1, 7, 28, 2);
  // ön cam + kapı çizgisi
  x.fillStyle = COL.teal; x.fillRect(23, 4, 4, 3);
  x.fillStyle = COL.outline; x.fillRect(21, 3, 1, 9);
  // arka kapı logosu: mini robot yüzü
  x.fillStyle = COL.teal; x.fillRect(5, 4, 5, 3);
  x.fillStyle = COL.outline; x.fillRect(6, 5, 1, 1); x.fillRect(8, 5, 1, 1);
  // far
  x.fillStyle = COL.yellow; x.fillRect(29, 5, 1, 2);
  // tekerlekler
  for (const wx of [5, 21]) {
    x.fillStyle = COL.outline; x.fillRect(wx, 11, 6, 5);
    x.fillStyle = COL.navyDark; x.fillRect(wx + 1, 12, 4, 3);
    x.fillStyle = COL.grey; x.fillRect(wx + 2, 13, 2, 1);
  }
  return c;
}

// ─── Depo dekorları (programatik) ────────────────────────────
function buildShelf() {
  const c = makeCanvas(28, 24);
  const x = c.getContext('2d');
  x.fillStyle = COL.navyDark;
  x.fillRect(0, 0, 2, 24); x.fillRect(26, 0, 2, 24);
  for (const sy of [6, 14, 22]) { x.fillStyle = COL.navy; x.fillRect(0, sy, 28, 2); }
  // raflardaki kutular
  const boxCols = [COL.skinAlt, COL.brown, COL.teal, COL.red, COL.skinAlt, COL.gold];
  let i = 0;
  for (const sy of [0, 8, 16]) {
    let bx = 3;
    while (bx < 24) {
      const bw = 4 + (i % 3);
      x.fillStyle = boxCols[i % boxCols.length];
      x.fillRect(bx, sy + 1, bw, 5);
      x.fillStyle = COL.outline; x.fillRect(bx, sy + 1, bw, 1);
      bx += bw + 1; i++;
    }
  }
  return c;
}

function buildPallet() {
  const c = makeCanvas(18, 8);
  const x = c.getContext('2d');
  x.fillStyle = COL.brownDark; x.fillRect(0, 0, 18, 8);
  x.fillStyle = COL.brown;
  x.fillRect(1, 0, 16, 2); x.fillRect(1, 3, 16, 2); x.fillRect(1, 6, 16, 2);
  x.fillStyle = COL.skinAlt; x.fillRect(1, 0, 16, 1);
  return c;
}

function buildBoxStack() {
  const c = makeCanvas(18, 16);
  const x = c.getContext('2d');
  x.fillStyle = COL.outline; x.fillRect(1, 6, 16, 10);
  x.fillStyle = COL.skinAlt; x.fillRect(2, 7, 14, 8);
  x.fillStyle = COL.brown; x.fillRect(8, 7, 2, 8); x.fillRect(2, 13, 14, 2);
  x.fillStyle = COL.outline; x.fillRect(4, 0, 10, 7);
  x.fillStyle = COL.brown; x.fillRect(5, 1, 8, 5);
  x.fillStyle = COL.brownDark; x.fillRect(8, 1, 2, 5);
  return c;
}

function buildBarrel() {
  const c = makeCanvas(10, 12);
  const x = c.getContext('2d');
  x.fillStyle = COL.outline; x.fillRect(0, 0, 10, 12);
  x.fillStyle = COL.cyan; x.fillRect(1, 1, 8, 10);
  x.fillStyle = COL.blueDark; x.fillRect(1, 3, 8, 1); x.fillRect(1, 8, 8, 1);
  x.fillStyle = COL.teal; x.fillRect(2, 1, 2, 10);
  return c;
}

function buildCone() {
  const c = makeCanvas(8, 8);
  const x = c.getContext('2d');
  x.fillStyle = COL.outline; x.fillRect(0, 6, 8, 2);
  x.fillStyle = COL.orange;
  x.fillRect(3, 0, 2, 2); x.fillRect(2, 2, 4, 2); x.fillRect(1, 4, 6, 3);
  x.fillStyle = COL.white; x.fillRect(2, 3, 4, 1);
  return c;
}

// ─── Küçük fırlatılan koli (8x7) ─────────────────────────────
const MINIBOX_ROWS = [
  '.oooooo.',
  'oBBtBBBo',
  'oBBtBBBo',
  'oBBtBBBo',
  'obbtbbbo',
  '.oooooo.'
];

// ─── Zarf (mail silahı, 8x6) ─────────────────────────────────
const MAIL_ROWS = [
  'oooooooo',
  'oWoWWoWo',
  'oWWooWWo',
  'oWWWWWWo',
  'oooooooo'
];

// ─── Paspas başı (7x6) ───────────────────────────────────────
const MOP_ROWS = [
  '..ttt..',
  '.ooooo.',
  'oGGGGGo',
  'oGGGGGo',
  '.G.G.G.',
  '.G.G.G.'
];

// ─── Yıldız mermisi (bir yıldızcı, 7x7) ──────────────────────
const STAR_ROWS = [
  '...Y...',
  '..YYY..',
  'YYYGYYY',
  '.YYGYY.',
  '..YYY..',
  '.YY.YY.',
  'Y.....Y'
];

// ─── Banknot (karaborsacı para yağmuru, 8x5) ─────────────────
const BILL_ROWS = [
  'oooooooo',
  'ogGGGGgo',
  'ogGWWGgo',
  'ogGGGGgo',
  'oooooooo'
];

// ─── Ruh (ölen müşterinin hayaleti, 7x7) ─────────────────────
const GHOST_ROWS = [
  '.ooooo.',
  'oWWWWWo',
  'oWeWeWo',
  'oWWWWWo',
  'oWWWWWo',
  'oWWWWWo',
  'oW.W.Wo'
];

// ─── Robot süpürge (ambiyans, 10x6) ──────────────────────────
const ROOMBA_ROWS = [
  '..oooooo..',
  '.oCCCCCCo.',
  'oCCTTTTCCo',
  'oCCCCCCCCo',
  '.oggggggo.',
  '..o.oo.o..'
];

// ─── Kırılabilir nesneler ────────────────────────────────────
const KASA_ROWS = [
  '.oooooooooooo.',
  'oBBBBBttBBBBBo',
  'oBBBBBttBBBBBo',
  'oooooooooooooo',
  'oBtBBBBBBBBtBo',
  'oBtBBBBBBBBtBo',
  'oBtBBWWWWBBtBo',
  'oBtBBWWWWBBtBo',
  'oBbBBBBBBBBbBo',
  'obbbbbbbbbbbbo',
  '.oooooooooooo.'
];
const VARIL_ROWS = [
  '..oooooooo..',
  '.oCCCCCCCCo.',
  'oCTCCCCCCCCo',
  'oDDDDDDDDDDo',
  'oCTCCCCCCCCo',
  'oCTCCCCCCCCo',
  'oCTCCCCCCCCo',
  'oDDDDDDDDDDo',
  'oCTCCCCCCCCo',
  '.oCCCCCCCCo.',
  '..oooooooo..'
];

// ─── Güçlendirme sprite'ları (kasalardan çıkar) ──────────────
const PK_MAGNET_ROWS = [
  'RR..RR',
  'RR..RR',
  'RR..RR',
  'RRRRRR',
  '.RRRR.',
  'WW..WW'
];
const PK_BOMB_ROWS = [
  '...gY.',
  '..g...',
  '.ooo..',
  'ooooo.',
  'ooooo.',
  'ooooo.',
  '.ooo..'
];
const PK_SHIELD_ROWS = [
  'TTTTTT',
  'TWWWWT',
  'TWTTWT',
  'TWWWWT',
  '.TTTT.',
  '..TT..'
];
const PK_TURBO_ROWS = [
  '...YY.',
  '..YY..',
  '.YYYY.',
  '...YY.',
  '..YY..',
  '.YY...'
];

// ─── Forklift dekoru (26x20) ─────────────────────────────────
function buildForklift() {
  const c = makeCanvas(26, 20);
  const x = c.getContext('2d');
  // çatal direği
  x.fillStyle = COL.greyDark; x.fillRect(1, 2, 2, 14);
  x.fillStyle = COL.grey; x.fillRect(3, 12, 5, 2);
  // gövde
  x.fillStyle = COL.outline; x.fillRect(7, 5, 17, 11);
  x.fillStyle = COL.gold; x.fillRect(8, 6, 15, 9);
  x.fillStyle = COL.orange; x.fillRect(8, 11, 15, 4);
  // kabin
  x.fillStyle = COL.outline; x.fillRect(15, 1, 8, 6);
  x.fillStyle = COL.teal; x.fillRect(16, 2, 6, 4);
  // ikaz lambası
  x.fillStyle = COL.red; x.fillRect(12, 3, 2, 2);
  // tekerlekler
  for (const wx of [9, 19]) {
    x.fillStyle = COL.outline; x.fillRect(wx, 15, 5, 5);
    x.fillStyle = COL.navyDark; x.fillRect(wx + 1, 16, 3, 3);
  }
  return c;
}

// ─── Bölge dekorları (programatik) ───────────────────────────
function buildFreezer() {
  const c = makeCanvas(22, 26);
  const x = c.getContext('2d');
  // gövde
  x.fillStyle = COL.outline; x.fillRect(0, 0, 22, 26);
  x.fillStyle = COL.greyLight; x.fillRect(1, 1, 20, 24);
  x.fillStyle = COL.grey; x.fillRect(1, 20, 20, 5);
  // cam kapak: içinde buzlu ürünler
  x.fillStyle = COL.blueDark; x.fillRect(3, 3, 16, 13);
  x.fillStyle = COL.cyan; x.fillRect(4, 4, 14, 11);
  x.fillStyle = COL.teal; x.fillRect(4, 4, 14, 3);
  x.fillStyle = COL.white; x.fillRect(5, 5, 3, 1); x.fillRect(10, 7, 4, 2); x.fillRect(6, 10, 3, 3);
  // kapak kolu + ışık
  x.fillStyle = COL.greyDark; x.fillRect(3, 17, 16, 2);
  x.fillStyle = COL.green; x.fillRect(17, 21, 2, 2);
  // buz sarkıtları
  x.fillStyle = COL.white; x.fillRect(2, 25, 1, 1); x.fillRect(8, 25, 1, 1); x.fillRect(15, 25, 1, 1);
  return c;
}

function buildIceStack() {
  const c = makeCanvas(18, 14);
  const x = c.getContext('2d');
  // buz blokları: yarı saydam mavi küpler
  const block = (bx, by, w, h) => {
    x.fillStyle = COL.blueDark; x.fillRect(bx, by, w, h);
    x.fillStyle = COL.cyan; x.fillRect(bx + 1, by + 1, w - 2, h - 2);
    x.fillStyle = COL.teal; x.fillRect(bx + 1, by + 1, w - 2, 2);
    x.fillStyle = COL.white; x.fillRect(bx + 2, by + 2, 2, 1);
  };
  block(0, 6, 9, 8); block(9, 6, 9, 8); block(4, 0, 9, 7);
  return c;
}

function buildTruck() {
  const c = makeCanvas(34, 26);
  const x = c.getContext('2d');
  // kasa (arkadan görünüm, kapağı açık)
  x.fillStyle = COL.outline; x.fillRect(0, 0, 34, 22);
  x.fillStyle = COL.greyDark; x.fillRect(1, 1, 32, 20);
  x.fillStyle = COL.navyDark; x.fillRect(3, 3, 28, 16);
  // içerideki koliler
  x.fillStyle = COL.skinAlt; x.fillRect(5, 11, 8, 8); x.fillRect(14, 13, 7, 6);
  x.fillStyle = COL.brown; x.fillRect(8, 11, 2, 8); x.fillRect(14, 15, 7, 1);
  x.fillStyle = COL.skinAlt; x.fillRect(7, 5, 7, 5);
  x.fillStyle = COL.brown; x.fillRect(10, 5, 1, 5);
  // marka şeridi + tampon
  x.fillStyle = COL.red; x.fillRect(1, 1, 32, 2);
  x.fillStyle = COL.grey; x.fillRect(0, 22, 34, 2);
  // stop lambaları + tekerlekler
  x.fillStyle = COL.red; x.fillRect(1, 19, 2, 2); x.fillRect(31, 19, 2, 2);
  x.fillStyle = COL.outline; x.fillRect(4, 24, 6, 2); x.fillRect(24, 24, 6, 2);
  return c;
}

function buildTireStack() {
  const c = makeCanvas(14, 12);
  const x = c.getContext('2d');
  for (let i = 0; i < 3; i++) {
    const ty = 8 - i * 4;
    x.fillStyle = COL.outline; x.fillRect(1, ty, 12, 4);
    x.fillStyle = COL.navyDark; x.fillRect(2, ty + 1, 10, 2);
    x.fillStyle = COL.greyDark; x.fillRect(5, ty + 1, 4, 1);
  }
  return c;
}

function buildDesk() {
  const c = makeCanvas(26, 18);
  const x = c.getContext('2d');
  // masa tablası + ayaklar
  x.fillStyle = COL.outline; x.fillRect(0, 8, 26, 3);
  x.fillStyle = COL.brown; x.fillRect(1, 8, 24, 2);
  x.fillStyle = COL.brownDark; x.fillRect(1, 11, 2, 7); x.fillRect(23, 11, 2, 7);
  // monitör
  x.fillStyle = COL.outline; x.fillRect(4, 0, 10, 8);
  x.fillStyle = COL.teal; x.fillRect(5, 1, 8, 5);
  x.fillStyle = COL.cyan; x.fillRect(6, 2, 4, 1); x.fillRect(6, 4, 6, 1);
  x.fillStyle = COL.greyDark; x.fillRect(8, 8, 2, 1);
  // klavye + kahve kupası
  x.fillStyle = COL.greyDark; x.fillRect(15, 6, 7, 2);
  x.fillStyle = COL.white; x.fillRect(19, 3, 3, 3);
  x.fillStyle = COL.brown; x.fillRect(20, 4, 1, 1);
  return c;
}

function buildPlant() {
  const c = makeCanvas(12, 16);
  const x = c.getContext('2d');
  // saksı
  x.fillStyle = COL.outline; x.fillRect(2, 10, 8, 6);
  x.fillStyle = COL.orangeDark; x.fillRect(3, 11, 6, 4);
  x.fillStyle = COL.orange; x.fillRect(3, 11, 6, 1);
  // yapraklar
  x.fillStyle = COL.greenDeep; x.fillRect(5, 1, 2, 9);
  x.fillStyle = COL.greenDark;
  x.fillRect(2, 3, 3, 4); x.fillRect(7, 2, 4, 4);
  x.fillStyle = COL.green;
  x.fillRect(3, 4, 2, 2); x.fillRect(8, 3, 2, 2); x.fillRect(5, 0, 2, 3);
  return c;
}

function buildCooler() {
  const c = makeCanvas(10, 20);
  const x = c.getContext('2d');
  // damacana
  x.fillStyle = COL.blueDark; x.fillRect(1, 0, 8, 7);
  x.fillStyle = COL.cyan; x.fillRect(2, 1, 6, 5);
  x.fillStyle = COL.white; x.fillRect(3, 2, 2, 2);
  // gövde
  x.fillStyle = COL.outline; x.fillRect(0, 7, 10, 13);
  x.fillStyle = COL.greyLight; x.fillRect(1, 8, 8, 11);
  x.fillStyle = COL.grey; x.fillRect(1, 15, 8, 4);
  x.fillStyle = COL.cyan; x.fillRect(3, 10, 2, 2);
  x.fillStyle = COL.red; x.fillRect(6, 10, 2, 2);
  return c;
}

// ─── İkonlar (12x12, programatik) ────────────────────────────
function buildIcon(id) {
  const c = makeCanvas(12, 12);
  const x = c.getContext('2d');
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  switch (id) {
    case 'suplex':
      px(2, 3, 8, 6, COL.outline); px(3, 4, 6, 4, COL.skin);
      px(4, 5, 1, 2, COL.skinShade); px(6, 5, 1, 2, COL.skinShade);
      px(3, 8, 6, 2, COL.red);
      break;
    case 'car':
      px(0, 3, 12, 6, COL.outline); px(1, 4, 10, 4, COL.white);
      px(1, 6, 10, 1, COL.red); px(8, 4, 2, 2, COL.teal);
      px(2, 9, 3, 2, COL.navyDark); px(7, 9, 3, 2, COL.navyDark);
      break;
    case 'wave':
      for (let i = 0; i < 3; i++) {
        const r = 3 + i * 3;
        for (let a = -1.1; a <= 1.1; a += 0.18) {
          const wx = Math.round(1 + Math.cos(a) * r), wy = Math.round(6 + Math.sin(a) * r);
          if (wx >= 0 && wx < 12 && wy >= 0 && wy < 12) px(wx, wy, 1, 1, i === 1 ? COL.teal : COL.cyan);
        }
      }
      break;
    case 'burp':
      px(1, 5, 9, 4, COL.green); px(2, 3, 4, 2, COL.green);
      px(6, 4, 4, 2, COL.greenDark); px(3, 5, 3, 2, COL.yellow);
      break;
    case 'puff':
      px(1, 5, 9, 4, COL.grey); px(2, 3, 4, 2, COL.greyLight);
      px(6, 4, 4, 2, COL.greyDark); px(9, 9, 2, 2, COL.teal);
      break;
    case 'box':
      px(1, 2, 10, 9, COL.outline); px(2, 3, 8, 7, COL.skinAlt);
      px(5, 3, 2, 7, COL.brown); px(2, 8, 8, 2, COL.brown);
      break;
    case 'zimba':
      px(1, 4, 8, 3, COL.greyDark); px(2, 5, 6, 4, COL.grey);
      px(8, 5, 3, 2, COL.greyLight); px(3, 9, 2, 2, COL.greyDark);
      px(9, 8, 2, 1, COL.white);
      break;
    case 'mail':
      px(1, 3, 10, 7, COL.outline); px(2, 4, 8, 5, COL.white);
      px(3, 4, 6, 1, COL.greyLight); px(2, 4, 3, 3, COL.greyLight);
      px(7, 4, 3, 3, COL.greyLight); px(5, 6, 2, 1, COL.red);
      break;
    case 'mop':
      px(5, 0, 2, 7, COL.brown); px(3, 7, 6, 2, COL.outline);
      px(3, 9, 1, 3, COL.gold); px(5, 9, 1, 3, COL.gold);
      px(7, 9, 1, 3, COL.gold); px(8, 9, 1, 2, COL.gold);
      break;
    case 'kahve':
      px(2, 4, 7, 6, COL.outline); px(3, 5, 5, 4, COL.white);
      px(9, 5, 2, 3, COL.white); px(4, 6, 3, 2, COL.brown);
      px(4, 1, 1, 2, COL.grey); px(6, 0, 1, 2, COL.grey);
      break;
    case 'sigorta':
      px(2, 1, 8, 7, COL.outline); px(3, 2, 6, 5, COL.gold);
      px(4, 7, 4, 2, COL.gold); px(5, 9, 2, 1, COL.gold);
      px(5, 3, 2, 4, COL.yellow);
      break;
    case 'klavye':
      px(0, 3, 12, 7, COL.outline); px(1, 4, 10, 5, COL.greyDark);
      for (let i = 0; i < 4; i++) { px(2 + i * 2, 5, 1, 1, COL.greyLight); px(2 + i * 2, 7, 1, 1, COL.greyLight); }
      break;
    case 'miknatis':
      px(2, 2, 3, 8, COL.red); px(7, 2, 3, 8, COL.red);
      px(2, 8, 8, 2, COL.red); px(2, 2, 3, 2, COL.white); px(7, 2, 3, 2, COL.white);
      break;
    case 'robotkol':
      px(1, 8, 6, 3, COL.greyDark); px(5, 3, 3, 6, COL.grey);
      px(4, 1, 5, 3, COL.greyDark); px(4, 1, 1, 1, COL.teal); px(8, 1, 1, 1, COL.teal);
      break;
    case 'drone':
      x.drawImage(SPR.drone, 1, 3);
      break;
    case 'prim':
      x.drawImage(SPR.coin, 0, 0); x.drawImage(SPR.coin, 5, 4);
      break;
    case 'enerji':
      px(3, 2, 6, 9, COL.outline); px(4, 3, 4, 7, COL.green);
      px(4, 3, 4, 1, COL.grey); px(5, 5, 1, 3, COL.yellow);
      break;
    // ── yetenek ikonları ──
    case 'sk_ahmet': // minder dayağı: yumruk + hız çizgileri
      px(4, 3, 6, 6, COL.skin); px(5, 4, 4, 4, COL.skinAlt);
      px(10, 4, 2, 1, COL.red); px(10, 6, 2, 1, COL.red);
      px(0, 5, 3, 1, COL.white); px(1, 7, 2, 1, COL.white); px(1, 3, 2, 1, COL.white);
      break;
    case 'sk_ali': // el freni: direksiyon
      px(3, 2, 6, 2, COL.greyDark); px(2, 3, 2, 6, COL.greyDark); px(8, 3, 2, 6, COL.greyDark);
      px(3, 8, 6, 2, COL.greyDark); px(5, 5, 2, 2, COL.teal);
      px(4, 5, 1, 1, COL.grey); px(7, 5, 1, 1, COL.grey); px(5, 8, 2, 1, COL.grey);
      break;
    case 'sk_bekir': // akustik patlama: büyük nota
      px(7, 1, 2, 8, COL.purple); px(8, 1, 3, 2, COL.purple);
      px(5, 8, 4, 3, COL.pink);
      px(1, 3, 1, 2, COL.teal); px(2, 5, 1, 2, COL.teal); px(1, 7, 1, 2, COL.teal);
      break;
    case 'sk_can': // soru bombardımanı: soru işareti
      px(3, 1, 6, 2, COL.yellow); px(8, 3, 2, 2, COL.yellow);
      px(6, 5, 2, 2, COL.yellow); px(5, 7, 2, 1, COL.yellow);
      px(5, 10, 2, 2, COL.gold);
      break;
    case 'sk_erkan': // vergi denetimi: para + el
      px(2, 2, 6, 6, COL.gold); px(3, 3, 4, 4, COL.yellow); px(4, 4, 2, 2, COL.gold);
      px(8, 7, 4, 3, COL.skin); px(7, 8, 2, 2, COL.skin);
      break;
    case 'sk_berker': // sevkiyat yağmuru: düşen koli + ok
      px(3, 0, 2, 3, COL.teal); px(2, 2, 4, 2, COL.teal); px(3, 4, 2, 1, COL.teal);
      px(4, 6, 7, 6, COL.outline); px(5, 7, 5, 4, COL.skinAlt); px(7, 7, 1, 4, COL.brown);
      break;
  }
  return c;
}

// ─── Hepsini üret ────────────────────────────────────────────
const SPR = {};

function buildAllSprites() {
  SPR.chars = {};
  for (const id of CHAR_ORDER) SPR.chars[id] = buildCharSprite(CHARACTERS[id]);

  SPR.enemies = {};
  for (const id in ENEMY_TYPES) SPR.enemies[id] = buildEnemySprite(ENEMY_TYPES[id]);

  // boss'lara özel büyük gövdeler
  SPR.bosses = {};
  for (const id in BOSS_SPRITES) SPR.bosses[id] = buildBossSprite(BOSS_SPRITES[id]);

  const chipMap = { o: COL.outline, T: COL.teal, t: COL.cyan, G: COL.gold };
  SPR.chip = buildGrid(CHIP_ROWS, chipMap);
  SPR.chipGold = buildGrid(CHIP_ROWS, { o: COL.outline, T: COL.yellow, t: COL.gold, G: COL.gold });
  SPR.coin = buildGrid(COIN_ROWS, { o: COL.outline, G: COL.gold, W: COL.yellow, g: COL.orange });
  SPR.heart = buildGrid(HEART_ROWS, { o: COL.outline, R: COL.red, W: COL.pink });
  SPR.chest = buildGrid(CHEST_ROWS, {
    o: COL.outline, B: COL.skinAlt, b: COL.brown, r: COL.red, W: COL.white
  });
  SPR.drone = buildGrid(DRONE_ROWS, { o: COL.outline, g: COL.grey, C: COL.cyan, T: COL.teal });
  SPR.minibox = buildGrid(MINIBOX_ROWS, { o: COL.outline, B: COL.skinAlt, b: COL.brown, t: COL.brown });
  SPR.mail = buildGrid(MAIL_ROWS, { o: COL.navy, W: COL.white });
  SPR.mop = buildGrid(MOP_ROWS, { t: COL.brown, o: COL.outline, G: COL.gold });

  // kırılabilirler (beyaz flash varyantıyla)
  const kasa = buildGrid(KASA_ROWS, { o: COL.outline, B: COL.skinAlt, b: COL.brown, t: COL.brown, W: COL.white });
  const varil = buildGrid(VARIL_ROWS, { o: COL.outline, C: COL.cyan, T: COL.teal, D: COL.blueDark });
  SPR.breakables = {
    kasa: { n: kasa, w: whiteOf(kasa) },
    varil: { n: varil, w: whiteOf(varil) }
  };

  // güçlendirmeler
  SPR.pkMagnet = buildGrid(PK_MAGNET_ROWS, { R: COL.red, W: COL.white });
  SPR.pkBomb = buildGrid(PK_BOMB_ROWS, { o: COL.navyDark, g: COL.grey, Y: COL.yellow });
  SPR.pkShield = buildGrid(PK_SHIELD_ROWS, { T: COL.teal, W: COL.white });
  SPR.pkTurbo = buildGrid(PK_TURBO_ROWS, { Y: COL.yellow });

  SPR.star = buildGrid(STAR_ROWS, { Y: COL.yellow, G: COL.gold });
  SPR.bill = buildGrid(BILL_ROWS, { o: COL.greenDeep, g: COL.greenDark, G: COL.green, W: COL.white });
  SPR.ghost = buildGrid(GHOST_ROWS, { o: COL.greyLight, W: COL.white, e: COL.cyan });
  const roomba = buildGrid(ROOMBA_ROWS, { o: COL.outline, C: COL.greyDark, T: COL.teal, g: COL.navyDark });
  SPR.roomba = { n: roomba, f: flipOf(roomba) };
  SPR.pallet = buildPallet();

  const car = buildCar();
  SPR.car = { n: car, f: flipOf(car) };

  SPR.props = [buildShelf(), buildPallet(), buildBoxStack(), buildBarrel(), buildCone(), buildForklift()];

  // bölgeye özel dekor setleri
  const freezer = buildFreezer(), ice = buildIceStack(), truck = buildTruck(),
        tires = buildTireStack(), desk = buildDesk(), plant = buildPlant(), cooler = buildCooler();
  SPR.zoneProps = {
    depo: SPR.props,
    soguk: [freezer, ice, freezer, ice, buildBarrel(), buildPallet()],
    rampa: [truck, tires, buildCone(), buildPallet(), tires, buildCone()],
    ofis: [desk, plant, cooler, desk, plant, buildBoxStack()]
  };

  SPR.icons = {};
  for (const id of ['suplex', 'car', 'wave', 'burp', 'puff', 'box', 'zimba', 'mail', 'mop',
                    'kahve', 'sigorta', 'klavye', 'miknatis', 'robotkol', 'drone', 'prim', 'enerji',
                    'sk_ahmet', 'sk_ali', 'sk_bekir', 'sk_can', 'sk_erkan', 'sk_berker']) {
    SPR.icons[id] = buildIcon(id);
  }
}

// Sprite çizim yardımcısı: alt-orta hizalı
function drawSpr(ctx, spr, frame, x, y, opts) {
  opts = opts || {};
  const scale = opts.scale || 1;
  const v = spr.frames[frame ? 1 : 0];
  const img = opts.white ? (opts.flip ? v.wf : v.wn) : (opts.flip ? v.f : v.n);
  const w = spr.w * scale, h = spr.h * scale;
  if (opts.alpha !== undefined) { ctx.save(); ctx.globalAlpha = opts.alpha; }
  ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h), w, h);
  if (opts.alpha !== undefined) ctx.restore();
}

function drawShadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = COL.outline;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
