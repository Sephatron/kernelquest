// Game Boy touch layout: D-pad on the left, B/A on the right, START below.
// Buttons feed the same Input store the keyboard uses. Shown on coarse
// pointers; harmless elsewhere.

import type { GameAction, Input } from "../core/input";
import { el } from "./dom";

export function mountTouch(input: Input): void {
	const host = document.getElementById("touch");
	if (!host) return;

	const coarse = window.matchMedia("(pointer: coarse)").matches;
	if (coarse) document.body.classList.add("touch-enabled");

	const dpad = el("div", "dpad", host);
	const buttons = el("div", "buttons", host);
	const ab = el("div", "ab", buttons);

	const bind = (node: HTMLElement, action: GameAction): void => {
		const press = (ev: PointerEvent): void => {
			ev.preventDefault();
			node.classList.add("down");
			input.press(action);
		};
		const release = (ev: PointerEvent): void => {
			ev.preventDefault();
			node.classList.remove("down");
			input.release(action);
		};
		node.addEventListener("pointerdown", press);
		node.addEventListener("pointerup", release);
		node.addEventListener("pointerleave", release);
		node.addEventListener("pointercancel", release);
		node.addEventListener("contextmenu", (ev) => ev.preventDefault());
	};

	bind(el("button", "d-up", dpad, "▲"), "up");
	bind(el("button", "d-down", dpad, "▼"), "down");
	bind(el("button", "d-left", dpad, "◀"), "left");
	bind(el("button", "d-right", dpad, "▶"), "right");
	bind(el("button", "t-b", ab, "B"), "b");
	bind(el("button", "t-a ", ab, "A"), "a");
	bind(el("button", "t-start", buttons, "START"), "start");
}
