// Modal prompts used by the intro: name entry and the starter-bot ritual.

import type { AudioEngine } from "../core/audio";
import type { Input } from "../core/input";
import type { GameState } from "../game/state";
import { spriteDataUrl } from "../core/sprites";
import { paletteById } from "../core/palette";
import { CREATURE_SPRITES } from "../content/art-creatures";
import { el, ui } from "./dom";

const PRESETS = ["ALEX", "SAM", "JO", "RAE", "KIT", "MEL"];

export class NameEntry {
	private panel: HTMLElement;
	private items: HTMLElement[] = [];
	private index = 0;
	private field: HTMLInputElement;
	private typing = false;

	constructor(
		private state: GameState,
		private audio: AudioEngine,
		private done: () => void
	) {
		this.panel = el("div", "panel gbbox pane-name", ui());
		el("div", "panel-title", this.panel, "YOUR NAME?");
		const list = el("div", "name-list", this.panel);
		for (const preset of [...PRESETS, "TYPE IT"]) {
			const item = el("div", "listmenu-item", list);
			el("span", "cursor", item, "▶");
			el("span", "label", item, preset);
			this.items.push(item);
		}
		this.field = el("input", "namefield", this.panel) as HTMLInputElement;
		this.field.maxLength = 8;
		this.field.placeholder = "TYPE, THEN ENTER";
		this.field.style.display = "none";
		this.field.addEventListener("keydown", (ev) => {
			ev.stopPropagation();
			if (ev.key === "Enter") this.commitTyped();
			if (ev.key === "Escape") this.stopTyping();
		});
		this.paint();
	}

	private paint(): void {
		this.items.forEach((item, i) => item.classList.toggle("selected", i === this.index));
	}

	private commitTyped(): void {
		const value = this.field.value.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 8);
		if (value.length === 0) return;
		this.state.player.name = value;
		this.finish();
	}

	private stopTyping(): void {
		this.typing = false;
		this.field.style.display = "none";
		this.field.blur();
	}

	private finish(): void {
		this.audio.sfx("confirm");
		this.panel.remove();
		this.done();
	}

	update(input: Input): void {
		if (this.typing) return; // the input field owns the keyboard
		if (input.pressed("up")) {
			this.index = (this.index + this.items.length - 1) % this.items.length;
			this.audio.sfx("blip");
			this.paint();
		}
		if (input.pressed("down")) {
			this.index = (this.index + 1) % this.items.length;
			this.audio.sfx("blip");
			this.paint();
		}
		if (input.pressed("a")) {
			if (this.index < PRESETS.length) {
				this.state.player.name = PRESETS[this.index]!;
				this.finish();
			} else {
				this.typing = true;
				this.field.style.display = "block";
				this.field.focus();
			}
		}
	}
}

const STARTERS = [
	{
		id: "spark",
		name: "SPARK",
		blurb: "Leads with enthusiasm and voltage."
	},
	{
		id: "guard",
		name: "GUARD",
		blurb: "Measure twice, zap once."
	},
	{
		id: "scout",
		name: "SCOUT",
		blurb: "Sees the pattern before it sees you."
	}
];

export class StarterChoice {
	private panel: HTMLElement;
	private cards: HTMLElement[] = [];
	private index = 0;
	private confirming = false;
	private confirmBox: HTMLElement | null = null;
	private confirmIndex = 0;

	constructor(
		private state: GameState,
		private audio: AudioEngine,
		private done: () => void
	) {
		this.panel = el("div", "panel gbbox pane-starter", ui());
		el("div", "panel-title", this.panel, "CHOOSE YOUR BOT");
		const row = el("div", "starter-row", this.panel);
		const palette = paletteById(state.options.paletteId);
		for (const starter of STARTERS) {
			const card = el("div", "starter-card", row);
			const img = el("img", "starter-img", card) as HTMLImageElement;
			img.src = spriteDataUrl(CREATURE_SPRITES["bot." + starter.id]!, palette, 3);
			img.alt = starter.name;
			el("div", "starter-name", card, starter.name);
			el("div", "starter-blurb", card, starter.blurb);
			this.cards.push(card);
		}
		el("div", "panel-hint", this.panel, "◀ ▶ choose · A confirm");
		this.paint();
	}

	private paint(): void {
		this.cards.forEach((card, i) => card.classList.toggle("selected", i === this.index));
	}

	update(input: Input): void {
		if (this.confirming) {
			if (input.pressed("left") || input.pressed("right") || input.pressed("up") || input.pressed("down")) {
				this.confirmIndex = 1 - this.confirmIndex;
				this.audio.sfx("blip");
				this.paintConfirm();
			}
			if (input.pressed("a")) {
				if (this.confirmIndex === 0) {
					const starter = STARTERS[this.index]!;
					this.state.player.chassis = starter.id;
					this.state.player.botName = starter.name;
					this.audio.sfx("levelup");
					this.panel.remove();
					this.done();
				} else {
					this.dismissConfirm();
				}
			}
			if (input.pressed("b")) this.dismissConfirm();
			return;
		}
		if (input.pressed("left")) {
			this.index = (this.index + STARTERS.length - 1) % STARTERS.length;
			this.audio.sfx("blip");
			this.paint();
		}
		if (input.pressed("right")) {
			this.index = (this.index + 1) % STARTERS.length;
			this.audio.sfx("blip");
			this.paint();
		}
		if (input.pressed("a")) {
			this.confirming = true;
			this.confirmIndex = 0;
			this.confirmBox = el("div", "confirm gbbox", this.panel);
			el("div", "", this.confirmBox, STARTERS[this.index]!.name + ", was it?");
			const opts = el("div", "confirm-opts", this.confirmBox);
			el("div", "confirm-opt", opts, "YES");
			el("div", "confirm-opt", opts, "NO");
			this.paintConfirm();
		}
	}

	private paintConfirm(): void {
		const opts = this.confirmBox?.querySelectorAll(".confirm-opt");
		opts?.forEach((node, i) => node.classList.toggle("selected", i === this.confirmIndex));
	}

	private dismissConfirm(): void {
		this.confirming = false;
		this.confirmBox?.remove();
		this.confirmBox = null;
		this.audio.sfx("cancel");
	}
}
