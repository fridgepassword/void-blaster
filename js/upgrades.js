// ===== Upgrades — common / uncommon / rare / epic =====
// Re-balanced and expanded. Some cards moved to Epic tier (4× weight rarer than rare),
// strong combos pushed to once-only or boss-locked, and several new mechanics added.
const UPGRADES = [
  // =============================================================
  // COMMON  — small repeatable stat bumps (high frequency)
  // =============================================================
  {
    id: 'damage', name: 'Damage Boost', icon: '⚔',
    description: '+15% bullet damage',
    rarity: 'common',
    apply: (p) => { p.damage *= 1.15; },
  },
  {
    id: 'firerate', name: 'Rapid Fire', icon: '⚡',
    description: '+12% fire rate',
    rarity: 'common',
    apply: (p) => { p.fireRate *= 1.12; },
  },
  {
    id: 'speed', name: 'Swift Engines', icon: '»',
    description: '+8% movement speed',
    rarity: 'common',
    apply: (p) => { p.speed *= 1.08; },
  },
  {
    id: 'hp', name: 'Reinforced Hull', icon: '+',
    description: '+12 max HP, full heal',
    rarity: 'common',
    apply: (p) => { p.maxHp += 12; p.hp = p.maxHp; },
  },
  {
    id: 'bulletspeed', name: 'Velocity Tuning', icon: '→',
    description: '+18% bullet speed',
    rarity: 'common',
    apply: (p) => { p.bulletSpeed *= 1.18; },
  },
  {
    id: 'bulletsize', name: 'Heavy Rounds', icon: '●',
    description: '+14% bullet size',
    rarity: 'common',
    apply: (p) => { p.bulletSize *= 1.14; },
  },
  {
    id: 'heal', name: 'Repair Kit', icon: '♥',
    description: 'Heal to full HP',
    rarity: 'common',
    apply: (p) => { p.hp = p.maxHp; },
  },
  {
    id: 'targeting', name: 'Targeting', icon: '◉',
    description: '+3% crit chance',
    rarity: 'common',
    apply: (p) => { p.critChance += 0.03; },
  },
  {
    id: 'range', name: 'Range Extender', icon: '⤳',
    description: '+10% bullet range',
    rarity: 'common',
    apply: (p) => { p.bulletLifeMult = (p.bulletLifeMult || 1) * 1.10; },
  },

  // =============================================================
  // UNCOMMON  — bigger or conditional bonuses
  // =============================================================
  {
    id: 'pierce', name: 'Piercing Rounds', icon: '↦',
    description: 'Bullets pierce 1 more enemy',
    rarity: 'uncommon',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'crit', name: 'Critical Strike', icon: '✦',
    description: '+7% crit chance',
    rarity: 'uncommon',
    apply: (p) => { p.critChance += 0.07; },
  },
  {
    id: 'lifesteal', name: 'Vampiric Rounds', icon: '♢',
    description: '+3% lifesteal',
    rarity: 'uncommon',
    apply: (p) => { p.lifesteal += 0.03; },
  },
  {
    id: 'regen', name: 'Regeneration', icon: '↻',
    description: '+0.7 HP/s regeneration',
    rarity: 'uncommon',
    apply: (p) => { p.regenRate += 0.7; },
  },
  {
    id: 'bouncy', name: 'Bouncy Bullets', icon: '⤴',
    description: 'Bullets bounce off walls (+1)',
    rarity: 'uncommon',
    apply: (p) => { p.bouncy += 1; },
  },
  {
    id: 'score', name: 'Profit Margin', icon: '$',
    description: '+18% score per kill',
    rarity: 'uncommon',
    apply: (p) => { p.scoreMult *= 1.18; },
  },
  {
    id: 'dashcd', name: 'Coolant Boost', icon: '⏱',
    description: '−15% dash cooldown',
    rarity: 'uncommon',
    requires: (p) => p.canDash,
    apply: (p) => { p.dashCooldownMax *= 0.85; },
  },
  {
    id: 'shieldspeed', name: 'Quick Recharge', icon: '⟳',
    description: '−20% shield recharge time',
    rarity: 'uncommon',
    requires: (p) => p.maxShield > 0,
    apply: (p) => { p.shieldRecharge *= 0.8; },
  },
  {
    id: 'movers_edge', name: "Mover's Edge", icon: '↗',
    description: '+12% damage while moving',
    rarity: 'uncommon',
    apply: (p) => { p.moversEdge += 0.12; },
  },
  {
    id: 'iron_will', name: 'Iron Will', icon: '⛨',
    description: '+35% i-frame duration after a hit',
    rarity: 'uncommon',
    apply: (p) => { p.iframeMult *= 1.35; },
    once: true,
  },
  {
    id: 'adrenaline', name: 'Adrenaline', icon: '!',
    description: 'At low HP (<30%), +22% fire rate',
    rarity: 'uncommon',
    once: true,
    apply: (p) => { p.adrenaline = true; },
  },
  {
    id: 'kill_heal', name: 'Salvage Drone', icon: '⚙',
    description: 'Heal 1.8% max HP on kill',
    rarity: 'uncommon',
    apply: (p) => { p.killHeal += 0.018; },
  },
  {
    id: 'steady_aim', name: 'Steady Aim', icon: '◈',
    description: 'First shot in a volley deals +25%',
    rarity: 'uncommon',
    once: true,
    apply: (p) => { p.steadyAim = true; },
  },
  {
    id: 'endurance', name: 'Endurance', icon: '✚',
    description: 'Heal 4 HP every 10 kills',
    rarity: 'uncommon',
    apply: (p) => { p.endurance = (p.endurance || 0) + 1; },
  },
  {
    id: 'reactive', name: 'Reactive Plate', icon: '◎',
    description: '5% chance to dodge incoming damage',
    rarity: 'uncommon',
    apply: (p) => { p.dodgeChance = (p.dodgeChance || 0) + 0.05; },
  },

  // =============================================================
  // RARE  — build-defining
  // =============================================================
  {
    id: 'multishot', name: 'Multi-Shot', icon: '☰',
    description: '+1 parallel bullet (−14% per-bullet dmg)',
    rarity: 'rare',
    apply: (p) => {
      p.multishot += 1;
      p.damage *= 0.86;
    },
  },
  {
    id: 'spread', name: 'Spread Shot', icon: '※',
    description: '+2 angled bullets (−10% per-bullet dmg)',
    rarity: 'rare',
    apply: (p) => { p.spread += 1; p.damage *= 0.90; },
  },
  {
    id: 'dash', name: 'Dash Drive', icon: '⟫',
    description: 'Unlock dash (Shift) — i-frames during dash',
    rarity: 'rare',
    once: true,
    requires: (p) => !p.canDash,
    apply: (p) => { p.canDash = true; },
  },
  {
    id: 'shield', name: 'Energy Shield', icon: '◯',
    description: '+1 shield charge',
    rarity: 'rare',
    apply: (p) => {
      if (p.maxShield === 0) p.shieldRecharge = 9;
      p.maxShield += 1;
      p.shield = p.maxShield;
    },
    requires: (p) => p.maxShield < 3,   // tighter cap
  },
  {
    id: 'explode', name: 'Explosive Rounds', icon: '✸',
    description: 'Bullets explode on impact',
    rarity: 'rare',
    once: true,
    requires: (p) => p.bulletExplode === 0,
    apply: (p) => { p.bulletExplode = 1; },
  },
  {
    id: 'homing', name: 'Homing Missiles', icon: '↗',
    description: 'Bullets curve toward enemies',
    rarity: 'rare',
    apply: (p) => { p.homing = (p.homing || 0) + 3; },
  },
  {
    id: 'berserker', name: 'Berserker', icon: '☠',
    description: '+25% damage, −15 max HP',
    rarity: 'rare',
    apply: (p) => {
      p.damage *= 1.25;
      p.maxHp = Math.max(20, p.maxHp - 15);
      p.hp = Math.min(p.hp, p.maxHp);
    },
  },
  {
    id: 'glasscannon', name: 'Glass Cannon', icon: '◆',
    description: '+25% fire rate, take +30% damage',
    rarity: 'rare',
    apply: (p) => {
      p.fireRate *= 1.25;
      p.damageTakenMult *= 1.30;
    },
  },
  {
    id: 'glass_hull', name: 'Glass Hull', icon: '◇',
    description: '+45% damage when shield is empty',
    rarity: 'rare',
    once: true,
    requires: (p) => p.maxShield > 0,
    apply: (p) => { p.glassHull = true; p.glassHullMult = 1.45; },
  },
  {
    id: 'frost_shot', name: 'Frost Rounds', icon: '❄',
    description: 'Hits slow enemies for 1.2s',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.frostShot = true; p.frostDuration = 1.2; },
  },
  {
    id: 'burn_shot', name: 'Burn Rounds', icon: '※',
    description: 'Hits ignite for 4 dps over 2s (stacks)',
    rarity: 'rare',
    apply: (p) => {
      if (p.burnDps === 0) p.burnDuration = 2.0;
      p.burnDps += 4;
    },
  },
  {
    id: 'combo_master', name: 'Combo Master', icon: '∞',
    description: '+0.5% damage per combo (cap +25%)',
    rarity: 'rare',
    apply: (p) => { p.comboMaster += 0.005; },
  },
  {
    id: 'multi_crit', name: 'Multi-Crit', icon: '✦✦',
    description: 'A volley either fully crits or fully doesn\'t',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.multiCrit = true; },
  },
  {
    id: 'charged', name: 'Charged Shot', icon: '◆',
    description: 'Every 5th shot deals +85% damage',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.chargedShot = true; },
  },
  {
    id: 'riposte', name: 'Riposte', icon: '↺',
    description: 'After taking a hit, next 5 shots +50% dmg',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.riposte = true; },
  },

  // =============================================================
  // BOSS-LOCKED RARE  — unlocks after defeating bosses
  // =============================================================
  {
    id: 'twin_cannon', name: 'Twin Cannon', icon: '⫸',
    description: '+1 multishot, +1 spread (−18% per-bullet dmg)',
    rarity: 'rare',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.multishot += 1; p.spread += 1; p.damage *= 0.82; },
  },
  {
    id: 'volatile', name: 'Volatile Rounds', icon: '⊛',
    description: 'Hits splash 1 nearby enemy (45% dmg)',
    rarity: 'rare',
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.splashChain += 1; },
  },
  {
    id: 'chrono', name: 'Chrono Field', icon: '◷',
    description: 'All enemies move 8% slower',
    rarity: 'rare',
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.chronoField = Math.min(0.30, p.chronoField + 0.08); },
  },

  // =============================================================
  // EPIC  — rare, build-defining one-time effects
  // =============================================================
  {
    id: 'devastation', name: 'Devastation', icon: '★',
    description: '+0.3× crit damage multiplier',
    rarity: 'epic',
    apply: (p) => { p.critMult += 0.3; },
  },
  {
    id: 'steady_sights', name: 'Steady Sights', icon: '◎',
    description: '+5% crit chance and +0.18× crit dmg',
    rarity: 'epic',
    apply: (p) => { p.critChance += 0.05; p.critMult += 0.18; },
  },
  {
    id: 'damage_mastery', name: 'Damage Mastery', icon: '✚⚔',
    description: '+30% damage',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.damage *= 1.30; },
  },
  {
    id: 'doppler', name: 'Doppler Drive', icon: '⫷⫸',
    description: 'Bullets clone on first hit (35% dmg)',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.doppler = true; p.dopplerMult = 0.35; },
  },
  {
    id: 'eclipse', name: 'Eclipse Burst', icon: '◐',
    description: 'Every 14s — 2.5s of 1.7× fire rate',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.eclipseBurst = true; p.eclipseTimer = 14; },
  },
  {
    id: 'final_stand', name: 'Final Stand', icon: '✶',
    description: 'Below 20% HP: +50% dmg dealt, −35% dmg taken',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.finalStand = true; },
  },
  {
    id: 'apex', name: 'Apex Predator', icon: '✪',
    description: '+15% damage, +1 multishot (−10% per-bullet)',
    rarity: 'epic',
    once: true,
    requires: (p) => p.bossesDefeated >= 2,
    apply: (p) => { p.damage *= 1.15 * 0.9; p.multishot += 1; },
  },
  {
    id: 'phoenix', name: 'Phoenix', icon: '♁',
    description: 'Revive once at 40% HP on death',
    rarity: 'epic',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.phoenix = true; },
  },
  {
    id: 'spread_mastery', name: 'Spread Mastery', icon: '※※',
    description: '+2 spread bullets (−15% per-bullet)',
    rarity: 'epic',
    once: true,
    requires: (p) => p.bossesDefeated >= 2,
    apply: (p) => { p.spread += 2; p.damage *= 0.85; },
  },

  // =============================================================
  // LEGENDARY  — extremely rare, run-defining (mostly boss-locked)
  // =============================================================
  {
    id: 'bullet_storm', name: 'Bullet Storm', icon: '☄',
    description: '+25% damage AND +20% fire rate',
    rarity: 'legendary',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.damage *= 1.25; p.fireRate *= 1.20; },
  },
  {
    id: 'iron_skin', name: 'Iron Skin', icon: '⛊',
    description: '−25% all damage taken (one-time)',
    rarity: 'legendary',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.damageTakenMult *= 0.75; },
  },
  {
    id: 'time_eternal', name: 'Time Eternal', icon: '⧖',
    description: '+15% global slow on all enemies',
    rarity: 'legendary',
    once: true,
    requires: (p) => p.bossesDefeated >= 2,
    apply: (p) => { p.chronoField = Math.min(0.45, (p.chronoField || 0) + 0.15); },
  },
  {
    id: 'reincarnation', name: 'Reincarnation', icon: '♁♁',
    description: 'Two more Phoenix revives',
    rarity: 'legendary',
    once: true,
    requires: (p) => p.bossesDefeated >= 2 && p.phoenix,
    apply: (p) => { p.phoenixCharges = (p.phoenixCharges || 0) + 2; },
  },
  {
    id: 'overcharge', name: 'Overcharge Core', icon: '⚡⚡',
    description: 'Crit chance +12%, +0.4× crit dmg',
    rarity: 'legendary',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.critChance += 0.12; p.critMult += 0.4; },
  },
  {
    id: 'singularity', name: 'Singularity', icon: '◉',
    description: '+2 multishot (no damage penalty)',
    rarity: 'legendary',
    once: true,
    requires: (p) => p.bossesDefeated >= 3,
    apply: (p) => { p.multishot += 2; },
  },
];

const RARITY_WEIGHTS = { common: 100, uncommon: 45, rare: 14, epic: 3.5, legendary: 0.8 };
const RARITY_COLORS = {
  common: '#88aaee',
  uncommon: '#44ddff',
  rare: '#ff66dd',
  epic: '#ffaa00',
  legendary: '#ff3344',
};

function rollUpgrades(player, count) {
  const available = UPGRADES.filter(u => {
    if (u.requires && !u.requires(player)) return false;
    if (u.once && player.takenOnce.has(u.id)) return false;
    return true;
  });

  const pool = available.slice();
  const luck = player.luck || 0;
  const weights = pool.map(u => {
    let w = RARITY_WEIGHTS[u.rarity] || 30;
    if (u.rarity === 'legendary') w *= (1 + luck * 8);
    else if (u.rarity === 'epic') w *= (1 + luck * 6);
    else if (u.rarity === 'rare') w *= (1 + luck * 4);
    else if (u.rarity === 'uncommon') w *= (1 + luck * 1.5);
    return w;
  });
  const chosen = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = weights.reduce((s, x) => s + x, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= weights[j];
      if (r <= 0) { idx = j; break; }
    }
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
    weights.splice(idx, 1);
  }
  return chosen;
}

// ===== Shop items — buy with credits between waves =====
// Costs scale with how many you've already bought. Things compound, so steps are small per purchase.
const SHOP_ITEMS = [
  {
    id: 'shop_repair', name: 'Repair', icon: '♥',
    description: 'Heal 30 HP instantly',
    baseCost: 5, costStep: 2,
    apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + 30); },
    instant: true,
  },
  {
    id: 'shop_damage', name: 'Damage Mod', icon: '⚔',
    description: '+5% bullet damage',
    baseCost: 8, costStep: 5,
    apply: (p) => { p.damage *= 1.05; },
  },
  {
    id: 'shop_firerate', name: 'Trigger Mod', icon: '⚡',
    description: '+4% fire rate',
    baseCost: 9, costStep: 6,
    apply: (p) => { p.fireRate *= 1.04; },
  },
  {
    id: 'shop_hp', name: 'Hull Plating', icon: '+',
    description: '+8 max HP, full heal',
    baseCost: 7, costStep: 4,
    apply: (p) => { p.maxHp += 8; p.hp = p.maxHp; },
  },
  {
    id: 'shop_speed', name: 'Engine Tune', icon: '»',
    description: '+3% movement speed',
    baseCost: 6, costStep: 4,
    apply: (p) => { p.speed *= 1.03; },
  },
  {
    id: 'shop_crit', name: 'Targeting Chip', icon: '✦',
    description: '+2% crit chance',
    baseCost: 11, costStep: 6,
    apply: (p) => { p.critChance += 0.02; },
    max: 12,
  },
  {
    id: 'shop_luck', name: 'Lucky Charm', icon: '★',
    description: '+5% luck (more rare upgrades)',
    baseCost: 14, costStep: 9,
    apply: (p) => { p.luck = (p.luck || 0) + 0.05; },
    max: 5,
  },
  {
    id: 'shop_bullet', name: 'Round Caliber', icon: '●',
    description: '+5% bullet size',
    baseCost: 6, costStep: 4,
    apply: (p) => { p.bulletSize *= 1.05; },
  },
];

function shopItemCost(item, player) {
  const count = (player.shopPurchases && player.shopPurchases[item.id]) || 0;
  return item.baseCost + item.costStep * count;
}

function shopItemMaxed(item, player) {
  if (!item.max) return false;
  const count = (player.shopPurchases && player.shopPurchases[item.id]) || 0;
  return count >= item.max;
}

function buyShopItem(item, player) {
  item.apply(player);
  if (!player.shopPurchases) player.shopPurchases = {};
  player.shopPurchases[item.id] = (player.shopPurchases[item.id] || 0) + 1;
}

function applyUpgrade(player, upgrade) {
  upgrade.apply(player);
  if (upgrade.once) player.takenOnce.add(upgrade.id);
}
