// Screen transitions: door fades and the battle intro (screen flashes, then
// tiles swirl to dark in spiral order — the Game Boy classic).

import { fx } from "./dom";
import { el } from "./dom";

const COLS = 10;
const ROWS = 9;

export class Transitions {
	private veil: HTMLElement;
	private grid: HTMLElement;
	private cells: HTMLElement[] = [];
	busy = false;

	constructor() {
		this.veil = el("div", "veil", fx());
		this.grid = el("div", "swirl-grid", fx());
		for (let i = 0; i < COLS * ROWS; i++) {
			this.cells.push(el("div", "swirl-cell", this.grid));
		}
	}

	// Fade to dark, run the callback (map switch), fade back in.
	fade(during: () => void, holdMs = 90, fadeMs = 160): Promise<void> {
		this.busy = true;
		return new Promise((resolve) => {
			this.veil.style.transitionDuration = fadeMs + "ms";
			this.veil.classList.add("dark");
			window.setTimeout(() => {
				during();
				window.setTimeout(() => {
					this.veil.classList.remove("dark");
					window.setTimeout(() => {
						this.busy = false;
						resolve();
					}, fadeMs);
				}, holdMs);
			}, fadeMs);
		});
	}

	// Battle intro: two inverse flashes, then a spiral wipe. Resolves when the
	// screen is fully dark; caller mounts the battle UI then calls clearSwirl.
	battleSwirl(): Promise<void> {
		this.busy = true;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		return new Promise((resolve) => {
			let flashes = reduced ? 0 : 4;
			const flashStep = (): void => {
				if (flashes-- > 0) {
					this.veil.classList.toggle("invert");
					window.setTimeout(flashStep, 90);
					return;
				}
				this.veil.classList.remove("invert");
				if (reduced) {
					this.veil.style.transitionDuration = "10ms";
					this.veil.classList.add("dark");
					window.setTimeout(() => {
						this.busy = false;
						resolve();
					}, 30);
					return;
				}
				const order = spiralOrder(COLS, ROWS);
				this.grid.style.display = "grid";
				order.forEach((cellIndex, i) => {
					window.setTimeout(() => {
						this.cells[cellIndex]?.classList.add("on");
					}, i * 9);
				});
				window.setTimeout(() => {
					this.veil.style.transitionDuration = "0ms";
					this.veil.classList.add("dark");
					this.grid.style.display = "none";
					this.cells.forEach((c) => c.classList.remove("on"));
					this.busy = false;
					resolve();
				}, order.length * 9 + 140);
			};
			flashStep();
		});
	}

	// Removes the dark veil (battle UI is mounted underneath it).
	reveal(fadeMs = 140): void {
		this.veil.style.transitionDuration = fadeMs + "ms";
		this.veil.classList.remove("dark");
	}

	darken(): void {
		this.veil.style.transitionDuration = "0ms";
		this.veil.classList.add("dark");
	}
}

function spiralOrder(cols: number, rows: number): number[] {
	const order: number[] = [];
	let top = 0;
	let bottom = rows - 1;
	let left = 0;
	let right = cols - 1;
	while (top <= bottom && left <= right) {
		for (let x = left; x <= right; x++) order.push(top * cols + x);
		top++;
		for (let y = top; y <= bottom; y++) order.push(y * cols + right);
		right--;
		if (top <= bottom) {
			for (let x = right; x >= left; x--) order.push(bottom * cols + x);
			bottom--;
		}
		if (left <= right) {
			for (let y = bottom; y >= top; y--) order.push(y * cols + left);
			left++;
		}
	}
	return order.reverse(); // dark spirals inward from the edges
}
