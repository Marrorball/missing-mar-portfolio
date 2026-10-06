export const PRESETS = ['home', 'showcase', 'flyer', 'terminal', 'pricelist', 'inside'];

export const HOTSPOTS = {
  hs_showcase: { label: 'Проекты', action: { type: 'focus', preset: 'showcase' } },
  hs_flyer: { label: 'Обо мне', action: { type: 'route', hash: '#about' } },
  hs_terminal: { label: 'Контакты', action: { type: 'route', hash: '#contact' } },
  hs_pricelist: { label: 'Прайс', action: { type: 'route', hash: '#price' } },
  hs_backdoor: { label: 'Заглянуть внутрь', action: { type: 'focus', preset: 'inside' } },
  hs_tv: { label: 'Весь товар', action: { type: 'route', hash: '#catalog' } },
  hs_radio: { label: 'Радио', action: { type: 'note', text: 'Радио пока молчит.' } },
  hs_sign_away: {
    label: 'Отошёл',
    action: { type: 'note', text: 'Марат отошёл: ищет команду. Контакты — на терминале справа.' }
  }
};

export const ROUTE_PRESETS = {
  home: 'home',
  page: 'home',
  project: 'showcase',
  catalog: 'showcase',
  about: 'flyer',
  contact: 'terminal',
  price: 'pricelist'
};

const OUTSIDE = { fov: 40, minDistance: 1.2, maxDistance: 9, minPolarAngle: 0.45, maxPolarAngle: 1.52 };
// Inside, the camera stands in the back corner: a wide lens and a short leash
// so turning around never pushes it through a wall.
const INSIDE = { fov: 62, minDistance: 0.4, maxDistance: 1.6, minPolarAngle: 1.0, maxPolarAngle: 1.75, azimuthSpan: 0.6 };

const DESIGN_ASPECT = 1.6;
const MAX_FOV = 75;

// Presets are framed for a 16:10 screen. On narrower screens the vertical
// field of view opens up so the kiosk keeps (most of) its width in frame.
export function fitFov(fov, aspect) {
  if (aspect >= DESIGN_ASPECT) return fov;
  const half = Math.atan(Math.tan((fov * Math.PI) / 360) * (DESIGN_ASPECT / aspect));
  return Math.min((half * 360) / Math.PI, MAX_FOV);
}

export function presetLimits(preset) {
  return preset === 'inside' ? INSIDE : OUTSIDE;
}

const SLOT_NAME = /^slot_\d+$/;
const HOTSPOT_NAME = /^hs_[a-z_]+$/;

export function isPickable(name = '') {
  return SLOT_NAME.test(name) || HOTSPOT_NAME.test(name);
}

// `names` are the pickable-or-mesh names of ray hits, nearest first. The
// showcase glass is see-through: a slot behind it wins, while anything opaque
// in front of a hotspot blocks it.
export function pickHotspot(names = []) {
  let glass = null;
  for (const name of names) {
    if (name === 'hs_showcase') {
      glass ??= name;
      continue;
    }
    if (isPickable(name)) return name;
    return glass;
  }
  return glass;
}

export function hotspotForNode(name, placed = []) {
  if (SLOT_NAME.test(name)) {
    const item = placed.find(entry => entry.slot === name);
    if (!item) return null;
    return {
      label: item.title,
      action: { type: 'route', hash: `#project/${encodeURIComponent(item.projectId)}` }
    };
  }
  return HOTSPOTS[name] || null;
}
