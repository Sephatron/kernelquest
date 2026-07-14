import { describe, expect, it } from "vitest";
import { SolverBudgetExceeded, findWin, proveNoWin, type VocabSpec } from "../src/battle/solver";
import { programCost, runProgram, type BattleConfig } from "../src/battle/vm";

const actsOnly: VocabSpec = {
	acts: ["ZAP", "GUARD", "WAIT"],
	conds: [],
	repeat: false,
	maxRepeat: 9,
	maxBodyLen: 3
};

const withRepeat: VocabSpec = { ...actsOnly, repeat: true };

describe("solver", () => {
	it("finds a trivial straight-line win", () => {
		const config: BattleConfig = { botHp: 10, enemyHp: 4, pattern: [{ kind: "wait" }] };
		const { program } = findWin(config, actsOnly, 3);
		expect(program).not.toBeNull();
		const replay = runProgram(program!, config);
		expect(replay.outcome).toBe("WIN");
	});

	it("solver wins always replay as wins and respect the slot limit", () => {
		const config: BattleConfig = {
			botHp: 12,
			enemyHp: 20,
			pattern: [{ kind: "atk", n: 1 }],
			turnCap: 20
		};
		const { program } = findWin(config, withRepeat, 4);
		expect(program).not.toBeNull();
		expect(programCost(program!)).toBeLessThanOrEqual(4);
		expect(runProgram(program!, config).outcome).toBe("WIN");
	});

	it("proves a 20hp wall cannot fall to 4 straight-line slots — the loop gate", () => {
		const config: BattleConfig = {
			botHp: 12,
			enemyHp: 20,
			pattern: [{ kind: "atk", n: 1 }],
			turnCap: 20
		};
		const gated = proveNoWin(config, actsOnly, 4);
		expect(gated.proven).toBe(true);
		// ...while the same fight with REPEAT available is winnable (above).
	});

	it("throws instead of returning a silent inconclusive result when out of budget", () => {
		const config: BattleConfig = {
			botHp: 30,
			enemyHp: 200,
			pattern: [{ kind: "wait" }],
			turnCap: 24
		};
		expect(() => findWin(config, withRepeat, 6, { budget: 50 })).toThrow(SolverBudgetExceeded);
	});

	it("memoisation keeps a fruitless exhaustive search cheap", () => {
		const config: BattleConfig = {
			botHp: 10,
			enemyHp: 60,
			pattern: [{ kind: "atk", n: 1 }, { kind: "shield" }],
			turnCap: 16
		};
		const { proven, explored } = proveNoWin(config, withRepeat, 5);
		expect(proven).toBe(true);
		expect(explored).toBeLessThan(2_000_000);
	});
});
