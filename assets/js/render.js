import { filterProjects, selectFeaturedProjects } from './selectors.js';

const profileSceneOverlay = new URL('../media/y2k/profile-scene-reference-overlay.png', import.meta.url).href;

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function routeForPage(page) {
  if (page.id === 'about' || page.id === 'contact') return `#${page.id}`;
  return `#page/${encodeURIComponent(page.id)}`;
}

function navigationPages(pages = []) {
  return pages
    .filter(page => page.published !== false && page.showInNavigation !== false)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

export function renderHeader(site = {}, pages = []) {
  const visiblePages = navigationPages(pages);
  const primaryPages = visiblePages.slice(0, 2);
  const owner = site.owner || {};

  return `<div class="site-header-inner">
    <a class="header-mark" href="#" aria-label="${escapeHtml(owner.brandName || 'На главную')}"><i class="ph ph-asterisk" aria-hidden="true"></i></a>
    <span class="header-rule" aria-hidden="true"></span>
    <nav class="primary-navigation" aria-label="Основная навигация">
      <a href="#" data-action="show-projects"><i class="ph ph-star-four" aria-hidden="true"></i>Проекты</a>
      ${primaryPages.map(page => `<a href="${routeForPage(page)}">${escapeHtml(page.title)}</a>`).join('')}
    </nav>
    <details class="page-menu">
      <summary aria-label="Все страницы"><i class="ph ph-dots-nine" aria-hidden="true"></i><span class="sr-only">Меню</span></summary>
      <nav class="page-menu-panel" aria-label="Все страницы портфолио">
        ${visiblePages.map(page => `<a href="${routeForPage(page)}" data-page-id="${escapeHtml(page.id)}">${escapeHtml(page.title)}</a>`).join('')}
      </nav>
    </details>
  </div>`;
}

function renderIdentity(owner = {}) {
  return `<div class="hero-identity">
    <div class="identity-line">
      <h1>${escapeHtml(owner.brandName || '')}</h1>
      ${owner.name ? `<span class="owner-name">/ ${escapeHtml(owner.name)}</span>` : ''}
    </div>
    ${owner.role ? `<p class="owner-role"><span aria-hidden="true"></span>${escapeHtml(owner.role)}</p>` : ''}
  </div>`;
}

function renderProfileMonument(owner = {}) {
  const cardImage = owner.profileCardImage || owner.profileImage || '';
  return `<div class="profile-monument" aria-hidden="true">
    <img class="profile-monument-art" src="${escapeHtml(cardImage)}" alt="" loading="eager">
  </div>`;
}

function renderFeaturedProjects(projects, activeProjectId) {
  return `<div class="featured-list" id="featured-list" aria-label="Избранные проекты">
    ${projects.map((project, index) => `<button class="featured-project${project.id === activeProjectId ? ' is-active' : ''}" type="button" data-action="select-featured" data-project-id="${escapeHtml(project.id)}" aria-pressed="${project.id === activeProjectId}">
      <span class="featured-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="featured-title">${escapeHtml(project.shortLabel || project.title)}</span>
      <i class="featured-indicator ph ph-star-four" aria-hidden="true"></i>
    </button>`).join('')}
  </div>`;
}

function renderCategoryFilters(categories, activeCategory) {
  const items = [{ id: 'all', title: 'Все' }, ...(categories || [])];
  return `<div class="archive-filters" aria-label="Фильтр проектов">
    ${items.map(category => `<button type="button" data-action="filter-projects" data-category-id="${escapeHtml(category.id)}" aria-pressed="${category.id === activeCategory}">${escapeHtml(category.title)}</button>`).join('')}
  </div>`;
}

function renderProjectArchive(projects, categories, activeCategory) {
  const visibleProjects = filterProjects(projects, activeCategory);
  return `<section class="project-archive" id="project-archive" aria-labelledby="archive-title">
    <div class="archive-heading">
      <div>
        <p class="eyebrow">INDEX / SELECTED &amp; OTHER WORK</p>
        <h2 id="archive-title">Все проекты — ${projects.length}</h2>
      </div>
      ${renderCategoryFilters(categories, activeCategory)}
    </div>
    <ol class="archive-list">
      ${visibleProjects.map((project, index) => `<li>
        <a href="#project/${encodeURIComponent(project.id)}" data-project-id="${escapeHtml(project.id)}">
          <span class="archive-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="archive-project-copy"><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.summary || '')}</small></span>
          <span class="archive-project-meta">${escapeHtml([project.year, project.status].filter(Boolean).join(' · '))}</span>
        </a>
      </li>`).join('')}
    </ol>
  </section>`;
}

export function renderHome({
  site = {},
  pages = [],
  projects = [],
  categories = [],
  activeProjectId = '',
  activeCategory = 'all'
} = {}) {
  const featured = selectFeaturedProjects(projects, 3);
  const selectedId = activeProjectId || featured[0]?.id || '';
  const owner = site.owner || {};

  return `<div data-view="home">
    <section class="landscape-hero" aria-labelledby="portfolio-title">
      ${renderIdentity(owner).replace('<h1>', '<h1 id="portfolio-title">')}
      <img class="profile-scene-overlay" src="${profileSceneOverlay}" alt="" aria-hidden="true" loading="eager">
      ${renderProfileMonument(owner)}
      <div class="featured-selector">
        ${renderFeaturedProjects(featured, selectedId)}
        <a class="open-project-link" href="#project/${encodeURIComponent(selectedId)}">Открыть проект <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
      </div>
      <p class="hero-caption">DESIGNING DIGITAL EXPERIENCES<br>SINCE 2018</p>
    </section>
    ${renderProjectArchive(projects, categories, activeCategory)}
  </div>`;
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function renderTags(tags = []) {
  return tags.length
    ? `<ul class="tag-list">${tags.map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`
    : '';
}

export function renderProjectView(project = {}, category = {}) {
  const projectUrl = safeHttpsUrl(project.behance || '');
  return `<article class="portfolio-view project-view" data-view="project" data-project-id="${escapeHtml(project.id || '')}">
    <header class="view-header">
      <a class="back-link" href="#"><i class="ph ph-arrow-left" aria-hidden="true"></i>Все проекты</a>
      <p>${escapeHtml(category.title || '')}${project.year ? ` · ${escapeHtml(project.year)}` : ''}</p>
      <h1>${escapeHtml(project.title || '')}</h1>
      ${project.summary ? `<p class="view-summary">${escapeHtml(project.summary)}</p>` : ''}
      ${renderTags(project.tags)}
      ${projectUrl ? `<a class="external-project-link" href="${escapeHtml(projectUrl)}" target="_blank" rel="noreferrer">Открыть исходный проект <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>` : ''}
    </header>
    <div class="case-study-sections">
      ${(project.sections || []).map((section, index) => `<section id="${escapeHtml(section.id)}" class="case-study-section">
        <p class="section-index">${String(index + 1).padStart(2, '0')}</p>
        <h2>${escapeHtml(section.label || '')}</h2>
        <div class="rich-content">${section.content || ''}</div>
      </section>`).join('')}
    </div>
  </article>`;
}

function renderResume(resume = {}) {
  const experience = (resume.experience || []).map(item => `<article class="resume-item"><p>${escapeHtml(item.period || '')}</p><h3>${escapeHtml(item.company || '')}</h3><strong>${escapeHtml(item.role || '')}</strong><span>${escapeHtml(item.description || '')}</span></article>`).join('');
  const education = (resume.education || []).map(item => `<article class="resume-item"><p>${escapeHtml(item.period || '')}</p><h3>${escapeHtml(item.institution || '')}</h3><strong>${escapeHtml(item.program || '')}</strong><span>${escapeHtml(item.description || '')}</span></article>`).join('');
  const skills = (resume.skills || []).map(item => `<li><strong>${escapeHtml(item.name || '')}</strong><span>${escapeHtml(item.level || '')}</span></li>`).join('');
  const tools = (resume.tools || []).map(tool => `<li>${escapeHtml(tool)}</li>`).join('');
  return `<div class="resume-grid">
    ${experience ? `<section><h2>Опыт</h2>${experience}</section>` : ''}
    ${education ? `<section><h2>Образование</h2>${education}</section>` : ''}
    ${skills ? `<section><h2>Навыки</h2><ul class="skill-list">${skills}</ul></section>` : ''}
    ${tools ? `<section><h2>Инструменты</h2><ul class="tool-list">${tools}</ul></section>` : ''}
  </div>`;
}

export function renderAboutView(site = {}, resume = {}, page = {}) {
  const owner = site.owner || {};
  return `<article class="portfolio-view about-view" data-view="about">
    <header class="view-header">
      <a class="back-link" href="#"><i class="ph ph-arrow-left" aria-hidden="true"></i>На главную</a>
      <p>PROFILE / ${escapeHtml(owner.location || '')}</p>
      <h1>${escapeHtml(page.title || 'Обо мне')}</h1>
      <p class="view-summary">${escapeHtml(owner.bio || '')}</p>
    </header>
    <div class="about-layout">
      ${owner.profileImage ? `<img src="${escapeHtml(owner.profileImage)}" alt="${escapeHtml(owner.name || '')}">` : ''}
      <div class="rich-content">${page.content || ''}</div>
    </div>
    ${renderResume(resume)}
  </article>`;
}

export function renderContactView(site = {}) {
  const owner = site.owner || {};
  const contacts = site.contacts || {};
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email || '') ? contacts.email : '';
  const telegram = String(contacts.telegram || '').replace(/^@/, '');
  const telegramUrl = /^[A-Za-z0-9_]{5,32}$/.test(telegram) ? `https://t.me/${telegram}` : '';
  const behanceUrl = safeHttpsUrl(contacts.behance || '');
  return `<article class="portfolio-view contact-view" data-view="contact">
    <header class="view-header">
      <a class="back-link" href="#"><i class="ph ph-arrow-left" aria-hidden="true"></i>На главную</a>
      <p>CONTACT / AVAILABLE FOR PROJECTS</p>
      <h1>Давайте делать странные, понятные вещи.</h1>
      <p class="view-summary">${escapeHtml(owner.name || '')} — ${escapeHtml(owner.role || '')}</p>
    </header>
    <div class="contact-links">
      ${email ? `<a href="mailto:${escapeHtml(email)}"><small>Email</small>${escapeHtml(email)}</a>` : ''}
      ${telegramUrl ? `<a href="${escapeHtml(telegramUrl)}" target="_blank" rel="noreferrer"><small>Telegram</small>@${escapeHtml(telegram)}</a>` : ''}
      ${behanceUrl ? `<a href="${escapeHtml(behanceUrl)}" target="_blank" rel="noreferrer"><small>Behance</small>${escapeHtml(behanceUrl.replace(/^https?:\/\//, ''))}</a>` : ''}
    </div>
  </article>`;
}

export function renderGenericPageView(page = {}) {
  return `<article class="portfolio-view generic-page-view" data-view="page" data-page-id="${escapeHtml(page.id || '')}">
    <header class="view-header">
      <a class="back-link" href="#"><i class="ph ph-arrow-left" aria-hidden="true"></i>На главную</a>
      <p>PAGE / ${escapeHtml(page.id || '')}</p>
      <h1>${escapeHtml(page.title || '')}</h1>
    </header>
    <div class="rich-content">${page.content || ''}</div>
  </article>`;
}

export function renderLoadError(message) {
  return `<div class="load-error" role="alert"><strong>Не удалось загрузить портфолио</strong><p>${escapeHtml(message)}</p><a href="">Попробовать снова</a></div>`;
}
