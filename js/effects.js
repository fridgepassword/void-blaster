// ===== Visual feedback: particles, screen shake, hit-stop, flashes, floating text =====
const particles = [];
const floatingTexts = [];
const screenShake = { intensity: 0, duration: 0 };
const screenFlash = { r: 255, g: 255, b: 255, alpha: 0, decay: 0 };
let hitstop = 0;

function addParticle(x, y, opts = {}) {
  particles.push({
    x, y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    life: opts.life ?? 0.5,
    maxLife: opts.life ?? 0.5,
    size: opts.size ?? 3,
    color: opts.color ?? '#fff',
    drag: opts.drag ?? 2,
    fade: opts.fade !== false,
    shrink: opts.shrink !== false,
    glow: opts.glow ?? true,
    gravity: opts.gravity ?? 0,
  });
}

function explosion(x, y, color = '#ff8844', count = 20, speed = 250, life = 0.6) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const s = rand(speed * 0.3, speed);
    addParticle(x, y, {
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color,
      life: rand(life * 0.5, life),
      size: rand(2.5, 5),
      drag: 3,
    });
  }
  // Bright core flash
  for (let i = 0; i < count / 4; i++) {
    const a = rand(0, TAU);
    const s = rand(speed * 0.1, speed * 0.5);
    addParticle(x, y, {
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color: '#ffffff',
      life: rand(0.1, 0.25),
      size: rand(2, 4),
      drag: 3,
    });
  }
}

function spark(x, y, color = '#fff', count = 6, speed = 200) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const s = rand(speed * 0.4, speed);
    addParticle(x, y, {
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      color,
      life: rand(0.15, 0.35),
      size: rand(1.5, 3),
      drag: 4,
    });
  }
}

function thrustParticle(x, y, dirX, dirY, intensity = 1) {
  const spread = 0.5;
  const ang = Math.atan2(dirY, dirX) + rand(-spread, spread);
  const speed = rand(80, 180) * intensity;
  addParticle(x, y, {
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    color: rand() < 0.4 ? '#ffffff' : (rand() < 0.5 ? '#88ddff' : '#4488ff'),
    life: rand(0.18, 0.35),
    size: rand(2, 4) * intensity,
    drag: 5,
  });
}

function bulletTrail(x, y, color) {
  addParticle(x, y, {
    vx: rand(-20, 20),
    vy: rand(-20, 20),
    color,
    life: rand(0.1, 0.2),
    size: rand(1, 2),
    drag: 6,
  });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx = decay(p.vx, p.drag, dt);
    p.vy = decay(p.vy, p.drag, dt);
    p.vy += p.gravity * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    const t = p.life / p.maxLife;
    const alpha = p.fade ? t : 1;
    const size = p.shrink ? Math.max(0, p.size * t) : p.size;
    if (size <= 0) continue;
    if (p.glow) {
      ctx.shadowBlur = size * 4;
      ctx.shadowColor = p.color;
    }
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ===== Floating damage / score numbers =====
function addFloatingText(x, y, text, color = '#fff', size = 14) {
  floatingTexts.push({
    x: x + rand(-8, 8),
    y, text, color, size,
    vy: -60,
    life: 0.9,
    maxLife: 0.9,
  });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y += t.vy * dt;
    t.vy = decay(t.vy, 1.5, dt);
    t.life -= dt;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }
}

function drawFloatingTexts(ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of floatingTexts) {
    const tt = t.life / t.maxLife;
    ctx.globalAlpha = Math.min(1, tt * 1.4);
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px "Courier New", monospace`;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

// ===== Screen shake =====
function shake(intensity, duration) {
  if (intensity > screenShake.intensity) screenShake.intensity = intensity;
  if (duration > screenShake.duration) screenShake.duration = duration;
}

function updateShake(dt) {
  if (screenShake.duration > 0) {
    screenShake.duration -= dt;
    if (screenShake.duration <= 0) {
      screenShake.intensity = 0;
      screenShake.duration = 0;
    }
  }
}

function applyShake(ctx) {
  if (screenShake.intensity > 0 && screenShake.duration > 0) {
    const i = screenShake.intensity;
    ctx.translate(rand(-i, i), rand(-i, i));
  }
}

// ===== Screen flash =====
function flash(r, g, b, alpha, decayRate = 2) {
  if (alpha > screenFlash.alpha) {
    screenFlash.r = r;
    screenFlash.g = g;
    screenFlash.b = b;
    screenFlash.alpha = alpha;
    screenFlash.decay = decayRate;
  }
}

function updateFlash(dt) {
  if (screenFlash.alpha > 0) {
    screenFlash.alpha -= screenFlash.decay * dt;
    if (screenFlash.alpha < 0) screenFlash.alpha = 0;
  }
}

function drawFlash(ctx, w, h) {
  if (screenFlash.alpha > 0) {
    ctx.fillStyle = `rgba(${screenFlash.r}, ${screenFlash.g}, ${screenFlash.b}, ${screenFlash.alpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// ===== Hit-stop (brief freeze frame for impact) =====
function setHitstop(duration) {
  if (duration > hitstop) hitstop = duration;
}
