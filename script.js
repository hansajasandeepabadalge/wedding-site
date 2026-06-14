// ===== PARTICLES =====
const pCanvas = document.getElementById('particles-bg');
const pCtx = pCanvas.getContext('2d');
let particles = [];
function resizePCanvas() { pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight }
resizePCanvas();
window.addEventListener('resize', resizePCanvas);
function createParticle() {
  return { x: Math.random() * pCanvas.width, y: Math.random() * pCanvas.height - 50, size: Math.random() * 5 + 2, speedX: Math.random() * 1 - .5, speedY: Math.random() * 0.8 + 0.3, opacity: Math.random() * 0.5 + 0.2, color: `hsl(${340 + Math.random() * 40},${60 + Math.random() * 20}%,${75 + Math.random() * 15}%)` }
}
for (let i = 0; i < 30; i++) particles.push(createParticle());
function animParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  particles.forEach(p => {
    p.x += p.speedX; p.y += p.speedY;
    if (p.y > pCanvas.height + 20) { p.y = -20; p.x = Math.random() * pCanvas.width }
    pCtx.save(); pCtx.globalAlpha = p.opacity; pCtx.fillStyle = p.color;
    pCtx.beginPath();
    pCtx.ellipse(p.x, p.y, p.size * 1.5, p.size, Math.sin(Date.now() * .001 + p.x) * .5, 0, Math.PI * 2);
    pCtx.fill(); pCtx.restore();
  });
  requestAnimationFrame(animParticles);
}
animParticles();

// ===== THREE.JS ENVELOPE =====
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas'), antialias: true, alpha: true });
renderer.setSize(340, 260); renderer.setPixelRatio(window.devicePixelRatio); renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 340 / 260, .1, 100);
camera.position.set(0, 0, 4.5);

// Lighting
const ambient = new THREE.AmbientLight(0xfff0f0, 0.8); scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xfff4e8, 1.2); dirLight.position.set(3, 4, 5); scene.add(dirLight);
const rimLight = new THREE.DirectionalLight(0xf8e0f0, 0.4); rimLight.position.set(-3, -2, 2); scene.add(rimLight);

// Envelope group
const envGroup = new THREE.Group(); scene.add(envGroup);

// Materials
const envMat = new THREE.MeshStandardMaterial({ color: 0x7a3d4a, roughness: .4, metalness: .05, side: THREE.DoubleSide });
const flapMat = new THREE.MeshStandardMaterial({ color: 0x6a2d3a, roughness: .35, metalness: .08, side: THREE.DoubleSide });
const liningMat = new THREE.MeshStandardMaterial({ color: 0x4a1c27, roughness: .5, metalness: 0, side: THREE.DoubleSide });
const sealMat = new THREE.MeshStandardMaterial({ color: 0xc8a07a, roughness: .2, metalness: .6, side: THREE.DoubleSide, transparent: true });

// Envelope body
const bodyGeo = new THREE.BoxGeometry(2.8, 1.8, .05, 1, 1, 1);
const body = new THREE.Mesh(bodyGeo, envMat);
envGroup.add(body);

// Bottom flap
const bShape = new THREE.Shape();
bShape.moveTo(-1.4, -0.9); bShape.lineTo(1.4, -0.9); bShape.lineTo(0, 0.1); bShape.closePath();
const bFlap = new THREE.Mesh(new THREE.ShapeGeometry(bShape), liningMat); bFlap.position.z = .03; envGroup.add(bFlap);

// Left flap
const lShape = new THREE.Shape();
lShape.moveTo(-1.4, -0.9); lShape.lineTo(-1.4, .9); lShape.lineTo(0, 0.1); lShape.closePath();
const lFlap = new THREE.Mesh(new THREE.ShapeGeometry(lShape), liningMat); lFlap.position.z = .03; envGroup.add(lFlap);

// Right flap
const rShape = new THREE.Shape();
rShape.moveTo(1.4, -0.9); rShape.lineTo(1.4, .9); rShape.lineTo(0, 0.1); rShape.closePath();
const rFlap = new THREE.Mesh(new THREE.ShapeGeometry(rShape), liningMat); rFlap.position.z = .03; envGroup.add(rFlap);

// Top flap (pivot at top edge)
const tShape = new THREE.Shape();
tShape.moveTo(-1.4, .9); tShape.lineTo(1.4, .9); tShape.lineTo(0, 0); tShape.closePath();
const topFlapPivot = new THREE.Group();
topFlapPivot.position.set(0, .9, .03);
topFlapPivot.rotation.x = -0.01;
envGroup.add(topFlapPivot);
const topFlapMesh = new THREE.Mesh(new THREE.ShapeGeometry(tShape), flapMat);
topFlapMesh.position.set(0, -.9, 0);
topFlapPivot.add(topFlapMesh);



// Wax seal
const sealGeo = new THREE.CircleGeometry(.22, 32);
const seal = new THREE.Mesh(sealGeo, sealMat);
seal.position.set(0, 0.05, .08);
seal.userData.noOutline = true;
envGroup.add(seal);

const iSeal = new THREE.Mesh(new THREE.CircleGeometry(.16, 32), new THREE.MeshStandardMaterial({ color: 0xb08060, roughness: .15, metalness: .7, transparent: true }));
iSeal.position.set(0, .05, .085);
iSeal.userData.noOutline = true;
envGroup.add(iSeal);

// Edge lines
const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
envGroup.traverse((child) => {
  if (child.isMesh && !child.userData.noOutline) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry), edgeMat);
    child.add(edges);
  }
});

// ===== MOUSE / TOUCH INTERACTION =====
let isDragging = false, lastMouse = { x: 0, y: 0 }, targetRot = { x: 0, y: 0 }, currentRot = { x: 0, y: 0 };
let opened = false, animating = false;

container.addEventListener('mousedown', e => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY } });
document.addEventListener('mousemove', e => {
  if (!isDragging || opened) return;
  targetRot.y += (e.clientX - lastMouse.x) * .01;
  targetRot.x += (e.clientY - lastMouse.y) * .01;
  lastMouse = { x: e.clientX, y: e.clientY };
});
document.addEventListener('mouseup', () => isDragging = false);
container.addEventListener('touchstart', e => { lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; isDragging = true }, { passive: true });
document.addEventListener('touchmove', e => {
  if (!isDragging || opened) return;
  targetRot.y += (e.touches[0].clientX - lastMouse.x) * .01;
  targetRot.x += (e.touches[0].clientY - lastMouse.y) * .01;
  lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.addEventListener('touchend', () => isDragging = false);

let clickStart = { x: 0, y: 0 };
container.addEventListener('mousedown', e => { clickStart = { x: e.clientX, y: e.clientY } });
container.addEventListener('click', e => {
  const dist = Math.hypot(e.clientX - clickStart.x, e.clientY - clickStart.y);
  if (dist < 5 && !opened && !animating) openEnvelope();
});
container.addEventListener('touchend', e => {
  const touch = e.changedTouches[0];
  const dist = Math.hypot(touch.clientX - clickStart.x, touch.clientY - clickStart.y);
  if (dist < 10 && !opened && !animating) openEnvelope();
});

// ===== ANIMATION STATE =====
let phase = 'idle'; // idle | snapping | opening | card | done
let phaseProgress = 0;
let floatTime = 0;

function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpAngle(a, b, t) { return a + (b - a) * t; }

function openEnvelope() {
  opened = true; animating = true; phase = 'snapping';
  targetRot.x = 0; targetRot.y = 0;
  // Hide hint immediately
  const hint = document.getElementById('envelope-hint');
  if (hint) hint.classList.add('hidden');
}

// ===== MAIN RENDER LOOP =====
function animate() {
  requestAnimationFrame(animate);

  // Animate lighting in a horizontal arc (left and right around the front)
  const time = Date.now() * 0.002;
  const angle = Math.sin(time * 0.4) * 1.5; // Swings back and forth smoothly
  dirLight.position.x = Math.sin(angle) * 6;
  dirLight.position.y = 2; // Fixed height, no up/down motion
  dirLight.position.z = Math.cos(angle) * 4; // Arcs around the Z axis

  // Smooth rotation
  currentRot.x = lerpAngle(currentRot.x, targetRot.x, .08);
  currentRot.y = lerpAngle(currentRot.y, targetRot.y, .08);
  envGroup.rotation.x = currentRot.x;
  envGroup.rotation.y = currentRot.y;

  if (phase === 'idle') {
    // Gentle float
    floatTime += 0.016;
    envGroup.position.y = Math.sin(floatTime * 1.0) * 0.08;

  } else if (phase === 'snapping') {
    // Wait for rotation to snap back to center
    const snapDone = Math.abs(currentRot.x) < 0.015 && Math.abs(currentRot.y) < 0.015;
    if (snapDone) {
      phase = 'opening';
      phaseProgress = 0;
    }

  } else if (phase === 'opening') {
    // Phase 1: Fade out seal + open top flap + card slides up
    phaseProgress = Math.min(phaseProgress + 0.012, 1);
    const ep = easeInOut(phaseProgress);

    // 1a — seal fades out in first 30%
    const sealFade = Math.max(0, 1 - phaseProgress / 0.3);
    sealMat.opacity = sealFade;
    iSeal.material.opacity = sealFade;

    // 1b — flap opens
    const flapTarget = -Math.PI * 0.95;
    topFlapPivot.rotation.x = lerp(-0.01, flapTarget, easeInOut(Math.min(phaseProgress / 0.8, 1)));

    // 1c — at 60%, start fading envelope wrapper down
    if (phaseProgress > 0.6) {
      const wrapper = document.getElementById('envelope-wrapper');
      if (wrapper && !wrapper.classList.contains('opening')) {
        wrapper.classList.add('opening');
      }
    }

    if (phaseProgress >= 1) {
      phase = 'done';
      transitionToSite();
    }
  }

  renderer.render(scene, camera);
}
animate();

// ===== FULLSCREEN =====
function requestFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
    req.call(el).catch(() => { }); // silently ignore if denied
  }
}

// ===== ENTRANCE ANIMATION =====
// Force top of page on every load (prevents scroll carry-over)
window.scrollTo(0, 0);
history.scrollRestoration = 'manual';

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
  setTimeout(() => {
    const wrapper = document.getElementById('envelope-wrapper');
    if (wrapper) wrapper.classList.add('entered');
  }, 300);
});

// Request fullscreen on first interaction (browsers require a user gesture)
const envScreen = document.getElementById('envelope-screen');
function onFirstInteraction() {
  requestFullscreen();
  envScreen.removeEventListener('click', onFirstInteraction);
  envScreen.removeEventListener('touchstart', onFirstInteraction);
}
envScreen.addEventListener('click', onFirstInteraction);
envScreen.addEventListener('touchstart', onFirstInteraction, { passive: true });

// ===== TRANSITION TO SITE =====
function transitionToSite() {
  const envScreen = document.getElementById('envelope-screen');
  setTimeout(() => {
    envScreen.classList.add('exit');
    setTimeout(() => {
      window.scrollTo(0, 0);
      envScreen.style.display = 'none';
      document.getElementById('main-site').classList.add('visible');
      setupScrollReveal();
      setTimeout(adjustTimelineLine, 50);
    }, 1400);
  }, 1200);
}

// ===== SCROLL REVEAL =====
function setupScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), i * 80) }
    });
  }, { threshold: .12 });
  els.forEach(el => observer.observe(el));
  setTimeout(() => {
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * .9) el.classList.add('in');
    });
  }, 100);
}

// ===== TIMELINE LINE ADJUSTMENT =====
function adjustTimelineLine() {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;
  const dots = timeline.querySelectorAll('.timeline-dot');
  if (dots.length < 2) return;
  const firstDot = dots[0];
  const lastDot = dots[dots.length - 1];
  const timelineRect = timeline.getBoundingClientRect();
  const firstDotRect = firstDot.getBoundingClientRect();
  const lastDotRect = lastDot.getBoundingClientRect();
  const topOffset = firstDotRect.top - timelineRect.top + (firstDotRect.height / 2);
  const bottomOffset = lastDotRect.top - timelineRect.top + (lastDotRect.height / 2);
  timeline.style.setProperty('--line-top', `${topOffset}px`);
  timeline.style.setProperty('--line-height', `${bottomOffset - topOffset}px`);
}

window.addEventListener('resize', adjustTimelineLine);
