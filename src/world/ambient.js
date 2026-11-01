// Vita di sfondo: fumo, farfalle, gabbiani, luccichii, zampilli, vela. Dipende solo dal tempo, nessuno stato.
// Nel JSON della mappa: "ambient": [{ "type": "smoke", "x": px, "y": px }, ...] (coordinate in pixel).

const noise = (a, b) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const dot = (ctx, x, y, w = 1, h = 1) => ctx.fillRect(Math.round(x), Math.round(y), w, h);

const DRAW = {
  smoke(ctx, a, t) {
    for (let i = 0; i < 5; i++) {
      const life = (t / 3.5 + i / 5) % 1;
      ctx.globalAlpha = 0.55 * (1 - life);
      ctx.fillStyle = '#e8e4dc';
      const size = life < 0.35 ? 2 : 3;
      dot(ctx, a.x + Math.sin(life * 6 + i) * 2 + life * 6, a.y - life * 26, size, size);
    }
    ctx.globalAlpha = 1;
  },
  butterfly(ctx, a, t) {
    const s = t * 0.7 + a.x;
    const x = a.x + Math.sin(s) * 22 + Math.sin(s * 2.3) * 7;
    const y = a.y + Math.sin(s * 1.7) * 12;
    const open = Math.floor(t * 8) % 2 === 0;
    ctx.fillStyle = a.color || '#fff4d4';
    if (open) { dot(ctx, x - 2, y, 2, 2); dot(ctx, x + 1, y, 2, 2); } else { dot(ctx, x - 1, y - 1, 1, 2); dot(ctx, x + 1, y - 1, 1, 2); }
    ctx.fillStyle = '#1a1020';
    dot(ctx, x, y, 1, 2);
  },
  gull(ctx, a, t) {
    const span = a.span || 900;
    const x = ((t * (a.speed || 14) + (a.phase || 0)) % span) - 60;
    const y = a.y + Math.sin(t * 0.6 + (a.phase || 0)) * 8;
    const up = Math.floor(t * 3 + (a.phase || 0)) % 2 === 0;
    ctx.fillStyle = '#f8f8f2';
    dot(ctx, x, y, 2, 1);
    dot(ctx, x - 2, y + (up ? -1 : 1), 2, 1);
    dot(ctx, x + 2, y + (up ? -1 : 1), 2, 1);
    dot(ctx, x - 4, y + (up ? -2 : 1), 2, 1);
    dot(ctx, x + 4, y + (up ? -2 : 1), 2, 1);
  },
  sparkle(ctx, a, t, cx, cy, view) {
    ctx.fillStyle = '#ffffff';
    const x0 = Math.max(a.x, cx), x1 = Math.min(a.x + a.w, cx + view.w);
    const y0 = Math.max(a.y, cy), y1 = Math.min(a.y + a.h, cy + view.h);
    if (x1 <= x0 || y1 <= y0) return;
    for (let i = 0; i < (a.n || 40); i++) {
      const phase = t * 0.8 + noise(i, 3) * 5;
      const k = Math.floor(phase);
      const f = phase - k;
      if (f > 0.35) continue;
      const x = a.x + noise(i, k) * a.w, y = a.y + noise(k, i + 9) * a.h;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      dot(ctx, x, y);
      if (f > 0.1 && f < 0.25) { dot(ctx, x - 1, y); dot(ctx, x + 1, y); dot(ctx, x, y - 1); dot(ctx, x, y + 1); }
    }
  },
  fountain(ctx, a, t) {
    for (let i = 0; i < 10; i++) {
      const life = (t * 0.9 + i / 10) % 1;
      const side = (i % 2 ? 1 : -1) * (1 + (i % 5) * 0.8);
      ctx.fillStyle = i % 3 ? '#cfeefb' : '#ffffff';
      dot(ctx, a.x + side * life * 5, a.y - Math.sin(life * Math.PI) * 11 + life * 5);
    }
  },
  sail(ctx, a, t, cx, cy, view, art) {
    const img = art.object(a.img);
    const span = a.span || 900;
    const x = ((t * (a.speed || 3) + (a.phase || 0)) % span) - img.width;
    const y = a.y + Math.round(Math.sin(t * 1.2) * 1);
    ctx.drawImage(img, Math.round(x - cx), Math.round(y - cy));
  },
};

export function drawAmbient(ctx, list, time, cx, cy, view, art) {
  for (const a of list || []) {
    const draw = DRAW[a.type];
    if (!draw) continue;
    if (a.type === 'sparkle' || a.type === 'sail') {
      draw(ctx, a, time, cx, cy, view, art);
    } else {
      ctx.save();
      ctx.translate(-cx, -cy);
      draw(ctx, a, time);
      ctx.restore();
    }
  }
}
