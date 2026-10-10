// The terminal's thermal printer: a buzzing motor in short pulls, one for
// each jerk of the paper. Made on the spot, no audio file.

let audio = null;

export function printerSound(seconds = 2.6, jerks = 16, win = globalThis.window) {
  const Context = win?.AudioContext || win?.webkitAudioContext;
  if (!Context) return false;
  audio ??= new Context();
  if (audio.state === 'suspended') audio.resume();
  const now = audio.currentTime;
  const motor = audio.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 190;
  const band = audio.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1400;
  band.Q.value = 1.2;
  const level = audio.createGain();
  level.gain.setValueAtTime(0, now);
  const pull = seconds / jerks;
  for (let jerk = 0; jerk < jerks; jerk += 1) {
    const start = now + jerk * pull;
    level.gain.setValueAtTime(0, start);
    level.gain.linearRampToValueAtTime(0.12, start + 0.012);
    level.gain.setValueAtTime(0.12, start + pull * 0.68);
    level.gain.linearRampToValueAtTime(0, start + pull * 0.74);
  }
  motor.connect(band).connect(level).connect(audio.destination);
  motor.start(now);
  motor.stop(now + seconds + 0.05);
  return true;
}
