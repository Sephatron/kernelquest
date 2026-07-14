// Tiny deterministic VMs for wild-encounter puzzles. Every puzzle's correct
// answer is DERIVED by running these, never hand-typed; wrong options are
// derived by running the same program under an explicit misconception mode.

// ---------------------------------------------------------------- value VM

export type ValueOp =
	| { kind: "set"; v: string; n: number }
	| { kind: "add"; v: string; n: number }
	| { kind: "sub"; v: string; n: number }
	| { kind: "double"; v: string }
	| { kind: "copy"; to: string; from: string }
	| { kind: "vrepeat"; times: number; body: ValueOp[] }
	| { kind: "vif"; v: string; cmp: ">" | "<" | "="; n: number; then: ValueOp };

export type Misconception =
	| "none"
	| "concat" // ADD glues digits together: 2 add 3 -> 23
	| "loop-once" // REPEAT body runs a single time
	| "loop-off-by-one" // REPEAT runs times-1
	| "skip-if" // conditionals never fire
	| "always-if" // conditionals always fire
	| "ignore-set"; // a second SET is ignored (belief that variables can't change)

export function runValue(
	ops: ValueOp[],
	mode: Misconception = "none"
): Record<string, number> {
	const vars: Record<string, number> = {};
	const seenSet = new Set<string>();
	const exec = (list: ValueOp[]): void => {
		for (const op of list) {
			switch (op.kind) {
				case "set":
					if (mode === "ignore-set" && seenSet.has(op.v)) break;
					vars[op.v] = op.n;
					seenSet.add(op.v);
					break;
				case "add": {
					const cur = vars[op.v] ?? 0;
					if (mode === "concat") {
						vars[op.v] = Number(String(cur) + String(op.n));
					} else {
						vars[op.v] = cur + op.n;
					}
					break;
				}
				case "sub":
					vars[op.v] = (vars[op.v] ?? 0) - op.n;
					break;
				case "double":
					vars[op.v] = (vars[op.v] ?? 0) * 2;
					break;
				case "copy":
					vars[op.to] = vars[op.from] ?? 0;
					break;
				case "vrepeat": {
					let times = op.times;
					if (mode === "loop-once") times = 1;
					if (mode === "loop-off-by-one") times = Math.max(0, op.times - 1);
					for (let i = 0; i < times; i++) exec(op.body);
					break;
				}
				case "vif": {
					const val = vars[op.v] ?? 0;
					let fire =
						op.cmp === ">" ? val > op.n : op.cmp === "<" ? val < op.n : val === op.n;
					if (mode === "skip-if") fire = false;
					if (mode === "always-if") fire = true;
					if (fire) exec([op.then]);
					break;
				}
			}
		}
	};
	exec(ops);
	return vars;
}

export function describeValueOp(op: ValueOp, indent = 0): string[] {
	const pad = "  ".repeat(indent);
	switch (op.kind) {
		case "set":
			return [pad + "SET " + op.v + " TO " + op.n];
		case "add":
			return [pad + "ADD " + op.n + " TO " + op.v];
		case "sub":
			return [pad + "TAKE " + op.n + " FROM " + op.v];
		case "double":
			return [pad + "DOUBLE " + op.v];
		case "copy":
			return [pad + "SET " + op.to + " TO " + op.from];
		case "vrepeat":
			return [
				pad + "REPEAT x" + op.times + ":",
				...op.body.flatMap((b) => describeValueOp(b, indent + 1))
			];
		case "vif":
			return [
				pad + "IF " + op.v + " " + op.cmp + " " + op.n + ":",
				...describeValueOp(op.then, indent + 1)
			];
	}
}

export function describeValueProgram(ops: ValueOp[]): string[] {
	return ops.flatMap((op) => describeValueOp(op));
}

// ----------------------------------------------------------------- grid VM

export type GridOp =
	| { kind: "step" }
	| { kind: "left" }
	| { kind: "right" }
	| { kind: "grepeat"; times: number; body: GridOp[] };

export type Dir = 0 | 1 | 2 | 3; // up, right, down, left

export interface GridResult {
	x: number;
	y: number;
	dir: Dir;
	path: { x: number; y: number }[];
}

export type GridMisconception =
	| "none"
	| "loop-once"
	| "ignore-turns" // TURN does nothing
	| "swap-turns"; // left and right swapped

export function runGrid(
	ops: GridOp[],
	size: number,
	startX: number,
	startY: number,
	startDir: Dir,
	mode: GridMisconception = "none"
): GridResult {
	let x = startX;
	let y = startY;
	let dir: Dir = startDir;
	const path: { x: number; y: number }[] = [{ x, y }];
	const exec = (list: GridOp[]): void => {
		for (const op of list) {
			switch (op.kind) {
				case "step": {
					const dx = dir === 1 ? 1 : dir === 3 ? -1 : 0;
					const dy = dir === 2 ? 1 : dir === 0 ? -1 : 0;
					x = Math.max(0, Math.min(size - 1, x + dx));
					y = Math.max(0, Math.min(size - 1, y + dy));
					path.push({ x, y });
					break;
				}
				case "left":
					if (mode === "ignore-turns") break;
					dir = ((dir + (mode === "swap-turns" ? 1 : 3)) % 4) as Dir;
					break;
				case "right":
					if (mode === "ignore-turns") break;
					dir = ((dir + (mode === "swap-turns" ? 3 : 1)) % 4) as Dir;
					break;
				case "grepeat": {
					const times = mode === "loop-once" ? 1 : op.times;
					for (let i = 0; i < times; i++) exec(op.body);
					break;
				}
			}
		}
	};
	exec(ops);
	return { x, y, dir, path };
}

export function describeGridOp(op: GridOp, indent = 0): string[] {
	const pad = "  ".repeat(indent);
	switch (op.kind) {
		case "step":
			return [pad + "STEP"];
		case "left":
			return [pad + "TURN LEFT"];
		case "right":
			return [pad + "TURN RIGHT"];
		case "grepeat":
			return [
				pad + "REPEAT x" + op.times + ":",
				...op.body.flatMap((b) => describeGridOp(b, indent + 1))
			];
	}
}

export function describeGridProgram(ops: GridOp[]): string[] {
	return ops.flatMap((op) => describeGridOp(op));
}

// ------------------------------------------------------- seeded randomness

// mulberry32: tiny, fast, deterministic. Same seed, same puzzle, everywhere.
export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function pick<T>(r: () => number, arr: readonly T[]): T {
	return arr[Math.floor(r() * arr.length)]!;
}

export function irange(r: () => number, lo: number, hi: number): number {
	return lo + Math.floor(r() * (hi - lo + 1));
}

export function shuffled<T>(r: () => number, arr: readonly T[]): T[] {
	const out = [...arr];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
}
