// Gym battle: assemble a program from blocks against a visible enemy
// pattern, run it, watch the program counter walk your blocks, edit, retry.
// The same runProgram that powers the fairness proofs drives the playback.

import type { AudioEngine } from "../core/audio";
import type { Input } from "../core/input";
import { paletteById } from "../core/palette";
import { spriteDataUrl } from "../core/sprites";
import { CREATURE_SPRITES } from "../content/art-creatures";
import type { ProgramBattleDef } from "../content/gyms";
import { SONGS } from "../content/music";
import { grantXp, unlockedVocab, removeItem, type GameState } from "../game/state";
import { el, ui } from "../ui/dom";
import type { Transitions } from "../ui/transitions";
import {
	act,
	call,
	condLabel,
	describeEnemyMove,
	iff,
	programCost,
	rep,
	runProgram,
	type ActBlock,
	type Block,
	type BotOp,
	type Cond,
	type IfBlock,
	type Program,
	type RoutineTable,
	type RunResult
} from "./vm";

type Zone = "program" | "palette" | "actions";
type Picker =
	| { kind: "none" }
	| { kind: "count" }
	| { kind: "cond" }
	| { kind: "then"; cond: Cond }
	| { kind: "else"; cond: Cond; then: BotOp }
	| { kind: "routine" }
	| { kind: "savename" };

const TURN_MS = 500;
const TURN_MS_FAST = 130;
// Loop-body cap. Must equal VocabSpec.maxBodyLen wherever the fairness solver
// proves gating, so the solver's exhaustive search covers every buildable loop.
const MAX_LOOP_BODY = 3;

export class GymBattle {
	active = false;

	private state: GameState;
	private audio: AudioEngine;
	private input: Input;
	private transitions: Transitions;
	private toast: (text: string) => void;

	private def: ProgramBattleDef | null = null;
	private program: Program = [];
	private openLoop: { block: Block & { kind: "repeat" } } | null = null;
	private picker: Picker = { kind: "none" };
	private running = false;
	private lastRun: RunResult | null = null;
	private done: ((won: boolean) => void) | null = null;

	private root: HTMLElement | null = null;
	private programList: HTMLElement | null = null;
	private paletteRow: HTMLElement | null = null;
	private actionsRow: HTMLElement | null = null;
	private memNode: HTMLElement | null = null;
	private msgNode: HTMLElement | null = null;
	private enemyHpFill: HTMLElement | null = null;
	private botHpFill: HTMLElement | null = null;
	private enemyHpText: HTMLElement | null = null;
	private botHpText: HTMLElement | null = null;
	private patternChips: HTMLElement[] = [];
	private enemySpriteBox: HTMLElement | null = null;

	private zone: Zone = "palette";
	private zoneIndex: Record<Zone, number> = { program: 0, palette: 0, actions: 0 };
	private cancelPlayback: (() => void) | null = null;

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

	start(def: ProgramBattleDef, done: (won: boolean) => void): void {
		this.def = def;
		this.done = done;
		this.active = true;
		// Debugging battles hand you a broken program to repair.
		this.program = def.prefill ? (JSON.parse(JSON.stringify(def.prefill)) as Program) : [];
		this.openLoop = null;
		this.picker = { kind: "none" };
		this.running = false;
		this.lastRun = null;
		this.zone = "palette";
		this.zoneIndex = { program: 0, palette: 0, actions: 0 };
		this.audio.playSong(SONGS["gym"]!);
		void this.transitions.battleSwirl().then(() => {
			this.mount();
			this.transitions.reveal();
		});
	}

	private routineTable(): RoutineTable {
		const table: RoutineTable = {};
		for (const routine of this.state.routines) table[routine.name] = routine.blocks;
		return table;
	}

	// ------------------------------------------------------------- mounting

	private mount(): void {
		const def = this.def!;
		this.root = el("div", "battle gymbattle", ui());

		const header = el("div", "gym-header", this.root);
		el("div", "gym-title", header, def.title);
		this.memNode = el("div", "gym-mem", header, "");

		const main = el("div", "gym-main", this.root);

		const left = el("div", "gym-left", main);
		el("div", "gym-label", left, "PROGRAM");
		this.programList = el("div", "program-list", left);

		const right = el("div", "gym-right", main);
		const enemyTop = el("div", "gym-enemy-top", right);
		this.enemySpriteBox = el("div", "gym-enemy-sprite", enemyTop);
		const img = el("img", "", this.enemySpriteBox) as HTMLImageElement;
		img.src = spriteDataUrl(CREATURE_SPRITES[def.sprite]!, paletteById(this.state.options.paletteId), 3);
		img.alt = def.enemyName;
		const enemyInfo = el("div", "gym-enemy-info", enemyTop);
		el("div", "info-name", enemyInfo, def.enemyName);
		const ebar = el("div", "hpbar", enemyInfo);
		this.enemyHpFill = el("div", "hpfill", ebar);
		this.enemyHpText = el("div", "info-sub", enemyInfo, "");
		if (def.enemyArmor) {
			el("div", "info-sub", enemyInfo, "ARMOR " + def.enemyArmor + " — every hit loses " + def.enemyArmor);
		}

		el("div", "gym-label", right, "PATTERN — repeats");
		const patternRow = el("div", "pattern-row", right);
		this.patternChips = def.pattern.map((move) =>
			el("div", "patternchip", patternRow, describeEnemyMove(move))
		);

		const botInfo = el("div", "gym-bot-info", right);
		el("div", "info-name", botInfo, this.state.player.botName + " (house rig)");
		const bbar = el("div", "hpbar", botInfo);
		this.botHpFill = el("div", "hpfill", bbar);
		this.botHpText = el("div", "info-sub", botInfo, "");

		this.msgNode = el("div", "battle-msg gbbox", this.root);
		this.say(def.intro ?? "Assemble a program. Beat the pattern.");

		const bottom = el("div", "gym-bottom", this.root);
		el("div", "gym-label", bottom, "BLOCKS");
		this.paletteRow = el("div", "palette-row", bottom);
		this.actionsRow = el("div", "actions-row", bottom);

		this.paintAll();
	}

	private say(text: string): void {
		if (this.msgNode) this.msgNode.textContent = text;
	}

	private paintAll(): void {
		this.paintProgram();
		this.paintPalette();
		this.paintActions();
		this.paintBars(this.def!.botHp, this.def!.botHp, this.def!.enemyHp, this.def!.enemyHp, 0);
		this.paintFocus();
	}

	private paintBars(botHp: number, botMax: number, enemyHp: number, enemyMax: number, patternIndex: number): void {
		if (this.enemyHpFill) this.enemyHpFill.style.width = Math.round((enemyHp / enemyMax) * 100) + "%";
		if (this.botHpFill) this.botHpFill.style.width = Math.round((botHp / botMax) * 100) + "%";
		if (this.enemyHpText) this.enemyHpText.textContent = "HP " + enemyHp + "/" + enemyMax;
		if (this.botHpText) this.botHpText.textContent = "INTEGRITY " + botHp + "/" + botMax;
		this.patternChips.forEach((chip, i) => chip.classList.toggle("now", i === patternIndex));
	}

	// ------------------------------------------------------------ program UI

	private blockLabel(block: Block): string {
		switch (block.kind) {
			case "act":
				return block.op;
			case "if":
				return "IF " + condLabel(block.cond) + ": " + block.then + (block.els ? " ELSE " + block.els : "");
			case "repeat":
				return "REPEAT ×" + block.times + ":";
			case "call":
				return "DO " + block.routine;
		}
	}

	private paintProgram(): void {
		const def = this.def!;
		const list = this.programList!;
		list.replaceChildren();
		const rows: { node: HTMLElement; remove: () => void }[] = [];
		this.program.forEach((block, index) => {
			const row = el("div", "progblock", list, this.blockLabel(block));
			row.dataset["bid"] = block.id;
			rows.push({ node: row, remove: () => this.removeTopLevel(index) });
			if (block.kind === "repeat") {
				block.body.forEach((child, childIndex) => {
					const childRow = el("div", "progblock nested", list, this.blockLabel(child));
					childRow.dataset["bid"] = child.id;
					rows.push({ node: childRow, remove: () => this.removeNested(index, childIndex) });
				});
				if (this.openLoop?.block === block) {
					el("div", "progblock nested ghost", list, "… adding into loop …");
				}
			}
		});
		const used = programCost(this.program);
		for (let i = used; i < def.slots; i++) {
			el("div", "progblock empty", list, "—");
		}
		if (this.memNode) {
			this.memNode.textContent = "MEM " + used + "/" + def.slots;
			this.memNode.classList.toggle("full", used >= def.slots);
		}
		rows.forEach((row, i) => {
			row.node.addEventListener("click", () => {
				if (this.running) return;
				this.zone = "program";
				this.zoneIndex.program = i;
				row.remove();
			});
		});
	}

	private removeTopLevel(index: number): void {
		const block = this.program[index];
		if (this.openLoop && block === this.openLoop.block) this.openLoop = null;
		this.program.splice(index, 1);
		this.audio.sfx("cancel");
		this.paintProgram();
		this.paintFocus();
	}

	private removeNested(index: number, childIndex: number): void {
		const block = this.program[index];
		if (block?.kind === "repeat") {
			block.body.splice(childIndex, 1);
			this.audio.sfx("cancel");
			this.paintProgram();
			this.paintFocus();
		}
	}

	private programRowCount(): number {
		return this.program.reduce((n, b) => n + 1 + (b.kind === "repeat" ? b.body.length : 0), 0);
	}

	// ------------------------------------------------------------ palette UI

	private paletteEntries(): { label: string; on: () => void }[] {
		const def = this.def!;
		const vocab = unlockedVocab(this.state);
		const room = def.slots - programCost(this.program);

		if (this.picker.kind === "count") {
			return [2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
				label: "×" + n,
				on: () => {
					const loop = rep(n, []);
					this.program.push(loop);
					this.openLoop = { block: loop };
					this.picker = { kind: "none" };
					this.audio.sfx("confirm");
					this.repaintPaletteProgram();
				}
			}));
		}
		if (this.picker.kind === "cond") {
			return vocab.conds.map((cond) => ({
				label: condLabel(cond),
				on: () => {
					this.picker = { kind: "then", cond };
					this.repaintPaletteProgram();
				}
			}));
		}
		if (this.picker.kind === "then") {
			const picker = this.picker;
			return vocab.acts.map((op) => ({
				label: "THEN " + op,
				on: () => {
					this.picker = { kind: "else", cond: picker.cond, then: op };
					this.repaintPaletteProgram();
				}
			}));
		}
		if (this.picker.kind === "else") {
			const picker = this.picker;
			const finish = (els?: BotOp): void => {
				// Clear the picker BEFORE inserting: insertBlock repaints the
				// palette, and a stale "else" picker would leave the ELSE chips
				// live for one more click — inserting a second, unwanted IF.
				this.picker = { kind: "none" };
				this.insertBlock(iff(picker.cond, picker.then, els));
			};
			return [
				{ label: "NO ELSE", on: () => finish(undefined) },
				...vocab.acts.map((op) => ({ label: "ELSE " + op, on: () => finish(op) }))
			];
		}
		if (this.picker.kind === "routine") {
			const entries = this.state.routines.map((routine) => ({
				label: routine.name,
				on: () => {
					this.insertBlock(call(routine.name));
					this.picker = { kind: "none" };
				}
			}));
			entries.push({
				label: "BACK",
				on: () => {
					this.picker = { kind: "none" };
					this.repaintPaletteProgram();
				}
			});
			return entries;
		}

		const entries: { label: string; on: () => void }[] = [];
		for (const op of vocab.acts) {
			entries.push({
				label: op,
				on: () => {
					if (room < 1) return this.noRoom();
					this.insertBlock(act(op));
				}
			});
		}
		if (vocab.repeat && !this.openLoop) {
			entries.push({
				label: "REPEAT",
				on: () => {
					if (room < 2) return this.noRoom();
					this.picker = { kind: "count" };
					this.repaintPaletteProgram();
				}
			});
		}
		if (this.openLoop) {
			entries.push({
				label: "CLOSE LOOP",
				on: () => {
					if (this.openLoop && this.openLoop.block.body.length === 0) {
						// An empty loop is a slot wasted; drop it entirely.
						this.program = this.program.filter((b) => b !== this.openLoop!.block);
					}
					this.openLoop = null;
					this.audio.sfx("confirm");
					this.repaintPaletteProgram();
				}
			});
		}
		if (vocab.conds.length > 0) {
			entries.push({
				label: "IF",
				on: () => {
					if (room < 1) return this.noRoom();
					this.picker = { kind: "cond" };
					this.repaintPaletteProgram();
				}
			});
		}
		if (vocab.call && this.state.routines.length > 0 && !this.openLoop) {
			entries.push({
				label: "DO ROUTINE",
				on: () => {
					if (room < 1) return this.noRoom();
					this.picker = { kind: "routine" };
					this.repaintPaletteProgram();
				}
			});
		}
		return entries;
	}

	private noRoom(): void {
		this.audio.sfx("wrong");
		this.toast("Out of memory. Loops compress — just saying.");
	}

	private insertBlock(block: ActBlock | IfBlock | Block): void {
		const def = this.def!;
		if (this.openLoop) {
			if (block.kind !== "act" && block.kind !== "if") return;
			// Cap loop bodies at 2. This is a hard constraint: the fairness
			// solver enumerates the complete grammar up to this length, so the
			// editor must not exceed it or a gate proof could become unsound.
			if (this.openLoop.block.body.length >= MAX_LOOP_BODY) {
				this.toast("Loop bodies hold up to " + MAX_LOOP_BODY + " blocks. Use a routine for more.");
				this.audio.sfx("wrong");
				return;
			}
			if (programCost(this.program) + 1 > def.slots) return this.noRoom();
			this.openLoop.block.body.push(block);
		} else {
			if (programCost(this.program) + 1 > def.slots) return this.noRoom();
			this.program.push(block);
		}
		this.audio.sfx("blip");
		this.repaintPaletteProgram();
	}

	private repaintPaletteProgram(): void {
		// Keep the palette cursor where the player left it (clamped) — a
		// reset-to-zero after every add loses a keyboard player's place.
		this.zoneIndex.palette = Math.min(this.zoneIndex.palette, Math.max(0, this.paletteEntries().length - 1));
		this.paintProgram();
		this.paintPalette();
		this.paintActions();
		this.paintFocus();
	}

	private paintPalette(): void {
		const row = this.paletteRow!;
		row.replaceChildren();
		this.paletteEntries().forEach((entry, i) => {
			const chip = el("button", "chip", row, entry.label);
			chip.addEventListener("click", () => {
				if (this.running) return;
				this.zone = "palette";
				this.zoneIndex.palette = i;
				entry.on();
			});
		});
	}

	private actionEntries(): { label: string; on: () => void }[] {
		const vocab = unlockedVocab(this.state);
		const entries = [
			{ label: "▶ RUN", on: () => this.run() },
			{ label: "CLEAR", on: () => this.clearProgram() }
		];
		if (vocab.define && this.canSaveRoutine()) {
			entries.push({ label: "SAVE ROUTINE", on: () => this.saveRoutine() });
		}
		if ((this.state.items["breakpoint"] ?? 0) > 0 && this.lastRun) {
			entries.push({ label: "BREAKPOINT", on: () => this.showBreakpoint() });
		}
		entries.push({ label: "FORFEIT", on: () => this.forfeit() });
		return entries;
	}

	private paintActions(): void {
		const row = this.actionsRow!;
		row.replaceChildren();
		this.actionEntries().forEach((entry, i) => {
			const btn = el("button", "gbbtn", row, entry.label);
			btn.addEventListener("click", () => {
				if (this.running) return;
				this.zone = "actions";
				this.zoneIndex.actions = i;
				entry.on();
			});
		});
	}

	private paintFocus(): void {
		if (!this.root) return;
		this.root.querySelectorAll(".kfocus").forEach((n) => n.classList.remove("kfocus"));
		let nodes: NodeListOf<Element> | Element[] = [];
		if (this.zone === "program") nodes = this.programList!.querySelectorAll(".progblock:not(.empty):not(.ghost)");
		if (this.zone === "palette") nodes = this.paletteRow!.querySelectorAll(".chip");
		if (this.zone === "actions") nodes = this.actionsRow!.querySelectorAll(".gbbtn");
		const list = Array.from(nodes);
		if (list.length === 0) return;
		const index = Math.min(this.zoneIndex[this.zone], list.length - 1);
		this.zoneIndex[this.zone] = index;
		list[index]?.classList.add("kfocus");
	}

	private clearProgram(): void {
		this.program = [];
		this.openLoop = null;
		this.audio.sfx("cancel");
		this.repaintPaletteProgram();
	}

	private canSaveRoutine(): boolean {
		return (
			this.program.length >= 1 &&
			this.program.length <= 3 &&
			this.program.every((b) => b.kind === "act" || b.kind === "if")
		);
	}

	private saveRoutine(): void {
		const name = window.prompt("Name this routine (letters, max 10):", "");
		if (!name) return;
		const clean = name.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10);
		if (clean.length === 0) return;
		if (this.state.routines.some((r) => r.name === clean)) {
			this.toast("You already know a routine called " + clean + ".");
			return;
		}
		this.state.routines.push({
			name: clean,
			blocks: this.program.filter((b): b is ActBlock | IfBlock => b.kind === "act" || b.kind === "if"),
			source: "defined by you",
			note: "Written mid-battle. One name, many steps — that's abstraction."
		});
		this.audio.sfx("levelup");
		this.toast(clean + " saved to your Routine Dex. DO " + clean + " costs one slot.");
		this.repaintPaletteProgram();
	}

	private showBreakpoint(): void {
		if (!this.lastRun) return;
		removeItem(this.state, "breakpoint");
		const overlay = el("div", "panel gbbox pane-breakpoint", this.root!);
		el("div", "panel-title", overlay, "BREAKPOINT — last run, turn by turn");
		const body = el("div", "panel-body scroll", overlay);
		for (const event of this.lastRun.log) {
			el(
				"div",
				"codeline",
				body,
				"T" + event.turn + "  you: " + event.op + "  foe: " + describeEnemyMove(event.enemyMove) +
					"  dmg→foe " + event.dmgToEnemy + "  dmg→you " + event.dmgToBot
			);
		}
		const close = el("button", "gbbtn", overlay, "CLOSE");
		close.addEventListener("click", () => overlay.remove());
		this.paintActions();
		this.paintFocus();
	}

	private forfeit(): void {
		this.say("You power the rig down and step back. The pattern keeps cycling, smug.");
		window.setTimeout(() => this.close(false), 900);
	}

	// -------------------------------------------------------------- running

	private run(): void {
		const def = this.def!;
		if (this.program.length === 0) {
			this.toast("The program is empty. Bold, but no.");
			this.audio.sfx("wrong");
			return;
		}
		if (this.openLoop) {
			this.openLoop = null; // auto-close a dangling loop on run
			this.paintProgram();
		}
		this.running = true;
		const result = runProgram(this.program, {
			botHp: def.botHp,
			enemyHp: def.enemyHp,
			pattern: def.pattern,
			turnCap: def.turnCap,
			strikeBase: def.strikeBase,
			enemyArmor: def.enemyArmor
		}, this.routineTable());
		this.lastRun = result;
		this.say("Running…");
		this.root?.classList.add("running");

		let i = 0;
		let cancelled = false;
		this.cancelPlayback = () => {
			cancelled = true;
		};
		const playNext = (): void => {
			if (cancelled || !this.root) return;
			const event = result.log[i];
			if (!event) {
				this.finishRun(result);
				return;
			}
			// Program counter highlight.
			this.root.querySelectorAll(".progblock.pc").forEach((n) => n.classList.remove("pc"));
			const node = this.programList?.querySelector('[data-bid="' + event.blockId + '"]');
			node?.classList.add("pc");
			this.paintBars(event.botHp, def.botHp, event.enemyHp, def.enemyHp, event.turn % def.pattern.length);
			if (event.dmgToEnemy > 0) {
				this.audio.sfx("zap");
				this.pop(this.enemySpriteBox!, "-" + event.dmgToEnemy);
			} else if (event.reflected) {
				this.audio.sfx("reflect");
				this.pop(this.enemySpriteBox!, "reflect!");
			}
			if (event.dmgToBot > 0) this.audio.sfx("hit");
			if (event.botHealed > 0) this.audio.sfx("heal");
			this.say("T" + event.turn + ": you " + event.op + (event.viaElse ? " (else)" : "") + " · foe " + describeEnemyMove(event.enemyMove));
			i++;
			window.setTimeout(playNext, this.input.held("b") ? TURN_MS_FAST : TURN_MS);
		};
		window.setTimeout(playNext, 350);
	}

	private pop(host: HTMLElement, text: string): void {
		const node = el("div", "dmgpop", host, text);
		window.setTimeout(() => node.remove(), 600);
	}

	private finishRun(result: RunResult): void {
		const def = this.def!;
		this.root?.classList.remove("running");
		this.root?.querySelectorAll(".progblock.pc").forEach((n) => n.classList.remove("pc"));
		this.running = false;
		this.cancelPlayback = null;
		if (result.outcome === "WIN") {
			this.audio.playOnce(SONGS["victory"]!);
			this.state.flags[def.winFlag] = true;
			if (!this.state.flags[def.winFlag + ".rewarded"]) {
				this.state.flags[def.winFlag + ".rewarded"] = true;
				this.state.player.bits += def.bits;
				const levels = grantXp(this.state, def.xp);
				this.toast("+" + def.xp + " XP, +" + def.bits + " bits." + (levels > 0 ? " LEVEL UP → L" + this.state.player.level + "!" : ""));
			}
			this.say(def.enemyName + " crashed! " + (def.winText ?? "Pattern, beaten. Programmer, you."));
			window.setTimeout(() => this.close(true), 1600);
			return;
		}
		const reason =
			result.outcome === "LOSS"
				? "Your rig went down. Read the pattern — when does the damage land?"
				: result.outcome === "HALT"
					? "Program finished, enemy still standing. You need more punch in fewer slots."
					: "Turn limit hit. Something in there is stalling.";
		this.audio.sfx("wrong");
		this.say(reason + "  Edit and run it again — the pattern never changes.");
	}

	private close(won: boolean): void {
		this.cancelPlayback?.();
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

	// --------------------------------------------------------------- input

	update(): void {
		if (!this.active || this.running || !this.root) return;
		const zones: Zone[] = ["program", "palette", "actions"];
		if (this.input.pressed("down") || this.input.pressed("up")) {
			const dir = this.input.pressed("down") ? 1 : -1;
			let zi = zones.indexOf(this.zone);
			for (let hop = 0; hop < 3; hop++) {
				zi = (zi + dir + zones.length) % zones.length;
				const candidate = zones[zi]!;
				if (candidate === "program" && this.programRowCount() === 0) continue;
				this.zone = candidate;
				break;
			}
			this.audio.sfx("blip");
			this.paintFocus();
			return;
		}
		if (this.input.pressed("left") || this.input.pressed("right")) {
			const dir = this.input.pressed("right") ? 1 : -1;
			const counts: Record<Zone, number> = {
				program: this.programRowCount(),
				palette: this.paletteEntries().length,
				actions: this.actionEntries().length
			};
			const count = counts[this.zone];
			if (count > 0) {
				this.zoneIndex[this.zone] = (this.zoneIndex[this.zone] + dir + count) % count;
				this.audio.sfx("blip");
				this.paintFocus();
			}
			return;
		}
		if (this.input.pressed("a")) {
			if (this.zone === "palette") {
				this.paletteEntries()[this.zoneIndex.palette]?.on();
			} else if (this.zone === "actions") {
				this.actionEntries()[this.zoneIndex.actions]?.on();
			} else if (this.zone === "program") {
				// Remove the selected block.
				const flat: (() => void)[] = [];
				this.program.forEach((block, index) => {
					flat.push(() => this.removeTopLevel(index));
					if (block.kind === "repeat") {
						block.body.forEach((_, childIndex) => flat.push(() => this.removeNested(index, childIndex)));
					}
				});
				flat[this.zoneIndex.program]?.();
				if (this.programRowCount() === 0) this.zone = "palette";
				this.paintFocus();
			}
			return;
		}
		if (this.input.pressed("b")) {
			if (this.picker.kind !== "none") {
				this.picker = { kind: "none" };
				this.audio.sfx("cancel");
				this.repaintPaletteProgram();
			}
		}
	}
}
