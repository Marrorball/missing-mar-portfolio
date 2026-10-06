import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderAboutBoard,
  renderFlyer,
  renderPageBoard,
  renderPriceBoard,
  renderTerminalScreen,
  renderTvChannel,
  renderTvGuide
} from '../assets/js/kiosk/pages.js';

const links = [
  { kind: 'telegram', label: 'Telegram', value: '@marrorball', href: 'https://t.me/marrorball' },
  { kind: 'email', label: 'Почта', value: 'a@b.cd', href: 'mailto:a@b.cd' }
];

test('a TV channel shows the project under its channel number', () => {
  const html = renderTvChannel({
    id: 'kortex',
    title: 'KORTEX <x>',
    year: '2025',
    summary: 'Сервис',
    tags: ['ИИ'],
    behance: 'https://www.behance.net/gallery/1',
    sections: [{ id: 'problem', label: '❓ Задача', content: '<p>owner html</p>' }]
  }, { index: 2, category: 'UX/UI проекты' });
  assert.match(html, /КАНАЛ 03/);
  assert.match(html, /KORTEX &lt;x&gt;/);
  assert.match(html, /UX\/UI проекты · 2025/);
  assert.match(html, /<li>ИИ<\/li>/);
  assert.match(html, /<h2>Задача<\/h2>/);
  assert.match(html, /data-action="tv-chapter" data-chapter="1">\s*<span>1<\/span>Задача/);
  assert.match(html, /data-chapter-section="1">\s*<p class="tv-scene">Сцена 1<\/p>/);
  assert.match(html, /<p>owner html<\/p>/);
  assert.match(html, /href="https:\/\/www\.behance\.net\/gallery\/1" target="_blank" rel="noreferrer"/);
});

test('unsafe Behance links never reach the TV', () => {
  assert.doesNotMatch(renderTvChannel({ id: 'a', title: 'A', behance: 'javascript:alert(1)' }), /Behance/);
});

test('the TV guide numbers every channel and links to it', () => {
  const html = renderTvGuide(
    [{ id: 'учи ру', title: 'Учи.ру', category: 'uxui', year: '2026' }, { id: 'b', title: 'B' }],
    [{ id: 'uxui', title: 'UX/UI' }]
  );
  assert.match(html, /ТЕЛЕПРОГРАММА/);
  assert.match(html, /href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83"/);
  assert.match(html, />01<.*Учи\.ру.*UX\/UI · 2026/s);
  assert.match(html, />02</);
  assert.match(html, /class="ttx-red" href="#about"/);
  assert.match(html, /class="ttx-blue" href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83">Канал 01/);
});

test('the billboard shows who Marat is, with tabs for about and price', () => {
  const html = renderAboutBoard(
    { owner: { name: 'Марат <Д>', role: 'Product Designer', location: 'Москва', bio: 'Био', status: 'Ищу работу', profileImage: '/p.jpg' } },
    {
      experience: [{ period: '2025', company: 'KORTEX', role: 'UX/UI', description: 'Сервис' }],
      skills: [{ name: 'Figma', level: 'уверенно' }],
      tools: ['Figma']
    },
    { id: 'about', title: 'Обо мне', content: '' }
  );
  assert.match(html, /href="#about" aria-current="page">Обо мне/);
  assert.match(html, /href="#price">Прайс/);
  assert.match(html, /Марат &lt;Д&gt;/);
  assert.match(html, /Product Designer · Москва/);
  assert.match(html, /Био/);
  assert.match(html, /Ищу работу/);
  assert.match(html, /KORTEX/);
  assert.match(html, /src="\/p\.jpg"/);
  assert.match(html, /class="board-stamp" aria-hidden="true">Ищу<br>работу/);
});

test('price and generic pages also fit the billboard', () => {
  assert.match(renderPriceBoard(), /href="#price" aria-current="page"/);
  assert.match(renderPriceBoard(), /Скоро здесь будет прайс/);
  assert.match(renderPageBoard({ title: 'Пресса', content: '<p>x</p>' }), /Пресса.*<p>x<\/p>/s);
});

test('terminal and flyer both carry clickable contacts', () => {
  const terminal = renderTerminalScreen(links);
  assert.match(terminal, /href="https:\/\/t\.me\/marrorball" target="_blank" rel="noreferrer"/);
  assert.match(terminal, /href="mailto:a@b\.cd">/);
  assert.match(terminal, /class="terminal-bar"><span>Оплата услуг/);
  assert.match(terminal, /data-action="kiosk-back"/);

  const flyer = renderFlyer(links, { name: 'Марат', role: 'Designer', location: 'Москва', profileImage: '/p.jpg' });
  assert.match(flyer, /ПРОПАЛ ДИЗАЙНЕР/);
  assert.match(flyer, /class="flyer-tape flyer-tape-left"/);
  assert.match(flyer, /Нашедшего просьба написать/);
  assert.match(flyer, /href="https:\/\/t\.me\/marrorball"/);
  assert.match(flyer, /data-action="copy-contact" data-value="@marrorball"/);
});
