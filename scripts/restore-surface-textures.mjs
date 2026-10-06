import sharp from '/Users/mar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const targetPath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-6aae8dc3-dba8-47de-82b8-cdce09238ca7.png';
const grassPath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-0a034943-e90a-4c2d-b60a-0bbfa1a0b61f.png';
const stoneEditPath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-5ad7bf9e-fbe3-4dd4-8ecd-2a67c31f2991.png';
const sculpturePath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-0d5fdc2f-b879-497b-a14d-89c8c03d1bd3.png';
const outputPath = '/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/hero-normal-textures-v1.png';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function rgba(path, width, height) {
  const pipeline = sharp(path);
  if (width && height) pipeline.resize(width, height, { fit: 'fill' });
  return pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function removeLightBackground(path, targetWidth, targetHeight) {
  const { data, info } = await rgba(path);
  const out = Buffer.from(data);
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const neutral = max - min;
      let alpha = 255;
      if (min >= 246 && neutral <= 7) alpha = 0;
      else if (min >= 232 && neutral <= 12) alpha = Math.round(255 * (246 - min) / 14);
      out[i + 3] = alpha;
      if (alpha > 28) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const transparent = await sharp(out, { raw: info }).png().toBuffer();
  return sharp(transparent)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .resize(targetWidth, targetHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

const target = await rgba(targetPath);
const { width, height } = target.info;
const grass = await rgba(grassPath, width, height);
const stoneEdit = await rgba(stoneEditPath, width, height);
const out = Buffer.from(target.data);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4;
    const r = target.data[i];
    const g = target.data[i + 1];
    const b = target.data[i + 2];

    const lowerScene = clamp((y / height - 0.60) / 0.08, 0, 1);
    const greenVsRed = clamp((g - r + 8) / 22, 0, 1);
    const greenVsBlue = clamp((g - b + 10) / 30, 0, 1);
    const mask = lowerScene * greenVsRed * greenVsBlue;
    if (mask <= 0.01) continue;

    const tr = grass.data[i];
    const tg = grass.data[i + 1];
    const tb = grass.data[i + 2];
    const oldLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const texLum = Math.max(18, 0.2126 * tr + 0.7152 * tg + 0.0722 * tb);
    const light = clamp(0.54 + oldLum / 175, 0.62, 1.34);
    const normalize = clamp(92 / texLum, 0.66, 1.34);
    const nr = clamp(tr * light * normalize * 0.87, 0, 255);
    const ng = clamp(tg * light * normalize * 1.18, 0, 255);
    const nb = clamp(tb * light * normalize * 0.90, 0, 255);
    const alpha = mask;

    out[i] = Math.round(r * (1 - alpha) + nr * alpha);
    out[i + 1] = Math.round(g * (1 - alpha) + ng * alpha);
    out[i + 2] = Math.round(b * (1 - alpha) + nb * alpha);
  }
}

const grassRestored = await sharp(out, { raw: target.info }).png().toBuffer();

function extractStoneLayer() {
  const result = Buffer.alloc(width * height * 4);
  const boxes = [
    [420, 825, 680, 970],
    [1045, 805, 1405, 980]
  ];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!boxes.some(([l, t, r, b]) => x >= l && x <= r && y >= t && y <= b)) continue;
      const i = (y * width + x) * 4;
      const r = stoneEdit.data[i];
      const g = stoneEdit.data[i + 1];
      const b = stoneEdit.data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const stone = saturation < 0.34 && luminance < 205;
      if (!stone) continue;
      result[i] = r;
      result[i + 1] = g;
      result[i + 2] = b;
      result[i + 3] = 255;
    }
  }
  return sharp(result, { raw: target.info }).blur(0.3).png().toBuffer();
}

const stoneLayer = await extractStoneLayer();
await sharp(grassRestored)
  .composite([
    { input: stoneLayer, left: 0, top: 0 }
  ])
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(outputPath);
