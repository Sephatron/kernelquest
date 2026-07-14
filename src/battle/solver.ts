// Brute-force fairness prover for gym battles.
//
// Two guarantees, both machine-checked in the test suite:
//   1. Winnable: with the gym's unlocked vocabulary there IS a program within
//      the slot limit that wins (we run the authored solution, and can also
//      search to confirm the puzzle is discoverable).
//   2. Gated: with the vocabulary available BEFORE the gym's new PRIMITIVE
//      (an action, a conditional, or loops), NO program a player can build
//      within the slot limit wins — proven by exhaustively enumerating the
//      COMPLETE editor grammar (see enumerateComplete).
//
// The search executes candidate programs through the same ProgramCursor and
// stepTurn as live gameplay, and enumerateComplete covers exactly the programs
// the editor can produce, so the proof is about the real game. NOTE: this
// only soundly gates PRIMITIVES. Functions (CALL) are a compression tool, not
// new behaviour, so "unwinnable without functions" is not claimed — gyms 5/6
// instead machine-check that their intended solution cannot FIT the slot
// budget once its routines are inlined (see tests/gyms.test.ts).

import type { ActBlock, BattleConfig, BattleState, Block, BotOp, Cond, IfBlock, Program, RoutineTable } from "./vm";
import {
	DEFAULT_TURN_CAP,
	PIERCE_BASE,
	PIERCE_VS_SHIELD,
	PWR_CAP,
	ProgramCursor,
	ZAP_BASE,
	initialState,
	slotCost,
	stepTurn
} from "./vm";

export interface VocabSpec {
	acts: BotOp[];
	conds: Cond[]; // empty = IF not available
	repeat: boolean;
	maxRepeat: number; // highest REPEAT count offered
	maxBodyLen: number; // longest REPEAT body considered by the solver
}

export class SolverBudgetExceeded extends Error {
	constructor(public explored: number) {
		super("solver budget exceeded after " + explored + " simulations — result inconclusive");
	}
}

interface ExecStep {
	state: BattleState;
	status: "ongoing" | "win" | "loss" | "timeout";
}

function cloneState(s: BattleState): BattleState {
	return { ...s };
}

function executeItem(state: BattleState, item: Block, config: BattleConfig, routines: RoutineTable): ExecStep {
	const s = cloneState(state);
	const cursor = new ProgramCursor([item], routines);
	const turnCap = config.turnCap ?? DEFAULT_TURN_CAP;
	for (;;) {
		const enemyMove = config.pattern[s.patternIndex % config.pattern.length]!;
		const move = cursor.next(s, enemyMove);
		if (move === null) return { state: s, status: "ongoing" };
		stepTurn(s, config, move, enemyMove);
		if (s.enemyHp <= 0) return { state: s, status: "win" };
		if (s.botHp <= 0) return { state: s, status: "loss" };
		if (s.turn >= turnCap) return { state: s, status: "timeout" };
	}
}

function stateKey(s: BattleState): string {
	return s.botHp + "," + s.enemyHp + "," + s.pwr + "," + s.charge + "," + s.patternIndex + "," + s.turn;
}

let solverIds = 0;
function sid(): string {
	return "s" + ++solverIds;
}

function mkAct(op: BotOp): ActBlock {
	return { kind: "act", op, id: sid() };
}

function mkIf(cond: Cond, then: BotOp, els?: BotOp): IfBlock {
	return { kind: "if", cond, then, els, id: sid() };
}

// Every single block the editor can place: each action, and each IF variant
// (a condition with a THEN, optionally an ELSE). This is exactly the grammar
// of one program slot / one loop-body element.
function singleBlocks(vocab: VocabSpec): (ActBlock | IfBlock)[] {
	const blocks: (ActBlock | IfBlock)[] = vocab.acts.map(mkAct);
	for (const cond of vocab.conds) {
		for (const then of vocab.acts) {
			blocks.push(mkIf(cond, then));
			for (const els of vocab.acts) {
				if (els === then) continue; // IF c THEN a ELSE a == plain a
				blocks.push(mkIf(cond, then, els));
			}
		}
	}
	return blocks;
}

function cloneBlock(b: ActBlock | IfBlock): ActBlock | IfBlock {
	return b.kind === "act" ? mkAct(b.op) : mkIf(b.cond, b.then, b.els);
}

// The COMPLETE set of top-level items a player can place: every single block,
// plus every REPEAT whose body is any sequence of 1..maxBodyLen single blocks.
// Completeness — not a heuristic subset — is what makes proveNoWin a real
// proof. maxBodyLen MUST match the editor's loop-body cap (MAX_LOOP_BODY in
// gymui.ts). This is exponential in maxBodyLen, so it throws rather than
// silently truncating (or OOMing) when the grammar is too large to enumerate;
// proveNoWin is only ever run on the small pre-gym vocabularies, where it fits.
const COMPLETE_ITEM_CAP = 400_000;

export function enumerateComplete(vocab: VocabSpec): Block[] {
	const singles = singleBlocks(vocab);
	const items: Block[] = [...singles];
	if (vocab.repeat) {
		const bodies: (ActBlock | IfBlock)[][] = [];
		const grow = (prefix: (ActBlock | IfBlock)[]): void => {
			if (prefix.length > 0) bodies.push(prefix);
			if (prefix.length >= vocab.maxBodyLen) return;
			for (const b of singles) grow([...prefix, b]);
		};
		grow([]);
		for (const body of bodies) {
			if (body.every((b) => b.kind === "act" && b.op === "WAIT")) continue;
			for (let times = 2; times <= vocab.maxRepeat; times++) {
				items.push({ kind: "repeat", times, body: body.map(cloneBlock), id: sid() });
				if (items.length > COMPLETE_ITEM_CAP) throw new SolverBudgetExceeded(items.length);
			}
		}
	}
	return items;
}

// A BOUNDED item set for discovery searches (findWin): single blocks plus
// REPEATs over short, high-value bodies. Not complete — it's only used to FIND
// a win, never to prove one absent — so a subset is fine and keeps large
// vocabularies tractable.
export function enumerateBounded(vocab: VocabSpec): Block[] {
	const singles = singleBlocks(vocab);
	const items: Block[] = [...singles];
	if (vocab.repeat) {
		const bodies: (ActBlock | IfBlock)[][] = [];
		for (const a of singles) bodies.push([a]); // length 1
		for (const a of singles) for (const b of singles) bodies.push([a, b]); // length 2
		for (const body of bodies) {
			if (body.every((b) => b.kind === "act" && b.op === "WAIT")) continue;
			for (let times = 2; times <= vocab.maxRepeat; times++) {
				items.push({ kind: "repeat", times, body: body.map(cloneBlock), id: sid() });
			}
		}
	}
	return items;
}

export interface SolveOptions {
	budget?: number; // max item simulations before declaring inconclusive
	// Routines available as CALL items — lets the search cover function play.
	routines?: RoutineTable;
}

export interface SolveResult {
	program: Program | null;
	explored: number;
}

// Shared DFS over a fixed item list, memoised on battle state: if a state was
// already reached with at least as many slots remaining, nothing new can be
// found from it. Battles are deterministic and finite, so this terminates.
function searchWin(
	items: Block[],
	config: BattleConfig,
	slots: number,
	routines: RoutineTable,
	budget: number
): SolveResult {
	// Damage-dealers first so winnable configs resolve fast.
	const rank = (b: Block): number => {
		if (b.kind === "act") return b.op === "ZAP" || b.op === "PIERCE" ? 0 : 2;
		if (b.kind === "repeat") return 1;
		return 2;
	};
	items.sort((a, b) => rank(a) - rank(b) || slotCost(a) - slotCost(b));
	const costs = items.map(slotCost);
	const best = new Map<string, number>();
	let explored = 0;

	const dfs = (state: BattleState, slotsLeft: number): Program | null => {
		const key = stateKey(state);
		const seen = best.get(key);
		if (seen !== undefined && seen >= slotsLeft) return null;
		best.set(key, slotsLeft);
		for (let i = 0; i < items.length; i++) {
			const cost = costs[i]!;
			if (cost > slotsLeft) continue;
			if (++explored > budget) throw new SolverBudgetExceeded(explored);
			const item = items[i]!;
			const step = executeItem(state, item, config, routines);
			if (step.status === "win") return [item];
			if (step.status !== "ongoing") continue;
			const rest = dfs(step.state, slotsLeft - cost);
			if (rest) return [item, ...rest];
		}
		return null;
	};
	const program = dfs(initialState(config), slots);
	return { program, explored };
}

// Discovery search: finds SOME winning program (or null) using a bounded item
// set. Used to confirm a gym is discoverable, never to prove one unwinnable.
export function findWin(
	config: BattleConfig,
	vocab: VocabSpec,
	slots: number,
	options: SolveOptions = {}
): SolveResult {
	const routines = options.routines ?? {};
	const items = enumerateBounded(vocab);
	for (const name of Object.keys(routines)) {
		items.push({ kind: "call", routine: name, id: sid() });
	}
	return searchWin(items, config, slots, routines, options.budget ?? 4_000_000);
}

// The most enemy HP any single bot action can remove on one turn, given the
// vocabulary. Sound over-estimate: assumes the best-case enemy move and the
// maximum power BOOST could bank. If this is <= 0, no program can ever reduce
// enemy HP, so the fight is unwinnable — a proof that needs no search.
function maxTurnDamage(config: BattleConfig, vocab: VocabSpec): number {
	const armor = config.enemyArmor ?? 0;
	const maxPwr = vocab.acts.includes("BOOST") ? PWR_CAP : 0;
	const canZap = vocab.acts.includes("ZAP");
	const canPierce = vocab.acts.includes("PIERCE");
	let best = 0;
	for (const move of config.pattern) {
		const shielded = move.kind === "shield";
		if (canZap && !shielded) best = Math.max(best, ZAP_BASE + maxPwr - armor);
		if (canPierce) best = Math.max(best, (shielded ? PIERCE_VS_SHIELD : PIERCE_BASE) - armor);
	}
	return best;
}

// Proves no winning program exists for the vocabulary within the slot limit,
// over the COMPLETE editor grammar. First a sound analytic short-circuit: if
// the vocabulary can never deal net damage, no program wins (this alone
// dispatches the armor-gated gym without touching its huge grammar). Otherwise
// an exhaustive search. Throws SolverBudgetExceeded if the grammar is too large
// to enumerate — an inconclusive proof is a failing test, never a silent pass.
export function proveNoWin(
	config: BattleConfig,
	vocab: VocabSpec,
	slots: number,
	options: SolveOptions = {}
): { proven: boolean; counterexample: Program | null; explored: number } {
	const routines = options.routines ?? {};
	if (maxTurnDamage(config, vocab) <= 0) {
		return { proven: true, counterexample: null, explored: 0 };
	}
	const items = enumerateComplete(vocab);
	for (const name of Object.keys(routines)) {
		items.push({ kind: "call", routine: name, id: sid() });
	}
	const result = searchWin(items, config, slots, routines, options.budget ?? 20_000_000);
	return {
		proven: result.program === null,
		counterexample: result.program,
		explored: result.explored
	};
}
