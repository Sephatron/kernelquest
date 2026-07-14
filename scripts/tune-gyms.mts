// Gym design tuner: runs candidate battle definitions against the solver in
// both directions (winnable with concept / provably not without) and prints
// a verdict table. Run with: npx tsx scripts/tune-gyms.mts  (or vite-node)

import { findWin, proveNoWin, type VocabSpec } from "../src/battle/solver";
import { act, iff, rep, call, programCost, runProgram, describeBlock, type BattleConfig, type EnemyMove, type Program, type RoutineTable } from "../src/battle/vm";

const atk = (n: number): EnemyMove => ({ kind: "atk", n });
const wait: EnemyMove = { kind: "wait" };
const shield: EnemyMove = { kind: "shield" };
const charge: EnemyMove = { kind: "charge" };
const strike: EnemyMove = { kind: "strike" };
const heal = (n: number): EnemyMove => ({ kind: "heal", n });

function vocab(parts: { pierce?: boolean; boost?: boolean; mend?: boolean; repeat?: boolean; ifs?: boolean; pwr3?: boolean; lowhp?: boolean }): VocabSpec {
	const acts: VocabSpec["acts"] = ["ZAP", "GUARD", "WAIT"];
	if (parts.pierce) acts.push("PIERCE");
	if (parts.boost) acts.push("BOOST");
	if (parts.mend) acts.push("MEND");
	const conds: VocabSpec["conds"] = [];
	if (parts.ifs) conds.push("SHIELDED", "CHARGING");
	if (parts.pwr3) conds.push("PWR3");
	if (parts.lowhp) conds.push("LOWHP");
	return { acts, conds, repeat: parts.repeat ?? false, maxRepeat: 9, maxBodyLen: 3 };
}

const V = {
	b1: vocab({ repeat: true }), // after gym2 unlock (loops)
	b2: vocab({ repeat: true, ifs: true, pierce: true }), // after gym3 unlock
	b3: vocab({ repeat: true, ifs: true, pierce: true, boost: true, pwr3: true }),
	b4: vocab({ repeat: true, ifs: true, pierce: true, boost: true, pwr3: true, mend: true, lowhp: true })
};

interface Candidate {
	id: string;
	config: BattleConfig;
	slots: number;
	withVocab: VocabSpec;
	withoutVocab: VocabSpec | null; // null = no gate check
	authored: Program;
	routines?: RoutineTable;
}

const candidates: Candidate[] = [
	{
		id: "gym3-forkbridge",
		config: {
			botHp: 8,
			enemyHp: 12,
			pattern: [shield, atk(2), shield, wait, shield, shield, atk(1)],
			turnCap: 14
		},
		slots: 5,
		withVocab: V.b2,
		withoutVocab: V.b1,
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	{
		id: "gym4-cacheford",
		config: {
			botHp: 9,
			enemyHp: 10,
			pattern: [wait, wait, atk(2), wait],
			turnCap: 18,
			enemyArmor: 2
		},
		slots: 6,
		withVocab: V.b3,
		withoutVocab: V.b2,
		authored: [rep(6, [act("BOOST"), act("BOOST"), act("ZAP")])]
	},
	{
		id: "gym5-routinerow",
		config: {
			botHp: 4,
			enemyHp: 22,
			pattern: [atk(3), wait, atk(3), wait, wait, atk(3), wait, atk(3), shield],
			turnCap: 24
		},
		slots: 6,
		withVocab: V.b4,
		withoutVocab: V.b3,
		authored: [
			call("HEAD"),
			call("BODY"),
			call("TAIL"),
			call("HEAD"),
			call("BODY"),
			call("TAIL")
		],
		routines: {
			HEAD: [act("GUARD"), act("ZAP"), act("GUARD")],
			BODY: [act("ZAP"), act("ZAP"), act("GUARD")],
			TAIL: [act("ZAP"), act("GUARD"), iff("SHIELDED", "PIERCE", "ZAP")]
		}
	},
	{
		id: "gym6-modula",
		config: {
			botHp: 4,
			enemyHp: 26,
			pattern: [atk(3), wait, atk(3), wait, wait, atk(3), wait, atk(3), wait, wait, atk(3), wait],
			turnCap: 24
		},
		slots: 8,
		withVocab: V.b4,
		withoutVocab: V.b3,
		authored: [
			call("ALPHA"),
			call("BETA"),
			call("GAMMA"),
			call("GAMMA"),
			call("ALPHA"),
			call("BETA"),
			call("GAMMA"),
			call("GAMMA")
		],
		routines: {
			ALPHA: [act("GUARD"), act("ZAP"), act("GUARD")],
			BETA: [act("ZAP"), act("ZAP"), act("GUARD")],
			GAMMA: [act("ZAP"), act("GUARD"), act("ZAP")]
		}
	},
	{
		id: "gym8-bigo",
		config: {
			botHp: 8,
			enemyHp: 24,
			pattern: [wait, atk(1), shield, heal(3)],
			turnCap: 16
		},
		slots: 4,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")]), rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	{
		id: "gym2-t1",
		config: { botHp: 8, enemyHp: 12, pattern: [atk(1), wait], turnCap: 14 },
		slots: 3,
		withVocab: V.b1,
		withoutVocab: null,
		authored: [rep(6, [act("ZAP")]), act("ZAP")]
	},
	{
		id: "gym3-t1",
		config: { botHp: 8, enemyHp: 10, pattern: [shield, wait, shield, atk(2)], turnCap: 12 },
		slots: 4,
		withVocab: V.b2,
		withoutVocab: null,
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	{
		id: "gym5-t1",
		config: { botHp: 6, enemyHp: 12, pattern: [atk(3), wait, wait, atk(3), shield, wait], turnCap: 16 },
		slots: 5,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [call("JAB"), call("JAB"), call("JAB"), rep(2, [act("ZAP")])],
		routines: { JAB: [act("GUARD"), act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP")] }
	},
	{
		id: "rival1",
		config: { botHp: 7, enemyHp: 6, pattern: [atk(2), wait, shield, wait], turnCap: 10 },
		slots: 6,
		withVocab: vocab({}),
		withoutVocab: null,
		authored: [act("GUARD"), act("ZAP"), act("WAIT"), act("ZAP"), act("GUARD"), act("ZAP")]
	},
	{
		id: "rival2",
		config: { botHp: 9, enemyHp: 12, pattern: [charge, strike, wait], turnCap: 20, strikeBase: 2 },
		slots: 6,
		withVocab: V.b3,
		withoutVocab: null,
		authored: [rep(9, [iff("CHARGING", "GUARD", "ZAP"), act("GUARD"), act("ZAP")])]
	},
	{
		id: "rival3",
		config: { botHp: 9, enemyHp: 14, pattern: [shield, charge, strike], turnCap: 24, strikeBase: 3, enemyArmor: 1 },
		slots: 6,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "WAIT"), iff("CHARGING", "GUARD", "ZAP"), act("GUARD")])]
	},
	{
		id: "null-fight",
		config: { botHp: 8, enemyHp: 14, pattern: [shield, atk(2), shield, wait], turnCap: 16 },
		slots: 4,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	{
		id: "gym7-fixed",
		config: { botHp: 6, enemyHp: 16, pattern: [atk(3), wait, shield, wait, atk(3), shield], turnCap: 20 },
		slots: 6,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [rep(6, [act("GUARD"), act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	{
		id: "council1",
		config: { botHp: 6, enemyHp: 10, pattern: [atk(2), atk(2), wait], turnCap: 18 },
		slots: 6,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [rep(9, [act("GUARD"), act("GUARD"), act("ZAP")])]
	},
	{
		id: "council2",
		config: { botHp: 10, enemyHp: 12, pattern: [wait, atk(1), wait, wait], turnCap: 22, enemyArmor: 2 },
		slots: 5,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [rep(9, [act("BOOST"), act("BOOST"), iff("PWR3", "ZAP", "BOOST")])]
	},
	{
		id: "council3",
		config: { botHp: 7, enemyHp: 20, pattern: [shield, shield, atk(3), shield, atk(3)], turnCap: 16 },
		slots: 5,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "GUARD")])]
	},
	{
		id: "council4",
		config: { botHp: 5, enemyHp: 24, pattern: [atk(3), wait, atk(3), wait, shield, wait, atk(3), shield, wait], turnCap: 26 },
		slots: 7,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [call("HEAD"), call("BODY"), call("TAIL"), call("HEAD"), call("BODY"), call("TAIL"), act("ZAP")],
		routines: {
			HEAD: [act("GUARD"), act("ZAP"), act("GUARD")],
			BODY: [act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP"), act("ZAP")],
			TAIL: [act("GUARD"), iff("SHIELDED", "PIERCE", "ZAP"), act("ZAP")]
		}
	},
	{
		id: "champion",
		config: { botHp: 8, enemyHp: 24, pattern: [charge, strike, shield, atk(3), wait, shield], turnCap: 26, strikeBase: 3, enemyArmor: 1 },
		slots: 8,
		withVocab: V.b4,
		withoutVocab: null,
		authored: [
			call("SHRUG"), call("PUNCH"), call("SHRUG"), call("PUNCH"),
			call("SHRUG"), call("PUNCH"), call("SHRUG"), call("PUNCH")
		],
		routines: {
			SHRUG: [act("BOOST"), act("GUARD"), iff("SHIELDED", "PIERCE", "WAIT")],
			PUNCH: [act("GUARD"), act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP")]
		}
	}
];

for (const c of candidates) {
	const authoredCost = programCost(c.authored);
	const authoredRun = runProgram(c.authored, c.config, c.routines ?? {});
	let discover = "—";
	let discovered: Program | null = null;
	try {
		const r = findWin(c.config, c.withVocab, c.slots, { budget: 8_000_000, routines: c.routines });
		discovered = r.program;
		discover = r.program ? "FOUND (" + r.explored + ")" : "NONE (" + r.explored + ")";
	} catch (e) {
		discover = "BUDGET";
	}
	let gate = "n/a";
	if (c.withoutVocab) {
		try {
			const g = proveNoWin(c.config, c.withoutVocab, c.slots, { budget: 8_000_000 });
			gate = g.proven ? "PROVEN (" + g.explored + ")" : "BROKEN: " + (g.counterexample ? g.counterexample.map(describeBlock).join(" ; ") : "");
		} catch (e) {
			gate = "BUDGET EXCEEDED";
		}
	}
	console.log("== " + c.id);
	console.log("   authored: cost " + authoredCost + "/" + c.slots + " -> " + authoredRun.outcome + " in " + authoredRun.log.length + " turns (bot hp left " + authoredRun.final.botHp + ")");
	console.log("   discoverable with concept: " + discover);
	if (discovered) console.log("   e.g. " + discovered.map(describeBlock).join(" ; "));
	console.log("   gate without concept: " + gate);
}
