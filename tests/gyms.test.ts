// Battle fairness: every authored solution must win within its slot budget;
// wins must be discoverable with the player's vocabulary; concept-gated gyms
// must be provably unwinnable without their concept (at the fixed house-rig
// HP — rigs are standardised, so grinding can't bypass a gate); debugging
// battles must actually be broken as handed over.

import { describe, expect, it } from "vitest";
import { PROGRAM_BATTLES } from "../src/content/gyms";
import { SPECIES } from "../src/content/creatures";
import { CREATURE_SPRITES } from "../src/content/art-creatures";
import { SolverBudgetExceeded, findWin, proveNoWin, type VocabSpec } from "../src/battle/solver";
import { programCost, runProgram, type BattleConfig } from "../src/battle/vm";
import { newGameState, unlockedVocab } from "../src/game/state";

function vocabAtBadges(badges: number): VocabSpec {
	const state = newGameState();
	state.badges = Array(badges).fill("x");
	const v = unlockedVocab(state);
	return { acts: v.acts, conds: v.conds, repeat: v.repeat, maxRepeat: 9, maxBodyLen: 3 };
}

// Badges held when the player REACHES each battle. Gym leader fights add
// their own unlock on top (granted on entering the gym).
const BADGES_BEFORE: Record<string, number> = {
	"gym1-t1": 0,
	gym1: 0,
	"gym2-t1": 1,
	gym2: 1,
	"gym3-t1": 2,
	gym3: 2,
	gym4: 3,
	"gym5-t1": 4,
	gym5: 4,
	gym6: 5,
	gym7: 6,
	gym8: 7,
	rival1: 1,
	rival2: 4,
	rival3: 7,
	nullfight: 6,
	council1: 8,
	council2: 8,
	council3: 8,
	council4: 8,
	champion: 8
};

function configOf(def: (typeof PROGRAM_BATTLES)[string]): BattleConfig {
	return {
		botHp: def.botHp,
		enemyHp: def.enemyHp,
		pattern: def.pattern,
		turnCap: def.turnCap,
		strikeBase: def.strikeBase,
		enemyArmor: def.enemyArmor
	};
}

describe("program battles", () => {
	it("every battle has a badge context and a sprite", () => {
		for (const def of Object.values(PROGRAM_BATTLES)) {
			expect(BADGES_BEFORE[def.id], def.id + " missing from BADGES_BEFORE").toBeDefined();
			expect(CREATURE_SPRITES[def.sprite], def.id + " sprite " + def.sprite).toBeDefined();
		}
	});

	for (const def of Object.values(PROGRAM_BATTLES)) {
		const badges = BADGES_BEFORE[def.id] ?? 0;
		// Gym leaders AND their in-gym trainers fight after the gym-entry
		// unlock, so both get the concept the gym teaches.
		const insideGym = def.id.startsWith("gym");
		const fightVocab = vocabAtBadges(badges + (insideGym ? 1 : 0));

		it(def.id + ": authored solution wins within the slot budget", () => {
			expect(programCost(def.authored), "authored fits slots").toBeLessThanOrEqual(def.slots);
			const result = runProgram(def.authored, configOf(def), def.proofRoutines ?? {});
			expect(result.outcome, def.id + " authored outcome").toBe("WIN");
		});

		it(def.id + ": a win is discoverable with the player's vocabulary", () => {
			try {
				const { program } = findWin(configOf(def), fightVocab, def.slots, {
					budget: 6_000_000,
					routines: def.proofRoutines
				});
				expect(program, def.id + " solver found no win").not.toBeNull();
			} catch (e) {
				// A blown search budget is acceptable ONLY when the authored
				// solution already proves winnability (huge routine spaces).
				if (!(e instanceof SolverBudgetExceeded)) throw e;
				const result = runProgram(def.authored, configOf(def), def.proofRoutines ?? {});
				expect(result.outcome).toBe("WIN");
			}
		});

		if (def.gatedBy) {
			it(def.id + ": provably unwinnable without its concept (" + def.gatedBy + ")", () => {
				const vocab = vocabAtBadges(badges); // pre-gym vocabulary
				const { proven, counterexample } = proveNoWin(configOf(def), vocab, def.slots, {
					budget: 10_000_000
				});
				if (!proven) {
					throw new Error(
						def.id + " is beatable without " + def.gatedBy + ": " + JSON.stringify(counterexample)
					);
				}
			});
		}

		if (def.prefill) {
			it(def.id + ": the handed-over program is genuinely broken", () => {
				const result = runProgram(def.prefill!, configOf(def), {});
				expect(result.outcome, def.id + " prefill must not win as-is").not.toBe("WIN");
			});
		}
	}

	it("every species has a sprite and sane rewards", () => {
		for (const species of Object.values(SPECIES)) {
			expect(CREATURE_SPRITES[species.sprite], species.id + " sprite").toBeDefined();
			expect(species.xp).toBeGreaterThan(0);
			expect(species.dmg).toBeGreaterThan(0);
			expect(species.zone).toBeGreaterThanOrEqual(1);
			expect(species.zone).toBeLessThanOrEqual(8);
		}
	});
});
