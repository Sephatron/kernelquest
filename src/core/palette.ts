// Four-shade palette system. Everything in the game — canvas pixels and DOM
// UI alike — draws from the current palette's four shades, index 0 (lightest)
// to 3 (darkest). Swapping palette recolours the entire game.

export interface Palette {
	id: string;
	name: string;
	// [lightest, light, dark, darkest]
	shades: [string, string, string, string];
}

export const PALETTES: Palette[] = [
	{ id: "verdant", name: "Verdant", shades: ["#e0f8d0", "#88c070", "#346856", "#081820"] },
	{ id: "pocket", name: "Pocket", shades: ["#e8e8e0", "#b0b0a0", "#686860", "#181818"] },
	{ id: "ember", name: "Ember", shades: ["#f8e8c8", "#e0a878", "#985048", "#281020"] },
	{ id: "deepsea", name: "Deep sea", shades: ["#d8f0f0", "#78b8c8", "#306878", "#082030"] },
	{ id: "plum", name: "Plum", shades: ["#f4e3f5", "#c493cf", "#71468b", "#1e0e2e"] }
];

export function paletteById(id: string): Palette {
	return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

// Publishes the palette to CSS custom properties so the DOM UI recolours
// itself along with the canvas.
export function applyPaletteToCss(palette: Palette): void {
	const root = document.documentElement;
	palette.shades.forEach((hex, i) => root.style.setProperty("--gb" + i, hex));
}

export interface Rgb {
	r: number;
	g: number;
	b: number;
}

export function hexToRgb(hex: string): Rgb {
	const n = parseInt(hex.slice(1), 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
