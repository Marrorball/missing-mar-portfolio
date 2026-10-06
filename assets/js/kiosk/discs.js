export const RACK_FACES = 4;
export const POCKETS_PER_FACE = 8;

// Fills the DVD rack face by face. Each category starts on a fresh face and
// takes as many faces as it needs; projects that do not fit are only listed
// in the TV guide.
export function assignDiscs(projects = [], categories = []) {
  const ordered = [...categories].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const known = new Set(ordered.map(category => category.id));
  const groups = ordered.map(category => ({
    title: category.title,
    items: projects.filter(project => project.category === category.id)
  }));
  groups.push({ title: 'Разное', items: projects.filter(project => !known.has(project.category)) });

  const faces = [];
  const discs = [];
  const overflow = [];
  for (const group of groups) {
    for (let start = 0; start < group.items.length; start += POCKETS_PER_FACE) {
      const chunk = group.items.slice(start, start + POCKETS_PER_FACE);
      if (faces.length === RACK_FACES) {
        overflow.push(...chunk.map(project => project.id));
        continue;
      }
      const face = faces.length;
      faces.push({ index: face, title: group.title });
      chunk.forEach((project, pocket) => discs.push({
        node: `disc_${face * POCKETS_PER_FACE + pocket}`,
        projectId: project.id,
        title: project.shortLabel || project.title,
        face
      }));
    }
  }
  return { faces, discs, overflow };
}
