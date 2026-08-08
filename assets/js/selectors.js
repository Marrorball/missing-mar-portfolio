const collator = new Intl.Collator('ru');

function byOrderThenTitle(a, b) {
  return (Number(a.order) || 0) - (Number(b.order) || 0)
    || collator.compare(a.title || '', b.title || '');
}

export function selectFeaturedProjects(projects, count = 3) {
  const featured = projects
    .filter(project => project.featured)
    .sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0));
  const used = new Set(featured.map(project => project.id));
  const fallback = projects
    .filter(project => !used.has(project.id))
    .sort(byOrderThenTitle);
  return [...featured, ...fallback].slice(0, count);
}

export function filterProjects(projects, categoryId = 'all') {
  return categoryId === 'all'
    ? [...projects]
    : projects.filter(project => project.category === categoryId);
}

export function resolveProjectCover(project) {
  return typeof project.cover === 'string' ? project.cover : '';
}
