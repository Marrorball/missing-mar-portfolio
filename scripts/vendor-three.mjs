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
  ['examples/jsm/postprocessing/EffectComposer.js', 'addons/postprocessing/EffectComposer.js'],
  ['examples/jsm/postprocessing/RenderPass.js', 'addons/postprocessing/RenderPass.js'],
  ['examples/jsm/postprocessing/UnrealBloomPass.js', 'addons/postprocessing/UnrealBloomPass.js'],
  ['examples/jsm/postprocessing/OutputPass.js', 'addons/postprocessing/OutputPass.js'],
  ['examples/jsm/postprocessing/ShaderPass.js', 'addons/postprocessing/ShaderPass.js'],
  ['examples/jsm/postprocessing/MaskPass.js', 'addons/postprocessing/MaskPass.js'],
  ['examples/jsm/postprocessing/Pass.js', 'addons/postprocessing/Pass.js'],
  ['examples/jsm/shaders/CopyShader.js', 'addons/shaders/CopyShader.js'],
  ['examples/jsm/shaders/LuminosityHighPassShader.js', 'addons/shaders/LuminosityHighPassShader.js'],
  ['examples/jsm/shaders/OutputShader.js', 'addons/shaders/OutputShader.js'],
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
