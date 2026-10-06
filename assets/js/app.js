import { loadContent } from './content.js';
import {
  renderAboutView,
  renderContactView,
  renderGenericPageView,
  renderHeader,
  renderHome,
  renderLoadError,
  renderProjectView
} from './render.js';
import { parseRoute } from './router.js';
import { selectFeaturedProjects } from './selectors.js';

const state = {
  bundle: null,
  activeProjectId: '',
  activeCategory: 'all',
  trackDepth: null
};

const header = document.querySelector('#site-header');
const homeView = document.querySelector('#home-view');
const overlayView = document.querySelector('#overlay-view');
const liveRegion = document.querySelector('#live-region');

function getProject(projectId) {
  return state.bundle?.projects.find(project => project.id === projectId);
}

function getPage(pageId) {
  return state.bundle?.pages.find(page => page.id === pageId);
}

function getCategory(categoryId) {
  return state.bundle?.site.categories?.find(category => category.id === categoryId) || {};
}

function drawHome() {
  const { site, pages, projects } = state.bundle;
  homeView.innerHTML = renderHome({
    site,
    pages,
    projects,
    categories: site.categories || [],
    activeProjectId: state.activeProjectId,
    activeCategory: state.activeCategory
  });
  enhanceDig();
}

let unearthObserver = null;

function enhanceDig() {
  const finds = document.querySelector('#finds');
  const head = document.querySelector('#depth-head');
  if (!finds) return;

  unearthObserver?.disconnect();
  unearthObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-unearthed');
        unearthObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  finds.querySelectorAll('.find').forEach(find => unearthObserver.observe(find));

  if (!head) return;
  const deepest = 1.4 * finds.children.length;
  let queued = false;

  const track = () => {
    queued = false;
    const box = finds.getBoundingClientRect();
    const travelled = window.innerHeight * 0.5 - box.top;
    const progress = Math.min(Math.max(travelled / Math.max(box.height, 1), 0), 1);
    head.style.top = `${(progress * 100).toFixed(2)}%`;
    head.innerHTML = `<strong>−${(progress * deepest).toFixed(1).replace('.', ',')} м</strong>`;
  };

  window.removeEventListener('scroll', state.trackDepth);
  state.trackDepth = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(track);
  };
  window.addEventListener('scroll', state.trackDepth, { passive: true });
  track();
}

function announce(message) {
  liveRegion.textContent = '';
  window.requestAnimationFrame(() => { liveRegion.textContent = message; });
}

function showHome() {
  homeView.hidden = false;
  overlayView.hidden = true;
  overlayView.innerHTML = '';
  document.body.dataset.route = 'home';
}

function showOverlay(html, viewName) {
  homeView.hidden = true;
  overlayView.innerHTML = html;
  overlayView.hidden = false;
  document.body.dataset.route = viewName;
  overlayView.querySelector('h1, [tabindex]')?.focus({ preventScroll: true });
}

function renderRoute() {
  if (!state.bundle) return;
  const route = parseRoute(window.location.hash);

  if (route.view === 'home') {
    showHome();
    return;
  }

  if (route.view === 'project') {
    const project = getProject(route.id);
    if (!project) {
      window.location.hash = '';
      return;
    }
    const ordered = state.bundle.projects;
    const position = ordered.findIndex(item => item.id === project.id);
    const neighbour = ordered[(position + 1) % ordered.length] || null;
    showOverlay(
      renderProjectView(project, getCategory(project.category), neighbour === project ? null : neighbour),
      'project'
    );
    announce(`Открыт проект ${project.title}`);
    return;
  }

  if (route.view === 'about') {
    const page = getPage('about') || { id: 'about', title: 'Обо мне', content: '' };
    showOverlay(renderAboutView(state.bundle.site, state.bundle.resume, page), 'about');
    announce('Открыта страница Обо мне');
    return;
  }

  if (route.view === 'contact') {
    showOverlay(renderContactView(state.bundle.site), 'contact');
    announce('Открыта страница Контакт');
    return;
  }

  const page = getPage(route.id);
  if (!page) {
    window.location.hash = '';
    return;
  }
  showOverlay(renderGenericPageView(page), 'page');
  announce(`Открыта страница ${page.title}`);
}

function scrollToArchive() {
  showHome();
  document.querySelector('#project-archive')?.scrollIntoView({ behavior: 'smooth' });
}

function handleAction(element, event) {
  const action = element.dataset.action;
  if (action === 'select-featured') {
    state.activeProjectId = element.dataset.projectId;
    drawHome();
    announce(`Выбран проект ${getProject(state.activeProjectId)?.title || ''}`);
    return;
  }
  if (action === 'filter-projects') {
    state.activeCategory = element.dataset.categoryId || 'all';
    drawHome();
    document.querySelector('#project-archive')?.scrollIntoView({ block: 'start' });
    announce(`Фильтр проектов: ${element.textContent.trim()}`);
    return;
  }
  if (action === 'scroll-to-section') {
    // Section anchors must not touch the hash: it is the view router.
    event.preventDefault();
    const target = document.getElementById(element.dataset.sectionId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (action === 'show-projects') {
    event.preventDefault();
    scrollToArchive();
  }
}

document.addEventListener('click', event => {
  const actionElement = event.target.closest('[data-action]');
  if (actionElement) handleAction(actionElement, event);
});

window.addEventListener('hashchange', renderRoute);

export async function bootstrapPortfolio() {
  try {
    state.bundle = await loadContent();
    state.activeProjectId = selectFeaturedProjects(state.bundle.projects, 3)[0]?.id || '';
    header.innerHTML = renderHeader(state.bundle.site, state.bundle.pages);
    drawHome();
    renderRoute();
  } catch (error) {
    header.hidden = true;
    homeView.innerHTML = renderLoadError(error.message);
  }
}

bootstrapPortfolio();
