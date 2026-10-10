// The cassette radio on the counter plays a real station of Russian hits of
// the 90s and 2000s. No song lives on the site: the station streams from its
// own server (and allows it: the stream answers with
// Access-Control-Allow-Origin). While it tunes in there is the hiss of the air.

export const STATIONS = [
  { name: 'Russian Gold', by: 'Радио Рекорд', url: 'https://radiorecord.hostingradio.ru/russiangold96.aacp' }
];

// Round the stations: a silent one gives way to the next.
export function stationAfter(index, step, count = STATIONS.length) {
  return (((index + step) % count) + count) % count;
}

// Where the needle stands along the tuning scale, 0 at the left end.
export function needleAt(index, count = STATIONS.length) {
  return count > 1 ? index / (count - 1) : 0.5;
}

// Heard from the street, through the tin wall: muffled and quieter.
export function roomTone(inside) {
  return inside ? { cutoff: 16000, level: 0.9 } : { cutoff: 900, level: 0.4 };
}

const TUNE_TIMEOUT = 8000;

// `onChange({ on, index, state, station })` reports every change; `state` is
// 'off', 'seeking' (hiss while a station tunes in), 'playing' or 'static'
// (nothing answers, or this browser can't play the streams).
export function createRadio({ win = globalThis.window, onChange = () => {} } = {}) {
  let context = null;
  let element = null;
  let filter = null;
  let volume = null;
  let hissLevel = null;
  let index = -1;
  let state = 'off';
  let inside = true;
  let failures = 0;
  let watchdog = 0;

  function report() {
    onChange({ on: index >= 0, index, state, station: STATIONS[index] || null });
  }

  function hiss(level, seconds = 0.15) {
    if (!hissLevel) return;
    const now = context.currentTime;
    hissLevel.gain.cancelScheduledValues(now);
    hissLevel.gain.setTargetAtTime(level, now, seconds);
  }

  // Built on the first press: browsers only let sound start from a tap.
  function audio() {
    if (context) return true;
    const Context = win.AudioContext || win.webkitAudioContext;
    if (!Context) return false;
    // on iPhones Web Audio is silenced by the mute switch unless it is playback
    try {
      if (win.navigator?.audioSession) win.navigator.audioSession.type = 'playback';
    } catch {
      // older Safari: nothing to set
    }
    context = new Context();
    filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    volume = context.createGain();
    const tone = roomTone(inside);
    filter.frequency.value = tone.cutoff;
    volume.gain.value = tone.level;
    filter.connect(volume).connect(context.destination);

    element = new win.Audio();
    element.crossOrigin = 'anonymous';
    element.preload = 'none';
    context.createMediaElementSource(element).connect(filter);
    element.addEventListener('playing', () => {
      if (index < 0) return;
      win.clearTimeout(watchdog);
      failures = 0;
      state = 'playing';
      hiss(0, 0.25);
      report();
    });
    element.addEventListener('error', () => {
      if (index >= 0 && state === 'seeking') fail();
    });

    // a second of white noise on a loop, band-limited like the air between stations
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let sample = 0; sample < data.length; sample += 1) data[sample] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2400;
    band.Q.value = 0.6;
    hissLevel = context.createGain();
    hissLevel.gain.value = 0;
    noise.connect(band).connect(hissLevel).connect(filter);
    noise.start();
    return true;
  }

  function fail() {
    win.clearTimeout(watchdog);
    failures += 1;
    if (failures >= STATIONS.length) {
      state = 'static';
      element?.pause();
      hiss(0.06);
      report();
      return;
    }
    tune(stationAfter(index, 1));
  }

  function tune(next) {
    index = next;
    if (!audio() || !element.canPlayType('audio/aac')) {
      state = 'static';
      hiss(0.06);
      report();
      return;
    }
    if (context.state === 'suspended') context.resume();
    state = 'seeking';
    hiss(0.22, 0.05);
    report();
    element.src = STATIONS[index].url;
    element.play().catch(() => {
      // a refused stream also fires 'error'; the watchdog covers silence
    });
    win.clearTimeout(watchdog);
    watchdog = win.setTimeout(fail, TUNE_TIMEOUT);
  }

  return {
    get on() { return index >= 0; },
    get index() { return index; },
    get state() { return state; },
    // the radio's own button switches it on and off
    press() {
      if (index >= 0) {
        this.off();
        return;
      }
      failures = 0;
      tune(0);
    },
    off() {
      win.clearTimeout(watchdog);
      index = -1;
      state = 'off';
      failures = 0;
      if (element) {
        element.pause();
        element.removeAttribute('src');
        element.load();
      }
      hiss(0, 0.05);
      report();
    },
    setInside(value) {
      inside = value;
      if (!context) return;
      const tone = roomTone(inside);
      const now = context.currentTime;
      filter.frequency.setTargetAtTime(tone.cutoff, now, 0.4);
      volume.gain.setTargetAtTime(tone.level, now, 0.4);
    }
  };
}

// The green LCD on the radio: the station's name runs across it while it
// plays, «ПОИСК…» blinks over noise bars while it tunes, dark when off.
export function drawRadioDisplay(context, width, height, { on = false, text = '', seeking = false, offset = 0, now = 0 } = {}) {
  context.fillStyle = on ? '#9ccf5f' : '#262d22';
  context.fillRect(0, 0, width, height);
  context.font = `700 ${Math.round(height * 0.62)}px "PT Mono", "Courier New", monospace`;
  context.textBaseline = 'middle';
  if (!on) {
    // unlit segments still show faintly through the glass
    context.fillStyle = 'rgba(0, 0, 0, 0.25)';
    context.textAlign = 'center';
    context.fillText('88888888', width / 2, height / 2);
    return;
  }
  context.fillStyle = '#16210d';
  if (seeking) {
    if (Math.floor(now * 3) % 2 === 0) {
      context.textAlign = 'center';
      context.fillText('ПОИСК…', width / 2, height / 2);
    }
    for (let bar = 0; bar < 24; bar += 1) {
      const tall = Math.random() * height * 0.28;
      context.fillRect((bar / 24) * width, height - tall - height * 0.06, width / 40, tall);
    }
    return;
  }
  const label = text.toUpperCase();
  const textWidth = context.measureText(label).width;
  if (textWidth <= width * 0.9) {
    context.textAlign = 'center';
    context.fillText(label, width / 2, height / 2);
    return;
  }
  // too long for the glass: it runs, with a gap before it comes round again
  const loop = textWidth + width * 0.3;
  const x = width * 0.05 - (offset % loop);
  context.textAlign = 'left';
  context.fillText(label, x, height / 2);
  context.fillText(label, x + loop, height / 2);
}
