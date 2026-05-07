// ===== Upgrades — 22 options spanning common/uncommon/rare =====
const UPGRADES = [
  // ===== COMMON: small stat bumps, repeatable =====
  {
    id: 'damage', name: 'Damage Boost', icon: '⚔',
    description: '+25% bullet damage',
    rarity: 'common',
    apply: (p) => { p.damage *= 1.25; },
  },
  {
    id: 'firerate', name: 'Rapid Fire', icon: '⚡',
    description: '+20% fire rate',
    rarity: 'common',
    apply: (p) => { p.fireRate *= 1.2; },
  },
  {
    id: 'speed', name: 'Swift Engines', icon: '»',
    description: '+15% movement speed',
    rarity: 'common',
    apply: (p) => { p.speed *= 1.15; },
  },
  {
    id: 'hp', name: 'Reinforced Hull', icon: '+',
    description: '+25 max HP, full heal',
    rarity: 'common',
    apply: (p) => { p.maxHp += 25; p.hp = p.maxHp; },
  },
  {
    id: 'bulletspeed', name: 'Velocity Tuning', icon: '→',
    description: '+30% bullet speed',
    rarity: 'common',
    apply: (p) => { p.bulletSpeed *= 1.3; },
  },
  {
    id: 'bulletsize', name: 'Heavy Rounds', icon: '●',
    description: '+25% bullet size',
    rarity: 'common',
    apply: (p) => { p.bulletSize *= 1.25; },
  },
  {
    id: 'heal', name: 'Repair Kit', icon: '♥',
    description: 'Heal to full HP',
    rarity: 'common',
    apply: (p) => { p.hp = p.maxHp; },
  },

  // ===== UNCOMMON =====
  {
    id: 'pierce', name: 'Piercing Rounds', icon: '↦',
    description: 'Bullets pierce 1 more enemy',
    rarity: 'uncommon',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'crit', name: 'Critical Strike', icon: '✦',
    description: '+12% crit chance',
    rarity: 'uncommon',
    apply: (p) => { p.critChance += 0.12; },
  },
  {
    id: 'lifesteal', name: 'Vampiric Rounds', icon: '♢',
    description: '+5% lifesteal',
    rarity: 'uncommon',
    apply: (p) => { p.lifesteal += 0.05; },
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
    description: '+25% score per kill',
    rarity: 'uncommon',
    apply: (p) => { p.scoreMult *= 1.25; },
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

  // ===== RARE =====
  {
    id: 'multishot', name: 'Multi-Shot', icon: '☰',
    description: '+1 parallel bullet',
    rarity: 'rare',
    apply: (p) => { p.multishot += 1; },
  },
  {
    id: 'spread', name: 'Spread Shot', icon: '※',
    description: '+2 angled bullets',
    rarity: 'rare',
    apply: (p) => { p.spread += 1; },
  },
  {
    id: 'dash', name: 'Dash Drive', icon: '⟫',
    description: 'Unlock dash (Shift) — 0.3s i-frames',
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
    id: 'critdmg', name: 'Devastation', icon: '★',
    description: '+0.5x crit damage multiplier',
    rarity: 'rare',
    apply: (p) => { p.critMult += 0.5; },
  },

  // ===== TRADE-OFFS =====
  {
    id: 'berserker', name: 'Berserker', icon: '☠',
    description: '+40% damage, −15 max HP',
    rarity: 'rare',
    apply: (p) => {
      p.damage *= 1.4;
      p.maxHp = Math.max(20, p.maxHp - 15);
      p.hp = Math.min(p.hp, p.maxHp);
    },
  },
  {
    id: 'glasscannon', name: 'Glass Cannon', icon: '◆',
    description: '+40% fire rate, take +20% damage',
    rarity: 'rare',
    apply: (p) => {
      p.fireRate *= 1.4;
      p.damageTakenMult *= 1.2;
    },
  },

  // ===== NEW: SITUATIONAL & ELEMENTAL =====
  {
    id: 'movers_edge', name: "Mover's Edge", icon: '↗',
    description: '+22% damage while moving',
    rarity: 'uncommon',
    apply: (p) => { p.moversEdge += 0.22; },
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
    description: 'At low HP (<30%), +35% fire rate',
    rarity: 'uncommon',
    once: true,
    apply: (p) => { p.adrenaline = true; },
  },
  {
    id: 'kill_heal', name: 'Salvage Drone', icon: '⚙',
    description: 'Heal 3% max HP on kill',
    rarity: 'uncommon',
    apply: (p) => { p.killHeal += 0.03; },
  },
  {
    id: 'glass_hull', name: 'Glass Hull', icon: '◇',
    description: '+80% damage when shield empty',
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
    description: 'Hits ignite for 6 dps over 2s (stacks)',
    rarity: 'rare',
    apply: (p) => {
      if (p.burnDps === 0) p.burnDuration = 2.0;
      p.burnDps += 6;
    },
  },
  {
    id: 'combo_master', name: 'Combo Master', icon: '∞',
    description: '+1% damage per combo (max +50%)',
    rarity: 'rare',
    apply: (p) => { p.comboMaster += 0.01; },
  },
  {
    id: 'movers_aim', name: 'Steady Sights', icon: '◎',
    description: '+8% crit chance and +0.3× crit dmg',
    rarity: 'rare',
    apply: (p) => { p.critChance += 0.08; p.critMult += 0.3; },
  },

  // ===== BOSS-LOCKED (after defeating any boss) =====
  {
    id: 'twin_cannon', name: 'Twin Cannon', icon: '⫸',
    description: '+1 multishot AND +1 spread',
    rarity: 'rare',
    once: true,
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.multishot += 1; p.spread += 1; },
  },
  {
    id: 'volatile', name: 'Volatile Rounds', icon: '⊛',
    description: 'Hits splash 1 nearby enemy (60% dmg)',
    rarity: 'rare',
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.splashChain += 1; },
  },
  {
    id: 'chrono', name: 'Chrono Field', icon: '◷',
    description: 'All enemies move 15% slower',
    rarity: 'rare',
    requires: (p) => p.bossesDefeated >= 1,
    apply: (p) => { p.chronoField = Math.min(0.45, p.chronoField + 0.15); },
  },
  {
    id: 'apex', name: 'Apex Predator', icon: '✪',
    description: '+25% damage, +1 multishot',
    rarity: 'rare',
    once: true,
    requires: (p) => p.bossesDefeated >= 2,
    apply: (p) => { p.damage *= 1.25; p.multishot += 1; },
  },
];

const RARITY_WEIGHTS = { common: 100, uncommon: 50, rare: 18 };
const RARITY_COLORS = {
  common: '#88aaee',
  uncommon: '#44ddff',
  rare: '#ff66dd',
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
    // Lucky Charm: boost rare and uncommon weights
    if (u.rarity === 'rare') w *= (1 + luck * 4);
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
