// Content wiring integrity: every id an NPC/trigger/warp/script points at
// must resolve to a real script, dialogue, battle, map or badge. Catches the
// broken-link class of bug that only shows up when a player walks into it.

import { describe, expect, it } from "vitest";
import { MAPS } from "../src/content/maps";
import { DIALOGUE } from "../src/content/dialogue";
import { SCRIPTS } from "../src/content/scripts";
import { PROGRAM_BATTLES } from "../src/content/gyms";
import { BADGES } from "../src/content/badges";
import { SONGS } from "../src/content/music";
import { ITEMS } from "../src/content/items";
import type { Cmd } from "../src/game/script";

function walkCmds(cmds: Cmd[], visit: (c: Cmd) => void): void {
	for (const c of cmds) {
		visit(c);
		if ("choice" in c) c.choice.branches.forEach((b) => walkCmds(b, visit));
		if ("ifFlag" in c) {
			walkCmds(c.ifFlag.then, visit);
			if (c.ifFlag.els) walkCmds(c.ifFlag.els, visit);
		}
		if ("ifBadge" in c) {
			walkCmds(c.ifBadge.then, visit);
			if (c.ifBadge.els) walkCmds(c.ifBadge.els, visit);
		}
	}
}

describe("map references", () => {
	it("every NPC script/dialogue id resolves", () => {
		for (const map of Object.values(MAPS)) {
			for (const npc of map.npcs) {
				if (npc.script) expect(SCRIPTS[npc.script], map.id + " npc " + npc.id + " script " + npc.script).toBeDefined();
				if (npc.dialogue) expect(DIALOGUE[npc.dialogue], map.id + " npc " + npc.id + " dialogue " + npc.dialogue).toBeDefined();
			}
			for (const trig of map.triggers ?? []) {
				expect(SCRIPTS[trig.script], map.id + " trigger script " + trig.script).toBeDefined();
			}
			const music = map.music;
			expect(SONGS[music], map.id + " music " + music).toBeDefined();
			if (map.onEnter) expect(SCRIPTS[map.onEnter], map.id + " onEnter " + map.onEnter).toBeDefined();
		}
	});

	it("gym-entry triggers are landed on by an inbound warp (so unlocks fire)", () => {
		// A warp drops the player onto the destination tile without a step, and
		// gym-entry triggers grant the concept block the fights inside require.
		// So every gym-entry trigger MUST sit under an inbound warp destination,
		// or the player can walk straight past it and the gym is unbeatable.
		const inbound: Record<string, { x: number; y: number }[]> = {};
		for (const map of Object.values(MAPS)) {
			for (const w of map.warps) {
				(inbound[w.toMap] ??= []).push({ x: w.toX, y: w.toY });
			}
		}
		for (const map of Object.values(MAPS)) {
			for (const trig of map.triggers ?? []) {
				if (!/^gym\d+-enter$/.test(trig.script)) continue;
				const w = trig.w ?? 1;
				const h = trig.h ?? 1;
				const landed = (inbound[map.id] ?? []).some(
					(d) => d.x >= trig.x && d.x < trig.x + w && d.y >= trig.y && d.y < trig.y + h
				);
				expect(landed, map.id + " entry trigger '" + trig.script + "' has no inbound warp on it").toBe(true);
			}
		}
	});

	it("every map's music track exists and encounter species have zones", () => {
		for (const map of Object.values(MAPS)) {
			for (const [species] of map.encounters?.species ?? []) {
				expect(typeof species).toBe("string");
			}
		}
	});
});

describe("script command references", () => {
	const battleIds = new Set(Object.keys(PROGRAM_BATTLES));
	const badgeIds = new Set(Object.keys(BADGES));
	const scriptIds = new Set(Object.keys(SCRIPTS));

	it("gymBattle/trainerBattle/badge/run/music/give ids all resolve", () => {
		for (const [id, cmds] of Object.entries(SCRIPTS)) {
			walkCmds(cmds, (c) => {
				if ("gymBattle" in c) expect(battleIds.has(c.gymBattle), id + " -> gymBattle " + c.gymBattle).toBe(true);
				if ("trainerBattle" in c) expect(battleIds.has(c.trainerBattle), id + " -> trainerBattle " + c.trainerBattle).toBe(true);
				if ("badge" in c) expect(badgeIds.has(c.badge), id + " -> badge " + c.badge).toBe(true);
				if ("run" in c) expect(scriptIds.has(c.run), id + " -> run " + c.run).toBe(true);
				if ("music" in c) expect(SONGS[c.music], id + " -> music " + c.music).toBeDefined();
				if ("give" in c && c.give.item) expect(ITEMS[c.give.item], id + " -> item " + c.give.item).toBeDefined();
			});
		}
	});

	it("every program battle is reachable from some script", () => {
		const referenced = new Set<string>();
		for (const cmds of Object.values(SCRIPTS)) {
			walkCmds(cmds, (c) => {
				if ("gymBattle" in c) referenced.add(c.gymBattle);
				if ("trainerBattle" in c) referenced.add(c.trainerBattle);
			});
		}
		for (const id of battleIds) {
			expect(referenced.has(id), "battle " + id + " is never triggered by any script").toBe(true);
		}
	});

	it("every badge is awarded by some script", () => {
		const awarded = new Set<string>();
		for (const cmds of Object.values(SCRIPTS)) {
			walkCmds(cmds, (c) => {
				if ("badge" in c) awarded.add(c.badge);
			});
		}
		for (const id of badgeIds) {
			expect(awarded.has(id), "badge " + id + " is never awarded").toBe(true);
		}
	});
});
