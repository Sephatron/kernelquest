// Content integrity: hand-authored pixel art and ASCII maps are validated
// here so a typo becomes a red test, not a runtime glitch.

import { describe, expect, it } from "vitest";
import { TILE_SPRITES } from "../src/content/art-tiles";
import { ACTOR_SPRITES } from "../src/content/art-actors";
import { CREATURE_SPRITES } from "../src/content/art-creatures";
import { MAPS } from "../src/content/maps";
import { TILES, npcVisible } from "../src/game/world";
import { newGameState } from "../src/game/state";

const VALID_CHARS = /^[.0123 ]*$/;

describe("pixel art", () => {
	it("tile sprites are exactly 16×16 with valid shade characters", () => {
		for (const [name, def] of Object.entries(TILE_SPRITES)) {
			expect(def.length, name + " row count").toBe(16);
			for (const row of def) {
				expect(row.length, name + " row width").toBe(16);
				expect(row, name + " chars").toMatch(VALID_CHARS);
			}
		}
	});

	it("actor sprites are 16×16 with valid characters", () => {
		for (const [name, def] of Object.entries(ACTOR_SPRITES)) {
			expect(def.length, name + " row count").toBe(16);
			for (const row of def) {
				expect(row.length, name + " row width").toBe(16);
				expect(row, name + " chars").toMatch(VALID_CHARS);
			}
		}
	});

	it("creature sprites are 24×24 with valid characters", () => {
		for (const [name, def] of Object.entries(CREATURE_SPRITES)) {
			expect(def.length, name + " row count").toBe(24);
			for (const row of def) {
				expect(row.length, name + " row width").toBe(24);
				expect(row, name + " chars").toMatch(VALID_CHARS);
			}
		}
	});

	it("every actor has the three idle facings", () => {
		const actors = new Set(Object.keys(ACTOR_SPRITES).map((k) => k.split(".")[0]!));
		for (const actor of actors) {
			for (const facing of ["down", "up", "right"]) {
				expect(ACTOR_SPRITES[actor + "." + facing + ".idle"], actor + " " + facing).toBeDefined();
			}
		}
	});
});

describe("maps", () => {
	const state = newGameState();

	it("rows are rectangular and reference only defined tiles", () => {
		for (const map of Object.values(MAPS)) {
			const width = map.tiles[0]!.length;
			for (const row of map.tiles) {
				expect(row.length, map.id + " row width").toBe(width);
				for (const ch of row) {
					expect(TILES[ch], map.id + " tile '" + ch + "'").toBeDefined();
				}
			}
		}
	});

	it("warps land on walkable tiles in existing maps", () => {
		for (const map of Object.values(MAPS)) {
			for (const warp of map.warps) {
				const target = MAPS[warp.toMap];
				expect(target, map.id + " warp to " + warp.toMap).toBeDefined();
				const ch = target!.tiles[warp.toY]?.[warp.toX] ?? "t";
				const def = TILES[ch]!;
				expect(def.solid, map.id + "->" + warp.toMap + " lands on solid '" + ch + "'").toBe(false);
			}
		}
	});

	it("warps sit on walkable source tiles", () => {
		for (const map of Object.values(MAPS)) {
			for (const warp of map.warps) {
				const ch = map.tiles[warp.y]?.[warp.x] ?? "t";
				expect(TILES[ch]!.solid, map.id + " warp source at " + warp.x + "," + warp.y).toBe(false);
			}
		}
	});

	it("NPCs stand on walkable tiles and don't overlap warps", () => {
		for (const map of Object.values(MAPS)) {
			for (const npc of map.npcs) {
				if (!npcVisible(npc.when, state)) continue;
				const ch = map.tiles[npc.y]?.[npc.x] ?? "t";
				expect(TILES[ch]!.solid, map.id + " npc " + npc.id + " on solid").toBe(false);
				expect(
					map.warps.some((w) => w.x === npc.x && w.y === npc.y),
					map.id + " npc " + npc.id + " blocks a warp"
				).toBe(false);
			}
		}
	});

	it("signs sit on sign tiles", () => {
		for (const map of Object.values(MAPS)) {
			for (const sign of map.signs ?? []) {
				const ch = map.tiles[sign.y]?.[sign.x] ?? "t";
				expect(
					ch === "s" || ch === "G" || ch === "+",
					map.id + " sign at " + sign.x + "," + sign.y + " on '" + ch + "'"
				).toBe(true);
			}
		}
	});
});
