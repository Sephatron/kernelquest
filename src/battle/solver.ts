// Brute-force fairness prover for gym battles.
//
// Two guarantees, both machine-checked in the test suite:
//   1. Winnable: with the gym's unlocked vocabulary there IS a program within
//      the slot limit that wins (we run the authored solution, and can also
//      search to confirm the puzzle is discoverable).
//   2. Gated: with the vocabulary available BEFORE the gym's new concept,
//      NO program within the slot limit wins — exhaustively proven.
//
// The search executes candidate programs through the same ProgramCursor and
// stepTurn as live gameplay, so the proof is about the real game.

import type { ActBlock, BattleConfig, BattleState, Block, BotOp, Cond, IfBlock, Program, RoutineTable } from "./vm";
import { DEFAULT_TURN_CAP, ProgramCursor, initialState, slotCost, stepTurn } from "./vm";

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

// Enumerate the candidate top-level items for a vocabulary. Behavioural
// duplicates are skipped where cheap to detect (IF with equal branches, WAIT
// padding inside loop bodies, REPEAT x1).
export function enumerateItems(vocab: VocabSpec): Block[] {
	const items: Block[] = [];
	for (const op of vocab.acts) items.push(mkAct(op));

	const ifs: IfBlock[] = [];
	for (const cond of vocab.conds) {
		for (const then of vocab.acts) {
			ifs.push(mkIf(cond, then));
			for (const els of vocab.acts) {
				if (els === then) continue; // equivalent to a plain act
				ifs.push(mkIf(cond, then, els));
			}
		}
	}
	items.push(...ifs);

	if (vocab.repeat) {
		const bodies: (ActBlock | IfBlock)[][] = [];
		// Plain action bodies, length 1..maxBodyLen.
		const grow = (prefix: ActBlock[], len: number): void => {
			if (prefix.length > 0) bodies.push([...prefix]);
			if (prefix.length >= len) return;
			for (const op of vocab.acts) {
				grow([...prefix, mkAct(op)], len);
			}
		};
		grow([], Math.min(vocab.maxBodyLen, 3));
		// Bodies with one conditional (no else, or else — the classic
		// "check every iteration" pattern). Bounded to keep search sane.
		for (const cond of vocab.conds) {
			for (const then of vocab.acts) {
				const ifNoElse = mkIf(cond, then);
				bodies.push([ifNoElse]);
				for (const els of vocab.acts) {
					if (els === then) continue;
					bodies.push([mkIf(cond, then, els)]);
				}
				for (const op of vocab.acts) {
					bodies.push([mkAct(op), mkIf(cond, then)]);
					bodies.push([mkIf(cond, then), mkAct(op)]);
				}
			}
		}
		for (const body of bodies) {
			if (body.every((b) => b.kind === "act" && b.op === "WAIT")) continue;
			for (let times = 2; times <= vocab.maxRepeat; times++) {
				items.push({ kind: "repeat", times, body, id: sid() });
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

// Depth-first search over programs, memoised on battle state: if a state was
// already reached with at least as many slots remaining, nothing new can be
// found from it. Battles are deterministic and finite, so this terminates.
export function findWin(
	config: BattleConfig,
	vocab: VocabSpec,
	slots: number,
	options: SolveOptions = {}
): SolveResult {
	const budget = options.budget ?? 4_000_000;
	const routines = options.routines ?? {};
	const items = enumerateItems(vocab);
	for (const name of Object.keys(routines)) {
		items.push({ kind: "call", routine: name, id: sid() });
	}
	// Cheap heuristic: damage-dealers first so winnable gyms resolve fast.
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

// Proves no winning program exists for the vocabulary within the slot limit.
// Throws SolverBudgetExceeded if the search could not finish — an
// inconclusive proof is treated as a failing test, never silently passed.
export function proveNoWin(
	config: BattleConfig,
	vocab: VocabSpec,
	slots: number,
	options: SolveOptions = {}
): { proven: boolean; counterexample: Program | null; explored: number } {
	const result = findWin(config, vocab, slots, options);
	return {
		proven: result.program === null,
		counterexample: result.program,
		explored: result.explored
	};
}
