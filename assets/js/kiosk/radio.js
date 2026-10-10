// The cassette radio on the counter plays real stations of the 2000s. No song
// lives on the site: the stations stream from their own servers (and allow
// it: their streams answer with Access-Control-Allow-Origin). Between
// stations, and while one tunes in, there is the hiss of the air.

export const STATIONS = [
  { name: 'Russian Gold', by: 'Радио Рекорд', url: 'https://radiorecord.hostingradio.ru/russiangold96.aacp' },
  { name: 'Russian Hits', by: 'Радио Рекорд', url: 'https://radiorecord.hostingradio.ru/russianhits96.aacp' },
  { name: 'Pop Gold 2000s', by: 'DFM', url: 'https://dfm-popgold00.hostingradio.ru/popgold0096.aacp' }
];

// The arrows go round the stations.
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
    // the radio's own button: on, then the next station
    press() {
      failures = 0;
      tune(index < 0 ? 0 : stationAfter(index, 1));
    },
    step(direction) {
      failures = 0;
      tune(stationAfter(Math.max(index, 0), direction));
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
