import { escapeHtml } from '../render.js';

const BACK_ICON = '<i class="ph ph-arrow-left" aria-hidden="true"></i>';

export function renderHelpBar() {
  return `<nav class="kiosk-help" aria-label="Помощь по ларьку">
    <button type="button" data-action="kiosk-focus" data-preset="rack">Проекты</button>
    <a href="#about">Обо мне</a>
    <button type="button" data-action="contacts-card" aria-expanded="false" aria-controls="contact-card">Контакты</button>
    <button type="button" data-action="kiosk-help">Как тут ходить?</button>
    <button type="button" data-action="kiosk-inside">Внутрь</button>
  </nav>`;
}

export function renderContactCard(links = []) {
  return `<div class="contact-card" id="contact-card" role="dialog" aria-label="Контакты">
    <ul>
      ${links.map(link => `<li>
        <a href="${escapeHtml(link.href)}"${link.kind === 'email' ? '' : ' target="_blank" rel="noreferrer"'}><small>${escapeHtml(link.label)}</small>${escapeHtml(link.value)}</a>
      </li>`).join('')}
    </ul>
  </div>`;
}

export function renderBackButton() {
  return `<button type="button" class="kiosk-back" data-action="kiosk-back" title="Или нажми мимо — или Esc">${BACK_ICON}Назад</button>`;
}

export function renderRackControls(title = '') {
  return `<div class="rack-controls" role="group" aria-label="Вертушка с дисками">
    <button type="button" data-action="rack-spin" data-step="-1" aria-label="Предыдущая сторона">◀\uFE0E</button>
    <span id="rack-face" aria-live="polite">${escapeHtml(title)}</span>
    <button type="button" data-action="rack-spin" data-step="1" aria-label="Следующая сторона">▶\uFE0E</button>
  </div>`;
}

export function renderHint() {
  return '<div class="kiosk-hint" role="status">Крути мышкой и нажимай на то, что светится</div>';
}

export function renderNote(text = '') {
  return `<div class="kiosk-note" role="status">${escapeHtml(text)}</div>`;
}

export function renderLoading(percent = 0) {
  const shown = Math.round(Math.min(100, Math.max(0, percent)));
  return `<div class="kiosk-loading" role="status">Открываем ларёк… ${shown}%</div>`;
}

// Every clickable object in the scene has a twin button here, so the kiosk
// works from the keyboard and with screen readers.
export function renderHotspotButtons(entries = []) {
  return `<div class="kiosk-a11y">${entries.map(entry => `<button type="button" data-action="kiosk-pick" data-node="${escapeHtml(entry.node)}">${escapeHtml(entry.label)}</button>`).join('')}</div>`;
}

export function renderRemote() {
  return `<div class="tv-remote" role="group" aria-label="Пульт">
    <button type="button" data-action="tv-off" aria-label="Выключить и вернуться назад">ВЫКЛ</button>
    <button type="button" data-action="tv-channel" data-step="1" aria-label="Следующий канал">CH+</button>
    <button type="button" data-action="tv-channel" data-step="-1" aria-label="Предыдущий канал">CH−</button>
    <button type="button" data-action="tv-scroll" data-step="-1" aria-label="Листать вверх">▲</button>
    <button type="button" data-action="tv-scroll" data-step="1" aria-label="Листать вниз">▼</button>
    <button type="button" data-action="tv-menu">МЕНЮ</button>
  </div>`;
}
