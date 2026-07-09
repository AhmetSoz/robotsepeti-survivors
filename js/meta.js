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

  // silah kilidi: meta yükseltmesi gerektiren silahlar
  weaponUnlocked(wid) {
    for (const id in META_UPGRADES) {
      if (META_UPGRADES[id].weapon === wid) return this.lvl(id) > 0;
    }
    return true;
  }
};
