import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderAboutBoard,
  renderFlyer,
  renderPageBoard,
  renderPrinting,
  renderReceipt,
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
  assert.match(html, /КАНАЛ 3</);
  assert.match(html, /KORTEX &lt;x&gt;/);
  assert.match(html, /UX\/UI проекты · 2025/);
  assert.match(html, /<li>ИИ<\/li>/);
  assert.match(html, /<h2>Задача<\/h2>/);
  assert.match(html, /data-action="tv-chapter" data-chapter="1">\s*<span>1<\/span>Задача/);
  assert.match(html, /data-chapter-section="1">\s*<p class="tv-scene">Сцена 1<\/p>/);
  assert.match(html, /<p>owner html<\/p>/);
  assert.match(html, /href="https:\/\/www\.behance\.net\/gallery\/1" target="_blank" rel="noreferrer"/);
});

test('on the TV the case plays as tape: frames with a timecode, no emoji', () => {
  const html = renderTvChannel({
    id: 'a',
    title: 'A',
    sections: [
      { label: 'Обложка', content: '<div class="cs-section"><img src="/a.png" style="max-width:260px"><a class="behance-btn">🎨 Смотреть</a></div>' },
      { label: 'Решение', content: '<p><img src="/b.png"></p>' }
    ]
  });
  assert.match(html, /<span class="tv-frame"><img src="\/a\.png" style="max-width:260px"><span class="tv-frame-osd" aria-hidden="true">▶\uFE0E 00:01:17 SP<\/span><\/span>/);
  assert.match(html, /▶\uFE0E 00:02:17 SP/, 'each scene counts its own frames');
  assert.doesNotMatch(html, /🎨/);
  assert.match(html, /class="behance-btn"> Смотреть/);
  assert.match(html, /<p class="tv-end-title">Конец<\/p>/);
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
  assert.match(html, />1<.*Учи\.ру.*UX\/UI · 2026/s);
  assert.match(html, />2</);
  assert.match(html, /class="ttx-red" href="#about"/);
  assert.match(html, /class="ttx-green" href="#contact"/);
  assert.match(html, /class="ttx-yellow" href="#project\/%D1%83%D1%87%D0%B8%20%D1%80%D1%83">Канал 1/);
  assert.doesNotMatch(html, /Прайс|#price/);
});

test('the billboard shows who Marat is; experience and skills are on the receipt', () => {
  const html = renderAboutBoard(
    { owner: { name: 'Марат <Д>', role: 'Product Designer', location: 'Москва', bio: 'Био', status: 'Всё сложно', profileImage: '/p.jpg' } },
    { id: 'about', title: 'Обо мне', content: '' }
  );
  assert.match(html, /href="#about" aria-current="page">Обо мне/);
  assert.doesNotMatch(html, /Прайс|#pricelist/);
  assert.match(html, /Марат &lt;Д&gt;/);
  assert.match(html, /Product Designer · Москва/);
  assert.match(html, /Био/);
  assert.match(html, /Всё сложно/);
  assert.doesNotMatch(html, /board-resume|Ищу/);
  assert.match(html, /src="\/p\.jpg"/);
  assert.match(html, /class="board-stamp" aria-hidden="true">Открыт к<br>предложениям/);
  assert.match(html, /href="#resume">Опыт и навыки — выписка в терминале/);
});

test('generic pages fit the billboard', () => {
  assert.match(renderPageBoard({ title: 'Пресса', content: '<p>x</p>' }), /Пресса.*<p>x<\/p>/s);
});

test('the résumé prints as a till receipt from the content', () => {
  const html = renderReceipt(
    { owner: { name: 'Марат <Д>', role: 'Product Designer', location: 'Москва, Россия' } },
    { experience: [{ period: '2024 — н.в.', company: 'Фриланс', role: 'UX/UI', description: 'Лендинги' }],
      skills: [{ name: 'Интерфейсы', level: 'UI · дизайн-системы' }], tools: ['Figma', 'Tilda'],
      education: [{ institution: 'МТУСИ', program: 'ИТ', period: '2022 — 2026' }],
      publications: [{ title: 'Видеоаналитика', year: '2023' }], about: 'Не боюсь критики' },
    { number: 472, date: new Date(2026, 9, 7, 21, 4) });
  assert.match(html, /Выписка № 000472/);
  assert.match(html, /07\.10\.2026 21:04/);
  assert.match(html, /Марат &lt;Д&gt;/);
  assert.match(html, /Product Designer · Москва</);
  for (const text of ['Фриланс', 'Лендинги', 'Интерфейсы', 'Figma · Tilda', 'МТУСИ', 'Видеоаналитика', 'Не боюсь критики', 'Открыт к предложениям']) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /is-kept/, 'a fresh receipt prints');
  assert.match(renderReceipt({}, {}, { fresh: false }), /class="receipt is-kept"/, 'coming back, the receipt is just there');
});

test('the flyer carries clickable contacts', () => {
  const flyer = renderFlyer(links, { name: 'Марат', role: 'Designer', location: 'Москва', profileImage: '/p.jpg' });
  assert.match(flyer, /ПРОПАЛ ДИЗАЙНЕР/);
  assert.match(flyer, /class="flyer-tape flyer-tape-left"/);
  assert.match(flyer, /Нашедшего просьба написать/);
  assert.match(flyer, /href="https:\/\/t\.me\/marrorball"/);
  const slips = flyer.match(/<div class="flyer-tabs"[^>]*>([\s\S]*?)<\/div>/)[1];
  assert.match(slips, /href="https:\/\/t\.me\/marrorball" target="_blank" rel="noreferrer"/);
  assert.match(slips, /href="mailto:a@b\.cd" aria-label="Открыть Почта: a@b\.cd"><span>a@b\.cd<\/span>/);
  assert.doesNotMatch(slips, /<button|copy-contact|Скопировать/);
  const long = renderFlyer([{ kind: 'email', label: 'Почта', value: 'marrorball@gmail.com', href: 'mailto:marrorball@gmail.com' }]);
  assert.match(long, /<span>marrorball<\/span><span>@gmail\.com<\/span>/, 'long contacts wrap on the slip');
});

test('the terminal screen only explains and offers to print: the résumé is on the receipt', () => {
  const html = renderTerminalScreen();
  assert.match(html, /class="terminal-bar"><span>Дизайн у Марата<\/span><span>Опыт и навыки<\/span>/);
  assert.match(html, /распечатайте выписку/i);
  assert.match(html, /data-action="terminal-print"[^>]*><span>Распечатать выписку/);
  assert.match(html, /data-action="kiosk-back"/);
  assert.doesNotMatch(html, /resume-block|Опыт<\/h2>/);
});

test('while it prints, the screen says to take the receipt', () => {
  assert.match(renderPrinting(), /Печатаем/);
  assert.match(renderPrinting(), /Возьмите чек/);
});
