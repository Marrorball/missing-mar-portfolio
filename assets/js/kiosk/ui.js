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

// The card that explains the kiosk to someone who just walked up: how to
// look round, point and walk up to things and back, in mouse or finger words,
// and what is where.
export function renderGuide({ touch = false } = {}) {
  const rows = touch ? [
    ['Веди пальцем', 'осмотреться вокруг ларька'],
    ['Нажми на предмет', 'подойдёшь к нему: так открываются проекты, «обо мне» и контакты'],
    ['Нажми мимо или «Назад»', 'отойдёшь обратно'],
    ['Внутри ларька', 'веди пальцем, чтобы оглядеться, двумя пальцами — ближе']
  ] : [
    ['Зажми и тяни мышью', 'осмотреться вокруг ларька'],
    ['Наведи на предмет', 'он подсветится и подпишется'],
    ['Нажми на него', 'подойдёшь ближе: так открываются проекты, «обо мне» и контакты'],
    ['Нажми мимо или «Назад»', 'отойдёшь обратно'],
    ['Внутри ларька', 'тяни, чтобы оглядеться, колесо — ближе']
  ];
  return `<div class="kiosk-guide" role="dialog" aria-label="Как тут ходить">
    <h2>Как тут ходить</h2>
    <ul>${rows.map(([what, does]) => `<li><b>${what}</b> — ${does}</li>`).join('')}</ul>
    <p class="kiosk-guide-where"><b>Что где:</b> вертушка с дисками — проекты, билборд — обо мне, листовка на ставне — контакты, терминал — опыт и навыки. Внутри — телевизор, радио и кот. А ещё кто-то потерял телефон.</p>
    <p class="kiosk-guide-menu">Не хочется искать — всё есть в меню внизу.</p>
    <button type="button" data-action="guide-close">Понятно</button>
  </div>`;
}

// What you hold up to your eyes: the receipt off the printer or the phone out
// of the snow, each with its own way to put it down.
export function renderHand(kind, inner = '') {
  const actions = kind === 'receipt'
    ? '<button type="button" class="hand-back" data-action="kiosk-back">← Положить чек</button><a class="hand-link" href="#contact">Связаться →</a>'
    : '<button type="button" class="hand-back" data-action="kiosk-back">← Положить телефон</button>';
  return `<div class="hand hand-${kind}" role="dialog" aria-label="${kind === 'receipt' ? 'Чек' : 'Телефон'}">
    <div class="hand-actions">${actions}</div>
    <div class="hand-body">${inner}</div>
  </div>`;
}

// A push-button phone of the early 2000s: the green screen and a keypad,
// 2 4 6 8 steer the snake, 5 starts it.
export function renderPhone() {
  const keys = [['1', ''], ['2', '▲'], ['3', ''], ['4', '◀︎'], ['5', 'старт'], ['6', '▶︎'], ['7', ''], ['8', '▼'], ['9', ''], ['*', ''], ['0', ''], ['#', '']];
  return `<div class="phone">
    <div class="phone-ear" aria-hidden="true"></div>
    <div class="phone-screen"><canvas width="420" height="280" aria-label="Змейка"></canvas></div>
    <div class="phone-keys">${keys.map(([digit, hint]) => `<button type="button" data-phone-key="${digit}"><b>${digit}</b>${hint ? `<small>${hint}</small>` : ''}</button>`).join('')}</div>
  </div>`;
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

// While the radio plays: what is on, and the red key to switch it off.
export function renderRadioPanel(name = '') {
  return `<div class="radio-panel" role="group" aria-label="Радио">
    <span class="radio-name" aria-live="polite"><b>FM</b> ${escapeHtml(name)}</span>
    <button type="button" class="radio-off" data-action="radio-off" aria-label="Выключить радио">Выкл</button>
  </div>`;
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
