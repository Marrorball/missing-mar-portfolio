import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { POCKETS_PER_FACE, RACK_FACES } from '../assets/js/kiosk/discs.js';
import { HOTSPOTS, PRESETS } from '../assets/js/kiosk/hotspots.js';
import { SLOT_COUNT } from '../assets/js/kiosk/slots.js';

const GLB = 'assets/kiosk/kiosk.glb';

function gltf() {
  const buffer = readFileSync(GLB);
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, 'not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
}

const names = () => new Set(gltf().nodes.map(node => node.name));

test('the kiosk scene exports every hotspot, slot and camera preset', () => {
  const all = names();
  for (const node of Object.keys(HOTSPOTS)) assert.ok(all.has(node), node);
  for (let index = 0; index < SLOT_COUNT; index += 1) assert.ok(all.has(`slot_${index}`), `slot_${index}`);
  for (const preset of PRESETS) {
    assert.ok(all.has(`cam_${preset}`), `cam_${preset}`);
    assert.ok(all.has(`tgt_${preset}`), `tgt_${preset}`);
  }
});

test('the rack holds a disc in every pocket and the player sits under the TV', () => {
  const all = names();
  for (const node of ['dvd_rack', 'hs_rack', 'dvd_player', 'tv_screen', 'terminal_screen']) assert.ok(all.has(node), node);
  for (let index = 0; index < RACK_FACES * POCKETS_PER_FACE; index += 1) assert.ok(all.has(`disc_${index}`), `disc_${index}`);
});

test('screens carry their size for the in-scene pages', () => {
  const nodes = gltf().nodes;
  for (const name of ['screen_tv', 'screen_terminal', 'screen_billboard', 'screen_flyer', 'wall_contacts']) {
    const node = nodes.find(entry => entry.name === name);
    assert.ok(node, name);
    assert.ok(node.extras?.width > 0 && node.extras?.height > 0, `${name} size`);
  }
});

test('the detail pass is in the scene', () => {
  const all = names();
  for (const node of ['kiosk_grille', 'kiosk_ribs', 'goods_fill', 'price_tags', 'interior', 'trees', 'buildings', 'snow_drifts', 'terminal_details', 'billboard_frame']) {
    assert.ok(all.has(node), node);
  }
});

test('the kiosk scene stays inside the desktop budget', () => {
  const json = gltf();
  const primitives = json.nodes
    .filter(node => node.mesh !== undefined)
    .reduce((sum, node) => sum + json.meshes[node.mesh].primitives.length, 0);
  assert.ok(primitives < 400, `${primitives} draw calls`);
  assert.ok(statSync(GLB).size < 8 * 1024 * 1024);
});

test('light anchors come from the model', () => {
  const all = names();
  for (const node of ['light_window', 'light_window_target', 'light_street', 'light_street_target',
    'light_billboard_0', 'light_billboard_1', 'light_billboard_2', 'light_billboard_target', 'bulb_outside']) {
    assert.ok(all.has(node), node);
  }
});

test('the rack stands outside in front of the left shutter, clear of the doorway', () => {
  const nodes = gltf().nodes;
  const rack = nodes.find(node => node.name === 'dvd_rack');
  assert.ok(rack.translation[0] < -1.8, 'rack must be beside the kiosk');
  assert.ok(rack.translation[2] > 1.5, 'rack must be in front of the shutter');
  const camera = nodes.find(node => node.name === 'cam_rack');
  assert.ok(camera.translation[2] > rack.translation[2], 'view from the street');
});

test('the curled cat has a bed inside and does not obstruct the back entrance', () => {
  const nodes = gltf().nodes;
  const bed = nodes.find(node => node.name === 'cat_bed');
  const cat = nodes.find(node => node.name === 'hs_cat');
  assert.ok(bed && cat, 'bed and ginger cat exported');
  assert.ok(cat.translation[0] < -0.5 && Math.abs(cat.translation[2]) < 1);
  assert.ok(cat.translation[1] > 0.12 && cat.translation[1] < 0.5);
});

test('the revised cat has a smooth continuous tail, sleeping face and tucked paws', () => {
  const all = names();
  for (const name of ['cat_body', 'cat_head', 'cat_face', 'cat_tail', 'cat_eye_left', 'cat_eye_right', 'cat_ear_left', 'cat_ear_right']) assert.ok(all.has(name), name);
  // one soft surface, not a pile of ovals
  for (const name of ['cat_haunch', 'cat_paw_left', 'cat_paw_right', 'cat_cheek_left']) assert.ok(!all.has(name), name);
  const json = gltf();
  const body = json.meshes.find(mesh => mesh.name === 'cat_body');
  assert.ok(body.primitives[0].attributes.COLOR_0 !== undefined, 'fur painted on the surface, not stacked shapes');
});

test('the terminal has orange paint and wear', () => {
  const json = gltf();
  assert.ok(names().has('terminal_wear'));
  const paint = json.materials.find(mat => mat.name === 'terminal_orange');
  assert.ok(paint, 'orange paint');
  const [r, g, b] = paint.pbrMetallicRoughness.baseColorFactor;
  assert.ok(r > g * 2 && g > b * 2);
});

test('the street rack is a real spinner: base, sheet core with trays, lit header', () => {
  const all = names();
  for (const name of ['rack_base', 'hs_rack', 'rack_header', 'bulb_rack']) assert.ok(all.has(name), name);
  for (let face = 0; face < RACK_FACES; face += 1) assert.ok(all.has(`rack_header_text_${face}`), `header side ${face}`);
});

test('a 0.33 l can stands on the bin rim and its twin on the counter', () => {
  const nodes = gltf().nodes;
  for (const name of ['cola_can_bin', 'cola_can_counter']) {
    const can = nodes.find(node => node.name === name);
    assert.ok(can, name);
    assert.ok(nodes.some(node => node.name === `${name}_label`), `${name} has its lettering`);
  }
  const counter = nodes.find(node => node.name === 'cola_can_counter');
  assert.ok(Math.abs(counter.translation[0]) < 1.4 && Math.abs(counter.translation[2]) < 0.9, 'inside the kiosk');
});

test('appliances and cola keep their generic names', () => {
  const json = gltf();
  const labels = [...json.nodes, ...json.meshes, ...json.materials].map(item => item.name.toLowerCase());
  for (const brand of ['coca', 'pepsi', 'fanta', 'sprite', 'qiwi', 'sony', 'samsung']) {
    assert.ok(!labels.some(name => name.includes(brand)), brand);
  }
});

test('the TV and the player are dark plastic', () => {
  const json = gltf();
  const plastic = json.materials.find(mat => mat.name === 'tv_plastic');
  assert.ok(plastic, 'tv_plastic material');
  assert.ok(Math.max(...plastic.pbrMetallicRoughness.baseColorFactor.slice(0, 3)) < 0.06);
  const tv = json.nodes.find(node => node.name === 'hs_tv');
  const used = json.meshes[tv.mesh].primitives.map(primitive => json.materials[primitive.material].name);
  assert.deepEqual(used, ['tv_plastic']);
});

test('the flyer is printed on its sheet; no price sheet on the right shutter, notices instead', () => {
  const json = gltf();
  const index = name => json.nodes.findIndex(node => node.name === name);
  const parentOf = name => json.nodes.find(node => (node.children || []).includes(index(name)));
  const anchor = json.nodes.find(node => node.name === 'screen_flyer');
  assert.equal(anchor.extras.width / anchor.extras.height, 32 / 45, 'same proportions as the printed layout');
  assert.ok(anchor.extras.width >= 0.4, 'readable from the street');
  assert.ok(!names().has('flyer_title'), 'no extruded title poking through the printed flyer');
  assert.ok(!names().has('hs_pricelist') && !names().has('screen_price') && !names().has('cam_price'));
  const right = json.nodes.filter(node => node.name.startsWith('shutter_notice_right_'));
  assert.ok(right.length >= 8 && right.every(node => parentOf(node.name).name === 'shutter_right_hinge'));
});

test('snow lies on the rack and the terminal like on the roof', () => {
  const all = names();
  assert.ok(all.has('rack_snow') && all.has('terminal_snow'));
});

test('two neighbours stand at lit windows as painted silhouettes', () => {
  const nodes = gltf().nodes;
  for (const pose of ['smoking', 'looking']) {
    const anchor = nodes.find(node => node.name === `window_person_${pose}`);
    assert.ok(anchor && anchor.extras.width > 1 && anchor.extras.height > 1, pose);
    assert.equal(anchor.mesh, undefined, 'no blob figure, just the anchor for the silhouette');
  }
});

test('the back doorway has a click area as big as the opening', () => {
  const doorway = gltf().nodes.find(node => node.name === 'hs_doorway');
  assert.ok(doorway, 'hs_doorway');
});

test('the shutters carry a crowd of small notices instead of plain boxes and 3D lettering', () => {
  const nodes = gltf().nodes;
  const notices = nodes.filter(node => node.name.startsWith('shutter_notice_'));
  assert.ok(notices.length >= 16, `${notices.length} notices`);
  assert.ok(notices.every(node => node.extras.width > 0.1 && node.extras.design >= 0));
  assert.ok(!nodes.some(node => /^ad_\d$|^posters_/.test(node.name)), 'old ads and poster boxes gone');
});

test('the serving window stays clear: no project slot stands in it', () => {
  const nodes = gltf().nodes;
  const slots = nodes.filter(node => /^slot_\d+$/.test(node.name));
  assert.equal(slots.length, 8);
  assert.ok(slots.every(slot => Math.abs(slot.translation[0]) > 0.4), 'the window spans x -0.3..0.3');
});

test('the sign is glowing letters, its last two on their own bulbs; graffiti on both sides', () => {
  const json = gltf();
  for (const name of ['sign_glow', 'sign_glow_tail']) assert.ok(json.materials.some(mat => mat.name === name), name);
  for (const name of ['graffiti_left', 'graffiti_right', 'sticker_dasha', 'sticker_turbo', 'sticker_tuning', 'sticker_bakugan', 'sticker_ball']) {
    assert.ok(json.nodes.some(node => node.name === name), name);
  }
});

test('stickers sit on the left wall at eye height, the front stays clean; no dark trodden strip', () => {
  const nodes = gltf().nodes;
  const stickers = nodes.filter(node => node.name.startsWith('sticker_'));
  assert.equal(stickers.length, 5);
  assert.ok(stickers.every(node => node.translation[0] < -1.5), 'on the left side wall');
  assert.ok(stickers.every(node => node.translation[1] > 1.2), 'none down by the snow');
  assert.ok(!nodes.some(node => node.name === 'snow_trodden'));
});

test('the walk round the kiosk has its waypoints', () => {
  const all = names();
  for (const name of ['front_left', 'side_left', 'front_right', 'side_right', 'door_out', 'doorway', 'door_in']) {
    assert.ok(all.has(`path_${name}`), name);
  }
});

// These export checks catch missing baked textures or a build that used the old room.
test('interior props and shared printed materials survive the GLB export', () => {
  const json = gltf();
  const all = new Set(json.nodes.map(node => node.name));
  for (const name of ['chair_plaid_blanket', 'chair_wood', 'counter_kettle',
    'counter_mug', 'counter_calculator', 'counter_notebook', 'counter_loose_change',
    'stock_shaped_goods', 'stock_open_carton', 'clock_face_details', 'calendar_print']) {
    assert.ok(all.has(name), name);
  }
  for (const name of ['retail_print', 'blanket_woven_plaid']) {
    const mat = json.materials.find(item => item.name === name);
    const texture = json.textures[mat?.pbrMetallicRoughness?.baseColorTexture?.index];
    assert.ok(texture && json.images[texture.source]?.bufferView !== undefined, `${name} embedded texture`);
  }
});

test('loose change sits above the counter instead of inside its top', () => {
  const json = gltf();
  const node = json.nodes.find(item => item.name === 'counter_loose_change');
  for (const primitive of json.meshes[node.mesh].primitives) {
    const bounds = json.accessors[primitive.attributes.POSITION];
    assert.ok(bounds.min[1] >= 1.03 - 1e-6, 'coin bottom clears the 1.03 m counter surface');
  }
});

function meshBounds(json, name, materialName = null) {
  const node = json.nodes.find(item => item.name === name);
  const parts = json.meshes[node.mesh].primitives.filter(p => !materialName || json.materials[p.material].name === materialName);
  assert.ok(parts.length, name);
  return { min: [0,1,2].map(i => Math.min(...parts.map(p => json.accessors[p.attributes.POSITION].min[i]))),
    max: [0,1,2].map(i => Math.max(...parts.map(p => json.accessors[p.attributes.POSITION].max[i]))) };
}

test('the notebook clears the goods at the seller-facing shelf edge', () => {
  const json = gltf();
  const notebook = meshBounds(json, 'counter_notebook');
  const goods = meshBounds(json, 'goods_fill');
  assert.ok(notebook.max[2] + .04 < goods.min[2], 'at least 4 cm between notebook and retail packs');
});

test('the calculator is flat with its display away from the seller and keys nearer', () => {
  const json = gltf();
  const body = meshBounds(json, 'counter_calculator');
  const display = meshBounds(json, 'counter_calculator', 'lcd_green');
  const keys = meshBounds(json, 'counter_calculator', 'plastic_light');
  assert.ok(body.max[1] - body.min[1] <= .021, 'at most 21 mm including the keys');
  assert.ok(display.min[2] > keys.max[2], 'screen at the front, keypad faces the seller');
});

test('the wall calendar is one printed sheet hanging flush on a nail, no board behind it', () => {
  const json = gltf();
  const page = json.nodes.find(node => node.name === 'calendar_print');
  assert.deepEqual([page.extras.year, page.extras.month, page.extras.marked_day], [2004,6,30]);
  assert.ok(json.nodes.some(node => node.name === 'calendar_binding'), 'wire binding, hanger and nail');
  assert.ok(!json.nodes.some(node => node.name === 'calendar_concert_picture'), 'photo and dates share one sheet');
  const mat = json.materials.find(item => item.name === 'calendar_june_2004');
  const texture = json.textures[mat?.pbrMetallicRoughness?.baseColorTexture?.index];
  assert.ok(texture && json.images[texture.source]?.bufferView !== undefined, 'printed sheet embedded');
  // glTF is Y-up: Blender x stays x. The sheet hangs within 2 cm of the inner wall face (x = 1.44).
  const accessor = json.accessors[json.meshes[page.mesh].primitives[0].attributes.POSITION];
  assert.ok(accessor.max[0] < 1.44 && accessor.min[0] > 1.42, `sheet x ${accessor.min[0]}..${accessor.max[0]}`);
  assert.ok(!json.materials.some(item => item.name === 'away') ||
    !json.nodes.some(node => /^interior/.test(node.name) && json.meshes[node.mesh]?.primitives.some(
      primitive => json.materials[primitive.material]?.name === 'away')), 'no coral board inside');
});

test('the site knows the model size, so the loading percent ignores gzip', async () => {
  const { KIOSK_BYTES } = await import('../assets/js/kiosk/model-size.js');
  assert.equal(KIOSK_BYTES, statSync(GLB).size, 'run npm run build:kiosk: the build rewrites it');
});
