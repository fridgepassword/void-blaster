// ===== Main game: state machine + loop + glue =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;
let renderScale = 1; // physical-pixels-per-world-unit (excluding DPR)
let player = null;   // declared early so resize() can safely reference it

// Reference shorter dimension for "1× zoom" — content sized for ~500px-min worlds.
// Big screens scale up proportionally so the ship/HUD don't look like ants at desktop sizes.
// Small phones use 1× (no down-scaling) to keep the play area roomy.
const REFERENCE_MIN_DIM = 500;
const MAX_RENDER_SCALE = 2.2;

function resize() {
  const physW = window.innerWidth;
  const physH = window.innerHeight;
  const minPhys = Math.min(physW, physH);

  // Scale up only when the screen is bigger than reference; cap so 4K+ stays sane.
  renderScale = Math.min(Math.max(1, minPhys / REFERENCE_MIN_DIM), MAX_RENDER_SCALE);

  // World (logical) size — what gameplay code uses for positions.
  W = physW / renderScale;
  H = physH / renderScale;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(physW * dpr);
  canvas.height = Math.floor(physH * dpr);
  canvas.style.width = physW + 'px';
  canvas.style.height = physH + 'px';

  // Apply combined scale: world-coord * renderScale * dpr = physical pixel.
  ctx.setTransform(renderScale * dpr, 0, 0, renderScale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  initBackground(W, H);
  // Keep player inside bounds when window resizes during play.
  if (player) {
    player.x = clamp(player.x, player.radius, W - player.radius);
    player.y = clamp(player.y, player.radius, H - player.radius);
  }
}

// Expose for input conversion
window.__renderScale = () => renderScale;

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

// ===== State machine =====
const STATE = {
  TITLE: 'title',
  WAVE_INTRO: 'wave_intro',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  SHOP: 'shop',
  PAUSED: 'paused',
  GAME_OVER: 'gameover',
};

let state = STATE.TITLE;
let stateTime = 0;

const enemies = [];
const bullets = [];
const enemyBullets = [];

let wave = 0;
let waveSpec = [];
let waveSpawnTimer = 0;
let waveActive = false;
let score = 0;
let kills = 0;
let credits = 0;

let combo = 0;
let comboTimer = 0;
const COMBO_WINDOW = 2.5;

let upgradeChoices = [];
let waveAnnounceTime = 0;
let isHighScoreFlag = false;
let shopScrollY = 0;
let shopMaxScroll = 0;

let lastTime = 0;
let totalTime = 0;

// Persistent high score
window.__highScore = parseInt(localStorage.getItem('voidblaster_hiscore') || '0', 10) || 0;

// ===== Settings (persisted) =====
const CONTROL_MODES = ['wasd', 'mouse', 'touch'];
const settings = {
  controlMode: 'wasd',
};
function loadSettings() {
  const m = localStorage.getItem('voidblaster_control');
  if (m && CONTROL_MODES.includes(m)) settings.controlMode = m;
  // Auto-detect touch on first load if no preference set
  if (!m && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    settings.controlMode = 'touch';
  }
}
function saveSettings() {
  try { localStorage.setItem('voidblaster_control', settings.controlMode); } catch (e) {}
}
loadSettings();
window.__settings = settings;

function startGame() {
  player = new Player(W / 2, H / 2);
  enemies.length = 0;
  bullets.length = 0;
  enemyBullets.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  wave = 0;
  score = 0;
  kills = 0;
  credits = 0;
  combo = 0;
  comboTimer = 0;
  isHighScoreFlag = false;
  initAudio();
  startNextWave();
  state = STATE.WAVE_INTRO;
  stateTime = 0;
}

function startNextWave() {
  wave++;
  waveSpec = generateWave(wave);
  waveSpawnTimer = 0.4;
  waveActive = true;
  waveAnnounceTime = 0;
  state = STATE.WAVE_INTRO;
  stateTime = 0;
  sfxWaveStart();
}

function endWave() {
  waveActive = false;
  upgradeChoices = rollUpgrades(player, 3);
  state = STATE.UPGRADE;
  stateTime = 0;
  sfxWaveEnd();
  flash(180, 220, 255, 0.18, 1.5);
  // Heal a little between waves to be merciful
  player.hp = Math.min(player.maxHp, player.hp + 8);
}

function gameOver() {
  if (score > window.__highScore) {
    window.__highScore = score;
    localStorage.setItem('voidblaster_hiscore', String(score));
    isHighScoreFlag = true;
  }
  explosion(player.x, player.y, '#88ddff', 60, 450, 1);
  explosion(player.x, player.y, '#ffffff', 30, 250, 0.7);
  shake(40, 0.9);
  flash(255, 255, 255, 0.7, 1.5);
  sfxGameOver();
  state = STATE.GAME_OVER;
  stateTime = 0;
}

// ===== Main loop =====
function loop(now) {
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05; // clamp big jumps (e.g. tab switch)

  if (hitstop > 0) {
    hitstop -= dt;
    dt = 0;
  }

  totalTime += dt;
  stateTime += dt;

  update(dt);
  render();
  endFrameInput();

  requestAnimationFrame(loop);
}

function update(dt) {
  // Background and effects always update
  const camVx = player ? player.vx * 0.05 : 0;
  const camVy = player ? player.vy * 0.05 : 0;
  updateStars(dt, W, H, camVx, camVy);
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateShake(dt);
  updateFlash(dt);

  // Mute toggle works in any state
  if (wasKeyPressed('KeyM', 'm')) toggleMute();

  switch (state) {
    case STATE.TITLE:
      updateTitleShips(dt, W, H);
      if (wasKeyPressed('Space', 'Enter', ' ', 'enter')) {
        startGame();
      } else if (mouse.justClicked) {
        const picked = pickControlMode(mouse.x, mouse.y);
        if (picked) {
          settings.controlMode = picked;
          saveSettings();
          sfxClick();
          mouse.justClicked = false;
        } else if (consumeClick()) {
          startGame();
        }
      }
      // Quick-cycle with Tab key
      if (wasKeyPressed('Tab', 'tab')) {
        const idx = CONTROL_MODES.indexOf(settings.controlMode);
        settings.controlMode = CONTROL_MODES[(idx + 1) % CONTROL_MODES.length];
        saveSettings();
        sfxClick();
      }
      break;

    case STATE.WAVE_INTRO:
      waveAnnounceTime += dt;
      updatePlaying(dt);
      if (waveAnnounceTime > 1.6) {
        state = STATE.PLAYING;
        stateTime = 0;
      }
      break;

    case STATE.PLAYING:
      updatePlaying(dt);
      if (wasKeyPressed('KeyP', 'Escape', 'p', 'escape')) {
        state = STATE.PAUSED;
        stateTime = 0;
      }
      break;

    case STATE.UPGRADE:
      handleUpgradeInput();
      break;

    case STATE.SHOP:
      handleShopInput();
      break;

    case STATE.PAUSED:
      if (wasKeyPressed('KeyP', 'Escape', 'p', 'escape')) {
        state = STATE.PLAYING;
        stateTime = 0;
      }
      // Settings clickable while paused; clicking outside any button resumes
      if (mouse.justClicked) {
        const picked = pickControlMode(mouse.x, mouse.y);
        if (picked) {
          settings.controlMode = picked;
          saveSettings();
          sfxClick();
        } else {
          // Click outside button = resume (helpful for mouse/touch users)
          state = STATE.PLAYING;
          stateTime = 0;
          sfxClick();
        }
        mouse.justClicked = false;
      }
      break;

    case STATE.GAME_OVER:
      if (stateTime > 1.4 && (wasKeyPressed('Space', 'Enter', ' ', 'enter') || consumeClick())) {
        state = STATE.TITLE;
        stateTime = 0;
      }
      break;
  }
}

function updatePlaying(dt) {
  if (!player) return;

  // Combo decay
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  // Spawn pacing
  if (waveActive) {
    waveSpawnTimer -= dt;
    if (waveSpec.length > 0 && waveSpawnTimer <= 0) {
      const next = waveSpec.shift();
      enemies.push(spawnEnemyFromSpec(next, W, H));
      // Spawn cadence: tighter for swarmers, wider for big enemies
      if (next.type === 'swarmer') waveSpawnTimer = rand(0.2, 0.45);
      else if (next.type === 'tank' || next.type === 'bomber') waveSpawnTimer = rand(0.7, 1.1);
      else if (next.type === 'boss') waveSpawnTimer = 1.4;
      else waveSpawnTimer = rand(0.4, 0.8);
    }
    if (waveSpec.length === 0 && enemies.length === 0) {
      endWave();
      return;
    }
  }

  player.update(dt, W, H, bullets);

  // Player bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update(dt, W, H, enemies);
    if (bullets[i].dead) bullets.splice(i, 1);
  }

  // Enemy bullets — collide with player
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.update(dt, W, H);
    if (!b.dead && distSq(b.x, b.y, player.x, player.y) < (b.size + player.radius - 2) ** 2) {
      player.takeDamage(b.damage);
      b.dead = true;
      spark(b.x, b.y, b.color, 8, 200);
    }
    if (b.dead) enemyBullets.splice(i, 1);
  }

  // Enemies — update + collide with bullets and player
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update(dt, player, enemies, enemyBullets);

    if (e.spawnAnim <= 0) {
      // Bullet collision
      for (const b of bullets) {
        if (b.dead) continue;
        if (b.hitEnemies.has(e)) continue;
        const r = e.radius + b.size;
        if (distSq(b.x, b.y, e.x, e.y) < r * r) {
          e.takeDamage(b.damage, b.x, b.y);
          player.totalHits++;

          // Status effects from upgrades
          if (b.frost) e.applyFrost(1.5);
          if (b.burnDps > 0) e.applyBurn(b.burnDps, b.burnDuration);

          // Splash chain — damage one extra nearby enemy at 60% damage
          if (b.splashChain > 0) {
            let chained = 0;
            for (const e2 of enemies) {
              if (chained >= b.splashChain) break;
              if (e2 === e || e2.spawnAnim > 0 || e2.dead) continue;
              if (distSq(e.x, e.y, e2.x, e2.y) < 90 * 90) {
                e2.takeDamage(b.damage * 0.6, e.x, e.y);
                spark(e2.x, e2.y, '#ffff88', 4, 150);
                chained++;
              }
            }
          }

          if (player.lifesteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + b.damage * player.lifesteal);
          }
          if (b.isCrit) {
            addFloatingText(e.x, e.y - e.radius - 18, 'CRIT!', '#ffff66', 16);
          }
          b.hit(e, enemies);
          if (b.dead) break;
        }
      }

      // Player collision
      const pr = e.radius + player.radius - 2;
      if (e.contactCooldown <= 0 && distSq(e.x, e.y, player.x, player.y) < pr * pr) {
        if (player.takeDamage(e.damage)) {
          e.contactCooldown = 0.5;
          // small bounce-back
          const a = angleBetween(player.x, player.y, e.x, e.y);
          e.knockX += Math.cos(a) * 250;
          e.knockY += Math.sin(a) * 250;
        }
      }
    }

    if (e.dead) {
      // Combo
      combo++;
      comboTimer = COMBO_WINDOW;
      const comboBonus = 1 + Math.min(2, combo * 0.04);
      const scoreGain = Math.floor(e.scoreValue * player.scoreMult * comboBonus);
      score += scoreGain;
      kills++;

      // Credits drop
      const cr = e.creditsValue || 0;
      if (cr > 0) {
        credits += cr;
        addFloatingText(e.x - 14, e.y, `+${cr}$`, '#ffdd44', 14);
      }
      addFloatingText(e.x + 14, e.y, `+${scoreGain}`, combo >= 10 ? '#ff66ff' : '#ffaa44', 14);

      // Boss tracking + kill heal
      if (e.type === 'boss') player.bossesDefeated++;
      if (player.killHeal > 0) {
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * player.killHeal);
      }

      enemies.splice(i, 1);
    }
  }

  // Player death
  if (player.hp <= 0) {
    gameOver();
  }
}

function handleUpgradeInput() {
  // Number keys
  for (let i = 0; i < upgradeChoices.length; i++) {
    if (wasKeyPressed('Digit' + (i + 1), String(i + 1))) {
      pickUpgrade(i);
      return;
    }
  }
  if (consumeClick()) {
    for (let i = 0; i < upgradeButtonRects.length; i++) {
      const r = upgradeButtonRects[i];
      if (mouse.x >= r.x && mouse.x <= r.x + r.w &&
          mouse.y >= r.y - 12 && mouse.y <= r.y + r.h) {
        pickUpgrade(i);
        return;
      }
    }
  }
}

function pickUpgrade(idx) {
  const u = upgradeChoices[idx];
  if (!u) return;
  applyUpgrade(player, u);
  sfxUpgrade();
  flash(160, 220, 255, 0.25, 2.5);
  for (let k = 0; k < 30; k++) {
    const a = rand(0, TAU);
    const sp = rand(150, 350);
    addParticle(W / 2, H * 0.5, {
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      color: RARITY_COLORS[u.rarity], life: rand(0.3, 0.7), size: rand(2, 5), drag: 3,
    });
  }
  // Go to shop instead of straight to next wave
  state = STATE.SHOP;
  stateTime = 0;
  shopScrollY = 0;
}

function handleShopInput() {
  // Continue button
  if (wasKeyPressed('Space', 'Enter', ' ', 'enter') ||
      wasKeyPressed('Escape', 'escape')) {
    leaveShop();
    return;
  }

  // Scroll: mouse wheel
  const wd = consumeWheel();
  if (wd !== 0) {
    shopScrollY = clamp(shopScrollY + wd * 0.6, 0, shopMaxScroll);
  }

  // Scroll: arrow keys / WASD
  if (isKeyDown('ArrowUp', 'KeyW', 'w')) shopScrollY = Math.max(0, shopScrollY - 12);
  if (isKeyDown('ArrowDown', 'KeyS', 's')) shopScrollY = Math.min(shopMaxScroll, shopScrollY + 12);
  if (wasKeyPressed('PageUp')) shopScrollY = Math.max(0, shopScrollY - 200);
  if (wasKeyPressed('PageDown')) shopScrollY = Math.min(shopMaxScroll, shopScrollY + 200);

  // Scroll: touch drag
  if (mouse.down) {
    const dy = consumeDragDy();
    if (dy !== 0) {
      shopScrollY = clamp(shopScrollY - dy, 0, shopMaxScroll);
    }
  }

  if (mouse.justClicked) {
    if (shopContinueRect &&
        mouse.x >= shopContinueRect.x && mouse.x <= shopContinueRect.x + shopContinueRect.w &&
        mouse.y >= shopContinueRect.y && mouse.y <= shopContinueRect.y + shopContinueRect.h) {
      leaveShop();
      return;
    }
    for (const r of shopItemRects) {
      if (mouse.x >= r.x && mouse.x <= r.x + r.w &&
          mouse.y >= r.y && mouse.y <= r.y + r.h) {
        const cost = shopItemCost(r.item, player);
        if (credits >= cost && !shopItemMaxed(r.item, player)) {
          credits -= cost;
          buyShopItem(r.item, player);
          sfxUpgrade();
          spark(mouse.x, mouse.y, '#ffdd44', 12, 220);
        } else {
          sfxHit();
          shake(3, 0.1);
        }
        return;
      }
    }
  }
}

function leaveShop() {
  startNextWave();
  state = STATE.WAVE_INTRO;
  stateTime = 0;
}

// ===== Render =====
function render() {
  // Clear & background
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, W, H);
  drawNebula(ctx, W, H, totalTime);
  drawStars(ctx);

  ctx.save();
  applyShake(ctx);

  switch (state) {
    case STATE.TITLE:
      drawTitleShips(ctx);
      drawParticles(ctx);
      ctx.restore();
      drawVignette(ctx, W, H);
      drawTitleScreen(ctx, W, H, totalTime);
      break;

    case STATE.WAVE_INTRO:
    case STATE.PLAYING:
    case STATE.PAUSED:
    case STATE.UPGRADE:
    case STATE.SHOP:
    case STATE.GAME_OVER:
      // World
      for (const b of bullets) b.draw(ctx);
      for (const b of enemyBullets) b.draw(ctx);
      for (const e of enemies) e.draw(ctx);
      if (player && state !== STATE.GAME_OVER) player.draw(ctx);
      drawParticles(ctx);
      drawFloatingTexts(ctx);

      ctx.restore();

      drawVignette(ctx, W, H);

      // Screen overlays — skip HUD during upgrade and shop screens
      if (state !== STATE.GAME_OVER && state !== STATE.UPGRADE && state !== STATE.SHOP && player) {
        const boss = enemies.find(e => e.type === 'boss');
        drawHUD(ctx, W, H, player, wave, score, kills, combo, comboTimer, boss, credits);
      }

      if (state === STATE.WAVE_INTRO) {
        drawWaveAnnouncement(ctx, W, H, wave, waveAnnounceTime);
      }

      if (state === STATE.PAUSED) {
        drawPauseScreen(ctx, W, H, totalTime);
      }

      if (state === STATE.UPGRADE) {
        let hoverIdx = -1;
        for (let i = 0; i < upgradeButtonRects.length; i++) {
          const r = upgradeButtonRects[i];
          if (mouse.x >= r.x && mouse.x <= r.x + r.w &&
              mouse.y >= r.y - 12 && mouse.y <= r.y + r.h) {
            hoverIdx = i;
            break;
          }
        }
        drawUpgradeScreen(ctx, W, H, upgradeChoices, wave, totalTime, hoverIdx);
      }

      if (state === STATE.SHOP) {
        drawShopScreen(ctx, W, H, credits, player, totalTime, shopScrollY);
        if (typeof window.__shopMaxScroll === 'number') {
          shopMaxScroll = window.__shopMaxScroll;
          if (shopScrollY > shopMaxScroll) shopScrollY = shopMaxScroll;
        }
      }

      if (state === STATE.GAME_OVER) {
        drawGameOverScreen(ctx, W, H, score, wave, kills, stateTime, isHighScoreFlag);
      }
      break;
  }

  // Screen flash on top of everything
  drawFlash(ctx, W, H);

  // Custom cursor — always draw
  let isHover = false;
  if (state === STATE.UPGRADE) {
    for (const r of upgradeButtonRects) {
      if (mouse.x >= r.x && mouse.x <= r.x + r.w &&
          mouse.y >= r.y - 12 && mouse.y <= r.y + r.h) {
        isHover = true;
        break;
      }
    }
  }
  drawCrosshair(ctx, mouse.x, mouse.y, totalTime, isHover);
}

requestAnimationFrame(loop);
