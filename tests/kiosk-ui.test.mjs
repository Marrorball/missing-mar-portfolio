import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderBackButton,
  renderCatalogView,
  renderContactCard,
  renderHelpBar,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderPriceView,
  renderRackControls
} from '../assets/js/kiosk/ui.js';

test('the help bar sends projects to the rack, about to the billboard, contacts to the card', () => {
  const html = renderHelpBar();
  assert.match(html, /data-action="kiosk-focus" data-preset="rack">Проекты</);
  assert.match(html, /href="#about">Обо мне</);
  assert.match(html, /data-action="contacts-card" aria-expanded="false" aria-controls="contact-card">Контакты</);
  assert.match(html, /data-action="kiosk-help"/);
});

test('the contact card opens links in one click and offers copying', () => {
  const html = renderContactCard([
    { kind: 'telegram', label: 'Telegram', value: '@mar<b>', href: 'https://t.me/mar' },
    { kind: 'email', label: 'Почта', value: 'a@b.cd', href: 'mailto:a@b.cd' }
  ]);
  assert.match(html, /id="contact-card"/);
  assert.match(html, /href="https:\/\/t\.me\/mar" target="_blank" rel="noreferrer"/);
  assert.match(html, /href="mailto:a@b\.cd">/);
  assert.match(html, /@mar&lt;b&gt;/);
  assert.match(html, /data-action="copy-contact" data-value="a@b\.cd"/);
});

test('close-ups get a way back and the rack gets its spin controls', () => {
  assert.match(renderBackButton(), /data-action="kiosk-home">.*К ларьку/);
  const rack = renderRackControls('UX/UI <3');
  assert.match(rack, /data-action="rack-spin" data-step="-1"/);
  assert.match(rack, /data-action="rack-spin" data-step="1"/);
  assert.match(rack, /UX\/UI &lt;3/);
});

test('the catalog lists every project with an encoded link and escaped title', () => {
  const html = renderCatalogView([
    { id: 'учи ру', title: 'Учи.ру <b>', year: '2026' },
    { id: 'kortex', title: 'KORTEX', year: '2025' }
  ]);
  assert.match(html, /href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83"/);
  assert.match(html, /Учи\.ру &lt;b&gt;/);
  assert.equal((html.match(/<li>/g) || []).length, 2);
});

test('hotspot buttons, loading, note and price render readable text', () => {
  assert.match(renderHotspotButtons([{ node: 'disc_0', label: 'A&B' }]), /data-node="disc_0">A&amp;B<\/button>/);
  assert.match(renderLoading(41.6), /42%/);
  assert.match(renderNote('a < b'), /a &lt; b/);
  assert.match(renderPriceView(), /Прайс/);
});
