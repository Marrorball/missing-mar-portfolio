import { escapeHtml } from '../render.js';

const BACK_ICON = '<i class="ph ph-arrow-left" aria-hidden="true"></i>';

export function renderHelpBar() {
  return `<nav class="kiosk-help" aria-label="Помощь по ларьку">
    <button type="button" data-action="kiosk-focus" data-preset="rack">Проекты</button>
    <a href="#about">Обо мне</a>
    <button type="button" data-action="contacts-card" aria-expanded="false" aria-controls="contact-card">Контакты</button>
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

// How to get around, on its own round button apart from the menu, so it is
// easy to find again.
export function renderGuideButton() {
  return '<button type="button" class="guide-button" data-action="kiosk-help"><b aria-hidden="true">?</b><span>Как тут ходить</span></button>';
}

// The card for someone who just walked up: three light steps in mouse or
// finger words, and what lies where.
export function renderGuide({ touch = false } = {}) {
  const steps = touch ? [
    ['Осмотрись', 'Веди пальцем по экрану — обойдёшь ларёк вокруг.'],
    ['Подойди', 'Нажми на любую вещь — подойдёшь ближе.'],
    ['Отойди', 'Нажми мимо или «Назад».']
  ] : [
    ['Осмотрись', 'Зажми мышку и тяни — обойдёшь ларёк вокруг.'],
    ['Подойди', 'Наведи на вещь — она подпишется. Нажми — подойдёшь ближе.'],
    ['Отойди', 'Нажми мимо или «Назад».']
  ];
  const where = [
    'диски на вертушке — проекты',
    'афиша наверху — обо мне',
    'листовка на ставне — как со мной связаться',
    'терминал — опыт и навыки, распечатаешь чек',
    'внутри — телевизор, радио и кот (его можно погладить)',
    'а где-то в снегу валяется чей-то телефон'
  ];
  return `<div class="kiosk-guide" role="dialog" aria-label="Как тут всё устроено">
    <h2>Как тут всё устроено</h2>
    <p class="kiosk-guide-lead">Это ларёк, только вместо чипсов и жвачки здесь мои работы. Всё, что видишь, можно трогать.</p>
    <ol class="kiosk-guide-steps">${steps.map(([what, how]) => `<li><b>${what}.</b> ${how}</li>`).join('')}</ol>
    <h3>Что где лежит</h3>
    <ul class="kiosk-guide-where">${where.map(line => `<li>${line}</li>`).join('')}</ul>
    <p class="kiosk-guide-menu">Лень искать — всё есть в меню внизу.</p>
    <button type="button" data-action="guide-close">Понятно, погнали</button>
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
