// The START menu and its panes: bot status, routine dex, bag, badges, save,
// options. One MenuSystem instance owns the DOM and the pane state machine.

import type { Input } from "../core/input";
import type { AudioEngine } from "../core/audio";
import { PALETTES, paletteById } from "../core/palette";
import { el, ui } from "./dom";
import { hpMax, xpForNextLevel, type GameState } from "../game/state";
import { describeBlock } from "../battle/vm";
import { AUTOSAVE_SLOT, SLOTS, exportCode, saveTo, summarise } from "../game/save";
import { ITEMS } from "../content/items";
import { BADGE_ORDER, BADGES } from "../content/badges";

interface ListItem {
	label: string;
	right?: string;
	value: string;
	disabled?: boolean;
}

export class ListMenu {
	root: HTMLElement;
	private items: ListItem[] = [];
	private index = 0;
	private nodes: HTMLElement[] = [];
	private onPick: (value: string, index: number) => void;
	private onCancel: () => void;
	private audio: AudioEngine;

	constructor(
		parent: HTMLElement,
		className: string,
		audio: AudioEngine,
		onPick: (value: string, index: number) => void,
		onCancel: () => void
	) {
		this.root = el("div", "listmenu gbbox " + className, parent);
		this.audio = audio;
		this.onPick = onPick;
		this.onCancel = onCancel;
	}

	setItems(items: ListItem[], keepIndex = false): void {
		this.items = items;
		if (!keepIndex) this.index = 0;
		this.index = Math.min(this.index, Math.max(0, items.length - 1));
		this.root.replaceChildren();
		this.nodes = items.map((item, i) => {
			const node = el("div", "listmenu-item" + (item.disabled ? " disabled" : ""), this.root);
			el("span", "cursor", node, "▶");
			el("span", "label", node, item.label);
			if (item.right) el("span", "right", node, item.right);
			node.addEventListener("click", () => {
				this.index = i;
				this.paint();
				this.pick();
			});
			return node;
		});
		this.paint();
	}

	private paint(): void {
		this.nodes.forEach((node, i) => node.classList.toggle("selected", i === this.index));
		this.nodes[this.index]?.scrollIntoView({ block: "nearest" });
	}

	private pick(): void {
		const item = this.items[this.index];
		if (!item || item.disabled) {
			this.audio.sfx("cancel");
			return;
		}
		this.audio.sfx("confirm");
		this.onPick(item.value, this.index);
	}

	update(input: Input): void {
		if (this.items.length > 0) {
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
			if (input.pressed("a")) this.pick();
		}
		if (input.pressed("b")) {
			this.audio.sfx("cancel");
			this.onCancel();
		}
	}

	destroy(): void {
		this.root.remove();
	}
}

type Pane = "root" | "bot" | "dex" | "dexDetail" | "bag" | "badges" | "save" | "options" | "export";

export class MenuSystem {
	open = false;

	private state: GameState;
	private audio: AudioEngine;
	private input: Input;
	private pane: Pane = "root";
	private rootMenu: ListMenu | null = null;
	private paneMenu: ListMenu | null = null;
	private panel: HTMLElement | null = null;
	private dexIndex = 0;
	private onClose: () => void;
	private onOptionsChanged: () => void;
	private toast: (text: string) => void;

	constructor(
		state: GameState,
		audio: AudioEngine,
		input: Input,
		hooks: { onClose: () => void; onOptionsChanged: () => void; toast: (text: string) => void }
	) {
		this.state = state;
		this.audio = audio;
		this.input = input;
		this.onClose = hooks.onClose;
		this.onOptionsChanged = hooks.onOptionsChanged;
		this.toast = hooks.toast;
	}

	openMenu(): void {
		if (this.open) return;
		this.open = true;
		this.pane = "root";
		this.audio.sfx("confirm");
		this.rootMenu = new ListMenu(
			ui(),
			"startmenu",
			this.audio,
			(value) => this.enterPane(value as Pane),
			() => this.close()
		);
		this.rootMenu.setItems([
			{ label: "BOT", value: "bot" },
			{ label: "DEX", value: "dex" },
			{ label: "BAG", value: "bag" },
			{ label: "BADGES", value: "badges" },
			{ label: "SAVE", value: "save" },
			{ label: "OPTIONS", value: "options" },
			{ label: "EXIT", value: "exit" }
		]);
	}

	close(): void {
		this.rootMenu?.destroy();
		this.rootMenu = null;
		this.closePane();
		this.open = false;
		this.onClose();
	}

	private closePane(): void {
		this.paneMenu?.destroy();
		this.paneMenu = null;
		this.panel?.remove();
		this.panel = null;
		this.pane = "root";
	}

	private enterPane(pane: Pane | "exit"): void {
		if (pane === "exit") {
			this.close();
			return;
		}
		this.pane = pane as Pane;
		switch (pane) {
			case "bot":
				this.showBot();
				break;
			case "dex":
				this.showDex();
				break;
			case "bag":
				this.showBag();
				break;
			case "badges":
				this.showBadges();
				break;
			case "save":
				this.showSave();
				break;
			case "options":
				this.showOptions();
				break;
			default:
				break;
		}
	}

	private newPanel(className: string): HTMLElement {
		this.panel = el("div", "panel gbbox " + className, ui());
		return this.panel;
	}

	private showBot(): void {
		const p = this.state.player;
		const panel = this.newPanel("pane-bot");
		el("div", "panel-title", panel, p.botName + " — " + p.chassis.toUpperCase() + " chassis");
		const rows = el("div", "kv", panel);
		const add = (k: string, v: string): void => {
			const row = el("div", "kv-row", rows);
			el("span", "k", row, k);
			el("span", "v", row, v);
		};
		add("Debugger", p.name);
		add("Level", String(p.level));
		add("Integrity", p.hp + " / " + hpMax(this.state));
		add("XP to next", String(xpForNextLevel(p.level) - p.xp));
		add("Bits", String(p.bits));
		add("Badges", this.state.badges.length + " / 8");
		add("Mites zapped", String(this.state.stats.wins));
		el("div", "panel-hint", panel, "B: back");
	}

	private showDex(): void {
		const panel = this.newPanel("pane-dex");
		el("div", "panel-title", panel, "ROUTINE DEX");
		if (this.state.routines.length === 0) {
			el("div", "panel-body", panel, "No routines yet. Define one in a gym battle (from badge 5) or earn them from the people of Kernelia.");
			el("div", "panel-hint", panel, "B: back");
			return;
		}
		this.paneMenu = new ListMenu(
			panel,
			"dexlist",
			this.audio,
			(_value, index) => {
				this.dexIndex = index;
				this.panel?.remove();
				this.panel = null;
				this.paneMenu?.destroy();
				this.paneMenu = null;
				this.pane = "dexDetail";
				this.showDexDetail();
			},
			() => {
				this.closePane();
			}
		);
		this.paneMenu.setItems(
			this.state.routines.map((r, i) => ({ label: r.name, right: r.source, value: String(i) }))
		);
		el("div", "panel-hint", panel, "A: inspect · B: back");
	}

	private showDexDetail(): void {
		const routine = this.state.routines[this.dexIndex];
		const panel = this.newPanel("pane-dex");
		if (!routine) return;
		el("div", "panel-title", panel, routine.name);
		const body = el("div", "panel-body", panel);
		for (const block of routine.blocks) {
			el("div", "codeline", body, describeBlock(block));
		}
		el("div", "panel-note", panel, routine.note);
		el("div", "panel-hint", panel, "B: back");
	}

	private showBag(): void {
		const panel = this.newPanel("pane-bag");
		el("div", "panel-title", panel, "BAG — " + this.state.player.bits + " bits");
		const entries = Object.entries(this.state.items).filter(([, n]) => n > 0);
		if (entries.length === 0) {
			el("div", "panel-body", panel, "Empty. The shops of Kernelia await your bits.");
			el("div", "panel-hint", panel, "B: back");
			return;
		}
		this.paneMenu = new ListMenu(
			panel,
			"baglist",
			this.audio,
			(value) => {
				const item = ITEMS[value];
				if (item) this.toast(item.blurb);
			},
			() => this.closePane()
		);
		this.paneMenu.setItems(
			entries.map(([id, n]) => ({
				label: ITEMS[id]?.name ?? id,
				right: "×" + n,
				value: id
			}))
		);
		el("div", "panel-hint", panel, "A: describe · B: back");
	}

	private showBadges(): void {
		const panel = this.newPanel("pane-badges");
		el("div", "panel-title", panel, "BADGES — " + this.state.badges.length + " / 8");
		const grid = el("div", "badge-grid", panel);
		for (const id of BADGE_ORDER) {
			const badge = BADGES[id]!;
			const got = this.state.badges.includes(id);
			const cell = el("div", "badge-cell" + (got ? " got" : ""), grid);
			el("div", "badge-icon", cell, got ? "◆" : "◇");
			el("div", "badge-name", cell, got ? badge.name : "???");
		}
		el("div", "panel-hint", panel, "B: back");
	}

	private showSave(): void {
		const panel = this.newPanel("pane-save");
		el("div", "panel-title", panel, "SAVE");
		this.paneMenu = new ListMenu(
			panel,
			"savelist",
			this.audio,
			(value) => {
				if (value === "export") {
					this.panel?.remove();
					this.panel = null;
					this.paneMenu?.destroy();
					this.paneMenu = null;
					this.pane = "export";
					this.showExport();
					return;
				}
				const ok = saveTo(value, this.state) && saveTo(AUTOSAVE_SLOT, this.state);
				this.audio.sfx(ok ? "save" : "wrong");
				this.toast(ok ? "Saved to slot " + value + "." : "Save failed — storage unavailable.");
				this.refreshSaveItems(true);
			},
			() => this.closePane()
		);
		this.refreshSaveItems(false);
		el("div", "panel-hint", panel, "A: save · B: back");
	}

	private refreshSaveItems(keepIndex: boolean): void {
		if (!this.paneMenu) return;
		this.paneMenu.setItems(
			[
				...SLOTS.map((slot) => {
					const s = summarise(slot);
					return {
						label: "Slot " + slot,
						right: s ? s.name + " · " + s.badges + "🞄 L" + s.level : "empty",
						value: slot
					};
				}),
				{ label: "Export code", right: "→", value: "export" }
			],
			keepIndex
		);
	}

	private showExport(): void {
		const panel = this.newPanel("pane-export");
		el("div", "panel-title", panel, "EXPORT CODE");
		const area = el("textarea", "exportarea", panel) as HTMLTextAreaElement;
		area.readOnly = true;
		area.value = exportCode(this.state);
		el("div", "panel-body", panel, "Copy this code to continue on another device (title screen → IMPORT).");
		const btn = el("button", "gbbtn", panel, "COPY");
		btn.addEventListener("click", () => {
			void navigator.clipboard?.writeText(area.value);
			this.toast("Copied.");
		});
		el("div", "panel-hint", panel, "B: back");
	}

	private showOptions(): void {
		const panel = this.newPanel("pane-options");
		el("div", "panel-title", panel, "OPTIONS");
		this.paneMenu = new ListMenu(
			panel,
			"optionslist",
			this.audio,
			(value) => {
				const o = this.state.options;
				if (value === "palette") {
					const idx = PALETTES.findIndex((p) => p.id === o.paletteId);
					o.paletteId = PALETTES[(idx + 1) % PALETTES.length]!.id;
				}
				if (value === "text") o.textSpeed = ((o.textSpeed + 1) % 3) as 0 | 1 | 2;
				if (value === "volume") {
					o.volume = Math.round(((o.volume + 0.25) % 1.25) * 100) / 100;
					if (o.volume > 1) o.volume = 0;
				}
				if (value === "mute") o.muted = !o.muted;
				this.onOptionsChanged();
				this.refreshOptionItems();
			},
			() => this.closePane()
		);
		this.refreshOptionItems();
		el("div", "panel-hint", panel, "A: change · B: back");
	}

	private refreshOptionItems(): void {
		if (!this.paneMenu) return;
		const o = this.state.options;
		this.paneMenu.setItems(
			[
				{ label: "Palette", right: paletteById(o.paletteId).name, value: "palette" },
				{ label: "Text speed", right: ["Fast", "Medium", "Slow"][o.textSpeed]!, value: "text" },
				{ label: "Volume", right: Math.round(o.volume * 100) + "%", value: "volume" },
				{ label: "Sound", right: o.muted ? "Muted" : "On", value: "mute" }
			],
			true
		);
	}

	update(): void {
		if (!this.open) return;
		if (this.pane === "root") {
			this.rootMenu?.update(this.input);
			return;
		}
		// Panes with a list delegate to it; info panes close on B.
		if (this.paneMenu) {
			this.paneMenu.update(this.input);
			return;
		}
		if (this.input.pressed("b") || this.input.pressed("a")) {
			this.audio.sfx("cancel");
			if (this.pane === "dexDetail") {
				this.panel?.remove();
				this.panel = null;
				this.pane = "dex";
				this.showDex();
				return;
			}
			this.closePane();
		}
	}
}
