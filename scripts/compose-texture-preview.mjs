import sharp from '/Users/mar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const W = 1440;
const H = 1024;

const source = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-6aae8dc3-dba8-47de-82b8-cdce09238ca7.png';
const grassPath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-0a034943-e90a-4c2d-b60a-0bbfa1a0b61f.png';
const stonePath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-e2791d04-ad3e-4469-bb22-ed1df94422f8.png';
const skyPath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-50fd30e2-fdcf-47d0-a5db-591721298ce1.png';
const chromePath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-9b6c4264-30e0-40af-8d9d-9a0a250578c2.png';
const sculpturePath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-0d5fdc2f-b879-497b-a14d-89c8c03d1bd3.png';
const output = '/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/texture-restored-preview.png';

const svg = (body) => Buffer.from(`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

async function maskedTexture(texturePath, maskBody, options = {}) {
  const texture = await sharp(texturePath)
    .resize(W, H, { fit: 'cover', position: options.position ?? 'centre' })
    .modulate(options.modulate ?? {})
    .png()
    .toBuffer();
  const mask = await sharp(svg(`<rect width="${W}" height="${H}" fill="black"/>${maskBody}`)).png().toBuffer();
  return sharp(texture).joinChannel(mask).png().toBuffer();
}

async function extractLayer(inputPath, alphaForPixel) {
  const { data, info } = await sharp(inputPath).resize(W, H, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      out[i + 3] = alphaForPixel(x, y, out[i], out[i + 1], out[i + 2]);
    }
  }
  return sharp(out, { raw: info }).blur(0.3).png().toBuffer();
}

function inRect(x, y, left, top, right, bottom) {
  return x >= left && x <= right && y >= top && y <= bottom;
}

function uiAlpha(x, y, r, g, b) {
  const zone =
    inRect(x, y, 40, 35, 840, 250) ||
    inRect(x, y, 1005, 25, 1408, 110) ||
    inRect(x, y, 1010, 265, 1415, 540);
  if (!zone) return 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const neutralLight = min > 142 && max - min < 95;
  const acid = r > 115 && g > 145 && b < 115;
  return neutralLight || acid ? 255 : 0;
}

async function clippedAsset(inputPath, width, height, maskSvg, modulate = {}) {
  const image = await sharp(inputPath).resize(width, height, { fit: 'cover' }).modulate(modulate).png().toBuffer();
  const mask = await sharp(Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${maskSvg}</svg>`)).png().toBuffer();
  return sharp(image).joinChannel(mask).png().toBuffer();
}

async function stoneAsset(width, height, pathData) {
  const maskShape = `<path d="${pathData}" fill="white"/>`;
  const stone = await clippedAsset(stonePath, width, height, maskShape, { brightness: 0.68, saturation: 0.58 });
  const edge = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <path d="${pathData}" fill="none" stroke="#10151a" stroke-width="7" opacity=".72"/>
    <path d="${pathData}" fill="none" stroke="#d8e1e7" stroke-width="2" opacity=".34"/>
  </svg>`);
  return sharp(stone).composite([{ input: edge }]).png().toBuffer();
}

async function removeLightBackground(inputPath, targetWidth, targetHeight) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

const skyTexture = await sharp(skyPath)
  .resize(W, 900, { fit: 'fill' })
  .modulate({ brightness: 0.72, saturation: 1.34 })
  .png()
  .toBuffer();
const sky = await sharp({ create: { width: W, height: H, channels: 4, background: '#0759bb' } })
  .composite([
    { input: skyTexture, left: 0, top: 0 },
    { input: svg(`
      <defs>
        <linearGradient id="leftFade" x1="0" x2="1"><stop offset="0" stop-color="#064fa9" stop-opacity=".82"/><stop offset=".76" stop-color="#064fa9" stop-opacity=".50"/><stop offset="1" stop-color="#064fa9" stop-opacity="0"/></linearGradient>
        <linearGradient id="rightFade" x1="1" x2="0"><stop offset="0" stop-color="#064fa9" stop-opacity=".76"/><stop offset=".82" stop-color="#064fa9" stop-opacity=".38"/><stop offset="1" stop-color="#064fa9" stop-opacity="0"/></linearGradient>
      </defs>
      <rect width="880" height="270" fill="url(#leftFade)"/>
      <rect x="955" width="485" height="565" fill="url(#rightFade)"/>
    `), left: 0, top: 0 }
  ])
  .png()
  .toBuffer();

const grassMask = `<path d="M0 845 C170 830 320 795 470 778 C635 759 690 690 855 664 C1030 635 1190 668 1440 752 L1440 1024 L0 1024 Z" fill="white"/>`;
const grass = await maskedTexture(grassPath, grassMask, {
  position: 'centre',
  modulate: { brightness: 0.90, saturation: 1.12 }
});

const scene = await sharp(sky)
  .composite([{ input: grass, left: 0, top: 0 }])
  .png()
  .toBuffer();

const ui = await extractLayer(source, uiAlpha);
const sculpture = await removeLightBackground(sculpturePath, 620, 455);

const stoneLeft = await stoneAsset(180, 88, 'M8 64 L22 31 L57 12 L96 17 L139 8 L171 30 L177 59 L148 79 L92 83 L41 76 Z');
const stoneRight = await stoneAsset(250, 110, 'M8 75 L28 34 L74 14 L130 19 L188 10 L229 31 L244 68 L220 95 L174 101 L117 94 L55 100 L18 88 Z');

const chromeBlob = await removeLightBackground(chromePath, 112, 70);

const shadows = svg(`
  <defs><filter id="blur"><feGaussianBlur stdDeviation="11"/></filter></defs>
  <ellipse cx="916" cy="778" rx="246" ry="26" fill="#06190b" opacity=".55" filter="url(#blur)"/>
  <ellipse cx="530" cy="902" rx="99" ry="15" fill="#07160a" opacity=".65" filter="url(#blur)"/>
  <ellipse cx="1195" cy="889" rx="135" ry="18" fill="#07160a" opacity=".65" filter="url(#blur)"/>
  <ellipse cx="105" cy="878" rx="55" ry="10" fill="#07160a" opacity=".55" filter="url(#blur)"/>
`);

await sharp(scene)
  .composite([
    { input: shadows, left: 0, top: 0 },
    { input: stoneLeft, left: 435, top: 853 },
    { input: stoneRight, left: 1070, top: 830 },
    { input: chromeBlob, left: 52, top: 829 },
    { input: sculpture, left: 603, top: 350 },
    { input: ui, left: 0, top: 0 }
  ])
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(output);
