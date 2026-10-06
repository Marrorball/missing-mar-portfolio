import test from 'node:test';
import assert from 'node:assert/strict';
import { coverDescriptor } from '../assets/js/kiosk/covers.js';

test('disc cover uses the supplied project cover and preserves its title', () => {
  assert.deepEqual(coverDescriptor({ title: 'A & B', year: '2025', category: 'graphic', accent: '#abcdef', cover: '/missing-mar-portfolio/assets/media/projects/a/cover.jpg' }, [{ id: 'graphic', title: 'Графика' }]), {
    title: 'A & B', year: '2025', category: 'Графика', accent: '#abcdef', image: '/missing-mar-portfolio/assets/media/projects/a/cover.jpg'
  });
});

test('missing cover uses the first local case image, otherwise a printed title', () => {
  assert.equal(coverDescriptor({ sections: [{ content: '<img src="/missing-mar-portfolio/assets/media/projects/a/logo.svg">' }] }).image, '/missing-mar-portfolio/assets/media/projects/a/logo.svg');
  assert.equal(coverDescriptor({ title: 'Проект' }).title, 'Проект');
  assert.equal(coverDescriptor({}).image, '');
});

test('unsafe or external artwork and invalid colours fall back to printed artwork', () => {
  for (const cover of ['javascript:alert(1)', 'https://other.example/image.png', '/missing-mar-portfolio/assets/media/../../content/site.json']) {
    assert.equal(coverDescriptor({ cover, accent: 'url(x)' }).image, '');
    assert.equal(coverDescriptor({ cover, accent: 'url(x)' }).accent, '#c98a49');
  }
});
