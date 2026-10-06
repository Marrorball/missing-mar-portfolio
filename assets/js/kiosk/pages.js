// HTML of the pages that live on objects in the scene. Owner-authored rich
// content (case sections, page bodies) is trusted and inserted as is; every
// other value is escaped.
import { escapeHtml } from '../render.js';
import { channelNumber } from './channels.js';

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

export function renderTvChannel(project = {}, { index = 0, category = '' } = {}) {
  const tags = (project.tags || []).map(tag => `<li>${escapeHtml(tag)}</li>`).join('');
  const behance = httpsUrl(project.behance);
  const cover = typeof project.cover === 'string' ? project.cover.trim() : '';
  return `<article class="tv-page" data-channel="${escapeHtml(project.id || '')}">
    <p class="tv-osd">КАНАЛ ${channelNumber(index)}</p>
    <header class="tv-head">
      <p class="tv-kicker">${meta(category, project.year)}</p>
      <h1>${escapeHtml(project.title || '')}</h1>
      ${project.summary ? `<p class="tv-summary">${escapeHtml(project.summary)}</p>` : ''}
      ${tags ? `<ul class="tv-tags">${tags}</ul>` : ''}
      ${behance ? `<a class="tv-link" href="${escapeHtml(behance)}" target="_blank" rel="noreferrer">Смотреть на Behance ↗</a>` : ''}
    </header>
    ${cover ? `<img class="tv-cover" src="${escapeHtml(cover)}" alt="">` : ''}
    ${(project.sections || []).map(section => `<section class="tv-section">
      <h2>${escapeHtml(plainLabel(section.label || ''))}</h2>
      <div class="rich-content">${section.content || ''}</div>
    </section>`).join('')}
  </article>`;
}

export function renderTvGuide(projects = [], categories = []) {
  const categoryTitle = id => categories.find(category => category.id === id)?.title || '';
  return `<article class="tv-page tv-guide">
    <p class="tv-osd">ТЕЛЕПРОГРАММА</p>
    <h1>Сегодня в эфире</h1>
    <ol class="tv-guide-list">
      ${projects.map((project, index) => `<li><a href="#project/${encodeURIComponent(project.id)}">
        <span class="tv-guide-number">${channelNumber(index)}</span>
        <span>${escapeHtml(project.title || '')}</span>
        <small>${meta(categoryTitle(project.category), project.year)}</small>
      </a></li>`).join('')}
    </ol>
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

export function renderAboutBoard(site = {}, resume = {}, page = {}) {
  const owner = site.owner || {};
  return `<article class="board-page">
    ${boardTabs('about')}
    <div class="board-about">
      ${owner.profileImage ? `<img src="${escapeHtml(owner.profileImage)}" alt="${escapeHtml(owner.name || '')}">` : ''}
      <div>
        <h1>${escapeHtml(owner.name || page.title || 'Обо мне')}</h1>
        <p class="board-role">${meta(owner.role, owner.location)}</p>
        ${page.content ? `<div class="rich-content">${page.content}</div>` : `<p>${escapeHtml(owner.bio || '')}</p>`}
        ${owner.status ? `<p class="board-status">${escapeHtml(owner.status)}</p>` : ''}
      </div>
    </div>
    ${resumeBlocks(resume)}
  </article>`;
}

export function renderPriceBoard() {
  return `<article class="board-page">
    ${boardTabs('price')}
    <h1>Прайс</h1>
    <p>Скоро здесь будет прайс на услуги.</p>
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
    <p class="terminal-step">Шаг 1 из 1</p>
    <h1>Связаться с Маратом</h1>
    <div class="terminal-buttons">
      ${links.map(link => `<a class="terminal-button" href="${escapeHtml(link.href)}"${externalAttrs(link)}>
        <span>${escapeHtml(link.label)}</span><small>${escapeHtml(link.value)}</small>
      </a>`).join('')}
    </div>
    <p class="terminal-note">Комиссия 0%. Сдачу не выдаём.</p>
  </article>`;
}

export function renderFlyer(links = [], owner = {}) {
  return `<article class="flyer-page">
    <h1>ПРОПАЛ ДИЗАЙНЕР</h1>
    ${owner.profileImage ? `<img src="${escapeHtml(owner.profileImage)}" alt="${escapeHtml(owner.name || '')}">` : ''}
    <p class="flyer-name">${escapeHtml(owner.name || '')}</p>
    <p>${meta(owner.role, owner.location)}</p>
    <p class="flyer-ask">Нашедшего просьба написать:</p>
    <ul class="flyer-contacts">
      ${links.map(link => `<li><a href="${escapeHtml(link.href)}"${externalAttrs(link)}>${escapeHtml(link.label)}: ${escapeHtml(link.value)}</a></li>`).join('')}
    </ul>
    <div class="flyer-tabs" aria-label="Оторвать контакт">
      ${links.map(link => `<button type="button" data-action="copy-contact" data-value="${escapeHtml(link.value)}">${escapeHtml(link.value)}</button>`).join('')}
    </div>
  </article>`;
}
