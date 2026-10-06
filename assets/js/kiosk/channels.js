// Every project is a channel, numbered in content order: 1, 2, 3.
export function channelNumber(index) {
  return String(index + 1);
}

export function neighbourId(projects = [], id, step) {
  if (!projects.length) return null;
  const index = projects.findIndex(project => project.id === id);
  if (index === -1) return projects[0].id;
  return projects[(index + step + projects.length) % projects.length].id;
}
