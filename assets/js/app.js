import { loadContent } from './content.js';
import {
  renderAboutView,
  renderContactView,
  renderGenericPageView,
  renderLoadError,
  renderProjectView
} from './render.js';
import { parseRoute } from './router.js';
import { contactLinks } from './kiosk/contacts.js';
import { assignDiscs } from './kiosk/discs.js';
import { HOTSPOTS, LOCKED_PRESETS, ROUTE_PRESETS, hotspotForNode } from './kiosk/hotspots.js';
import { assignHits } from './kiosk/slots.js';
import {
  renderBackButton,
  renderCatalogView,
  renderContactCard,
  renderHelpBar,
  renderHint,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView,
  renderRackControls
} from './kiosk/ui.js';

const KIOSK_URL = new URL('../kiosk/kiosk.glb', import.meta.url).href;

const state = { bundle: null, kiosk: null, hits: [], discs: [], faces: [], preset: 'home', rackFace: 0 };

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
    <div id="kiosk-closeup-slot"></div>
    <div id="contact-card-slot"></div>
    <div id="kiosk-loading-slot">${renderLoading(0)}</div>
    ${renderHelpBar()}`;
}

function hotspotEntries() {
  const projects = [...state.hits, ...state.discs].map(item => ({ node: item.node, label: item.title }));
  const fixed = Object.entries(HOTSPOTS).map(([node, spot]) => ({ node, label: spot.label }));
  return [...projects, ...fixed];
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

function rackTitle(face) {
  return state.faces.find(entry => entry.index === face)?.title || 'Пусто';
}

// Moves the camera and swaps the close-up chrome: a way back for every
// close-up, spin controls for the rack.
function focusPreset(name, options) {
  state.preset = name;
  state.kiosk?.focus(name, options);
  const slot = document.querySelector('#kiosk-closeup-slot');
  if (!LOCKED_PRESETS.includes(name)) {
    slot.innerHTML = '';
    return;
  }
  slot.innerHTML = renderBackButton() + (name === 'rack' ? renderRackControls(rackTitle(state.rackFace)) : '');
}

function goHome() {
  if (window.location.hash && window.location.hash !== '#') {
    window.location.hash = '';
  } else {
    focusPreset('home');
  }
}

function runAction(node) {
  const spot = hotspotForNode(node, state);
  if (!spot) return;
  const { action } = spot;
  if (action.type === 'route') window.location.hash = action.hash;
  if (action.type === 'focus') focusPreset(action.preset);
  if (action.type === 'note') showNote(action.text);
}

function showLabel(node, x, y) {
  const label = document.querySelector('#kiosk-label');
  const spot = node ? hotspotForNode(node, state) : null;
  document.body.classList.toggle('is-pointing', Boolean(spot));
  if (!spot) {
    label.hidden = true;
    return;
  }
  label.textContent = spot.label;
  label.style.transform = `translate(${x + 16}px, ${y + 14}px)`;
  label.hidden = false;
}

function toggleContactCard(force) {
  const slot = document.querySelector('#contact-card-slot');
  const button = document.querySelector('[data-action="contacts-card"]');
  const open = force ?? !slot.innerHTML;
  slot.innerHTML = open ? renderContactCard(contactLinks(state.bundle?.site.contacts)) : '';
  button?.setAttribute('aria-expanded', String(open));
  if (open) slot.querySelector('a')?.focus();
}

async function copyContact(value) {
  try {
    await navigator.clipboard.writeText(value);
    showNote(`Скопировано: ${value}`);
  } catch {
    showNote(value);
  }
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
  focusPreset(ROUTE_PRESETS[route.view] || 'home');

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
      onPick: runAction,
      onRackFace: face => {
        state.rackFace = face;
        const title = document.querySelector('#rack-face');
        if (title) title.textContent = rackTitle(face);
      }
    });
    state.kiosk.setHits(state.hits);
    state.kiosk.setDiscs(state.discs);
    focusPreset(ROUTE_PRESETS[parseRoute(window.location.hash).view] || 'home', { instant: true });
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
  const card = document.querySelector('#contact-card');
  if (card && !event.target.closest('#contact-card, [data-action="contacts-card"]')) toggleContactCard(false);

  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  if (action === 'kiosk-pick') runAction(element.dataset.node);
  if (action === 'kiosk-focus') focusPreset(element.dataset.preset);
  if (action === 'kiosk-home') goHome();
  if (action === 'kiosk-help') showHint();
  if (action === 'rack-spin') state.kiosk?.spinRack(Number(element.dataset.step));
  if (action === 'contacts-card') toggleContactCard();
  if (action === 'copy-contact') copyContact(element.dataset.value);
  if (action === 'close-overlay') window.location.hash = '';
  if (action === 'scroll-to-section') {
    // Section anchors must not touch the hash: it is the view router.
    event.preventDefault();
    document.getElementById(element.dataset.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.querySelector('#contact-card')) toggleContactCard(false);
    else if (!overlayView.hidden) window.location.hash = '';
    else if (LOCKED_PRESETS.includes(state.preset)) goHome();
  }
  if (state.preset === 'rack' && overlayView.hidden && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    state.kiosk?.spinRack(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

window.addEventListener('hashchange', renderRoute);

export async function bootstrapPortfolio() {
  header.hidden = true;
  drawShell();
  try {
    state.bundle = await loadContent();
    state.hits = assignHits(state.bundle.projects);
    const { discs, faces } = assignDiscs(state.bundle.projects, state.bundle.site.categories);
    state.discs = discs;
    state.faces = faces;
    homeView.insertAdjacentHTML('beforeend', renderHotspotButtons(hotspotEntries()));
    renderRoute();
  } catch (error) {
    homeView.innerHTML = renderLoadError(error.message);
    return;
  }
  await mountKiosk();
}

bootstrapPortfolio();
