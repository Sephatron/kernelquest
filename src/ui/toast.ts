// Toast strip: brief notifications (items, unlocks, autosave) at the top.

import { el, ui } from "./dom";

export class Toasts {
	private host: HTMLElement;

	constructor() {
		this.host = el("div", "toasts", ui());
	}

	show(text: string, ms = 2200): void {
		const node = el("div", "toast gbbox", this.host, text);
		window.setTimeout(() => {
			node.classList.add("out");
			window.setTimeout(() => node.remove(), 300);
		}, ms);
		// Keep at most three on screen.
		while (this.host.children.length > 3) this.host.firstElementChild?.remove();
	}
}
