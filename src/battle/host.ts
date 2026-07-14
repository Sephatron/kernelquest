// Battle host: routes the Game orchestrator's battle requests to the wild
// and gym controllers.

import { PROGRAM_BATTLES } from "../content/gyms";
import type { Game } from "../game/game";
import { GymBattle } from "./gymui";
import { WildBattle } from "./wildui";

export function registerBattles(game: Game): void {
	const toast = (t: string): void => game.toasts.show(t);
	const wild = new WildBattle(game.state, game.audio, game.input, game.transitions, toast);
	const gym = new GymBattle(game.state, game.audio, game.input, game.transitions, toast);

	game.setBattleHost({
		get active(): boolean {
			return wild.active || gym.active;
		},
		startWild(species, done) {
			wild.start(species, done);
		},
		startTrainer(id, done) {
			const def = PROGRAM_BATTLES[id];
			if (!def) {
				done(true);
				return;
			}
			gym.start(def, done);
		},
		startGym(id, done) {
			const def = PROGRAM_BATTLES[id];
			if (!def) {
				done(true);
				return;
			}
			gym.start(def, done);
		},
		update() {
			if (wild.active) wild.update();
			if (gym.active) gym.update();
		}
	});
}
