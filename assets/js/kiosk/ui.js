import { escapeHtml } from '../render.js';

export function renderHelpBar() {
  return `<nav class="kiosk-help" aria-label="Помощь по ларьку">
    <a href="#catalog">Проекты</a>
    <a href="#about">Обо мне</a>
    <a href="#contact">Контакты</a>
    <button type="button" data-action="kiosk-help">Как тут ходить?</button>
  </nav>`;
}

export function renderHint() {
  return '<div class="kiosk-hint" role="status">Крути мышкой и нажимай на то, что светится</div>';
}

export function renderNote(text = '') {
  return `<div class="kiosk-note" role="status">${escapeHtml(text)}</div>`;
}

export function renderLoading(percent = 0) {
  return `<div class="kiosk-loading" role="status">Открываем ларёк… ${Math.round(percent)}%</div>`;
}

// Every clickable object in the scene has a twin button here, so the kiosk
// works from the keyboard and with screen readers.
export function renderHotspotButtons(entries = []) {
  return `<div class="kiosk-a11y">${entries.map(entry => `<button type="button" data-action="kiosk-pick" data-node="${escapeHtml(entry.node)}">${escapeHtml(entry.label)}</button>`).join('')}</div>`;
}

export function renderCatalogView(projects = []) {
  return `<article class="portfolio-view catalog-view" data-view="catalog">
    <header class="view-header">
      <a class="back-link" href="#">← К ларьку</a>
      <h1>Весь товар</h1>
    </header>
    <ol class="catalog-list">
      ${projects.map(project => `<li><a href="#project/${encodeURIComponent(project.id)}"><span>${escapeHtml(project.title || '')}</span><small>${escapeHtml(project.year || '')}</small></a></li>`).join('')}
    </ol>
  </article>`;
}

export function renderPriceView() {
  return `<article class="portfolio-view price-view" data-view="price">
    <header class="view-header">
      <a class="back-link" href="#">← К ларьку</a>
      <h1>Прайс</h1>
      <p class="view-summary">Скоро здесь будет прайс на услуги.</p>
    </header>
  </article>`;
}
