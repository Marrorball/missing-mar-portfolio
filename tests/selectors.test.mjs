import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProjects,
  resolveProjectCover,
  selectFeaturedProjects
} from '../assets/js/selectors.js';

const projects = [
  { id: 'surf', title: 'Surf', order: 40, featured: false, category: 'graphic', sections: [] },
  { id: 'uchi', title: 'Учи.ру', order: 30, featured: true, featuredOrder: 30, category: 'uxui', sections: [] },
  { id: 'kortex', title: 'KORTEX', order: 10, featured: true, featuredOrder: 10, category: 'uxui', sections: [] },
  { id: 'pik', title: 'ПИК', order: 20, featured: true, featuredOrder: 20, category: 'uxui', sections: [] }
];

test('selects exactly three featured projects in featured order', () => {
  assert.deepEqual(
    selectFeaturedProjects(projects).map(project => project.id),
    ['kortex', 'pik', 'uchi']
  );
});

test('fills missing featured slots from published project order', () => {
  const values = projects.map(project => ({
    ...project,
    featured: project.id === 'kortex'
  }));
  assert.deepEqual(
    selectFeaturedProjects(values).map(project => project.id),
    ['kortex', 'pik', 'uchi']
  );
});

test('filters the archive by category', () => {
  assert.equal(filterProjects(projects, 'graphic').length, 1);
  assert.equal(filterProjects(projects, 'all').length, 4);
});

test('resolves only authored project covers', () => {
  assert.equal(
    resolveProjectCover({ cover: '/missing-mar-portfolio/assets/media/a.jpg' }),
    '/missing-mar-portfolio/assets/media/a.jpg'
  );
  assert.equal(resolveProjectCover({ cover: '' }), '');
});
