// The battle virtual machine. Pure and deterministic: no DOM, no audio, no
// randomness. The gym UI, the wild-puzzle generators and the fairness solver
// all execute programs through this single implementation, so gameplay,
// derived answers and solvability proofs can never drift apart.

export type BotOp = "ZAP" | "PIERCE" | "GUARD" | "WAIT" | "BOOST" | "MEND";

export type Cond = "SHIELDED" | "CHARGING" | "PWR3" | "LOWHP";

export type EnemyMove =
	| { kind: "atk"; n: number }
	| { kind: "charge" }
	| { kind: "strike" }
	| { kind: "shield" }
	| { kind: "wait" }
	| { kind: "leech"; n: number }
	| { kind: "heal"; n: number };

export interface ActBlock {
	kind: "act";
	op: BotOp;
	id: string;
}

export interface IfBlock {
	kind: "if";
	cond: Cond;
	then: BotOp;
	els?: BotOp;
	id: string;
}

export interface RepeatBlock {
	kind: "repeat";
	times: number;
	body: (ActBlock | IfBlock)[];
	id: string;
}

export interface CallBlock {
	kind: "call";
	routine: string;
	id: string;
}

export type Block = ActBlock | IfBlock | RepeatBlock | CallBlock;
export type Program = Block[];

// Routines a CALL block can expand into (the player's Routine Dex).
export type RoutineTable = Record<string, (ActBlock | IfBlock)[]>;

export interface BattleConfig {
	botHp: number;
	enemyHp: number;
	pattern: EnemyMove[];
	turnCap?: number;
	// STRIKE deals strikeBase * (1 + charge). ATK n is flat.
	strikeBase?: number;
	// Flat damage reduction on every hit the enemy takes. An armored enemy
	// shrugs off unboosted zaps — the Cacheford lesson.
	enemyArmor?: number;
}

export interface BattleState {
	botHp: number;
	botHpMax: number;
	enemyHp: number;
	enemyHpMax: number;
	pwr: number;
	charge: number;
	turn: number;
	patternIndex: number;
}

export type Outcome = "WIN" | "LOSS" | "HALT" | "TIMEOUT";
// HALT: program finished with the enemy still standing.
// TIMEOUT: turn cap reached (only possible with degenerate loops).

export interface TurnEvent {
	turn: number;
	blockId: string;
	// The primitive the bot actually performed this turn (after conditions).
	op: BotOp;
	// True when an IF chose its else-branch (or skipped, op === WAIT via els).
	viaElse: boolean;
	enemyMove: EnemyMove;
	dmgToEnemy: number;
	dmgToBot: number;
	reflected: boolean;
	botHealed: number;
	enemyHealed: number;
	// State AFTER the turn resolved.
	botHp: number;
	enemyHp: number;
	pwr: number;
	charge: number;
}

export interface RunResult {
	outcome: Outcome;
	log: TurnEvent[];
	final: BattleState;
}

export const ZAP_BASE = 2;
export const PIERCE_BASE = 1;
export const PIERCE_VS_SHIELD = 3;
export const REFLECT_DMG = 2;
export const MEND_AMOUNT = 2;
export const PWR_CAP = 4;
export const DEFAULT_TURN_CAP = 24;
export const DEFAULT_STRIKE_BASE = 2;

export const LOWHP_FRACTION = 1 / 3;

export function condHolds(cond: Cond, state: BattleState, enemyMove: EnemyMove): boolean {
	switch (cond) {
		case "SHIELDED":
			return enemyMove.kind === "shield";
		case "CHARGING":
			return enemyMove.kind === "charge";
		case "PWR3":
			return state.pwr >= 3;
		case "LOWHP":
			return state.botHp <= Math.ceil(state.botHpMax * LOWHP_FRACTION);
	}
}

// Flattens a program into per-turn primitives lazily. A false IF with no else
// consumes no turn: execution slides to the next block within the same turn.
interface Frame {
	blocks: (ActBlock | IfBlock | RepeatBlock | CallBlock)[];
	index: number;
	remainingIterations: number; // for repeat frames; 0 for the root
}

export class ProgramCursor {
	private stack: Frame[];
	private routines: RoutineTable;

	constructor(program: Program, routines: RoutineTable = {}) {
		this.stack = [{ blocks: program, index: 0, remainingIterations: 0 }];
		this.routines = routines;
	}

	// Returns the turn's primitive, or null when the program has ended.
	next(state: BattleState, enemyMove: EnemyMove): { op: BotOp; blockId: string; viaElse: boolean } | null {
		let guard = 0;
		while (guard++ < 10000) {
			const frame = this.stack[this.stack.length - 1];
			if (!frame) return null;
			if (frame.index >= frame.blocks.length) {
				if (frame.remainingIterations > 1) {
					frame.remainingIterations--;
					frame.index = 0;
					continue;
				}
				this.stack.pop();
				continue;
			}
			const block = frame.blocks[frame.index];
			if (!block) return null;
			if (block.kind === "act") {
				frame.index++;
				return { op: block.op, blockId: block.id, viaElse: false };
			}
			if (block.kind === "if") {
				frame.index++;
				if (condHolds(block.cond, state, enemyMove)) {
					return { op: block.then, blockId: block.id, viaElse: false };
				}
				if (block.els !== undefined) {
					return { op: block.els, blockId: block.id, viaElse: true };
				}
				continue; // condition false, no else: costs no turn
			}
			if (block.kind === "repeat") {
				frame.index++;
				if (block.times > 0 && block.body.length > 0) {
					this.stack.push({ blocks: block.body, index: 0, remainingIterations: block.times });
				}
				continue;
			}
			// call
			frame.index++;
			const body = this.routines[block.routine];
			if (body && body.length > 0) {
				// Re-tag expanded blocks with the CALL's id so the program
				// counter highlights the CALL block during playback.
				const tagged = body.map((b) => ({ ...b, id: block.id }));
				this.stack.push({ blocks: tagged, index: 0, remainingIterations: 1 });
			}
			continue;
		}
		return null;
	}
}

export function initialState(config: BattleConfig): BattleState {
	return {
		botHp: config.botHp,
		botHpMax: config.botHp,
		enemyHp: config.enemyHp,
		enemyHpMax: config.enemyHp,
		pwr: 0,
		charge: 0,
		turn: 0,
		patternIndex: 0
	};
}

// Resolves one full turn. Mutates state, returns the event.
// Order: bot acts first (and can defeat the enemy before its move lands).
export function stepTurn(
	state: BattleState,
	config: BattleConfig,
	move: { op: BotOp; blockId: string; viaElse: boolean },
	enemyMove: EnemyMove
): TurnEvent {
	let dmgToEnemy = 0;
	let dmgToBot = 0;
	let reflected = false;
	let botHealed = 0;
	let enemyHealed = 0;
	let guarding = false;

	const shielded = enemyMove.kind === "shield";

	switch (move.op) {
		case "ZAP":
			if (shielded) {
				dmgToBot += REFLECT_DMG;
				reflected = true;
			} else {
				dmgToEnemy += ZAP_BASE + state.pwr;
			}
			state.pwr = 0;
			break;
		case "PIERCE":
			dmgToEnemy += shielded ? PIERCE_VS_SHIELD : PIERCE_BASE;
			break;
		case "GUARD":
			guarding = true;
			break;
		case "WAIT":
			break;
		case "BOOST":
			state.pwr = Math.min(PWR_CAP, state.pwr + 1);
			break;
		case "MEND": {
			const healed = Math.min(MEND_AMOUNT, state.botHpMax - state.botHp);
			state.botHp += healed;
			botHealed = healed;
			break;
		}
	}

	if (dmgToEnemy > 0 && config.enemyArmor) {
		dmgToEnemy = Math.max(0, dmgToEnemy - config.enemyArmor);
	}
	state.enemyHp = Math.max(0, state.enemyHp - dmgToEnemy);
	const enemyAlive = state.enemyHp > 0;

	if (enemyAlive) {
		const strikeBase = config.strikeBase ?? DEFAULT_STRIKE_BASE;
		switch (enemyMove.kind) {
			case "atk":
				if (!guarding) dmgToBot += enemyMove.n;
				break;
			case "charge":
				state.charge += 1;
				break;
			case "strike": {
				const dmg = strikeBase * (1 + state.charge);
				if (!guarding) dmgToBot += dmg;
				state.charge = 0;
				break;
			}
			case "shield":
			case "wait":
				break;
			case "leech": {
				const dealt = guarding ? 0 : enemyMove.n;
				dmgToBot += dealt;
				const healed = Math.min(dealt, state.enemyHpMax - state.enemyHp);
				state.enemyHp += healed;
				enemyHealed = healed;
				break;
			}
			case "heal": {
				const healed = Math.min(enemyMove.n, state.enemyHpMax - state.enemyHp);
				state.enemyHp += healed;
				enemyHealed = healed;
				break;
			}
		}
	}

	state.botHp = Math.max(0, state.botHp - dmgToBot);
	state.turn++;
	state.patternIndex = (state.patternIndex + 1) % config.pattern.length;

	return {
		turn: state.turn,
		blockId: move.blockId,
		op: move.op,
		viaElse: move.viaElse,
		enemyMove,
		dmgToEnemy,
		dmgToBot,
		reflected,
		botHealed,
		enemyHealed,
		botHp: state.botHp,
		enemyHp: state.enemyHp,
		pwr: state.pwr,
		charge: state.charge
	};
}

export function runProgram(
	program: Program,
	config: BattleConfig,
	routines: RoutineTable = {}
): RunResult {
	const state = initialState(config);
	const cursor = new ProgramCursor(program, routines);
	const log: TurnEvent[] = [];
	const turnCap = config.turnCap ?? DEFAULT_TURN_CAP;

	while (state.turn < turnCap) {
		const enemyMove = config.pattern[state.patternIndex % config.pattern.length]!;
		const move = cursor.next(state, enemyMove);
		if (move === null) {
			return { outcome: "HALT", log, final: state };
		}
		log.push(stepTurn(state, config, move, enemyMove));
		if (state.enemyHp <= 0) return { outcome: "WIN", log, final: state };
		if (state.botHp <= 0) return { outcome: "LOSS", log, final: state };
	}
	return { outcome: "TIMEOUT", log, final: state };
}

// Memory-slot accounting: actions and IFs cost 1; a REPEAT costs 1 plus its
// body; a CALL costs 1 regardless of the routine's length (that is the point).
export function slotCost(block: Block): number {
	switch (block.kind) {
		case "act":
		case "if":
		case "call":
			return 1;
		case "repeat":
			return 1 + block.body.reduce((sum, b) => sum + slotCost(b), 0);
	}
}

export function programCost(program: Program): number {
	return program.reduce((sum, b) => sum + slotCost(b), 0);
}

let blockIdCounter = 0;

export function freshId(): string {
	return "b" + (++blockIdCounter).toString(36);
}

export function act(op: BotOp): ActBlock {
	return { kind: "act", op, id: freshId() };
}

export function iff(cond: Cond, then: BotOp, els?: BotOp): IfBlock {
	return { kind: "if", cond, then, els, id: freshId() };
}

export function rep(times: number, body: (ActBlock | IfBlock)[]): RepeatBlock {
	return { kind: "repeat", times, body, id: freshId() };
}

export function call(routine: string): CallBlock {
	return { kind: "call", routine, id: freshId() };
}

export function describeEnemyMove(move: EnemyMove): string {
	switch (move.kind) {
		case "atk":
			return "ATK " + move.n;
		case "charge":
			return "CHG";
		case "strike":
			return "STRK";
		case "shield":
			return "SHLD";
		case "wait":
			return "WAIT";
		case "leech":
			return "LEECH";
		case "heal":
			return "HEAL";
	}
}

export function describeBlock(block: Block): string {
	switch (block.kind) {
		case "act":
			return block.op;
		case "if":
			return "IF " + condLabel(block.cond) + ": " + block.then + (block.els ? " ELSE " + block.els : "");
		case "repeat":
			return "REPEAT x" + block.times + ": [" + block.body.map(describeBlock).join(", ") + "]";
		case "call":
			return "DO " + block.routine;
	}
}

export function condLabel(cond: Cond): string {
	switch (cond) {
		case "SHIELDED":
			return "SHIELD UP";
		case "CHARGING":
			return "CHARGING";
		case "PWR3":
			return "PWR ≥ 3";
		case "LOWHP":
			return "MY HP LOW";
	}
}
