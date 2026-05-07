// ===== UI screens & HUD =====
const upgradeButtonRects = [];
const settingsButtonRects = [];
const shopItemRects = [];
let shopContinueRect = null;

const CONTROL_LABELS = {
  wasd:  { name: 'KEYBOARD',     hint: 'WASD / ARROWS — MOVE   ·   MOUSE — AIM   ·   AUTO-FIRE' },
  mouse: { name: 'MOUSE FOLLOW', hint: 'MOVE MOUSE — SHIP FOLLOWS   ·   AUTO-AIM AND AUTO-FIRE' },
  touch: { name: 'TOUCH',        hint: 'TAP & DRAG TO MOVE   ·   AUTO-AIM AND AUTO-FIRE' },
};

function drawControlSelector(ctx, x, y, w, currentMode, time) {
  // Returns array of clickable rects updated into settingsButtonRects
  settingsButtonRects.length = 0;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Label
  ctx.fillStyle = '#7799bb';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('CONTROL MODE', x + w / 2, y - 14);

  const modes = ['wasd', 'mouse', 'touch'];
  const btnW = (w - 16) / modes.length;
  const btnH = 36;

  for (let i = 0; i < modes.length; i++) {
    const m = modes[i];
    const bx = x + i * (btnW + 8);
    const isActive = m === currentMode;
    const hover = mouse.x >= bx && mouse.x <= bx + btnW &&
                  mouse.y >= y && mouse.y <= y + btnH;

    settingsButtonRects.push({ x: bx, y, w: btnW, h: btnH, mode: m });

    // Background
    ctx.fillStyle = isActive ? 'rgba(60, 110, 170, 0.85)' :
                    hover ? 'rgba(40, 60, 90, 0.9)' : 'rgba(20, 30, 50, 0.85)';
    ctx.fillRect(bx, y, btnW, btnH);

    // Border
    ctx.strokeStyle = isActive ? '#88ddff' : (hover ? '#5588bb' : '#446688');
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    if (isActive) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#88ddff';
    }
    ctx.strokeRect(bx, y, btnW, btnH);
    ctx.shadowBlur = 0;

    // Text
    ctx.fillStyle = isActive ? '#ffffff' : '#aaccdd';
    ctx.font = `bold ${btnW > 110 ? 14 : 12}px "Courier New", monospace`;
    ctx.fillText(CONTROL_LABELS[m].name, bx + btnW / 2, y + btnH / 2);
  }

  // Current mode hint below
  ctx.fillStyle = '#88aacc';
  ctx.font = '12px "Courier New", monospace';
  const hint = CONTROL_LABELS[currentMode].hint;
  ctx.fillText(hint, x + w / 2, y + btnH + 16);

  ctx.restore();
}

function pickControlMode(mx, my) {
  for (const r of settingsButtonRects) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      return r.mode;
    }
  }
  return null;
}

function drawTitleScreen(ctx, w, h, time) {
  ctx.save();

  // Title text with glow + breathing
  const titleY = h * 0.32;
  const breath = Math.sin(time * 1.2) * 5;
  const baseSize = clamp(Math.min(w, h) * 0.13, 56, 140);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Outer glow layer
  ctx.shadowBlur = 40 + breath;
  ctx.shadowColor = '#00ddff';
  ctx.fillStyle = '#3399ee';
  ctx.font = `bold ${baseSize}px "Courier New", monospace`;
  ctx.fillText('VOID BLASTER', w / 2, titleY);

  // Inner brighter
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle = '#aaeeff';
  ctx.fillText('VOID BLASTER', w / 2, titleY);

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#88aacc';
  ctx.font = `${Math.floor(baseSize * 0.22)}px "Courier New", monospace`;
  ctx.fillText('A SPACE ROGUELIKE', w / 2, titleY + baseSize * 0.65);

  // Decorative line
  ctx.strokeStyle = 'rgba(120, 180, 240, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 220, titleY + baseSize * 0.85);
  ctx.lineTo(w / 2 + 220, titleY + baseSize * 0.85);
  ctx.stroke();

  // Press start (blinking)
  const startY = h * 0.56;
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(baseSize * 0.32)}px "Courier New", monospace`;
    ctx.fillText('PRESS  SPACE  OR  CLICK  TO  START', w / 2, startY);
  }

  ctx.shadowBlur = 0;

  // Control mode selector
  const selW = Math.min(560, w - 60);
  const selX = (w - selW) / 2;
  const selY = h * 0.71;
  drawControlSelector(ctx, selX, selY, selW, window.__settings.controlMode, time);

  // Universal hints below selector
  ctx.fillStyle = '#556677';
  ctx.font = `12px "Courier New", monospace`;
  ctx.textAlign = 'center';
  const lineY = h * 0.88;
  ctx.fillText('SHIFT — DASH (after upgrade)     ·     P / ESC — PAUSE     ·     M — MUTE', w / 2, lineY);
  ctx.fillStyle = '#cc7755';
  ctx.fillText('KEEP MOVING — STANDING STILL FOR 1.5s MAKES YOU TAKE 2× DAMAGE', w / 2, lineY + 18);

  // High score badge
  if (window.__highScore && window.__highScore > 0) {
    ctx.fillStyle = '#ffaa44';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff8800';
    ctx.font = `bold ${Math.floor(baseSize * 0.2)}px "Courier New", monospace`;
    ctx.fillText(`★  HIGH SCORE: ${window.__highScore}  ★`, w / 2, h * 0.96);
  }

  ctx.restore();
}

function drawHUD(ctx, w, h, player, wave, score, kills, combo, comboTimer, boss, credits) {
  ctx.save();
  ctx.textBaseline = 'top';

  // ===== HP bar (top left) — width scales with screen, with reasonable bounds =====
  const hpX = 16, hpY = 16;
  const hpW = clamp(w * 0.32, 160, 320);
  const hpH = 24;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(hpX - 3, hpY - 3, hpW + 6, hpH + 6);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(hpX, hpY, hpW, hpH);
  const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
  const hpColor = hpRatio > 0.5 ? '#44ff66' : hpRatio > 0.25 ? '#ffaa44' : '#ff4444';
  ctx.fillStyle = hpColor;
  ctx.shadowBlur = 10;
  ctx.shadowColor = hpColor;
  ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(hpX, hpY, hpW, hpH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`HP  ${Math.ceil(player.hp)} / ${player.maxHp}`, hpX + 8, hpY + 6);

  // ===== Score, wave, kills (top right) =====
  ctx.textAlign = 'right';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#88ddff';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.fillText(`WAVE ${wave}`, w - 16, 14);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffaa44';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(`${score.toLocaleString()}`, w - 16, 42);
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText(`${kills} KILLS`, w - 16, 64);

  // Credits — under HP bar (top-left area)
  if (typeof credits === 'number') {
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffaa00';
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$ ${credits}`, hpX, hpY + hpH + 6);
    ctx.shadowBlur = 0;
  }

  // Combo indicator
  if (combo >= 3 && comboTimer > 0) {
    ctx.textAlign = 'right';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff66ff';
    ctx.fillStyle = combo >= 20 ? '#ff66ff' : combo >= 10 ? '#ffff66' : '#ffaa44';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(`x${combo} COMBO`, w - 16, 86);
    // tiny timer bar
    ctx.shadowBlur = 0;
    const cbW = 90;
    const cbX = w - 16 - cbW;
    const cbY = 112;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(cbX, cbY, cbW, 3);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(cbX, cbY, cbW * (comboTimer / 2.5), 3);
  }

  // ===== Dash cooldown (bottom-left) =====
  if (player.canDash) {
    const dx = 20, dy = h - 50, dw = 110, dh = 8;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('DASH (SHIFT)', dx, dy - 16);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(dx, dy, dw, dh);
    const ratio = 1 - clamp(player.dashCooldown / player.dashCooldownMax, 0, 1);
    ctx.fillStyle = player.dashCooldown <= 0 ? '#88ddff' : '#446688';
    if (player.dashCooldown <= 0) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#88ddff';
    }
    ctx.fillRect(dx, dy, dw * ratio, dh);
    ctx.shadowBlur = 0;
  }

  // ===== Boss bar (below top HUD, centered) =====
  if (boss) {
    const bw = Math.min(640, w - 80);
    const bh = 18;
    const bx = (w - bw) / 2;
    const by = 70;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff66ff';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(`◆  B O S S  —  LV ${boss.level}  ◆`, w / 2, by - 22);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ff66ff';
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#ff66ff';
    ctx.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), bh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
  }

  // ===== Stats panel (bottom right) — only on roomy screens =====
  if (w > 520 && h > 480) {
    const sx = w - 16, sy = h - 90;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(170, 200, 240, 0.55)';
    ctx.font = '11px "Courier New", monospace';
    const statLines = [
      `DMG ${player.damage.toFixed(0)}    RPS ${player.fireRate.toFixed(1)}`,
      `BULLETS ${player.multishot}+${player.spread * 2}    PIERCE ${player.pierce}`,
      `CRIT ${(player.critChance * 100).toFixed(0)}% × ${player.critMult.toFixed(1)}`,
    ];
    for (let i = 0; i < statLines.length; i++) {
      ctx.fillText(statLines[i], sx, sy + i * 14);
    }
  }

  ctx.restore();
}

function drawPauseScreen(ctx, w, h, time) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#88ddff';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.fillText('PAUSED', w / 2, h * 0.32);
  ctx.shadowBlur = 0;

  // Control mode selector
  const selW = Math.min(540, w - 60);
  const selX = (w - selW) / 2;
  const selY = h * 0.5;
  drawControlSelector(ctx, selX, selY, selW, window.__settings.controlMode, time);

  ctx.font = '18px "Courier New", monospace';
  ctx.fillStyle = '#aaccff';
  ctx.fillText('PRESS  P / ESC  OR  CLICK  ANYWHERE  TO  RESUME', w / 2, h * 0.78);

  ctx.restore();
}

function drawGameOverScreen(ctx, w, h, score, wave, kills, time, isHighScore) {
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  const t = clamp(time / 0.6, 0, 1);
  ctx.globalAlpha = t;
  ctx.shadowBlur = 35 * t;
  ctx.shadowColor = '#ff4444';
  ctx.fillStyle = '#ff4444';
  ctx.font = `bold ${80 + (1 - t) * 30}px "Courier New", monospace`;
  ctx.fillText('GAME OVER', w / 2, h * 0.3);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  if (time > 0.5) {
    const t2 = clamp((time - 0.5) / 0.6, 0, 1);
    ctx.globalAlpha = t2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText(`FINAL SCORE  ${score.toLocaleString()}`, w / 2, h * 0.45);

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#aaccff';
    ctx.fillText(`WAVE REACHED:  ${wave}`, w / 2, h * 0.53);
    ctx.fillText(`TOTAL KILLS:  ${kills}`, w / 2, h * 0.58);

    if (isHighScore) {
      const pulse = 1 + Math.sin(time * 6) * 0.08;
      ctx.fillStyle = '#ffff44';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ffff44';
      ctx.font = `bold ${Math.floor(26 * pulse)}px "Courier New", monospace`;
      ctx.fillText('★  NEW HIGH SCORE  ★', w / 2, h * 0.67);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  if (time > 1.4 && Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('PRESS  SPACE  OR  CLICK  TO  RESTART', w / 2, h * 0.8);
  }
  ctx.restore();
}

function drawWaveAnnouncement(ctx, w, h, wave, t) {
  if (t > 2.4) return;
  let alpha;
  if (t < 0.4) alpha = easeOutCubic(t / 0.4);
  else if (t < 1.8) alpha = 1;
  else alpha = 1 - (t - 1.8) / 0.6;
  alpha = clamp(alpha, 0, 1);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const isBoss = wave % 5 === 0;
  ctx.shadowBlur = 30;
  ctx.shadowColor = isBoss ? '#ff44ff' : '#88ddff';
  ctx.fillStyle = isBoss ? '#ff66ff' : '#aaeeff';
  ctx.font = 'bold 88px "Courier New", monospace';
  ctx.fillText(`WAVE ${wave}`, w / 2, h / 2 - 20);
  if (isBoss) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff66ff';
    ctx.fillStyle = '#ff66ff';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText('— BOSS WAVE —', w / 2, h / 2 + 42);
  }
  ctx.restore();
}

function drawUpgradeScreen(ctx, w, h, upgrades, wave, time, hoverIdx) {
  // Backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Header
  ctx.shadowBlur = 18;
  ctx.shadowColor = '#88ddff';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Courier New", monospace';
  ctx.fillText(`WAVE ${wave} CLEARED`, w / 2, h * 0.13);
  ctx.shadowBlur = 0;

  ctx.font = '22px "Courier New", monospace';
  ctx.fillStyle = '#aaccff';
  ctx.fillText('CHOOSE AN UPGRADE', w / 2, h * 0.2);

  // Cards
  upgradeButtonRects.length = 0;
  const cardW = Math.min(280, (w - 40 - (upgrades.length - 1) * 24) / upgrades.length);
  const cardH = 320;
  const gap = 24;
  const totalW = upgrades.length * cardW + (upgrades.length - 1) * gap;
  const startX = (w - totalW) / 2;
  const cardY = h * 0.28;

  for (let i = 0; i < upgrades.length; i++) {
    const u = upgrades[i];
    const cx = startX + i * (cardW + gap);
    const isHover = i === hoverIdx;
    const lift = isHover ? -10 + Math.sin(time * 6) * 2 : 0;
    upgradeButtonRects.push({ x: cx, y: cardY, w: cardW, h: cardH, upgrade: u });

    const rcolor = RARITY_COLORS[u.rarity] || '#aaaaaa';
    const cy = cardY + lift;

    // Card background
    ctx.shadowBlur = isHover ? 24 : 8;
    ctx.shadowColor = rcolor;
    ctx.fillStyle = isHover ? 'rgba(50, 70, 110, 0.95)' : 'rgba(20, 30, 50, 0.92)';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = rcolor;
    ctx.lineWidth = isHover ? 4 : 2;
    ctx.strokeRect(cx, cy, cardW, cardH);
    ctx.shadowBlur = 0;

    // Rarity ribbon
    ctx.fillStyle = rcolor;
    ctx.fillRect(cx, cy, cardW, 28);
    ctx.fillStyle = '#0a0e18';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(u.rarity.toUpperCase(), cx + cardW / 2, cy + 14);

    // Icon
    ctx.fillStyle = rcolor;
    ctx.shadowBlur = isHover ? 16 : 6;
    ctx.shadowColor = rcolor;
    ctx.font = `bold 72px "Courier New", monospace`;
    ctx.fillText(u.icon || '?', cx + cardW / 2, cy + 95);
    ctx.shadowBlur = 0;

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Courier New", monospace';
    wrapText(ctx, u.name, cx + cardW / 2, cy + 165, cardW - 24, 24);

    // Description
    ctx.fillStyle = '#bbccdd';
    ctx.font = '15px "Courier New", monospace';
    wrapText(ctx, u.description, cx + cardW / 2, cy + 230, cardW - 30, 20);

    // Number key hint
    ctx.fillStyle = isHover ? '#ffffff' : '#667788';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(`[${i + 1}]`, cx + cardW / 2, cy + cardH - 22);
  }

  // Footer hint
  ctx.fillStyle = '#7799bb';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillText('CLICK A CARD OR PRESS 1 / 2 / 3 TO PICK', w / 2, h - 30);

  ctx.restore();
}

function drawShopScreen(ctx, w, h, credits, player, time, scrollY) {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // ===== Header (fixed) =====
  ctx.shadowBlur = 18;
  ctx.shadowColor = '#ffdd44';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('TRADING POST', w / 2, 50);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffdd44';
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ffaa00';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.fillText(`$ ${credits}`, w / 2, 92);
  ctx.shadowBlur = 0;

  // ===== Layout =====
  const items = SHOP_ITEMS;
  const cols = w >= 720 ? 4 : 2;
  const cardW = Math.min(180, (w - 40 - (cols - 1) * 12) / cols);
  const cardH = 130;
  const gap = 12;
  const totalW = cols * cardW + (cols - 1) * gap;
  const startX = (w - totalW) / 2;

  // Scroll region: between header and continue button
  const regionTop = 130;
  const continueBtnH = 44;
  const continueBtnY = h - continueBtnH - 36;
  const regionBottom = continueBtnY - 14;
  const regionH = regionBottom - regionTop;

  // Total content height
  const rows = Math.ceil(items.length / cols);
  const contentH = rows * cardH + (rows - 1) * gap;
  const maxScroll = Math.max(0, contentH - regionH);
  // Expose to game.js for clamping
  if (typeof shopMaxScroll !== 'undefined') {
    // ESLint be quiet — we rely on lexical scope from game.js
  }
  window.__shopMaxScroll = maxScroll;

  // Apply clip so cards don't draw outside region
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, regionTop, w, regionH);
  ctx.clip();

  shopItemRects.length = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gap);
    const cy = regionTop + row * (cardH + gap) - scrollY;

    // Skip cards entirely outside the visible region
    if (cy + cardH < regionTop - 4 || cy > regionBottom + 4) {
      // still register rect (with off-screen y) so click misses
      shopItemRects.push({ x: cx, y: cy, w: cardW, h: cardH, item });
      continue;
    }

    const cost = shopItemCost(item, player);
    const maxed = shopItemMaxed(item, player);
    const canAfford = credits >= cost && !maxed;
    const hover = mouse.x >= cx && mouse.x <= cx + cardW &&
                  mouse.y >= cy && mouse.y <= cy + cardH &&
                  mouse.y >= regionTop && mouse.y <= regionBottom;

    shopItemRects.push({ x: cx, y: cy, w: cardW, h: cardH, item });

    let bg, border;
    if (maxed) { bg = 'rgba(40, 40, 50, 0.85)'; border = '#666666'; }
    else if (!canAfford) { bg = 'rgba(30, 30, 50, 0.85)'; border = '#666688'; }
    else if (hover) { bg = 'rgba(80, 70, 30, 0.95)'; border = '#ffdd44'; }
    else { bg = 'rgba(30, 30, 50, 0.92)'; border = '#aa8844'; }

    ctx.fillStyle = bg;
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = border;
    ctx.lineWidth = hover && canAfford ? 3 : 1.5;
    if (hover && canAfford) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ffdd44';
    }
    ctx.strokeRect(cx, cy, cardW, cardH);
    ctx.shadowBlur = 0;

    ctx.fillStyle = canAfford ? '#ffdd44' : '#888888';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText(item.icon, cx + cardW / 2, cy + 30);

    ctx.fillStyle = canAfford ? '#ffffff' : '#888888';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(item.name, cx + cardW / 2, cy + 60);

    ctx.fillStyle = canAfford ? '#bbbbcc' : '#666666';
    ctx.font = '11px "Courier New", monospace';
    wrapText(ctx, item.description, cx + cardW / 2, cy + 86, cardW - 12, 13);

    if (maxed) {
      ctx.fillStyle = '#888888';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText('— MAXED —', cx + cardW / 2, cy + cardH - 14);
    } else {
      ctx.fillStyle = canAfford ? '#ffdd44' : '#aa6666';
      ctx.font = 'bold 14px "Courier New", monospace';
      const owned = (player.shopPurchases && player.shopPurchases[item.id]) || 0;
      const ownedStr = owned > 0 ? ` (×${owned})` : '';
      ctx.fillText(`$ ${cost}${ownedStr}`, cx + cardW / 2, cy + cardH - 14);
    }
  }

  ctx.restore();  // end clip

  // ===== Scrollbar =====
  if (maxScroll > 0) {
    const sbX = w - 12;
    const sbY = regionTop + 4;
    const sbH = regionH - 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(sbX, sbY, 4, sbH);
    const thumbH = Math.max(30, sbH * (regionH / contentH));
    const thumbY = sbY + (sbH - thumbH) * (scrollY / maxScroll);
    ctx.fillStyle = 'rgba(255, 221, 68, 0.6)';
    ctx.fillRect(sbX, thumbY, 4, thumbH);
  }

  // Up/down hint arrows
  if (maxScroll > 0) {
    const arrowAlpha = 0.4 + Math.sin(time * 4) * 0.2;
    if (scrollY > 1) {
      ctx.fillStyle = `rgba(255, 221, 68, ${arrowAlpha})`;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▲ scroll', w / 2, regionTop - 4);
    }
    if (scrollY < maxScroll - 1) {
      ctx.fillStyle = `rgba(255, 221, 68, ${arrowAlpha})`;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▼ more below', w / 2, regionBottom + 8);
    }
  }

  // ===== Continue button (fixed) =====
  const btnW = 220, btnH = continueBtnH;
  const btnX = (w - btnW) / 2;
  const btnY = continueBtnY;
  shopContinueRect = { x: btnX, y: btnY, w: btnW, h: btnH };
  const cHover = mouse.x >= btnX && mouse.x <= btnX + btnW &&
                 mouse.y >= btnY && mouse.y <= btnY + btnH;
  ctx.fillStyle = cHover ? 'rgba(60, 110, 80, 0.95)' : 'rgba(30, 60, 40, 0.9)';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = cHover ? '#88ff88' : '#44aa66';
  ctx.lineWidth = cHover ? 3 : 2;
  if (cHover) { ctx.shadowBlur = 12; ctx.shadowColor = '#88ff88'; }
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillText('CONTINUE  ▶', w / 2, btnY + btnH / 2);

  // Hint
  ctx.fillStyle = '#7799bb';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('CLICK BUY · WHEEL/DRAG SCROLL · SPACE TO CONTINUE', w / 2, h - 14);

  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

function drawCrosshair(ctx, x, y, time, isHover) {
  ctx.save();
  const r = 12 + (isHover ? Math.sin(time * 8) * 2 : 0);
  ctx.strokeStyle = isHover ? '#ffff66' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 8;
  ctx.shadowColor = isHover ? '#ffaa00' : '#88ddff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  // Cross marks
  ctx.beginPath();
  ctx.moveTo(x - r - 5, y); ctx.lineTo(x - r + 3, y);
  ctx.moveTo(x + r + 5, y); ctx.lineTo(x + r - 3, y);
  ctx.moveTo(x, y - r - 5); ctx.lineTo(x, y - r + 3);
  ctx.moveTo(x, y + r + 5); ctx.lineTo(x, y + r - 3);
  ctx.stroke();
  // center dot
  ctx.fillStyle = isHover ? '#ffff66' : '#88ddff';
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
