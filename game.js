'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const distToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    const M = 20;
    if (this.ttl <= 0 || this.x < -M || this.x > W + M || this.y < -M || this.y > H + M)
      this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp (velocidad) ───────────────────────────────────────────────────────
const BOOST_DURATION      = 3;
const BOOST_MULT          = 2;
const TRIPLE_DURATION     = 5;
const TRIPLE_SPREAD       = 0.2;   // rad por lado
const POWERUP_SPAWN_CHANCE = 0.15;
const POWERUP_TTL         = 10;

class PowerUp {
  constructor(x, y, type = Math.random() < 0.5 ? 'speed' : 'triple') {
    this.x     = x;
    this.y     = y;
    this.radius = 14;
    this.type  = type;
    this.ttl   = POWERUP_TTL;
    this.angle = 0;
    this.dead  = false;
  }

  update(dt) {
    this.ttl   -= dt;
    this.angle += dt * 3;
    this.y += Math.sin(this.angle) * 0.5;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Brillo sutil
    ctx.strokeStyle = this.type === 'speed' ? 'rgba(255, 204, 0, 0.3)' : 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    if (this.type === 'speed') {
      // Rayo amarillo
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 2, -12);
      ctx.lineTo(-5,  1);
      ctx.lineTo(-1,  1);
      ctx.lineTo(-2,  12);
      ctx.lineTo( 6, -2);
      ctx.lineTo( 2, -2);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Tres líneas divergentes (abanico) en cian
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      for (const a of [-0.45, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - Math.PI / 2) * 4, Math.sin(a - Math.PI / 2) * 4);
        ctx.lineTo(Math.cos(a - Math.PI / 2) * 12, Math.sin(a - Math.PI / 2) * 12);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKINS = [
  { nombre: 'CLÁSICA',   color: '#fff',    llama: 'rgba(255,130,0,0.85)' },
  { nombre: 'ESMERALDA', color: '#3aff8c', llama: 'rgba(58,255,140,0.85)' },
  { nombre: 'MAGENTA',   color: '#ff5bd6', llama: 'rgba(255,91,214,0.85)' },
  { nombre: 'SOLAR',     color: '#ffcc00', llama: 'rgba(255,160,0,0.95)' },
];
let skinIndex = 0;
let skinAviso = 0;   // segundos restantes para mostrar el nombre en el HUD

function cargarSkin() {
  try {
    const i = parseInt(localStorage.getItem('asteroids_skin'), 10);
    if (Number.isInteger(i) && i >= 0 && i < SKINS.length) skinIndex = i;
  } catch { /* localStorage no disponible */ }
}

function guardarSkin() {
  try { localStorage.setItem('asteroids_skin', String(skinIndex)); } catch { }
}

const skin = () => SKINS[skinIndex];

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.speedBoost > 0 ? 260 * BOOST_MULT : 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0)
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const boosting = this.speedBoost > 0;
    ctx.strokeStyle = boosting ? '#ffcc00' : skin().color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14) * (boosting ? 1.6 : 1), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosting ? 'rgba(255, 204, 0, 0.95)' : skin().llama;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_SCORE   = [0, 50, 150];    // puntos por tamaño
const STAR_CAP_LEN = [0, 55, 95];     // longitud de la cápsula de colisión

class ShootingStar {
  constructor(x, y, angle, size = 2) {
    this.x     = x;
    this.y     = y;
    this.angle = angle;
    this.size  = size;

    const speed = size === 2 ? rand(220, 360) : rand(150, 260);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.headR    = size === 2 ? 5 : 3;
    this.life     = size === 2 ? rand(2.2, 3.5) : rand(1.5, 2.2);
    this.ttl      = this.life;
    this.trail    = [];
    this.trailMax = size === 2 ? 22 : 14;
    this.dead     = false;
  }

  static spawn(ship) {
    // Punto al azar sobre un borde al azar de la pantalla
    const edges = [
      () => [rand(0, W), -20],      // superior
      () => [rand(0, W), H + 20],   // inferior
      () => [-20, rand(0, H)],      // izquierdo
      () => [W + 20, rand(0, H)],   // derecho
    ];
    let x, y;
    do {
      [x, y] = edges[randInt(0, edges.length - 1)]();
    } while (ship && dist({ x, y }, ship) < 140);

    // Ángulo hacia un punto aleatorio de la zona central: trayectoria distinta cada vez
    const tx = rand(W * 0.2, W * 0.8);
    const ty = rand(H * 0.2, H * 0.8);
    return new ShootingStar(x, y, Math.atan2(ty - y, tx - x), 2);
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new ShootingStar(this.x, this.y, this.angle + rand(0.3, 0.6), 1),
      new ShootingStar(this.x, this.y, this.angle - rand(0.3, 0.6), 1),
    ];
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;

    this.trail.push([this.x, this.y]);
    if (this.trail.length > this.trailMax) this.trail.shift();

    const M = 40;
    const off = this.x < -M || this.x > W + M || this.y < -M || this.y > H + M;
    if (this.ttl <= 0 || off) this.dead = true;
  }

  collides(px, py, pad) {
    const len = STAR_CAP_LEN[this.size];
    const tx = this.x - Math.cos(this.angle) * len;
    const ty = this.y - Math.sin(this.angle) * len;
    return distToSegment(px, py, this.x, this.y, tx, ty) < this.headR + pad;
  }

  draw() {
    // Cabeza brillante
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.03, this.y - this.vy * 0.03);
    ctx.stroke();

    // Estela que se desvanece hacia la cola
    for (let i = 0; i < this.trail.length - 1; i++) {
      const t = i / this.trail.length;
      ctx.strokeStyle = `rgba(255,255,255,${(t * 0.55).toFixed(2)})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.trail[i][0], this.trail[i][1]);
      ctx.lineTo(this.trail[i + 1][0], this.trail[i + 1][1]);
      ctx.stroke();
    }
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer, shootingStarTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function updateShootingStars(dt) {
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    shootingStars.push(ShootingStar.spawn(ship));
    shootingStarTimer = 6;
  }
  shootingStars.forEach(s => s.update(dt));
  shootingStars = shootingStars.filter(s => !s.dead);
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  shootingStarTimer = 6;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (skinAviso > 0) skinAviso -= dt;

  // Cambiar de skin
  if (pressed('KeyS')) {
    skinIndex = (skinIndex + 1) % SKINS.length;
    guardarSkin();
    skinAviso = 1.5;
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    updateShootingStars(dt);
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    updateShootingStars(dt);
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));
  updateShootingStars(dt);

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (powerUps.length === 0 && Math.random() < POWERUP_SPAWN_CHANCE)
          powerUps.push(new PowerUp(a.x, a.y));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  const newStars = [];
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && s.collides(b.x, b.y, 3)) {
        b.dead = true;
        s.dead = true;
        score += STAR_SCORE[s.size];
        explode(s.x, s.y, s.size * 5);
        newStars.push(...s.split());
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead).concat(newStars);
  bullets       = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs estrella fugaz
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      if (s.collides(ship.x, ship.y, ship.radius)) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-ups (velocidad / triple shot)
  for (const p of powerUps) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'speed') ship.speedBoost = BOOST_DURATION;
      else                    ship.tripleShot = TRIPLE_DURATION;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin().color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  if (ship.speedBoost > 0) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillText(`VELOCIDAD ×${BOOST_MULT}  ${ship.speedBoost.toFixed(1)}s`, W / 2, 44);
  }

  if (ship.tripleShot > 0) {
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`TRIPLE SHOT  ${ship.tripleShot.toFixed(1)}s`, W / 2, ship.speedBoost > 0 ? 64 : 44);
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (skinAviso > 0) {
    ctx.globalAlpha = Math.min(1, skinAviso / 0.5);
    ctx.fillStyle   = skin().color;
    ctx.fillText(`NAVE: ${skin().nombre}`, W / 2, 62);
    ctx.globalAlpha = 1;
  }

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  shootingStars.forEach(s => s.draw());
  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

cargarSkin();
initGame();
requestAnimationFrame(loop);
