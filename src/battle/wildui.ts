// Wild encounter controller + UI. One quick puzzle per mite: answer well and
// it pops; answer badly and it bites. Retry, spend an item, or flee.

import type { AudioEngine } from "../core/audio";
import type { Input } from "../core/input";
import { paletteById } from "../core/palette";
import { spriteDataUrl } from "../core/sprites";
import { CREATURE_SPRITES } from "../content/art-creatures";
import { SPECIES, type Species } from "../content/creatures";
import { SONGS } from "../content/music";
import { grantXp, hpMax, removeItem, type GameState } from "../game/state";
import { el, ui } from "../ui/dom";
import type { Transitions } from "../ui/transitions";
import { runValue } from "./minivm";
import { generatePuzzle, type Puzzle } from "./puzzles";

type Phase = "intro" | "puzzle" | "feedback" | "after" | "closing";

interface Focusable {
	node: HTMLElement;
	act: () => void;
}

export class WildBattle {
	active = false;

	private root: HTMLElement | null = null;
	private state: GameState;
	private audio: AudioEngine;
	private input: Input;
	private transitions: Transitions;
	private toast: (text: string) => void;

	private species: Species = SPECIES["bitling"]!;
	private puzzle: Puzzle | null = null;
	private phase: Phase = "intro";
	private focusables: Focusable[] = [];
	private focusIndex = 0;
	private orderPicks: number[] = [];
	private duckUsed = false;
	private done: ((won: boolean) => void) | null = null;
	private msgNode: HTMLElement | null = null;
	private playerHpFill: HTMLElement | null = null;
	private playerHpText: HTMLElement | null = null;
	private enemyBox: HTMLElement | null = null;
	private puzzlePanel: HTMLElement | null = null;

	constructor(
		state: GameState,
		audio: AudioEngine,
		input: Input,
		transitions: Transitions,
		toast: (text: string) => void
	) {
		this.state = state;
		this.audio = audio;
		this.input = input;
		this.transitions = transitions;
		this.toast = toast;
	}

	start(speciesId: string, done: (won: boolean) => void): void {
		this.species = SPECIES[speciesId] ?? SPECIES["bitling"]!;
		this.done = done;
		this.active = true;
		this.duckUsed = false;
		this.audio.playSong(SONGS["wild"]!);
		void this.transitions.battleSwirl().then(() => {
			this.mount();
			this.transitions.reveal();
			this.showIntro();
		});
	}

	private mount(): void {
		this.root = el("div", "battle wildbattle", ui());
		const arena = el("div", "arena", this.root);

		const enemyRow = el("div", "enemy-row", arena);
		const enemyInfo = el("div", "info gbbox", enemyRow);
		el("div", "info-name", enemyInfo, this.species.name);
		el("div", "info-sub", enemyInfo, "glitchmite · zone " + this.species.zone);
		this.enemyBox = el("div", "enemy-sprite", enemyRow);
		const img = el("img", "", this.enemyBox) as HTMLImageElement;
		img.src = spriteDataUrl(
			CREATURE_SPRITES[this.species.sprite]!,
			paletteById(this.state.options.paletteId),
			4
		);
		img.alt = this.species.name;

		const playerRow = el("div", "player-row", arena);
		const bot = el("div", "bot-sprite", playerRow);
		const botImg = el("img", "", bot) as HTMLImageElement;
		botImg.src = spriteDataUrl(
			CREATURE_SPRITES["bot." + this.state.player.chassis + ".back"]!,
			paletteById(this.state.options.paletteId),
			3
		);
		botImg.alt = this.state.player.botName;
		const playerInfo = el("div", "info gbbox", playerRow);
		el("div", "info-name", playerInfo, this.state.player.botName + "  L" + this.state.player.level);
		const bar = el("div", "hpbar", playerInfo);
		this.playerHpFill = el("div", "hpfill", bar);
		this.playerHpText = el("div", "info-sub", playerInfo, "");
		this.paintHp();

		this.msgNode = el("div", "battle-msg gbbox", this.root);
		this.puzzlePanel = el("div", "puzzle-panel", this.root);
	}

	private paintHp(): void {
		const max = hpMax(this.state);
		const pct = Math.max(0, Math.min(1, this.state.player.hp / max));
		if (this.playerHpFill) this.playerHpFill.style.width = Math.round(pct * 100) + "%";
		if (this.playerHpText) this.playerHpText.textContent = "INTEGRITY " + this.state.player.hp + "/" + max;
	}

	private say(text: string): void {
		if (this.msgNode) this.msgNode.textContent = text;
	}

	private clearFocusables(): void {
		this.focusables = [];
		this.focusIndex = 0;
	}

	private addFocusable(node: HTMLElement, act: () => void): void {
		const index = this.focusables.length;
		this.focusables.push({ node, act });
		node.classList.add("focusable");
		node.addEventListener("click", () => {
			this.focusIndex = index;
			this.paintFocus();
			act();
		});
	}

	private paintFocus(): void {
		this.focusables.forEach((f, i) => f.node.classList.toggle("selected", i === this.focusIndex));
	}

	private showIntro(): void {
		this.phase = "intro";
		this.say("A wild " + this.species.name + " materialised! It has a question.");
	}

	private newPuzzle(): void {
		this.phase = "puzzle";
		this.orderPicks = [];
		this.puzzle = generatePuzzle(this.species.zone, Math.floor(Math.random() * 1e9));
		this.renderPuzzle();
	}

	private renderPuzzle(): void {
		const panel = this.puzzlePanel!;
		panel.replaceChildren();
		this.clearFocusables();
		const puzzle = this.puzzle!;
		this.say(puzzle.prompt);

		// Grid puzzles lay code and grid side by side — vertical space is tight.
		const host = puzzle.kind === "grid" ? el("div", "puzzle-row", panel) : panel;
		const codeBox = el("div", "codebox gbbox", host);
		if (puzzle.kind === "spotbug") {
			// Each line shows the op and the value the program claims for x; the
			// player taps the line where a claim first stops adding up.
			puzzle.lines.forEach((line, i) => {
				const node = el("div", "codeline traceline", codeBox);
				el("span", "trace-op", node, line.text);
				el("span", "trace-val", node, "x = " + line.claim);
				this.addFocusable(node, () => this.answerSpotbug(i));
			});
		} else {
			for (const line of puzzle.kind === "order" ? [] : puzzle.code) {
				el("div", "codeline", codeBox, line);
			}
		}

		if (puzzle.kind === "grid") {
			const gridBox = el("div", "gridbox", host);
			const g = puzzle.grid;
			gridBox.style.gridTemplateColumns = "repeat(" + g.size + ", 1fr)";
			for (let y = 0; y < g.size; y++) {
				for (let x = 0; x < g.size; x++) {
					const cell = el("div", "gridcell", gridBox);
					if (x === g.startX && y === g.startY) {
						cell.classList.add("start");
						cell.textContent = ["↑", "→", "↓", "←"][g.startDir]!;
					}
					const mark = g.marks.find((m) => m.x === x && m.y === y);
					if (mark) {
						cell.classList.add("mark");
						cell.textContent = mark.label;
					}
				}
			}
		}

		if (puzzle.kind === "mcq" || puzzle.kind === "grid") {
			const opts = el("div", "optrow", panel);
			puzzle.options.forEach((option) => {
				const node = el("button", "gbbtn opt", opts, option.label);
				this.addFocusable(node, () => this.answerMcq(option.correct, option.explain));
			});
		}

		if (puzzle.kind === "order") {
			const chosen = el("div", "order-chosen gbbox", panel);
			chosen.id = "order-chosen";
			this.paintOrderChosen(chosen);
			const blocks = el("div", "order-blocks", panel);
			puzzle.steps.forEach((label, i) => {
				const node = el("button", "gbbtn orderblock", blocks, label);
				this.addFocusable(node, () => {
					if (this.orderPicks.includes(i)) return;
					this.orderPicks.push(i);
					this.audio.sfx("blip");
					this.paintOrderChosen(document.getElementById("order-chosen")!);
					node.classList.add("used");
					if (this.orderPicks.length === puzzle.steps.length) this.answerOrder();
				});
			});
			const reset = el("button", "gbbtn", panel, "RESET");
			this.addFocusable(reset, () => {
				this.orderPicks = [];
				this.audio.sfx("cancel");
				this.renderPuzzle();
			});
		}

		this.paintFocus();
	}

	private paintOrderChosen(node: HTMLElement): void {
		const puzzle = this.puzzle!;
		if (puzzle.kind !== "order") return;
		node.textContent =
			this.orderPicks.length === 0
				? "Tap the steps in order…"
				: this.orderPicks.map((i) => (puzzle.steps[i] ?? "")).join("  →  ");
	}

	private answerMcq(correct: boolean, explain: string): void {
		if (this.phase !== "puzzle") return;
		if (correct) this.win();
		else this.hurt(explain);
	}

	private answerSpotbug(line: number): void {
		if (this.phase !== "puzzle") return;
		const puzzle = this.puzzle!;
		if (puzzle.kind !== "spotbug") return;
		if (line === puzzle.buggyLine) {
			this.win();
		} else if (line < puzzle.buggyLine) {
			this.hurt("That line's value is correct — apply the op to the line above and it matches. Look further down.");
		} else {
			this.hurt("That value looks right for the line above it — but the line above already carried the error. Trace back to where it started.");
		}
	}

	private answerOrder(): void {
		const puzzle = this.puzzle!;
		if (puzzle.kind !== "order") return;
		const ordered = this.orderPicks.map((i) => puzzle.ops[i]!);
		const result = runValue(ordered)[puzzle.variable] ?? 0;
		if (result === puzzle.goal) this.win();
		else this.hurt("That order makes x = " + result + ", not " + puzzle.goal + ". Same steps — different order, different answer.");
	}

	private win(): void {
		this.phase = "after";
		this.audio.sfx("zap");
		this.enemyBox?.classList.add("zapped");
		this.state.stats.wins++;
		this.state.dex.seen[this.species.id] = (this.state.dex.seen[this.species.id] ?? 0) + 1;
		const bits = this.species.bits + Math.floor(Math.random() * 3);
		this.state.player.bits += bits;
		const levels = grantXp(this.state, this.species.xp);
		this.paintHp();
		this.audio.playOnce(SONGS["victory"]!);
		this.say(this.species.name + " popped in a shower of bits! +" + this.species.xp + " XP, +" + bits + " bits." + (levels > 0 ? "  LEVEL UP — now L" + this.state.player.level + "!" : ""));
		if (levels > 0) this.audio.sfx("levelup");
		this.showAfterMenu(true);
	}

	private hurt(explain: string): void {
		this.phase = "feedback";
		this.audio.sfx("hit");
		this.state.player.hp = Math.max(0, this.state.player.hp - this.species.dmg);
		this.paintHp();
		this.root?.classList.add("shake");
		window.setTimeout(() => this.root?.classList.remove("shake"), 350);
		this.say("Ouch — " + this.species.dmg + " integrity. " + explain);
		if (this.state.player.hp <= 0) {
			window.setTimeout(() => this.close(false), 1400);
			return;
		}
		this.showAfterMenu(false);
	}

	private showAfterMenu(won: boolean): void {
		const panel = this.puzzlePanel!;
		panel.replaceChildren();
		this.clearFocusables();
		const row = el("div", "optrow", panel);
		if (won) {
			const ok = el("button", "gbbtn", row, "NICE");
			this.addFocusable(ok, () => this.close(true));
		} else {
			const retry = el("button", "gbbtn", row, "TRY ANOTHER");
			this.addFocusable(retry, () => this.newPuzzle());
			if ((this.state.items["patch"] ?? 0) > 0) {
				const patch = el("button", "gbbtn", row, "PATCH (+5)");
				this.addFocusable(patch, () => {
					removeItem(this.state, "patch");
					this.state.player.hp = Math.min(hpMax(this.state), this.state.player.hp + 5);
					this.audio.sfx("heal");
					this.paintHp();
					this.toast("Patched up.");
					this.newPuzzle();
				});
			}
			if ((this.state.items["duck"] ?? 0) > 0 && !this.duckUsed) {
				const duck = el("button", "gbbtn", row, "DUCK");
				this.addFocusable(duck, () => {
					removeItem(this.state, "duck");
					this.duckUsed = true;
					this.audio.sfx("confirm");
					this.toast("You explain the problem to the duck. The duck narrows its eyes.");
					this.newPuzzle();
					this.applyDuck();
				});
			}
			const flee = el("button", "gbbtn", row, "FLEE");
			this.addFocusable(flee, () => {
				this.say("You back away slowly. The " + this.species.name + " respects it.");
				window.setTimeout(() => this.close(true), 700);
			});
		}
		this.paintFocus();
	}

	// The duck removes one wrong option on option-based puzzles.
	private applyDuck(): void {
		const puzzle = this.puzzle;
		if (!puzzle || (puzzle.kind !== "mcq" && puzzle.kind !== "grid")) return;
		const wrongIndex = puzzle.options.findIndex((o) => !o.correct);
		if (wrongIndex < 0) return;
		const nodes = this.puzzlePanel?.querySelectorAll(".opt");
		const node = nodes?.[wrongIndex] as HTMLElement | undefined;
		if (node) {
			node.classList.add("ducked");
			(node as HTMLButtonElement).disabled = true;
			node.textContent = "✕";
		}
	}

	private close(won: boolean): void {
		if (this.phase === "closing") return;
		this.phase = "closing";
		void this.transitions.fade(() => {
			this.root?.remove();
			this.root = null;
			this.active = false;
		}).then(() => {
			const done = this.done;
			this.done = null;
			done?.(won);
		});
	}

	update(): void {
		if (!this.active || this.focusables.length === 0) {
			if (this.phase === "intro" && (this.input.pressed("a") || this.input.pressed("start"))) {
				this.newPuzzle();
			}
			return;
		}
		if (this.phase === "intro") {
			if (this.input.pressed("a")) this.newPuzzle();
			return;
		}
		const cols = this.focusables.length;
		if (this.input.pressed("right") || this.input.pressed("down")) {
			this.focusIndex = (this.focusIndex + 1) % cols;
			this.audio.sfx("blip");
			this.paintFocus();
		}
		if (this.input.pressed("left") || this.input.pressed("up")) {
			this.focusIndex = (this.focusIndex + cols - 1) % cols;
			this.audio.sfx("blip");
			this.paintFocus();
		}
		if (this.input.pressed("a")) {
			this.focusables[this.focusIndex]?.act();
		}
	}
}
