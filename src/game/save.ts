// Save system: three manual slots plus an autosave, all in localStorage,
// with a portable export/import code (base64 + checksum) for moving between
// devices. Saves are versioned; unknown fields survive round-trips.

import { SAVE_VERSION, newGameState, type GameState } from "./state";

const KEY_PREFIX = "kq.save.";
export const AUTOSAVE_SLOT = "auto";
export const SLOTS = ["1", "2", "3"] as const;

export interface SlotSummary {
	slot: string;
	name: string;
	badges: number;
	level: number;
	mapId: string;
	playSeconds: number;
	savedAt: number;
}

function storageKey(slot: string): string {
	return KEY_PREFIX + slot;
}

export function saveTo(slot: string, state: GameState): boolean {
	try {
		const wrapped = { savedAt: Date.now(), state };
		localStorage.setItem(storageKey(slot), JSON.stringify(wrapped));
		return true;
	} catch {
		return false; // storage full or blocked — caller surfaces the failure
	}
}

export function loadFrom(slot: string): GameState | null {
	try {
		const raw = localStorage.getItem(storageKey(slot));
		if (!raw) return null;
		const wrapped = JSON.parse(raw) as { state?: unknown };
		return migrate(wrapped.state);
	} catch {
		return null;
	}
}

export function deleteSlot(slot: string): void {
	localStorage.removeItem(storageKey(slot));
}

export function summarise(slot: string): SlotSummary | null {
	try {
		const raw = localStorage.getItem(storageKey(slot));
		if (!raw) return null;
		const wrapped = JSON.parse(raw) as { savedAt?: number; state?: GameState };
		const state = wrapped.state;
		if (!state?.player) return null;
		return {
			slot,
			name: state.player.name,
			badges: state.badges?.length ?? 0,
			level: state.player.level,
			mapId: state.player.mapId,
			playSeconds: state.stats?.playSeconds ?? 0,
			savedAt: wrapped.savedAt ?? 0
		};
	} catch {
		return null;
	}
}

export function anySaveExists(): boolean {
	return [AUTOSAVE_SLOT, ...SLOTS].some((slot) => localStorage.getItem(storageKey(slot)) !== null);
}

// Deep-merges a stored save over a fresh state so fields added in later game
// versions pick up their defaults instead of becoming undefined.
export function migrate(raw: unknown): GameState | null {
	if (typeof raw !== "object" || raw === null) return null;
	const candidate = raw as Partial<GameState>;
	if (!candidate.player || typeof candidate.player.mapId !== "string") return null;
	const base = newGameState();
	const merged: GameState = {
		...base,
		...candidate,
		version: SAVE_VERSION,
		player: { ...base.player, ...candidate.player },
		badges: candidate.badges ?? [],
		flags: candidate.flags ?? {},
		items: candidate.items ?? {},
		routines: candidate.routines ?? [],
		dex: { seen: candidate.dex?.seen ?? {} },
		respawn: candidate.respawn ?? base.respawn,
		stats: { ...base.stats, ...candidate.stats },
		options: { ...base.options, ...candidate.options }
	};
	return merged;
}

// ------------------------------------------------------------ export codes

function checksum(text: string): string {
	let h = 5381;
	for (let i = 0; i < text.length; i++) {
		h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
	}
	return h.toString(36);
}

export function exportCode(state: GameState): string {
	const json = JSON.stringify(state);
	const b64 = btoa(unescape(encodeURIComponent(json)));
	return "KQ1." + checksum(json) + "." + b64;
}

export function importCode(code: string): GameState | null {
	try {
		const parts = code.trim().split(".");
		if (parts.length !== 3 || parts[0] !== "KQ1") return null;
		const json = decodeURIComponent(escape(atob(parts[2]!)));
		if (checksum(json) !== parts[1]) return null;
		return migrate(JSON.parse(json));
	} catch {
		return null;
	}
}
