'use strict';
// Robotsepeti Survivors — ortak skor tablosu API'si (Upstash Redis)
//
//   GET  /api/scores          → en yüksek TOP skoru döner
//   POST /api/scores {entry}  → yeni skoru ekler, güncel tabloyu + sıranı döner
//
// Skorlar bir Redis "sorted set" içinde tutulur: skor = sıralama anahtarı,
// üye = skorun tüm bilgisini içeren JSON. Böylece leaderboard tek komutla
// (ZRANGE ... REV) baştan sona sıralı gelir.
//
// Gerekli ortam değişkenleri (Vercel'de Upstash Redis eklenince otomatik gelir):
//   KV_REST_API_URL / KV_REST_API_TOKEN   veya
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY  = 'rs_leaderboard';
const TOP  = 20;    // istemciye gönderilecek skor sayısı
const KEEP = 200;   // veritabanında tutulacak en fazla skor
const CHARS = ['ahmet', 'ali', 'bekir', 'can', 'erkan', 'berker'];

// Upstash REST pipeline: birden fazla komutu tek istekte çalıştırır
async function pipe(cmds) {
  const r = await fetch(REDIS_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('Redis HTTP ' + r.status);
  const arr = await r.json();                 // [{result|error}, ...]
  return arr.map(x => {
    if (x && x.error) throw new Error('Redis: ' + x.error);
    return x ? x.result : null;
  });
}

// ZRANGE ... WITHSCORES düz dizisini [{...entry}] listesine çevirir
function parseList(flat) {
  const out = [];
  if (!Array.isArray(flat)) return out;
  for (let i = 0; i < flat.length; i += 2) {
    try {
      const e = JSON.parse(flat[i]);
      e.score = Number(flat[i + 1]) || e.score;   // sorted set skorunu esas al
      out.push(e);
    } catch (_) { /* bozuk kayıt atlanır */ }
  }
  return out;
}

function clampInt(v, lo, hi) {
  v = Math.floor(Number(v) || 0);
  return v < lo ? lo : (v > hi ? hi : v);
}

function cleanName(s) {
  s = String(s == null ? '' : s).replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9 ]/g, '').trim().slice(0, 12);
  return s || '???';
}

module.exports = async (req, res) => {
  // CORS: yerel dosyadan (file://) test edilse bile erişilebilsin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Veritabanı bağlı değil (Upstash ortam değişkenleri yok)' });
  }

  // Günün Vardiyası: ?day=YYYY-MM-DD → ayrı günlük tablo (7 gün sonra silinir)
  const qDay = (req.query && req.query.day) || '';
  const day = /^\d{4}-\d{2}-\d{2}$/.test(qDay) ? qDay : null;

  try {
    if (req.method === 'GET') {
      const key = day ? 'rs_daily_' + day : KEY;
      const [flat] = await pipe([['ZRANGE', key, '0', String(TOP - 1), 'REV', 'WITHSCORES']]);
      return res.status(200).json({ ok: true, list: parseList(flat) });
    }

    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
      b = b || {};
      const entry = {
        name:   cleanName(b.name),
        charId: CHARS.includes(b.charId) ? b.charId : 'ahmet',
        score:  clampInt(b.score, 0, 100000000),
        time:   clampInt(b.time, 0, 100000),
        kills:  clampInt(b.kills, 0, 1000000),
        level:  clampInt(b.level, 1, 9999),
        date:   new Date().toISOString().slice(0, 10),
        ts:     Date.now()   // benzersizlik: aynı skor iki kez de tabloya girsin
      };
      const member = JSON.stringify(entry);

      // günlük skor: gövdedeki day alanı da kabul edilir (query önce gelir)
      const bDay = /^\d{4}-\d{2}-\d{2}$/.test(b.day || '') ? b.day : null;
      const useDay = day || bDay;
      const key = useDay ? 'rs_daily_' + useDay : KEY;

      const cmds = [
        ['ZADD', key, String(entry.score), member],
        ['ZREVRANK', key, member],
        ['ZRANGE', key, '0', String(TOP - 1), 'REV', 'WITHSCORES'],
        ['ZCARD', key]
      ];
      // günlük tablolar 7 gün sonra kendiliğinden silinir
      if (useDay) cmds.push(['EXPIRE', key, '604800']);
      const results = await pipe(cmds);
      const rank = results[1];                 // 0 tabanlı sıra
      const list = parseList(results[2]);
      const card = Number(results[3]) || 0;

      // tablo KEEP'i aşarsa en düşük skorları buda (güvenli pozitif aralık)
      if (card > KEEP) {
        await pipe([['ZREMRANGEBYRANK', key, '0', String(card - KEEP - 1)]]);
      }

      return res.status(200).json({ ok: true, list, rank: rank == null ? -1 : Number(rank) });
    }

    return res.status(405).json({ ok: false, error: 'Desteklenmeyen metod' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
};
