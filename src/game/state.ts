// Central game state: one plain serialisable object, owned here, mutated
// through helpers. Everything the save system persists lives in this shape.

import type { ActBlock, IfBlock } from "../battle/vm";
import type { Direction } from "../core/input";

export interface RoutineEntry {
	name: string;
	blocks: (ActBlock | IfBlock)[];
	// Where it came from — shown in the Routine Dex.
	source: string;
	note: string;
}

export interface Options {
	paletteId: string;
	textSpeed: 0 | 1 | 2; // fast, medium, slow
	volume: number;
	muted: boolean;
}

export interface GameState {
	version: number;
	player: {
		name: string;
		chassis: string; // starter bot id
		botName: string;
		mapId: string;
		x: number; // tile coords
		y: number;
		dir: Direction;
		hp: number;
		level: number;
		xp: number;
		bits: number;
	};
	badges: string[];
	flags: Record<string, boolean>;
	items: Record<string, number>;
	routines: RoutineEntry[];
	dex: {
		// species id -> times defeated (seen if key present)
		seen: Record<string, number>;
	};
	respawn: { mapId: string; x: number; y: number };
	stats: { steps: number; encounters: number; wins: number; losses: number; playSeconds: number };
	options: Options;
}

export const SAVE_VERSION = 1;

export function newGameState(): GameState {
	return {
		version: SAVE_VERSION,
		player: {
			name: "DEV",
			chassis: "spark",
			botName: "BIT-E",
			mapId: "boot-village",
			x: 9,
			y: 12,
			dir: "down",
			hp: 10,
			level: 1,
			xp: 0,
			bits: 20
		},
		badges: [],
		flags: {},
		items: {},
		routines: [],
		dex: { seen: {} },
		respawn: { mapId: "boot-village", x: 9, y: 12 },
		stats: { steps: 0, encounters: 0, wins: 0, losses: 0, playSeconds: 0 },
		options: { paletteId: "verdant", textSpeed: 1, volume: 0.5, muted: false }
	};
}

export function hpMax(state: GameState): number {
	return 9 + state.player.level;
}

export function xpForNextLevel(level: number): number {
	return 12 + level * 8;
}

// Returns the number of levels gained.
export function grantXp(state: GameState, amount: number): number {
	let gained = 0;
	state.player.xp += amount;
	while (state.player.level < 12 && state.player.xp >= xpForNextLevel(state.player.level)) {
		state.player.xp -= xpForNextLevel(state.player.level);
		state.player.level++;
		gained++;
	}
	if (gained > 0) state.player.hp = hpMax(state); // level-up tops you off
	return gained;
}

export function addItem(state: GameState, id: string, count = 1): void {
	state.items[id] = (state.items[id] ?? 0) + count;
}

export function removeItem(state: GameState, id: string): boolean {
	const have = state.items[id] ?? 0;
	if (have <= 0) return false;
	if (have === 1) delete state.items[id];
	else state.items[id] = have - 1;
	return true;
}

export function hasBadge(state: GameState, id: string): boolean {
	return state.badges.includes(id);
}

export function knowsRoutine(state: GameState, name: string): boolean {
	return state.routines.some((r) => r.name === name);
}

// The block vocabulary unlocked by story progress. Gyms hand these out.
export interface UnlockedVocab {
	acts: ("ZAP" | "PIERCE" | "GUARD" | "WAIT" | "BOOST" | "MEND")[];
	conds: ("SHIELDED" | "CHARGING" | "PWR3" | "LOWHP")[];
	repeat: boolean;
	call: boolean;
	define: boolean;
	maxSlots: number;
}

// Blocks are granted by story beats on entering each gym (the leader fight
// needs its own concept), tracked as flags. Badge count doubles as a
// fallback so a missed flag can never brick progression.
export function unlockedVocab(state: GameState): UnlockedVocab {
	const badges = state.badges.length;
	const has = (flag: string, badgeFloor: number): boolean =>
		state.flags[flag] === true || badges >= badgeFloor;
	const loops = has("unlock.repeat", 2);
	const branches = has("unlock.if", 3);
	const vars = has("unlock.vars", 4);
	const funcs = has("unlock.func", 5);

	const acts: UnlockedVocab["acts"] = ["ZAP", "GUARD", "WAIT"];
	if (branches) acts.push("PIERCE");
	if (vars) acts.push("BOOST");
	if (funcs) acts.push("MEND");
	const conds: UnlockedVocab["conds"] = [];
	if (branches) conds.push("SHIELDED", "CHARGING");
	if (vars) conds.push("PWR3");
	if (funcs) conds.push("LOWHP");
	return {
		acts,
		conds,
		repeat: loops,
		call: funcs,
		define: funcs,
		maxSlots: 6
	};
}
