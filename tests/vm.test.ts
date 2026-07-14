import { describe, expect, it } from "vitest";
import {
	act,
	call,
	iff,
	initialState,
	programCost,
	rep,
	runProgram,
	type BattleConfig
} from "../src/battle/vm";
import { runGrid, runValue, type ValueOp } from "../src/battle/minivm";

const dummy = (over: Partial<BattleConfig> = {}): BattleConfig => ({
	botHp: 10,
	enemyHp: 6,
	pattern: [{ kind: "wait" }],
	...over
});

describe("battle vm — primitives", () => {
	it("ZAP deals base damage and wins when enemy hp reaches zero", () => {
		const result = runProgram([act("ZAP"), act("ZAP"), act("ZAP")], dummy());
		expect(result.outcome).toBe("WIN");
		expect(result.log.length).toBe(3);
		expect(result.final.enemyHp).toBe(0);
	});

	it("program ending with enemy alive is a HALT", () => {
		const result = runProgram([act("ZAP")], dummy());
		expect(result.outcome).toBe("HALT");
		expect(result.final.enemyHp).toBe(4);
	});

	it("bot acts first: kill lands before the enemy attack that turn", () => {
		const config = dummy({ enemyHp: 2, botHp: 1, pattern: [{ kind: "atk", n: 5 }] });
		const result = runProgram([act("ZAP")], config);
		expect(result.outcome).toBe("WIN");
		expect(result.final.botHp).toBe(1);
	});

	it("GUARD blocks a flat attack, WAIT does not", () => {
		const config = dummy({ pattern: [{ kind: "atk", n: 3 }] });
		const guarded = runProgram([act("GUARD"), act("ZAP")], config);
		expect(guarded.final.botHp).toBe(10 - 3);
		const idle = runProgram([act("WAIT"), act("ZAP")], config);
		expect(idle.final.botHp).toBe(10 - 6);
	});

	it("zapping into a shield reflects damage and deals none", () => {
		const config = dummy({ pattern: [{ kind: "shield" }] });
		const result = runProgram([act("ZAP")], config);
		expect(result.final.enemyHp).toBe(6);
		expect(result.final.botHp).toBe(8);
		expect(result.log[0]!.reflected).toBe(true);
	});

	it("PIERCE ignores shields and punishes them", () => {
		const config = dummy({ pattern: [{ kind: "shield" }, { kind: "wait" }] });
		const result = runProgram([act("PIERCE"), act("PIERCE")], config);
		expect(result.log[0]!.dmgToEnemy).toBe(3);
		expect(result.log[1]!.dmgToEnemy).toBe(1);
	});

	it("BOOST stacks power, ZAP spends it all", () => {
		const result = runProgram(
			[act("BOOST"), act("BOOST"), act("ZAP"), act("ZAP")],
			dummy({ enemyHp: 7 })
		);
		expect(result.log[2]!.dmgToEnemy).toBe(4); // 2 base + 2 pwr
		expect(result.log[3]!.dmgToEnemy).toBe(2); // pwr reset
		expect(result.outcome).toBe("HALT");
		expect(result.final.enemyHp).toBe(1);
	});

	it("CHARGE builds enemy strike damage, then resets", () => {
		const config = dummy({
			botHp: 20,
			pattern: [{ kind: "charge" }, { kind: "charge" }, { kind: "strike" }, { kind: "strike" }]
		});
		const result = runProgram([act("WAIT"), act("WAIT"), act("WAIT"), act("WAIT")], config);
		expect(result.log[2]!.dmgToBot).toBe(2 * (1 + 2)); // strikeBase 2, charge 2
		expect(result.log[3]!.dmgToBot).toBe(2); // charge consumed
	});

	it("LEECH heals the enemy for damage dealt, and GUARD stops the heal too", () => {
		const config = dummy({ enemyHp: 6, pattern: [{ kind: "wait" }, { kind: "leech", n: 2 }] });
		const drained = runProgram([act("ZAP"), act("WAIT")], config);
		expect(drained.final.enemyHp).toBe(6 - 2 + 2); // zapped 2, leeched back 2
		expect(drained.final.botHp).toBe(8);
		const guarded = runProgram([act("ZAP"), act("GUARD")], config);
		expect(guarded.final.enemyHp).toBe(4); // guard blocks the leech entirely
		expect(guarded.final.botHp).toBe(10);
	});

	it("MEND cannot heal past max hp", () => {
		const config = dummy({ pattern: [{ kind: "atk", n: 3 }, { kind: "wait" }, { kind: "wait" }] });
		const result = runProgram([act("WAIT"), act("MEND"), act("MEND")], config);
		expect(result.final.botHp).toBe(10); // -3, +2, then +1 capped at max
	});
});

describe("battle vm — control flow", () => {
	it("REPEAT expands its body the given number of times", () => {
		const result = runProgram([rep(3, [act("ZAP")])], dummy());
		expect(result.outcome).toBe("WIN");
		expect(result.log.length).toBe(3);
	});

	it("a false IF with no else consumes no turn", () => {
		const config = dummy({ pattern: [{ kind: "wait" }] });
		const result = runProgram([iff("SHIELDED", "GUARD"), act("ZAP")], config);
		expect(result.log.length).toBe(1);
		expect(result.log[0]!.op).toBe("ZAP");
	});

	it("a false IF with an else runs the else branch", () => {
		const config = dummy({ pattern: [{ kind: "wait" }] });
		const result = runProgram([iff("SHIELDED", "GUARD", "ZAP")], config);
		expect(result.log[0]!.op).toBe("ZAP");
		expect(result.log[0]!.viaElse).toBe(true);
	});

	it("IF reads the CURRENT turn's enemy move", () => {
		const config = dummy({
			enemyHp: 20,
			pattern: [{ kind: "shield" }, { kind: "wait" }]
		});
		const program = [rep(4, [iff("SHIELDED", "PIERCE", "ZAP")])];
		const result = runProgram(program, config);
		expect(result.log.map((e) => e.op)).toEqual(["PIERCE", "ZAP", "PIERCE", "ZAP"]);
		expect(result.log.map((e) => e.dmgToEnemy)).toEqual([3, 2, 3, 2]);
	});

	it("an all-false loop body evaporates without burning turns", () => {
		const config = dummy({ pattern: [{ kind: "wait" }] });
		const result = runProgram([rep(9, [iff("SHIELDED", "GUARD")]), act("ZAP")], config);
		expect(result.log.length).toBe(1);
	});

	it("CALL expands a routine and charges the caller's block id", () => {
		const routines = { "TRIPLE-TAP": [act("ZAP"), act("ZAP"), act("ZAP")] };
		const theCall = call("TRIPLE-TAP");
		const result = runProgram([theCall], dummy(), routines);
		expect(result.outcome).toBe("WIN");
		expect(result.log.every((e) => e.blockId === theCall.id)).toBe(true);
	});

	it("hits the turn cap instead of looping forever", () => {
		const config = dummy({ enemyHp: 500, turnCap: 12 });
		const result = runProgram([rep(9, [act("WAIT"), act("WAIT")])], config);
		expect(result.outcome).toBe("TIMEOUT");
		expect(result.log.length).toBe(12);
	});
});

describe("battle vm — slot accounting", () => {
	it("actions and IFs cost one, REPEAT costs one plus body, CALL costs one", () => {
		expect(programCost([act("ZAP")])).toBe(1);
		expect(programCost([iff("SHIELDED", "PIERCE", "ZAP")])).toBe(1);
		expect(programCost([rep(4, [act("ZAP")])])).toBe(2);
		expect(programCost([rep(4, [act("ZAP"), iff("SHIELDED", "GUARD")])])).toBe(3);
		expect(programCost([call("X")])).toBe(1);
	});

	it("loops beat copy-paste on cost — the Loophollow lesson", () => {
		const pasted = programCost([...Array(10)].map(() => act("ZAP")));
		const looped = programCost([rep(10, [act("ZAP")])]);
		expect(pasted).toBe(10);
		expect(looped).toBe(2);
	});
});

describe("battle vm — determinism", () => {
	it("same program, same config, identical run every time", () => {
		const config = dummy({
			enemyHp: 12,
			botHp: 14,
			pattern: [{ kind: "charge" }, { kind: "strike" }, { kind: "shield" }]
		});
		const program = [rep(6, [iff("SHIELDED", "PIERCE", "ZAP")])];
		const a = runProgram(program, config);
		const b = runProgram(program, config);
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	});

	it("initialState never aliases the config", () => {
		const config = dummy();
		const s = initialState(config);
		s.enemyHp = 0;
		expect(config.enemyHp).toBe(6);
	});
});

describe("value vm — misconception engine", () => {
	const program: ValueOp[] = [
		{ kind: "set", v: "x", n: 2 },
		{ kind: "add", v: "x", n: 3 }
	];

	it("computes honestly by default", () => {
		expect(runValue(program).x).toBe(5);
	});

	it("concat mode reproduces the classic string-glue mistake", () => {
		expect(runValue(program, "concat").x).toBe(23);
	});

	it("loop modes reproduce off-by-one and run-once mistakes", () => {
		const loop: ValueOp[] = [
			{ kind: "set", v: "x", n: 1 },
			{ kind: "vrepeat", times: 3, body: [{ kind: "double", v: "x" }] }
		];
		expect(runValue(loop).x).toBe(8);
		expect(runValue(loop, "loop-once").x).toBe(2);
		expect(runValue(loop, "loop-off-by-one").x).toBe(4);
	});

	it("if modes reproduce skipped and over-eager conditionals", () => {
		const branchy: ValueOp[] = [
			{ kind: "set", v: "x", n: 4 },
			{ kind: "vif", v: "x", cmp: ">", n: 3, then: { kind: "add", v: "x", n: 10 } },
			{ kind: "vif", v: "x", cmp: "<", n: 3, then: { kind: "add", v: "x", n: 100 } }
		];
		expect(runValue(branchy).x).toBe(14);
		expect(runValue(branchy, "skip-if").x).toBe(4);
		expect(runValue(branchy, "always-if").x).toBe(114);
	});
});

describe("grid vm", () => {
	it("walks a square with a loop", () => {
		const result = runGrid(
			[{ kind: "grepeat", times: 4, body: [{ kind: "step" }, { kind: "right" }] }],
			5,
			2,
			2,
			0
		);
		expect(result.x).toBe(2);
		expect(result.y).toBe(2);
		expect(result.dir).toBe(0);
	});

	it("clamps at the grid edge instead of escaping", () => {
		const result = runGrid([{ kind: "grepeat", times: 9, body: [{ kind: "step" }] }], 5, 2, 2, 0);
		expect(result.y).toBe(0);
	});
});
