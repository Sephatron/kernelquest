// Wild-encounter puzzle generator. Every puzzle is built from a real program
// run through the mini-VMs: the correct answer is computed, never typed, and
// wrong options come from running the same program under a named
// misconception — which is also what makes the explanations diagnostic.

import {
	describeGridProgram,
	describeValueProgram,
	irange,
	pick,
	rng,
	runGrid,
	runValue,
	shuffled,
	type Dir,
	type GridOp,
	type GridMisconception,
	type Misconception,
	type ValueOp
} from "./minivm";

export interface PuzzleOption {
	label: string;
	correct: boolean;
	explain: string;
}

export interface GridSpec {
	size: number;
	startX: number;
	startY: number;
	startDir: Dir;
	marks: { x: number; y: number; label: string }[];
}

export type Puzzle =
	| {
			kind: "mcq";
			prompt: string;
			code: string[];
			options: PuzzleOption[];
			explainCorrect: string;
	  }
	| {
			kind: "grid";
			prompt: string;
			code: string[];
			grid: GridSpec;
			options: PuzzleOption[];
			explainCorrect: string;
	  }
	| {
			kind: "order";
			prompt: string;
			steps: string[]; // shuffled labels, indices into ops
			ops: ValueOp[]; // shuffled ops, same order as steps
			variable: string;
			goal: number;
			explainCorrect: string;
	  }
	| {
			kind: "spotbug";
			prompt: string;
			// Each line: the operation, and the running value the program CLAIMS
			// it produces. Exactly one claim is wrong; the error is propagated
			// downstream (as a real bug would be), so only the buggy line fails
			// the "op applied to the previous claim" check — making it unique.
			lines: { text: string; claim: number }[];
			ops: ValueOp[]; // parallel to lines; lets tests re-derive correctness
			buggyLine: number;
			variable: string;
			explainCorrect: string;
	  };

const MISCONCEPTION_EXPLAIN: Record<Misconception, string> = {
	none: "",
	concat: "That glues the digits together. ADD is arithmetic, not sticking numbers side by side.",
	"loop-once": "That's the loop running once. REPEAT ×N runs its body all N times.",
	"loop-off-by-one": "Off by one! Count the repeats carefully — the loop runs exactly N times.",
	"skip-if": "The condition was TRUE, so the IF's step does happen.",
	"always-if": "The condition was FALSE, so the IF's step is skipped.",
	"ignore-set": "A variable can be overwritten. The later SET wins."
};

function mcqFromValue(
	ops: ValueOp[],
	variable: string,
	prompt: string,
	candidates: Misconception[],
	seed: number
): Puzzle | null {
	const truth = runValue(ops)[variable] ?? 0;
	const r = rng(seed * 31 + 7);
	const options: PuzzleOption[] = [
		{ label: String(truth), correct: true, explain: "" }
	];
	const used = new Set<number>([truth]);
	for (const mode of shuffled(r, candidates)) {
		if (options.length >= 3) break;
		const wrong = runValue(ops, mode)[variable] ?? 0;
		if (used.has(wrong)) continue;
		used.add(wrong);
		options.push({ label: String(wrong), correct: false, explain: MISCONCEPTION_EXPLAIN[mode] });
	}
	// Numeric jitter fallback so we always have three distinct options.
	let jitter = 1;
	while (options.length < 3 && jitter < 10) {
		const wrong = truth + (jitter % 2 === 0 ? jitter : -jitter);
		if (!used.has(wrong)) {
			used.add(wrong);
			options.push({ label: String(wrong), correct: false, explain: "Walk it through step by step — the trail leads elsewhere." });
		}
		jitter++;
	}
	if (options.length < 3) return null;
	return {
		kind: "mcq",
		prompt,
		code: describeValueProgram(ops),
		options: shuffled(r, options),
		explainCorrect: "x tracked every step: final " + variable + " is " + truth + "."
	};
}

// ------------------------------------------------------------ generators

function genSetAdd(seed: number): Puzzle | null {
	const r = rng(seed);
	const a = irange(r, 2, 6);
	const b = irange(r, 2, 7);
	const ops: ValueOp[] = [
		{ kind: "set", v: "x", n: a },
		{ kind: "add", v: "x", n: b }
	];
	if (r() < 0.5) ops.push({ kind: "double", v: "x" });
	return mcqFromValue(ops, "x", "What is x when this finishes?", ["concat", "ignore-set"], seed);
}

function genResetTrap(seed: number): Puzzle | null {
	const r = rng(seed);
	const a = irange(r, 3, 8);
	const b = irange(r, 2, 5);
	const c = irange(r, 2, 6);
	const ops: ValueOp[] = [
		{ kind: "set", v: "x", n: a },
		{ kind: "add", v: "x", n: b },
		{ kind: "set", v: "x", n: c },
		{ kind: "add", v: "x", n: b }
	];
	return mcqFromValue(ops, "x", "Careful — what is x at the end?", ["ignore-set", "concat"], seed);
}

function genLoop(seed: number, hard: boolean): Puzzle | null {
	const r = rng(seed);
	const start = irange(r, 0, 4);
	const times = irange(r, 3, hard ? 6 : 4);
	const step = irange(r, 2, 5);
	const body: ValueOp[] = [{ kind: "add", v: "x", n: step }];
	if (hard && r() < 0.5) body.push({ kind: "add", v: "x", n: 1 });
	const ops: ValueOp[] = [
		{ kind: "set", v: "x", n: start },
		{ kind: "vrepeat", times, body }
	];
	return mcqFromValue(ops, "x", "The loop runs. What is x afterwards?", ["loop-once", "loop-off-by-one"], seed);
}

function genDoubleLoop(seed: number): Puzzle | null {
	const r = rng(seed);
	const times = irange(r, 2, 4);
	const ops: ValueOp[] = [
		{ kind: "set", v: "x", n: irange(r, 1, 3) },
		{ kind: "vrepeat", times, body: [{ kind: "double", v: "x" }] }
	];
	return mcqFromValue(ops, "x", "Doubling in a loop. What is x at the end?", ["loop-once", "loop-off-by-one"], seed);
}

function genIf(seed: number, hard: boolean): Puzzle | null {
	const r = rng(seed);
	const start = irange(r, 2, 9);
	const threshold = irange(r, 3, 8);
	const bonus = irange(r, 5, 20);
	const cmp = pick(r, [">", "<"] as const);
	const ops: ValueOp[] = [
		{ kind: "set", v: "x", n: start },
		{ kind: "vif", v: "x", cmp, n: threshold, then: { kind: "add", v: "x", n: bonus } }
	];
	if (hard) {
		ops.push({
			kind: "vif",
			v: "x",
			cmp: cmp === ">" ? "<" : ">",
			n: threshold,
			then: { kind: "add", v: "x", n: 1 }
		});
	}
	return mcqFromValue(ops, "x", "Which branch fires? What is x at the end?", ["skip-if", "always-if"], seed);
}

function genTwoVars(seed: number): Puzzle | null {
	const r = rng(seed);
	const ops: ValueOp[] = [
		{ kind: "set", v: "x", n: irange(r, 2, 5) },
		{ kind: "set", v: "y", n: irange(r, 1, 4) },
		{ kind: "add", v: "x", n: irange(r, 2, 4) },
		{ kind: "copy", to: "y", from: "x" },
		{ kind: "add", v: "x", n: irange(r, 1, 5) }
	];
	return mcqFromValue(ops, "y", "Two variables now. What is y at the end?", ["ignore-set"], seed);
}

function genGrid(seed: number, withLoop: boolean): Puzzle {
	const r = rng(seed);
	const size = 5;
	const startX = irange(r, 1, 3);
	const startY = irange(r, 1, 3);
	const startDir = irange(r, 0, 3) as Dir;
	let ops: GridOp[];
	if (withLoop) {
		const times = irange(r, 2, 3);
		const body: GridOp[] = [{ kind: "step" }, pick(r, [{ kind: "left" }, { kind: "right" }] as GridOp[])];
		ops = [{ kind: "grepeat", times, body }, { kind: "step" }];
	} else {
		ops = [];
		const count = irange(r, 3, 4); // keep listings short enough for the screen
		for (let i = 0; i < count; i++) {
			ops.push(pick(r, [{ kind: "step" }, { kind: "step" }, { kind: "left" }, { kind: "right" }] as GridOp[]));
		}
		ops.push({ kind: "step" });
	}
	const truth = runGrid(ops, size, startX, startY, startDir);
	const marks: { x: number; y: number; label: string }[] = [];
	const options: PuzzleOption[] = [];
	const labels = ["A", "B", "C"];
	const spots = new Set<string>([truth.x + "," + truth.y]);
	const wrongModes: GridMisconception[] = withLoop ? ["loop-once", "ignore-turns"] : ["ignore-turns", "swap-turns"];
	const candidates: { x: number; y: number; explain: string }[] = [];
	for (const mode of wrongModes) {
		const alt = runGrid(ops, size, startX, startY, startDir, mode);
		if (!spots.has(alt.x + "," + alt.y)) {
			spots.add(alt.x + "," + alt.y);
			candidates.push({
				x: alt.x,
				y: alt.y,
				explain:
					mode === "loop-once"
						? "That's the loop running once. It repeats."
						: mode === "ignore-turns"
							? "The turns matter — the bot changes direction before stepping."
							: "Left and right got swapped somewhere on the way."
			});
		}
	}
	let attempts = 0;
	while (candidates.length < 2 && attempts++ < 20) {
		const wx = irange(r, 0, size - 1);
		const wy = irange(r, 0, size - 1);
		if (!spots.has(wx + "," + wy)) {
			spots.add(wx + "," + wy);
			candidates.push({ x: wx, y: wy, explain: "Trace it cell by cell — the bot ends elsewhere." });
		}
	}
	const all = shuffled(r, [
		{ x: truth.x, y: truth.y, explain: "", correct: true },
		...candidates.slice(0, 2).map((c) => ({ ...c, correct: false }))
	]);
	all.forEach((spot, i) => {
		marks.push({ x: spot.x, y: spot.y, label: labels[i]! });
		options.push({ label: labels[i]!, correct: spot.correct === true, explain: spot.explain });
	});
	return {
		kind: "grid",
		prompt: "Where does the bot end up?",
		code: describeGridProgram(ops),
		grid: { size, startX, startY, startDir, marks },
		options,
		explainCorrect: "Step it through: the bot lands on the marked cell."
	};
}

function genOrder(seed: number, zone: number): Puzzle {
	const r = rng(seed);
	const a = irange(r, 2, 4);
	const b = irange(r, 2, 5);
	const ops: ValueOp[] = [
		{ kind: "set", v: "x", n: a },
		{ kind: "add", v: "x", n: b },
		{ kind: "double", v: "x" }
	];
	if (zone >= 4) ops.push({ kind: "sub", v: "x", n: irange(r, 1, 3) });
	const goal = runValue(ops)["x"] ?? 0;
	const indices = shuffled(r, ops.map((_, i) => i));
	const shuffledOps = indices.map((i) => ops[i]!);
	// Guard: if the shuffled order happens to also reach the goal, reshuffle
	// determinis­tically by rotating once (the check accepts any valid order,
	// but starting pre-solved is boring).
	const initial = runValue(shuffledOps)["x"] ?? 0;
	const finalOps = initial === goal ? [...shuffledOps.slice(1), shuffledOps[0]!] : shuffledOps;
	return {
		kind: "order",
		prompt: "Arrange the steps so x ends at " + goal + ".",
		steps: finalOps.map((op) => describeValueProgram([op]).join(" ")),
		ops: finalOps,
		variable: "x",
		goal,
		explainCorrect: "Order matters: same steps, different order, different x."
	};
}

// Applies one linear op to a running value. Spotbug programs are deliberately
// linear (no loops/ifs) so "the running value after each line" is well-defined
// and a single wrong line is unambiguous.
function applyLinear(op: ValueOp, prev: number): number {
	switch (op.kind) {
		case "set":
			return op.n;
		case "add":
			return prev + op.n;
		case "sub":
			return prev - op.n;
		case "double":
			return prev * 2;
		default:
			return prev; // spotbug never builds copy/vrepeat/vif ops
	}
}

// Trace-debugging puzzle: a linear program is shown with the running value it
// CLAIMS after each line. Exactly one line's claim is wrong, and the error is
// propagated downstream — so only that line fails "claim == op(previous
// claim)", making it the unique answer. Always constructible: no retry loop.
function genSpotbug(seed: number, zone: number): Puzzle {
	const r = rng(seed);
	const len = zone >= 5 ? 4 : 3;
	const ops: ValueOp[] = [{ kind: "set", v: "x", n: irange(r, 2, 6) }];
	for (let i = 1; i < len; i++) {
		const choice = irange(r, 0, zone >= 3 ? 2 : 1);
		if (choice === 0) ops.push({ kind: "add", v: "x", n: irange(r, 2, 6) });
		else if (choice === 1) ops.push({ kind: "double", v: "x" });
		else ops.push({ kind: "sub", v: "x", n: irange(r, 1, 4) });
	}

	// True running values.
	const truth: number[] = [];
	for (let i = 0; i < ops.length; i++) {
		truth.push(applyLinear(ops[i]!, i === 0 ? 0 : truth[i - 1]!));
	}

	// Corrupt one operation line (not the initial SET — the bug is in the
	// working, not the starting value), then propagate the error forward.
	const buggyLine = irange(r, 1, ops.length - 1);
	const delta = pick(r, [-3, -2, -1, 1, 2, 3] as const);
	const claims: number[] = [];
	for (let i = 0; i < ops.length; i++) {
		const prevClaim = i === 0 ? 0 : claims[i - 1]!;
		const honest = applyLinear(ops[i]!, prevClaim);
		claims.push(i === buggyLine ? honest + delta : honest);
	}

	const lines = ops.map((op, i) => ({
		text: describeValueProgram([op]).join(" "),
		claim: claims[i]!
	}));

	return {
		kind: "spotbug",
		prompt: "The running value on one line is wrong. Tap the line where the maths first breaks.",
		lines,
		ops,
		buggyLine,
		variable: "x",
		explainCorrect: "From that line on, every value inherited the mistake — that's how one bug spreads."
	};
}

// ------------------------------------------------------------- dispatcher

export type PuzzleKind = "setadd" | "resettrap" | "loop" | "doubleloop" | "if" | "twovars" | "grid" | "gridloop" | "order" | "spotbug";

export const ZONE_PUZZLES: Record<number, PuzzleKind[]> = {
	1: ["setadd", "order", "grid", "setadd", "order"],
	2: ["loop", "doubleloop", "gridloop", "loop", "order"],
	3: ["if", "loop", "if", "spotbug", "gridloop"],
	4: ["twovars", "resettrap", "if", "loop", "spotbug"],
	5: ["twovars", "loop", "if", "order", "spotbug"],
	6: ["doubleloop", "twovars", "spotbug", "if", "gridloop"],
	7: ["spotbug", "spotbug", "twovars", "if", "loop"],
	8: ["doubleloop", "loop", "twovars", "spotbug", "if"]
};

export function generatePuzzle(zone: number, seed: number): Puzzle {
	const kinds = ZONE_PUZZLES[Math.max(1, Math.min(8, zone))]!;
	const kind = kinds[Math.abs(seed) % kinds.length]!;
	const hard = zone >= 5;
	let puzzle: Puzzle | null = null;
	let attempt = 0;
	while (!puzzle && attempt < 8) {
		const s = seed + attempt * 7919;
		switch (kind) {
			case "setadd":
				puzzle = genSetAdd(s);
				break;
			case "resettrap":
				puzzle = genResetTrap(s);
				break;
			case "loop":
				puzzle = genLoop(s, hard);
				break;
			case "doubleloop":
				puzzle = genDoubleLoop(s);
				break;
			case "if":
				puzzle = genIf(s, hard);
				break;
			case "twovars":
				puzzle = genTwoVars(s);
				break;
			case "grid":
				puzzle = genGrid(s, false);
				break;
			case "gridloop":
				puzzle = genGrid(s, true);
				break;
			case "order":
				puzzle = genOrder(s, zone);
				break;
			case "spotbug":
				puzzle = genSpotbug(s, zone);
				break;
		}
		attempt++;
	}
	return puzzle ?? genSetAdd(seed + 12345)!;
}
