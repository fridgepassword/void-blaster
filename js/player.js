// ===== Player ship =====
class Player {
  constructor(x, y) {
    const pf = (window.__phoneFactor && window.__phoneFactor()) || 1;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ang = -Math.PI / 2;
    this.radius = 14 * pf;

    // Stats — modified by upgrades
    this.maxHp = 100;
    this.hp = 100;
    this.speed = 280 * Math.sqrt(pf);   // bigger world = travel slightly faster
    this.damage = 12;
    this.fireRate = 4;          // shots/sec
    this.bulletSpeed = 700 * Math.sqrt(pf);
    this.bulletSize = 4 * pf;
    this.pierce = 0;
    this.multishot = 1;
    this.spread = 0;
    this.critChance = 0.05;
    this.critMult = 2;
    this.lifesteal = 0;
    this.regenRate = 0;
    this.scoreMult = 1;
    this.bulletExplode = 0;
    this.homing = 0;
    this.bouncy = 0;
    this.damageTakenMult = 1;

    // Dash
    this.canDash = false;
    this.dashSpeed = 900;
    this.dashDuration = 0.16;
    this.dashCooldownMax = 1.6;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashIframes = 0.32;

    // Shield
    this.maxShield = 0;
    this.shield = 0;
    this.shieldRecharge = 8;
    this.shieldTimer = 0;

    // Internal
    this.fireTimer = 0;
    this.invincible = 1.0; // brief invuln on spawn
    this.thrustTimer = 0;
    this.takenOnce = new Set();

    // Stand-still penalty — discourages camping
    this.stillTimer = 0;
    this.stillThreshold = 1.5;     // seconds before exposed (2× incoming damage)
    this.stillDamageMult = 2.0;
    this.drainThreshold = 4.0;     // seconds before HP drain kicks in
    this.drainRate = 5;            // HP per second once draining

    // Progression / meta
    this.bossesDefeated = 0;
    this.shopPurchases = {};       // id -> count

    // Conditional / new upgrade flags & values
    this.luck = 0;                 // 0..0.25 — boosts rare/uncommon/epic weight
    this.iframeMult = 1;           // multiplier for invuln after damage
    this.moversEdge = 0;           // damage boost while moving
    this.glassHull = false;        // big damage when no shield
    this.adrenaline = false;       // fire-rate boost at low HP
    this.frostShot = false;        // bullets slow enemies
    this.burnDps = 0;              // bullets ignite for DPS
    this.burnDuration = 0;
    this.killHeal = 0;             // heal % maxHp on kill
    this.comboMaster = 0;          // damage scales with combo
    this.splashChain = 0;          // chain damage to nearby enemies
    this.chronoField = 0;          // global slow (% reduction)
    this.isMoving = false;         // updated each frame
    this.bulletLifeMult = 1;       // bullet range/life multiplier

    // New mechanics
    this.steadyAim = false;        // first shot per volley +40%
    this.endurance = 0;            // heal 6 HP every 8 kills (stack = +1)
    this.enduranceCount = 0;
    this.dodgeChance = 0;          // % chance to ignore damage
    this.multiCrit = false;        // if true, all bullets in a shoot() share crit roll
    this.chargedShot = false;      // every 5th shot deals +120%
    this.shotsSinceCharge = 0;
    this.riposte = false;          // after being hit, next 5 shots +75%
    this.riposteShots = 0;
    this.doppler = false;          // bullets clone on first hit (50% dmg)
    this.eclipseBurst = false;     // periodic 3s 2× fire rate
    this.eclipseTimer = 0;
    this.eclipseActive = 0;
    this.finalStand = false;       // <20% HP: +70% dmg, -50% taken
    this.phoenix = false;          // one revive at 50% HP
    this.phoenixUsed = false;

    // Stats display
    this.totalShots = 0;
    this.totalHits = 0;
  }

  update(dt, w, h, bullets) {
    // ===== Movement input — depends on control mode =====
    let dx = 0, dy = 0;
    let speedScale = 1;          // mouse/touch arrival ramp
    let aimAngle;
    const mode = settings.controlMode;

    if (mode === 'wasd') {
      if (isKeyDown('KeyW', 'ArrowUp', 'w')) dy -= 1;
      if (isKeyDown('KeyS', 'ArrowDown', 's')) dy += 1;
      if (isKeyDown('KeyA', 'ArrowLeft', 'a')) dx -= 1;
      if (isKeyDown('KeyD', 'ArrowRight', 'd')) dx += 1;
      aimAngle = this._findAimAngle();
    } else if (mode === 'mouse') {
      // Player follows mouse — smooth arrival, no abrupt stop
      const dxm = mouse.x - this.x;
      const dym = mouse.y - this.y;
      const dm = Math.hypot(dxm, dym);
      if (dm > 3) {
        dx = dxm / dm;
        dy = dym / dm;
        // Ramp speed from 0 (at 3px) to full (at 50px)
        speedScale = clamp((dm - 3) / 47, 0, 1);
      }
      aimAngle = this._findAimAngle();
    } else if (mode === 'touch') {
      if (mouse.down) {
        const dxm = mouse.x - this.x;
        const dym = mouse.y - this.y;
        const dm = Math.hypot(dxm, dym);
        if (dm > 3) {
          dx = dxm / dm;
          dy = dym / dm;
          speedScale = clamp((dm - 3) / 47, 0, 1);
        }
      }
      aimAngle = this._findAimAngle();
    }

    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }

    // Track stand-still timer (dash counts as moving)
    this.isMoving = len > 0 || this.dashTimer > 0;
    if (this.isMoving) {
      this.stillTimer = 0;
    } else {
      this.stillTimer += dt;
    }

    // Stand-still HP drain — at 4+ seconds without moving, bleed 5 HP/sec.
    // Skipped during i-frames and when behind a shield.
    if (this.stillTimer >= this.drainThreshold && this.invincible <= 0 && this.shield <= 0) {
      this.hp -= this.drainRate * dt;
      if (this.hp < 0) this.hp = 0;
      // Damage particles bleeding off the ship
      if (Math.random() < dt * 8) {
        addParticle(
          this.x + rand(-this.radius * 0.7, this.radius * 0.7),
          this.y + rand(-this.radius * 0.4, this.radius * 0.4),
          {
            vx: rand(-20, 20),
            vy: rand(-90, -40),
            color: rand() < 0.5 ? '#ff4444' : '#ff8866',
            life: rand(0.3, 0.55),
            size: rand(2, 4),
            drag: 4,
          }
        );
      }
    }

    // Dash — only meaningful in WASD mode (Shift)
    if (this.canDash && this.dashCooldown <= 0 && len > 0 &&
        wasKeyPressed('ShiftLeft', 'ShiftRight', 'shift')) {
      this.dashTimer = this.dashDuration;
      this.dashCooldown = this.dashCooldownMax;
      this.invincible = Math.max(this.invincible, this.dashIframes);
      sfxDash();
      // burst of particles
      for (let i = 0; i < 12; i++) {
        const a = rand(0, TAU);
        const sp = rand(100, 300);
        addParticle(this.x, this.y, {
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          color: '#88ddff', life: rand(0.2, 0.4), size: rand(2, 4), drag: 4,
        });
      }
    }

    let speed = this.speed * speedScale;
    if (this.dashTimer > 0) {
      speed = this.dashSpeed;
      this.dashTimer -= dt;
    }

    this.vx = dx * speed;
    this.vy = dy * speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, this.radius, w - this.radius);
    this.y = clamp(this.y, this.radius, h - this.radius);

    // Aim — smoothly rotate toward target
    if (aimAngle !== undefined) {
      this.ang = lerpAngle(this.ang, aimAngle, 1 - Math.pow(0.001, dt));
    }

    // Cooldowns
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.invincible > 0) this.invincible -= dt;

    // Regen
    if (this.regenRate > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
    }

    // Shield recharge
    if (this.maxShield > 0 && this.shield < this.maxShield) {
      this.shieldTimer += dt;
      if (this.shieldTimer >= this.shieldRecharge) {
        this.shield++;
        this.shieldTimer = 0;
        sfxShield();
      }
    }

    // Thrust particles when moving or dashing
    if (len > 0 || this.dashTimer > 0) {
      this.thrustTimer += dt;
      const rate = this.dashTimer > 0 ? 0.005 : 0.02;
      if (this.thrustTimer > rate) {
        this.thrustTimer = 0;
        const back = this.ang + Math.PI;
        const px = this.x + Math.cos(back) * this.radius * 0.6;
        const py = this.y + Math.sin(back) * this.radius * 0.6;
        const intensity = this.dashTimer > 0 ? 1.6 : 1;
        thrustParticle(px, py, Math.cos(back) * 100, Math.sin(back) * 100, intensity);
      }
    }

    // Eclipse Burst — periodic fire-rate burst (1.7x for 2.5s every 14s)
    if (this.eclipseBurst) {
      if (this.eclipseActive > 0) {
        this.eclipseActive -= dt;
      } else {
        this.eclipseTimer -= dt;
        if (this.eclipseTimer <= 0) {
          this.eclipseActive = 2.5;
          this.eclipseTimer = 14;
          flash(255, 200, 100, 0.2, 2);
          for (let i = 0; i < 14; i++) {
            const a = rand(0, TAU);
            addParticle(this.x, this.y, {
              vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
              color: '#ffaa00', life: 0.45, size: rand(2, 4), drag: 4,
            });
          }
        }
      }
    }

    // Auto-fire — always shooting at the auto-aimed angle, only when there's a target.
    if (this.fireTimer <= 0) {
      if (this._hasTarget()) {
        this.shoot(bullets);
        let fr = this.fireRate;
        if (this.adrenaline && this.hp < this.maxHp * 0.3) fr *= 1.22;
        if (this.eclipseActive > 0) fr *= 1.7;
        this.fireTimer = 1 / fr;
      } else {
        this.fireTimer = 0.2;
      }
    }
  }

  _findAimAngle() {
    let nearest = null;
    let nd = Infinity;
    for (const e of enemies) {
      if (e.spawnAnim > 0) continue;
      const d = distSq(this.x, this.y, e.x, e.y);
      if (d < nd) { nd = d; nearest = e; }
    }
    if (nearest) return angleBetween(this.x, this.y, nearest.x, nearest.y);
    return this.ang;
  }

  _hasTarget() {
    for (const e of enemies) {
      if (e.spawnAnim <= 0) return true;
    }
    return false;
  }

  shoot(bullets) {
    const baseAng = this.ang;
    const spreadStep = 0.16;

    // Multi-crit: roll once for the whole volley
    const volleyCrit = this.multiCrit ? (Math.random() < this.critChance) : null;
    // Charged-shot bonus on every 5th shot
    this.shotsSinceCharge++;
    const isCharged = this.chargedShot && (this.shotsSinceCharge % 5 === 0);
    // Steady-aim bonus only on first bullet of the volley
    let isFirstOfVolley = this.steadyAim;

    // Multishot
    for (let i = 0; i < this.multishot; i++) {
      const offset = (i - (this.multishot - 1) / 2) * 10;
      this._spawnBullet(bullets, baseAng, offset, { volleyCrit, isCharged, isFirstOfVolley });
      isFirstOfVolley = false;
    }
    // Spread
    for (let i = 1; i <= this.spread; i++) {
      this._spawnBullet(bullets, baseAng + spreadStep * i, 0, { volleyCrit, isCharged });
      this._spawnBullet(bullets, baseAng - spreadStep * i, 0, { volleyCrit, isCharged });
    }

    // Decrement riposte counter (one volley = one count)
    if (this.riposteShots > 0) this.riposteShots--;

    sfxShoot();
    this.totalShots += this.multishot + this.spread * 2;

    const fx = this.x + Math.cos(baseAng) * (this.radius + 4);
    const fy = this.y + Math.sin(baseAng) * (this.radius + 4);
    spark(fx, fy, '#ffffff', 3, 200);
  }

  _spawnBullet(bullets, ang, perpOffset, opts = {}) {
    const px = Math.cos(ang + Math.PI / 2) * perpOffset;
    const py = Math.sin(ang + Math.PI / 2) * perpOffset;

    // Crit logic — volley-locked if Multi-Crit is active, otherwise rolled per bullet
    const isCrit = (opts.volleyCrit !== null && opts.volleyCrit !== undefined)
                   ? opts.volleyCrit
                   : Math.random() < this.critChance;

    // Compute damage with conditional modifiers
    let dmg = this.damage;
    if (this.moversEdge > 0 && this.isMoving) dmg *= 1 + this.moversEdge;
    if (this.glassHull && this.maxShield > 0 && this.shield === 0) dmg *= 1.45;
    if (this.glassHull && this.maxShield === 0) dmg *= 1.18;
    if (this.comboMaster > 0 && typeof combo !== 'undefined') {
      dmg *= 1 + Math.min(0.25, combo * this.comboMaster);
    }
    if (opts.isFirstOfVolley) dmg *= 1.25;         // Steady Aim
    if (opts.isCharged) dmg *= 1.85;               // Charged Shot
    if (this.riposteShots > 0) dmg *= 1.5;         // Riposte buff window
    if (this.finalStand && this.hp < this.maxHp * 0.2) dmg *= 1.5;
    if (isCrit) dmg *= this.critMult;

    bullets.push(new Bullet(
      this.x + Math.cos(ang) * (this.radius + 2) + px,
      this.y + Math.sin(ang) * (this.radius + 2) + py,
      ang,
      this.bulletSpeed,
      dmg,
      {
        size: this.bulletSize * (opts.isCharged ? 1.4 : 1),
        pierce: this.pierce,
        isCrit,
        explode: this.bulletExplode,
        homing: this.homing,
        bouncy: this.bouncy,
        frost: this.frostShot,
        burnDps: this.burnDps,
        burnDuration: this.burnDuration,
        splashChain: this.splashChain,
        doppler: this.doppler,
        life: 2.2 * (this.bulletLifeMult || 1),
      }
    ));
  }

  takeDamage(amount) {
    if (this.invincible > 0) return false;

    // Reactive Plate — dodge chance
    if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
      addFloatingText(this.x, this.y - this.radius - 8, 'DODGE', '#88ffaa', 14);
      spark(this.x, this.y, '#88ffaa', 10, 200);
      this.invincible = 0.2;
      return false;
    }

    if (this.shield > 0) {
      this.shield--;
      this.shieldTimer = 0;
      this.invincible = 0.4;
      flash(120, 200, 255, 0.35, 2.5);
      shake(8, 0.18);
      sfxShield();
      spark(this.x, this.y, '#88ddff', 12, 250);
      // Trigger Riposte from a shield break too
      if (this.riposte) this.riposteShots = 5;
      return false;
    }

    const exposed = this.stillTimer >= this.stillThreshold;
    let dmg = amount * this.damageTakenMult;
    if (exposed) dmg *= this.stillDamageMult;
    // Final Stand — damage reduction at very low HP
    if (this.finalStand && this.hp < this.maxHp * 0.2) dmg *= 0.65;
    const diff = window.__getDifficulty && window.__getDifficulty();
    if (diff && diff.playerDmgTakenMult) dmg *= diff.playerDmgTakenMult;

    // Riposte — trigger a damage-buff window
    if (this.riposte) this.riposteShots = 5;

    this.hp -= dmg;
    this.invincible = 0.7 * (this.iframeMult || 1);
    flash(255, exposed ? 30 : 60, exposed ? 30 : 60, 0.45, 2);
    shake(exposed ? 22 : 16, 0.32);
    sfxPlayerHit();
    spark(this.x, this.y, exposed ? '#ff2222' : '#ff4444', exposed ? 26 : 18, 280);
    if (exposed) {
      addFloatingText(this.x, this.y - this.radius - 8, 'EXPOSED!', '#ff4444', 16);
    }
    setHitstop(0.06);
    return true;
  }

  isExposed() {
    return this.stillTimer >= this.stillThreshold;
  }

  isExposedSoon() {
    return this.stillTimer >= this.stillThreshold * 0.6;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.ang);

    if (this.invincible > 0 && Math.floor(this.invincible * 24) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    const r = this.radius;
    // Outer glow
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#00ffff';

    // Body — sharp triangle with notch in back for ship feel
    ctx.fillStyle = '#3399ee';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(-r * 0.85, r * 0.85);
    ctx.lineTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.85, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner highlight stripe
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.moveTo(r * 1.0, 0);
    ctx.lineTo(-r * 0.5, r * 0.4);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.5, -r * 0.4);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.15, 0, 2.5, 0, TAU);
    ctx.fill();

    ctx.restore();

    // Stand-still warning — escalates from a yellow tick to red EXPOSED to red DRAINING
    if (this.stillTimer > this.stillThreshold * 0.5) {
      const t = clamp(this.stillTimer / this.stillThreshold, 0, 1);
      const exposed = this.stillTimer >= this.stillThreshold;
      const draining = this.stillTimer >= this.drainThreshold;
      const pulseSpeed = draining ? 60 : (exposed ? 90 : 160);
      const pulse = (Math.sin(performance.now() / pulseSpeed) + 1) * 0.5;
      const alpha = draining ? 0.75 + pulse * 0.25
                   : exposed ? 0.55 + pulse * 0.4
                   : 0.25 + t * 0.4;
      const radius = this.radius * (1.9 + (draining ? pulse * 0.5 : exposed ? pulse * 0.25 : 0));
      ctx.save();
      ctx.shadowBlur = draining ? 26 : (exposed ? 18 : 10);
      ctx.shadowColor = draining ? '#ff2222' : (exposed ? '#ff3333' : '#ffaa44');
      ctx.strokeStyle = draining
        ? `rgba(255, 40, 40, ${alpha})`
        : exposed
          ? `rgba(255, 60, 60, ${alpha})`
          : `rgba(255, 180, 60, ${alpha})`;
      ctx.lineWidth = draining ? 3.5 : exposed ? 2.5 : 1.5;
      ctx.setLineDash(exposed || draining ? [] : [6, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, TAU);
      ctx.stroke();
      // Second inner ring on full drain
      if (draining) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 0.7, 0, TAU);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (draining) {
        ctx.fillStyle = `rgba(255, 60, 60, ${0.8 + pulse * 0.2})`;
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DRAINING', this.x, this.y - radius - 8);
      } else if (exposed) {
        ctx.fillStyle = `rgba(255, 80, 80, ${0.6 + pulse * 0.3})`;
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('EXPOSED', this.x, this.y - radius - 6);
      }
      ctx.restore();
    }

    // Shield visual
    if (this.maxShield > 0) {
      ctx.save();
      const t = performance.now() / 1000;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#88ddff';
      ctx.strokeStyle = `rgba(150, 220, 255, ${0.35 + Math.sin(t * 4) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.7, 0, TAU);
      ctx.stroke();
      // Pips
      for (let i = 0; i < this.maxShield; i++) {
        const a = -Math.PI / 2 + (i / this.maxShield) * TAU + t * 0.4;
        const sx = this.x + Math.cos(a) * this.radius * 1.7;
        const sy = this.y + Math.sin(a) * this.radius * 1.7;
        ctx.fillStyle = i < this.shield ? '#aaeeff' : 'rgba(80, 120, 160, 0.4)';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
