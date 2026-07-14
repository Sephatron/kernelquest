// Player movement state machine with the Red/Blue feel: tap turns in place,
// hold walks; steps tween across exactly one tile; ledges hop; bumps thunk.

import type { Direction, Input } from "../core/input";
import { TILE } from "../core/renderer";
import type { Renderer } from "../core/renderer";
import { aheadOf, dirDelta, drawActor, type World } from "./world";
import type { GameState } from "./state";

const TURN_FRAMES = 6;
const WALK_FRAMES = 16;
const RUN_FRAMES = 8;
const HOP_FRAMES = 22;
const BUMP_SFX_INTERVAL = 20;

export type StepResult = {
	x: number;
	y: number;
	tileChar: string;
	encounterTile: boolean;
};

export interface PlayerHooks {
	canRun: () => boolean;
	blocked: (x: number, y: number) => boolean; // extra blockers (NPCs)
	onStep: (result: StepResult) => void;
	onBump: () => void;
	onHop: () => void;
}

export class Player {
	state: GameState;
	// Pixel offsets while animating a step.
	ox = 0;
	oy = 0;
	moving = false;
	hopping = false;
	running = false;
	parity = false;

	private turnTimer = 0;
	private frame = 0;
	private frames = WALK_FRAMES;
	private bumpTimer = 0;
	private hooks: PlayerHooks;

	constructor(state: GameState, hooks: PlayerHooks) {
		this.state = state;
		this.hooks = hooks;
	}

	get px(): number {
		return this.state.player.x * TILE + this.ox;
	}

	get py(): number {
		return this.state.player.y * TILE + this.oy;
	}

	update(input: Input, world: World, controlsLocked: boolean): void {
		const p = this.state.player;
		if (this.moving) {
			this.frame++;
			const t = this.frame / this.frames;
			const remaining = TILE - Math.round(t * TILE);
			const [dx, dy] = dirDelta(p.dir);
			if (this.hopping) {
				const total = TILE * 2;
				const left = total - Math.round(t * total);
				this.ox = -dx * left;
				this.oy = -dy * left - Math.round(Math.sin(t * Math.PI) * 6);
			} else {
				this.ox = -dx * remaining;
				this.oy = -dy * remaining;
			}
			if (this.frame >= this.frames) {
				this.moving = false;
				this.hopping = false;
				this.ox = 0;
				this.oy = 0;
				this.parity = !this.parity;
				this.state.stats.steps++;
				const def = world.tileDef(p.x, p.y);
				this.hooks.onStep({
					x: p.x,
					y: p.y,
					tileChar: world.tileChar(p.x, p.y),
					encounterTile: def.encounter === true
				});
			}
			return;
		}

		if (controlsLocked) return;

		const dir = input.activeDirection();
		if (!dir) {
			this.turnTimer = 0;
			this.bumpTimer = 0;
			return;
		}

		if (dir !== p.dir) {
			p.dir = dir;
			this.turnTimer = TURN_FRAMES;
			return;
		}
		if (this.turnTimer > 0) {
			this.turnTimer--;
			return;
		}
		this.tryStep(dir, input, world);
	}

	private tryStep(dir: Direction, input: Input, world: World): void {
		const p = this.state.player;
		const [tx, ty] = aheadOf(p.x, p.y, dir);
		const target = world.tileDef(tx, ty);

		if (target.ledge && dir === "down") {
			// Hop: land two tiles down if the landing spot is free.
			const [lx, ly] = aheadOf(p.x, p.y, dir, 2);
			if (!world.tileDef(lx, ly).solid && !this.hooks.blocked(lx, ly)) {
				p.x = lx;
				p.y = ly;
				this.beginMove(HOP_FRAMES, true);
				this.hooks.onHop();
				return;
			}
		}

		const blocked = target.solid || target.ledge || this.hooks.blocked(tx, ty);
		if (blocked) {
			if (this.bumpTimer <= 0) {
				this.hooks.onBump();
				this.bumpTimer = BUMP_SFX_INTERVAL;
			} else {
				this.bumpTimer--;
			}
			return;
		}

		this.running = input.held("b") && this.hooks.canRun();
		p.x = tx;
		p.y = ty;
		this.beginMove(this.running ? RUN_FRAMES : WALK_FRAMES, false);
	}

	private beginMove(frames: number, hop: boolean): void {
		this.moving = true;
		this.hopping = hop;
		this.frame = 0;
		this.frames = frames;
		const [dx, dy] = dirDelta(this.state.player.dir);
		const dist = hop ? TILE * 2 : TILE;
		this.ox = -dx * dist;
		this.oy = -dy * dist;
	}

	// Scripted step used by cutscenes; ignores input, respects nothing.
	forceStep(dir: Direction, world: World): boolean {
		const p = this.state.player;
		p.dir = dir;
		const [tx, ty] = aheadOf(p.x, p.y, dir);
		if (world.tileDef(tx, ty).solid || this.hooks.blocked(tx, ty)) return false;
		p.x = tx;
		p.y = ty;
		this.beginMove(WALK_FRAMES, false);
		return true;
	}

	render(renderer: Renderer): void {
		const p = this.state.player;
		const walkFrame = this.moving && Math.floor((this.frame / this.frames) * 2) === 0;
		const frame = this.moving ? (walkFrame ? (this.parity ? "walk1" : "walk2") : "idle") : "idle";
		drawActor(renderer, "player", p.dir, frame, this.px, this.py);
	}

	centerCamera(renderer: Renderer, world: World): void {
		const halfW = 160 / 2 - TILE / 2;
		const halfH = 144 / 2 - TILE / 2;
		const maxX = world.width * TILE - 160;
		const maxY = world.height * TILE - 144;
		renderer.cameraX = Math.max(0, Math.min(maxX, this.px - halfW));
		renderer.cameraY = Math.max(0, Math.min(maxY, this.py - halfH));
		if (world.width * TILE < 160) renderer.cameraX = (world.width * TILE - 160) / 2;
		if (world.height * TILE < 144) renderer.cameraY = (world.height * TILE - 144) / 2;
	}
}
