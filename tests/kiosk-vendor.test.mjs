import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = 'assets/vendor/three';
const FILES = [
  'three.module.js',
  'three.core.js',
  'addons/controls/OrbitControls.js',
  'addons/loaders/GLTFLoader.js',
  'addons/postprocessing/EffectComposer.js',
  'addons/postprocessing/RenderPass.js',
  'addons/postprocessing/UnrealBloomPass.js',
  'addons/postprocessing/OutputPass.js',
  'addons/utils/BufferGeometryUtils.js',
  'addons/utils/SkeletonUtils.js'
];

function specifiers(source) {
  // Doc comments contain usage examples like `from 'three/addons/...'`.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...code.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
}

test('vendored three.js files exist', () => {
  for (const file of FILES) assert.ok(existsSync(join(ROOT, file)), file);
});

test('vendored files only import "three" or files that are vendored too', () => {
  for (const file of FILES) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const spec of specifiers(source)) {
      if (spec === 'three') continue;
      assert.ok(spec.startsWith('.'), `${file} imports ${spec}`);
      assert.ok(existsSync(join(ROOT, dirname(file), spec)), `${file} → ${spec}`);
    }
  }
});

test('index.html maps "three" to the vendored build', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /"three":\s*"\.\/assets\/vendor\/three\/three\.module\.js"/);
  assert.match(html, /"three\/addons\/":\s*"\.\/assets\/vendor\/three\/addons\/"/);
});
