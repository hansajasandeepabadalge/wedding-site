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
for (let i = 0; i < 30; i++)particles.push(createParticle());
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
const envMat = new THREE.MeshStandardMaterial({ color: 0x8c283a, roughness: .4, metalness: .05, side: THREE.DoubleSide });
const flapMat = new THREE.MeshStandardMaterial({ color: 0x9c3547, roughness: .35, metalness: .08, side: THREE.DoubleSide });
const liningMat = new THREE.MeshStandardMaterial({ color: 0x802030, roughness: .5, metalness: 0, side: THREE.DoubleSide });
const sealMat = new THREE.MeshStandardMaterial({ color: 0xd4a04a, roughness: .2, metalness: .6, side: THREE.DoubleSide });

// Envelope body
const bodyGeo = new THREE.BoxGeometry(2.8, 1.8, .05, 1, 1, 1);
const body = new THREE.Mesh(bodyGeo, envMat);
envGroup.add(body);

// Bottom flap (tucked behind)
const bShape = new THREE.Shape();
bShape.moveTo(-1.4, -0.9);
bShape.lineTo(1.4, -0.9);
bShape.lineTo(0, 0.1);
bShape.closePath();
const bGeo = new THREE.ShapeGeometry(bShape);
const bFlap = new THREE.Mesh(bGeo, liningMat); bFlap.position.z = .03; envGroup.add(bFlap);

// Left flap (in front)
const lShape = new THREE.Shape();
lShape.moveTo(-1.4, -0.9);
lShape.lineTo(-1.4, .9);
lShape.lineTo(0, 0.1);
lShape.closePath();
const lFlap = new THREE.Mesh(new THREE.ShapeGeometry(lShape), liningMat); lFlap.position.z = .03; envGroup.add(lFlap);

// Right flap (in front)
const rShape = new THREE.Shape();
rShape.moveTo(1.4, -0.9);
rShape.lineTo(1.4, .9);
rShape.lineTo(0, 0.1);
rShape.closePath();
const rFlap = new THREE.Mesh(new THREE.ShapeGeometry(rShape), liningMat); rFlap.position.z = .03; envGroup.add(rFlap);

// Top flap
const tShape = new THREE.Shape();
tShape.moveTo(-1.4, .9);
tShape.lineTo(1.4, .9);
tShape.lineTo(0, 0);
tShape.closePath();
const topFlapGeo = new THREE.ShapeGeometry(tShape);
const topFlapPivot = new THREE.Group();
topFlapPivot.position.set(0, .9, .03);
topFlapPivot.rotation.x = -0.01;
envGroup.add(topFlapPivot);
const topFlapMesh = new THREE.Mesh(topFlapGeo, flapMat);
topFlapMesh.position.set(0, -.9, 0);
topFlapPivot.add(topFlapMesh);

// Wax seal
const sealGeo = new THREE.CircleGeometry(.22, 32);
const seal = new THREE.Mesh(sealGeo, sealMat); seal.position.set(0, 0.05, .08); envGroup.add(seal);
const innerSeal = new THREE.CircleGeometry(.16, 32);
const iSeal = new THREE.Mesh(innerSeal, new THREE.MeshStandardMaterial({ color: 0xb8862a, roughness: .15, metalness: .7 }));
iSeal.position.set(0, .05, .085); envGroup.add(iSeal);

// Edge lines (black outlines)
const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, linewidth: 1 });
envGroup.traverse((child) => {
  if (child.isMesh && !child.userData.noOutline) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry), edgeMat);
    child.add(edges);
  }
});

// Mouse interaction
let isDragging = false, lastMouse = { x: 0, y: 0 }, targetRot = { x: 0, y: 0 }, currentRot = { x: 0, y: 0 };
let opened = false, animating = false;

container.addEventListener('mousedown', e => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY } });
document.addEventListener('mousemove', e => {
  if (!isDragging || opened) return;
  const dx = (e.clientX - lastMouse.x) * .01;
  const dy = (e.clientY - lastMouse.y) * .01;
  targetRot.y += dx; targetRot.x += dy;
  lastMouse = { x: e.clientX, y: e.clientY };
});
document.addEventListener('mouseup', () => isDragging = false);

container.addEventListener('touchstart', e => { lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; isDragging = true }, { passive: true });
document.addEventListener('touchmove', e => {
  if (!isDragging || opened) return;
  const dx = (e.touches[0].clientX - lastMouse.x) * .01;
  const dy = (e.touches[0].clientY - lastMouse.y) * .01;
  targetRot.y += dx; targetRot.x += dy;
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
  if (!animating && !opened && isDragging === false) {
    const touch = e.changedTouches[0];
    const dist = Math.hypot(touch.clientX - clickStart.x, touch.clientY - clickStart.y);
    if (dist < 10) openEnvelope();
  }
});

let openProgress = 0;
function openEnvelope() {
  const docEl = document.documentElement;
  const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;

  // if (requestFS && !document.fullscreenElement && !document.webkitFullscreenElement) {
  //   requestFS.call(docEl).catch(err => console.log("Fullscreen not supported:", err));
  // }
  opened = true; animating = true;
  // First snap back to default orientation
  targetRot.x = 0; targetRot.y = 0;
}

function lerpAngle(a, b, t) { return a + (b - a) * t; }
let flapAngle = 0;
let transitionDelay = 0;

function animate() {
  requestAnimationFrame(animate);
  // Smooth rotation
  currentRot.x = lerpAngle(currentRot.x, targetRot.x, .08);
  currentRot.y = lerpAngle(currentRot.y, targetRot.y, .08);
  envGroup.rotation.x = currentRot.x;
  envGroup.rotation.y = currentRot.y;

  // Envelope opening animation
  if (opened) {
    const snapDone = Math.abs(currentRot.x) < 0.01 && Math.abs(currentRot.y) < 0.01;
    if (snapDone) {
      openProgress = Math.min(openProgress + .018, 1);
      flapAngle = lerpAngle(0.15, -Math.PI * 0.95, openProgress);
      topFlapPivot.rotation.x = flapAngle;
      // Scale up and fly away
      if (openProgress > 0.8) {
        const t = (openProgress - .8) / .2;
        envGroup.scale.setScalar(1 + t * 0.3);
        envGroup.position.y = t * 1.5;
        renderer.domElement.style.opacity = 1 - t;
      }
      if (openProgress >= 1) {
        animating = false;
        transitionToSite();
      }
    }
  }
  // Float animation (only when not opened)
  if (!opened) {
    envGroup.position.y = Math.sin(Date.now() * .001) * .08;
  }
  renderer.render(scene, camera);
}
animate();

function transitionToSite() {
  const envScreen = document.getElementById('envelope-screen');
  envScreen.classList.add('exit');
  setTimeout(() => {
    envScreen.style.display = 'none';
    document.getElementById('main-site').classList.add('visible');
    setupScrollReveal();
    setTimeout(adjustTimelineLine, 50);
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
  // Trigger visible ones immediately
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
  const height = bottomOffset - topOffset;
  
  timeline.style.setProperty('--line-top', `${topOffset}px`);
  timeline.style.setProperty('--line-height', `${height}px`);
}

window.addEventListener('resize', adjustTimelineLine);
