'use strict';
// ─── Depo zemini, bölgeler ve dekorlar ───────────────────────
// Harita 384px'lik (24 karo) bloklara bölünür; her blok deterministik
// olarak bir bölgeye aittir: depo / soğuk hava / yükleme rampası / ofis.

const ZONE_DEFS = {
  depo: {
    name: 'ANA DEPO',
    shades: ['#33395c', '#363c60', '#303655'],
    grout: '#2a2f4e'
  },
  soguk: {
    name: 'SOĞUK HAVA DEPOSU',
    shades: ['#31506e', '#2d4a68', '#355574'],
    grout: '#26405c'
  },
  rampa: {
    name: 'YÜKLEME RAMPASI',
    shades: ['#2b2f40', '#2e3244', '#282c3c'],
    grout: '#20242f'
  },
  ofis: {
    name: 'OFİS KATI',
    shades: ['#4b3a4d', '#463648', '#503e52'],
    grout: '#3a2d3c'
  }
};

// Karo koordinatından bölge kimliği (blok merkezli, spawn bloğu hep depo)
function zoneAt(tx, ty) {
  const bx = Math.floor((tx + 12) / 24), by = Math.floor((ty + 12) / 24);
  if (bx === 0 && by === 0) return 'depo';
  const h = hash2(bx, by, 101);
  if (h < 0.40) return 'depo';
  if (h < 0.62) return 'soguk';
  if (h < 0.82) return 'rampa';
  return 'ofis';
}

const World = {
  vignette: null,

  init() {
    // köşe karartması (vignette) bir kere üretilir
    const c = makeCanvas(480, 270);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(240, 135, 110, 240, 135, 300);
    g.addColorStop(0, 'rgba(24,20,37,0)');
    g.addColorStop(1, 'rgba(24,20,37,0.5)');
    x.fillStyle = g;
    x.fillRect(0, 0, 480, 270);
    this.vignette = c;
  },

  // Zemin: bölgeye göre karolar + hash tabanlı detaylar
  drawFloor(ctx, camX, camY, time) {
    time = time || 0;
    const T = 16;
    const x0 = Math.floor((camX - 240) / T) - 1;
    const y0 = Math.floor((camY - 135) / T) - 1;
    const x1 = x0 + Math.ceil(480 / T) + 2;
    const y1 = y0 + Math.ceil(270 / T) + 2;

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const sx = Math.round(tx * T - camX + 240);
        const sy = Math.round(ty * T - camY + 135);
        const zid = zoneAt(tx, ty);
        const z = ZONE_DEFS[zid];
        const h = hash2(tx, ty, 7);
        ctx.fillStyle = z.shades[(h * z.shades.length) | 0];
        ctx.fillRect(sx, sy, T, T);

        if (zid === 'depo') {
          // depo bölgeleri: büyük hücrelerde soğuk/sıcak ton farkı
          const zone = hash2(tx >> 3, ty >> 3, 55);
          if (zone < 0.3) { ctx.fillStyle = 'rgba(40,70,120,0.08)'; ctx.fillRect(sx, sy, T, T); }
          else if (zone > 0.72) { ctx.fillStyle = 'rgba(150,90,40,0.06)'; ctx.fillRect(sx, sy, T, T); }
          // karo derzleri (3 karoda bir)
          if (tx % 3 === 0) { ctx.fillStyle = z.grout; ctx.fillRect(sx, sy, 1, T); }
          if (ty % 3 === 0) { ctx.fillStyle = z.grout; ctx.fillRect(sx, sy, T, 1); }
          if (h > 0.94) {
            // çatlak
            ctx.fillStyle = z.grout;
            ctx.fillRect(sx + 3, sy + 8, 6, 1);
            ctx.fillRect(sx + 8, sy + 9, 1, 4);
          } else if (h < 0.03) {
            ctx.fillStyle = 'rgba(24,20,37,0.25)'; ctx.fillRect(sx + 2, sy + 3, 10, 8);
          } else if (h > 0.905 && h < 0.915) {
            // boyalı sarı yön oku
            ctx.fillStyle = 'rgba(254,231,97,0.35)';
            ctx.fillRect(sx + 6, sy + 3, 3, 7);
            ctx.fillRect(sx + 4, sy + 8, 7, 2);
            ctx.fillRect(sx + 5, sy + 10, 5, 1);
          } else if (h > 0.885 && h < 0.895) {
            // forklift lastik izi
            ctx.fillStyle = 'rgba(24,20,37,0.3)';
            ctx.fillRect(sx + 2, sy + 2, 2, 12);
            ctx.fillRect(sx + 9, sy + 2, 2, 12);
          } else if (h > 0.868 && h < 0.874) {
            // metal ızgara kapağı
            ctx.fillStyle = z.grout; ctx.fillRect(sx + 3, sy + 3, 10, 10);
            ctx.fillStyle = '#454e73';
            for (let g = 0; g < 4; g++) ctx.fillRect(sx + 4, sy + 4 + g * 2, 8, 1);
          }
        } else if (zid === 'soguk') {
          // büyük buz plakaları (2 karoda bir derz)
          if (tx % 2 === 0) { ctx.fillStyle = z.grout; ctx.fillRect(sx, sy, 1, T); }
          if (ty % 2 === 0) { ctx.fillStyle = z.grout; ctx.fillRect(sx, sy, T, 1); }
          // buz parıltıları: hafif kıpırdayan beyaz pikseller
          if (h > 0.82) {
            const tw = 0.35 + Math.sin(time * 2 + h * 40) * 0.25;
            ctx.fillStyle = 'rgba(220,245,255,' + tw.toFixed(3) + ')';
            ctx.fillRect(sx + ((h * 97) | 0) % 12 + 2, sy + ((h * 61) | 0) % 12 + 2, 1, 1);
          }
          if (h < 0.07) {
            // don lekesi
            ctx.fillStyle = 'rgba(200,235,255,0.13)';
            ctx.beginPath(); ctx.ellipse(sx + 8, sy + 8, 7, 5, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(240,250,255,0.10)';
            ctx.beginPath(); ctx.ellipse(sx + 8, sy + 8, 4, 3, 0, 0, TAU); ctx.fill();
          } else if (h > 0.75 && h < 0.77) {
            // çatlamış buz çizgisi
            ctx.fillStyle = 'rgba(230,250,255,0.28)';
            ctx.fillRect(sx + 2, sy + 6, 5, 1); ctx.fillRect(sx + 7, sy + 7, 4, 1);
            ctx.fillRect(sx + 10, sy + 8, 4, 1);
          }
        } else if (zid === 'rampa') {
          // asfalt: derz yok, iri çatlaklar + yağ lekeleri + sarı şeritler
          if (h > 0.93) {
            ctx.fillStyle = '#1d2130';
            ctx.fillRect(sx + 2, sy + 5, 7, 1); ctx.fillRect(sx + 8, sy + 6, 1, 5);
          } else if (h < 0.05) {
            // yağ lekesi (gökkuşağı parıltılı)
            ctx.fillStyle = 'rgba(24,20,37,0.4)';
            ctx.beginPath(); ctx.ellipse(sx + 8, sy + 9, 6, 4, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(104,56,108,0.25)';
            ctx.beginPath(); ctx.ellipse(sx + 7, sy + 8, 3, 2, 0, 0, TAU); ctx.fill();
          } else if (h > 0.86 && h < 0.90) {
            // lastik izi
            ctx.fillStyle = 'rgba(15,13,24,0.5)';
            ctx.fillRect(sx + 3, sy, 3, T); ctx.fillRect(sx + 10, sy, 3, T);
          }
          // sarı yükleme şeridi: 12 karoda bir dikey kesikli çizgi
          if (((tx % 12) + 12) % 12 === 0) {
            ctx.fillStyle = 'rgba(254,174,52,0.45)';
            for (let i = 0; i < T; i += 5) ctx.fillRect(sx, sy + i, 2, 3);
          }
        } else {
          // ofis: damalı halı karoları
          if ((tx + ty) % 2 === 0) {
            ctx.fillStyle = 'rgba(24,20,37,0.10)'; ctx.fillRect(sx, sy, T, T);
          }
          ctx.fillStyle = z.grout;
          ctx.fillRect(sx, sy, 1, T); ctx.fillRect(sx, sy, T, 1);
          if (h > 0.95) {
            // yere düşmüş kağıt
            ctx.fillStyle = 'rgba(244,244,248,0.55)';
            ctx.fillRect(sx + 4, sy + 6, 6, 7);
            ctx.fillStyle = 'rgba(90,105,136,0.5)';
            ctx.fillRect(sx + 5, sy + 8, 4, 1); ctx.fillRect(sx + 5, sy + 10, 3, 1);
          } else if (h < 0.04) {
            // kahve lekesi
            ctx.fillStyle = 'rgba(116,63,57,0.28)';
            ctx.beginPath(); ctx.ellipse(sx + 8, sy + 8, 4, 3, 0, 0, TAU); ctx.fill();
          }
        }

        // bölge sınırı: komşu karo farklı bölgedeyse koyu ayırıcı
        if (zoneAt(tx + 1, ty) !== zid) {
          ctx.fillStyle = COL.outline; ctx.fillRect(sx + T - 2, sy, 2, T);
          ctx.fillStyle = 'rgba(254,231,97,0.30)';
          if (((ty % 2) + 2) % 2 === 0) ctx.fillRect(sx + T - 1, sy + 2, 1, 6);
        }
        if (zoneAt(tx, ty + 1) !== zid) {
          ctx.fillStyle = COL.outline; ctx.fillRect(sx, sy + T - 2, T, 2);
          ctx.fillStyle = 'rgba(254,231,97,0.30)';
          if (((tx % 2) + 2) % 2 === 0) ctx.fillRect(sx + 2, sy + T - 1, 6, 1);
        }
      }
    }

    // sarı ikaz bantlı yürüyüş koridorları (yatay, 20 karoda bir, sadece depo)
    for (let ty = y0; ty <= y1; ty++) {
      if (((ty % 20) + 20) % 20 !== 0) continue;
      const sy = Math.round(ty * T - camY + 135);
      for (let tx = x0; tx <= x1; tx++) {
        if (zoneAt(tx, ty) !== 'depo') continue;
        const sx = Math.round(tx * T - camX + 240);
        ctx.fillStyle = 'rgba(254,231,97,0.28)';
        for (let i = 0; i < T; i += 4) ctx.fillRect(sx + i, sy, 2, 2);
      }
    }

    // konveyör bantları (yatay, 20 karoda bir - sadece depo bölgesinde)
    // iki geçişli çizim: önce tüm gövdeler, sonra makaralar + koliler
    // (tek geçişte komşu karonun gövdesi kolilerin üstünü eziyordu)
    const beltOff = Math.round(time * 24) % 8;
    for (let ty = y0; ty <= y1; ty++) {
      if (((ty % 20) + 20) % 20 !== 10) continue;
      const sy = Math.round(ty * T - camY + 135);
      // 1. geçiş: bant gövdesi + kenar rayları
      for (let tx = x0; tx <= x1; tx++) {
        if (zoneAt(tx, ty) !== 'depo') continue;
        const sx = Math.round(tx * T - camX + 240);
        ctx.fillStyle = '#262b44'; ctx.fillRect(sx, sy + 2, T, 12);
        ctx.fillStyle = '#181425'; ctx.fillRect(sx, sy + 4, T, 8);
        ctx.fillStyle = '#5a6988';
        ctx.fillRect(sx, sy + 2, T, 1); ctx.fillRect(sx, sy + 13, T, 1);
      }
      // 2. geçiş: akan makara çizgileri + bant üstündeki koliler
      for (let tx = x0; tx <= x1; tx++) {
        if (zoneAt(tx, ty) !== 'depo') continue;
        const sx = Math.round(tx * T - camX + 240);
        const nextBelt = zoneAt(tx + 1, ty) === 'depo';
        ctx.fillStyle = '#3a4466';
        for (let px = beltOff; px < T; px += 8) {
          const w = nextBelt ? 2 : Math.min(2, T - px);
          if (w > 0) ctx.fillRect(sx + px, sy + 5, w, 6);
        }
        if (hash2(tx, ty, 91) >= 0.75) {
          ctx.drawImage(SPR.minibox, sx + beltOff, sy + 3);
        }
      }
    }

    // tavan lambası ışık havuzları (soğuk bölgede daha mavi)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const L = 112;
    const lx0 = Math.floor((camX - 300) / L), ly0 = Math.floor((camY - 200) / L);
    for (let ly = ly0; ly <= ly0 + 5; ly++) {
      for (let lx = lx0; lx <= lx0 + 6; lx++) {
        if (hash2(lx, ly, 77) < 0.55) continue;
        const wx = lx * L + hash2(lx, ly, 78) * 40;
        const wy = ly * L + hash2(lx, ly, 79) * 40;
        const sx = Math.round(wx - camX + 240), sy = Math.round(wy - camY + 135);
        if (sx < -60 || sx > 540 || sy < -60 || sy > 330) continue;
        const flick = 0.05 + Math.sin(time * 3 + lx * 7 + ly * 13) * 0.012;
        const cold = zoneAt((wx / 16) | 0, (wy / 16) | 0) === 'soguk';
        ctx.fillStyle = (cold ? 'rgba(190,230,255,' : 'rgba(255,238,180,') + flick.toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(sx, sy, 46, 30, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = (cold ? 'rgba(220,240,255,' : 'rgba(255,244,210,') + (flick * 0.8).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(sx, sy, 26, 17, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();

    // spawn noktasında zemine marka yazısı
    const lx = Math.round(-camX + 240), ly = Math.round(-camY + 135);
    if (lx > -200 && lx < 680 && ly > -80 && ly < 350) {
      drawText(ctx, 'ROBOTSEPETİ', lx, ly - 30, 'rgba(139,155,180,0.4)', { align: 'center', scale: 2 });
      drawText(ctx, 'DEPO 1', lx, ly - 14, 'rgba(139,155,180,0.3)', { align: 'center' });
    }
  },

  // Dekor nesneleri: 112px hücre ızgarasında deterministik yerleşim.
  // Dekor seti hücrenin bulunduğu bölgeye göre seçilir.
  drawProps(ctx, camX, camY) {
    const C = 112;
    const cx0 = Math.floor((camX - 260) / C);
    const cy0 = Math.floor((camY - 160) / C);
    for (let cy = cy0; cy <= cy0 + 4; cy++) {
      for (let cx = cx0; cx <= cx0 + 6; cx++) {
        const h = hash2(cx, cy, 42);
        if (h < 0.45) continue;
        const px = cx * C + 16 + hash2(cx, cy, 43) * (C - 48);
        const py = cy * C + 16 + hash2(cx, cy, 44) * (C - 48);
        if (px * px + py * py < 80 * 80) continue; // spawn alanı temiz
        const zid = zoneAt(Math.floor(px / 16), Math.floor(py / 16));
        const set = SPR.zoneProps[zid] || SPR.props;
        const prop = set[(hash2(cx, cy, 45) * set.length) | 0];
        const sx = Math.round(px - camX + 240);
        const sy = Math.round(py - camY + 135);
        if (sx < -40 || sx > 520 || sy < -40 || sy > 310) continue;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(prop, sx - (prop.width >> 1), sy - prop.height);
        ctx.restore();
      }
    }
  },

  drawVignette(ctx) {
    ctx.drawImage(this.vignette, 0, 0);
  }
};
