// ===== Enemy types =====
class Enemy {
  constructor(x, y, opts = {}) {
    const pf = (window.__phoneFactor && window.__phoneFactor()) || 1;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.maxHp = opts.hp ?? 20;
    this.hp = this.maxHp;
    this.radius = (opts.radius ?? 14) * pf;
    this.speed = (opts.speed ?? 90) * Math.sqrt(pf);  // matches player speed scaling
    this.damage = opts.damage ?? 12;
    this.color = opts.color ?? '#ff4444';
    this.outline = opts.outline ?? '#ffffff';
    this.scoreValue = opts.score ?? 10;
    this.creditsValue = opts.credits ?? 1;
    this.contactCooldown = 0;
    this.dead = false;
    this.hitFlash = 0;
    this.spawnAnim = 0.6;
    this.angle = rand(0, TAU);
    this.spinRate = rand(-1, 1);
    this.type = opts.type ?? 'grunt';
    this.knockX = 0;
    this.knockY = 0;
    this.scaleP = 1;
    // Status effects
    this.slowTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.burnTickTimer = 0;
  }

  update(dt, player, enemies, enemyBullets) {
    if (this.spawnAnim > 0) {
      this.spawnAnim -= dt;
      return;
    }

    // Burn DoT
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.hp -= this.burnDps * dt;
      this.burnTickTimer += dt;
      if (this.burnTickTimer > 0.08) {
        this.burnTickTimer = 0;
        addParticle(this.x + rand(-this.radius, this.radius), this.y + rand(-this.radius, 0), {
          vx: rand(-20, 20), vy: rand(-80, -40),
          color: rand() < 0.5 ? '#ff8844' : '#ffaa44',
          life: 0.4, size: rand(2, 4), drag: 4,
        });
      }
      if (this.hp <= 0) { this.die(); return; }
    }

    // Slow effect — temporarily scale down speed during behave
    let speedMod = 1;
    if (this.slowTimer > 0) { this.slowTimer -= dt; speedMod *= 0.45; }
    if (player && player.chronoField > 0) speedMod *= (1 - player.chronoField);

    if (speedMod !== 1) {
      const orig = this.speed;
      this.speed = orig * speedMod;
      this.behave(dt, player, enemies, enemyBullets);
      this.speed = orig;
    } else {
      this.behave(dt, player, enemies, enemyBullets);
    }

    this.x += this.knockX * dt;
    this.y += this.knockY * dt;
    this.knockX = decay(this.knockX, 6, dt);
    this.knockY = decay(this.knockY, 6, dt);
    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.angle += this.spinRate * dt;
    if (this.scaleP !== 1) this.scaleP = lerp(this.scaleP, 1, 1 - Math.pow(0.001, dt));
  }

  applyFrost(duration) { this.slowTimer = Math.max(this.slowTimer, duration); }
  applyBurn(dps, duration) {
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnTimer = Math.max(this.burnTimer, duration);
  }

  behave(dt, player) {
    const a = angleBetween(this.x, this.y, player.x, player.y);
    this.vx = Math.cos(a) * this.speed;
    this.vy = Math.sin(a) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  takeDamage(amount, fromX, fromY) {
    this.hp -= amount;
    this.hitFlash = 0.1;
    this.scaleP = 1.2;
    if (fromX !== undefined) {
      const a = angleBetween(fromX, fromY, this.x, this.y);
      const force = 180;
      this.knockX += Math.cos(a) * force;
      this.knockY += Math.sin(a) * force;
    }
    addFloatingText(this.x, this.y - this.radius - 4, `${Math.round(amount)}`, '#ffffaa', 14);
    spark(this.x, this.y, this.color, 5, 180);
    sfxHit();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    explosion(this.x, this.y, this.color, 22, 300, 0.55);
    sfxExplosion();
    shake(4, 0.12);
    setHitstop(0.02);
  }

  draw(ctx) {
    if (this.spawnAnim > 0) {
      const t = 1 - this.spawnAnim / 0.6;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.scale(easeOutBack(t), easeOutBack(t));
      this.drawShape(ctx);
      ctx.restore();
      // spawn ring
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.globalAlpha = (1 - t) * 0.6;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (2.2 - t * 1.2), 0, TAU);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleP, this.scaleP);
    ctx.rotate(this.angle);
    if (this.hitFlash > 0) {
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ffffff';
    } else if (this.slowTimer > 0) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#aaddff';
    } else if (this.burnTimer > 0) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ff8844';
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
    }
    this.drawShape(ctx);

    // Frost overlay
    if (this.slowTimer > 0) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#aaddff';
      // Re-fill the shape footprint with a translucent frost color
      ctx.fillRect(-this.radius - 2, -this.radius - 2, this.radius * 2 + 4, this.radius * 2 + 4);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // HP bar
    if (this.hp < this.maxHp && this.maxHp > 25) {
      const bw = Math.max(this.radius * 2, 30);
      const bh = 3;
      const by = this.y - this.radius - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - bw / 2, by, bw, bh);
      const ratio = this.hp / this.maxHp;
      ctx.fillStyle = ratio > 0.5 ? '#88ff88' : ratio > 0.25 ? '#ffaa44' : '#ff4444';
      ctx.fillRect(this.x - bw / 2, by, bw * ratio, bh);
    }
  }

  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = this.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// Slow basic chaser — red square
class Grunt extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 24, radius: 14, speed: 85, damage: 10,
      color: '#ff4444', score: 10, credits: 1, type: 'grunt',
    });
    this.spinRate = rand(-0.6, 0.6);
  }
  drawShape(ctx) {
    super.drawShape(ctx);
    // Inner detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    const r = this.radius * 0.4;
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }
}

// Fast wobbly weakling — pink small square
class Swarmer extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 8, radius: 8, speed: 200, damage: 7,
      color: '#ff66cc', score: 8, credits: 1, type: 'swarmer',
    });
    this.wobble = rand(0, TAU);
    this.spinRate = rand(-3, 3);
  }
  behave(dt, player) {
    const a = angleBetween(this.x, this.y, player.x, player.y);
    this.wobble += dt * 9;
    const sideA = a + Math.PI / 2;
    this.vx = Math.cos(a) * this.speed + Math.cos(sideA) * Math.sin(this.wobble) * 100;
    this.vy = Math.sin(a) * this.speed + Math.sin(sideA) * Math.sin(this.wobble) * 100;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

// Tank — slow, fat, beefy. Dark red big square
class Tank extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 100, radius: 22, speed: 50, damage: 22,
      color: '#992222', score: 35, credits: 4, type: 'tank',
    });
    this.spinRate = rand(-0.3, 0.3);
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    const r = this.radius;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = '#ff8888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-r, -r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();
    // Heavy plating crosshatch
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();
    // Inner core
    ctx.fillStyle = flash ? '#ffffff' : '#ff5555';
    const ir = r * 0.3;
    ctx.fillRect(-ir, -ir, ir * 2, ir * 2);
  }
}

// Shooter — keeps distance, fires bullets. Purple diamond
class Shooter extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 28, radius: 13, speed: 75, damage: 10,
      color: '#aa44ff', score: 22, credits: 2, type: 'shooter',
    });
    this.shootTimer = rand(1.2, 2.2);
    this.preferredRange = 280;
    this.strafeDir = rand() < 0.5 ? 1 : -1;
    this.strafeChange = rand(2, 4);
    this.spinRate = 0;
  }
  behave(dt, player, enemies, enemyBullets) {
    const d = dist(this.x, this.y, player.x, player.y);
    const a = angleBetween(this.x, this.y, player.x, player.y);
    let mv = 0;
    if (d > this.preferredRange + 40) mv = 1;
    else if (d < this.preferredRange - 40) mv = -1;
    this.vx = Math.cos(a) * this.speed * mv;
    this.vy = Math.sin(a) * this.speed * mv;
    // strafe
    this.strafeChange -= dt;
    if (this.strafeChange <= 0) {
      this.strafeDir *= -1;
      this.strafeChange = rand(1.5, 3);
    }
    const sa = a + Math.PI / 2;
    this.vx += Math.cos(sa) * this.speed * 0.7 * this.strafeDir;
    this.vy += Math.sin(sa) * this.speed * 0.7 * this.strafeDir;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && d < 600) {
      this.shootTimer = rand(1.4, 2.4);
      enemyBullets.push(new EnemyBullet(this.x, this.y, a, 240, 9, '#cc77ff'));
      sfxEnemyShoot();
      spark(this.x + Math.cos(a) * this.radius, this.y + Math.sin(a) * this.radius, '#cc77ff', 4, 100);
    }
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    const r = this.radius;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Inner eye
    ctx.fillStyle = flash ? '#ffffff' : '#ffccff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, TAU);
    ctx.fill();
  }
}

// Bomber — charges and explodes. Orange triangle
class Bomber extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 32, radius: 16, speed: 140, damage: 35,
      color: '#ff9933', score: 28, credits: 3, type: 'bomber',
    });
    this.fuse = -1;
    this.spinRate = 0;
    this.facing = 0;
  }
  behave(dt, player, enemies) {
    const d = dist(this.x, this.y, player.x, player.y);
    if (d < 90 && this.fuse < 0) {
      this.fuse = 0.55;
      sfxEnemyShoot();
    }
    if (this.fuse < 0) {
      const a = angleBetween(this.x, this.y, player.x, player.y);
      this.facing = a;
      this.vx = Math.cos(a) * this.speed;
      this.vy = Math.sin(a) * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      this.fuse -= dt;
      if (this.fuse <= 0) {
        explosion(this.x, this.y, '#ff9933', 35, 400, 0.7);
        explosion(this.x, this.y, '#ffff66', 15, 200, 0.4);
        sfxBigExplosion();
        shake(18, 0.35);
        flash(255, 180, 100, 0.25, 3);
        // damage target
        const ed = dist(this.x, this.y, player.x, player.y);
        if (ed < 120) {
          player.takeDamage(this.damage * (1 - ed / 120));
        }
        // friendly fire
        for (const e of enemies) {
          if (e !== this && distSq(this.x, this.y, e.x, e.y) < 110 * 110) {
            e.takeDamage(this.damage * 0.6, this.x, this.y);
          }
        }
        this.dead = true;
      }
    }
  }
  draw(ctx) {
    if (this.spawnAnim > 0) { super.draw(ctx); return; }
    // Override to face toward target
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleP, this.scaleP);
    ctx.rotate(this.facing);
    if (this.hitFlash > 0 || (this.fuse > 0 && Math.floor(this.fuse * 24) % 2 === 0)) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
    }
    this.drawShape(ctx);
    ctx.restore();
    if (this.hp < this.maxHp && this.maxHp > 25) {
      const bw = this.radius * 2.2;
      const bh = 3;
      const by = this.y - this.radius - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - bw / 2, by, bw, bh);
      ctx.fillStyle = '#ffaa44';
      ctx.fillRect(this.x - bw / 2, by, bw * (this.hp / this.maxHp), bh);
    }
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0 || (this.fuse > 0 && Math.floor(this.fuse * 24) % 2 === 0);
    const r = this.radius;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.7, -r * 0.9);
    ctx.lineTo(-r * 0.7, r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // bomb core
    ctx.fillStyle = flash ? '#ffffff' : '#660000';
    ctx.beginPath();
    ctx.arc(-r * 0.2, 0, r * 0.35, 0, TAU);
    ctx.fill();
  }
}

// Boss — every 5 waves
class Boss extends Enemy {
  constructor(x, y, level = 1) {
    super(x, y, {
      hp: 350 + level * 120,
      radius: 50,
      speed: 55 + level * 4,
      damage: 35,
      color: '#770077',
      outline: '#ff66ff',
      score: 250 * level,
      credits: 18 + level * 6,
      type: 'boss',
    });
    this.level = level;
    this.shootTimer = 1.5;
    this.spawnTimer = 4;
    this.dashTimer = rand(3, 5);
    this.phase = 0;
    this.spinRate = 0.6;
    this.subAngle = 0;
  }
  behave(dt, player, enemies, enemyBullets) {
    const a = angleBetween(this.x, this.y, player.x, player.y);
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > 240) {
      this.vx = Math.cos(a) * this.speed;
      this.vy = Math.sin(a) * this.speed;
    } else {
      const sa = a + Math.PI / 2;
      this.vx = Math.cos(sa) * this.speed * 0.7;
      this.vy = Math.sin(sa) * this.speed * 0.7;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.subAngle += dt * 2;

    // Phase up at low HP
    const ratio = this.hp / this.maxHp;
    if (this.phase === 0 && ratio < 0.5) {
      this.phase = 1;
      this.spinRate = 1.2;
      shake(12, 0.4);
      flash(255, 100, 255, 0.3, 2);
    }
    if (this.phase === 1 && ratio < 0.2) {
      this.phase = 2;
      this.spinRate = 2;
      shake(20, 0.5);
      flash(255, 80, 255, 0.4, 2);
    }

    // Burst fire
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.phase === 2 ? 1.0 : (this.phase === 1 ? 1.5 : 2);
      const n = 8 + this.phase * 2;
      const baseA = this.subAngle;
      for (let i = 0; i < n; i++) {
        const ba = (i / n) * TAU + baseA;
        enemyBullets.push(new EnemyBullet(this.x, this.y, ba, 200, 12, '#ff66ff'));
      }
      sfxEnemyShoot();
    }

    // Spawn minions
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.phase === 2 ? 4 : (this.phase === 1 ? 5 : 6);
      const count = 2 + this.phase;
      for (let i = 0; i < count; i++) {
        const sa = rand(0, TAU);
        const sx = this.x + Math.cos(sa) * (this.radius + 30);
        const sy = this.y + Math.sin(sa) * (this.radius + 30);
        enemies.push(new Swarmer(sx, sy));
      }
    }
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    const r = this.radius;
    // Outer
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = this.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-r, -r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();
    // Mid
    ctx.save();
    ctx.rotate(-this.subAngle);
    ctx.fillStyle = flash ? '#ffffff' : '#aa44aa';
    ctx.fillRect(-r * 0.65, -r * 0.65, r * 1.3, r * 1.3);
    ctx.restore();
    // Core
    ctx.save();
    ctx.rotate(this.subAngle * 1.5);
    ctx.fillStyle = flash ? '#ffffff' : '#ff66ff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff66ff';
    ctx.fillRect(-r * 0.32, -r * 0.32, r * 0.64, r * 0.64);
    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  draw(ctx) {
    super.draw(ctx);
    // Big HP bar at top of screen handled by HUD
  }
  die() {
    this.dead = true;
    explosion(this.x, this.y, '#ff44ff', 70, 450, 1);
    explosion(this.x, this.y, '#ffffff', 35, 250, 0.7);
    explosion(this.x, this.y, '#aa44aa', 50, 350, 0.9);
    sfxBigExplosion();
    setTimeout(() => sfxBigExplosion(), 200);
    shake(35, 0.7);
    flash(255, 100, 255, 0.5, 1.2);
  }
}
