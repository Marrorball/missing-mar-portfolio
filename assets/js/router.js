const SIMPLE_VIEWS = ['about', 'contact', 'catalog', 'resume'];

export function parseRoute(hash = '') {
  const value = String(hash).replace(/^#/, '');
  if (!value) return { view: 'home', id: '' };
  if (SIMPLE_VIEWS.includes(value)) return { view: value, id: '' };

  const [kind, encodedId = ''] = value.split('/');
  if ((kind === 'project' || kind === 'page') && encodedId) {
    try {
      return { view: kind, id: decodeURIComponent(encodedId) };
    } catch {
      return { view: 'home', id: '' };
    }
  }

  return { view: 'home', id: '' };
}

export function routeToHash({ view, id = '' }) {
  if (view === 'project' && id) return `#project/${encodeURIComponent(id)}`;
  if (view === 'page' && id) return `#page/${encodeURIComponent(id)}`;
  if (SIMPLE_VIEWS.includes(view)) return `#${view}`;
  return '#';
}
