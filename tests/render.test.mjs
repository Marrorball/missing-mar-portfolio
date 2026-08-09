import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderAboutView,
  renderContactView,
  renderGenericPageView,
  renderHeader,
  renderHome,
  renderProjectView
} from '../assets/js/render.js';

const bundle = {
  site: {
    owner: {
      brandName: 'missing mar',
      name: 'Марат Дреев',
      role: 'Product & Visual Designer',
      profileImage: '/missing-mar-portfolio/assets/media/profile/missing-mar-profile.jpg',
      profileCardImage: '/missing-mar-portfolio/assets/media/profile/missing-mar-profile-monument-v1.webp',
      cardTitle: "WHERE'S\nMISSING MAR?",
      cardTagline: 'I DESIGN CLEAR SYSTEMS\nWITH A STRANGE EDGE.',
      cardMeta: 'МОСКВА · 2026',
      cardAction: 'ОБО МНЕ ↗'
    },
    contacts: {
      email: 'marrorball@gmail.com',
      telegram: 'marrorball',
      behance: 'https://www.behance.net/marmaraj11'
    },
    categories: [
      { id: 'uxui', title: 'UX/UI проекты', order: 10 },
      { id: 'graphic', title: 'Графический дизайн', order: 20 }
    ]
  },
  pages: [
    { id: 'about', title: 'Обо мне', order: 10, published: true, showInNavigation: true, content: '<p>Привет</p>' },
    { id: 'contact', title: 'Контакт', order: 20, published: true, showInNavigation: true, content: '' },
    { id: 'press', title: 'Пресса', order: 30, published: true, showInNavigation: true, content: '<p>Материал</p>' }
  ]
};

test('renders the approved identity, three featured projects, and complete archive', () => {
  const html = renderHome({
    site: bundle.site,
    pages: bundle.pages,
    projects: [
      { id: 'a', title: 'A', shortLabel: 'A', featured: true, featuredOrder: 10, category: 'uxui', sections: [] },
      { id: 'b', title: 'B', shortLabel: 'B', featured: true, featuredOrder: 20, category: 'uxui', sections: [] },
      { id: 'c', title: 'C', shortLabel: 'C', featured: true, featuredOrder: 30, category: 'graphic', sections: [] },
      { id: 'd', title: 'D', featured: false, category: 'graphic', sections: [] }
    ],
    categories: bundle.site.categories,
    activeProjectId: 'a',
    activeCategory: 'all'
  });

  assert.match(html, /missing mar/);
  assert.match(html, /class="profile-monument" aria-hidden="true"/);
  assert.match(html, /class="profile-monument-art"/);
  assert.match(html, /missing-mar-profile-monument-v1\.webp/);
  assert.match(html, /class="landscape-foreground-grass"/);
  assert.match(html, /landscape-foreground-grass\.webp/);
  assert.doesNotMatch(html, /href="#about" class="profile-card"/);
  assert.equal((html.match(/WHERE&#39;S/g) || []).length, 0);
  assert.match(html, /featured-indicator ph ph-star-four/);
  assert.doesNotMatch(html, /ph-sparkle/);
  assert.equal((html.match(/class="featured-project/g) || []).length, 3);
  assert.match(html, /Все проекты — 4/);
  assert.match(html, /data-project-id="d"/);
  assert.match(html, /id="project-archive"/);
});

test('renders navigation pages in header links and the complete menu', () => {
  const html = renderHeader(bundle.site, bundle.pages);
  assert.match(html, /href="#about"/);
  assert.match(html, /href="#contact"/);
  assert.match(html, /data-page-id="press"/);
  assert.match(html, /ph ph-star-four/);
});

test('renders a linkable case study and safe contact links', () => {
  assert.match(
    renderProjectView({ id: 'x', title: 'Case', summary: 'Summary', sections: [] }, { title: 'UX/UI' }),
    /data-view="project"/
  );
  assert.match(renderContactView(bundle.site), /mailto:marrorball@gmail\.com/);
  assert.match(renderAboutView(bundle.site, { experience: [] }, bundle.pages[0]), /Обо мне/);
  assert.match(renderGenericPageView(bundle.pages[2]), /Материал/);
});

test('escapes titles while preserving owner-authored rich content', () => {
  const html = renderProjectView({
    id: 'x',
    title: '<script>',
    sections: [{ id: 'story', label: 'История', content: '<p>Авторский HTML</p>' }]
  }, { title: 'UX/UI' });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<p>Авторский HTML<\/p>/);
});
