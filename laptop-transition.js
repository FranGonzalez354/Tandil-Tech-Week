import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/three/GLTFLoader.js';

// Project the real event section onto the model's display. No screenshot or duplicate UI.
const upcoming = document.querySelector('#proximos');
const home = document.querySelector('#home-page');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stage = document.createElement('div');
stage.className = 'laptop-stage';
upcoming.before(stage);
const screen = document.createElement('div');
screen.className = 'laptop-content';
stage.append(screen);
screen.append(upcoming);
const skip = document.createElement('a');
skip.className = 'laptop-skip';
skip.href = '#proximos';
skip.textContent = 'Ir a los eventos';
stage.append(skip);

let renderer, model, lid, scene, camera, timeline;
let loading = false;
let failed = false;
let width = 0, height = 0;
const state = { progress: 0 };
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

// Eight-parameter planar homography, converted to a CSS matrix3d.
function projectionMatrix(points, w, h) {
  const source = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const rows = [];
  source.forEach(([x, y], i) => {
    const [u, v] = points[i];
    rows.push([x,y,1,0,0,0,-u*x,-u*y,u]);
    rows.push([0,0,0,x,y,1,-v*x,-v*y,v]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    if (Math.abs(divisor) < 1e-9) return 'none';
    for (let j = col; j < 9; j++) rows[col][j] /= divisor;
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const factor = rows[r][col];
      for (let j = col; j < 9; j++) rows[r][j] -= factor * rows[col][j];
    }
  }
  const [a,b,c,d,e,f,g,hp] = rows.map(row => row[8]);
  return `matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hp/h},0,0,1,0,${c},${f},0,1)`;
}

function measure() {
  width = stage.clientWidth;
  height = window.innerHeight;
  if (!width || !renderer) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function render() {
  if (!renderer || !timeline || !width || home.hidden) return;
  const p = state.progress;
  const opening = smooth(0, 0.42, p);
  const zoom = smooth(0.4, 0.96, p);
  lid.rotation.set(lerp(-0.035, -Math.PI / 2, opening), 0, 0);
  // At 90° the display center is (0, 1.285, -1.105), facing the viewer.
  const center = new THREE.Vector3(0, 1.285, -1.105);
  const distance = Math.max(6.2, 3.42 / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * camera.aspect * 0.78));
  // Match the display to the page width before the handoff, avoiding an overshoot
  // and backwards zoom on tall mobile viewports.
  const closeDistance = (3.08 / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(19))) * 1.02;
  camera.position.set(lerp(1.15, 0, smooth(0, 0.65, p)), lerp(3.0, center.y, zoom), lerp(distance, center.z + closeDistance, zoom));
  camera.lookAt(0, lerp(0.55, center.y, smooth(0.1, 0.8, p)), lerp(0, center.z, zoom));
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);

  const corners = [[-1.54,-0.025,1.98],[1.54,-0.025,1.98],[1.54,-0.025,0.20],[-1.54,-0.025,0.20]];
  const screenHeight = screen.offsetHeight;
  const destination = [[0,0],[width,0],[width,screenHeight],[0,screenHeight]];
  const handoff = smooth(0.78, 1, p);
  // A laptop viewport shows the top of a page, not a vertically squashed full page.
  const viewportHeight = lerp(Math.min(screenHeight, width * 1.78 / 3.08), screenHeight, handoff);
  const projected = corners.map((corner, index) => {
    const point = lid.localToWorld(new THREE.Vector3(...corner)).project(camera);
    return [lerp((point.x + 1) * width / 2, destination[index][0], handoff), lerp((1 - point.y) * height / 2, destination[index][1], handoff)];
  });
  const front = new THREE.Vector3(0, -1, 0).transformDirection(lid.matrixWorld);
  const visible = front.dot(camera.position.clone().sub(lid.getWorldPosition(new THREE.Vector3()))) > 0;
  screen.style.opacity = visible ? smooth(0.1, 0.23, p) : 0;
  screen.style.transform = p >= 0.999 ? 'none' : projectionMatrix(projected, width, viewportHeight);
  screen.style.clipPath = p >= 0.999 ? 'none' : `inset(0 0 ${screenHeight - viewportHeight}px 0)`;
  screen.inert = p < 0.985;
  renderer.domElement.style.opacity = 1 - smooth(0.84, 0.99, p);
  skip.style.opacity = 1 - smooth(0.7, 0.9, p);
  skip.style.visibility = p > 0.98 ? 'hidden' : 'visible';
  if (p < 0.999) renderer.render(scene, camera);
}

function teardown() {
  timeline?.scrollTrigger?.kill();
  timeline?.kill();
  timeline = undefined;
  stage.classList.remove('is-enhanced');
  screen.style.removeProperty('transform');
  screen.style.removeProperty('opacity');
  screen.style.removeProperty('clip-path');
  screen.inert = false;
}

function activate() {
  if (!model || timeline || home.hidden || reducedMotion.matches) return;
  stage.classList.add('is-enhanced');
  state.progress = 0;
  measure();
  timeline = gsap.to(state, {
    progress: 1, ease: 'none', onUpdate: render,
    scrollTrigger: {
      id: 'laptop-journey', trigger: stage, pin: stage,
      refreshPriority: 1,
      start: 'top top', end: () => `+=${window.innerHeight * 2.6}`,
      scrub: 0.65, anticipatePin: 1, invalidateOnRefresh: true,
      onRefresh: () => { measure(); render(); },
    },
  });
  render();
  ScrollTrigger.refresh();
}

async function sync() {
  if (failed || reducedMotion.matches || home.hidden) { teardown(); return; }
  if (model) { activate(); return; }
  if (loading || failed || !window.gsap || !window.ScrollTrigger) return;
  loading = true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'laptop-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.prepend(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); failed = true; teardown(); ScrollTrigger.refresh();
    });
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x778a78, 3));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(-3, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc9f9c4, 2);
    rim.position.set(4, 2, -3);
    scene.add(rim);
    const gltf = await new GLTFLoader().loadAsync('laptop.glb');
    model = gltf.scene;
    model.traverse(object => {
      const name = object.name.replaceAll('_', ' ');
      if (name === 'Lid hinge pivot') lid = object;
      if (name.startsWith('Wallpaper')) object.visible = false;
    });
    if (!lid) throw new Error('El modelo no contiene la bisagra esperada.');
    scene.add(model);
    activate();
    if (location.hash === '#proximos') window.ttwLaptop.scrollToEvents();
    else if (location.hash && location.hash !== '#inicio' && !home.hidden) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  } catch (error) {
    failed = true;
    teardown();
    renderer?.dispose();
    renderer?.domElement.remove();
    console.warn('Transición 3D no disponible; se muestra la sección directamente.', error);
  } finally { loading = false; }
}

window.ttwLaptop = {
  scrollToEvents() {
    if (!timeline?.scrollTrigger) return false;
    window.scrollTo({ top: timeline.scrollTrigger.end + 1, behavior: 'instant' });
    timeline.progress(1);
    render();
    return true;
  },
};
skip.addEventListener('click', event => {
  event.preventDefault();
  window.ttwLaptop.scrollToEvents();
  upcoming.querySelector('a')?.focus({ preventScroll: true });
});
window.addEventListener('ttw:route', sync);
window.addEventListener('resize', () => { if (timeline) { measure(); render(); } });
reducedMotion.addEventListener('change', () => { sync(); window.ScrollTrigger?.refresh(); });
new MutationObserver(() => { if (timeline) render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, { once: true });
else sync();
