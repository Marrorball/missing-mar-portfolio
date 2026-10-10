export const PRESETS = ['home', 'showcase', 'inside', 'cat', 'rack', 'tv', 'billboard', 'terminal', 'flyer', 'printer', 'phone'];

// Close-ups hold the camera still: you read or spin something, you don't orbit.
export const LOCKED_PRESETS = ['cat', 'rack', 'tv', 'billboard', 'terminal', 'flyer', 'printer', 'phone'];

// Something you walked up to, as opposed to the free street or inside view.
export function isCloseUp(preset) {
  return LOCKED_PRESETS.includes(preset) || preset === 'showcase';
}

// Close-ups that show a page, and the Blender anchor the page sits on.
export const SCREENS = {
  tv: 'screen_tv',
  billboard: 'screen_billboard',
  terminal: 'screen_terminal',
  flyer: 'screen_flyer'
};

// How much of the viewport a screen may take: room is left for the way back
// and the TV remote.
export const SCREEN_FILL = 0.74;

export const HOTSPOTS = {
  hs_showcase: { label: 'Витрина', action: { type: 'focus', preset: 'showcase' } },
  hs_flyer: { label: 'Контакты', action: { type: 'route', hash: '#contact' } },
  hs_billboard: { label: 'Обо мне', action: { type: 'route', hash: '#about' } },
  hs_terminal: { label: 'Терминал', action: { type: 'route', hash: '#resume' } },
  hs_backdoor: { label: 'Зайти внутрь', action: { type: 'focus', preset: 'inside' } },
  hs_doorway: { label: 'Зайти внутрь', action: { type: 'focus', preset: 'inside' } },
  hs_rack: { label: 'Все проекты', action: { type: 'focus', preset: 'rack' } },
  hs_tv: { label: 'Телевизор', action: { type: 'route', hash: '#catalog' } },
  hs_radio: { label: 'Радио', action: { type: 'radio' } },
  hs_phone: { label: 'Чей-то телефон', action: { type: 'phone' } },
  hs_cat: { label: 'Рыжий спит — погладить', action: { type: 'focus', preset: 'cat' } },
  hs_calendar: {
    label: 'Календарь',
    action: {
      type: 'note',
      text: 'О, тридцатое июня — это мой день рождения!'
    }
  },
  hs_sign_away: {
    label: 'Отошёл',
    action: { type: 'note', text: 'Марат отошёл. Контакты — на листовке слева, выписка — в терминале справа.' }
  }
};

export const ROUTE_PRESETS = {
  home: 'home',
  page: 'home',
  project: 'tv',
  catalog: 'tv',
  about: 'billboard',
  resume: 'terminal',
  contact: 'flyer'
};

const OUTSIDE = { fov: 40, minDistance: 1.2, maxDistance: 17, minPolarAngle: 0.45, maxPolarAngle: 1.52 };
// Look around from one eye point instead of orbiting through the walls.
const INSIDE = { fov: 72, lookAround: true, minDistance: 1.65, maxDistance: 1.95 };
const CLOSE_UP = { fov: 40, locked: true };

const DESIGN_ASPECT = 1.6;
const MAX_FOV = 75;

// Presets are framed for a 16:10 screen. On narrower screens the vertical
// field of view opens up so the kiosk keeps (most of) its width in frame.
export function fitFov(fov, aspect) {
  if (aspect >= DESIGN_ASPECT) return fov;
  const half = Math.atan(Math.tan((fov * Math.PI) / 360) * (DESIGN_ASPECT / aspect));
  return Math.min((half * 360) / Math.PI, MAX_FOV);
}

export function overviewScale(fov, aspect) {
  const requested = Math.tan(fov * Math.PI / 360) * DESIGN_ASPECT / aspect;
  const actual = Math.tan(fitFov(fov, aspect) * Math.PI / 360);
  // Portrait screens give the kiosk more of their width than the desktop
  // composition; only very tall screens need to retreat further.
  return Math.max(1, requested / actual * (aspect < 0.8 ? 0.6 : 1));
}

// Distance at which a width×height screen fills `fill` of the view.
export function fitDistance(width, height, vfovDeg, aspect, fill = 1) {
  const tangent = Math.tan((vfovDeg * Math.PI) / 360);
  const vertical = height / (2 * tangent);
  const horizontal = width / (2 * tangent * aspect);
  return Math.max(vertical, horizontal) / fill;
}

export function presetLimits(preset) {
  if (preset === 'inside') return INSIDE;
  if (LOCKED_PRESETS.includes(preset)) return CLOSE_UP;
  return OUTSIDE;
}

const PROJECT_NODE = /^(slot|disc)_\d+$/;
const HOTSPOT_NAME = /^hs_[a-z_]+$/;

export function isPickable(name = '') {
  return PROJECT_NODE.test(name) || HOTSPOT_NAME.test(name);
}

// Thin enough to click through: hits on these are ignored.
const SEE_THROUGH = new Set(['kiosk_grille']);

// `names` are the pickable-or-mesh names of ray hits, nearest first. The
// showcase glass is see-through: a slot behind it wins, while anything opaque
// in front of a hotspot blocks it.
export function pickHotspot(names = []) {
  let glass = null;
  for (const name of names) {
    if (SEE_THROUGH.has(name)) continue;
    if (name === 'hs_showcase') {
      glass ??= name;
      continue;
    }
    if (isPickable(name)) return name;
    return glass;
  }
  return glass;
}

// In a close-up only the object you came to look at answers the mouse; the
// overview and the inside answer everything.
const CLOSE_UP_TARGETS = {
  cat: /^hs_cat$/,
  rack: /^(disc_\d+|hs_rack)$/,
  tv: /^hs_tv$/,
  billboard: /^hs_billboard$/,
  terminal: /^hs_terminal$/,
  flyer: /^hs_flyer$/,
  // watching the receipt print, nothing else answers; the phone is picked up
  printer: /^$/,
  phone: /^hs_phone$/,
  // the showcase is looked at, not walked round: only its projects answer
  showcase: /^slot_\d+$/
};

export function allowedIn(preset, name) {
  const target = CLOSE_UP_TARGETS[preset];
  return target ? target.test(name) : true;
}

export function hotspotForNode(name, { hits = [], discs = [] } = {}) {
  if (PROJECT_NODE.test(name)) {
    const item = [...hits, ...discs].find(entry => entry.node === name);
    if (!item) return null;
    return {
      label: item.title,
      action: { type: 'route', hash: `#project/${encodeURIComponent(item.projectId)}` }
    };
  }
  return HOTSPOTS[name] || null;
}
