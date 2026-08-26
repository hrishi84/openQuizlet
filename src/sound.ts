/**
 * Audio engine — all synthesized via WebAudio, zero assets.
 * - SFX: tactile clicks, chimes, thuds
 * - BGM: generative ambient chord-pad loop (soft, low, non-intrusive)
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  start?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
}

function tone({ freq, start = 0, dur = 0.12, type = "sine", gain = 0.08, attack = 0.01 }: ToneOpts) {
  const a = ac();
  if (!a || !master) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function pluck(freq: number, start = 0, gain = 0.07) {
  // triangle with fast decay — feels like a soft marimba
  tone({ freq, start, dur: 0.35, type: "triangle", gain, attack: 0.005 });
}

export const sounds = {
  flip() {
    tone({ freq: 520, dur: 0.05, type: "sine", gain: 0.035 });
    tone({ freq: 700, start: 0.02, dur: 0.05, type: "sine", gain: 0.03 });
  },
  tap() {
    tone({ freq: 880, dur: 0.04, type: "sine", gain: 0.03 });
  },
  correct() {
    pluck(523.25, 0, 0.06); // C5
    pluck(783.99, 0.06, 0.06); // G5
    pluck(1046.5, 0.12, 0.05); // C6
  },
  wrong() {
    tone({ freq: 220, dur: 0.16, type: "sine", gain: 0.05 });
    tone({ freq: 174, start: 0.08, dur: 0.2, type: "sine", gain: 0.045 });
  },
  levelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => pluck(f, i * 0.09, 0.06));
  },
  complete() {
    [392, 523.25, 659.25].forEach((f, i) => tone({ freq: f, start: i * 0.09, dur: 0.3, type: "sine", gain: 0.05 }));
  },
  achievement() {
    [880, 1174.66, 1567.98].forEach((f, i) => pluck(f, i * 0.1, 0.05));
  },
};

/* ---------------- generative BGM ---------------- */

/** Ambient chord loop: warm pads + sparse bell melody above it. */
const CHORDS: { notes: number[]; bells: number[] }[] = [
  { notes: [130.81, 196.0, 246.94, 329.63], bells: [1046.5] },        // Cmaj7 → C6
  { notes: [110.0, 164.81, 261.63, 329.63], bells: [987.77] },        // Am7 → B5
  { notes: [87.31, 174.61, 261.63, 349.23], bells: [830.61] },        // Fmaj7 → G#5
  { notes: [98.0, 196.0, 246.94, 293.66], bells: [1174.66] },         // G6add9 → D6
];

class Bgm {
  private playing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private padGain: GainNode | null = null;
  private step = 0;

  get isPlaying() {
    return this.playing;
  }

  start() {
    if (this.playing) return;
    const a = ac();
    if (!a || !master) return;
    this.playing = true;
    this.padGain = a.createGain();
    this.padGain.gain.value = 0;
    // gentle lowpass so the pad sits behind everything
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    this.padGain.connect(filter).connect(master);
    this.padGain.gain.linearRampToValueAtTime(1, a.currentTime + 2.5); // slow fade-in
    this.scheduleLoop();
  }

  stop() {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const a = ctx;
    if (a && this.padGain) {
      this.padGain.gain.linearRampToValueAtTime(0.0001, a.currentTime + 1.2);
      const g = this.padGain;
      setTimeout(() => g.disconnect(), 1600);
      this.padGain = null;
    }
  }

  /** one bar every ~4s; chords swell in, bells sparkle sparsely */
  private scheduleLoop() {
    if (!this.playing || !ctx || !this.padGain) return;
    const chord = CHORDS[this.step % CHORDS.length];
    const barLen = 4.4;

    chord.notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 3; // slight detune for warmth
      const t0 = ctx!.currentTime + 0.05;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.05 : 0.022, t0 + 1.4);
      g.gain.setValueAtTime(i === 0 ? 0.05 : 0.022, t0 + barLen - 1.2);
      g.gain.linearRampToValueAtTime(0.0001, t0 + barLen);
      o.connect(g).connect(this.padGain!);
      o.start(t0);
      o.stop(t0 + barLen + 0.1);
    });

    // one soft bell per bar, position varies pseudo-randomly
    const bellAt = 0.8 + ((this.step * 7919) % 1000) / 1000 * 2.2;
    tone({ freq: chord.bells[0], start: bellAt, dur: 1.6, type: "sine", gain: 0.016, attack: 0.004 });

    this.step++;
    this.timer = setTimeout(() => this.scheduleLoop(), barLen * 1000);
  }
}

export const bgm = new Bgm();
