// GitHub Pages serves this repository without a build step, so the parts of
// three.js the kiosk needs are copied next to the site and resolved through
// the import map in index.html.
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = [
  ['build/three.module.js', 'three.module.js'],
  ['build/three.core.js', 'three.core.js'],
  ['examples/jsm/controls/OrbitControls.js', 'addons/controls/OrbitControls.js'],
  ['examples/jsm/loaders/GLTFLoader.js', 'addons/loaders/GLTFLoader.js'],
  ['examples/jsm/renderers/CSS3DRenderer.js', 'addons/renderers/CSS3DRenderer.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js', 'addons/utils/BufferGeometryUtils.js'],
  ['examples/jsm/utils/SkeletonUtils.js', 'addons/utils/SkeletonUtils.js'],
  ['LICENSE', 'LICENSE']
];

for (const [from, to] of FILES) {
  const target = join('assets/vendor/three', to);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join('node_modules/three', from), target);
}

console.log(`three.js vendored: ${FILES.length} files`);
