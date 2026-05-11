// ===== Player and enemy bullets =====
class Bullet {
  constructor(x, y, ang, speed, damage, opts = {}) {
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.speed = speed;
    this.vx = Math.cos(ang) * speed;
    this.vy = Math.sin(ang) * speed;
    this.damage = damage;
    this.size = opts.size ?? 4;
    this.pierce = opts.pierce ?? 0;
    this.isCrit = opts.isCrit ?? false;
    this.explode = opts.explode ?? 0;
    this.homing = opts.homing ?? 0;
    this.bouncy = opts.bouncy ?? 0;
    this.frost = !!opts.frost;
    this.burnDps = opts.burnDps ?? 0;
    this.burnDuration = opts.burnDuration ?? 0;
    this.splashChain = opts.splashChain ?? 0;
    this.doppler = !!opts.doppler;     // clone on first hit
    this.dopplerSpawned = false;
    this.life = opts.life ?? 2.2;
    this.dead = false;
    this.hitEnemies = new Set();
    this.trail = [];
    this.trailTimer = 0;
  }

  update(dt, w, h, enemies) {
    // Homing
    if (this.homing > 0) {
      let nearest = null;
      let nearestD = 320 * 320;
      for (const e of enemies) {
        if (e.spawnAnim > 0) continue;
        if (this.hitEnemies.has(e)) continue;
        const d = distSq(this.x, this.y, e.x, e.y);
        if (d < nearestD) {
          nearestD = d;
          nearest = e;
        }
      }
      if (nearest) {
        const targetAng = angleBetween(this.x, this.y, nearest.x, nearest.y);
        const cur = Math.atan2(this.vy, this.vx);
        const newAng = lerpAngle(cur, targetAng, this.homing * dt);
        this.vx = Math.cos(newAng) * this.speed;
        this.vy = Math.sin(newAng) * this.speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Trail
    this.trailTimer += dt;
    if (this.trailTimer > 0.015) {
      this.trailTimer = 0;
      this.trail.push({ x: this.x, y: this.y, life: 0.18, max: 0.18 });
      if (this.trail.length > 10) this.trail.shift();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }

    // Bounce off walls
    if (this.bouncy > 0) {
      let bounced = false;
      if (this.x < this.size) { this.vx = Math.abs(this.vx); this.x = this.size; bounced = true; }
      else if (this.x > w - this.size) { this.vx = -Math.abs(this.vx); this.x = w - this.size; bounced = true; }
      if (this.y < this.size) { this.vy = Math.abs(this.vy); this.y = this.size; bounced = true; }
      else if (this.y > h - this.size) { this.vy = -Math.abs(this.vy); this.y = h - this.size; bounced = true; }
      if (bounced) {
        this.bouncy--;
        spark(this.x, this.y, this.isCrit ? '#ffff66' : '#88ddff', 4, 150);
      }
    } else {
      const m = 50;
      if (this.x < -m || this.x > w + m || this.y < -m || this.y > h + m) this.dead = true;
    }

    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  hit(enemy, enemies) {
    this.hitEnemies.add(enemy);
    if (this.pierce > 0) {
      this.pierce--;
      // Lose a bit of damage on pierce
      this.damage *= 0.85;
    } else {
      if (this.explode > 0) {
        const radius = 70 + this.explode * 10;
        explosion(this.x, this.y, '#ffaa44', 18, 280, 0.45);
        sfxExplosion();
        shake(6, 0.15);
        for (const e of enemies) {
          if (e === enemy || e.spawnAnim > 0) continue;
          if (distSq(this.x, this.y, e.x, e.y) < radius * radius) {
            e.takeDamage(this.damage * 0.5, this.x, this.y);
          }
        }
      }
      this.dead = true;
    }
  }

  draw(ctx) {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const tt = t.life / t.max;
      const sz = this.size * tt * (i / this.trail.length);
      if (sz <= 0) continue;
      ctx.globalAlpha = tt * 0.6;
      ctx.fillStyle = this.isCrit ? '#ffee44' : '#66bbff';
      ctx.shadowBlur = sz * 3;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(t.x, t.y, sz, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Main bullet — bright white core, colored glow
    const coreColor = this.isCrit ? '#ffff66' : '#ffffff';
    const glowColor = this.isCrit ? '#ffaa00' : '#00ddff';
    ctx.shadowBlur = this.size * 5;
    ctx.shadowColor = glowColor;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = this.size * 2;
    ctx.shadowColor = coreColor;
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.55, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class EnemyBullet {
  constructor(x, y, ang, speed, damage, color = '#ff66ff') {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(ang) * speed;
    this.vy = Math.sin(ang) * speed;
    this.damage = damage;
    this.size = 6;
    this.color = color;
    this.life = 4.5;
    this.dead = false;
    this.spin = 0;
  }

  update(dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 6;
    const m = 60;
    if (this.x < -m || this.x > w + m || this.y < -m || this.y > h + m) this.dead = true;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.shadowBlur = 14;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    // Diamond shape for enemy bullets
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(this.size, 0);
    ctx.lineTo(0, this.size);
    ctx.lineTo(-this.size, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.35, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }
}
