import sharp from '/Users/mar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const basePath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-6aae8dc3-dba8-47de-82b8-cdce09238ca7.png';
const grassPath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-be6b9799-b715-4c7b-b9aa-014aed9a968c.png';
const stonePath = '/var/folders/hm/bpnh2bq13sx0cpftjbngrb4m0000gn/T/codex-clipboard-e2791d04-ad3e-4469-bb22-ed1df94422f8.png';
const sculpturePath = '/Users/mar/.codex/generated_images/019fe320-484b-7f80-a90b-b80a55cecb10/exec-0d5fdc2f-b879-497b-a14d-89c8c03d1bd3.png';
const outputPath = '/Users/mar/Documents/ChatGPT/des/missing-mar-portfolio/docs/superpowers/qa/hero-clean-scene-v5.png';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function raw(path) {
  return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

const base = await raw(basePath);
const { width, height } = base.info;

const out = Buffer.from(base.data);

// Reconstruct one continuous screen-sky plate before adding the physical
// objects. Painting only the former UI rectangles left visible seams, so the
// whole sky now receives the same row-derived blue raster. Clean halftone cloud
// pixels from the source are then restored; interface zones are never sampled.
const uiZones = [
  [34, 36, 915, 305],
  [990, 8, 1486, 145],
  [990, 235, 1486, 585]
];

function isInUiZone(x, y) {
  return uiZones.some(([left, top, right, bottom]) => x >= left && x < right && y >= top && y < bottom);
}

const rowColours = [];
for (let y = 0; y < height; y += 1) {
  const samples = [];
  for (let x = 0; x < width; x += 3) {
    if (isInUiZone(x, y)) continue;
    const i = (y * width + x) * 4;
    const r = base.data[i];
    const g = base.data[i + 1];
    const b = base.data[i + 2];
    if (b < 55 || b < g * 1.12 || b < r * 1.38) continue;
    samples.push([r, g, b]);
  }
  samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  rowColours.push(samples.length ? samples[Math.floor(samples.length * 0.44)] : [5, 49, 139]);
}

function isCloudPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 92 && max - min < 92 && r > 58 && g > 76;
}

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const horizon = 884 - (170 * Math.exp(-((x - 930) ** 2) / (2 * 480 ** 2)));
    if (y >= horizon) continue;
    const i = (y * width + x) * 4;
    const [rr, gg, bb] = rowColours[y];
    const horizontalLight = 1 + 0.045 * Math.sin((x / width) * Math.PI);
    out[i] = clamp(Math.round(rr * horizontalLight), 0, 255);
    out[i + 1] = clamp(Math.round(gg * horizontalLight), 0, 255);
    out[i + 2] = clamp(Math.round(bb * horizontalLight), 0, 255);

    if (!isInUiZone(x, y)) {
      const r = base.data[i];
      const g = base.data[i + 1];
      const b = base.data[i + 2];
      if (isCloudPixel(r, g, b)) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
      }
    }
  }
}

// Reuse the untouched left cloud texture inside the former projects panel so
// the right side does not become unnaturally empty.
for (let y = 270; y < 570; y += 1) {
  for (let x = 1020; x < 1470; x += 1) {
    const sourceX = 165 + (x - 1020);
    const si = (y * width + sourceX) * 4;
    const r = base.data[si];
    const g = base.data[si + 1];
    const b = base.data[si + 2];
    if (!isCloudPixel(r, g, b)) continue;
    const i = (y * width + x) * 4;
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }
}

const horizonPoints = [
  [0, 884], [180, 855], [360, 825], [540, 792], [680, 750],
  [820, 724], [950, 714], [1080, 717], [1210, 730], [1360, 750], [width - 1, 777]
];

function horizonAt(x) {
  for (let i = 1; i < horizonPoints.length; i += 1) {
    const [x1, y1] = horizonPoints[i - 1];
    const [x2, y2] = horizonPoints[i];
    if (x <= x2) {
      const t = (x - x1) / (x2 - x1);
      const smooth = t * t * (3 - 2 * t);
      return y1 + (y2 - y1) * smooth;
    }
  }
  return horizonPoints.at(-1)[1];
}

// Literal photographic source crop: no generated grass, no texture synthesis,
// no watermark, no source horizon. The crop is only resized and draped over
// the existing hill silhouette.
const grassCrop = await sharp(grassPath)
  .extract({ left: 0, top: 385, width: 1080, height: 770 })
  .resize(width, 770, { fit: 'fill' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let x = 0; x < width; x += 1) {
  const horizon = horizonAt(x);
  const depth = height - horizon;
  for (let y = Math.max(0, Math.floor(horizon) - 2); y < height; y += 1) {
    const i = (y * width + x) * 4;
    const t = clamp((y - horizon) / depth, 0, 1);
    const sourceY = Math.min(769, Math.round(t * 769));
    const gi = (sourceY * width + x) * 4;
    const edgeAlpha = clamp((y - horizon + 2) / 4, 0, 1);

    out[i] = Math.round(base.data[i] * (1 - edgeAlpha) + grassCrop.data[gi] * edgeAlpha);
    out[i + 1] = Math.round(base.data[i + 1] * (1 - edgeAlpha) + grassCrop.data[gi + 1] * edgeAlpha);
    out[i + 2] = Math.round(base.data[i + 2] * (1 - edgeAlpha) + grassCrop.data[gi + 2] * edgeAlpha);
  }
}

function darkenEllipse(cx, cy, rx, ry, strength) {
  const left = Math.max(0, Math.floor(cx - rx * 1.5));
  const right = Math.min(width, Math.ceil(cx + rx * 1.5));
  const top = Math.max(0, Math.floor(cy - ry * 2));
  const bottom = Math.min(height, Math.ceil(cy + ry * 2));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const distance = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2);
      if (distance >= 1) continue;
      const alpha = (1 - distance) * strength;
      const i = (y * width + x) * 4;
      out[i] = Math.round(out[i] * (1 - alpha));
      out[i + 1] = Math.round(out[i + 1] * (1 - alpha));
      out[i + 2] = Math.round(out[i + 2] * (1 - alpha));
    }
  }
}

darkenEllipse(925, 775, 210, 24, 0.38);
darkenEllipse(548, 928, 112, 18, 0.44);
darkenEllipse(1225, 922, 158, 20, 0.46);

async function makeStoneLayer(box, minLocalY, maxLocalY) {
  const [left, top, right, bottom] = box;
  const boxWidth = right - left;
  const boxHeight = bottom - top;
  const texture = await sharp(stonePath)
    .resize(boxWidth, boxHeight, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.78, saturation: 0.66 })
    .removeAlpha()
    .png()
    .toBuffer();
  const original = await sharp(basePath)
    .extract({ left, top, width: boxWidth, height: boxHeight })
    .removeAlpha()
    .png()
    .toBuffer();
  const crop = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const maskPixels = Buffer.alloc(boxWidth * boxHeight);

  for (let y = minLocalY; y <= maxLocalY && y < boxHeight; y += 1) {
    for (let x = 0; x < boxWidth; x += 1) {
      const cleanBottom = maxLocalY - 9
        + 3.2 * Math.sin((x / boxWidth) * Math.PI * 2.4)
        + 1.8 * Math.sin((x / boxWidth) * Math.PI * 6.2);
      if (y > cleanBottom) continue;
      const i = (y * boxWidth + x) * 4;
      const r = crop.data[i];
      const g = crop.data[i + 1];
      const b = crop.data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (saturation < 0.24 && luminance >= 24 && luminance <= 210) {
        maskPixels[y * boxWidth + x] = 255;
      }
    }
  }

  const mask = await sharp(maskPixels, {
    raw: { width: boxWidth, height: boxHeight, channels: 1 }
  }).blur(0.65).png().toBuffer();
  const originalCutout = await sharp(original).joinChannel(mask).png().toBuffer();
  const textureCutout = await sharp(texture).joinChannel(mask).png().toBuffer();
  const layer = await sharp(originalCutout)
    .composite([{ input: textureCutout, blend: 'overlay' }])
    .png()
    .toBuffer();
  return { input: layer, left, top };
}

const stoneLeft = await makeStoneLayer([420, 825, 680, 970], 28, 108);
const stoneRight = await makeStoneLayer([1045, 805, 1405, 980], 30, 136);

async function checkerboardToTransparency(path) {
  const source = await raw(path);
  const { width: sw, height: sh } = source.info;
  const data = Buffer.from(source.data);
  const visited = new Uint8Array(sw * sh);
  const queue = [];

  const isBackground = (index) => {
    const r = data[index * 4];
    const g = data[index * 4 + 1];
    const b = data[index * 4 + 2];
    return Math.min(r, g, b) > 229 && Math.max(r, g, b) - Math.min(r, g, b) < 17;
  };

  const enqueue = (x, y) => {
    const p = y * sw + x;
    if (visited[p] || !isBackground(p)) return;
    visited[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < sw; x += 1) {
    enqueue(x, 0);
    enqueue(x, sh - 1);
  }
  for (let y = 0; y < sh; y += 1) {
    enqueue(0, y);
    enqueue(sw - 1, y);
  }

  for (let q = 0; q < queue.length; q += 1) {
    const p = queue[q];
    const x = p % sw;
    const y = Math.floor(p / sw);
    data[p * 4 + 3] = 0;
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < sw) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < sh) enqueue(x, y + 1);
  }

  // The object has several enclosed holes, so their checkerboard components do
  // not connect to the outer border. Remove only large neutral-light regions;
  // small bright chrome highlights remain intact.
  const componentSeen = new Uint8Array(sw * sh);
  for (let start = 0; start < sw * sh; start += 1) {
    if (visited[start] || componentSeen[start] || !isBackground(start)) continue;
    const component = [start];
    componentSeen[start] = 1;
    for (let q = 0; q < component.length; q += 1) {
      const p = component[q];
      const x = p % sw;
      const y = Math.floor(p / sw);
      const neighbours = [];
      if (x > 0) neighbours.push(p - 1);
      if (x + 1 < sw) neighbours.push(p + 1);
      if (y > 0) neighbours.push(p - sw);
      if (y + 1 < sh) neighbours.push(p + sw);
      for (const n of neighbours) {
        if (visited[n] || componentSeen[n] || !isBackground(n)) continue;
        componentSeen[n] = 1;
        component.push(n);
      }
    }
    if (component.length > 220) {
      for (const p of component) data[p * 4 + 3] = 0;
    }
  }

  return sharp(data, { raw: source.info }).png().toBuffer();
}

const transparentSculpture = await checkerboardToTransparency(sculpturePath);
const sculpture = await sharp(transparentSculpture)
  .extract({ left: 112, top: 18, width: 1270, height: 950 })
  .resize(570, 410, { fit: 'fill' })
  .png()
  .toBuffer();

const pebbleRaw = await sharp(basePath)
  .extract({ left: 53, top: 850, width: 120, height: 62 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let y = 0; y < 62; y += 1) {
  for (let x = 0; x < 120; x += 1) {
    const i = (y * 120 + x) * 4;
    const ellipse = ((x - 60) ** 2) / (48 ** 2) + ((y - 31) ** 2) / (17 ** 2);
    pebbleRaw.data[i + 3] = ellipse <= 1 ? 255 : 0;
  }
}
const pebble = await sharp(pebbleRaw.data, { raw: pebbleRaw.info }).png().toBuffer();

const flattened = await sharp(out, { raw: base.info }).png().toBuffer();
await sharp(flattened)
  .composite([
    stoneLeft,
    stoneRight,
    { input: sculpture, left: 646, top: 386 },
    { input: pebble, left: 53, top: 850 }
  ])
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(outputPath);
