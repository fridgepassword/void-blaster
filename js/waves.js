// ===== Wave generation =====
// Each wave gets a "budget" that grows, and is spent on enemies of varying cost.
// Boss waves every 5 waves include a boss + minions.

const ENEMY_COSTS = {
  grunt: 2,
  swarmer: 3,
  shooter: 5,
  tank: 8,
  bomber: 6,
};

function generateWave(waveNum, difficulty) {
  const out = [];

  if (waveNum % 5 === 0) {
    const lvl = Math.floor(waveNum / 5);
    out.push({ type: 'boss', level: lvl });
    // Support minions scale with boss level (more aggressive in late game)
    const supportCount = Math.min(12, 3 + lvl * 2);
    for (let i = 0; i < supportCount; i++) {
      const r = Math.random();
      if (lvl >= 3 && r < 0.2) out.push({ type: 'tank' });
      else if (lvl >= 2 && r < 0.35) out.push({ type: 'shooter' });
      else if (lvl >= 2 && r < 0.55) out.push({ type: 'swarmer' });
      else out.push({ type: 'grunt' });
    }
    return out;
  }

  // Budget compounds in late game so wave 10+ is dramatically more enemies.
  // Wave 1: 11, wave 5: 28, wave 10: 60, wave 15: 105, wave 20: 165 (before difficulty mult).
  let budget = 6 + waveNum * 4.5;
  if (waveNum > 5) budget += Math.pow(waveNum - 5, 1.6) * 0.6;
  if (difficulty && difficulty.waveBudgetMult) budget *= difficulty.waveBudgetMult;

  // Available enemy types unlock as the game progresses
  const types = ['grunt'];
  if (waveNum >= 2) types.push('swarmer');
  if (waveNum >= 3) types.push('shooter');
  if (waveNum >= 4) types.push('tank');
  if (waveNum >= 6) types.push('bomber');

  // Theme some waves to feel distinct
  const themeRoll = Math.random();
  let weights;
  if (themeRoll < 0.15 && types.includes('swarmer')) {
    // Swarm wave
    weights = { grunt: 1, swarmer: 6, shooter: 0.5, tank: 0.2, bomber: 0.5 };
  } else if (themeRoll < 0.3 && types.includes('tank')) {
    // Heavy wave
    weights = { grunt: 1, swarmer: 0.5, shooter: 1, tank: 4, bomber: 0.5 };
  } else if (themeRoll < 0.45 && types.includes('shooter')) {
    // Sniper wave
    weights = { grunt: 1, swarmer: 0.5, shooter: 4, tank: 1, bomber: 0.5 };
  } else {
    weights = { grunt: 3, swarmer: 2, shooter: 2, tank: 1.5, bomber: 1 };
  }

  // Force a tank or bomber as anchor in later waves
  if (waveNum >= 4 && Math.random() < 0.6) {
    out.push({ type: 'tank' });
    budget -= ENEMY_COSTS.tank;
  }

  let safety = 0;
  while (budget > 0 && safety++ < 200) {
    const eligible = types.filter(t => ENEMY_COSTS[t] <= budget + 1);
    if (eligible.length === 0) break;
    // Weighted choice
    const ws = eligible.map(t => weights[t] || 1);
    const total = ws.reduce((s, x) => s + x, 0);
    let r = Math.random() * total;
    let pick = eligible[0];
    for (let i = 0; i < eligible.length; i++) {
      r -= ws[i];
      if (r <= 0) { pick = eligible[i]; break; }
    }
    out.push({ type: pick });
    budget -= ENEMY_COSTS[pick];
  }

  return out;
}

// Per-wave stat scaling — enemies get tougher AND deal more damage in late game.
function enemyWaveScale(waveNum) {
  const w = Math.max(1, waveNum);
  return {
    hpMult:     1 + (w - 1) * 0.09 + Math.max(0, w - 8) * 0.05,   // wave 10 ~1.91x, wave 20 ~3.31x
    dmgMult:    1 + (w - 1) * 0.05 + Math.max(0, w - 8) * 0.03,   // wave 10 ~1.51x, wave 20 ~2.31x
    speedMult:  1 + (w - 1) * 0.015,                              // very gentle speed creep
    scoreMult:  1 + (w - 1) * 0.04,                               // late kills are worth more
    creditMult: 1 + Math.max(0, (w - 4)) * 0.04,                  // a bit more loot after wave 4
  };
}

function applyWaveScale(enemy, scale) {
  enemy.maxHp = Math.round(enemy.maxHp * scale.hpMult);
  enemy.hp = enemy.maxHp;
  enemy.damage = Math.round(enemy.damage * scale.dmgMult);
  enemy.speed *= scale.speedMult;
  enemy.scoreValue = Math.round(enemy.scoreValue * scale.scoreMult);
  enemy.creditsValue = Math.max(1, Math.round(enemy.creditsValue * scale.creditMult));
}

function spawnEnemyFromSpec(spec, w, h, waveNum, difficulty) {
  const margin = 60;
  const side = randInt(0, 3);
  let x, y;
  if (side === 0) { x = rand(0, w); y = -margin; }
  else if (side === 1) { x = w + margin; y = rand(0, h); }
  else if (side === 2) { x = rand(0, w); y = h + margin; }
  else { x = -margin; y = rand(0, h); }

  let enemy;
  switch (spec.type) {
    case 'grunt':   enemy = new Grunt(x, y); break;
    case 'swarmer': enemy = new Swarmer(x, y); break;
    case 'tank':    enemy = new Tank(x, y); break;
    case 'shooter': enemy = new Shooter(x, y); break;
    case 'bomber':  enemy = new Bomber(x, y); break;
    case 'boss': {
      const bx = w / 2 + rand(-100, 100);
      const by = -120;
      enemy = new Boss(bx, by, spec.level || 1);
      break;
    }
    default: enemy = new Grunt(x, y);
  }
  // Apply per-wave scaling (skip for bosses — they already scale via level).
  if (spec.type !== 'boss' && waveNum) {
    applyWaveScale(enemy, enemyWaveScale(waveNum));
  }
  // Apply difficulty modifiers (bosses included)
  if (difficulty) {
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * difficulty.enemyHpMult));
    enemy.hp = enemy.maxHp;
    enemy.damage = Math.max(1, Math.round(enemy.damage * difficulty.enemyDmgMult));
  }
  return enemy;
}
