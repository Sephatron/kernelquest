// Procedural chiptune engine: two pulse channels with Game Boy duty cycles,
// a triangle bass and a noise channel, driven by a lookahead step sequencer.
// No audio files — every sound in the game is synthesised here.

export type WaveKind = "p50" | "p25" | "p12" | "tri" | "noise";

// [stepIndex, lengthInSteps, midiNote, velocity?]
export type NoteEvent = [number, number, number, number?];

export interface Track {
	wave: WaveKind;
	vol: number;
	notes: NoteEvent[];
}

export interface Song {
	id: string;
	bpm: number;
	steps: number; // loop length in 16th steps
	tracks: Track[];
	loop?: boolean; // default true
}

const LOOKAHEAD_S = 0.15;
const TICK_MS = 40;

function midiHz(midi: number): number {
	return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private waves = new Map<string, PeriodicWave>();
	private noiseBuffer: AudioBuffer | null = null;

	private song: Song | null = null;
	private resumeAfterOnce: Song | null = null;
	private step = 0;
	private nextStepTime = 0;
	private timer: number | null = null;
	private stepStarts: Map<Track, Map<number, NoteEvent[]>> = new Map();

	volume = 0.5;
	muted = false;

	// Must be called from a user gesture at least once (browser autoplay rules).
	unlock(): void {
		if (this.ctx) {
			if (this.ctx.state === "suspended") void this.ctx.resume();
			return;
		}
		const ctx = new AudioContext();
		this.ctx = ctx;
		this.master = ctx.createGain();
		this.master.gain.value = this.muted ? 0 : this.volume;
		this.master.connect(ctx.destination);
		for (const [name, duty] of [
			["p50", 0.5],
			["p25", 0.25],
			["p12", 0.125]
		] as const) {
			const n = 32;
			const real = new Float32Array(n);
			const imag = new Float32Array(n);
			for (let i = 1; i < n; i++) {
				imag[i] = (2 / (i * Math.PI)) * Math.sin(Math.PI * i * duty);
			}
			this.waves.set(name, ctx.createPeriodicWave(real, imag));
		}
		const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = noise.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		this.noiseBuffer = noise;
		if (this.song) this.beginSong(this.song);
	}

	get ready(): boolean {
		return this.ctx !== null;
	}

	setVolume(v: number): void {
		this.volume = v;
		if (this.master && !this.muted) this.master.gain.value = v;
	}

	setMuted(muted: boolean): void {
		this.muted = muted;
		if (this.master) this.master.gain.value = muted ? 0 : this.volume;
	}

	playSong(song: Song): void {
		if (this.song?.id === song.id && this.resumeAfterOnce === null) return;
		this.resumeAfterOnce = null;
		this.song = song;
		if (this.ctx) this.beginSong(song);
	}

	// Plays a stinger once (badge fanfare, victory) then resumes the loop.
	playOnce(song: Song): void {
		const current = this.resumeAfterOnce ?? this.song;
		this.resumeAfterOnce = current;
		this.song = song;
		if (this.ctx) this.beginSong(song);
	}

	stopMusic(): void {
		this.song = null;
		this.resumeAfterOnce = null;
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private beginSong(song: Song): void {
		const ctx = this.ctx!;
		if (this.timer !== null) clearInterval(this.timer);
		this.stepStarts = new Map();
		for (const track of song.tracks) {
			const map = new Map<number, NoteEvent[]>();
			for (const note of track.notes) {
				const list = map.get(note[0]) ?? [];
				list.push(note);
				map.set(note[0], list);
			}
			this.stepStarts.set(track, map);
		}
		this.step = 0;
		this.nextStepTime = ctx.currentTime + 0.06;
		this.timer = window.setInterval(() => this.pump(), TICK_MS);
	}

	private pump(): void {
		const ctx = this.ctx;
		const song = this.song;
		if (!ctx || !song) return;
		const stepDur = 60 / song.bpm / 4;
		while (this.nextStepTime < ctx.currentTime + LOOKAHEAD_S) {
			const stepInLoop = this.step % song.steps;
			if (stepInLoop === 0 && this.step > 0 && song.loop === false) {
				const resume = this.resumeAfterOnce;
				this.resumeAfterOnce = null;
				this.song = null;
				if (this.timer !== null) clearInterval(this.timer);
				this.timer = null;
				if (resume) this.playSong(resume);
				return;
			}
			for (const track of song.tracks) {
				const notes = this.stepStarts.get(track)?.get(stepInLoop);
				if (!notes) continue;
				for (const [, len, midi, vel] of notes) {
					this.playNote(track.wave, midi, this.nextStepTime, len * stepDur, track.vol * (vel ?? 1));
				}
			}
			this.step++;
			this.nextStepTime += stepDur;
		}
	}

	private playNote(wave: WaveKind, midi: number, at: number, dur: number, vol: number): void {
		const ctx = this.ctx!;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(vol, at + 0.005);
		gain.gain.setValueAtTime(vol, Math.max(at + 0.005, at + dur - 0.02));
		gain.gain.linearRampToValueAtTime(0, at + dur);
		gain.connect(this.master!);
		if (wave === "noise") {
			const src = ctx.createBufferSource();
			src.buffer = this.noiseBuffer!;
			src.loop = true;
			const filter = ctx.createBiquadFilter();
			filter.type = "bandpass";
			filter.frequency.value = midiHz(midi + 24);
			filter.Q.value = 0.8;
			src.connect(filter);
			filter.connect(gain);
			src.start(at);
			src.stop(at + dur + 0.05);
			return;
		}
		const osc = ctx.createOscillator();
		if (wave === "tri") {
			osc.type = "triangle";
		} else {
			osc.setPeriodicWave(this.waves.get(wave)!);
		}
		osc.frequency.setValueAtTime(midiHz(midi), at);
		osc.connect(gain);
		osc.start(at);
		osc.stop(at + dur + 0.05);
	}

	// ------------------------------------------------------------- SFX

	private blipAt(freq: number, dur: number, vol: number, wave: WaveKind = "p50", slideTo?: number): void {
		const ctx = this.ctx;
		if (!ctx) return;
		const at = ctx.currentTime;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(vol, at);
		gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
		gain.connect(this.master!);
		const osc = ctx.createOscillator();
		if (wave === "tri") osc.type = "triangle";
		else if (wave !== "noise") osc.setPeriodicWave(this.waves.get(wave)!);
		osc.frequency.setValueAtTime(freq, at);
		if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
		osc.connect(gain);
		osc.start(at);
		osc.stop(at + dur + 0.02);
	}

	private noiseAt(dur: number, vol: number, freq: number): void {
		const ctx = this.ctx;
		if (!ctx) return;
		const at = ctx.currentTime;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(vol, at);
		gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
		gain.connect(this.master!);
		const src = ctx.createBufferSource();
		src.buffer = this.noiseBuffer!;
		src.loop = true;
		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = freq;
		src.connect(filter);
		filter.connect(gain);
		src.start(at);
		src.stop(at + dur + 0.05);
	}

	sfx(name: string): void {
		switch (name) {
			case "blip": // menu cursor
				this.blipAt(880, 0.05, 0.18, "p25");
				break;
			case "confirm":
				this.blipAt(660, 0.06, 0.2, "p25");
				this.blipAt(990, 0.09, 0.2, "p25");
				break;
			case "cancel":
				this.blipAt(440, 0.08, 0.18, "p25", 330);
				break;
			case "bump":
				this.noiseAt(0.08, 0.22, 300);
				break;
			case "hop":
				this.blipAt(330, 0.12, 0.2, "p50", 660);
				break;
			case "door":
				this.blipAt(523, 0.12, 0.18, "p50", 262);
				break;
			case "zap":
				this.blipAt(1200, 0.12, 0.24, "p12", 200);
				break;
			case "hit":
				this.noiseAt(0.14, 0.3, 900);
				break;
			case "reflect":
				this.blipAt(200, 0.16, 0.26, "p50", 90);
				break;
			case "heal":
				this.blipAt(523, 0.07, 0.2, "tri");
				this.blipAt(659, 0.07, 0.2, "tri");
				this.blipAt(784, 0.12, 0.2, "tri");
				break;
			case "save":
				this.blipAt(784, 0.06, 0.2, "p25");
				this.blipAt(1046, 0.12, 0.2, "p25");
				break;
			case "wrong":
				this.blipAt(180, 0.2, 0.26, "p50", 120);
				break;
			case "right":
				this.blipAt(880, 0.06, 0.22, "p25");
				this.blipAt(1174, 0.1, 0.22, "p25");
				break;
			case "levelup":
				this.blipAt(523, 0.08, 0.22, "p25");
				this.blipAt(659, 0.08, 0.22, "p25");
				this.blipAt(880, 0.14, 0.22, "p25");
				break;
			case "run":
				this.blipAt(600, 0.1, 0.2, "p12", 1400);
				break;
		}
	}
}
