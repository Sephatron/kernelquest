// Cutscene script engine. Scripts are arrays of declarative commands
// (content/scripts.ts); this runner executes them one at a time with the
// world frozen. The game orchestrator provides the context callbacks.

import type { Direction } from "../core/input";
import type { RoutineEntry } from "./state";

export type Cmd =
	| { say: string[] }
	| { saySpeaker?: never } // reserved
	| { face: { who: string; dir: Direction } } // who: "player" or npc id
	| { walk: { who: string; steps: Direction[] } }
	| { wait: number } // fixed-update frames
	| { flag: [string, boolean] }
	| { give: { item?: string; count?: number; bits?: number; routine?: RoutineEntry } }
	| { heal: true }
	| { warp: { map: string; x: number; y: number; dir: Direction } }
	| { music: string }
	| { sfx: string }
	| { choice: { options: string[]; branches: Cmd[][] } }
	| { trainerBattle: string }
	| { gymBattle: string }
	| { badge: string }
	| { unlock: { flag: string; toast: string } }
	| { toast: string }
	| { run: string }
	| { nameEntry: true }
	| { starterChoice: true }
	| { removeNpc: string } // despawn until map reload
	| { ifFlag: { flag: string; then: Cmd[]; els?: Cmd[] } }
	| { ifBadge: { badge: string; then: Cmd[]; els?: Cmd[] } }
	| { setRespawn: true }
	| { shop: true }
	| { endGame: true };

export interface ScriptContext {
	say: (pages: string[], done: () => void) => void;
	choice: (options: string[], done: (index: number) => void) => void;
	faceActor: (who: string, dir: Direction) => void;
	stepActor: (who: string, dir: Direction) => boolean; // returns accepted
	actorBusy: (who: string) => boolean;
	setFlag: (name: string, value: boolean) => void;
	give: (gift: { item?: string; count?: number; bits?: number; routine?: RoutineEntry }) => void;
	heal: () => void;
	warp: (map: string, x: number, y: number, dir: Direction, done: () => void) => void;
	music: (id: string) => void;
	sfx: (id: string) => void;
	trainerBattle: (id: string, done: (won: boolean) => void) => void;
	gymBattle: (id: string, done: (won: boolean) => void) => void;
	badge: (id: string, done: () => void) => void;
	unlock: (flag: string, toast: string, done: () => void) => void;
	toast: (text: string) => void;
	lookupScript: (id: string) => Cmd[] | undefined;
	nameEntry: (done: () => void) => void;
	starterChoice: (done: () => void) => void;
	removeNpc: (id: string) => void;
	hasFlag: (name: string) => boolean;
	hasBadge: (id: string) => boolean;
	setRespawn: () => void;
	openShop: (done: () => void) => void;
	endGame: () => void;
}

type Pending =
	| { kind: "idle" }
	| { kind: "waiting-callback" }
	| { kind: "wait-frames"; left: number }
	| { kind: "walking"; who: string; steps: Direction[]; index: number };

export class ScriptRunner {
	active = false;

	private queue: Cmd[] = [];
	private pending: Pending = { kind: "idle" };
	private ctx: ScriptContext;
	private onFinish: (() => void) | null = null;

	constructor(ctx: ScriptContext) {
		this.ctx = ctx;
	}

	start(script: Cmd[], onFinish?: () => void): void {
		this.queue = [...script];
		this.pending = { kind: "idle" };
		this.active = true;
		this.onFinish = onFinish ?? null;
	}

	update(): void {
		if (!this.active) return;
		if (this.pending.kind === "waiting-callback") return;
		if (this.pending.kind === "wait-frames") {
			if (--this.pending.left <= 0) this.pending = { kind: "idle" };
			return;
		}
		if (this.pending.kind === "walking") {
			const walk = this.pending;
			if (this.ctx.actorBusy(walk.who)) return;
			if (walk.index >= walk.steps.length) {
				this.pending = { kind: "idle" };
				return;
			}
			const dir = walk.steps[walk.index]!;
			walk.index++;
			if (!this.ctx.stepActor(walk.who, dir)) {
				// blocked mid-cutscene: face that way and carry on rather than stall
				this.ctx.faceActor(walk.who, dir);
			}
			return;
		}
		// idle: pull the next command
		const cmd = this.queue.shift();
		if (!cmd) {
			this.active = false;
			const done = this.onFinish;
			this.onFinish = null;
			done?.();
			return;
		}
		this.execute(cmd);
	}

	private resume(): void {
		this.pending = { kind: "idle" };
	}

	private execute(cmd: Cmd): void {
		if ("say" in cmd && cmd.say) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.say(cmd.say, () => this.resume());
			return;
		}
		if ("face" in cmd) {
			this.ctx.faceActor(cmd.face.who, cmd.face.dir);
			return;
		}
		if ("walk" in cmd) {
			this.pending = { kind: "walking", who: cmd.walk.who, steps: cmd.walk.steps, index: 0 };
			return;
		}
		if ("wait" in cmd) {
			this.pending = { kind: "wait-frames", left: cmd.wait };
			return;
		}
		if ("flag" in cmd) {
			this.ctx.setFlag(cmd.flag[0], cmd.flag[1]);
			return;
		}
		if ("give" in cmd) {
			this.ctx.give(cmd.give);
			return;
		}
		if ("heal" in cmd) {
			this.ctx.heal();
			return;
		}
		if ("warp" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.warp(cmd.warp.map, cmd.warp.x, cmd.warp.y, cmd.warp.dir, () => this.resume());
			return;
		}
		if ("music" in cmd) {
			this.ctx.music(cmd.music);
			return;
		}
		if ("sfx" in cmd) {
			this.ctx.sfx(cmd.sfx);
			return;
		}
		if ("choice" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.choice(cmd.choice.options, (index) => {
				const branch = cmd.choice.branches[index] ?? [];
				this.queue = [...branch, ...this.queue];
				this.resume();
			});
			return;
		}
		if ("trainerBattle" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.trainerBattle(cmd.trainerBattle, () => this.resume());
			return;
		}
		if ("gymBattle" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.gymBattle(cmd.gymBattle, () => this.resume());
			return;
		}
		if ("badge" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.badge(cmd.badge, () => this.resume());
			return;
		}
		if ("unlock" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.unlock(cmd.unlock.flag, cmd.unlock.toast, () => this.resume());
			return;
		}
		if ("toast" in cmd) {
			this.ctx.toast(cmd.toast);
			return;
		}
		if ("run" in cmd) {
			const next = this.ctx.lookupScript(cmd.run);
			if (next) this.queue = [...next, ...this.queue];
			return;
		}
		if ("nameEntry" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.nameEntry(() => this.resume());
			return;
		}
		if ("starterChoice" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.starterChoice(() => this.resume());
			return;
		}
		if ("removeNpc" in cmd) {
			this.ctx.removeNpc(cmd.removeNpc);
			return;
		}
		if ("ifFlag" in cmd) {
			const branch = this.ctx.hasFlag(cmd.ifFlag.flag) ? cmd.ifFlag.then : (cmd.ifFlag.els ?? []);
			this.queue = [...branch, ...this.queue];
			return;
		}
		if ("ifBadge" in cmd) {
			const branch = this.ctx.hasBadge(cmd.ifBadge.badge) ? cmd.ifBadge.then : (cmd.ifBadge.els ?? []);
			this.queue = [...branch, ...this.queue];
			return;
		}
		if ("setRespawn" in cmd) {
			this.ctx.setRespawn();
			return;
		}
		if ("shop" in cmd) {
			this.pending = { kind: "waiting-callback" };
			this.ctx.openShop(() => this.resume());
			return;
		}
		if ("endGame" in cmd) {
			this.ctx.endGame();
			return;
		}
	}
}
