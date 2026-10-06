// The ginger cat purrs when you touch it. The sound is made on the spot:
// soft low noise fluttering ~26 times a second, in two breaths, so there is
// no audio file to load. Returns false where Web Audio is missing.

let audio = null;

export const PURR_SECONDS = 1.9;

export function purr(win = globalThis.window) {
  const Context = win?.AudioContext || win?.webkitAudioContext;
  if (!Context) return false;
  audio ??= new Context();
  if (audio.state === 'suspended') audio.resume();
  const now = audio.currentTime;
  const seconds = PURR_SECONDS;

  // brown noise: warm, no hiss
  const length = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < length; index += 1) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[index] = last * 3.5;
  }
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  const low = audio.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 340;

  // the flutter: gain swings 0..1 at the purr rate
  const flutter = audio.createGain();
  flutter.gain.value = 0.5;
  const rate = audio.createOscillator();
  rate.frequency.setValueAtTime(26, now);
  rate.frequency.linearRampToValueAtTime(23, now + seconds * 0.5);   // breathing in purrs lower
  rate.frequency.linearRampToValueAtTime(27, now + seconds);
  const depth = audio.createGain();
  depth.gain.value = 0.5;
  rate.connect(depth).connect(flutter.gain);

  // two breaths: out, a short dip, out again, fade
  const level = audio.createGain();
  level.gain.setValueAtTime(0, now);
  level.gain.linearRampToValueAtTime(0.32, now + 0.15);
  level.gain.linearRampToValueAtTime(0.26, now + seconds * 0.45);
  level.gain.linearRampToValueAtTime(0.1, now + seconds * 0.52);
  level.gain.linearRampToValueAtTime(0.3, now + seconds * 0.62);
  level.gain.linearRampToValueAtTime(0, now + seconds);

  noise.connect(low).connect(flutter).connect(level).connect(audio.destination);
  noise.start(now);
  rate.start(now);
  noise.stop(now + seconds);
  rate.stop(now + seconds);
  return true;
}
