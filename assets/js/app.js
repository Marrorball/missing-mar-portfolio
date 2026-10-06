import { loadContent } from './content.js';
import { renderLoadError } from './render.js';
import { parseRoute } from './router.js';
import { channelNumber, neighbourId } from './kiosk/channels.js';
import { contactLinks } from './kiosk/contacts.js';
import { assignDiscs } from './kiosk/discs.js';
import { HOTSPOTS, LOCKED_PRESETS, ROUTE_PRESETS, hotspotForNode } from './kiosk/hotspots.js';
import {
  renderAboutBoard,
  renderFlyer,
  renderPageBoard,
  renderPriceBoard,
  renderPriceSheet,
  renderTerminalScreen,
  renderTvChannel,
  renderTvGuide
} from './kiosk/pages.js';
import { drawFlyer, drawPriceNote, drawPriceSheet } from './kiosk/paper.js';
import { purr } from './kiosk/purr.js';
import { isInside } from './kiosk/routes.js';
import { assignHits } from './kiosk/slots.js';
import { drawTeletext } from './kiosk/teletext.js';
import {
  renderBackButton,
  renderContactCard,
  renderHelpBar,
  renderHint,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderRackControls,
  renderRemote
} from './kiosk/ui.js';

const KIOSK_URL = new URL('../kiosk/kiosk.glb', import.meta.url).href;
const NARROW = window.matchMedia('(max-width: 760px)');

const state = {
  bundle: null,
  kiosk: null,
  hits: [],
  discs: [],
  faces: [],
  preset: 'home',
  rackFace: 0,
  channel: null,
  pendingDisc: null,
  // where you stood before each close-up, most recent last
  trail: [],
  hash: '',
  returning: null
};

const TRAIL_LENGTH = 12;

function currentHash() {
  return window.location.hash === '#' ? '' : window.location.hash;
}

const header = document.querySelector('#site-header');
const homeView = document.querySelector('#home-view');
const flatView = document.querySelector('#overlay-view');
const liveRegion = document.querySelector('#live-region');

function announce(message) {
  liveRegion.textContent = '';
  window.requestAnimationFrame(() => { liveRegion.textContent = message; });
}

function getPage(pageId) {
  return state.bundle?.pages.find(page => page.id === pageId);
}

function getCategory(categoryId) {
  return state.bundle?.site.categories?.find(category => category.id === categoryId) || {};
}

// Phones and devices without 3D get the same pages full screen.
function isFlat() {
  return !state.kiosk || NARROW.matches;
}

function drawShell() {
  homeView.innerHTML = `<div class="kiosk-stage" id="kiosk-stage"></div>
    <div class="kiosk-label" id="kiosk-label" hidden></div>
    <div id="kiosk-loading-slot">${renderLoading(0)}</div>
    ${renderHelpBar()}`;
  // Notes, the way back, the remote and the contact card float above
  // everything, including full-screen pages on phones.
  document.body.insertAdjacentHTML('beforeend', `<div class="kiosk-chrome">
    <div id="kiosk-note-slot"></div>
    <div id="kiosk-closeup-slot"></div>
    <div id="contact-card-slot"></div>
  </div>`);
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

function chromeFor(name) {
  if (name === 'inside') return renderBackButton();
  if (!LOCKED_PRESETS.includes(name)) return '';
  if (name === 'rack') return renderBackButton() + renderRackControls(rackTitle(state.rackFace));
  if (name === 'tv') return renderBackButton() + renderRemote();
  return renderBackButton();
}

// Moves the camera and swaps the close-up chrome.
function focusPreset(name, options) {
  if (!state.kiosk && name === 'rack') {
    window.location.hash = '#catalog';
    return;
  }
  const leaving = state.preset;
  if (name === 'home') state.trail = [];
  else if (state.kiosk && name !== leaving && !state.returning) {
    state.trail.push({ preset: leaving, hash: state.hash, view: state.kiosk.snapshot() });
    if (state.trail.length > TRAIL_LENGTH) state.trail.shift();
  }
  state.preset = name;
  state.hash = currentHash();
  syncDoorButton();
  // no scene, no journey: the remote must not wait for an arrival that never comes
  document.body.classList.toggle('is-travelling', Boolean(state.kiosk));
  state.kiosk?.focus(name, options);
  document.querySelector('#kiosk-closeup-slot').innerHTML = chromeFor(name);
}

function closeFlat() {
  flatView.hidden = true;
  flatView.innerHTML = '';
}

// Shows a page on its object in the scene, or full screen when flat.
function openScreen(preset, html, options = {}) {
  if (isFlat()) {
    flatView.innerHTML = `<div class="screen-flat screen-${preset}"><div class="screen-scroll">${html}</div></div>`;
    flatView.hidden = false;
  } else {
    closeFlat();
    state.kiosk.setPage(preset, html, options);
  }
  focusPreset(preset);
}

function screenScroller() {
  if (isFlat()) return flatView.querySelector('.screen-scroll');
  return state.kiosk?.pageScroller(state.preset) || null;
}

function goHome() {
  if (!state.kiosk) {
    window.location.hash = '#catalog';
    return;
  }
  if (window.location.hash && window.location.hash !== '#') {
    window.location.hash = '';
    return;
  }
  closeFlat();
  focusPreset('home');
}

// Inside, the help bar's «Внутрь» becomes the way out.
function syncDoorButton() {
  const button = document.querySelector('[data-action="kiosk-inside"]');
  if (button) button.textContent = isInside(state.preset) ? 'Выйти' : 'Внутрь';
}

// Out of the kiosk: back to where you last stood outside, or the overview.
function exitKiosk() {
  while (state.trail.length && isInside(state.trail.at(-1).preset)) state.trail.pop();
  if (state.trail.length) goBack();
  else goHome();
}

// Steps back to where you stood before this close-up: the same spot and
// angle for a free view, the same object (and page) for a close-up.
function goBack() {
  const entry = state.trail.pop();
  if (!entry || !state.kiosk) {
    goHome();
    return;
  }
  state.returning = entry;
  if (currentHash() !== entry.hash) window.location.hash = entry.hash;
  else renderRoute();
}

function arriveBack(entry) {
  if (entry.preset === 'terminal') {
    openScreen('terminal', terminalPage());
    return;
  }
  if (LOCKED_PRESETS.includes(entry.preset)) {
    focusPreset(entry.preset);
    return;
  }
  state.preset = entry.preset;
  state.hash = currentHash();
  syncDoorButton();
  document.body.classList.add('is-travelling');
  state.kiosk.restore(entry.view);
  document.querySelector('#kiosk-closeup-slot').innerHTML = chromeFor(entry.preset);
}

function terminalPage() {
  return renderTerminalScreen(contactLinks(state.bundle.site.contacts));
}

function runAction(node) {
  const spot = hotspotForNode(node, state);
  if (!spot) return;
  const { action } = spot;
  if (/^(slot|disc)_\d+$/.test(node)) state.pendingDisc = node;
  if (node === 'hs_cat') {
    purr();
    state.kiosk?.purr();
    showNote('Мррр…');
  }
  if (action.type === 'route') window.location.hash = action.hash;
  if (action.type === 'note') showNote(action.text);
  if (action.type === 'focus') {
    if (action.preset === 'terminal') openScreen('terminal', terminalPage());
    else focusPreset(action.preset);
  }
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

function changeChannel(step) {
  const { projects } = state.bundle;
  if (!projects.length) return;
  const id = state.channel
    ? neighbourId(projects, state.channel, step)
    : projects[step > 0 ? 0 : projects.length - 1].id;
  window.location.hash = `#project/${encodeURIComponent(id)}`;
}

// DVD menu: jump to a scene of the case.
function showChapter(number) {
  const scroller = screenScroller();
  const scene = scroller?.querySelector(`[data-chapter-section="${number}"]`);
  if (!scene) return;
  scroller.scrollTo({ top: scene.offsetTop - 64,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

function scrollScreen(step) {
  const scroller = screenScroller();
  scroller?.scrollBy({ top: step * scroller.clientHeight * 0.8,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

function renderRoute() {
  try {
    showRoute();
  } finally {
    state.returning = null;
  }
}

function showRoute() {
  if (!state.bundle) return;
  const route = parseRoute(window.location.hash);
  const { site, resume, projects } = state.bundle;
  const previous = state.channel;
  const pendingDisc = state.pendingDisc;
  state.pendingDisc = null;
  state.kiosk?.cancelDisc();
  state.channel = null;

  if (route.view === 'project') {
    const index = projects.findIndex(project => project.id === route.id);
    if (index === -1) {
      window.location.hash = '';
      return;
    }
    const project = projects[index];
    state.channel = project.id;
    openScreen('tv', renderTvChannel(project, { index, category: getCategory(project.category).title }), {
      switching: previous !== null && previous !== project.id
    });
    // after the walk is planned, so the disc rides along for its length
    if (pendingDisc) state.kiosk?.playDisc(pendingDisc);
    announce(`Канал ${index + 1}: ${project.title}`);
    return;
  }

  if (route.view === 'catalog') {
    openScreen('tv', renderTvGuide(projects, site.categories), { switching: previous !== null });
    announce('Телепрограмма');
    return;
  }

  if (route.view === 'about') {
    const page = getPage('about') || { id: 'about', title: 'Обо мне', content: '' };
    openScreen('billboard', renderAboutBoard(site, resume, page), { boardFace: 1 });
    announce('Обо мне');
    return;
  }

  if (route.view === 'pricelist') {
    openScreen('billboard', renderPriceBoard(), { boardFace: 2 });
    announce('Полный прайс');
    return;
  }

  if (route.view === 'price') {
    openScreen('price', renderPriceSheet());
    announce('Прайс');
    return;
  }

  if (route.view === 'contact') {
    openScreen('flyer', renderFlyer(contactLinks(site.contacts), site.owner));
    announce('Контакты');
    return;
  }

  if (route.view === 'page') {
    const page = getPage(route.id);
    if (!page) {
      window.location.hash = '';
      return;
    }
    openScreen('billboard', renderPageBoard(page));
    announce(page.title);
    return;
  }

  closeFlat();
  if (state.returning) arriveBack(state.returning);
  else focusPreset('home');
}

function loadImage(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

// The flyer and the price list printed on the shutters, and the channel list
// the TV shows when someone comes in.
async function paintSheets() {
  const { site, projects } = state.bundle;
  const owner = site.owner || {};
  const links = contactLinks(site.contacts);
  const photo = await loadImage(owner.profileImage);
  state.kiosk?.paintSheet('screen_flyer', (context, width, height) => drawFlyer(context, width, height, {
    name: owner.name, role: owner.role, location: owner.location, links, photo
  }), 'hs_flyer');
  state.kiosk?.paintSheet('screen_price', drawPriceSheet, 'hs_pricelist');
  state.kiosk?.paintSheet('note_fullprice', drawPriceNote, 'hs_fullprice');
  state.kiosk?.setTvPicture((context, width, height) => drawTeletext(context, width, height,
    projects.map((project, index) => ({ number: channelNumber(index), title: project.title || '' }))));
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
      onEmptyClick: goBack,
      onStreetClick: exitKiosk,
      onArrive: () => document.body.classList.remove('is-travelling'),
      onRackFace: face => {
        state.rackFace = face;
        const title = document.querySelector('#rack-face');
        if (title) title.textContent = rackTitle(face);
      }
    });
    state.kiosk.setHits(state.hits);
    state.kiosk.setDiscs(state.discs);
    // canvas lettering needs its faces loaded first (Cyrillic subsets too)
    Promise.all([
      document.fonts.ready,
      ...['700 40px "PT Sans Narrow"', '400 40px "PT Sans"', 'italic 400 40px "PT Sans"', '400 40px "PT Mono"']
        .map(font => document.fonts.load(font, 'МАРАТ mar').catch(() => []))
    ]).then(() => {
      paintSheets();
      state.kiosk.setProjectArt(state.bundle.projects, [...state.hits, ...state.discs], state.bundle.site.categories);
      state.kiosk.setWallText(['ПИШИТЕ:', ...contactLinks(state.bundle.site.contacts)
        .filter(link => link.kind !== 'behance')
        .map(link => (link.kind === 'telegram' ? `TG ${link.value}` : link.value))]);
      const owner = state.bundle.site.owner || {};
      state.kiosk.setBillboardAd({ brand: owner.brandName, name: owner.name, role: owner.role });
    });
    // A direct close-up URL still needs a real street view to return to.
    // Initialise it before focusPreset records the first history snapshot.
    state.kiosk.focus('home', { instant: true });
    focusPreset(ROUTE_PRESETS[parseRoute(window.location.hash).view] || 'home', { instant: true });
    renderRoute();
    loading.innerHTML = '';
    firstVisitHint();
  } catch (error) {
    console.error(error);
    state.kiosk = null;
    document.querySelector('.kiosk-help [data-action="kiosk-inside"]').hidden = true;
    loading.innerHTML = '';
    showNote('Ларёк не открылся на этом устройстве. Вот всё списком.');
    if (parseRoute(window.location.hash).view === 'home') window.location.hash = '#catalog';
    else renderRoute();
  }
}

document.addEventListener('click', event => {
  const card = document.querySelector('#contact-card');
  if (card && !event.target.closest('#contact-card, [data-action="contacts-card"]')) toggleContactCard(false);

  const element = event.target.closest('[data-action]');
  if (!element) return;
  const action = element.dataset.action;
  const step = Number(element.dataset.step);
  if (action === 'kiosk-pick') runAction(element.dataset.node);
  if (action === 'kiosk-focus') focusPreset(element.dataset.preset);
  if (action === 'kiosk-inside') {
    if (isInside(state.preset)) exitKiosk();
    else focusPreset('inside');
  }
  if (action === 'kiosk-home') goHome();
  if (action === 'kiosk-back' || action === 'tv-off') goBack();
  if (action === 'kiosk-help') showHint();
  if (action === 'rack-spin') state.kiosk?.spinRack(step);
  if (action === 'tv-channel') changeChannel(step);
  if (action === 'tv-scroll') scrollScreen(step);
  if (action === 'tv-menu') window.location.hash = '#catalog';
  if (action === 'tv-chapter') showChapter(element.dataset.chapter);
  if (action === 'contacts-card') toggleContactCard();
  if (action === 'copy-contact') copyContact(element.dataset.value);
});

document.addEventListener('keydown', event => {
  if (event.target.closest?.('input, textarea')) return;
  if (event.key === 'Escape') {
    if (document.querySelector('#contact-card')) toggleContactCard(false);
    else if (state.preset !== 'home' || !flatView.hidden) goBack();
    return;
  }
  const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
  const vertical = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
  if (state.preset === 'inside' && (horizontal || vertical)) {
    event.preventDefault();
    // keys turn your head; a drag grabs the world, so they run opposite
    state.kiosk?.lookInside(-horizontal * 60, -vertical * 60);
  }
  if (state.preset === 'rack' && horizontal) state.kiosk?.spinRack(horizontal);
  if (state.preset === 'tv' && horizontal) changeChannel(horizontal);
  if (['tv', 'billboard', 'terminal', 'flyer', 'price'].includes(state.preset) && vertical) {
    event.preventDefault();
    scrollScreen(vertical);
  }
});

window.addEventListener('hashchange', renderRoute);
NARROW.addEventListener('change', renderRoute);

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
  } catch (error) {
    homeView.innerHTML = renderLoadError(error.message);
    return;
  }
  await mountKiosk();
}

bootstrapPortfolio();
