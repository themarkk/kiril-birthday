// Canvas a risoluzione fissa 256x192, scalato a numeri interi. L'overlay #ui ha la stessa misura.

export const W = 256;
export const H = 192;

export function setupScreen() {
  const canvas = document.getElementById('screen');
  const stage = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let scale = 1;
  function resize() {
    scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    stage.style.width = `${W * scale}px`;
    stage.style.height = `${H * scale}px`;
    document.documentElement.style.setProperty('--s', String(scale));
  }
  addEventListener('resize', resize);
  resize();
  return { canvas, ctx, get scale() { return scale; } };
}
