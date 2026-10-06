import { loadContent } from './content.js';
import {
  renderAboutView,
  renderContactView,
  renderGenericPageView,
  renderLoadError,
  renderProjectView
} from './render.js';
import { parseRoute } from './router.js';
import { HOTSPOTS, ROUTE_PRESETS, hotspotForNode } from './kiosk/hotspots.js';
import { assignSlots } from './kiosk/slots.js';
import {
  renderCatalogView,
  renderHelpBar,
  renderHint,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView
} from './kiosk/ui.js';

const KIOSK_URL = new URL('../kiosk/kiosk.glb', import.meta.url).href;

const state = { bundle: null, kiosk: null, placed: [] };

const header = document.querySelector('#site-header');
const homeView = document.querySelector('#home-view');
const overlayView = document.querySelector('#overlay-view');
const liveRegion = document.querySelector('#live-region');

function announce(message) {
  liveRegion.textContent = '';
  window.requestAnimationFrame(() => { liveRegion.textContent = message; });
}

function getProject(projectId) {
  return state.bundle?.projects.find(project => project.id === projectId);
}

function getPage(pageId) {
  return state.bundle?.pages.find(page => page.id === pageId);
}

function getCategory(categoryId) {
  return state.bundle?.site.categories?.find(category => category.id === categoryId) || {};
}

function drawShell() {
  homeView.innerHTML = `<div class="kiosk-stage" id="kiosk-stage"></div>
    <div class="kiosk-label" id="kiosk-label" hidden></div>
    <div id="kiosk-note-slot"></div>
    <div id="kiosk-loading-slot">${renderLoading(0)}</div>
    ${renderHelpBar()}`;
}

function hotspotEntries() {
  const slots = state.placed.map(item => ({ node: item.slot, label: item.title }));
  const fixed = Object.entries(HOTSPOTS).map(([node, spot]) => ({ node, label: spot.label }));
  return [...slots, ...fixed];
}

let noteTimer = 0;
function showNote(text) {
  const slot = document.querySelector('#kiosk-note-slot');
  slot.innerHTML = renderNote(text);
  window.clearTimeout(noteTimer);
  noteTimer = window.setTimeout(() => { slot.innerHTML = ''; }, 4200);
}

function showHint() {
  document.querySelector('.kiosk-hint')?.remove();
  homeView.insertAdjacentHTML('beforeend', renderHint());
  window.setTimeout(() => document.querySelector('.kiosk-hint')?.remove(), 4000);
}

function firstVisitHint() {
  let seen = false;
  try {
    seen = window.localStorage.getItem('kiosk-hint-seen') === '1';
    window.localStorage.setItem('kiosk-hint-seen', '1');
  } catch {
    seen = false;
  }
  if (!seen) showHint();
}

function runAction(node) {
  const spot = hotspotForNode(node, state.placed);
  if (!spot) return;
  const { action } = spot;
  if (action.type === 'route') window.location.hash = action.hash;
  if (action.type === 'focus') state.kiosk?.focus(action.preset);
  if (action.type === 'note') showNote(action.text);
}

function showLabel(node, x, y) {
  const label = document.querySelector('#kiosk-label');
  const spot = node ? hotspotForNode(node, state.placed) : null;
  document.body.classList.toggle('is-pointing', Boolean(spot));
  if (!spot) {
    label.hidden = true;
    return;
  }
  label.textContent = spot.label;
  label.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
  label.hidden = false;
}

function closeOverlay() {
  overlayView.hidden = true;
  overlayView.innerHTML = '';
  document.body.dataset.route = 'home';
}

function showOverlay(html, viewName) {
  overlayView.innerHTML = `<div class="overlay-scrim" data-action="close-overlay"></div><div class="overlay-panel">${html}</div>`;
  overlayView.hidden = false;
  document.body.dataset.route = viewName;
  overlayView.querySelector('.back-link')?.focus({ preventScroll: true });
}

function renderRoute() {
  if (!state.bundle) return;
  const route = parseRoute(window.location.hash);
  state.kiosk?.focus(ROUTE_PRESETS[route.view] || 'home');

  if (route.view === 'home') {
    closeOverlay();
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

  if (route.view === 'catalog') {
    showOverlay(renderCatalogView(state.bundle.projects), 'catalog');
    announce('Открыт список проектов');
    return;
  }

  if (route.view === 'price') {
    showOverlay(renderPriceView(), 'price');
    announce('Открыт прайс');
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

async function mountKiosk() {
  const loading = document.querySelector('#kiosk-loading-slot');
  try {
    const { createKioskScene } = await import('./kiosk/scene.js');
    state.kiosk = await createKioskScene({
      container: document.querySelector('#kiosk-stage'),
      url: KIOSK_URL,
      onProgress: percent => { loading.innerHTML = renderLoading(percent); },
      onHover: showLabel,
      onPick: runAction
    });
    state.kiosk.setSlots(state.placed);
    state.kiosk.focus(ROUTE_PRESETS[parseRoute(window.location.hash).view] || 'home', { instant: true });
    loading.innerHTML = '';
    firstVisitHint();
  } catch (error) {
    console.error(error);
    loading.innerHTML = '';
    showNote('Ларёк не открылся на этом устройстве. Вот весь товар списком.');
    if (parseRoute(window.location.hash).view === 'home') window.location.hash = '#catalog';
  }
}

document.addEventListener('click', event => {
  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  if (action === 'kiosk-pick') runAction(element.dataset.node);
  if (action === 'kiosk-help') showHint();
  if (action === 'close-overlay') window.location.hash = '';
  if (action === 'scroll-to-section') {
    // Section anchors must not touch the hash: it is the view router.
    event.preventDefault();
    document.getElementById(element.dataset.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !overlayView.hidden) window.location.hash = '';
});

window.addEventListener('hashchange', renderRoute);

export async function bootstrapPortfolio() {
  header.hidden = true;
  drawShell();
  try {
    state.bundle = await loadContent();
    state.placed = assignSlots(state.bundle.projects).placed;
    homeView.insertAdjacentHTML('beforeend', renderHotspotButtons(hotspotEntries()));
    renderRoute();
  } catch (error) {
    homeView.innerHTML = renderLoadError(error.message);
    return;
  }
  await mountKiosk();
}

bootstrapPortfolio();
