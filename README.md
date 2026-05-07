# Void Blaster

A wave-based space roguelike — pilot a triangle, blast hordes of squares, pick upgrades between waves, beat bosses, spend credits at the trading post.

> ⚠️ **Demo — work in progress.** Sharing this early to play with friends. Will improve later.

## Play

**Easiest:** open `index.html` in any modern browser. No install, no build step, runs from `file://`.

**On a phone:** open the same URL or host the folder on any static web server.

If you want a live link to share, push this repo to GitHub and enable GitHub Pages (Settings → Pages → branch: `main`, folder: `/ (root)`). Your game will be live at `https://<your-username>.github.io/<repo-name>/`.

## Controls

Pick a control mode on the title screen:

| Mode | Move | Aim & fire |
| --- | --- | --- |
| **Keyboard** | WASD / Arrows | Mouse aims, auto-fires |
| **Mouse follow** | Ship chases the cursor | Auto-aims at nearest enemy |
| **Touch** (phones) | Drag a finger | Auto-aims at nearest enemy |

Other keys: **Shift** dash (after upgrade), **P / Esc** pause, **M** mute, **1 / 2 / 3** pick upgrade card, **mouse wheel / drag** scroll the shop.

## What's in it

- **6 enemy types** — grunts, fast swarmers, beefy tanks, ranged shooters, charging bombers, and a multi-phase boss every 5 waves.
- **30+ upgrades** across common / uncommon / rare with weighted random rolls. Some are **boss-locked** — they only show up after you've beaten a boss (Twin Cannon, Volatile Rounds, Chrono Field, Apex Predator).
- **Trading post** between waves — spend the credits enemies drop on stat upgrades whose costs scale per purchase. Includes a Lucky Charm that boosts rare drops.
- **Status effects** — frost (slow on hit), burn (DoT), splash chains, kill-heal, glass-hull, adrenaline, mover's edge, combo master, and more.
- **Stand-still penalty** — sit idle for 1.5+ seconds and you take 2× damage. The ring around your ship turns yellow then red as a warning.
- **Combo system** — chain kills within 2.5s for a score multiplier.
- **Polish** — screen shake, hit-stop, particle explosions, parallax stars, nebula clouds, custom crosshair, synthesized audio (no asset files).
- **Scales** to phone, tablet, or 4K desktop.

## Tech

Vanilla JS + HTML5 Canvas + Web Audio API. No build step, no dependencies. About 3000 lines across the files in `js/`:

```
utils.js          math helpers
audio.js          synthesized SFX
input.js          keyboard / mouse / touch / wheel
effects.js        particles, screen shake, floating text
background.js    star field, nebula, title-screen ships
projectile.js    player & enemy bullets
player.js         the ship
enemies.js        grunt / swarmer / tank / shooter / bomber / boss
upgrades.js       upgrade cards + shop items
waves.js          wave generation
ui.js             title / HUD / upgrade / shop / pause / game-over
game.js           main loop, state machine, glue
```

## License

Do whatever — it's a demo. MIT-style.
