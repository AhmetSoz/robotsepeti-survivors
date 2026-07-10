'use strict';
// ─── Başarımlar: kalıcı hedefler + ödüller (Megabonk formülü) ───
// Her koşu bir şeye sayar: olaylar hem koşu-içi hem toplam sayaçlara işler,
// eşik aşılınca başarım açılır, ödül (para/kostüm/teknik kilidi) verilir ve
// oyun içinde altın toast gösterilir. Kalıcı veri: localStorage 'rs_ach'.
//
// Tanım alanları:
//   key:    sayaç adı ('kills', 'combo', 'boss_patron'...)
//   scope:  'total' (kalıcı toplam) | 'run' (tek koşu içinde)
//   mode:   'add' (birikir) | 'max' (tek koşuda ulaşılan en yüksek)
//   reward: { coins?, costume?, unlock? }  (unlock: teknik id — Faz 1)
//   hidden: albümde "???" görünür, açılınca belli olur
//   char:   yalnızca o karakterle oynarken sayılır

const ACH_DEFS = [
  // ── toplam öldürme ──
  { id: 'kill1',   name: 'ÇAYCI',              desc: 'Toplam 500 müşteri devir',        key: 'kills',  scope: 'total', target: 500,   reward: { coins: 20 } },
  { id: 'kill2',   name: 'MÜDÜR YARDIMCISI',   desc: 'Toplam 5.000 müşteri devir',      key: 'kills',  scope: 'total', target: 5000,  reward: { coins: 60 } },
  { id: 'kill3',   name: 'MÜŞTERİ KABUSU',     desc: 'Toplam 25.000 müşteri devir',     key: 'kills',  scope: 'total', target: 25000, reward: { coins: 150 } },
  // ── tek koşu ──
  { id: 'combo1',  name: 'SERİ KATİP',         desc: 'Tek koşuda 25 kombo yap',         key: 'combo',  scope: 'run', mode: 'max', target: 25,  reward: { coins: 15 } },
  { id: 'combo2',  name: 'ZİNCİR USTASI',      desc: 'Tek koşuda 50 kombo yap',         key: 'combo',  scope: 'run', mode: 'max', target: 50,  reward: { coins: 40, unlock: 't_mikrofon' } },
  { id: 'combo3',  name: 'KOMBO EFSANESİ',     desc: 'Tek koşuda 100 kombo yap',        key: 'combo',  scope: 'run', mode: 'max', target: 100, reward: { coins: 100 } },
  { id: 'surv1',   name: 'MESAİ KURDU',        desc: 'Bir koşuda 10 dakika dayan',      key: 'survive', scope: 'run', mode: 'max', target: 600,  reward: { coins: 20 } },
  { id: 'surv2',   name: 'FAZLA MESAİCİ',      desc: 'Bir koşuda 15 dakika dayan',      key: 'survive', scope: 'run', mode: 'max', target: 900,  reward: { coins: 50, unlock: 't_lastik' } },
  { id: 'surv3',   name: 'GECE VARDİYASI',     desc: 'Bir koşuda 20 dakika dayan',      key: 'survive', scope: 'run', mode: 'max', target: 1200, reward: { coins: 120 } },
  { id: 'lvl20',   name: 'HIZLI TERFİ',        desc: 'Tek koşuda seviye 20 ol',         key: 'level',  scope: 'run', mode: 'max', target: 20, reward: { coins: 30 } },
  { id: 'lvl30',   name: 'GENEL MÜDÜR',        desc: 'Tek koşuda seviye 30 ol',         key: 'level',  scope: 'run', mode: 'max', target: 30, reward: { coins: 80 } },
  { id: 'rich',    name: 'KASA DOLDU',         desc: 'Tek koşuda 60 para topla',        key: 'coins',  scope: 'run', mode: 'max', target: 60, reward: { coins: 60 } },
  { id: 'krun',    name: 'TEK VARDİYA REKORU', desc: 'Tek koşuda 400 müşteri devir',    key: 'killsRun', scope: 'run', mode: 'add', target: 400, reward: { coins: 50 } },
  // ── evrim / koli / görev ──
  { id: 'evo1',    name: 'AR-GE DEPARTMANI',   desc: 'İlk silah evrimini yap',          key: 'evolutions', scope: 'total', target: 1,  reward: { coins: 25 } },
  { id: 'evo2',    name: 'İNOVASYON ÖDÜLÜ',    desc: 'Toplam 10 evrim yap',             key: 'evolutions', scope: 'total', target: 10, reward: { coins: 90 } },
  { id: 'crate1',  name: 'DEPO TEMİZLİĞİ',     desc: 'Toplam 100 kasa/varil kır',       key: 'crates', scope: 'total', target: 100, reward: { coins: 40 } },
  { id: 'chest1',  name: 'KARGO SEVDALISI',    desc: 'Toplam 25 kargo kolisi aç',       key: 'chests', scope: 'total', target: 25,  reward: { coins: 35 } },
  { id: 'mis1',    name: 'GÖREV ADAMI',        desc: 'Toplam 10 görev tamamla',         key: 'missions', scope: 'total', target: 10, reward: { coins: 25 } },
  { id: 'mis2',    name: 'PERFORMANS YILDIZI', desc: 'Toplam 50 görev tamamla',         key: 'missions', scope: 'total', target: 50, reward: { coins: 100 } },
  // ── bosslar ──
  { id: 'b_top',   name: 'TOPTAN İADE',        desc: 'Toptancıyı devir',                key: 'boss_toptanci',    scope: 'total', target: 1, reward: { coins: 20, unlock: 't_forklift' } },
  { id: 'b_kara',  name: 'PİYASA DÜZELDİ',     desc: 'Karaborsacıyı devir',             key: 'boss_karaborsaci', scope: 'total', target: 1, reward: { coins: 25, unlock: 't_fatura' } },
  { id: 'b_mudur', name: 'BÖLGE TEMİZ',        desc: 'Bölge Müdürünü devir',            key: 'boss_mudur',       scope: 'total', target: 1, reward: { coins: 30 } },
  { id: 'b_rakip', name: 'REKABET KURUMU',     desc: 'Rakip CEO\'yu devir',             key: 'boss_rakip',       scope: 'total', target: 1, reward: { coins: 35 } },
  { id: 'b_pat',   name: 'İSTİFA DİLEKÇESİ',   desc: 'Büyük Patronu devir',             key: 'boss_patron',      scope: 'total', target: 1, reward: { coins: 50 } },
  { id: 'b_all',   name: 'YÖNETİM KURULU',     desc: 'Toplam 20 boss devir',            key: 'bossTotal', scope: 'total', target: 20, reward: { coins: 120 } },
  // ── sadakat ──
  { id: 'run1',    name: 'SADIK ÇALIŞAN',      desc: '5 koşu tamamla',                  key: 'runs', scope: 'total', target: 5,  reward: { coins: 25 } },
  { id: 'run2',    name: 'MESAİ BAĞIMLISI',    desc: '25 koşu tamamla',                 key: 'runs', scope: 'total', target: 25, reward: { coins: 75 } },
  { id: 'time1',   name: 'DEMİRBAŞ',           desc: 'Toplam 1 saat oyna',              key: 'time', scope: 'total', target: 3600, reward: { coins: 60 } },
  // ── karaktere özel ──
  { id: 'champ',   name: 'ŞAMPİYON',           desc: 'Ahmet: 50 şampiyon vuruşu yap',   key: 'champ',  scope: 'total', target: 50, char: 'ahmet', reward: { coins: 45, unlock: 't_kemer' } },
  { id: 'freeze',  name: 'SORU BANKASI',       desc: 'Can: toplam 100 müşteri dondur',  key: 'freeze', scope: 'total', target: 100, char: 'can', reward: { coins: 45, unlock: 't_soru' } },
  { id: 'skills',  name: 'YETENEK AVCISI',     desc: 'Toplam 100 yetenek kullan',       key: 'skillUse', scope: 'total', target: 100, reward: { coins: 55 } },
  // ── gizli ──
  { id: 'h_combo', name: 'DEPO CANAVARI',      desc: 'Tek koşuda 150 kombo yap',        key: 'combo', scope: 'run', mode: 'max', target: 150, hidden: true, reward: { coins: 200 } },
  { id: 'h_pasif', name: 'PASİF DİRENİŞ',      desc: 'Hiç yetenek kullanmadan 10 dk dayan', key: 'noSkill10', scope: 'run', mode: 'max', target: 1, hidden: true, reward: { coins: 100 } }
];

const Achievements = {
  done: {},        // id -> 1 (açılmış)
  stats: {},       // kalıcı toplam sayaçlar
  run: {},         // koşu-içi sayaçlar (startRun'da sıfırlanır)
  runUnlocked: [], // bu koşuda açılanlar (over ekranı listeler)
  _byKey: null,    // key -> [def] indeksi

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('rs_ach') || '{}');
      this.done = d.done || {};
      this.stats = d.stats || {};
    } catch (e) { this.done = {}; this.stats = {}; }
    this._byKey = {};
    for (const a of ACH_DEFS) {
      (this._byKey[a.key] = this._byKey[a.key] || []).push(a);
    }
  },

  save() {
    try { localStorage.setItem('rs_ach', JSON.stringify({ done: this.done, stats: this.stats })); } catch (e) {}
  },

  startRun() {
    this.run = {};
    this.runUnlocked = [];
  },

  // Olay bildir: toplam sayaca ekler + koşu sayacını günceller, eşikleri dener
  event(key, n) {
    n = n || 1;
    this.stats[key] = (this.stats[key] || 0) + n;
    this.run[key] = (this.run[key] || 0) + n;
    this._check(key);
  },

  // Koşu-içi "en yüksek değer" sayaçları (kombo, süre, seviye, para)
  peak(key, value) {
    if ((this.run[key] || 0) >= value) return;
    this.run[key] = value;
    this._check(key);
  },

  _check(key) {
    const defs = this._byKey[key];
    if (!defs) return;
    for (const a of defs) {
      if (this.done[a.id]) continue;
      if (a.char && (!Game.player || Game.player.charId !== a.char)) continue;
      const cur = a.scope === 'run' ? (this.run[key] || 0) : (this.stats[key] || 0);
      if (cur >= a.target) this._unlock(a);
    }
  },

  _unlock(a) {
    this.done[a.id] = 1;
    this.runUnlocked.push(a);
    // ödül
    if (a.reward) {
      if (a.reward.coins) Meta.deposit(a.reward.coins);
      if (a.reward.costume && COSTUMES[a.reward.costume]) {
        if (!Meta.data.costumes) Meta.data.costumes = {};
        Meta.data.costumes[a.reward.costume] = 1;
        Meta.save();
      }
      if (a.reward.unlock) Meta.grantUnlock(a.reward.unlock);
    }
    this.save();
    // oyun içi altın toast kuyruğu
    Game.achQueue.push(a);
  },

  // her kare çağrılır (updatePlay): süre/seviye/para zirveleri + gizli pasif koşusu
  update() {
    this.peak('survive', Game.time);
    this.peak('level', Game.level);
    this.peak('coins', Game.coins);
    if (Game.time >= 600 && !(this.run.skillUsedFlag)) this.peak('noSkill10', 1);
  },

  // ilerleme metni (albüm + "sonraki hedef")
  progressOf(a) {
    const cur = a.scope === 'run' ? (this.run[a.key] || 0) : (this.stats[a.key] || 0);
    return Math.min(cur, a.target);
  },

  // kilitli, gizli olmayan başarımlar içinden en yakını (carrot-on-a-stick)
  nextGoal() {
    let best = null, bestK = -1;
    for (const a of ACH_DEFS) {
      if (this.done[a.id] || a.hidden) continue;
      // toplam-tabanlılar arası kıyas daha anlamlı; koşu bazlılar 0'dan başlar
      const cur = a.scope === 'total' ? (this.stats[a.key] || 0) : 0;
      const k = cur / a.target;
      if (k > bestK) { bestK = k; best = a; }
    }
    return best;
  },

  countDone() {
    let n = 0;
    for (const a of ACH_DEFS) if (this.done[a.id]) n++;
    return n;
  }
};
