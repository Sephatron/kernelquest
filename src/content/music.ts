// The soundtrack: chiptune loops as note-event data for core/audio.ts.
// Steps are 16ths. Helpers keep the arpeggio/bass plumbing readable.

import type { NoteEvent, Song } from "../core/audio";

// Eighth-note arpeggio over a chord, one bar = 16 steps.
function arp(start: number, bars: number, chord: number[], vel = 1): NoteEvent[] {
	const notes: NoteEvent[] = [];
	for (let bar = 0; bar < bars; bar++) {
		for (let i = 0; i < 8; i++) {
			const midi = chord[i % chord.length]!;
			notes.push([start + bar * 16 + i * 2, 2, midi, vel]);
		}
	}
	return notes;
}

function bass(start: number, bars: number, root: number): NoteEvent[] {
	const notes: NoteEvent[] = [];
	for (let bar = 0; bar < bars; bar++) {
		notes.push([start + bar * 16, 6, root], [start + bar * 16 + 8, 6, root]);
	}
	return notes;
}

function hats(steps: number, every = 4, vel = 0.4): NoteEvent[] {
	const notes: NoteEvent[] = [];
	for (let s = 0; s < steps; s += every) notes.push([s, 1, 90, vel]);
	return notes;
}

export const SONGS: Record<string, Song> = {
	title: {
		id: "title",
		bpm: 96,
		steps: 128,
		tracks: [
			{
				wave: "p50",
				vol: 0.16,
				notes: [
					[0, 6, 69], [8, 6, 72], [16, 6, 76], [24, 4, 74], [28, 4, 72],
					[32, 12, 74], [48, 12, 71], [64, 6, 69], [72, 6, 72], [80, 6, 76],
					[88, 4, 79], [92, 4, 76], [96, 20, 81], [120, 6, 79]
				]
			},
			{
				wave: "p25",
				vol: 0.08,
				notes: [...arp(0, 2, [57, 60, 64]), ...arp(32, 1, [55, 59, 62]), ...arp(48, 1, [52, 55, 59]), ...arp(64, 2, [57, 60, 64]), ...arp(96, 1, [53, 57, 60]), ...arp(112, 1, [55, 59, 62])]
			},
			{
				wave: "tri",
				vol: 0.22,
				notes: [...bass(0, 2, 45), ...bass(32, 1, 43), ...bass(48, 1, 40), ...bass(64, 2, 45), ...bass(96, 1, 41), ...bass(112, 1, 43)]
			}
		]
	},
	town: {
		id: "town",
		bpm: 112,
		steps: 64,
		tracks: [
			{
				wave: "p50",
				vol: 0.15,
				notes: [
					[0, 3, 76], [4, 2, 74], [6, 2, 72], [8, 4, 74], [12, 4, 76],
					[16, 3, 79], [20, 2, 76], [22, 2, 74], [24, 6, 74],
					[32, 3, 76], [36, 2, 74], [38, 2, 72], [40, 4, 69], [44, 4, 72],
					[48, 4, 74], [52, 4, 71], [56, 8, 72]
				]
			},
			{
				wave: "p25",
				vol: 0.07,
				notes: [...arp(0, 1, [60, 64, 67]), ...arp(16, 1, [55, 59, 62]), ...arp(32, 1, [57, 60, 64]), ...arp(48, 1, [55, 60, 64])]
			},
			{
				wave: "tri",
				vol: 0.24,
				notes: [...bass(0, 1, 48), ...bass(16, 1, 43), ...bass(32, 1, 45), ...bass(48, 1, 43)]
			}
		]
	},
	route: {
		id: "route",
		bpm: 124,
		steps: 64,
		tracks: [
			{
				wave: "p50",
				vol: 0.15,
				notes: [
					[0, 2, 72], [2, 2, 76], [4, 4, 79], [8, 2, 78], [10, 2, 76], [12, 4, 74],
					[16, 2, 72], [18, 2, 74], [20, 4, 76], [24, 4, 71], [28, 4, 67],
					[32, 2, 72], [34, 2, 76], [36, 4, 79], [40, 2, 81], [42, 2, 79], [44, 4, 76],
					[48, 4, 74], [52, 2, 76], [54, 2, 74], [56, 8, 72]
				]
			},
			{
				wave: "p25",
				vol: 0.07,
				notes: [...arp(0, 1, [60, 64, 67]), ...arp(16, 1, [57, 60, 64]), ...arp(32, 1, [60, 64, 67]), ...arp(48, 1, [55, 59, 62])]
			},
			{ wave: "tri", vol: 0.24, notes: [...bass(0, 1, 48), ...bass(16, 1, 45), ...bass(32, 1, 48), ...bass(48, 1, 43)] },
			{ wave: "noise", vol: 0.5, notes: hats(64, 8, 0.25) }
		]
	},
	lab: {
		id: "lab",
		bpm: 104,
		steps: 64,
		tracks: [
			{
				wave: "p25",
				vol: 0.11,
				notes: [...arp(0, 1, [64, 67, 71, 74]), ...arp(16, 1, [62, 65, 69, 72]), ...arp(32, 1, [64, 67, 71, 74]), ...arp(48, 1, [65, 69, 72, 76])]
			},
			{ wave: "tri", vol: 0.22, notes: [...bass(0, 1, 40), ...bass(16, 1, 38), ...bass(32, 1, 40), ...bass(48, 1, 41)] }
		]
	},
	repair: {
		id: "repair",
		bpm: 100,
		steps: 32,
		tracks: [
			{
				wave: "p50",
				vol: 0.12,
				notes: [[0, 3, 79], [4, 3, 76], [8, 3, 72], [12, 4, 76], [16, 3, 74], [20, 3, 71], [24, 8, 72]]
			},
			{ wave: "tri", vol: 0.2, notes: [...bass(0, 1, 48), ...bass(16, 1, 43)] }
		]
	},
	gym: {
		id: "gym",
		bpm: 128,
		steps: 64,
		tracks: [
			{
				wave: "p50",
				vol: 0.15,
				notes: [
					[0, 3, 69], [4, 3, 69], [8, 2, 72], [10, 2, 74], [12, 4, 76],
					[16, 3, 74], [20, 3, 72], [24, 8, 71],
					[32, 3, 69], [36, 3, 69], [40, 2, 72], [42, 2, 74], [44, 4, 77],
					[48, 4, 76], [52, 4, 74], [56, 8, 72]
				]
			},
			{ wave: "p25", vol: 0.07, notes: [...arp(0, 2, [57, 60, 64]), ...arp(32, 1, [53, 57, 60]), ...arp(48, 1, [55, 59, 62])] },
			{ wave: "tri", vol: 0.26, notes: [...bass(0, 2, 45), ...bass(32, 1, 41), ...bass(48, 1, 43)] },
			{ wave: "noise", vol: 0.5, notes: hats(64, 4, 0.2) }
		]
	},
	wild: {
		id: "wild",
		bpm: 140,
		steps: 64,
		tracks: [
			{
				wave: "p50",
				vol: 0.15,
				notes: [
					[0, 2, 74], [2, 2, 74], [4, 2, 77], [6, 2, 74], [8, 4, 81], [12, 4, 79],
					[16, 2, 77], [18, 2, 76], [20, 4, 74], [24, 8, 69],
					[32, 2, 74], [34, 2, 74], [36, 2, 77], [38, 2, 74], [40, 4, 82], [44, 4, 81],
					[48, 4, 79], [52, 4, 77], [56, 8, 74]
				]
			},
			{ wave: "p25", vol: 0.08, notes: [...arp(0, 2, [50, 53, 57]), ...arp(32, 2, [50, 53, 57])] },
			{ wave: "tri", vol: 0.26, notes: [...bass(0, 4, 38)] },
			{ wave: "noise", vol: 0.55, notes: hats(64, 4, 0.3) }
		]
	},
	victory: {
		id: "victory",
		bpm: 132,
		steps: 32,
		loop: false,
		tracks: [
			{
				wave: "p50",
				vol: 0.17,
				notes: [[0, 2, 72], [2, 2, 76], [4, 2, 79], [6, 6, 84], [12, 2, 81], [14, 2, 79], [16, 12, 84]]
			},
			{ wave: "p25", vol: 0.1, notes: [[0, 2, 64], [2, 2, 67], [4, 2, 72], [6, 6, 76], [16, 12, 76]] },
			{ wave: "tri", vol: 0.24, notes: [[0, 8, 48], [8, 8, 43], [16, 16, 48]] }
		]
	},
	badge: {
		id: "badge",
		bpm: 120,
		steps: 48,
		loop: false,
		tracks: [
			{
				wave: "p50",
				vol: 0.17,
				notes: [[0, 3, 72], [4, 3, 72], [8, 3, 74], [12, 3, 76], [16, 8, 79], [24, 3, 76], [28, 3, 79], [32, 16, 84]]
			},
			{ wave: "p25", vol: 0.1, notes: [[16, 8, 67], [32, 16, 76]] },
			{ wave: "tri", vol: 0.24, notes: [[0, 8, 48], [8, 8, 45], [16, 8, 43], [24, 8, 45], [32, 16, 48]] }
		]
	},
	peak: {
		id: "peak",
		bpm: 116,
		steps: 64,
		tracks: [
			{
				wave: "p50",
				vol: 0.15,
				notes: [
					[0, 6, 69], [8, 6, 76], [16, 4, 74], [20, 4, 72], [24, 8, 74],
					[32, 6, 69], [40, 6, 77], [48, 4, 76], [52, 4, 74], [56, 8, 76]
				]
			},
			{ wave: "p25", vol: 0.08, notes: [...arp(0, 2, [45, 52, 57, 60]), ...arp(32, 2, [45, 53, 57, 62])] },
			{ wave: "tri", vol: 0.26, notes: [...bass(0, 2, 33), ...bass(32, 2, 33)] },
			{ wave: "noise", vol: 0.45, notes: hats(64, 8, 0.2) }
		]
	}
};
