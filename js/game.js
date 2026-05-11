// ===== Main game: state machine + loop + glue =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;
let renderScale = 1; // physical-pixels-per-world-unit (excluding DPR)
let player = null;   // declared early so resize() can safely reference it

// Render scaling — target a "comfy" world size and zoom in/out to fit.
// On phones, the world is BIGGER than the screen (gives breathing room to dodge),
// and entities/HUD get a separate phone boost so they stay visible.
const TARGET_MIN_WORLD = 620;     // world short-side aim — bigger = more room
const MIN_RENDER_SCALE = 0.55;    // smallest phones can't zoom out further
const MAX_RENDER_SCALE = 2.2;     // 4K caps here so things don't get absurd

let phoneFactor = 1;              // entity / HUD size multiplier (>1 on phones)

function resize() {
  const physW = window.innerWidth;
  const physH = window.innerHeight;
  const minPhys = Math.min(physW, physH);

  // Single continuous formula: try to give every screen ~TARGET_MIN_WORLD world units
  // on its shorter dimension. Phones get scale < 1 (zoomed out, more room),
  // desktops get scale > 1 (entities pleasantly large).
  renderScale = clamp(minPhys / TARGET_MIN_WORLD, MIN_RENDER_SCALE, MAX_RENDER_SCALE);

  // Phone boost — on small / zoomed-out screens, render entities bigger in world units
  // so they're still visible after the world scaling. Desktops get 1×.
  phoneFactor = renderScale < 0.85 ? clamp(1.4 / renderScale * 0.7, 1.2, 1.8) : 1;

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

// Expose for input conversion + phone-sensitive sizing
window.__renderScale = () => renderScale;
window.__phoneFactor = () => phoneFactor;

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
const DIFFICULTIES = {
  easy: {
    name: 'EASY',  color: '#88ff88',
    desc: 'For learning the ropes',
    enemyHpMult: 0.8,  enemyDmgMult: 0.75,
    playerDmgTakenMult: 0.8, waveBudgetMult: 0.85, scoreMult: 0.8,
  },
  normal: {
    name: 'NORMAL', color: '#88ccff',
    desc: 'The intended challenge',
    enemyHpMult: 1.0,  enemyDmgMult: 1.0,
    playerDmgTakenMult: 1.0, waveBudgetMult: 1.0, scoreMult: 1.0,
  },
  hard: {
    name: 'HARD',  color: '#ff8844',
    desc: 'Expect to die',
    enemyHpMult: 1.3,  enemyDmgMult: 1.25,
    playerDmgTakenMult: 1.2, waveBudgetMult: 1.15, scoreMult: 1.35,
  },
  brutal: {
    name: 'BRUTAL', color: '#ff3344',
    desc: 'For masochists',
    enemyHpMult: 1.6,  enemyDmgMult: 1.55,
    playerDmgTakenMult: 1.5, waveBudgetMult: 1.3, scoreMult: 1.8,
  },
};
const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

const settings = {
  controlMode: 'wasd',
  difficulty: 'normal',
};
function loadSettings() {
  const m = localStorage.getItem('voidblaster_control');
  if (m && CONTROL_MODES.includes(m)) settings.controlMode = m;
  // Auto-detect touch on first load if no preference set
  if (!m && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    settings.controlMode = 'touch';
  }
  const d = localStorage.getItem('voidblaster_difficulty');
  if (d && DIFFICULTIES[d]) settings.difficulty = d;
}
function saveSettings() {
  try {
    localStorage.setItem('voidblaster_control', settings.controlMode);
    localStorage.setItem('voidblaster_difficulty', settings.difficulty);
  } catch (e) {}
}
loadSettings();
window.__settings = settings;
window.__getDifficulty = () => DIFFICULTIES[settings.difficulty] || DIFFICULTIES.normal;

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
  const diff = window.__getDifficulty();
  waveSpec = generateWave(wave, diff);
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
  // Phoenix — one revive per run
  if (player && player.phoenix && !player.phoenixUsed) {
    player.phoenixUsed = true;
    player.hp = Math.max(1, player.maxHp * 0.5);
    player.invincible = 2.5;
    flash(255, 200, 80, 0.6, 1.5);
    shake(20, 0.5);
    explosion(player.x, player.y, '#ffaa44', 60, 450, 0.9);
    explosion(player.x, player.y, '#ffffff', 30, 250, 0.5);
    addFloatingText(player.x, player.y - 30, 'PHOENIX!', '#ffaa44', 28);
    sfxUpgrade();
    return;
  }
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
        const pickedDiff = pickDifficulty(mouse.x, mouse.y);
        if (pickedDiff) {
          settings.difficulty = pickedDiff;
          saveSettings();
          sfxClick();
          mouse.justClicked = false;
          break;
        }
        const pickedMode = pickControlMode(mouse.x, mouse.y);
        if (pickedMode) {
          settings.controlMode = pickedMode;
          saveSettings();
          sfxClick();
          mouse.justClicked = false;
        } else if (consumeClick()) {
          startGame();
        }
      }
      // Quick-cycle control with Tab
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
      enemies.push(spawnEnemyFromSpec(next, W, H, wave, window.__getDifficulty()));
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

          // Doppler — first hit spawns 2 perpendicular clone bullets at half damage
          if (b.doppler && !b.dopplerSpawned) {
            b.dopplerSpawned = true;
            const baseAng = Math.atan2(b.vy, b.vx);
            const speed = Math.hypot(b.vx, b.vy);
            for (const s of [-1, 1]) {
              bullets.push(new Bullet(
                b.x, b.y,
                baseAng + s * Math.PI / 2,
                speed,
                b.damage * 0.5,
                { size: b.size * 0.8, pierce: 0, isCrit: b.isCrit, life: 0.9 }
              ));
            }
            spark(b.x, b.y, '#ff66ff', 6, 200);
          }

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
        }
      }
    }

    if (e.dead) {
      // Combo
      combo++;
      comboTimer = COMBO_WINDOW;
      const comboBonus = 1 + Math.min(2, combo * 0.04);
      const diff = window.__getDifficulty();
      const scoreGain = Math.floor(e.scoreValue * player.scoreMult * comboBonus * (diff?.scoreMult || 1));
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
      // Endurance — heal every 8 kills per stack
      if (player.endurance > 0) {
        player.enduranceCount++;
        if (player.enduranceCount >= 8) {
          player.enduranceCount = 0;
          const heal = 6 * player.endurance;
          player.hp = Math.min(player.maxHp, player.hp + heal);
          addFloatingText(player.x, player.y - 24, `+${heal}♥`, '#88ff88', 14);
        }
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

  // Custom cursor — only when there is one (skip touch mode)
  if (settings.controlMode !== 'touch') {
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
}

requestAnimationFrame(loop);
