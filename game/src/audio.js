// Saigon Sizzle — the sounds of the kitchen, all synthesized: no audio files, just
// short WebAudio notes. The context is born on the first pointer press, as browsers
// require, and every cue the game logic asks for is a tiny shape of pitch and time.

/** One note: an oscillator of `type` gliding from `from` to `to` hertz. */
function note(context, destination, { type = 'sine', from, to = from, at = 0, length = 0.09, gain = 0.16 }) {
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + length);
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + length);
  oscillator.connect(envelope).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

/** The cue book: each named sound the game can ask for, as a few notes. */
const CUES = {
  click: (context, out) => note(context, out, { type: 'square', from: 660, length: 0.05, gain: 0.07 }),
  add: (context, out) => {
    note(context, out, { type: 'triangle', from: 520, to: 760, length: 0.08 });
  },
  ding: (context, out) => {
    note(context, out, { type: 'sine', from: 880, length: 0.16, gain: 0.2 });
    note(context, out, { type: 'sine', from: 1318, at: 0.09, length: 0.22, gain: 0.18 });
  },
  serve: (context, out) => {
    note(context, out, { type: 'triangle', from: 523, length: 0.09 });
    note(context, out, { type: 'triangle', from: 659, at: 0.08, length: 0.09 });
    note(context, out, { type: 'triangle', from: 784, at: 0.16, length: 0.14 });
  },
  error: (context, out) => note(context, out, { type: 'sawtooth', from: 170, to: 120, length: 0.16, gain: 0.1 }),
  angry: (context, out) => {
    note(context, out, { type: 'square', from: 300, to: 190, length: 0.14, gain: 0.09 });
    note(context, out, { type: 'square', from: 260, to: 160, at: 0.13, length: 0.18, gain: 0.09 });
  },
  burn: (context, out) => note(context, out, { type: 'sawtooth', from: 420, to: 70, length: 0.3, gain: 0.08 }),
  trash: (context, out) => note(context, out, { type: 'triangle', from: 340, to: 140, length: 0.1, gain: 0.1 }),
};

/** The kitchen's sound kit: created lazily, muted on request, safe before birth. */
export class SoundKit {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
  }

  /** Bring the audio context to life; call from any user gesture. */
  unlock() {
    if (this.context === null) {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
      if (AudioCtor === undefined) return;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  /** Play one named cue, when sound is on and the context exists. */
  play(name) {
    if (this.muted || this.context === null) return;
    const cue = CUES[name];
    if (cue !== undefined) cue(this.context, this.master);
  }

  /** Flip the mute switch and answer with the new state. */
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
