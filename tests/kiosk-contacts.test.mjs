import test from 'node:test';
import assert from 'node:assert/strict';
import { contactLinks } from '../assets/js/kiosk/contacts.js';

test('builds ready links from the content contacts', () => {
  assert.deepEqual(contactLinks({
    telegram: '@marrorball',
    email: 'marrorball@gmail.com',
    behance: 'https://www.behance.net/marmaraj11'
  }), [
    { kind: 'telegram', label: 'Telegram', value: '@marrorball', href: 'https://t.me/marrorball' },
    { kind: 'email', label: 'Почта', value: 'marrorball@gmail.com', href: 'mailto:marrorball@gmail.com' },
    { kind: 'behance', label: 'Behance', value: 'www.behance.net/marmaraj11', href: 'https://www.behance.net/marmaraj11' }
  ]);
});

test('drops anything malformed or unsafe', () => {
  assert.deepEqual(contactLinks({ telegram: 'a b', email: 'nope', behance: 'javascript:alert(1)' }), []);
  assert.deepEqual(contactLinks({ behance: 'http://example.com' }), []);
  assert.deepEqual(contactLinks(), []);
});
