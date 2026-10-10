import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderBackButton,
  renderContactCard,
  renderHelpBar,
  renderHotspotButtons,
  renderLoading,
  renderNote,
  renderRackControls,
  renderRadioPanel,
  renderRemote
} from '../assets/js/kiosk/ui.js';

test('the help bar sends projects to the rack, about to the billboard, contacts to the card', () => {
  const html = renderHelpBar();
  assert.match(html, /data-action="kiosk-focus" data-preset="rack">Проекты</);
  assert.match(html, /href="#about">Обо мне</);
  assert.match(html, /data-action="contacts-card" aria-expanded="false" aria-controls="contact-card">Контакты</);
  assert.match(html, /data-action="kiosk-inside">Внутрь</);
  assert.doesNotMatch(html, /data-action="kiosk-help"|Как тут/, 'how to get around has its own button now');
});

test('how to get around is its own round «?» button, apart from the menu', async () => {
  const { renderGuideButton } = await import('../assets/js/kiosk/ui.js');
  const html = renderGuideButton();
  assert.match(html, /class="guide-button" data-action="kiosk-help"/);
  assert.match(html, /<b[^>]*>\?<\/b>/);
  assert.match(html, /Как тут ходить/);
});

test('the contact card opens every contact directly without copy buttons', () => {
  const html = renderContactCard([
    { kind: 'telegram', label: 'Telegram', value: '@mar<b>', href: 'https://t.me/mar' },
    { kind: 'email', label: 'Почта', value: 'a@b.cd', href: 'mailto:a@b.cd' }
  ]);
  assert.match(html, /id="contact-card"/);
  assert.match(html, /href="https:\/\/t\.me\/mar" target="_blank" rel="noreferrer"/);
  assert.match(html, /href="mailto:a@b\.cd">/);
  assert.match(html, /@mar&lt;b&gt;/);
  assert.doesNotMatch(html, /<button|copy-contact|Скопировать/);
});

test('close-ups get a way back and the rack gets its spin controls', () => {
  assert.match(renderBackButton(), /data-action="kiosk-back"[^>]*>.*Назад/);
  const rack = renderRackControls('UX/UI <3');
  assert.match(rack, /data-action="rack-spin" data-step="-1"/);
  assert.match(rack, /data-action="rack-spin" data-step="1"/);
  assert.match(rack, /UX\/UI &lt;3/);
});

test('hotspot buttons, loading and note render readable text', () => {
  assert.match(renderHotspotButtons([{ node: 'disc_0', label: 'A&B' }]), /data-node="disc_0">A&amp;B<\/button>/);
  assert.match(renderLoading(41.6), /42%/);
  assert.match(renderNote('a < b'), /a &lt; b/);
});

test('the TV remote switches, scrolls, opens the guide and turns off', () => {
  const html = renderRemote();
  assert.match(html, /data-action="tv-channel" data-step="1"/);
  assert.match(html, /data-action="tv-channel" data-step="-1"/);
  assert.match(html, /data-action="tv-scroll" data-step="-1"/);
  assert.match(html, /data-action="tv-scroll" data-step="1"/);
  assert.match(html, /data-action="tv-menu"/);
  assert.match(html, /data-action="tv-off"/);
});

test('loading never shows more than 100 percent', () => {
  assert.match(renderLoading(330), /100%/);
  assert.match(renderLoading(-5), /0%/);
});

test('arrows stay text on iPhones, not emoji stickers', async () => {
  const pages = await import('../assets/js/kiosk/pages.js');
  const html = [
    renderRackControls('UX/UI'),
    renderRemote(),
    pages.renderTerminalScreen(),
    pages.renderTvChannel({ id: 'a', title: 'A', behance: 'https://www.behance.net/x', sections: [] }, { index: 0 })
  ].join('');
  for (const arrow of ['◀', '▶', '↗']) {
    const bare = html.split(arrow).slice(1).filter(after => !after.startsWith('︎'));
    assert.equal(bare.length, 0, `${arrow} without U+FE0E`);
  }
});

test('while the radio plays, a panel shows the station and a red ВЫКЛ key', () => {
  const html = renderRadioPanel('Russian <Gold>');
  assert.match(html, /data-action="radio-off"[^>]*>Выкл</);
  assert.match(html, /Russian &lt;Gold&gt;/);
  assert.doesNotMatch(html, /radio-step/, 'one station: no arrows');
});

test('what you hold up: the receipt with a way to put it down and to get in touch, the phone with its keys', async () => {
  const { renderHand, renderPhone } = await import('../assets/js/kiosk/ui.js');
  const receipt = renderHand('receipt', '<div class="receipt">чек</div>');
  assert.match(receipt, /class="hand hand-receipt"/);
  assert.match(receipt, /data-action="kiosk-back"[^>]*>← Положить чек/);
  assert.match(receipt, /href="#contact"/);
  const phone = renderHand('phone', renderPhone());
  assert.match(phone, /Положить телефон/);
  assert.match(phone, /<canvas/);
  for (const key of ['2', '4', '5', '6', '8']) assert.match(phone, new RegExp(`data-phone-key="${key}"`));
  assert.doesNotMatch(phone.replace(/◀︎|▶︎/g, ''), /[◀▶]/, 'arrows stay text on iPhones');
});

test('the «how to get around» card: three light steps for mouse or finger, what lies where, and off we go', async () => {
  const { renderGuide } = await import('../assets/js/kiosk/ui.js');
  const mouse = renderGuide({ touch: false });
  assert.match(mouse, /Как тут всё устроено/);
  for (const step of ['Осмотрись', 'Подойди', 'Отойди']) assert.ok(mouse.includes(step), step);
  assert.match(mouse, /Зажми мышку/);
  assert.match(mouse, /Наведи/);
  assert.match(mouse, /вертушке.*проекты/s);
  assert.match(mouse, /телефон/);
  assert.match(mouse, /data-action="guide-close">Понятно, погнали/);
  const finger = renderGuide({ touch: true });
  assert.match(finger, /пальцем/);
  assert.doesNotMatch(finger, /мышк|Наведи/);
});
