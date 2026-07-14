// Program-battle definitions: gym leaders, gym trainers, rival fights, the
// NULL incident, the Kernel Council and the Champion. Every authored
// solution is executed by the tests; gated gyms carry machine-checked proofs
// that the pre-concept vocabulary cannot win (tests/gyms.test.ts, tuned via
// scripts/tune-gyms.mts).

import type { EnemyMove, Program, RoutineTable } from "../battle/vm";
import { act, call, iff, rep } from "../battle/vm";

export interface ProgramBattleDef {
	id: string;
	kind: "gym" | "trainer";
	title: string;
	enemyName: string;
	sprite: string;
	enemyHp: number;
	pattern: EnemyMove[];
	strikeBase?: number;
	enemyArmor?: number;
	botHp: number;
	slots: number;
	turnCap: number;
	xp: number;
	bits: number;
	winFlag: string;
	intro?: string;
	winText?: string;
	authored: Program;
	// Routines the authored solution assumes a player could define — used by
	// the tests to prove solvability; players define their own in battle.
	proofRoutines?: RoutineTable;
	// Concept whose removal must make the fight unwinnable (gyms 2+).
	gatedBy?: "repeat" | "if" | "vars" | "func";
	// Debugging battles: the editor starts loaded with this broken program.
	prefill?: Program;
}

const atk = (n: number): EnemyMove => ({ kind: "atk", n });
const wait: EnemyMove = { kind: "wait" };
const shield: EnemyMove = { kind: "shield" };
const charge: EnemyMove = { kind: "charge" };
const strike: EnemyMove = { kind: "strike" };
const heal = (n: number): EnemyMove => ({ kind: "heal", n });

export const PROGRAM_BATTLES: Record<string, ProgramBattleDef> = {
	"gym1-t1": {
		id: "gym1-t1",
		kind: "trainer",
		title: "STEPWICK GYM — AIDE",
		enemyName: "CRASHKET",
		sprite: "mite.crashket",
		enemyHp: 4,
		pattern: [atk(2), wait],
		botHp: 6,
		slots: 4,
		turnCap: 8,
		xp: 8,
		bits: 8,
		winFlag: "won.gym1-t1",
		intro: "Two-step pattern: ATK 2, then rest. When do you guard? When do you zap?",
		authored: [act("GUARD"), act("ZAP"), act("GUARD"), act("ZAP")]
	},
	gym1: {
		id: "gym1",
		kind: "gym",
		title: "STEPWICK GYM — MARSHAL INDEX",
		enemyName: "INDEXA.EXE",
		sprite: "boss.indexa",
		enemyHp: 6,
		pattern: [atk(3), wait, shield, wait],
		botHp: 5,
		slots: 6,
		turnCap: 10,
		xp: 20,
		bits: 25,
		winFlag: "won.gym1",
		intro: "Four beats, forever: ATK 3 · rest · SHIELD · rest. Zap a shield and it bites back. Order is everything.",
		winText: "Every block in its right place.",
		authored: [act("GUARD"), act("ZAP"), act("WAIT"), act("ZAP"), act("GUARD"), act("ZAP")]
	},
	"gym2-t1": {
		id: "gym2-t1",
		kind: "trainer",
		title: "LOOPHOLLOW GYM — APPRENTICE",
		enemyName: "DITTOGRAF",
		sprite: "mite.dittograf",
		enemyHp: 12,
		pattern: [atk(1), wait],
		botHp: 8,
		slots: 3,
		turnCap: 14,
		xp: 12,
		bits: 12,
		winFlag: "won.gym2-t1",
		intro: "Twelve HP, three slots. Type ZAP twelve times? You may not.",
		authored: [rep(6, [act("ZAP")]), act("ZAP")]
	},
	gym2: {
		id: "gym2",
		kind: "gym",
		title: "LOOPHOLLOW GYM — VECTORA",
		enemyName: "REDUNDA.EXE",
		sprite: "boss.redunda",
		enemyHp: 22,
		pattern: [atk(1), wait],
		botHp: 9,
		slots: 4,
		turnCap: 22,
		xp: 30,
		bits: 35,
		winFlag: "won.gym2",
		intro: "22 HP. Your rig holds 4 memory slots. Copy-paste cannot save you now.",
		winText: "Two slots. Infinite zaps. THAT'S leverage.",
		authored: [rep(9, [act("ZAP")]), rep(3, [act("ZAP")])],
		gatedBy: "repeat"
	},
	"gym3-t1": {
		id: "gym3-t1",
		kind: "trainer",
		title: "FORKBRIDGE GYM — TOLLKEEPER",
		enemyName: "SHUTTERBUG",
		sprite: "mite.shutterbug",
		enemyHp: 10,
		pattern: [shield, wait, shield, atk(2)],
		botHp: 8,
		slots: 4,
		turnCap: 12,
		xp: 16,
		bits: 15,
		winFlag: "won.gym3-t1",
		intro: "It opens and shuts. Zap the shut, get bitten. React, don't recite.",
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	gym3: {
		id: "gym3",
		kind: "gym",
		title: "FORKBRIDGE GYM — OLD ELSE",
		enemyName: "DILEMMA.EXE",
		sprite: "boss.dilemma",
		enemyHp: 12,
		pattern: [shield, atk(2), shield, wait, shield, shield, atk(1)],
		botHp: 8,
		slots: 5,
		turnCap: 14,
		xp: 40,
		bits: 45,
		winFlag: "won.gym3",
		intro: "Seven beats, five of them tricky. No fixed script survives this. Ask the moment what it needs.",
		winText: "IF you understood that, THEN you did. No else about it.",
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])],
		gatedBy: "if"
	},
	gym4: {
		id: "gym4",
		kind: "gym",
		title: "CACHEFORD GYM — REGISTRA",
		enemyName: "VAULTRON.EXE",
		sprite: "boss.vaultron",
		enemyHp: 10,
		pattern: [wait, wait, atk(2), wait],
		turnCap: 18,
		enemyArmor: 2,
		botHp: 9,
		slots: 6,
		xp: 55,
		bits: 55,
		winFlag: "won.gym4",
		intro: "ARMOR 2: every hit loses two. A plain zap bounces off. Store power. Spend it all at once.",
		winText: "You kept a number in your head and it kept you. That's state.",
		authored: [rep(6, [act("BOOST"), act("BOOST"), act("ZAP")])],
		gatedBy: "vars"
	},
	"gym5-t1": {
		id: "gym5-t1",
		kind: "trainer",
		title: "ROUTINE ROW GYM — CLERK",
		enemyName: "STACKLET",
		sprite: "mite.stacklet",
		enemyHp: 12,
		pattern: [atk(3), wait, wait, atk(3), shield, wait],
		botHp: 6,
		slots: 5,
		turnCap: 16,
		xp: 30,
		bits: 25,
		winFlag: "won.gym5-t1",
		intro: "Guard-zap-answer, guard-zap-answer. Sick of assembling it? NAME it. That's what routines are for.",
		authored: [call("JAB"), call("JAB"), call("JAB"), rep(2, [act("ZAP")])],
		proofRoutines: { JAB: [act("GUARD"), act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP")] }
	},
	gym5: {
		id: "gym5",
		kind: "gym",
		title: "ROUTINE ROW GYM — SUB",
		enemyName: "TANGLE.EXE",
		sprite: "boss.tangle",
		enemyHp: 22,
		pattern: [atk(3), wait, atk(3), wait, wait, atk(3), wait, atk(3), shield],
		botHp: 4,
		slots: 6,
		turnCap: 24,
		xp: 70,
		bits: 70,
		winFlag: "won.gym5",
		intro: "Nine beats, four bites, one opening — twice over. Six slots will not hold eighteen steps. Name the steps.",
		winText: "You didn't write a longer program. You wrote a better vocabulary.",
		authored: [call("HEAD"), call("BODY"), call("TAIL"), call("HEAD"), call("BODY"), call("TAIL")],
		proofRoutines: {
			HEAD: [act("GUARD"), act("ZAP"), act("GUARD")],
			BODY: [act("ZAP"), act("ZAP"), act("GUARD")],
			TAIL: [act("ZAP"), act("GUARD"), iff("SHIELDED", "PIERCE", "ZAP")]
		},
		gatedBy: "func"
	},
	gym6: {
		id: "gym6",
		kind: "gym",
		title: "MODULA HEIGHTS GYM — ARCHIE TECTURE",
		enemyName: "MONOLITH.EXE",
		sprite: "boss.monolith",
		enemyHp: 26,
		pattern: [atk(3), wait, atk(3), wait, wait, atk(3), wait, atk(3), wait, wait, atk(3), wait],
		botHp: 4,
		slots: 8,
		turnCap: 24,
		xp: 85,
		bits: 85,
		winFlag: "won.gym6",
		intro: "Twelve beats of wall. Don't fight a monolith. Break it into three phrases — and notice one repeats.",
		winText: "Big problem, small pieces, one of them reused. Architecture.",
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
		proofRoutines: {
			ALPHA: [act("GUARD"), act("ZAP"), act("GUARD")],
			BETA: [act("ZAP"), act("ZAP"), act("GUARD")],
			GAMMA: [act("ZAP"), act("GUARD"), act("ZAP")]
		},
		gatedBy: "func"
	},
	gym7: {
		id: "gym7",
		kind: "gym",
		title: "TRACEWELL GYM — BISECTOR",
		enemyName: "HEISENBUG.EXE",
		sprite: "boss.heisenbug",
		enemyHp: 16,
		pattern: [atk(3), wait, shield, wait, atk(3), shield],
		botHp: 6,
		slots: 6,
		turnCap: 20,
		xp: 95,
		bits: 95,
		winFlag: "won.gym7",
		intro: "This program ALMOST works — a promising student wrote it, then cried. Run it. Watch it fail. Fix ONE thing at a time.",
		winText: "You didn't rewrite it. You READ it. That's the whole discipline.",
		authored: [rep(6, [act("GUARD"), act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP")])],
		prefill: [rep(6, [act("GUARD"), act("ZAP"), iff("SHIELDED", "ZAP", "PIERCE")])]
	},
	gym8: {
		id: "gym8",
		kind: "gym",
		title: "BIG-O CITY GYM — ADA MANT",
		enemyName: "OMEGA.EXE",
		sprite: "boss.omega",
		enemyHp: 24,
		pattern: [wait, atk(1), shield, heal(3)],
		botHp: 8,
		slots: 4,
		turnCap: 16,
		xp: 110,
		bits: 110,
		winFlag: "won.gym8",
		intro: "It heals 3 every fourth beat. Sixteen turns. Four slots. Nothing wasted, or nothing won.",
		winText: "Same answer, fewer steps. THAT'S the last lesson.",
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")]), rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	rival1: {
		id: "rival1",
		kind: "trainer",
		title: "ROUTE 2 — CHAD",
		enemyName: "CHAD-BOT MK1",
		sprite: "boss.chadbot",
		enemyHp: 6,
		pattern: [atk(2), wait, shield, wait],
		botHp: 7,
		slots: 6,
		turnCap: 10,
		xp: 15,
		bits: 20,
		winFlag: "won.rival1",
		intro: "CHAD: My program has SIX zaps. Six! Count them, nerd.",
		winText: "CHAD: ...I'm adding a seventh zap.",
		authored: [act("GUARD"), act("ZAP"), act("WAIT"), act("ZAP"), act("GUARD"), act("ZAP")]
	},
	rival2: {
		id: "rival2",
		kind: "trainer",
		title: "ROUTE 5 — CHAD",
		enemyName: "CHAD-BOT MK2",
		sprite: "boss.chadbot",
		enemyHp: 12,
		pattern: [charge, strike, wait],
		strikeBase: 2,
		botHp: 9,
		slots: 6,
		turnCap: 20,
		xp: 45,
		bits: 50,
		winFlag: "won.rival2",
		intro: "CHAD: MK2 charges up. I copy-pasted the charging code five times so it's five times as good.",
		winText: "CHAD: Whatever. Loops are for people who can't afford more slots.",
		authored: [rep(9, [iff("CHARGING", "GUARD", "ZAP"), act("GUARD"), act("ZAP")])]
	},
	rival3: {
		id: "rival3",
		kind: "trainer",
		title: "ROUTE 8 — CHAD",
		enemyName: "CHAD-BOT MK3",
		sprite: "boss.chadbot",
		enemyHp: 14,
		pattern: [shield, charge, strike],
		strikeBase: 3,
		enemyArmor: 1,
		botHp: 9,
		slots: 6,
		turnCap: 24,
		xp: 75,
		bits: 80,
		winFlag: "won.rival3",
		intro: "CHAD: MK3 has armor, a shield AND a hammer. I regret nothing except the wiring.",
		winText: "CHAD: Fine. FINE. See you at Kernel Peak. Bring tissues. For you.",
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "WAIT"), iff("CHARGING", "GUARD", "ZAP"), act("GUARD")])]
	},
	nullfight: {
		id: "nullfight",
		kind: "trainer",
		title: "THE KLUDGE VAT — NULL",
		enemyName: "NULL",
		sprite: "boss.null",
		enemyHp: 14,
		pattern: [shield, atk(2), shield, wait],
		botHp: 8,
		slots: 4,
		turnCap: 16,
		xp: 60,
		bits: 60,
		winFlag: "won.nullfight",
		intro: "The Kludge's 'masterpiece'. It is mostly duct tape and screaming. Debug it out of its misery.",
		winText: "NULL dissolves into a warning message nobody will read.",
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "ZAP")])]
	},
	council1: {
		id: "council1",
		kind: "trainer",
		title: "KERNEL COUNCIL — SEQUENZA",
		enemyName: "METRONOME.SYS",
		sprite: "boss.indexa",
		enemyHp: 10,
		pattern: [atk(2), atk(2), wait],
		botHp: 6,
		slots: 6,
		turnCap: 18,
		xp: 80,
		bits: 60,
		winFlag: "won.council1",
		intro: "SEQUENZA: Two blows, one breath. Prove the first lesson still lives in you.",
		authored: [rep(9, [act("GUARD"), act("GUARD"), act("ZAP")])]
	},
	council2: {
		id: "council2",
		kind: "trainer",
		title: "KERNEL COUNCIL — ACCUMULA",
		enemyName: "LEDGER.SYS",
		sprite: "boss.vaultron",
		enemyHp: 12,
		pattern: [wait, atk(1), wait, wait],
		enemyArmor: 2,
		botHp: 10,
		slots: 5,
		turnCap: 22,
		xp: 80,
		bits: 60,
		winFlag: "won.council2",
		intro: "ACCUMULA: Armor two. Patience three. Show me you can hold a number and a nerve.",
		authored: [rep(9, [act("BOOST"), act("BOOST"), iff("PWR3", "ZAP", "BOOST")])]
	},
	council3: {
		id: "council3",
		kind: "trainer",
		title: "KERNEL COUNCIL — GATEKEEPER",
		enemyName: "PORTCULLIS.SYS",
		sprite: "boss.dilemma",
		enemyHp: 20,
		pattern: [shield, shield, atk(3), shield, atk(3)],
		botHp: 7,
		slots: 5,
		turnCap: 16,
		xp: 80,
		bits: 60,
		winFlag: "won.council3",
		intro: "GATEKEEPER: Mostly wall, occasionally teeth. One good conditional beats a thousand plans.",
		authored: [rep(9, [iff("SHIELDED", "PIERCE", "GUARD")]), rep(9, [iff("SHIELDED", "PIERCE", "GUARD")])]
	},
	council4: {
		id: "council4",
		kind: "trainer",
		title: "KERNEL COUNCIL — COMPOSITA",
		enemyName: "SYMPHONY.SYS",
		sprite: "boss.monolith",
		enemyHp: 24,
		pattern: [atk(3), wait, atk(3), wait, shield, wait, atk(3), shield, wait],
		botHp: 5,
		slots: 7,
		turnCap: 26,
		xp: 80,
		bits: 60,
		winFlag: "won.council4",
		intro: "COMPOSITA: Nine beats in three movements. Name them well and conduct.",
		authored: [call("HEAD"), call("BODY"), call("TAIL"), call("HEAD"), call("BODY"), call("TAIL"), act("ZAP")],
		proofRoutines: {
			HEAD: [act("GUARD"), act("ZAP"), act("GUARD")],
			BODY: [act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP"), act("ZAP")],
			TAIL: [act("GUARD"), iff("SHIELDED", "PIERCE", "ZAP"), act("ZAP")]
		}
	},
	champion: {
		id: "champion",
		kind: "trainer",
		title: "THE CHAMPION — CHAD",
		enemyName: "CHAD-BOT ULTRA",
		sprite: "boss.chadbot",
		enemyHp: 24,
		pattern: [charge, strike, shield, atk(3), wait, shield],
		strikeBase: 3,
		enemyArmor: 1,
		botHp: 8,
		slots: 8,
		turnCap: 26,
		xp: 150,
		bits: 200,
		winFlag: "won.champion",
		intro: "CHAD: I read a book. ONE book. It said 'abstraction'. So I bolted three more bots onto this one.",
		winText: "CHAD: ...okay. Teach me the loop thing. Please.",
		authored: [
			call("SHRUG"),
			call("PUNCH"),
			call("SHRUG"),
			call("PUNCH"),
			call("SHRUG"),
			call("PUNCH"),
			call("SHRUG"),
			call("PUNCH")
		],
		proofRoutines: {
			SHRUG: [act("BOOST"), act("GUARD"), iff("SHIELDED", "PIERCE", "WAIT")],
			PUNCH: [act("GUARD"), act("ZAP"), iff("SHIELDED", "PIERCE", "ZAP")]
		}
	}
};
