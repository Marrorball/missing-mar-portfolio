import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const CSS = 'assets/fonts/pt/pt.css';

test('the PT family is self-hosted with Cyrillic for every face the pages use', () => {
  const css = readFileSync(CSS, 'utf8');
  for (const family of ['PT Sans', 'PT Sans Narrow', 'PT Mono']) {
    assert.match(css, new RegExp(`font-family: '${family}';[^}]*unicode-range: U\\+0301,U\\+0400-045F`), family);
  }
  for (const [, file] of css.matchAll(/url\(\.\/([^)]+)\)/g)) {
    assert.ok(existsSync(`assets/fonts/pt/${file}`), file);
  }
  assert.ok(existsSync('assets/fonts/pt/pt-sans-OFL.txt'), 'licence travels with the fonts');
});

test('the site stylesheet loads the PT faces', () => {
  assert.match(readFileSync('assets/css/fonts.css', 'utf8'), /@import url\('\.\.\/fonts\/pt\/pt\.css'\)/);
});
