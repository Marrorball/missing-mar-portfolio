import sharp from '/Users/mar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const targetPath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-6aae8dc3-dba8-47de-82b8-cdce09238ca7.png';
const grassReferencePath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-be6b9799-b715-4c7b-b9aa-014aed9a968c.png';
const stoneEditPath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-5ad7bf9e-fbe3-4dd4-8ecd-2a67c31f2991.png';
const outputPath = '/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/hero-windswept-grass-v2.png';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function rgba(path, width, height) {
  const pipeline = sharp(path);
  if (width && height) pipeline.resize(width, height, { fit: 'fill' });
  return pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

const target = await rgba(targetPath);
const { width, height } = target.info;
const stoneEdit = await rgba(stoneEditPath, width, height);

// Crop away the reference horizon and its bottom-right watermark. Only the real
// wind-swept grass field is used as the photographic texture source.
const grassTexture = await sharp(grassReferencePath)
  .extract({ left: 0, top: 290, width: 1080, height: 930 })
  .resize(width, height, { fit: 'fill' })
  .modulate({ brightness: 1.02, saturation: 1.08 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const out = Buffer.from(target.data);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4;
    const r = target.data[i];
    const g = target.data[i + 1];
    const b = target.data[i + 2];

    const lowerScene = clamp((y / height - 0.60) / 0.08, 0, 1);
    const greenVsRed = clamp((g - r + 2) / 30, 0, 1);
    const greenVsBlue = clamp((g - b + 5) / 34, 0, 1);
    const chromaMask = greenVsRed * greenVsBlue;
    const mask = lowerScene * chromaMask;
    if (mask <= 0.01) continue;

    const tr = grassTexture.data[i];
    const tg = grassTexture.data[i + 1];
    const tb = grassTexture.data[i + 2];
    const oldLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const texLum = Math.max(18, 0.2126 * tr + 0.7152 * tg + 0.0722 * tb);
    const sourceShade = clamp((oldLum + 24) / (texLum + 28), 0.78, 1.16);
    const shade = 0.74 + sourceShade * 0.26;
    const nr = clamp(tr * shade * 0.94, 0, 255);
    const ng = clamp(tg * shade * 0.99, 0, 255);
    const nb = clamp(tb * shade * 0.94, 0, 255);
    const alpha = 0.96 * mask;

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
  .composite([{ input: stoneLayer, left: 0, top: 0 }])
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(outputPath);
