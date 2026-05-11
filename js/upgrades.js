// ===== Upgrades — common / uncommon / rare / epic =====
// Re-balanced and expanded. Some cards moved to Epic tier (4× weight rarer than rare),
// strong combos pushed to once-only or boss-locked, and several new mechanics added.
const UPGRADES = [
  // =============================================================
  // COMMON  — small repeatable stat bumps (high frequency)
  // =============================================================
  {
    id: 'damage', name: 'Damage Boost', icon: '⚔',
    description: '+22% bullet damage',
    rarity: 'common',
    apply: (p) => { p.damage *= 1.22; },
  },
  {
    id: 'firerate', name: 'Rapid Fire', icon: '⚡',
    description: '+18% fire rate',
    rarity: 'common',
    apply: (p) => { p.fireRate *= 1.18; },
  },
  {
    id: 'speed', name: 'Swift Engines', icon: '»',
    description: '+12% movement speed',
    rarity: 'common',
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'hp', name: 'Reinforced Hull', icon: '+',
    description: '+20 max HP, full heal',
    rarity: 'common',
    apply: (p) => { p.maxHp += 20; p.hp = p.maxHp; },
  },
  {
    id: 'bulletspeed', name: 'Velocity Tuning', icon: '→',
    description: '+25% bullet speed',
    rarity: 'common',
    apply: (p) => { p.bulletSpeed *= 1.25; },
  },
  {
    id: 'bulletsize', name: 'Heavy Rounds', icon: '●',
    description: '+20% bullet size',
    rarity: 'common',
    apply: (p) => { p.bulletSize *= 1.20; },
  },
  {
    id: 'heal', name: 'Repair Kit', icon: '♥',
    description: 'Heal to full HP',
    rarity: 'common',
    apply: (p) => { p.hp = p.maxHp; },
  },
  {
    id: 'targeting', name: 'Targeting', icon: '◉',
    description: '+5% crit chance',
    rarity: 'common',
    apply: (p) => { p.critChance += 0.05; },
  },
  {
    id: 'range', name: 'Range Extender', icon: '⤳',
    description: '+15% bullet range',
    rarity: 'common',
    apply: (p) => { p.bulletLifeMult = (p.bulletLifeMult || 1) * 1.15; },
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
    description: '+10% crit chance',
    rarity: 'uncommon',
    apply: (p) => { p.critChance += 0.10; },
  },
  {
    id: 'lifesteal', name: 'Vampiric Rounds', icon: '♢',
    description: '+4% lifesteal',
    rarity: 'uncommon',
    apply: (p) => { p.lifesteal += 0.04; },
  },
  {
    id: 'regen', name: 'Regeneration', icon: '↻',
    description: '+1 HP/s regeneration',
    rarity: 'uncommon',
    apply: (p) => { p.regenRate += 1; },
  },
  {
    id: 'bouncy', name: 'Bouncy Bullets', icon: '⤴',
    description: 'Bullets bounce off walls (+2)',
    rarity: 'uncommon',
    apply: (p) => { p.bouncy += 2; },
  },
  {
    id: 'score', name: 'Profit Margin', icon: '$',
    description: '+22% score per kill',
    rarity: 'uncommon',
    apply: (p) => { p.scoreMult *= 1.22; },
  },
  {
    id: 'dashcd', name: 'Coolant Boost', icon: '⏱',
    description: '−20% dash cooldown',
    rarity: 'uncommon',
    requires: (p) => p.canDash,
    apply: (p) => { p.dashCooldownMax *= 0.8; },
  },
  {
    id: 'shieldspeed', name: 'Quick Recharge', icon: '⟳',
    description: '−25% shield recharge time',
    rarity: 'uncommon',
    requires: (p) => p.maxShield > 0,
    apply: (p) => { p.shieldRecharge *= 0.75; },
  },
  {
    id: 'movers_edge', name: "Mover's Edge", icon: '↗',
    description: '+18% damage while moving',
    rarity: 'uncommon',
    apply: (p) => { p.moversEdge += 0.18; },
  },
  {
    id: 'iron_will', name: 'Iron Will', icon: '⛨',
    description: '+50% i-frame duration after a hit',
    rarity: 'uncommon',
    apply: (p) => { p.iframeMult *= 1.5; },
    once: true,
  },
  {
    id: 'adrenaline', name: 'Adrenaline', icon: '!',
    description: 'At low HP (<30%), +30% fire rate',
    rarity: 'uncommon',
    once: true,
    apply: (p) => { p.adrenaline = true; },
  },
  {
    id: 'kill_heal', name: 'Salvage Drone', icon: '⚙',
    description: 'Heal 2.5% max HP on kill',
    rarity: 'uncommon',
    apply: (p) => { p.killHeal += 0.025; },
  },
  {
    id: 'steady_aim', name: 'Steady Aim', icon: '◈',
    description: 'First shot in a volley deals +40%',
    rarity: 'uncommon',
    once: true,
    apply: (p) => { p.steadyAim = true; },
  },
  {
    id: 'endurance', name: 'Endurance', icon: '✚',
    description: 'Heal 6 HP every 8 kills',
    rarity: 'uncommon',
    apply: (p) => { p.endurance = (p.endurance || 0) + 1; },
  },
  {
    id: 'reactive', name: 'Reactive Plate', icon: '◎',
    description: '8% chance to dodge incoming damage',
    rarity: 'uncommon',
    apply: (p) => { p.dodgeChance = (p.dodgeChance || 0) + 0.08; },
  },

  // =============================================================
  // RARE  — build-defining
  // =============================================================
  {
    id: 'multishot', name: 'Multi-Shot', icon: '☰',
    description: '+1 parallel bullet (slight per-bullet dmg)',
    rarity: 'rare',
    apply: (p) => {
      p.multishot += 1;
      p.damage *= 0.92;       // small tax to keep multi from snowballing
    },
  },
  {
    id: 'spread', name: 'Spread Shot', icon: '※',
    description: '+2 angled bullets (slight per-bullet dmg)',
    rarity: 'rare',
    apply: (p) => { p.spread += 1; p.damage *= 0.94; },
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
      if (p.maxShield === 0) p.shieldRecharge = 8;
      p.maxShield += 1;
      p.shield = p.maxShield;
    },
    requires: (p) => p.maxShield < 4,   // cap so it's not infinite tanking
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
    apply: (p) => { p.homing = (p.homing || 0) + 4; },
  },
  {
    id: 'berserker', name: 'Berserker', icon: '☠',
    description: '+35% damage, −12 max HP',
    rarity: 'rare',
    apply: (p) => {
      p.damage *= 1.35;
      p.maxHp = Math.max(20, p.maxHp - 12);
      p.hp = Math.min(p.hp, p.maxHp);
    },
  },
  {
    id: 'glasscannon', name: 'Glass Cannon', icon: '◆',
    description: '+35% fire rate, take +25% damage',
    rarity: 'rare',
    apply: (p) => {
      p.fireRate *= 1.35;
      p.damageTakenMult *= 1.25;
    },
  },
  {
    id: 'glass_hull', name: 'Glass Hull', icon: '◇',
    description: '+60% damage when shield is empty',
    rarity: 'rare',
    once: true,
    requires: (p) => p.maxShield > 0,
    apply: (p) => { p.glassHull = true; },
  },
  {
    id: 'frost_shot', name: 'Frost Rounds', icon: '❄',
    description: 'Hits slow enemies for 1.5s',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.frostShot = true; },
  },
  {
    id: 'burn_shot', name: 'Burn Rounds', icon: '※',
    description: 'Hits ignite for 5 dps over 2s (stacks)',
    rarity: 'rare',
    apply: (p) => {
      if (p.burnDps === 0) p.burnDuration = 2.0;
      p.burnDps += 5;
    },
  },
  {
    id: 'combo_master', name: 'Combo Master', icon: '∞',
    description: '+0.8% damage per combo (cap +40%)',
    rarity: 'rare',
    apply: (p) => { p.comboMaster += 0.008; },
  },
  {
    id: 'multi_crit', name: 'Multi-Crit', icon: '✦✦',
    description: 'When one bullet crits, all bullets that shot crit',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.multiCrit = true; },
  },
  {
    id: 'charged', name: 'Charged Shot', icon: '◆',
    description: 'Every 5th shot deals +120% damage',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.chargedShot = true; },
  },
  {
    id: 'riposte', name: 'Riposte', icon: '↺',
    description: 'After taking a hit, next 5 shots +75% dmg',
    rarity: 'rare',
    once: true,
    apply: (p) => { p.riposte = true; },
  },

  // =============================================================
  // BOSS-LOCKED RARE  — unlocks after defeating bosses
  // =============================================================
  {
    id: 'twin_cannon', name: 'Twin Cannon', icon: '⫸',
    description: '+1 multishot AND +1 spread',
    rarity: 'rare',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.multishot += 1; p.spread += 1; p.damage *= 0.88; },
  },
  {
    id: 'volatile', name: 'Volatile Rounds', icon: '⊛',
    description: 'Hits splash 1 nearby enemy (55% dmg)',
    rarity: 'rare',
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.splashChain += 1; },
  },
  {
    id: 'chrono', name: 'Chrono Field', icon: '◷',
    description: 'All enemies move 12% slower',
    rarity: 'rare',
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.chronoField = Math.min(0.35, p.chronoField + 0.12); },
  },

  // =============================================================
  // EPIC  — rare game-changers, mostly one-time
  // =============================================================
  {
    id: 'devastation', name: 'Devastation', icon: '★',
    description: '+0.4× crit damage multiplier',
    rarity: 'epic',
    apply: (p) => { p.critMult += 0.4; },
  },
  {
    id: 'steady_sights', name: 'Steady Sights', icon: '◎',
    description: '+8% crit chance and +0.25× crit dmg',
    rarity: 'epic',
    apply: (p) => { p.critChance += 0.08; p.critMult += 0.25; },
  },
  {
    id: 'damage_mastery', name: 'Damage Mastery', icon: '✚⚔',
    description: '+50% damage',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.damage *= 1.5; },
  },
  {
    id: 'doppler', name: 'Doppler Drive', icon: '⫷⫸',
    description: 'Bullets clone on first hit (50% dmg)',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.doppler = true; },
  },
  {
    id: 'eclipse', name: 'Eclipse Burst', icon: '◐',
    description: 'Every 12s — 3s of 2× fire rate',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.eclipseBurst = true; p.eclipseTimer = 12; },
  },
  {
    id: 'final_stand', name: 'Final Stand', icon: '✶',
    description: 'Below 20% HP: +70% dmg dealt, −50% dmg taken',
    rarity: 'epic',
    once: true,
    apply: (p) => { p.finalStand = true; },
  },
  {
    id: 'apex', name: 'Apex Predator', icon: '✪',
    description: '+25% damage, +1 multishot',
    rarity: 'epic',
    once: true,
    requires: (p) => p.bossesDefeated >= 2,
    apply: (p) => { p.damage *= 1.25; p.multishot += 1; },
  },
  {
    id: 'phoenix', name: 'Phoenix', icon: '♁',
    description: 'Revive once at 50% HP on death',
    rarity: 'epic',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.phoenix = true; },
  },
  {
    id: 'spread_mastery', name: 'Spread Mastery', icon: '※※',
    description: '+3 spread bullets',
    rarity: 'epic',
    once: true,
    requires: (p) => p.bossesDefeated >= 2,
    apply: (p) => { p.spread += 3; p.damage *= 0.85; },
  },
];

const RARITY_WEIGHTS = { common: 100, uncommon: 50, rare: 18, epic: 4 };
const RARITY_COLORS = {
  common: '#88aaee',
  uncommon: '#44ddff',
  rare: '#ff66dd',
  epic: '#ffaa00',
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
    // Lucky Charm: boost rare/epic weights significantly, uncommon mildly
    if (u.rarity === 'epic') w *= (1 + luck * 6);
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
