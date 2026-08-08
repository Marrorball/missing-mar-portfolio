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
  activeCategory: 'all'
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
    showOverlay(renderProjectView(project, getCategory(project.category)), 'project');
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
