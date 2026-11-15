import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// ---------- 1. THE STAGE ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 12;
controls.maxDistance = 40;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.8;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

// ---------- STAR FIELD ----------
const starPositions = [];
for (let i = 0; i < 900; i++) {
  const radius = 30 + Math.random() * 18;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions.push(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.12,
  sizeAttenuation: true,
  transparent: true
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// ---------- 2. THE LIGHT ----------
const ambientLight = new THREE.AmbientLight(0x444466, 1);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(-10, 13, 12);
scene.add(sun);

// ---------- 3. THE PLANET ----------
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(2.0, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0xf7ae07 })
);
scene.add(planet);

// ---------- 4. THE RING ----------
const ring = new THREE.Mesh(
  new THREE.RingGeometry(3.1, 4.0, 64),
  new THREE.MeshBasicMaterial({
    color: 0xab7905,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  })
);
ring.rotation.x = Math.PI / 2.3;
scene.add(ring);

// ---------- 4B. THE OUTER RING ----------
const outerRing = new THREE.Mesh(
  new THREE.RingGeometry(4.5, 5.3, 64),
  new THREE.MeshBasicMaterial({
    color: 0xe3c77a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  })
);
outerRing.rotation.x = Math.PI / 2.3;
outerRing.position.y = 0.01;
outerRing.rotation.z = Math.PI / 12;
scene.add(outerRing);

// ---------- 5. THE MOONS ----------
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.4, 28, 28),
  new THREE.MeshStandardMaterial({ color: 0x6f6878 })
);
scene.add(moon);

const moon2 = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0xd9d2e9 })
);
scene.add(moon2);

const moon3 = new THREE.Mesh(
  new THREE.SphereGeometry(0.30, 20, 20),
  new THREE.MeshStandardMaterial({ color: 0xff8c00 })
);
scene.add(moon3);

// ---------- 6. THE LOOP (the only one!) ----------
// How fast each moon circles Saturn. Bigger number = faster. Lower a number to make that moon easier to click.
const MOON_SPEED = { moon: 1.2, moon2: 1.5, moon3: 1.7 };
const HOVER_SLOW = 0.12;                   // a moon slows to this fraction while your pointer is on it

// each moon keeps its own angle (a) and its own speed factor (f, easing toward tf)
const spin = { moon: { a: 0, f: 1, tf: 1 }, moon2: { a: 0, f: 1, tf: 1 }, moon3: { a: 0, f: 1, tf: 1 } };

let fly = null;      // the camera flight in progress, if any
let focusedInfo = null;                    // the moon that is open right now
let hoverInfo = null;                      // the moon the pointer is on right now
const look = { x: 0, y: 0, tx: 0, ty: 0 }; // where the eyes look (-1..1), tx/ty = target
let drawnX = 99, drawnY = 99;

function updateEyes() {
  if (!focusedInfo || !focusedInfo.ready) return;
  // the moon always turns its face toward whoever is looking
  focusedInfo.body.lookAt(camera.position);
  focusedInfo.body.rotateY(-Math.PI / 2);
  // eyes glide toward the pointer instead of snapping
  look.x += (look.tx - look.x) * 0.15;
  look.y += (look.ty - look.y) * 0.15;
  if (Math.abs(look.x - drawnX) > 0.003 || Math.abs(look.y - drawnY) > 0.003) {
    drawMoon(focusedInfo, look.x, look.y);
    drawnX = look.x; drawnY = look.y;
  }
}

function animate() {
  requestAnimationFrame(animate);          // first, so one hiccup can never stop the whole scene
  planet.rotation.y += 0.003;

  // Saturn and the other moons keep going; only the open moon holds still
  for (const key in spin) {
    const s = spin[key];
    const info = moonByKey[key];
    s.tf = (info === focusedInfo) ? 0 : (info === hoverInfo ? HOVER_SLOW : 1);
    s.f += (s.tf - s.f) * 0.12;
    s.a += 0.01 * MOON_SPEED[key] * s.f;
  }
  moon.position.set(Math.cos(spin.moon.a) * 6.0, 1.8, Math.sin(spin.moon.a) * 4.2);
  moon2.position.set(Math.cos(spin.moon2.a + Math.PI) * 7.0, 2.6, Math.sin(spin.moon2.a + Math.PI) * 4.8);
  moon3.position.set(Math.cos(spin.moon3.a) * 7.8, -2.2, Math.sin(spin.moon3.a) * 5.0);

  if (fly) {                                   // smooth camera move
    fly.k = Math.min(fly.k + 0.03, 1);
    const e = fly.k * fly.k * (3 - 2 * fly.k); // ease in and out
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (fly.k === 1) { const done = fly.onDone; fly = null; if (done) done(); }
  }

  try { updateEyes(); } catch (err) { console.error(err); if (focusedInfo) focusedInfo.ready = false; }
  controls.update();
  renderer.render(scene, camera);
}
const moonByKey = {};                      // filled in below, once the moons' info exists
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 7. NIGHT / MORNING BUTTON ----------
const lightToggle = document.getElementById('light-toggle');
const viewMessage = document.getElementById('view-message');
let isNight = false;

lightToggle.addEventListener('click', () => {
  isNight = !isNight;

  if (isNight) {
    lightToggle.textContent = 'Morning Shine';
    viewMessage.textContent = 'Click here to see the morning view of the planet.';
    lightToggle.classList.add('active');
    lightToggle.setAttribute('aria-pressed', 'true');
    ambientLight.color.set(0x26305b);
    ambientLight.intensity = 0.35;
    sun.color.set(0x8fa8ff);
    sun.intensity = 0.55;
    sun.position.set(10, 5, 8);
    stars.material.opacity = 1;
  } else {
    lightToggle.textContent = 'Night Shine';
    viewMessage.textContent = 'Click here to see the night view of the planet.';
    lightToggle.classList.remove('active');
    lightToggle.setAttribute('aria-pressed', 'false');
    ambientLight.color.set(0x444466);
    ambientLight.intensity = 1;
    sun.color.set(0xffffff);
    sun.intensity = 1.2;
    sun.position.set(-10, 13, 12);
  }
});

// ---------- 8. CLICKABLE MOONS WITH PHOTO TEXTURES + FOLLOWING EYES ----------
const textureLoader = new THREE.TextureLoader();

// Set to true to see red outlines of the eye areas (handy for fine-tuning the numbers below)
const DEBUG_EYES = false;

// Eye positions are in the pixels of each 1024x1024 picture:
//   x, y = middle of the eye   rx, ry = size of the eye opening (kept just inside the lids)
//   rot  = tilt in degrees     r = iris radius
// line = the color of the pencil lines drawn on that moon (the paper itself is see-through)
const moonInfo = [
  { key: 'moon',  body: moon,  img: 'images/me.jpg',   caption: 'Me', line: '#f3edf8',
    eyes: [ { x: 435, y: 577, rx: 50, ry: 21, rot: 20, r: 27 },
            { x: 688, y: 630, rx: 54, ry: 22, rot: 15, r: 29 } ] },
  { key: 'moon2', body: moon2, img: 'images/kid1.jpg', caption: 'My first little one', line: '#2b2540',
    eyes: [ { x: 443, y: 570, rx: 52, ry: 21, rot: -4, r: 27 },
            { x: 685, y: 545, rx: 46, ry: 21, rot: -6, r: 26 } ] },
  { key: 'moon3', body: moon3, img: 'images/kid2.jpg', caption: 'My second little one', line: '#2a1500',
    eyes: [ { x: 415, y: 503, rx: 56, ry: 31, rot: 27, r: 35 },
            { x: 670, y: 632, rx: 58, ry: 29, rot: 20, r: 35 } ] }
];

const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// Turns the sketch into pencil lines on a see-through layer (paper -> transparent),
// then cuts the eyes out of it so we can draw moving eyes there instead.
function buildLineLayer(info) {
  const N = 1024, img = info.image;
  const s = Math.min(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d');
  x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, N, N);

  const d = x.getImageData(0, 0, N, N), p = d.data;
  const lum = new Uint8Array(N * N), hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) {
    lum[j] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    hist[lum[j]]++;
  }
  let P = 255, sum = 0;                              // paper brightness = 92nd percentile
  for (let v = 0; v < 256; v++) { sum += hist[v]; if (sum >= 0.92 * N * N) { P = v; break; } }

  const [lr, lg, lb] = hexToRgb(info.line);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) {
    const a = Math.min(1, Math.max(0, (P - lum[j] - 22) / (P - 52)) * 1.1);
    p[i] = lr; p[i + 1] = lg; p[i + 2] = lb; p[i + 3] = a * 255;
  }
  x.putImageData(d, 0, 0);

  x.globalCompositeOperation = 'destination-out';    // cut the drawn eyes out
  info.eyes.forEach(eye => {
    x.beginPath();
    x.ellipse(eye.x, eye.y, eye.rx, eye.ry, eye.rot * Math.PI / 180, 0, Math.PI * 2);
    x.fill();
  });
  info.lineLayer = c;
}

// Draws the lines onto the moon's 2:1 canvas, then the eyes looking toward (lx, ly)
function drawMoon(info, lx, ly) {
  const ctx = info.ctx, c = info.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = info.bg;                           // the moon's own color shows through
  ctx.fillRect(0, 0, c.width, c.height);

  const size = 880;                                  // picture square in the middle
  const ox = (c.width - size) / 2, oy = (c.height - size) / 2;
  ctx.drawImage(info.lineLayer, 0, 0, 1024, 1024, ox, oy, size, size);

  const k = size / 1024;
  info.eyes.forEach(eye => {
    ctx.save();
    ctx.setTransform(k, 0, 0, k, ox, oy);            // now we can use picture pixels
    const rot = eye.rot * Math.PI / 180;

    ctx.beginPath();                                 // light "eye white", kept inside the lids
    ctx.ellipse(eye.x, eye.y, eye.rx, eye.ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = info.eyeWhite;
    ctx.fill();
    ctx.clip();

    const ix = eye.x + lx * eye.r * 0.75;            // iris, slid toward where we look
    const iy = eye.y + ly * eye.r * 0.6;
    ctx.fillStyle = '#242424';
    ctx.beginPath(); ctx.arc(ix, iy, eye.r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#0a0a0a'; ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ix, iy, eye.r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';                          // little sparkle
    ctx.beginPath(); ctx.arc(ix - eye.r * 0.3, iy - eye.r * 0.32, eye.r * 0.2, 0, Math.PI * 2); ctx.fill();

    const lid = ctx.createLinearGradient(0, eye.y - eye.ry, 0, eye.y + eye.ry * 0.2);
    lid.addColorStop(0, 'rgba(0,0,0,0.35)');         // soft shadow under the upper lid
    lid.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lid;
    ctx.fillRect(eye.x - eye.rx * 1.5, eye.y - eye.ry * 1.5, eye.rx * 3, eye.ry * 3);
    ctx.restore();

    if (DEBUG_EYES) {
      ctx.save();
      ctx.setTransform(k, 0, 0, k, ox, oy);
      ctx.strokeStyle = 'red'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(eye.x, eye.y, eye.rx, eye.ry, rot, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  });
  info.tex.needsUpdate = true;
}

moonInfo.forEach(info => { moonByKey[info.key] = info; });

// If a photo can't load, say so on screen instead of failing silently
function showProblem(msg) {
  console.warn(msg);
  viewMessage.textContent = msg;
  viewMessage.style.color = '#ffb4b4';
}

function setupPortrait(info, photoTex) {
  info.image = photoTex.image;
  info.canvas = document.createElement('canvas');
  info.canvas.width = 2048; info.canvas.height = 1024;
  info.ctx = info.canvas.getContext('2d');
  info.bg = '#' + info.body.material.color.getHexString();
  const [br, bgc, bb] = hexToRgb(info.bg).map(v => Math.round(v + (255 - v) * 0.8));
  info.eyeWhite = `rgb(${br},${bgc},${bb})`;       // the moon color, mostly whitened
  buildLineLayer(info);
  info.tex = new THREE.CanvasTexture(info.canvas);
  info.body.material.map = info.tex;
  info.body.material.color.set(0xffffff);          // so the moon color isn't applied twice
  info.body.material.needsUpdate = true;
  info.ready = true;
  drawMoon(info, 0, 0);
}

// tries "images/me.jpg" first, then "me.jpg" (same folder as index.html)
function loadPortrait(info, paths) {
  textureLoader.load(paths[0], photoTex => {
    try { setupPortrait(info, photoTex); }
    catch (err) {
      showProblem(`Couldn't read ${paths[0]} (${err.name}). Open the page with Live Server, not by double-clicking.`);
    }
  }, undefined, () => {
    if (paths.length > 1) loadPortrait(info, paths.slice(1));
    else showProblem(`Can't find ${info.img} - put your pictures in a folder named "images" next to index.html.`);
  });
}
moonInfo.forEach(info => loadPortrait(info, [info.img, info.img.replace('images/', '')]));

// invisible bigger bubbles make the small moons easier to click
const hitSpheres = moonInfo.map(info => {
  const r = info.body.geometry.parameters.radius * 2.5;
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(r, 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.userData.info = info;
  info.body.add(hit);
  return hit;
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const banner = document.getElementById('moon-banner');
const caption = document.getElementById('moon-caption');
let focused = false;
const home = { pos: new THREE.Vector3(), target: new THREE.Vector3() };

function moonAt(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(hitSpheres)[0];
}

function startFly(p1, t1, onDone) {
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, k: 0, onDone };
}

function openMoon(info) {
  focused = true;
  focusedInfo = info;
  look.x = look.y = look.tx = look.ty = 0;
  home.pos.copy(camera.position);
  home.target.copy(controls.target);
  controls.minDistance = 0.5;                       // allow getting close

  const mp = info.body.position.clone();
  const dir = camera.position.clone().sub(mp).normalize();   // moon -> camera
  const radius = info.body.geometry.parameters.radius;

  startFly(mp.clone().add(dir.multiplyScalar(radius * 3.5)), mp);
  caption.textContent = info.caption;
  banner.hidden = false;
}

function closeMoon() {
  if (!focused) return;
  banner.hidden = true;
  look.tx = look.ty = 0;                            // eyes look straight ahead again
  startFly(home.pos.clone(), home.target.clone(), () => {
    controls.minDistance = 12;
    if (focusedInfo) drawMoon(focusedInfo, 0, 0);
    focusedInfo = null;
    focused = false;
  });
}

// the eyes follow the pointer (mouse, or a finger while it touches the screen)
window.addEventListener('pointermove', e => {
  if (!focusedInfo) return;
  const v = focusedInfo.body.getWorldPosition(new THREE.Vector3()).project(camera);
  const sx = (v.x + 1) / 2 * window.innerWidth;
  const sy = (1 - v.y) / 2 * window.innerHeight;
  let dx = (e.clientX - sx) / 300, dy = (e.clientY - sy) / 300;
  const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  look.tx = dx; look.ty = dy;
});

// tell a click apart from dragging the planet around
let downX = 0, downY = 0;
renderer.domElement.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener('pointerup', e => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;   // that was a drag
  const hit = moonAt(e);                                   // also aims the raycaster at the pointer
  if (focused) {
    // tapping anywhere except the open moon itself (empty space, Saturn) takes you back
    const onMoon = raycaster.intersectObject(focusedInfo.body, false).length > 0;
    if (!onMoon) closeMoon();
  } else if (hit) {
    openMoon(hit.object.userData.info);
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  const hit = focused ? null : moonAt(e);
  hoverInfo = hit ? hit.object.userData.info : null;   // the moon under the pointer slows down
  renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
});
renderer.domElement.addEventListener('pointerleave', () => { hoverInfo = null; });

document.getElementById('moon-close').addEventListener('click', closeMoon);
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMoon(); });

/* ---------- TRY THIS (change one thing, save, refresh) ----------
   1. Change the planet color: 0x4aa8a0 -> your own hex code with 0x in front.
   2. Make the planet bigger or smaller: the 1.5 in SphereGeometry.
   3. Speed up the moon: change t += 0.01 to t += 0.03.
   4. Move the sun: change sun.position.set(5, 3, 5) to (-5, 3, 5).
   5. Challenge: add a second moon with a different color and a different orbit.
   6. Seastar challenge: replace the planet with a flat star shape (look up
      "THREE.Shape" and "ExtrudeGeometry") and make it spin like a seastar.
*/
