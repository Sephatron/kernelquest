// Puzzle generator invariants, swept across many seeds and every zone.
// These are the guarantees that make wild battles trustworthy: exactly one
// right answer, distinct options, unambiguous bug lines, solvable orderings.

import { describe, expect, it } from "vitest";
import { generatePuzzle } from "../src/battle/puzzles";
import { runValue, type ValueOp } from "../src/battle/minivm";

// Mirror of the linear step used by the spotbug generator.
function applyLinear(op: ValueOp, prev: number): number {
	if (op.kind === "set") return op.n;
	if (op.kind === "add") return prev + op.n;
	if (op.kind === "sub") return prev - op.n;
	if (op.kind === "double") return prev * 2;
	return prev;
}

const SEEDS_PER_ZONE = 400;

function permutations<T>(arr: T[]): T[][] {
	if (arr.length <= 1) return [arr];
	const out: T[][] = [];
	arr.forEach((item, i) => {
		const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
		for (const p of permutations(rest)) out.push([item, ...p]);
	});
	return out;
}

describe("puzzle generator invariants", () => {
	for (let zone = 1; zone <= 8; zone++) {
		it("zone " + zone + " puzzles are sound across " + SEEDS_PER_ZONE + " seeds", () => {
			for (let seed = 0; seed < SEEDS_PER_ZONE; seed++) {
				const puzzle = generatePuzzle(zone, seed * 13 + zone);
				if (puzzle.kind === "mcq" || puzzle.kind === "grid") {
					const correct = puzzle.options.filter((o) => o.correct);
					expect(correct.length, "one correct option (zone " + zone + " seed " + seed + ")").toBe(1);
					const labels = new Set(puzzle.options.map((o) => o.label));
					expect(labels.size, "distinct options (zone " + zone + " seed " + seed + ")").toBe(
						puzzle.options.length
					);
					expect(puzzle.options.length).toBeGreaterThanOrEqual(3);
					for (const o of puzzle.options) {
						if (!o.correct) expect(o.explain.length, "wrong options explain themselves").toBeGreaterThan(0);
					}
				}
				if (puzzle.kind === "order") {
					// At least one permutation reaches the goal; the presented
					// order does not (no pre-solved puzzles).
					const presented = runValue(puzzle.ops)[puzzle.variable] ?? 0;
					expect(presented, "not pre-solved (zone " + zone + " seed " + seed + ")").not.toBe(puzzle.goal);
					const solvable = permutations(puzzle.ops).some(
						(p) => (runValue(p)[puzzle.variable] ?? 0) === puzzle.goal
					);
					expect(solvable, "some order reaches the goal").toBe(true);
				}
				if (puzzle.kind === "spotbug") {
					// Exactly one line must fail the "claim == op(previous claim)"
					// check, and it must be the declared buggyLine — the whole
					// point of the trace puzzle is a single unambiguous answer.
					const claims = puzzle.lines.map((l) => l.claim);
					const broken: number[] = [];
					for (let i = 0; i < puzzle.ops.length; i++) {
						const prev = i === 0 ? 0 : claims[i - 1]!;
						if (claims[i] !== applyLinear(puzzle.ops[i]!, prev)) broken.push(i);
					}
					expect(broken, "zone " + zone + " seed " + seed + " unique bug line").toEqual([puzzle.buggyLine]);
				}
			}
		});
	}

	it("spotbug puzzles actually generate (no silent fallback to MCQ)", () => {
		// Zone 7's pool is spotbug-heavy; every spotbug slot must yield a real
		// spotbug, not fall through to another type.
		let spotbugs = 0;
		for (let seed = 0; seed < 500; seed++) {
			const p = generatePuzzle(7, seed * 13 + 7);
			if (p.kind === "spotbug") spotbugs++;
		}
		expect(spotbugs, "zone 7 must produce spotbug puzzles").toBeGreaterThan(50);
	});
});
