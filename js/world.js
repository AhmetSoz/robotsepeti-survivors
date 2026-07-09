'use strict';
// ─── Depo zemini ve dekorlar ─────────────────────────────────
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

  // Zemin: beton karolar + hash tabanlı varyasyon ve dekorlar
  drawFloor(ctx, camX, camY, time) {
    time = time || 0;
    const T = 16;
    const x0 = Math.floor((camX - 240) / T) - 1;
    const y0 = Math.floor((camY - 135) / T) - 1;
    const x1 = x0 + Math.ceil(480 / T) + 2;
    const y1 = y0 + Math.ceil(270 / T) + 2;
    const shades = ['#33395c', '#363c60', '#303655'];

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const sx = Math.round(tx * T - camX + 240);
        const sy = Math.round(ty * T - camY + 135);
        const h = hash2(tx, ty, 7);
        ctx.fillStyle = shades[(h * shades.length) | 0];
        ctx.fillRect(sx, sy, T, T);
        // depo bölgeleri: büyük hücrelerde soğuk/sıcak ton farkı
        const zone = hash2(tx >> 3, ty >> 3, 55);
        if (zone < 0.3) { ctx.fillStyle = 'rgba(40,70,120,0.08)'; ctx.fillRect(sx, sy, T, T); }
        else if (zone > 0.72) { ctx.fillStyle = 'rgba(150,90,40,0.06)'; ctx.fillRect(sx, sy, T, T); }
        // karo derzleri (3 karoda bir)
        if (tx % 3 === 0) { ctx.fillStyle = '#2a2f4e'; ctx.fillRect(sx, sy, 1, T); }
        if (ty % 3 === 0) { ctx.fillStyle = '#2a2f4e'; ctx.fillRect(sx, sy, T, 1); }
        // ara sıra çatlak / leke / detay
        if (h > 0.94) {
          ctx.fillStyle = '#2a2f4e';
          ctx.fillRect(sx + 3, sy + 8, 6, 1);
          ctx.fillRect(sx + 8, sy + 9, 1, 4);
        } else if (h < 0.03) {
          ctx.fillStyle = 'rgba(24,20,37,0.25)';
          ctx.fillRect(sx + 2, sy + 3, 10, 8);
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
          ctx.fillStyle = '#2a2f4e'; ctx.fillRect(sx + 3, sy + 3, 10, 10);
          ctx.fillStyle = '#454e73';
          for (let g = 0; g < 4; g++) ctx.fillRect(sx + 4, sy + 4 + g * 2, 8, 1);
        }
      }
    }

    // sarı ikaz bantlı yürüyüş koridorları (yatay, 20 karoda bir)
    for (let ty = y0; ty <= y1; ty++) {
      if (((ty % 20) + 20) % 20 !== 0) continue;
      const sy = Math.round(ty * T - camY + 135);
      for (let tx = x0; tx <= x1; tx++) {
        const sx = Math.round(tx * T - camX + 240);
        ctx.fillStyle = 'rgba(254,231,97,0.28)';
        for (let i = 0; i < T; i += 4) ctx.fillRect(sx + i, sy, 2, 2);
      }
    }

    // konveyör bantları (yatay, 20 karoda bir - ikaz bantlarının arasında)
    const beltOff = Math.round(time * 24) % 8;
    for (let ty = y0; ty <= y1; ty++) {
      if (((ty % 20) + 20) % 20 !== 10) continue;
      const sy = Math.round(ty * T - camY + 135);
      const sxL = Math.round(x0 * T - camX + 240);
      const wpx = (x1 - x0 + 1) * T;
      // bant gövdesi
      ctx.fillStyle = '#262b44'; ctx.fillRect(sxL, sy + 2, wpx, 12);
      ctx.fillStyle = '#181425'; ctx.fillRect(sxL, sy + 4, wpx, 8);
      // akan makara çizgileri
      ctx.fillStyle = '#3a4466';
      for (let px = sxL - 8 + beltOff; px < sxL + wpx + 8; px += 8) {
        ctx.fillRect(px, sy + 5, 2, 6);
      }
      // kenar rayları
      ctx.fillStyle = '#5a6988';
      ctx.fillRect(sxL, sy + 2, wpx, 1); ctx.fillRect(sxL, sy + 13, wpx, 1);
      // bant üzerinde akan koliler (deterministik aralıklarla)
      for (let tx = x0; tx <= x1; tx++) {
        if (hash2(tx, ty, 91) < 0.75) continue;
        const bx = Math.round(tx * T - camX + 240 + beltOff);
        ctx.drawImage(SPR.minibox, bx, sy + 3);
      }
    }

    // tavan lambası ışık havuzları (56px ızgara, seyrek)
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
        // hafif titreyen sıcak ışık
        const flick = 0.05 + Math.sin(time * 3 + lx * 7 + ly * 13) * 0.012;
        ctx.fillStyle = 'rgba(255,238,180,' + flick.toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(sx, sy, 46, 30, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,244,210,' + (flick * 0.8).toFixed(3) + ')';
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
  // Oyuncunun spawn alanı (merkez) boş bırakılır.
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
        const prop = SPR.props[(hash2(cx, cy, 45) * SPR.props.length) | 0];
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
