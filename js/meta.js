'use strict';
// ─── Kalıcı ilerleme: banka + dükkân yükseltmeleri ───────────
// Koşularda kazanılan PARA koşu sonunda bankaya yatar; dükkândan
// kalıcı yükseltmeler ve kilitli silahlar alınır (localStorage).

const META_UPGRADES = {
  can:      { name: 'SAĞLAM BÜNYE',     desc: '+%8 başlangıç canı',            max: 5, cost: 20, icon: 'enerji' },
  guc:      { name: 'PROTEİN TOZU',     desc: '+%4 hasar',                     max: 5, cost: 25, icon: 'robotkol' },
  hiz:      { name: 'KOŞU BANDI',       desc: '+%3 hareket hızı',              max: 3, cost: 25, icon: 'kahve' },
  cekim:    { name: 'GÜÇLÜ MIKNATIS',   desc: '+%15 toplama alanı',            max: 3, cost: 20, icon: 'miknatis' },
  yetenek:  { name: 'MESAİ RUHU',       desc: 'Yetenek beklemesi -%7',         max: 3, cost: 30, icon: 'klavye' },
  kolipara: { name: 'KARGO ANLAŞMASI',  desc: 'Kargo kolilerinden +2 para',    max: 2, cost: 35, icon: 'prim' },
  w_zimba:  { name: 'ZIMBA RUHSATI',    desc: 'ZIMBA TABANCASI koşularda çıkar', max: 1, cost: 50, icon: 'zimba', weapon: 'zimba' },
  w_mail:   { name: 'MAİL SUNUCUSU',    desc: 'TOPLU MAİL koşularda çıkar',      max: 1, cost: 50, icon: 'mail', weapon: 'mail' },
  w_mop:    { name: 'TEMİZLİK İHALESİ', desc: 'DEVRİYE PASPASI koşularda çıkar', max: 1, cost: 50, icon: 'mop', weapon: 'mop' }
};
const META_ORDER = ['can', 'guc', 'hiz', 'cekim', 'yetenek', 'kolipara', 'w_zimba', 'w_mail', 'w_mop'];

// ─── Kostümler: satın al + seç; bonus verir, karakterde görünür ───
const COSTUMES = {
  none:    { name: 'STANDART ÜNİFORMA', desc: 'Klasik Robotsepeti stili.',      cost: 0 },
  sapka:   { name: 'PARTİ ŞAPKASI',     desc: '+%10 tecrübe',                   cost: 40,  xp: 0.10 },
  esofman: { name: 'EŞOFMAN TAKIMI',    desc: '+%5 hareket hızı',               cost: 60,  spd: 0.05 },
  bandana: { name: 'GÜREŞ BANDANASI',   desc: '+%6 hasar',                      cost: 90,  might: 0.06 },
  kedi:    { name: 'KEDİ KULAKLIĞI',    desc: '+%20 toplama alanı',             cost: 70,  magnet: 0.20 },
  yelek:   { name: 'KORUMA YELEĞİ',     desc: '+1 zırh',                        cost: 110, armor: 1 },
  hayalet: { name: 'HAYALET PELERİNİ',  desc: '+%5 kaçınma',                    cost: 140, dodge: 0.05 },
  kral:    { name: 'KRAL TACI',         desc: '+%15 para ve skor',              cost: 220, greed: 0.15 }
};
const COSTUME_ORDER = ['none', 'sapka', 'esofman', 'bandana', 'kedi', 'yelek', 'hayalet', 'kral'];

const Meta = {
  data: {},
  bank: 0,

  load() {
    try {
      this.data = JSON.parse(localStorage.getItem('rs_meta') || '{}');
      this.bank = parseInt(localStorage.getItem('rs_bank') || '0', 10) || 0;
    } catch (e) { this.data = {}; this.bank = 0; }
  },

  save() {
    try {
      localStorage.setItem('rs_meta', JSON.stringify(this.data));
      localStorage.setItem('rs_bank', String(this.bank));
    } catch (e) {}
  },

  lvl(id) { return this.data[id] || 0; },

  cost(id) {
    const u = META_UPGRADES[id];
    return Math.round(u.cost * Math.pow(2, this.lvl(id)));
  },

  canBuy(id) {
    const u = META_UPGRADES[id];
    return this.lvl(id) < u.max && this.bank >= this.cost(id);
  },

  buy(id) {
    if (!this.canBuy(id)) return false;
    this.bank -= this.cost(id);
    this.data[id] = this.lvl(id) + 1;
    this.save();
    return true;
  },

  deposit(coins) {
    if (coins <= 0) return;
    this.bank += coins;
    this.save();
  },

  // ── genel teknik kilitleri (silah/yetenek varyantları — Faz 1) ──
  // Hem başarım ödülü hem dükkân satın alımı aynı kapıya düşer.
  unlocked(id) { return !!(this.data.unlocks && this.data.unlocks[id]); },

  grantUnlock(id) {
    if (!this.data.unlocks) this.data.unlocks = {};
    if (this.data.unlocks[id]) return false;
    this.data.unlocks[id] = 1;
    this.save();
    return true;
  },

  buyUnlock(id, cost) {
    if (this.unlocked(id) || this.bank < cost) return false;
    this.bank -= cost;
    this.grantUnlock(id);
    return true;
  },

  // silah kilidi: meta yükseltmesi gerektiren silahlar
  weaponUnlocked(wid) {
    for (const id in META_UPGRADES) {
      if (META_UPGRADES[id].weapon === wid) return this.lvl(id) > 0;
    }
    return true;
  },

  // ── kostümler ──
  costume() { return this.data.costume || 'none'; },
  costumeDef() { return COSTUMES[this.costume()] || COSTUMES.none; },
  ownsCostume(id) { return id === 'none' || !!(this.data.costumes && this.data.costumes[id]); },

  // sahip değilsen satın alır, sahipsen seçer; başarı durumunu döner
  buyOrWear(id) {
    const c = COSTUMES[id];
    if (!c) return false;
    if (this.ownsCostume(id)) {
      this.data.costume = id;
      this.save();
      return true;
    }
    if (this.bank < c.cost) return false;
    this.bank -= c.cost;
    if (!this.data.costumes) this.data.costumes = {};
    this.data.costumes[id] = 1;
    this.data.costume = id;
    this.save();
    return true;
  }
};
