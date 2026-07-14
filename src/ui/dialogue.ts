// The dialogue box: bottom-anchored, typewriter reveal, A to advance,
// B to fast-fill. Also provides the small ▶-cursor choice menu.

import type { Input } from "../core/input";
import type { AudioEngine } from "../core/audio";
import { el, ui } from "./dom";

const CHARS_PER_TICK = [3, 1.5, 0.75]; // by textSpeed option: fast, medium, slow

export class Dialogue {
	private box: HTMLElement;
	private textNode: HTMLElement;
	private arrow: HTMLElement;
	private pages: string[] = [];
	private page = 0;
	private shown = 0;
	private done: (() => void) | null = null;
	private audio: AudioEngine;
	private speed: () => number;
	active = false;

	// choice state
	private choiceBox: HTMLElement;
	private choiceItems: HTMLElement[] = [];
	private choiceIndex = 0;
	private choiceDone: ((index: number) => void) | null = null;
	choosing = false;

	constructor(audio: AudioEngine, speed: () => number) {
		this.audio = audio;
		this.speed = speed;
		this.box = el("div", "dialogue gbbox", ui());
		this.box.style.display = "none";
		this.textNode = el("div", "dialogue-text", this.box);
		this.arrow = el("div", "dialogue-arrow", this.box, "▼");
		this.choiceBox = el("div", "choice gbbox", ui());
		this.choiceBox.style.display = "none";
	}

	show(pages: string[], done?: () => void): void {
		this.pages = pages.filter((p) => p.length > 0);
		if (this.pages.length === 0) {
			done?.();
			return;
		}
		this.page = 0;
		this.shown = 0;
		this.done = done ?? null;
		this.active = true;
		this.box.style.display = "block";
		this.renderPage();
	}

	choice(options: string[], done: (index: number) => void, defaultIndex = 0): void {
		this.choosing = true;
		this.choiceDone = done;
		this.choiceIndex = defaultIndex;
		this.choiceBox.style.display = "block";
		this.choiceBox.replaceChildren();
		this.choiceItems = options.map((option, i) => {
			const item = el("div", "choice-item", this.choiceBox);
			el("span", "choice-cursor", item, "▶");
			el("span", "", item, option);
			item.addEventListener("click", () => {
				this.choiceIndex = i;
				this.pickChoice();
			});
			return item;
		});
		this.paintChoice();
	}

	private paintChoice(): void {
		this.choiceItems.forEach((item, i) => {
			item.classList.toggle("selected", i === this.choiceIndex);
		});
	}

	private pickChoice(): void {
		const done = this.choiceDone;
		this.choosing = false;
		this.choiceDone = null;
		this.choiceBox.style.display = "none";
		this.audio.sfx("confirm");
		done?.(this.choiceIndex);
	}

	private renderPage(): void {
		this.shown = 0;
		this.textNode.textContent = "";
		this.arrow.style.display = "none";
	}

	private currentPage(): string {
		return this.pages[this.page] ?? "";
	}

	get pageComplete(): boolean {
		return this.shown >= this.currentPage().length;
	}

	update(input: Input): void {
		if (this.choosing) {
			if (input.pressed("up")) {
				this.choiceIndex = (this.choiceIndex + this.choiceItems.length - 1) % this.choiceItems.length;
				this.audio.sfx("blip");
				this.paintChoice();
			}
			if (input.pressed("down")) {
				this.choiceIndex = (this.choiceIndex + 1) % this.choiceItems.length;
				this.audio.sfx("blip");
				this.paintChoice();
			}
			if (input.pressed("a") || input.pressed("start")) this.pickChoice();
			return;
		}
		if (!this.active) return;
		const page = this.currentPage();
		if (!this.pageComplete) {
			const rate = input.held("b") ? 6 : CHARS_PER_TICK[this.speed()] ?? 1.5;
			this.shown = Math.min(page.length, this.shown + rate);
			this.textNode.textContent = page.slice(0, Math.floor(this.shown));
			if (this.pageComplete) {
				this.textNode.textContent = page;
				this.arrow.style.display = "block";
			}
			if (input.pressed("a")) {
				this.shown = page.length;
				this.textNode.textContent = page;
				this.arrow.style.display = "block";
			}
			return;
		}
		if (input.pressed("a")) {
			this.audio.sfx("blip");
			if (this.page < this.pages.length - 1) {
				this.page++;
				this.renderPage();
			} else {
				this.close();
			}
		}
	}

	private close(): void {
		this.active = false;
		this.box.style.display = "none";
		const done = this.done;
		this.done = null;
		done?.();
	}
}
