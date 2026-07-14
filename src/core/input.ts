// Unified input: keyboard and the touch overlay both feed the same action
// store, and gameplay code polls it once per fixed update. Direction
// resolution is Pokemon-authentic: the most recently pressed held direction
// wins, so rolling from up to right mid-walk feels instant.

export type GameAction = "up" | "down" | "left" | "right" | "a" | "b" | "start";

export const DIRECTIONS = ["up", "down", "left", "right"] as const;
export type Direction = (typeof DIRECTIONS)[number];

const KEYMAP: Record<string, GameAction> = {
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	KeyW: "up",
	KeyS: "down",
	KeyA: "left",
	KeyD: "right",
	KeyZ: "a",
	Space: "a",
	KeyX: "b",
	Escape: "b",
	Enter: "start"
};

export class Input {
	private heldSet = new Set<GameAction>();
	private pressedSet = new Set<GameAction>();
	private dirStack: Direction[] = [];

	attach(target: Window): void {
		target.addEventListener("keydown", (ev) => {
			if (ev.repeat) return;
			if (isTextEntry(ev.target)) return;
			const action = KEYMAP[ev.code];
			if (!action) return;
			ev.preventDefault();
			this.press(action);
		});
		target.addEventListener("keyup", (ev) => {
			if (isTextEntry(ev.target)) return;
			const action = KEYMAP[ev.code];
			if (!action) return;
			ev.preventDefault();
			this.release(action);
		});
		target.addEventListener("blur", () => this.releaseAll());
	}

	// Also called by the touch overlay.
	press(action: GameAction): void {
		if (this.heldSet.has(action)) return;
		this.heldSet.add(action);
		this.pressedSet.add(action);
		if (isDirection(action)) {
			this.dirStack = this.dirStack.filter((d) => d !== action);
			this.dirStack.push(action);
		}
	}

	release(action: GameAction): void {
		this.heldSet.delete(action);
		if (isDirection(action)) {
			this.dirStack = this.dirStack.filter((d) => d !== action);
		}
	}

	releaseAll(): void {
		this.heldSet.clear();
		this.dirStack = [];
	}

	held(action: GameAction): boolean {
		return this.heldSet.has(action);
	}

	// Edge-triggered; true for exactly one fixed update after the press.
	pressed(action: GameAction): boolean {
		return this.pressedSet.has(action);
	}

	anyPressed(): boolean {
		return this.pressedSet.size > 0;
	}

	// The direction the player is currently steering — latest held wins.
	activeDirection(): Direction | null {
		return this.dirStack[this.dirStack.length - 1] ?? null;
	}

	// Called once per fixed update, after all consumers have polled.
	endFrame(): void {
		this.pressedSet.clear();
	}
}

function isDirection(action: GameAction): action is Direction {
	return action === "up" || action === "down" || action === "left" || action === "right";
}

function isTextEntry(target: EventTarget | null): boolean {
	return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
