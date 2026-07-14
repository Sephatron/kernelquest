// Shop overlay: buy items with bits. Selling is for capitalists.

import type { AudioEngine } from "../core/audio";
import type { Input } from "../core/input";
import { addItem, type GameState } from "../game/state";
import { ITEMS, SHOP_STOCK } from "../content/items";
import { el, ui } from "./dom";
import { ListMenu } from "./menu";

export class Shop {
	private panel: HTMLElement;
	private menu: ListMenu;
	private bitsLine: HTMLElement;
	active = true;

	constructor(
		private state: GameState,
		private audio: AudioEngine,
		private toast: (text: string) => void,
		private done: () => void
	) {
		this.panel = el("div", "panel gbbox pane-shop", ui());
		el("div", "panel-title", this.panel, "SHOP");
		this.bitsLine = el("div", "panel-body", this.panel, "");
		this.menu = new ListMenu(
			this.panel,
			"shoplist",
			this.audio,
			(id) => this.buy(id),
			() => this.close()
		);
		this.refresh();
		el("div", "panel-hint", this.panel, "A: buy · B: leave");
	}

	private refresh(): void {
		this.bitsLine.textContent = "Your bits: " + this.state.player.bits;
		this.menu.setItems(
			SHOP_STOCK.map((id) => {
				const item = ITEMS[id]!;
				return {
					label: item.name,
					right: item.price + "b",
					value: id,
					disabled: this.state.player.bits < item.price
				};
			}),
			true
		);
	}

	private buy(id: string): void {
		const item = ITEMS[id]!;
		if (this.state.player.bits < item.price) {
			this.audio.sfx("wrong");
			return;
		}
		this.state.player.bits -= item.price;
		addItem(this.state, id);
		this.audio.sfx("save");
		this.toast(item.name + " acquired. " + item.blurb);
		this.refresh();
	}

	private close(): void {
		this.active = false;
		this.panel.remove();
		this.done();
	}

	update(input: Input): void {
		this.menu.update(input);
	}
}
