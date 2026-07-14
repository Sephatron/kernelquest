// Fixed-timestep game loop: update runs at exactly 60hz regardless of
// display refresh, render runs once per animation frame. Long stalls (tab
// switch) are clamped instead of fast-forwarded.

export const STEP_MS = 1000 / 60;
const MAX_ACCUMULATED_MS = 250;

export interface LoopHooks {
	update: () => void;
	render: () => void;
}

export class GameLoop {
	private accumulator = 0;
	private last = 0;
	private rafId = 0;
	private running = false;

	constructor(private hooks: LoopHooks) {}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.last = performance.now();
		const frame = (now: number): void => {
			if (!this.running) return;
			this.accumulator = Math.min(this.accumulator + (now - this.last), MAX_ACCUMULATED_MS);
			this.last = now;
			while (this.accumulator >= STEP_MS) {
				this.hooks.update();
				this.accumulator -= STEP_MS;
			}
			this.hooks.render();
			this.rafId = requestAnimationFrame(frame);
		};
		this.rafId = requestAnimationFrame(frame);
	}

	stop(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
	}
}
