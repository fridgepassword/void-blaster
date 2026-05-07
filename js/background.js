// ===== Parallax star field + nebula clouds =====
const stars = [];
const STAR_COUNT = 240;

const nebulaClouds = [];
const NEBULA_COUNT = 5;

function initBackground(w, h) {
  stars.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: rand(0, w),
      y: rand(0, h),
      z: rand(0.15, 1),     // depth — controls size & parallax speed
      tw: rand(0, TAU),     // twinkle phase
      twSpeed: rand(0.8, 2.5),
      hue: rand() < 0.85 ? 0 : (rand() < 0.5 ? 200 : 30), // most white, some blue/orange
    });
  }
  nebulaClouds.length = 0;
  const palette = [
    { r: 120, g: 60, b: 200 },
    { r: 40, g: 80, b: 200 },
    { r: 200, g: 50, b: 120 },
    { r: 50, g: 150, b: 200 },
    { r: 80, g: 30, b: 150 },
  ];
  for (let i = 0; i < NEBULA_COUNT; i++) {
    const c = palette[i % palette.length];
    nebulaClouds.push({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(280, 500),
      drift: rand(0, TAU),
      driftSpeed: rand(0.05, 0.15),
      driftRadius: rand(40, 80),
      color: c,
      alpha: rand(0.08, 0.18),
    });
  }
}

function updateStars(dt, w, h, cameraVx = 0, cameraVy = 0) {
  for (const s of stars) {
    s.x -= cameraVx * s.z * dt;
    s.y -= cameraVy * s.z * dt;
    if (s.x < 0) s.x += w;
    if (s.x > w) s.x -= w;
    if (s.y < 0) s.y += h;
    if (s.y > h) s.y -= h;
    s.tw += s.twSpeed * dt;
  }
}

function drawNebula(ctx, w, h, time) {
  ctx.save();
  for (const c of nebulaClouds) {
    const dx = c.x + Math.cos(c.drift + time * c.driftSpeed) * c.driftRadius;
    const dy = c.y + Math.sin(c.drift + time * c.driftSpeed * 1.2) * c.driftRadius;
    const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, c.r);
    const { r, g, b } = c.color;
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${c.alpha})`);
    grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${c.alpha * 0.4})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawStars(ctx) {
  for (const s of stars) {
    const tw = (Math.sin(s.tw) + 1) * 0.4 + 0.3; // 0.3 to 1.1
    const size = s.z * 1.6 * tw;
    const alpha = clamp(s.z * tw, 0.1, 1);
    if (s.hue === 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    } else if (s.hue === 200) {
      ctx.fillStyle = `rgba(180, 220, 255, ${alpha})`;
    } else {
      ctx.fillStyle = `rgba(255, 220, 160, ${alpha})`;
    }
    // larger bright stars get a subtle glow
    if (s.z > 0.75) {
      ctx.shadowBlur = 4;
      ctx.shadowColor = ctx.fillStyle;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
  }
  ctx.shadowBlur = 0;
}

// Decorative ships zipping across title screen
const titleShips = [];

function spawnTitleShip(w, h) {
  const fromLeft = Math.random() < 0.5;
  const y = rand(50, h - 50);
  const speed = rand(150, 350);
  titleShips.push({
    x: fromLeft ? -30 : w + 30,
    y,
    vx: fromLeft ? speed : -speed,
    color: randChoice(['#88ddff', '#ff88aa', '#ffaa44', '#88ff99']),
    size: rand(6, 10),
  });
}

function updateTitleShips(dt, w, h) {
  if (Math.random() < dt * 0.6) spawnTitleShip(w, h);
  for (let i = titleShips.length - 1; i >= 0; i--) {
    const s = titleShips[i];
    s.x += s.vx * dt;
    if (Math.random() < 0.3) {
      thrustParticle(
        s.x - Math.sign(s.vx) * s.size,
        s.y,
        -s.vx * 0.3, 0,
        0.6
      );
    }
    if (s.x < -50 || s.x > w + 50) titleShips.splice(i, 1);
  }
}

function drawTitleShips(ctx) {
  for (const s of titleShips) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.vx > 0 ? 0 : Math.PI);
    ctx.shadowBlur = 12;
    ctx.shadowColor = s.color;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(s.size, 0);
    ctx.lineTo(-s.size * 0.7, s.size * 0.6);
    ctx.lineTo(-s.size * 0.4, 0);
    ctx.lineTo(-s.size * 0.7, -s.size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
