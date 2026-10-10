// HTML of the pages that live on objects in the scene. Owner-authored rich
// content (case sections, page bodies) is trusted and inserted as is; every
// other value is escaped.
import { escapeHtml } from '../render.js';
import { channelNumber } from './channels.js';
import { tearOffLines } from './paper.js';

function httpsUrl(value = '') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function plainLabel(label = '') {
  return label.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function meta(...parts) {
  return escapeHtml(parts.filter(Boolean).join(' · '));
}

function externalAttrs(link) {
  return link.kind === 'email' ? '' : ' target="_blank" rel="noreferrer"';
}

const EMOJI = /\p{Extended_Pictographic}\uFE0F?/gu;

// The owner's case HTML as it plays on the TV: emoji (a web habit) dropped,
// every picture a frame of tape with a VHS timecode in the corner.
function onTape(html = '', scene = 1) {
  let shot = 0;
  return html.replace(EMOJI, '').replace(/<img\b[^>]*>/g, image => {
    shot += 1;
    const seconds = String((shot * 17) % 60).padStart(2, '0');
    return `<span class="tv-frame">${image}<span class="tv-frame-osd" aria-hidden="true">▶\uFE0E 00:${String(scene).padStart(2, '0')}:${seconds} SP</span></span>`;
  });
}

// A DVD title menu on the CRT: the project is the film, its case sections
// are the scenes, picked from the chapter list like on a pirate disc.
export function renderTvChannel(project = {}, { index = 0, category = '' } = {}) {
  const tags = (project.tags || []).map(tag => `<li>${escapeHtml(tag)}</li>`).join('');
  const behance = httpsUrl(project.behance);
  const cover = typeof project.cover === 'string' ? project.cover.trim() : '';
  const sections = project.sections || [];
  const chapters = sections.map((section, number) => `<li><button type="button" data-action="tv-chapter" data-chapter="${number + 1}">
        <span>${number + 1}</span>${escapeHtml(plainLabel(section.label || ''))}
      </button></li>`).join('');
  return `<article class="tv-page" data-channel="${escapeHtml(project.id || '')}">
    <header class="tv-osd"><span>КАНАЛ ${channelNumber(index)}</span><span class="tv-osd-play">▶\uFE0E ВОСПР.</span></header>
    <div class="tv-title">
      <p class="tv-kicker">${meta(category, project.year)}</p>
      <h1>${escapeHtml(project.title || '')}</h1>
      ${project.summary ? `<p class="tv-summary">${escapeHtml(project.summary)}</p>` : ''}
    </div>
    ${chapters ? `<nav class="tv-chapters" aria-label="Сцены"><p>Выбор сцены</p><ol>${chapters}</ol></nav>` : ''}
    ${tags ? `<ul class="tv-tags">${tags}</ul>` : ''}
    ${behance ? `<a class="tv-link" href="${escapeHtml(behance)}" target="_blank" rel="noreferrer">▶\uFE0E Смотреть на Behance ↗\uFE0E</a>` : ''}
    ${cover ? `<img class="tv-cover" src="${escapeHtml(cover)}" alt="">` : ''}
    ${sections.map((section, number) => `<section class="tv-section" data-chapter-section="${number + 1}">
      <p class="tv-scene">Сцена ${number + 1}</p>
      <h2>${escapeHtml(plainLabel(section.label || ''))}</h2>
      <div class="rich-content">${onTape(section.content, number + 1)}</div>
    </section>`).join('')}
    <footer class="tv-end">
      <p class="tv-end-title">Конец</p>
      <p>CH+ — следующий канал · МЕНЮ — телепрограмма</p>
    </footer>
  </article>`;
}

// Teletext page 100: the channel list, with the four coloured keys.
export function renderTvGuide(projects = [], categories = []) {
  const categoryTitle = id => categories.find(category => category.id === id)?.title || '';
  const first = projects[0];
  return `<article class="ttx">
    <header class="ttx-head"><span>P100</span><span class="ttx-yellow-text">ТЕЛЕТЕКСТ</span><span class="ttx-cyan-text">ДИЗАЙН У МАРА</span></header>
    <h1>ТЕЛЕПРОГРАММА</h1>
    <p class="ttx-sub">Сегодня в эфире · выбери канал</p>
    <ol class="ttx-list">
      ${projects.map((project, index) => `<li><a href="#project/${encodeURIComponent(project.id)}">
        <span class="ttx-num">${channelNumber(index)}</span>
        <span class="ttx-name">${escapeHtml(project.title || '')}</span>
        <small class="ttx-meta">${meta(categoryTitle(project.category), project.year)}</small>
      </a></li>`).join('')}
    </ol>
    <nav class="ttx-keys" aria-label="Быстрые кнопки">
      <a class="ttx-red" href="#about">Обо мне</a>
      <a class="ttx-green" href="#contact">Контакты</a>
      ${first ? `<a class="ttx-yellow" href="#project/${encodeURIComponent(first.id)}">Канал ${channelNumber(0)}</a>` : ''}
    </nav>
  </article>`;
}

function boardTabs(active) {
  return `<nav class="board-tabs" aria-label="Билборд">
    <a href="#about"${active === 'about' ? ' aria-current="page"' : ''}>Обо мне</a>
  </nav>`;
}

// A printed street poster: halftone photo, condensed headline, red stamp.
export function renderAboutBoard(site = {}, page = {}) {
  const owner = site.owner || {};
  return `<article class="board-page">
    ${boardTabs('about')}
    <div class="board-hero">
      ${owner.profileImage ? `<figure class="board-photo"><img src="${escapeHtml(owner.profileImage)}" alt="${escapeHtml(owner.name || '')}"></figure>` : ''}
      <div class="board-head">
        <h1>${escapeHtml(owner.name || page.title || 'Обо мне')}</h1>
        <p class="board-role">${meta(owner.role, owner.location)}</p>
        ${page.content ? `<div class="rich-content">${page.content}</div>` : `<p>${escapeHtml(owner.bio || '')}</p>`}
        ${owner.status ? `<p class="board-status">${escapeHtml(owner.status)}</p>` : ''}
        <p class="board-more"><a href="#resume">Опыт и навыки — выписка в терминале →</a></p>
      </div>
      <p class="board-stamp" aria-hidden="true">Открыт к<br>предложениям</p>
    </div>
  </article>`;
}

export function renderPageBoard(page = {}) {
  return `<article class="board-page">
    ${boardTabs('')}
    <h1>${escapeHtml(page.title || '')}</h1>
    <div class="rich-content">${page.content || ''}</div>
  </article>`;
}

const RECEIPT_TOTAL = 'Открыт к предложениям';

function receiptDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function terminalFoot() {
  return `<footer class="terminal-foot">
      <button type="button" class="terminal-key" data-action="kiosk-back">◀︎ Назад</button>
      <p class="terminal-note">Комиссия 0%. Сдачу не выдаём.</p>
    </footer>`;
}

// The résumé as titled rows, shared by the terminal's screen and its receipt.
function resumeRows(resume = {}) {
  const line = (bold, text, small = '') => `<p><b>${escapeHtml(bold)}</b> ${escapeHtml(text)}${small ? `<br><small>${escapeHtml(small)}</small>` : ''}</p>`;
  return [
    ['Опыт', (resume.experience || []).map(item => line(item.period || '', `${item.company || ''} · ${item.role || ''}`, item.description))],
    ['Умею', (resume.skills || []).map(item => line(item.name || '', '', item.level))],
    ['Инструменты', resume.tools?.length ? [`<p>${resume.tools.map(escapeHtml).join(' · ')}</p>`] : []],
    ['Образование', (resume.education || []).map(item => line(item.period || '', item.institution || '', item.program))],
    ['Публикации', (resume.publications || []).map(item => line(item.year || '', '', item.title))],
    ['О себе', resume.about ? [`<p><small>${escapeHtml(resume.about)}</small></p>`] : []]
  ].filter(([, rows]) => rows.length);
}

// The terminal opens on the résumé to read; printing it is the key below.
export function renderResumeScreen(site = {}, resume = {}) {
  const owner = site.owner || {};
  const city = String(owner.location || '').split(',')[0].trim();
  return `<article class="terminal-page terminal-resume">
    <header class="terminal-bar"><span>Дизайн у Марата</span><span>Опыт и навыки</span></header>
    <h1>${escapeHtml(owner.name || '')}</h1>
    <p class="terminal-lead">${escapeHtml([owner.role, city].filter(Boolean).join(' · '))}</p>
    ${resumeRows(resume).map(([title, rows]) => `<section class="resume-block"><h2>${title}</h2>${rows.join('')}</section>`).join('')}
    <div class="terminal-actions">
      <button type="button" class="terminal-button" data-action="terminal-print">Распечатать чек</button>
    </div>
    ${terminalFoot()}
  </article>`;
}

// While the receipt prints, the screen points down at the slot.
export function renderPrinting() {
  return `<article class="terminal-page terminal-printing">
    <header class="terminal-bar"><span>Дизайн у Марата</span><span>Опыт и навыки</span></header>
    <p class="printing-now">Печатаем<span aria-hidden="true">…</span></p>
    <p class="printing-take">Возьмите чек ↓</p>
  </article>`;
}

// The résumé as a till receipt: everything on it comes from the content.
export function renderReceipt(site = {}, resume = {}, { number = 1, date = new Date(), fresh = true } = {}) {
  const owner = site.owner || {};
  const city = String(owner.location || '').split(',')[0].trim();
  return `<div class="receipt${fresh ? '' : ' is-kept'}">
        <p class="receipt-head">Терминал «Дизайн у Марата»</p>
        <p class="receipt-line"><span>Выписка № ${String(number).padStart(6, '0')}</span><span>${receiptDate(date)}</span></p>
        <h1>${escapeHtml(owner.name || '')}</h1>
        <p class="receipt-role">${escapeHtml([owner.role, city].filter(Boolean).join(' · '))}</p>
        ${resumeRows(resume).map(([title, rows]) => `<section class="receipt-block"><h2>${title}</h2>${rows.join('')}</section>`).join('')}
        <p class="receipt-total"><span>Итого:</span><b>${RECEIPT_TOTAL}</b></p>
        <p class="receipt-thanks">Спасибо! Сохраняйте чек</p>
        <p class="receipt-barcode" aria-hidden="true"></p>
      </div>`;
}

// Same layout as the sheet painted on the shutter (paper.js), so the page
// lands on it without a jump.
export function renderFlyer(links = [], owner = {}) {
  return `<article class="flyer-page">
    <span class="flyer-tape flyer-tape-left" aria-hidden="true"></span>
    <span class="flyer-tape flyer-tape-right" aria-hidden="true"></span>
    <h1>ПРОПАЛ ДИЗАЙНЕР</h1>
    ${owner.profileImage ? `<img src="${escapeHtml(owner.profileImage)}" alt="${escapeHtml(owner.name || '')}">` : '<span class="flyer-photo" aria-hidden="true"></span>'}
    <p class="flyer-name">${escapeHtml(owner.name || '')}</p>
    <p class="flyer-role">${meta(owner.role, owner.location)}</p>
    <p class="flyer-ask">Нашедшего просьба написать:</p>
    <ul class="flyer-contacts">
      ${links.map(link => `<li><a href="${escapeHtml(link.href)}"${externalAttrs(link)}>${escapeHtml(link.label)}: ${escapeHtml(link.value)}</a></li>`).join('')}
    </ul>
    <div class="flyer-tabs" aria-label="Открыть контакт">
      ${links.map(link => `<a href="${escapeHtml(link.href)}"${externalAttrs(link)} aria-label="Открыть ${escapeHtml(link.label)}: ${escapeHtml(link.value)}">${tearOffLines(link.value).map(line => `<span>${escapeHtml(line)}</span>`).join('')}</a>`).join('')}
    </div>
  </article>`;
}
