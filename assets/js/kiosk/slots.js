export const SLOT_COUNT = 8;

export const PRODUCT_TYPES = ['can', 'dvd', 'box', 'gum', 'magazine', 'notebook', 'matchbox', 'cassette'];

const PRODUCT_BY_CATEGORY = { uxui: 'box', graphic: 'magazine' };

export function productFor(project = {}) {
  if (PRODUCT_TYPES.includes(project.product)) return project.product;
  return PRODUCT_BY_CATEGORY[project.category] || 'box';
}

// Projects arrive already sorted by content order; the first ones go on the
// front shelf and the rest are only reachable through «Весь товар».
export function assignSlots(projects = [], count = SLOT_COUNT) {
  const placed = projects.slice(0, count).map((project, index) => ({
    slot: `slot_${index}`,
    projectId: project.id,
    title: project.shortLabel || project.title,
    product: productFor(project)
  }));
  return { placed, overflow: projects.slice(count).map(project => project.id) };
}
