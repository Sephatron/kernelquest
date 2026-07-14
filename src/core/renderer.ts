// The world renderer: a fixed 160×144 backbuffer, integer-scaled to fit the
// viewport. DOM UI layers sit on top of the canvas inside #stage and inherit
// the same integer scale through the --px CSS variable, so borders and type
// stay chunky and aligned at every window size.

import type { Palette } from "./palette";
import { applyPaletteToCss } from "./palette";
import { SpriteAtlas, type SpriteDef } from "./sprites";

export const SCREEN_W = 160;
export const SCREEN_H = 144;
export const TILE = 16;

export class Renderer {
	readonly canvas: HTMLCanvasElement;
	readonly ctx: CanvasRenderingContext2D;
	atlas: SpriteAtlas;
	palette: Palette;
	cameraX = 0;
	cameraY = 0;
	scale = 3;

	private stage: HTMLElement;

	constructor(stage: HTMLElement, defs: Record<string, SpriteDef>, palette: Palette) {
		this.stage = stage;
		this.palette = palette;
		this.atlas = new SpriteAtlas(defs, palette);
		this.canvas = document.createElement("canvas");
		this.canvas.width = SCREEN_W;
		this.canvas.height = SCREEN_H;
		this.canvas.id = "world";
		this.ctx = this.canvas.getContext("2d")!;
		this.ctx.imageSmoothingEnabled = false;
		stage.appendChild(this.canvas);
		applyPaletteToCss(palette);
		window.addEventListener("resize", () => this.fit());
		this.fit();
	}

	setPalette(palette: Palette): void {
		this.palette = palette;
		this.atlas.setPalette(palette);
		applyPaletteToCss(palette);
	}

	// Integer scale that fits the stage's parent, minimum 1.
	fit(): void {
		const parent = this.stage.parentElement;
		if (!parent) return;
		const box = parent.getBoundingClientRect();
		const style = getComputedStyle(parent);
		const availW = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
		const availH = box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
		this.scale = Math.max(1, Math.min(Math.floor(availW / SCREEN_W), Math.floor(availH / SCREEN_H)));
		this.stage.style.width = SCREEN_W * this.scale + "px";
		this.stage.style.height = SCREEN_H * this.scale + "px";
		document.documentElement.style.setProperty("--px", String(this.scale));
	}

	clear(shade: number): void {
		this.ctx.fillStyle = this.palette.shades[shade] ?? this.palette.shades[0]!;
		this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
	}

	// World-space sprite draw (camera applied), with cheap culling.
	sprite(name: string, worldX: number, worldY: number, flip = false): void {
		const image = flip ? this.atlas.getFlipped(name) : this.atlas.get(name);
		const x = Math.round(worldX - this.cameraX);
		const y = Math.round(worldY - this.cameraY);
		if (x + image.width < 0 || y + image.height < 0 || x >= SCREEN_W || y >= SCREEN_H) return;
		this.ctx.drawImage(image, x, y);
	}

	// Screen-space sprite draw (no camera) for HUD-ish world elements.
	spriteScreen(name: string, x: number, y: number): void {
		this.ctx.drawImage(this.atlas.get(name), Math.round(x), Math.round(y));
	}

	rect(worldX: number, worldY: number, w: number, h: number, shade: number): void {
		this.ctx.fillStyle = this.palette.shades[shade] ?? this.palette.shades[3]!;
		this.ctx.fillRect(Math.round(worldX - this.cameraX), Math.round(worldY - this.cameraY), w, h);
	}
}
