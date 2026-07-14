// Title screen: logo, NEW GAME / CONTINUE / IMPORT, palette-aware, DOM only.

import type { AudioEngine } from "../core/audio";
import type { Input } from "../core/input";
import { anySaveExists, importCode, loadFrom, AUTOSAVE_SLOT, SLOTS, summarise } from "../game/save";
import type { GameState } from "../game/state";
import { el, ui } from "./dom";
import { ListMenu } from "./menu";

export class TitleScreen {
	private root: HTMLElement;
	private menu: ListMenu | null = null;
	private importArea: HTMLTextAreaElement | null = null;
	private slotMenu: ListMenu | null = null;
	done = false;

	constructor(
		private audio: AudioEngine,
		private begin: (state: GameState | null) => void // null = brand-new game
	) {
		this.root = el("div", "title", ui());
		const inner = el("div", "title-inner", this.root);
		el("div", "title-glitch", inner, "▚▞▚");
		el("div", "title-logo", inner, "KERNEL QUEST");
		el("div", "title-sub", inner, "— Crimson Edition —");
		el("div", "title-tag", inner, "Eight badges. One crashed Mainframe. Zero semicolons.");
		this.showMain();
		el("div", "title-foot", this.root, "© Joe's Games · thinks in steps since 2026");
	}

	private showMain(): void {
		this.menu?.destroy();
		this.slotMenu?.destroy();
		this.slotMenu = null;
		this.importArea?.parentElement?.remove();
		this.importArea = null;
		this.menu = new ListMenu(
			this.root,
			"title-menu",
			this.audio,
			(value) => this.pick(value),
			() => undefined
		);
		const items = [];
		if (anySaveExists()) items.push({ label: "CONTINUE", value: "continue" });
		items.push({ label: "NEW GAME", value: "new" });
		items.push({ label: "IMPORT CODE", value: "import" });
		this.menu.setItems(items);
	}

	private pick(value: string): void {
		if (value === "new") {
			this.finish(null);
			return;
		}
		if (value === "continue") {
			this.showSlots();
			return;
		}
		if (value === "import") {
			this.showImport();
			return;
		}
	}

	private showSlots(): void {
		this.menu?.destroy();
		this.menu = null;
		this.slotMenu = new ListMenu(
			this.root,
			"title-menu",
			this.audio,
			(slot) => {
				const state = loadFrom(slot);
				if (state) this.finish(state);
			},
			() => this.showMain()
		);
		const items = [];
		const auto = summarise(AUTOSAVE_SLOT);
		if (auto) {
			items.push({ label: "AUTOSAVE", right: auto.name + " · " + auto.badges + "◆", value: AUTOSAVE_SLOT });
		}
		for (const slot of SLOTS) {
			const s = summarise(slot);
			items.push({
				label: "SLOT " + slot,
				right: s ? s.name + " · " + s.badges + "◆ L" + s.level : "empty",
				value: slot,
				disabled: !s
			});
		}
		this.slotMenu.setItems(items);
	}

	private showImport(): void {
		this.menu?.destroy();
		this.menu = null;
		const box = el("div", "gbbox title-import", this.root);
		el("div", "panel-title", box, "PASTE SAVE CODE");
		this.importArea = el("textarea", "exportarea", box) as HTMLTextAreaElement;
		this.importArea.addEventListener("keydown", (ev) => ev.stopPropagation());
		const row = el("div", "confirm-opts", box);
		const okBtn = el("button", "gbbtn", row, "LOAD");
		const backBtn = el("button", "gbbtn", row, "BACK");
		okBtn.addEventListener("click", () => {
			const state = importCode(this.importArea!.value);
			if (state) {
				this.finish(state);
			} else {
				this.audio.sfx("wrong");
				el("div", "panel-note", box, "That code didn't parse. Very on-brand for this game.");
			}
		});
		backBtn.addEventListener("click", () => this.showMain());
	}

	private finish(state: GameState | null): void {
		this.audio.sfx("confirm");
		this.done = true;
		this.root.remove();
		this.begin(state);
	}

	update(input: Input): void {
		this.menu?.update(input);
		this.slotMenu?.update(input);
		if (this.importArea && input.pressed("b")) this.showMain();
	}
}
