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

    // Knockback removed (see takeDamage comment) — knockX/knockY decay if anything else
    // ever pokes them, but we no longer apply force from bullet hits.
    if (this.knockX || this.knockY) {
      this.x += this.knockX * dt;
      this.y += this.knockY * dt;
      this.knockX = decay(this.knockX, 8, dt);
      this.knockY = decay(this.knockY, 8, dt);
    }
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
    // Knockback removed — bosses kept getting pushed off-screen. Hit-pop scale + flash
    // still provides feel without breaking encounters.
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

// ===== NEW ENEMY TYPES =====

// Sentinel — slow heavy with homing missiles. Wave 7+.
// Dark grey octagon, fires single tracking missile every few seconds.
class Sentinel extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 55, radius: 17, speed: 45, damage: 14,
      color: '#666688', score: 30, credits: 3, type: 'sentinel',
    });
    this.shootTimer = rand(2, 3.5);
    this.spinRate = 0;
  }
  behave(dt, player, enemies, enemyBullets) {
    const a = angleBetween(this.x, this.y, player.x, player.y);
    const d = dist(this.x, this.y, player.x, player.y);
    // Slow approach to a comfortable range
    const want = 320;
    const mv = d > want + 30 ? 1 : d < want - 30 ? -0.5 : 0;
    this.vx = Math.cos(a) * this.speed * mv;
    this.vy = Math.sin(a) * this.speed * mv;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && d < 700) {
      this.shootTimer = rand(2.5, 4);
      // Homing missile — slower bullet but turns toward the player
      const m = new EnemyBullet(this.x, this.y, a, 130, 16, '#aaccff');
      m.homing = 2.2;        // turn rate
      m.life = 5;
      enemyBullets.push(m);
      sfxEnemyShoot();
    }
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    const r = this.radius;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    // Octagon
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Center "scanner" light
    ctx.fillStyle = flash ? '#ffffff' : '#aaccff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, TAU);
    ctx.fill();
  }
}

// Splitter — when killed, spawns 2 small grunts. Wave 4+.
// Light teal larger square that visibly cracks/splits.
class Splitter extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 38, radius: 16, speed: 90, damage: 14,
      color: '#44ccaa', score: 18, credits: 2, type: 'splitter',
    });
  }
  die() {
    super.die();
    // Spawn 2 small splits — half-strength grunts
    if (typeof enemies !== 'undefined') {
      for (let i = 0; i < 2; i++) {
        const off = (i === 0) ? -1 : 1;
        const g = new Grunt(this.x + off * 18, this.y + rand(-12, 12));
        g.maxHp = g.maxHp * 0.4; g.hp = g.maxHp;
        g.radius = g.radius * 0.7;
        g.speed = g.speed * 1.2;
        g.creditsValue = 0;     // no double-dipping
        g.scoreValue = Math.round(g.scoreValue * 0.4);
        g.color = '#44ccaa';
        g.spawnAnim = 0.25;     // brief, so they engage quickly
        enemies.push(g);
      }
    }
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    const r = this.radius;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-r, -r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();
    // Crack line down the middle
    ctx.strokeStyle = '#003322';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
  }
}

// Charger — telegraphs then dashes at the player. Wave 5+.
// Red sharp triangle that points at player; charges fast in short bursts.
class Charger extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 36, radius: 14, speed: 55, damage: 22,
      color: '#dd4422', score: 22, credits: 3, type: 'charger',
    });
    this.windup = -1;   // > 0 while preparing a charge
    this.dashRem = 0;   // > 0 while dashing
    this.facing = 0;
    this.cooldown = rand(1.5, 2.8);
    this.spinRate = 0;
  }
  behave(dt, player) {
    const a = angleBetween(this.x, this.y, player.x, player.y);
    const d = dist(this.x, this.y, player.x, player.y);
    this.facing = a;

    if (this.dashRem > 0) {
      // Burst dash
      this.x += Math.cos(this.facing) * 320 * dt;
      this.y += Math.sin(this.facing) * 320 * dt;
      addParticle(this.x, this.y, {
        vx: rand(-30, 30), vy: rand(-30, 30),
        color: '#ff6633', life: 0.3, size: rand(2, 4), drag: 5,
      });
      this.dashRem -= dt;
      return;
    }

    if (this.windup > 0) {
      // Standing still, glowing — telegraph
      this.windup -= dt;
      if (this.windup <= 0) {
        this.dashRem = 0.55;   // dash duration
        sfxEnemyShoot();
      }
      return;
    }

    // Approach
    if (d > 260) {
      this.vx = Math.cos(a) * this.speed;
      this.vy = Math.sin(a) * this.speed;
    } else {
      // strafe slightly
      const sa = a + Math.PI / 2;
      this.vx = Math.cos(sa) * this.speed * 0.6;
      this.vy = Math.sin(sa) * this.speed * 0.6;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Charge if in range
    this.cooldown -= dt;
    if (this.cooldown <= 0 && d < 380) {
      this.cooldown = rand(2.5, 4.5);
      this.windup = 0.5;
    }
  }
  draw(ctx) {
    if (this.spawnAnim > 0) { super.draw(ctx); return; }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleP, this.scaleP);
    ctx.rotate(this.facing);
    const flashing = this.hitFlash > 0 || (this.windup > 0 && Math.floor(this.windup * 18) % 2 === 0);
    ctx.shadowBlur = flashing ? 18 : (this.dashRem > 0 ? 16 : 8);
    ctx.shadowColor = flashing ? '#ffffff' : '#ff6633';
    this.drawShape(ctx, flashing);
    ctx.restore();
    if (this.hp < this.maxHp && this.maxHp > 25) {
      const bw = this.radius * 2;
      const by = this.y - this.radius - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - bw / 2, by, bw, 3);
      ctx.fillStyle = '#ff6633';
      ctx.fillRect(this.x - bw / 2, by, bw * (this.hp / this.maxHp), 3);
    }
  }
  drawShape(ctx, flashing) {
    const r = this.radius;
    ctx.fillStyle = flashing ? '#ffffff' : this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(-r * 0.6, r * 0.8);
    ctx.lineTo(-r * 0.6, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Healer — slowly orbits and heals nearby enemies. Wave 8+.
// Green diamond emitting a healing pulse.
class Healer extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 55, radius: 14, speed: 35, damage: 8,
      color: '#44dd66', score: 28, credits: 4, type: 'healer',
    });
    this.healRange = 130;
    this.healRate = 4;   // hp/s
    this.pulseT = 0;
    this.spinRate = 0;
  }
  behave(dt, player, enemies) {
    // Move toward the *center of mass* of nearby allies (or the player if alone)
    let cx = player.x, cy = player.y;
    let nAllies = 0;
    let sumX = 0, sumY = 0;
    for (const e of enemies) {
      if (e === this || e.dead) continue;
      const d2 = distSq(this.x, this.y, e.x, e.y);
      if (d2 < 400 * 400) {
        sumX += e.x; sumY += e.y; nAllies++;
      }
    }
    if (nAllies > 0) {
      cx = sumX / nAllies; cy = sumY / nAllies;
    }
    const a = angleBetween(this.x, this.y, cx, cy);
    this.vx = Math.cos(a) * this.speed;
    this.vy = Math.sin(a) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Heal nearby allies
    for (const e of enemies) {
      if (e === this || e.dead || e.spawnAnim > 0) continue;
      if (e.hp >= e.maxHp) continue;
      if (distSq(this.x, this.y, e.x, e.y) < this.healRange * this.healRange) {
        e.hp = Math.min(e.maxHp, e.hp + this.healRate * dt);
      }
    }

    // Visible pulse particles
    this.pulseT += dt;
    if (this.pulseT > 0.18) {
      this.pulseT = 0;
      const a = rand(0, TAU);
      addParticle(this.x, this.y, {
        vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
        color: '#88ffaa', life: 0.5, size: rand(2, 3), drag: 3,
      });
    }
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    const r = this.radius;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = '#aaffcc';
    ctx.lineWidth = 2;
    // Diamond
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Plus sign in middle
    ctx.strokeStyle = flash ? '#ffffff' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, 0); ctx.lineTo(r * 0.4, 0);
    ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, r * 0.4);
    ctx.stroke();
  }
  draw(ctx) {
    // Aura ring
    if (this.spawnAnim <= 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(136, 255, 170, ${0.15 + Math.sin(performance.now() / 300) * 0.06})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.healRange, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    super.draw(ctx);
  }
}

// Sniper — slow but fires a fast piercing rail every few seconds. Wave 6+.
// Long thin triangle; telegraphs with a red beam before firing.
class Sniper extends Enemy {
  constructor(x, y) {
    super(x, y, {
      hp: 30, radius: 12, speed: 40, damage: 18,
      color: '#3344aa', score: 26, credits: 3, type: 'sniper',
    });
    this.shootTimer = rand(2, 4);
    this.aiming = 0;      // > 0 while telegraphing
    this.aimAngle = 0;
    this.facing = 0;
    this.spinRate = 0;
  }
  behave(dt, player, enemies, enemyBullets) {
    const a = angleBetween(this.x, this.y, player.x, player.y);
    this.facing = a;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.aiming > 0) {
      // Stand still and aim
      this.aimAngle = a;
      this.aiming -= dt;
      if (this.aiming <= 0) {
        // Fire piercing rail
        const b = new EnemyBullet(this.x, this.y, this.aimAngle, 600, 22, '#ff4466');
        b.pierce = 1;
        b.size = 8;
        b.life = 1.5;
        enemyBullets.push(b);
        sfxEnemyShoot();
        this.shootTimer = rand(3.5, 5.5);
      }
      return;
    }

    // Maintain long range
    const want = 380;
    const mv = d > want + 40 ? 0.5 : d < want - 40 ? -0.5 : 0;
    this.vx = Math.cos(a) * this.speed * mv;
    this.vy = Math.sin(a) * this.speed * mv;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && d < 700) {
      this.aiming = 0.9;   // telegraph duration
    }
  }
  draw(ctx) {
    if (this.spawnAnim > 0) { super.draw(ctx); return; }
    // Telegraph beam while aiming
    if (this.aiming > 0) {
      const t = 1 - (this.aiming / 0.9);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 60, 80, ${0.3 + t * 0.5})`;
      ctx.lineWidth = 1.5 + t * 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff4466';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.aimAngle) * 900, this.y + Math.sin(this.aimAngle) * 900);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleP, this.scaleP);
    ctx.rotate(this.facing);
    ctx.shadowBlur = this.hitFlash > 0 ? 18 : 8;
    ctx.shadowColor = this.hitFlash > 0 ? '#ffffff' : this.color;
    this.drawShape(ctx);
    ctx.restore();
    if (this.hp < this.maxHp && this.maxHp > 25) {
      const bw = this.radius * 2;
      const by = this.y - this.radius - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - bw / 2, by, bw, 3);
      ctx.fillStyle = '#88aaff';
      ctx.fillRect(this.x - bw / 2, by, bw * (this.hp / this.maxHp), 3);
    }
  }
  drawShape(ctx) {
    const flash = this.hitFlash > 0;
    const r = this.radius;
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.strokeStyle = '#88aaff';
    ctx.lineWidth = 2;
    // Long sleek triangle
    ctx.beginPath();
    ctx.moveTo(r * 1.6, 0);
    ctx.lineTo(-r * 0.6, r * 0.55);
    ctx.lineTo(-r * 0.6, -r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Scope dot
    ctx.fillStyle = flash ? '#ffffff' : '#ff4466';
    ctx.beginPath();
    ctx.arc(r * 0.5, 0, 2.5, 0, TAU);
    ctx.fill();
  }
}

// Boss — every 5 waves
class Boss extends Enemy {
  constructor(x, y, level = 1) {
    // Exponential growth so late bosses don't melt under stacked player damage.
    // L1 = 1.0×, L2 = 1.55×, L3 = 2.4×, L4 = 3.72×, L5 = 5.77×.
    const lvlMult = Math.pow(1.55, level - 1);
    super(x, y, {
      hp: Math.round(620 * lvlMult),
      radius: 50,
      speed: 60 + level * 5,
      damage: Math.round(38 * Math.pow(1.22, level - 1)),
      color: '#770077',
      outline: '#ff66ff',
      score: Math.round(280 * lvlMult),
      credits: Math.round((20 + level * 6) * Math.pow(1.1, level - 1)),
      type: 'boss',
    });
    this.level = level;
    this.lvlMult = lvlMult;
    // Attack cadence tightens with level (clamped so even L10 isn't impossible)
    this.attackRateMult = Math.max(0.55, Math.pow(0.92, level - 1));
    this.shootTimer = 1.2 * this.attackRateMult;
    this.spawnTimer = 4 * this.attackRateMult;
    this.chargeCooldown = rand(5, 8) * this.attackRateMult;
    this.chargeTimer = 0;      // > 0 while ramming
    this.chargeAngle = 0;
    this.phase = 0;
    this.spinRate = 0.6;
    this.subAngle = 0;
    this.aimedShotTimer = 2;
  }
  behave(dt, player, enemies, enemyBullets) {
    const a = angleBetween(this.x, this.y, player.x, player.y);
    const d = dist(this.x, this.y, player.x, player.y);
    this.subAngle += dt * 2;

    // ===== Charge attack — telegraphed ram toward player every 5-8s =====
    this.chargeCooldown -= dt;
    if (this.chargeCooldown <= 0 && this.chargeTimer <= 0) {
      this.chargeCooldown = this.phase >= 1 ? rand(4, 6) : rand(6, 9);
      this.chargeTimer = 0.9;
      this.chargeAngle = a;
      // brief telegraph flash
      flash(255, 80, 80, 0.18, 3);
      sfxEnemyShoot();
    }
    if (this.chargeTimer > 0) {
      const cspeed = this.speed * 4;
      this.x += Math.cos(this.chargeAngle) * cspeed * dt;
      this.y += Math.sin(this.chargeAngle) * cspeed * dt;
      // charge trail
      addParticle(this.x, this.y, {
        vx: rand(-30, 30), vy: rand(-30, 30),
        color: '#ff66ff', life: 0.35, size: rand(3, 6), drag: 5,
      });
      this.chargeTimer -= dt;
    } else {
      // Normal movement: maintain a "danger range" around the player.
      if (d > 280) {
        this.vx = Math.cos(a) * this.speed;
        this.vy = Math.sin(a) * this.speed;
      } else if (d < 180) {
        // back off if too close (gives ranged windows but stays threatening)
        this.vx = -Math.cos(a) * this.speed * 0.6;
        this.vy = -Math.sin(a) * this.speed * 0.6;
      } else {
        const sa = a + Math.PI / 2;
        this.vx = Math.cos(sa) * this.speed * 0.8;
        this.vy = Math.sin(sa) * this.speed * 0.8;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // Keep boss inside the play area — it's huge and shouldn't drift off.
    // (We use world bounds from the player's clamp range via enemies array? simpler: pin to screen)
    if (typeof W !== 'undefined') this.x = clamp(this.x, this.radius, W - this.radius);
    if (typeof H !== 'undefined') this.y = clamp(this.y, this.radius, H - this.radius);

    // ===== Phase transitions =====
    const ratio = this.hp / this.maxHp;
    if (this.phase === 0 && ratio < 0.65) {
      this.phase = 1;
      this.spinRate = 1.2;
      shake(12, 0.4);
      flash(255, 100, 255, 0.3, 2);
    }
    if (this.phase === 1 && ratio < 0.3) {
      this.phase = 2;
      this.spinRate = 2;
      shake(20, 0.5);
      flash(255, 80, 255, 0.4, 2);
    }

    const rateMult = this.attackRateMult;

    // ===== Ring burst — radial volley =====
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = (this.phase === 2 ? 0.8 : (this.phase === 1 ? 1.15 : 1.6)) * rateMult;
      const n = 10 + this.phase * 3 + Math.min(8, this.level * 2);
      const baseA = this.subAngle;
      for (let i = 0; i < n; i++) {
        const ba = (i / n) * TAU + baseA;
        enemyBullets.push(new EnemyBullet(this.x, this.y, ba, 220 + this.level * 8, 12 + this.level * 3, '#ff66ff'));
      }
      sfxEnemyShoot();
    }

    // ===== Aimed triple shot (phase 1+) =====
    if (this.phase >= 1) {
      this.aimedShotTimer -= dt;
      if (this.aimedShotTimer <= 0) {
        this.aimedShotTimer = (this.phase === 2 ? 1.2 : 1.7) * rateMult;
        const spread = 0.18;
        const extra = this.level >= 3 ? 2 : 0; // extra outer pair from level 3
        for (let i = -1 - extra; i <= 1 + extra; i++) {
          enemyBullets.push(new EnemyBullet(this.x, this.y, a + i * spread, 280, 10 + this.level * 3, '#ffaa44'));
        }
        sfxEnemyShoot();
      }
    }

    // ===== Spawn minions =====
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = (this.phase === 2 ? 2.8 : (this.phase === 1 ? 4.2 : 5.8)) * rateMult;
      const count = 2 + this.phase + Math.floor(this.level / 1.5);
      for (let i = 0; i < count; i++) {
        const sa = rand(0, TAU);
        const sx = this.x + Math.cos(sa) * (this.radius + 30);
        const sy = this.y + Math.sin(sa) * (this.radius + 30);
        // Higher level bosses summon harder minions
        let minion;
        const r = Math.random();
        if (this.level >= 4 && r < 0.18) minion = new Tank(sx, sy);
        else if (this.level >= 3 && r < 0.3) minion = new Shooter(sx, sy);
        else if (this.level >= 2 && r < 0.4) minion = new Grunt(sx, sy);
        else minion = new Swarmer(sx, sy);
        enemies.push(minion);
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
