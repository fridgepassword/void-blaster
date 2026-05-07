// ===== Synthesized audio via Web Audio API =====
let audioCtx = null;
let masterGain = null;
let muted = false;

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.45;
    masterGain.connect(audioCtx.destination);
  } catch (e) {
    audioCtx = null;
  }
}

function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.45;
}

function _now() {
  return audioCtx ? audioCtx.currentTime : 0;
}

function playTone(freq, duration, type = 'sine', vol = 0.25, attack = 0.01) {
  if (!audioCtx || muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const now = _now();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function playSweep(fStart, fEnd, duration, type = 'square', vol = 0.2) {
  if (!audioCtx || muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  const now = _now();
  osc.frequency.setValueAtTime(fStart, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, fEnd), now + duration);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function playNoise(duration, vol = 0.3, filterFreq = 1000, filterType = 'lowpass') {
  if (!audioCtx || muted) return;
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;

  const gain = audioCtx.createGain();
  const now = _now();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(now);
  noise.stop(now + duration);
}

// ===== Specific game SFX =====
function sfxShoot() {
  playSweep(880, 220, 0.07, 'square', 0.12);
}

function sfxHit() {
  playNoise(0.04, 0.12, 3000, 'highpass');
  playSweep(440, 220, 0.05, 'triangle', 0.08);
}

function sfxExplosion() {
  if (!audioCtx || muted) return;
  playSweep(180, 40, 0.3, 'sawtooth', 0.25);
  playNoise(0.25, 0.18, 600, 'lowpass');
}

function sfxBigExplosion() {
  if (!audioCtx || muted) return;
  playSweep(140, 30, 0.6, 'sawtooth', 0.3);
  playNoise(0.5, 0.25, 400, 'lowpass');
  setTimeout(() => playNoise(0.3, 0.15, 800, 'lowpass'), 80);
}

function sfxPlayerHit() {
  playSweep(160, 60, 0.25, 'sawtooth', 0.35);
  playNoise(0.15, 0.2, 1500, 'bandpass');
}

function sfxEnemyShoot() {
  playSweep(330, 180, 0.12, 'sawtooth', 0.08);
}

function sfxWaveStart() {
  playTone(440, 0.12, 'square', 0.18);
  setTimeout(() => playTone(660, 0.12, 'square', 0.18), 90);
  setTimeout(() => playTone(880, 0.18, 'square', 0.2), 180);
}

function sfxWaveEnd() {
  playTone(880, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.2), 120);
  setTimeout(() => playTone(1320, 0.25, 'sine', 0.22), 240);
}

function sfxUpgrade() {
  playTone(523, 0.09, 'triangle', 0.2);
  setTimeout(() => playTone(659, 0.09, 'triangle', 0.2), 70);
  setTimeout(() => playTone(784, 0.09, 'triangle', 0.2), 140);
  setTimeout(() => playTone(1047, 0.18, 'triangle', 0.22), 210);
}

function sfxGameOver() {
  playTone(220, 0.25, 'sawtooth', 0.28);
  setTimeout(() => playTone(165, 0.3, 'sawtooth', 0.28), 220);
  setTimeout(() => playTone(110, 0.6, 'sawtooth', 0.28), 460);
}

function sfxClick() {
  playTone(660, 0.04, 'sine', 0.12);
}

function sfxDash() {
  playSweep(220, 880, 0.12, 'square', 0.12);
}

function sfxShield() {
  playSweep(440, 880, 0.15, 'sine', 0.15);
}
