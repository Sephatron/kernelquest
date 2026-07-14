// The game orchestrator: owns the world, the player, every UI system and the
// script context; routes input by mode; handles warps, encounters, saving,
// fainting, badges and unlocks. Battle controllers plug in as a BattleHost.

import type { AudioEngine } from "../core/audio";
import type { Input, Direction } from "../core/input";
import type { Renderer } from "../core/renderer";
import { paletteById } from "../core/palette";
import { DIALOGUE } from "../content/dialogue";
import { MAPS } from "../content/maps";
import { SCRIPTS } from "../content/scripts";
import { SONGS } from "../content/music";
import { BADGES } from "../content/badges";
import { Dialogue } from "../ui/dialogue";
import { MenuSystem } from "../ui/menu";
import { NameEntry, StarterChoice } from "../ui/prompts";
import { Shop } from "../ui/shop";
import { Toasts } from "../ui/toast";
import { Transitions } from "../ui/transitions";
import { AUTOSAVE_SLOT, saveTo } from "./save";
import { ScriptRunner, type Cmd } from "./script";
import { addItem, hpMax, newGameState, type GameState } from "./state";
import { Player } from "./player";
import { World, aheadOf, dirDelta, type NpcRuntime } from "./world";

export interface BattleHost {
	active: boolean;
	startWild(species: string, done: (won: boolean) => void): void;
	startTrainer(id: string, done: (won: boolean) => void): void;
	startGym(id: string, done: (won: boolean) => void): void;
	update(): void;
}

const MIN_STEPS_BETWEEN_ENCOUNTERS = 3;

export class Game {
	state: GameState;
	world: World;
	player: Player;
	dialogue: Dialogue;
	menu: MenuSystem;
	toasts: Toasts;
	transitions: Transitions;
	script: ScriptRunner;
	shop: Shop | null = null;
	prompt: NameEntry | StarterChoice | null = null;
	battleHost: BattleHost | null = null;
	silencerSteps = 0;
	private stepsSinceEncounter = 99;
	private frameCounter = 0;
	private ended = false;

	constructor(
		public renderer: Renderer,
		public input: Input,
		public audio: AudioEngine,
		initial: GameState | null
	) {
		this.state = initial ?? newGameState();
		this.world = new World(MAPS, this.state, this.state.player.mapId);
		this.player = new Player(this.state, {
			canRun: () => this.state.badges.length >= 1,
			blocked: (x, y) => this.world.npcAt(x, y) !== null,
			onStep: (result) => this.onStep(result.encounterTile),
			onBump: () => this.audio.sfx("bump"),
			onHop: () => this.audio.sfx("hop")
		});
		this.dialogue = new Dialogue(audio, () => this.state.options.textSpeed);
		this.toasts = new Toasts();
		this.transitions = new Transitions();
		this.menu = new MenuSystem(this.state, audio, input, {
			onClose: () => undefined,
			onOptionsChanged: () => this.applyOptions(),
			toast: (t) => this.toasts.show(t)
		});
		this.script = new ScriptRunner(this.buildScriptContext());
		this.applyOptions();
		this.playMapMusic();
		if (initial === null) {
			// Fresh game: begin at home with a nudge toward the lab.
			this.script.start([
				{
					say: [
						"The Mainframe crashed before you were born. Kernelia has been debugging itself ever since.",
						"Today, that becomes your problem. Prof Ada is expecting you at the lab."
					]
				}
			]);
		}
	}

	setBattleHost(host: BattleHost): void {
		this.battleHost = host;
	}

	applyOptions(): void {
		const o = this.state.options;
		this.renderer.setPalette(paletteById(o.paletteId));
		this.audio.setVolume(o.volume);
		this.audio.setMuted(o.muted);
	}

	playMapMusic(): void {
		const song = SONGS[this.world.map.music];
		if (song) this.audio.playSong(song);
	}

	get busy(): boolean {
		return (
			this.script.active ||
			this.dialogue.active ||
			this.dialogue.choosing ||
			this.menu.open ||
			this.shop !== null ||
			this.prompt !== null ||
			(this.battleHost?.active ?? false) ||
			this.transitions.busy ||
			this.ended
		);
	}

	update(): void {
		this.frameCounter++;
		if (this.frameCounter % 60 === 0) this.state.stats.playSeconds++;

		if (this.prompt) {
			this.prompt.update(this.input);
		} else if (this.battleHost?.active) {
			this.battleHost.update();
		} else if (this.dialogue.active || this.dialogue.choosing) {
			this.dialogue.update(this.input);
		} else if (this.shop) {
			this.shop.update(this.input);
		} else if (this.menu.open) {
			this.menu.update();
		} else if (this.script.active) {
			// script may be waiting on walks/waits with no UI open
		} else if (!this.transitions.busy && !this.ended) {
			if (this.input.pressed("start")) {
				this.menu.openMenu();
			} else if (this.input.pressed("a")) {
				this.tryInteract();
			}
		}

		this.script.update();
		this.player.update(this.input, this.world, this.busy);
		this.world.update(this.state.player.x, this.state.player.y, this.busy);
		this.player.centerCamera(this.renderer, this.world);
		this.input.endFrame();
	}

	render(): void {
		this.renderer.clear(this.world.map.indoor ? 3 : 0);
		this.world.render(this.renderer);
		this.world.renderNpcs(this.renderer, {
			y: this.player.py,
			draw: () => this.player.render(this.renderer)
		});
	}

	// ------------------------------------------------------------ stepping

	private onStep(encounterTile: boolean): void {
		const p = this.state.player;
		const warp = this.world.warpAt(p.x, p.y);
		if (warp) {
			this.doWarp(warp.toMap, warp.toX, warp.toY, warp.dir ?? p.dir, warp.kind === "door");
			return;
		}
		if (this.fireTriggerAt(p.x, p.y)) return;
		if (this.silencerSteps > 0) this.silencerSteps--;
		this.stepsSinceEncounter++;
		if (
			encounterTile &&
			this.battleHost &&
			this.world.map.encounters &&
			this.silencerSteps <= 0 &&
			this.stepsSinceEncounter > MIN_STEPS_BETWEEN_ENCOUNTERS &&
			Math.random() < this.world.map.encounters.rate
		) {
			this.stepsSinceEncounter = 0;
			this.state.stats.encounters++;
			const species = this.pickSpecies();
			this.battleHost.startWild(species, (won) => this.afterBattle(won));
		}
	}

	private pickSpecies(): string {
		const table = this.world.map.encounters!.species;
		const total = table.reduce((sum, [, w]) => sum + w, 0);
		let roll = Math.random() * total;
		for (const [species, weight] of table) {
			roll -= weight;
			if (roll <= 0) return species;
		}
		return table[0]![0];
	}

	afterBattle(won: boolean): void {
		this.playMapMusic();
		if (!won && this.state.player.hp <= 0) {
			this.faint();
			return;
		}
		this.autosave();
	}

	faint(): void {
		this.state.stats.losses++;
		this.script.start([
			{
				say: [
					"Your bot powered down with a sad little beep.",
					"A passing drone hauls you both back somewhere safe."
				]
			},
			{
				warp: {
					map: this.state.respawn.mapId,
					x: this.state.respawn.x,
					y: this.state.respawn.y,
					dir: "down"
				}
			},
			{ heal: true },
			{ sfx: "heal" }
		]);
	}

	doWarp(map: string, x: number, y: number, dir: Direction, isDoor: boolean): void {
		if (isDoor) this.audio.sfx("door");
		void this.transitions.fade(() => {
			this.world.load(map);
			this.state.player.mapId = map;
			this.state.player.x = x;
			this.state.player.y = y;
			this.state.player.dir = dir;
			this.player.centerCamera(this.renderer, this.world);
			this.playMapMusic();
			const onEnter = this.world.map.onEnter;
			if (onEnter && SCRIPTS[onEnter]) {
				this.script.start(SCRIPTS[onEnter]!);
				return;
			}
			// A warp lands the player ON the destination tile without a step, so
			// onStep never runs — fire an arrival trigger here too. This is what
			// makes gym-entry unlocks (REPEAT/IF/etc.) reliably grant on entry,
			// before the aide or leader fight that needs them.
			this.fireTriggerAt(x, y);
		});
	}

	// Runs the trigger on a tile if one is present and not yet consumed. Shared
	// by warp arrival (doWarp) and stepping (onStep).
	private fireTriggerAt(x: number, y: number): boolean {
		const trigger = this.world.triggerAt(x, y);
		if (!trigger) return false;
		const script = SCRIPTS[trigger.script];
		if (!script) return false;
		if (trigger.onceFlag) this.state.flags[trigger.onceFlag] = true;
		this.script.start(script);
		return true;
	}

	autosave(): void {
		saveTo(AUTOSAVE_SLOT, this.state);
	}

	// ---------------------------------------------------------- interaction

	private tryInteract(): void {
		if (this.player.moving) return;
		const p = this.state.player;
		let [tx, ty] = aheadOf(p.x, p.y, p.dir);
		let npc = this.world.npcAt(tx, ty);
		// Talking across a counter: look one tile further.
		if (!npc && this.world.tileChar(tx, ty) === "-") {
			const [dx, dy] = dirDelta(p.dir);
			npc = this.world.npcAt(tx + dx, ty + dy);
			tx += dx;
			ty += dy;
		}
		if (npc) {
			this.faceNpcToPlayer(npc);
			if (npc.def.script && SCRIPTS[npc.def.script]) {
				this.script.start(SCRIPTS[npc.def.script]!);
				return;
			}
			if (npc.def.dialogue && DIALOGUE[npc.def.dialogue]) {
				this.dialogue.show(DIALOGUE[npc.def.dialogue]!);
				return;
			}
			this.dialogue.show(["..."]);
			return;
		}
		const sign = this.world.signAt(tx, ty);
		if (sign) {
			this.audio.sfx("blip");
			this.dialogue.show(sign.text);
		}
	}

	private faceNpcToPlayer(npc: NpcRuntime): void {
		const p = this.state.player;
		if (npc.x < p.x) npc.dir = "right";
		else if (npc.x > p.x) npc.dir = "left";
		else if (npc.y < p.y) npc.dir = "down";
		else npc.dir = "up";
	}

	// -------------------------------------------------------- script context

	private buildScriptContext() {
		return {
			say: (pages: string[], done: () => void) => this.dialogue.show(pages, done),
			choice: (options: string[], done: (index: number) => void) => this.dialogue.choice(options, done),
			faceActor: (who: string, dir: Direction) => {
				if (who === "player") {
					this.state.player.dir = dir;
					return;
				}
				const npc = this.world.npcs.find((n) => n.def.id === who);
				if (npc) npc.dir = dir;
			},
			stepActor: (who: string, dir: Direction): boolean => {
				if (who === "player") return this.player.forceStep(dir, this.world);
				const npc = this.world.npcs.find((n) => n.def.id === who);
				if (!npc) return false;
				npc.dir = dir;
				const [tx, ty] = aheadOf(npc.x, npc.y, dir);
				if (this.world.solid(tx, ty) || this.world.npcAt(tx, ty)) return false;
				if (tx === this.state.player.x && ty === this.state.player.y) return false;
				npc.x = tx;
				npc.y = ty;
				npc.walking = true;
				npc.walkFrame = 0;
				return true;
			},
			actorBusy: (who: string): boolean => {
				if (who === "player") return this.player.moving;
				const npc = this.world.npcs.find((n) => n.def.id === who);
				return npc?.walking ?? false;
			},
			setFlag: (name: string, value: boolean) => {
				this.state.flags[name] = value;
				this.world.refreshNpcs();
			},
			give: (gift: { item?: string; count?: number; bits?: number; routine?: GameState["routines"][number] }) => {
				if (gift.item) addItem(this.state, gift.item, gift.count ?? 1);
				if (gift.bits) this.state.player.bits += gift.bits;
				if (gift.routine && !this.state.routines.some((r) => r.name === gift.routine!.name)) {
					this.state.routines.push(gift.routine);
					this.toasts.show("Routine learned: " + gift.routine.name + " — see DEX.");
				}
			},
			heal: () => {
				this.state.player.hp = hpMax(this.state);
			},
			warp: (map: string, x: number, y: number, dir: Direction, done: () => void) => {
				void this.transitions
					.fade(() => {
						this.world.load(map);
						this.state.player.mapId = map;
						this.state.player.x = x;
						this.state.player.y = y;
						this.state.player.dir = dir;
						this.player.centerCamera(this.renderer, this.world);
						this.playMapMusic();
					})
					.then(done);
			},
			music: (id: string) => {
				const song = SONGS[id];
				if (song) this.audio.playSong(song);
			},
			sfx: (id: string) => this.audio.sfx(id),
			trainerBattle: (id: string, done: (won: boolean) => void) => {
				if (!this.battleHost) {
					done(true);
					return;
				}
				this.battleHost.startTrainer(id, (won) => {
					this.playMapMusic();
					if (won) this.state.flags["beat." + id] = true;
					if (!won && this.state.player.hp <= 0) this.faint();
					this.autosave();
					done(won);
				});
			},
			gymBattle: (id: string, done: (won: boolean) => void) => {
				if (!this.battleHost) {
					done(true);
					return;
				}
				this.battleHost.startGym(id, (won) => {
					this.playMapMusic();
					this.autosave();
					done(won);
				});
			},
			badge: (id: string, done: () => void) => {
				if (!this.state.badges.includes(id)) this.state.badges.push(id);
				const badge = BADGES[id];
				this.audio.playOnce(SONGS["badge"]!);
				this.toasts.show((badge?.name ?? id) + " earned!");
				this.autosave();
				window.setTimeout(done, 1600);
			},
			unlock: (flag: string, toastText: string, done: () => void) => {
				this.state.flags[flag] = true;
				this.audio.sfx("levelup");
				this.toasts.show(toastText, 3200);
				window.setTimeout(done, 900);
			},
			toast: (text: string) => this.toasts.show(text),
			lookupScript: (id: string): Cmd[] | undefined => SCRIPTS[id],
			nameEntry: (done: () => void) => {
				this.prompt = new NameEntry(this.state, this.audio, () => {
					this.prompt = null;
					done();
				});
			},
			starterChoice: (done: () => void) => {
				this.prompt = new StarterChoice(this.state, this.audio, () => {
					this.prompt = null;
					done();
				});
			},
			removeNpc: (id: string) => {
				this.world.npcs = this.world.npcs.filter((n) => n.def.id !== id);
			},
			hasFlag: (name: string): boolean => this.state.flags[name] === true,
			hasBadge: (id: string): boolean => this.state.badges.includes(id),
			setRespawn: () => {
				this.state.respawn = {
					mapId: this.state.player.mapId,
					x: this.state.player.x,
					y: this.state.player.y
				};
			},
			openShop: (done: () => void) => {
				this.shop = new Shop(this.state, this.audio, (t) => this.toasts.show(t), () => {
					this.shop = null;
					done();
				});
			},
			endGame: () => {
				this.ended = true;
				this.audio.playSong(SONGS["title"]!);
			}
		};
	}

	useSilencer(): void {
		this.silencerSteps = 40;
	}
}
