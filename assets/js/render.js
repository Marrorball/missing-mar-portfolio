import { filterProjects, selectFeaturedProjects } from './selectors.js';

const profileSceneOverlay = new URL('../media/y2k/hero-scene.webp', import.meta.url).href;

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
  const items = [{ id: 'all', title: 'Весь разрез' }, ...(categories || [])];
  return `<div class="strata-filters" aria-label="Фильтр проектов">
    ${items.map(category => `<button type="button" data-action="filter-projects" data-category-id="${escapeHtml(category.id)}" aria-pressed="${category.id === activeCategory}">${escapeHtml(category.title)}</button>`).join('')}
  </div>`;
}

function renderRoots() {
  const strands = Array.from({ length: 46 }, (_, index) => index * 2.2 + 1);
  const paths = strands.map((x, index) => {
    const drop = 18 + ((index * 29) % 64);
    const sway = (index % 2 === 0 ? 1 : -1) * (0.5 + (index % 3) * 0.4);
    const hair = index % 4 === 0
      ? `<path vector-effect="non-scaling-stroke" d="M${x + sway / 2} ${drop * 0.62} l${sway * 2} ${drop * 0.2}" />`
      : '';
    return `<path vector-effect="non-scaling-stroke" d="M${x} 0 C${x + sway} ${drop * 0.4}, ${x - sway} ${drop * 0.74}, ${x + sway / 2} ${drop}" />${hair}`;
  }).join('');
  return `<svg class="dig-roots" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
    fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" vector-effect="non-scaling-stroke">${paths}</svg>`;
}

/* Junk from the same era as the hero, buried between the finds. */
const ARTIFACTS = [
  { name: 'диск', svg: '<circle cx="32" cy="32" r="30" /><circle cx="32" cy="32" r="20" /><circle cx="32" cy="32" r="7" />' },
  { name: 'дискета', svg: '<rect x="4" y="4" width="56" height="56" rx="3" /><rect x="17" y="4" width="30" height="22" /><rect x="13" y="36" width="38" height="24" /><line x1="38" y1="8" x2="38" y2="22" />' },
  { name: 'червяк', svg: '<path d="M6 44c8-2 6-14 14-16s10 10 18 8 8-14 18-12" />' },
  { name: 'ключ', svg: '<circle cx="16" cy="26" r="10" /><path d="M24 32 L54 52" /><path d="M46 44 L40 52" /><path d="M52 49 L46 57" />' },
  { name: 'осколок', svg: '<path d="M10 52 L26 8 L44 24 L38 46 L54 56 Z" />' },
  { name: 'болт', svg: '<path d="M20 10 L44 10 L54 32 L44 54 L20 54 L10 32 Z" /><circle cx="32" cy="32" r="10" />' }
];

function renderArtifact(index) {
  const artifact = ARTIFACTS[index % ARTIFACTS.length];
  return `<svg class="find-artifact" viewBox="0 0 64 64" role="img" aria-label="${artifact.name}"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${artifact.svg}</svg>`;
}

function depthLabel(index) {
  return `−${(1.4 * (index + 1)).toFixed(1).replace('.', ',')}`;
}

function renderFind(project, index) {
  const cover = typeof project.cover === 'string' ? project.cover.trim() : '';
  const tools = (project.tags || []).slice(0, 4).join(' · ');
  return `<li class="find">
    <a class="find-link" href="#project/${encodeURIComponent(project.id)}" data-project-id="${escapeHtml(project.id)}">
      <p class="find-meta">
        <span class="find-depth">${depthLabel(index)} м</span>
        <span>${escapeHtml(project.year || '')}</span>
      </p>
      <div class="find-stone${cover ? ' has-photo' : ''}">
        <div class="find-stone-face">
          <div class="find-stone-copy">
            <div class="find-headline">
              <span class="find-index">${String(index + 1).padStart(2, '0')}</span>
              <h3 class="find-title">${escapeHtml(project.title)}</h3>
            </div>
            ${project.summary ? `<p class="find-summary">${escapeHtml(project.summary)}</p>` : ''}
            ${tools ? `<p class="find-tools">${escapeHtml(tools)}</p>` : ''}
            <span class="find-open">Раскопать <i class="ph ph-arrow-right" aria-hidden="true"></i></span>
          </div>
          ${cover ? `<img class="find-photo" src="${escapeHtml(cover)}" alt="" loading="lazy">` : ''}
        </div>
        <span class="find-tag" aria-hidden="true">№ ${String(index + 1).padStart(3, '0')}</span>
        <span class="find-soil" aria-hidden="true"></span>
      </div>
    </a>
    ${renderArtifact(index)}
  </li>`;
}

function renderDepthRail(count) {
  const ticks = Array.from({ length: count }, (_, index) => {
    const position = count === 1 ? 50 : (index / (count - 1)) * 100;
    return `<span class="depth-tick" style="top:${position.toFixed(2)}%">${depthLabel(index)}</span>`;
  }).join('');
  return `<div class="depth-rail" aria-hidden="true">
    <p class="depth-legend">ГЛУБИНА, М</p>
    <div class="depth-rail-line">
      ${ticks}
      <span class="depth-head" id="depth-head" style="top:0%"><strong>0,0</strong></span>
    </div>
  </div>`;
}

function renderBedrock(site = {}) {
  const contacts = site.contacts || {};
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email || '') ? contacts.email : '';
  const telegram = String(contacts.telegram || '').replace(/^@/, '');
  return `<section class="bedrock" aria-labelledby="bedrock-title">
    <p class="dig-eyebrow">МАТЕРИК / ДАЛЬШЕ ТОЛЬКО ЯДРО</p>
    <h2 id="bedrock-title">Глубже копать нечего. Напишите — достану что-нибудь ещё.</h2>
    <div class="bedrock-links">
      ${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : ''}
      ${/^[A-Za-z0-9_]{5,32}$/.test(telegram) ? `<a href="https://t.me/${escapeHtml(telegram)}" target="_blank" rel="noreferrer">@${escapeHtml(telegram)}</a>` : ''}
      <a href="#contact">Все контакты</a>
    </div>
    <p class="bedrock-note">${escapeHtml(site.owner?.location || '')} · ${escapeHtml(site.owner?.status || '')}</p>
  </section>`;
}

function renderProjectArchive(projects, categories, activeCategory, site) {
  const visible = filterProjects([...projects], activeCategory);
  return `<section class="dig" id="project-archive" aria-labelledby="archive-title">
    <div class="dig-cut" aria-hidden="true"></div>
    ${renderRoots()}
    <div class="dig-intro">
      <div>
        <p class="dig-eyebrow">РАЗРЕЗ / ${projects.length} НАХОДОК</p>
        <h2 id="archive-title">под травой</h2>
        <p class="dig-lede">Всё, что я успел сделать, лежит здесь слоями: чем глубже, тем дальше от поверхности. Нажмите на камень, чтобы его раскопать.</p>
      </div>
      ${renderCategoryFilters(categories, activeCategory)}
    </div>
    <div class="dig-body">
      ${renderDepthRail(Math.max(visible.length, 1))}
      ${visible.length
        ? `<ol class="finds" id="finds">${visible.map((project, index) => renderFind(project, index)).join('')}</ol>`
        : '<p class="finds-empty">В этом слое пока пусто.</p>'}
    </div>
    ${renderBedrock(site)}
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
      <img class="profile-scene-overlay" src="${profileSceneOverlay}" alt="" aria-hidden="true" width="2048" height="1457" fetchpriority="high" decoding="async">
      <div class="featured-selector">
        ${renderFeaturedProjects(featured, selectedId)}
        <a class="open-project-link" href="#project/${encodeURIComponent(selectedId)}">Открыть проект <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
      </div>
      <p class="hero-caption">DESIGNING DIGITAL EXPERIENCES<br>SINCE 2018</p>
    </section>
    ${renderProjectArchive(projects, categories, activeCategory, site)}
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

function stripLeadingEmoji(value = '') {
  return String(value).replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function renderSectionRail(sections = []) {
  if (sections.length < 2) return '';
  return `<nav class="case-rail" aria-label="Разделы проекта">
    <p class="case-rail-legend">РАЗДЕЛЫ</p>
    <ol>
      ${sections.map((section, index) => `<li><a href="#" data-action="scroll-to-section" data-section-id="${escapeHtml(section.id)}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(stripLeadingEmoji(section.label))}</a></li>`).join('')}
    </ol>
  </nav>`;
}

export function renderProjectView(project = {}, category = {}, neighbour = null) {
  const projectUrl = safeHttpsUrl(project.behance || '');
  const sections = project.sections || [];
  const cover = typeof project.cover === 'string' ? project.cover.trim() : '';

  return `<article class="portfolio-view project-view" data-view="project" data-project-id="${escapeHtml(project.id || '')}">
    <header class="case-header">
      <a class="back-link" href="#"><i class="ph ph-arrow-left" aria-hidden="true"></i>Обратно под траву</a>
      <p class="case-kicker">${escapeHtml(category.title || '')}${project.year ? ` · ${escapeHtml(project.year)}` : ''}</p>
      <h1>${escapeHtml(project.title || '')}</h1>
      ${project.summary ? `<p class="case-summary">${escapeHtml(project.summary)}</p>` : ''}
      <div class="case-header-foot">
        ${renderTags(project.tags)}
        ${projectUrl ? `<a class="external-project-link" href="${escapeHtml(projectUrl)}" target="_blank" rel="noreferrer">Смотреть на Behance <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>` : ''}
      </div>
    </header>

    ${cover ? `<figure class="case-cover"><img src="${escapeHtml(cover)}" alt="" loading="eager"></figure>` : ''}

    <div class="case-body">
      ${renderSectionRail(sections)}
      <div class="case-study-sections">
        ${sections.map((section, index) => `<section id="${escapeHtml(section.id)}" class="case-study-section">
          <div class="case-section-head">
            <p class="section-index">${String(index + 1).padStart(2, '0')}</p>
            <h2>${escapeHtml(stripLeadingEmoji(section.label || ''))}</h2>
          </div>
          <div class="rich-content">${section.content || ''}</div>
        </section>`).join('')}
      </div>
    </div>

    ${neighbour ? `<a class="case-next" href="#project/${encodeURIComponent(neighbour.id)}">
      <span class="case-next-label">Следующая находка</span>
      <span class="case-next-title">${escapeHtml(neighbour.title)}</span>
      <i class="ph ph-arrow-right" aria-hidden="true"></i>
    </a>` : ''}
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
      ${page.content ? '' : `<p class="view-summary">${escapeHtml(owner.bio || '')}</p>`}
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
