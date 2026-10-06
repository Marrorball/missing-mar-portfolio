import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderCatalogView,
  renderHelpBar,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView
} from '../assets/js/kiosk/ui.js';

test('the help bar links to projects, about and contacts and offers help', () => {
  const html = renderHelpBar();
  assert.match(html, /href="#catalog">Проекты</);
  assert.match(html, /href="#about">Обо мне</);
  assert.match(html, /href="#contact">Контакты</);
  assert.match(html, /data-action="kiosk-help"/);
});

test('the catalog lists every project with an encoded link and escaped title', () => {
  const html = renderCatalogView([
    { id: 'учи ру', title: 'Учи.ру <b>', year: '2026' },
    { id: 'kortex', title: 'KORTEX', year: '2025' }
  ]);
  assert.match(html, /href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83"/);
  assert.match(html, /Учи\.ру &lt;b&gt;/);
  assert.match(html, /href="#">/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
});

test('hotspot buttons are real buttons carrying the node name', () => {
  const html = renderHotspotButtons([{ node: 'hs_flyer', label: 'Обо мне' }, { node: 'slot_0', label: 'A&B' }]);
  assert.match(html, /<button type="button" data-action="kiosk-pick" data-node="hs_flyer">Обо мне<\/button>/);
  assert.match(html, /A&amp;B/);
});

test('loading, note and price render readable text', () => {
  assert.match(renderLoading(41.6), /42%/);
  assert.match(renderNote('a < b'), /a &lt; b/);
  assert.match(renderPriceView(), /Прайс/);
});
