// ===== Input handling =====
const keys = {};
const keysJustPressed = new Set();
const mouse = { x: 0, y: 0, down: false, justClicked: false, wheelDelta: 0, dragDx: 0, dragDy: 0 };
let _lastTouchX = 0, _lastTouchY = 0;

window.addEventListener('keydown', (e) => {
  const code = e.code;
  const key = (e.key || '').toLowerCase();
  if (!keys[code]) {
    keysJustPressed.add(code);
    if (key) keysJustPressed.add(key);
  }
  keys[code] = true;
  if (key) keys[key] = true;

  // Prevent space from scrolling, etc.
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  const key = (e.key || '').toLowerCase();
  if (key) keys[key] = false;
});

window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
});

function _toWorld(clientX, clientY) {
  const c = document.getElementById('game');
  const rect = c.getBoundingClientRect();
  const scale = (window.__renderScale && window.__renderScale()) || 1;
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

window.addEventListener('mousemove', (e) => {
  const p = _toWorld(e.clientX, e.clientY);
  mouse.x = p.x; mouse.y = p.y;
});

window.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    mouse.down = true;
    mouse.justClicked = true;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.down = false;
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('wheel', (e) => {
  // Normalize across mouse / trackpad
  let d = e.deltaY;
  if (e.deltaMode === 1) d *= 16;        // line mode
  else if (e.deltaMode === 2) d *= 100;  // page mode
  mouse.wheelDelta += d;
  if (e.cancelable) e.preventDefault();
}, { passive: false });

// Touch support — treat as click + cursor follow (world coords)
let _touchStartX = 0, _touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    const p = _toWorld(t.clientX, t.clientY);
    mouse.x = p.x; mouse.y = p.y;
    _lastTouchX = p.x; _lastTouchY = p.y;
    _touchStartX = p.x; _touchStartY = p.y;
    mouse.dragDx = 0; mouse.dragDy = 0;
    mouse.down = true;
    mouse.justClicked = true;
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    const t = e.touches[0];
    const p = _toWorld(t.clientX, t.clientY);
    mouse.dragDx += p.x - _lastTouchX;
    mouse.dragDy += p.y - _lastTouchY;
    _lastTouchX = p.x; _lastTouchY = p.y;
    mouse.x = p.x; mouse.y = p.y;
    // If the user dragged more than a few px, cancel the pending tap so we don't accidentally buy.
    if (Math.hypot(p.x - _touchStartX, p.y - _touchStartY) > 10) {
      mouse.justClicked = false;
    }
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', () => {
  mouse.down = false;
});

window.addEventListener('touchcancel', () => {
  mouse.down = false;
});

function isKeyDown(...codes) {
  return codes.some(c => keys[c]);
}

function wasKeyPressed(...codes) {
  return codes.some(c => keysJustPressed.has(c));
}

function consumeClick() {
  const c = mouse.justClicked;
  mouse.justClicked = false;
  return c;
}

function consumeWheel() {
  const d = mouse.wheelDelta;
  mouse.wheelDelta = 0;
  return d;
}

function consumeDragDy() {
  const d = mouse.dragDy;
  mouse.dragDy = 0;
  return d;
}

function endFrameInput() {
  keysJustPressed.clear();
  mouse.justClicked = false;
  mouse.wheelDelta = 0;
}
