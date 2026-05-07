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

function generateWave(waveNum) {
  const out = [];

  if (waveNum % 5 === 0) {
    const lvl = Math.floor(waveNum / 5);
    out.push({ type: 'boss', level: lvl });
    // Support minions scale with boss level
    const supportCount = Math.min(7, 2 + lvl * 2);
    for (let i = 0; i < supportCount; i++) {
      const r = Math.random();
      if (lvl >= 2 && r < 0.3) out.push({ type: 'shooter' });
      else if (lvl >= 2 && r < 0.5) out.push({ type: 'swarmer' });
      else out.push({ type: 'grunt' });
    }
    return out;
  }

  let budget = 6 + waveNum * 4;

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

function spawnEnemyFromSpec(spec, w, h) {
  const margin = 60;
  const side = randInt(0, 3);
  let x, y;
  if (side === 0) { x = rand(0, w); y = -margin; }
  else if (side === 1) { x = w + margin; y = rand(0, h); }
  else if (side === 2) { x = rand(0, w); y = h + margin; }
  else { x = -margin; y = rand(0, h); }

  switch (spec.type) {
    case 'grunt':   return new Grunt(x, y);
    case 'swarmer': return new Swarmer(x, y);
    case 'tank':    return new Tank(x, y);
    case 'shooter': return new Shooter(x, y);
    case 'bomber':  return new Bomber(x, y);
    case 'boss': {
      // boss spawns nearer center top
      const bx = w / 2 + rand(-100, 100);
      const by = -120;
      return new Boss(bx, by, spec.level || 1);
    }
  }
  return new Grunt(x, y);
}
