export const SLOT_COUNT = 8;

// The showcase carries the «hits»: projects marked `featured`, in
// featuredOrder. Every project also has its disc in the rack inside.
export function assignHits(projects = [], count = SLOT_COUNT) {
  return projects
    .filter(project => project.featured)
    .sort((a, b) => (Number(a.featuredOrder) || 0) - (Number(b.featuredOrder) || 0))
    .slice(0, count)
    .map((project, index) => ({
      node: `slot_${index}`,
      projectId: project.id,
      title: project.shortLabel || project.title
    }));
}
