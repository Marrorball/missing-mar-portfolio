import sharp from '/Users/mar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const basePath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-6aae8dc3-dba8-47de-82b8-cdce09238ca7.png';
const grassPath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-be6b9799-b715-4c7b-b9aa-014aed9a968c.png';
const stonePath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-e2791d04-ad3e-4469-bb22-ed1df94422f8.png';
const outputPath = '/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/hero-direct-textures-v3.png';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function rawRgba(path, width, height, fit = 'fill') {
  const image = sharp(path);
  if (width && height) image.resize(width, height, { fit });
  return image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

const base = await rawRgba(basePath);
const { width, height } = base.info;
const out = Buffer.from(base.data);

// Use untouched source pixels from the supplied photograph. This crop contains
// only grass and deliberately excludes both the horizon and the watermark.
const grassHeight = 520;
const grassTop = height - grassHeight;
const grass = await sharp(grassPath)
  .extract({ left: 0, top: 430, width: 1080, height: 520 })
  .resize(width, grassHeight, { fit: 'fill' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let y = grassTop; y < height; y += 1) {
  const gy = y - grassTop;
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4;
    const gi = (gy * width + x) * 4;
    const r = base.data[i];
    const g = base.data[i + 1];
    const b = base.data[i + 2];

    // The existing grass is green and the screen sky is blue. Keeping the mask
    // colour-based preserves all typography, chrome highlights and cloud dots.
    const greenVsRed = clamp((g - r + 1) / 24, 0, 1);
    const greenVsBlue = clamp((g - b + 3) / 30, 0, 1);
    const lowerScene = clamp((y / height - 0.60) / 0.075, 0, 1);
    const alpha = clamp(greenVsRed * greenVsBlue * lowerScene * 1.08, 0, 1);
    if (alpha < 0.015) continue;

    const tr = grass.data[gi];
    const tg = grass.data[gi + 1];
    const tb = grass.data[gi + 2];

    out[i] = Math.round(r * (1 - alpha) + tr * alpha);
    out[i + 1] = Math.round(g * (1 - alpha) + tg * alpha);
    out[i + 2] = Math.round(b * (1 - alpha) + tb * alpha);
  }
}

async function applyStoneTexture(box) {
  const [left, top, right, bottom] = box;
  const boxWidth = right - left;
  const boxHeight = bottom - top;
  const texture = await sharp(stonePath)
    .resize(boxWidth, boxHeight, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.72, saturation: 0.72 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const i = (y * width + x) * 4;
      const ti = ((y - top) * boxWidth + (x - left)) * 4;
      const r = base.data[i];
      const g = base.data[i + 1];
      const b = base.data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const oldLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // Reuse the exact silhouettes of the two existing stones. The supplied
      // rock photograph is clipped inside them like a Photoshop texture layer.
      if (saturation > 0.31 || oldLum < 24 || oldLum > 205) continue;

      const tr = texture.data[ti];
      const tg = texture.data[ti + 1];
      const tb = texture.data[ti + 2];
      const texLum = Math.max(20, 0.2126 * tr + 0.7152 * tg + 0.0722 * tb);
      const light = clamp(oldLum / texLum, 0.63, 1.22);

      out[i] = Math.round(clamp(tr * light, 0, 255));
      out[i + 1] = Math.round(clamp(tg * light, 0, 255));
      out[i + 2] = Math.round(clamp(tb * light, 0, 255));
    }
  }
}

await applyStoneTexture([420, 825, 680, 970]);
await applyStoneTexture([1045, 805, 1405, 980]);

await sharp(out, { raw: base.info })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(outputPath);
