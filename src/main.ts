// Boot: assemble the sprite registry, start the engine, show the title
// screen, then hand over to the Game orchestrator.

import { AudioEngine } from "./core/audio";
import { Input } from "./core/input";
import { GameLoop } from "./core/loop";
import { PALETTES, paletteById } from "./core/palette";
import { Renderer } from "./core/renderer";
import { ACTOR_SPRITES } from "./content/art-actors";
import { CREATURE_SPRITES } from "./content/art-creatures";
import { TILE_SPRITES } from "./content/art-tiles";
import { SONGS } from "./content/music";
import { Game } from "./game/game";
import { loadFrom, AUTOSAVE_SLOT } from "./game/save";
import type { GameState } from "./game/state";
import { mountLayers } from "./ui/dom";
import { TitleScreen } from "./ui/title";
import { mountTouch } from "./ui/touch";
import { registerBattles } from "./battle/host";

const SPRITES = { ...TILE_SPRITES, ...ACTOR_SPRITES, ...CREATURE_SPRITES };

const stage = document.getElementById("stage")!;
// Respect the palette of the most recent save before any state exists.
const savedPalette = loadFrom(AUTOSAVE_SLOT)?.options.paletteId;
const renderer = new Renderer(stage, SPRITES, savedPalette ? paletteById(savedPalette) : PALETTES[0]!);
mountLayers(stage);
renderer.fit();

const input = new Input();
input.attach(window);
const audio = new AudioEngine();
const unlockAudio = (): void => audio.unlock();
window.addEventListener("pointerdown", unlockAudio, { once: false });
window.addEventListener("keydown", unlockAudio, { once: false });

mountTouch(input);

let game: Game | null = null;
let title: TitleScreen | null = new TitleScreen(audio, (state: GameState | null) => {
	title = null;
	game = new Game(renderer, input, audio, state);
	registerBattles(game);
	// Dev handle: godmode panel and automated playtests hang off this.
	(window as unknown as { __game: Game }).__game = game;
});
audio.playSong(SONGS["title"]!);

const loop = new GameLoop({
	update() {
		if (title) {
			title.update(input);
			input.endFrame();
			return;
		}
		game?.update();
	},
	render() {
		if (game) {
			game.render();
		} else {
			renderer.clear(3);
		}
	}
});
loop.start();
