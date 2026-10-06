// HTML of the pages that live on objects in the scene. Owner-authored rich
// content (case sections, page bodies) is trusted and inserted as is; every
// other value is escaped.
import { escapeHtml } from '../render.js';
import { channelNumber } from './channels.js';
import { PRICE_ROWS, tearOffLines } from './paper.js';

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
    <header class="tv-osd"><span>КАНАЛ ${channelNumber(index)}</span><span class="tv-osd-play">▶ ВОСПР.</span></header>
    <div class="tv-title">
      <p class="tv-kicker">${meta(category, project.year)}</p>
      <h1>${escapeHtml(project.title || '')}</h1>
      ${project.summary ? `<p class="tv-summary">${escapeHtml(project.summary)}</p>` : ''}
    </div>
    ${chapters ? `<nav class="tv-chapters" aria-label="Сцены"><p>Выбор сцены</p><ol>${chapters}</ol></nav>` : ''}
    ${tags ? `<ul class="tv-tags">${tags}</ul>` : ''}
    ${behance ? `<a class="tv-link" href="${escapeHtml(behance)}" target="_blank" rel="noreferrer">▶ Смотреть на Behance ↗</a>` : ''}
    ${cover ? `<img class="tv-cover" src="${escapeHtml(cover)}" alt="">` : ''}
    ${sections.map((section, number) => `<section class="tv-section" data-chapter-section="${number + 1}">
      <p class="tv-scene">Сцена ${number + 1}</p>
      <h2>${escapeHtml(plainLabel(section.label || ''))}</h2>
      <div class="rich-content">${section.content || ''}</div>
    </section>`).join('')}
    <p class="tv-end">Конец · CH+ — следующий канал</p>
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
      <a class="ttx-green" href="#price">Прайс</a>
      <a class="ttx-yellow" href="#contact">Контакты</a>
      ${first ? `<a class="ttx-blue" href="#project/${encodeURIComponent(first.id)}">Канал ${channelNumber(0)}</a>` : ''}
    </nav>
  </article>`;
}

function boardTabs(active) {
  return `<nav class="board-tabs" aria-label="Билборд">
    <a href="#about"${active === 'about' ? ' aria-current="page"' : ''}>Обо мне</a>
    <a href="#price"${active === 'price' ? ' aria-current="page"' : ''}>Прайс</a>
  </nav>`;
}

function resumeBlocks(resume = {}) {
  const experience = (resume.experience || []).map(item => `<article>
    <p><small>${escapeHtml(item.period || '')}</small></p>
    <h3>${escapeHtml(item.company || '')}</h3>
    <p><strong>${escapeHtml(item.role || '')}</strong> ${escapeHtml(item.description || '')}</p>
  </article>`).join('');
  const education = (resume.education || []).map(item => `<article>
    <p><small>${escapeHtml(item.period || '')}</small></p>
    <h3>${escapeHtml(item.institution || '')}</h3>
    <p><strong>${escapeHtml(item.program || '')}</strong> ${escapeHtml(item.description || '')}</p>
  </article>`).join('');
  const skills = (resume.skills || []).map(item => `<li><strong>${escapeHtml(item.name || '')}</strong> ${escapeHtml(item.level || '')}</li>`).join('');
  const tools = (resume.tools || []).map(tool => `<li>${escapeHtml(tool)}</li>`).join('');
  const blocks = [
    experience && `<section><h2>Опыт</h2>${experience}</section>`,
    education && `<section><h2>Образование</h2>${education}</section>`,
    skills && `<section><h2>Навыки</h2><ul>${skills}</ul></section>`,
    tools && `<section><h2>Инструменты</h2><ul>${tools}</ul></section>`
  ].filter(Boolean).join('');
  return blocks ? `<div class="board-resume">${blocks}</div>` : '';
}

// A printed street poster: halftone photo, condensed headline, red stamp.
export function renderAboutBoard(site = {}, resume = {}, page = {}) {
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
      </div>
      <p class="board-stamp" aria-hidden="true">Ищу<br>работу</p>
    </div>
    ${resumeBlocks(resume)}
  </article>`;
}

export function renderPageBoard(page = {}) {
  return `<article class="board-page">
    ${boardTabs('')}
    <h1>${escapeHtml(page.title || '')}</h1>
    <div class="rich-content">${page.content || ''}</div>
  </article>`;
}

export function renderTerminalScreen(links = []) {
  return `<article class="terminal-page">
    <header class="terminal-bar"><span>Оплата услуг</span><span>Шаг 1 из 1</span></header>
    <h1>Связаться с Маратом</h1>
    <p class="terminal-lead">Выберите способ связи</p>
    <div class="terminal-buttons">
      ${links.map(link => `<a class="terminal-button" href="${escapeHtml(link.href)}"${externalAttrs(link)}>
        <span>${escapeHtml(link.label)}</span><small>${escapeHtml(link.value)}</small>
      </a>`).join('')}
    </div>
    <footer class="terminal-foot">
      <button type="button" class="terminal-key" data-action="kiosk-back">◀ Назад</button>
      <p class="terminal-note">Комиссия 0%. Сдачу не выдаём.</p>
    </footer>
  </article>`;
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
    <div class="flyer-tabs" aria-label="Оторвать контакт">
      ${links.map(link => `<button type="button" data-action="copy-contact" data-value="${escapeHtml(link.value)}" aria-label="Скопировать ${escapeHtml(link.value)}">${tearOffLines(link.value).map(line => `<span>${escapeHtml(line)}</span>`).join('')}</button>`).join('')}
    </div>
  </article>`;
}

// The price list taped to the right shutter, printed with blanks until there
// are prices to put in (same layout as drawPriceSheet in paper.js).
export function renderPriceSheet() {
  const blank = '<li><span class="price-item"></span><span class="price-dots"></span><b>— ₽</b></li>';
  return `<article class="price-sheet">
    <span class="flyer-tape flyer-tape-left" aria-hidden="true"></span>
    <span class="flyer-tape flyer-tape-right" aria-hidden="true"></span>
    <h1>Прайс</h1>
    <p class="price-sheet-bar">Дизайн у Мара · услуги</p>
    <ul class="price-sheet-rows" aria-hidden="true">${blank.repeat(PRICE_ROWS)}</ul>
    <p class="price-sheet-note"><span>Скоро здесь будет</span> <span>прайс на услуги.</span></p>
    <a class="price-sheet-about" href="#about">Обо мне — на щите за ларьком</a>
  </article>`;
}
