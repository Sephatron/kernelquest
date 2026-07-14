// World runtime: ASCII tile maps, collision, warps, triggers, NPCs and
// tile/entity rendering. Maps are pure data (content/maps.ts); this module
// makes them walkable.

import type { Renderer } from "../core/renderer";
import { TILE } from "../core/renderer";
import type { GameState } from "./state";

export interface TileDef {
	solid: boolean;
	encounter?: boolean;
	ledge?: boolean; // one-way hop when entered moving down
	sprite: string;
	variants?: number; // sprite, sprite.2, ... chosen deterministically
	animated?: boolean; // alternates sprite / sprite.b on the world clock
	water?: boolean;
}

export const TILES: Record<string, TileDef> = {
	".": { solid: false, sprite: "t.grass", variants: 2 },
	",": { solid: false, sprite: "t.path" },
	":": { solid: false, sprite: "t.path2" },
	f: { solid: false, sprite: "t.flower", animated: true },
	g: { solid: false, encounter: true, sprite: "t.tallgrass" },
	"~": { solid: false, encounter: true, sprite: "t.marsh", animated: true },
	t: { solid: true, sprite: "t.tree" },
	p: { solid: true, sprite: "t.pine" },
	w: { solid: true, sprite: "t.water", animated: true, water: true },
	L: { solid: false, ledge: true, sprite: "t.ledge" },
	"=": { solid: true, sprite: "t.fence" },
	"^": { solid: true, sprite: "t.rock" },
	"%": { solid: true, sprite: "t.crystal", animated: true },
	"*": { solid: false, sprite: "t.glitch", animated: true },
	b: { solid: false, sprite: "t.bridge" },
	H: { solid: true, sprite: "t.roof" },
	I: { solid: true, sprite: "t.roofpeak" },
	"#": { solid: true, sprite: "t.wall" },
	W: { solid: true, sprite: "t.window" },
	d: { solid: false, sprite: "t.door" },
	s: { solid: true, sprite: "t.sign" },
	G: { solid: true, sprite: "t.gymsign" },
	_: { solid: false, sprite: "t.floor" },
	m: { solid: false, sprite: "t.mat" },
	"-": { solid: true, sprite: "t.counter" },
	S: { solid: true, sprite: "t.shelf" },
	B: { solid: true, sprite: "t.machine", animated: true },
	P: { solid: true, sprite: "t.pad" },
	T: { solid: true, sprite: "t.table" },
	"+": { solid: true, sprite: "t.pc", animated: true },
	x: { solid: true, sprite: "t.void" }
};

export interface WarpDef {
	x: number;
	y: number;
	toMap: string;
	toX: number;
	toY: number;
	kind: "door" | "edge" | "stairs";
	// Direction the player faces on arrival (defaults to current).
	dir?: "up" | "down" | "left" | "right";
}

export interface NpcWhen {
	flag?: string; // only present when this flag is set
	notFlag?: string; // only present when this flag is NOT set
	minBadges?: number;
	maxBadges?: number;
}

export interface NpcDef {
	id: string;
	sprite: string;
	x: number;
	y: number;
	dir: "up" | "down" | "left" | "right";
	move: "static" | "wander" | "spin";
	// Either a dialogue id (content/dialogue.ts) or a script id to run.
	dialogue?: string;
	script?: string;
	trainerId?: string;
	when?: NpcWhen;
}

export interface SignDef {
	x: number;
	y: number;
	text: string[];
}

export interface TriggerDef {
	x: number;
	y: number;
	w?: number;
	h?: number;
	script: string;
	// Trigger only fires when this flag is unset; the script sets it.
	onceFlag?: string;
	when?: NpcWhen;
}

export interface EncounterTable {
	rate: number; // chance per qualifying step
	species: [string, number][]; // id, weight
}

export interface GameMap {
	id: string;
	name: string;
	music: string;
	tiles: string[];
	warps: WarpDef[];
	npcs: NpcDef[];
	signs?: SignDef[];
	triggers?: TriggerDef[];
	encounters?: EncounterTable;
	indoor?: boolean;
	// Script run when the map finishes loading (zone intro calls etc).
	onEnter?: string;
}

export interface NpcRuntime {
	def: NpcDef;
	x: number;
	y: number;
	dir: "up" | "down" | "left" | "right";
	// pixel offset while stepping
	ox: number;
	oy: number;
	walking: boolean;
	walkFrame: number;
	cooldown: number;
	parity: boolean;
}

export function npcVisible(when: NpcWhen | undefined, state: GameState): boolean {
	if (!when) return true;
	if (when.flag && state.flags[when.flag] !== true) return false;
	if (when.notFlag && state.flags[when.notFlag] === true) return false;
	if (when.minBadges !== undefined && state.badges.length < when.minBadges) return false;
	if (when.maxBadges !== undefined && state.badges.length > when.maxBadges) return false;
	return true;
}

const NPC_STEP_FRAMES = 20;

export class World {
	map: GameMap;
	width: number;
	height: number;
	npcs: NpcRuntime[] = [];
	clock = 0;

	private grid: string[];
	private maps: Record<string, GameMap>;
	private state: GameState;

	constructor(maps: Record<string, GameMap>, state: GameState, mapId: string) {
		this.maps = maps;
		this.state = state;
		this.map = maps[mapId] ?? Object.values(maps)[0]!;
		this.grid = this.map.tiles;
		this.width = this.grid.reduce((w, row) => Math.max(w, row.length), 0);
		this.height = this.grid.length;
		this.spawnNpcs();
	}

	load(mapId: string): void {
		const map = this.maps[mapId];
		if (!map) throw new Error("unknown map: " + mapId);
		this.map = map;
		this.grid = map.tiles;
		this.width = this.grid.reduce((w, row) => Math.max(w, row.length), 0);
		this.height = this.grid.length;
		this.spawnNpcs();
	}

	refreshNpcs(): void {
		this.spawnNpcs();
	}

	private spawnNpcs(): void {
		this.npcs = this.map.npcs
			.filter((def) => npcVisible(def.when, this.state))
			.map((def) => ({
				def,
				x: def.x,
				y: def.y,
				dir: def.dir,
				ox: 0,
				oy: 0,
				walking: false,
				walkFrame: 0,
				cooldown: 60 + Math.floor(Math.random() * 120),
				parity: false
			}));
	}

	tileChar(x: number, y: number): string {
		if (y < 0 || y >= this.height) return "t";
		const row = this.grid[y]!;
		if (x < 0 || x >= row.length) return "t";
		return row[x] ?? "t";
	}

	tileDef(x: number, y: number): TileDef {
		return TILES[this.tileChar(x, y)] ?? TILES["t"]!;
	}

	solid(x: number, y: number): boolean {
		return this.tileDef(x, y).solid;
	}

	npcAt(x: number, y: number): NpcRuntime | null {
		for (const npc of this.npcs) {
			if (npc.x === x && npc.y === y) return npc;
			// A walking NPC occupies both tiles mid-step.
			if (npc.walking) {
				const [tx, ty] = aheadOf(npc.x, npc.y, npc.dir, -1);
				if (tx === x && ty === y) return npc;
			}
		}
		return null;
	}

	warpAt(x: number, y: number): WarpDef | null {
		return this.map.warps.find((w) => w.x === x && w.y === y) ?? null;
	}

	signAt(x: number, y: number): SignDef | null {
		return this.map.signs?.find((s) => s.x === x && s.y === y) ?? null;
	}

	triggerAt(x: number, y: number): TriggerDef | null {
		const found = this.map.triggers?.find((t) => {
			const w = t.w ?? 1;
			const h = t.h ?? 1;
			return x >= t.x && x < t.x + w && y >= t.y && y < t.y + h;
		});
		if (!found) return null;
		if (found.onceFlag && this.state.flags[found.onceFlag] === true) return null;
		if (!npcVisible(found.when, this.state)) return null;
		return found;
	}

	// NPC idle wandering. Never steps onto solids, other NPCs, warps, the
	// player, or more than 2 tiles from its spawn point.
	update(playerX: number, playerY: number, frozen: boolean): void {
		this.clock++;
		for (const npc of this.npcs) {
			if (npc.walking) {
				npc.walkFrame++;
				const t = npc.walkFrame / NPC_STEP_FRAMES;
				const dist = TILE - Math.round(t * TILE);
				const [dx, dy] = dirDelta(npc.dir);
				npc.ox = -dx * dist;
				npc.oy = -dy * dist;
				if (npc.walkFrame >= NPC_STEP_FRAMES) {
					npc.walking = false;
					npc.ox = 0;
					npc.oy = 0;
					npc.parity = !npc.parity;
				}
				continue;
			}
			if (frozen || npc.def.move === "static") continue;
			if (--npc.cooldown > 0) continue;
			npc.cooldown = 90 + Math.floor(Math.random() * 150);
			const dirs = ["up", "down", "left", "right"] as const;
			const dir = dirs[Math.floor(Math.random() * 4)]!;
			if (npc.def.move === "spin") {
				npc.dir = dir;
				continue;
			}
			npc.dir = dir;
			const [tx, ty] = aheadOf(npc.x, npc.y, dir);
			const leashX = Math.abs(tx - npc.def.x);
			const leashY = Math.abs(ty - npc.def.y);
			if (leashX > 2 || leashY > 2) continue;
			if (this.solid(tx, ty) || this.tileDef(tx, ty).ledge) continue;
			if (this.warpAt(tx, ty)) continue;
			if (this.npcAt(tx, ty)) continue;
			if (tx === playerX && ty === playerY) continue;
			npc.x = tx;
			npc.y = ty;
			npc.walking = true;
			npc.walkFrame = 0;
		}
	}

	render(renderer: Renderer): void {
		const animFrame = Math.floor(this.clock / 32) % 2;
		const x0 = Math.floor(renderer.cameraX / TILE) - 1;
		const y0 = Math.floor(renderer.cameraY / TILE) - 1;
		const x1 = x0 + Math.ceil(160 / TILE) + 2;
		const y1 = y0 + Math.ceil(144 / TILE) + 2;
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const def = this.tileDef(x, y);
				let sprite = def.sprite;
				if (def.variants && ((x * 7 + y * 13) & 1) === 1) sprite = def.sprite + ".2";
				if (def.animated && animFrame === 1 && renderer.atlas.has(sprite + ".b")) {
					sprite = sprite + ".b";
				}
				renderer.sprite(sprite, x * TILE, y * TILE);
			}
		}
	}

	renderNpcs(renderer: Renderer, insertPlayer: { y: number; draw: () => void }): void {
		const drawables: { y: number; draw: () => void }[] = this.npcs.map((npc) => ({
			y: npc.y * TILE + npc.oy,
			draw: () => {
				const frame = npc.walking ? (npc.parity ? "walk1" : "walk2") : "idle";
				drawActor(renderer, npc.def.sprite, npc.dir, frame, npc.x * TILE + npc.ox, npc.y * TILE + npc.oy);
			}
		}));
		drawables.push(insertPlayer);
		drawables.sort((a, b) => a.y - b.y);
		for (const d of drawables) d.draw();
	}
}

export function dirDelta(dir: "up" | "down" | "left" | "right"): [number, number] {
	switch (dir) {
		case "up":
			return [0, -1];
		case "down":
			return [0, 1];
		case "left":
			return [-1, 0];
		case "right":
			return [1, 0];
	}
}

export function aheadOf(
	x: number,
	y: number,
	dir: "up" | "down" | "left" | "right",
	steps = 1
): [number, number] {
	const [dx, dy] = dirDelta(dir);
	return [x + dx * steps, y + dy * steps];
}

// Actor sprites are sheets of named frames: sprite.down.idle, sprite.down.walk1…
// Left frames reuse right frames flipped. Actors draw 16×20 with feet on the
// tile (4px head overhang, the classic look).
export function drawActor(
	renderer: Renderer,
	sprite: string,
	dir: "up" | "down" | "left" | "right",
	frame: "idle" | "walk1" | "walk2",
	px: number,
	py: number
): void {
	const facing = dir === "left" ? "right" : dir;
	let name = sprite + "." + facing + "." + frame;
	if (!renderer.atlas.has(name)) name = sprite + "." + facing + ".idle";
	if (!renderer.atlas.has(name)) name = sprite + ".down.idle";
	renderer.sprite(name, px, py - 4, dir === "left");
}
